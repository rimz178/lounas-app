import { supabase } from "../lib/supabaseClient";

export async function refreshLunches(ids: number[]) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Error fetching session:", sessionError);
    throw new Error("Failed to fetch session.");
  }

  if (!session?.access_token) {
    throw new Error("User is not authenticated.");
  }

  const response = await fetch(
    "https://clurtxpqwmekgicwusqs.functions.supabase.co/refresh-lunches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("Error from refresh-lunches function:", error);
    throw new Error(error.error || "Failed to refresh lunches");
  }

  return response.json();
}