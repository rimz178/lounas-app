// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { fetchRenderedHtml } from "./fetchRenderHtml.ts";

import { OpenAI } from "https://deno.land/x/openai/mod.ts";
import { extractMenu } from "./openai.ts";
// Alustetaan ympäristömuuttujat
const apiKey = Deno.env.get("OPENAI_API_KEY");
if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}

const openai = new OpenAI(apiKey);

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    const { ids } = await req.json();

    // Hae ravintolatiedot Supabasesta
    const { data: restaurants, error } = await supabase
      .from("ravintolat")
      .select("id, name, url")
      .in("id", ids);

    if (error) {
      throw new Error(`Error fetching restaurants: ${error.message}`);
    }

    // Käsittele jokainen ravintola
    const results = await Promise.all(
      restaurants.map(async (restaurant) => {
        try {
          // Hae ravintolan HTML-sisältö
          const html = await fetchRenderedHtml(restaurant.url);

          // Lähetä HTML OpenAI:lle ja pyydä lounaslista
          const menu = await extractMenu(openai, restaurant.name, restaurant.url, html);

          // Tallenna lounaslista Supabaseen
          await supabase.from("menus").insert({
            restaurant_id: restaurant.id,
            menu_text: menu,
          });

          return { id: restaurant.id, menu };
        } catch (err) {
          return { id: restaurant.id, error: err.message };
        }
      })
    );

    // Palauta tulokset
    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});
