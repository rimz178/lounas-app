"use client";

import { useState } from "react";

export default function Hallinta() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  async function handleUpdate() {
    setStatus("loading");
    try {
      const res = await fetch("/api/refresh-lunches", { method: "POST" });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <h1>Hallinta</h1>
      <p>Tervetuloa ylläpitosivulle!</p>
      <button
        type="button"
        onClick={handleUpdate}
        disabled={status === "loading"}
        className="p-2 bg-blue-500 text-white rounded"
      >
        Päivitä ruokalistat
      </button>
      {status === "loading" && <p>Päivitetään...</p>}
      {status === "success" && <p>Päivitys valmis!</p>}
      {status === "error" && <p>Päivitys epäonnistui.</p>}
    </div>
  );
}
