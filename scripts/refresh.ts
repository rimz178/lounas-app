import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { chromium } from "playwright";
import { extractMenu } from "./extractMenu";
import { fetchRenderedHtml } from "./fetchRenderedHtml";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Environment variable NEXT_PUBLIC_SUPABASE_URL is not set. Please define it in .env.local before running this script.",
  );
}
if (!supabaseServiceRoleKey) {
  throw new Error(
    "Environment variable SUPABASE_SERVICE_ROLE_KEY is not set. Please define it in .env.local before running this script.",
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function refresh() {
  // Käynnistä selain kerran
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  try {
    const { data: restaurants, error } = await supabase
      .from("ravintolat")
      .select("id, name, url")
      .not("url", "is", null)
      .eq("menu_mode", "auto");

    if (error) {
      console.error("Failed to fetch restaurants:", error);
      throw error;
    }

    for (const r of restaurants ?? []) {
      if (!r.url) continue;
      console.log("Processing:", r.name);

      try {
        // Välitä selainkonteksti funktiolle
        const text = await fetchRenderedHtml(context, r.url);
        const menu = await extractMenu(text);

        const { error: upsertError } = await supabase.from("menus").upsert(
          {
            restaurant_id: r.id,
            menu_text: menu,
          },
          { onConflict: "restaurant_id" },
        );

        if (upsertError) {
          console.error(
            `Supabase upsert failed for ${r.name}:`,
            upsertError.message,
          );
        }
      } catch (err) {
        console.error(`Failed for ${r.name} (${r.url}):`, err);
      }
    }
  } finally {
    await browser.close();
  }
}

refresh();