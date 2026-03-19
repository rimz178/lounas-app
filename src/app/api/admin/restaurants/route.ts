import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type GeocodeApiResult = {
  lat: string;
  lon: string;
};

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

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        "User-Agent": "lounas-app-admin/1.0 (admin geocoding)",
      },
      cache: "no-store",
    },
  );

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

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
