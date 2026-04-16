import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
/**
 * Tämä tiedosto sisältää API-reitit ravintoloiden hallintaan admin-käyttöliittymässä.
 */
type GeocodeApiResult = {
  lat: string;
  lon: string;
};

type ExistingRestaurant = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  url: string | null;
};

type AuthorizedSupabaseContext = {
  supabase: SupabaseClient;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("fi-FI");
}

function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadiusMeters = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

async function geocodeAddress(address: string) {
  const params = new URLSearchParams({
    q: address,
    format: "jsonv2",
    limit: "1",
  });

  const controller = new AbortController();
  const timeoutMs = 5000;
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  let response: Response;
  try {
    response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": "lounas-app-admin/1.0 (admin geocoding)",
        },
        cache: "no-store",
        signal: controller.signal,
      },
    );
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("Geocoding request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error("Geocoding service unavailable");
  }

  const data = (await response.json()) as GeocodeApiResult[];
  const first = data[0];
  if (!first) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

async function authorizeAdmin(
  req: NextRequest,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<
  | { response: NextResponse; context?: never }
  | { response?: never; context: AuthorizedSupabaseContext }
> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { context: { supabase } };
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  const auth = await authorizeAdmin(req, supabaseUrl, serviceRoleKey);
  if ("response" in auth) {
    return auth.response;
  }

  const { supabase } = auth.context;

  let payload: {
    name?: unknown;
    address?: unknown;
    url?: unknown;
  };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const address =
    typeof payload.address === "string" ? payload.address.trim() : "";
  const normalizedUrl = normalizeUrl(payload.url);

  if (!name) {
    return NextResponse.json(
      { error: "Ravintolan nimi puuttuu" },
      { status: 400 },
    );
  }

  if (!address) {
    return NextResponse.json({ error: "Osoite puuttuu" }, { status: 400 });
  }

  if (payload.url && !normalizedUrl) {
    return NextResponse.json(
      { error: "Ravintolan URL ei ole kelvollinen" },
      { status: 400 },
    );
  }

  let coordinates: { lat: number; lng: number } | null = null;
  try {
    coordinates = await geocodeAddress(address);
  } catch {
    return NextResponse.json(
      { error: "Osoitteen geokoodaus ei onnistunut" },
      { status: 502 },
    );
  }

  if (!coordinates) {
    return NextResponse.json(
      { error: "Osoitetta ei löytynyt kartalta" },
      { status: 404 },
    );
  }

  const { data: existingRestaurants, error: existingRestaurantsError } =
    await supabase.from("ravintolat").select("id, name, lat, lng, url");

  if (existingRestaurantsError) {
    return NextResponse.json(
      { error: "Ravintoloiden tarkistus epäonnistui" },
      { status: 500 },
    );
  }

  const normalizedName = normalizeText(name);
  const duplicateRestaurant = (
    (existingRestaurants ?? []) as ExistingRestaurant[]
  ).find((restaurant) => {
    const existingUrl = normalizeUrl(restaurant.url);
    if (normalizedUrl && existingUrl === normalizedUrl) {
      return true;
    }

    if (normalizeText(restaurant.name) !== normalizedName) {
      return false;
    }

    if (restaurant.lat == null || restaurant.lng == null) {
      return false;
    }

    return (
      getDistanceMeters(
        restaurant.lat,
        restaurant.lng,
        coordinates.lat,
        coordinates.lng,
      ) <= 150
    );
  });

  if (duplicateRestaurant) {
    return NextResponse.json(
      {
        error: `Ravintola on jo lisätty: ${duplicateRestaurant.name}`,
      },
      { status: 409 },
    );
  }

  const { data: createdRestaurant, error: insertError } = await supabase
    .from("ravintolat")
    .insert({
      name,
      lat: coordinates.lat,
      lng: coordinates.lng,
      url: normalizedUrl,
      menu_mode: "auto",
    })
    .select("id, name, lat, lng, url")
    .single();

  if (insertError || !createdRestaurant) {
    return NextResponse.json(
      { error: "Ravintolan lisääminen epäonnistui" },
      { status: 500 },
    );
  }

  return NextResponse.json({ restaurant: createdRestaurant }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  const auth = await authorizeAdmin(req, supabaseUrl, serviceRoleKey);
  if ("response" in auth) {
    return auth.response;
  }

  const { supabase } = auth.context;

  let payload: { restaurantId?: unknown };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const restaurantId =
    typeof payload.restaurantId === "string" ? payload.restaurantId.trim() : "";

  if (!restaurantId) {
    return NextResponse.json(
      { error: "Ravintolaa ei valittu" },
      { status: 400 },
    );
  }

  const { data: existingRestaurant, error: existingRestaurantError } =
    await supabase
      .from("ravintolat")
      .select("id, name")
      .eq("id", restaurantId)
      .maybeSingle();

  if (existingRestaurantError) {
    return NextResponse.json(
      { error: "Ravintolan haku epäonnistui" },
      { status: 500 },
    );
  }

  if (!existingRestaurant) {
    return NextResponse.json(
      { error: "Ravintolaa ei löytynyt" },
      { status: 404 },
    );
  }

  const { error: deleteRestaurantError } = await supabase
    .from("ravintolat")
    .delete()
    .eq("id", restaurantId);

  if (deleteRestaurantError) {
    return NextResponse.json(
      { error: "Ravintolan poisto epäonnistui" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    deleted: true,
    restaurant: existingRestaurant,
  });
}
