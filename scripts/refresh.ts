import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { fetchRenderedHtml } from "./fetchRenderedHtml";
import { extractMenu } from "./extractMenu";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

async function refresh() {
  const { data: restaurants } = await supabase
    .from("ravintolat")
    .select("id, name, url")
    .not("url", "is", null);

  for (const r of restaurants ?? []) {
    if (!r.url) continue;

    console.log("Processing:", r.name);

    try {
      const text = await fetchRenderedHtml(r.url);
      const menu = await extractMenu(text);

      await supabase.from("menus").insert({
        restaurant_id: r.id,
        menu_text: menu,
      });
    } catch (err) {
      console.error(`Failed for ${r.name} (${r.url}):`, err);
      // jatka seuraavaan ravintolaan
    }
  }
}

refresh();