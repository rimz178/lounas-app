// src/app/components/AdminControls.tsx
"use client";

import { useCallback, useEffect } from "react";

export default function AdminControls() {
  const handleRefresh = useCallback(async () => {
    try {
      // Lisää tämä rivi heti funktion alkuun
      console.log(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );

      const response = await fetch(
        "https://clurtxpqwmekgicwusqs.supabase.co/functions/v1/refresh-lunches",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Error refreshing lunches:", error);
        throw new Error(error.message || "Failed to refresh lunches");
      }

      console.log("Lunches refreshed successfully");
    } catch (error) {
      console.error("Error refreshing lunches:", error);
    }
  }, []);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  return (
    <div>
      <button type="button" onClick={handleRefresh}>
        Päivitä{" "}
      </button>
    </div>
  );
}
