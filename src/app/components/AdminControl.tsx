// src/app/components/AdminControls.tsx
"use client";

import { useCallback, useEffect } from "react";

export default function AdminControls() {
  const handleRefresh = useCallback(async () => {
    try {
      const response = await fetch(
        "https://clurtxpqwmekgicwusqs.supabase.co/functions/v1/refresh-lunches",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ ids: [1, 2, 3] }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to refresh lunches");
      }

      const result = await response.json();
      console.log("Refresh successful:", result);
    } catch (error) {
      console.error(
        "Error refreshing lunches:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }, []);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  return (
    <div>
      <button type="button" onClick={handleRefresh}></button>
    </div>
  );
}
