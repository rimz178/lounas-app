// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { fetchRenderedHtml } from "./fetchRenderHtml.ts";
import { runRefresh } from "./supabase.ts";
import { OpenAI } from "https://deno.land/x/openai/mod.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const apiKey = Deno.env.get("OPENAI_API_KEY");
if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}
const openai = new OpenAI(apiKey);

serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Tarkista, että Authorization-header on olemassa ja vastaa Service Role Keytä
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const text = await req.text();
    console.log("RAW BODY:", text);

    const body = text ? JSON.parse(text) : {};
    console.log("PARSED BODY:", body);

    const ids = body?.ids ?? [];
    console.log("Extracted IDs:", ids);

    if (!Array.isArray(ids)) {
      throw new Error("Invalid request body: 'ids' must be an array.");
    }

    await runRefresh(openai, ids, fetchRenderedHtml);

    return new Response(
      JSON.stringify({ message: "Refresh completed successfully!" }),
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

