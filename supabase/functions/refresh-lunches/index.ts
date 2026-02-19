// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OpenAI } from "https://deno.land/x/openai/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { fetchRenderedHtml } from "./fetchRenderHtml.ts";
import { extractMenu } from "./openai.ts";
import { runRefresh } from "./supabase.ts";

// Alustetaan ympäristömuuttujat
const apiKey = Deno.env.get("OPENAI_API_KEY");
if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}

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
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.split("Bearer ")[1];

    // Tarkista, onko käyttäjä todennettu
    const isAuthenticated = jwt ? true : false;

    const { ids, action } = await req.json();

    if (action === "getRestaurants") {
      // Hae ravintolatiedot
      const { data: restaurants, error } = await supabase
        .from("ravintolat")
        .select("id, name, lat, lng, url");

      if (error) {
        throw new Error(`Error fetching restaurants: ${error.message}`);
      }

      return new Response(JSON.stringify({ data: restaurants }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "updateMenus" && isAuthenticated) {
      // Päivitä lounaslistat vain todennetuille käyttäjille
      const { data: restaurants, error } = await supabase
        .from("ravintolat")
        .select("id, name, url")
        .in("id", ids);

      if (error) {
        throw new Error(`Error fetching restaurants: ${error.message}`);
      }

      const results = [];
      for (const restaurant of restaurants) {
        try {
          const html = await fetchRenderedHtml(restaurant.url);
          const menu = await extractMenu(restaurant.name, restaurant.url, html);

          await supabase.from("menus").insert({
            restaurant_id: restaurant.id,
            menu_text: menu,
          });

          results.push({ id: restaurant.id, menu });
        } catch (err) {
          results.push({ id: restaurant.id, error: err.message });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Jos toiminto ei ole sallittu
    return new Response(
      JSON.stringify({ error: "Unauthorized or invalid action" }),
      { status: 403 },
    );
  } catch (error) {
    console.error("Error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});
