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
    .not("url", "is", null)
    .eq("menu_mode", "auto");

  for (const r of restaurants ?? []) {
    if (!r.url) continue;

    console.log("Processing:", r.name);

    try {
      const text = await fetchRenderedHtml(r.url);
      const menu = await extractMenu(text);

      // Käytä upsert-toimintoa:
      // - Jos ravintolalle (restaurant_id) on jo olemassa menu, se päivitetään.
      // - Jos ei ole, luodaan uusi.
      // Tämä ei koske manuaalisesti lisättyjä, koska ne on suodatettu pois aiemmin.
      await supabase.from("menus").upsert(
        {
          restaurant_id: r.id,
          menu_text: menu,
        },
        { onConflict: "restaurant_id" },
      );
    } catch (err) {
      console.error(`Failed for ${r.name} (${r.url}):`, err);
    }
  }
}

refresh();