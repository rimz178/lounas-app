
import type { RestaurantBrief } from "../../src/app/service/types";

export function hasUrl(r: RestaurantBrief): r is RestaurantBrief & { url: string } {
  return typeof r.url === "string" && r.url.trim().length > 0;
}

export async function runRefresh(ids?: string[]) {
  const base = supabase
    .from("ravintolat")
    .select("id, name, url")
    .not("url", "is", null)
    .neq("url", "");
  const { data, error } = ids
    ? await base.in("id", ids).returns<RestaurantBrief[]>()
    : await base.returns<RestaurantBrief[]>();

  if (error) {
    console.error("Supabase ravintolat error:", error.message);
    return new Response(
      JSON.stringify({ ok: false, error: `Supabase: ${error.message}` }),
      { status: 500 },
    );
  }

  const withUrl = (data ?? []).filter(hasUrl);
  console.log(
    "Ravintolat haettu:",
    withUrl.map((r) => r.name),
  );
}