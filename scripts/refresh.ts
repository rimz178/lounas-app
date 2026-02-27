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

      // Poista ensin vanhat menut tältä ravintolalta varmistaaksesi,ut tältä ravintolalta varmistaaksesi,
      // että vanhentunutta dataa ei jää.
      await supabase.from("menus").delete().eq("restaurant_id", r.id);

      // Lisää uusi menu vain, jos se ei ole tyhjä.
      // Näin eilinen lista ei jää kummittelemaan, jos uutta ei löydy.
      if (menu && menu !== "No lunch menu found.") {
        await supabase.from("menus").insert({
          restaurant_id: r.id,
          menu_text: menu,
        });
      } else {
        console.log(`No new menu found for ${r.name}, old menu cleared.`);
      }
    } catch (err) {
      console.error(`Failed for ${r.name} (${r.url}):`, err);
    }
  }
}

refresh();