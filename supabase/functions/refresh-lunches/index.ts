// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { fetchRenderedHtml } from "./fetchRenderHtml.ts";
import { runRefresh } from "./supabase.ts";
import { OpenAI } from "https://deno.land/x/openai/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Alustetaan ympäristömuuttujat
const apiKey = Deno.env.get("OPENAI_API_KEY");
if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}
const openai = new OpenAI(apiKey);

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL environment variable is not set");
}
if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
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
    const text = await req.text();
    console.log("RAW BODY:", text);

    const body = text ? JSON.parse(text) : {};
    console.log("PARSED BODY:", body);

    // Tarkistetaan, onko idList taulukko
    const idList = Array.isArray(body?.id) ? body.id : [];
    console.log("Extracted ID list:", idList);

    // Haetaan ravintoloiden tiedot runRefresh-funktiolla
    const { data, error } = await runRefresh(supabase, idList);

    if (error) {
      throw new Error(error);
    }

    return new Response(
      JSON.stringify({ message: "Refresh completed successfully!", data }),
      {
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in refresh-lunches function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred." }),
      {
        status: 500,
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

