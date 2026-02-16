// src/app/components/AdminControls.tsx
"use client";

import { useEffect, useCallback } from "react";
import { refreshLunches } from "../service/refresLunches.ts";

export default function AdminControls() {
  const handleRefresh = useCallback(async () => {
    try {
      const ids = [1, 2, 3]; // Esimerkkidata
      const result = await refreshLunches(ids);
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

  return <div>Admin Control Panel</div>;
}
