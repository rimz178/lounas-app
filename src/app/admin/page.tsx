"use client";

import { useState, useEffect } from "react";
import { supabase } from "../service/supabaseClient";
import type { PostgrestError } from "@supabase/supabase-js";

export default function Hallinta() {
  // Tilat
  type Restaurant = {
    id: string;
    name: string;
  };
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  type Menu = {
    restaurant_id: string;
    menu_text: string;
    date: string;
  };
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [menu, setMenu] = useState<string>("");
  const [valittuPaiva, setValittuPaiva] = useState<string>("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  useEffect(() => {
    supabase
      .from("ravintolat")
      .select("id, name")
      .then(({ data }) => setRestaurants(data || []));
    supabase
      .from("menus")
      .select("restaurant_id, menu_text, date")
      .then(({ data }) => setMenus(data || []));
  }, []);

  useEffect(() => {
    if (selected) {
      const found = menus.find((m) => m.restaurant_id === selected);
      setMenu(found?.menu_text || "");
      setStatus("idle");
    }
  }, [selected, menus]);

  async function handleSave() {
    setStatus("loading");
    // Tarkista onko menu jo olemassa
    const existing = menus.find(
      (m) => m.restaurant_id === selected && m.date === valittuPaiva,
    );

    let error: PostgrestError | null = null;
    if (existing) {
      // Päivitä olemassa oleva menu
      const { error: updateError } = await supabase
        .from("menus")
        .upsert(
          { restaurant_id: selected, menu_text: menu, date: valittuPaiva },
          { onConflict: ["restaurant_id", "date"] },
        );
      error = updateError;
    } else {
      // Lisää uusi menu
      const { error: insertError } = await supabase
        .from("menus")
        .insert({
          restaurant_id: selected,
          menu_text: menu,
          date: valittuPaiva,
        });
      error = insertError;
    }

    // Päivitä ravintolat-taulun menu_mode
    await supabase
      .from("ravintolat")
      .update({ menu_mode: "manual" })
      .eq("id", selected);

    if (!error) {
      setStatus("success");
      // Päivitä paikallinen tila, jotta uusi menu näkyy heti
      setMenus((prev) => {
        const idx = prev.findIndex(
          (m) => m.restaurant_id === selected && m.date === valittuPaiva,
        );
        if (idx > -1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], menu_text: menu, date: valittuPaiva };
          return copy;
        }
        return [
          ...prev,
          { restaurant_id: selected, menu_text: menu, date: valittuPaiva },
        ];
      });
    } else {
      setStatus("error");
    }
  }

  async function handleUpdate() {
    setUpdateStatus("loading");
    try {
      const res = await fetch("/api/refresh-lunches", { method: "POST" });
      setUpdateStatus(res.ok ? "success" : "error");
    } catch {
      setUpdateStatus("error");
    }
  }

  return (
    <div>
      <h1>Hallinta</h1>

      {/* 1. OpenAI-päivitys */}
      <button
        type="button"
        onClick={handleUpdate}
        disabled={updateStatus === "loading"}
        className="p-2 bg-blue-500 text-white rounded"
      >
        Päivitä ruokalistat OpenAI:lla
      </button>
      {updateStatus === "loading" && <p>Päivitetään...</p>}
      {updateStatus === "success" && (
        <p>Päivitys käynnistetty! Tämä voi kestää hetken.</p>
      )}
      {updateStatus === "error" && <p>Päivitys epäonnistui.</p>}

      <hr style={{ margin: "2em 0" }} />

      <label htmlFor="restaurant-select">Valitse ravintola:</label>
      <select
        id="restaurant-select"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{ marginLeft: 8, marginBottom: 16 }}
      >
        <option value="">-- Valitse --</option>
        {restaurants.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      {selected && (
        <div style={{ marginTop: 16 }}>
          <h2>Muokkaa ruokalistaa:</h2>
          <label htmlFor="date-input">Valitse päivämäärä:</label>
          <input
            id="date-input"
            type="date"
            value={valittuPaiva}
            onChange={(e) => setValittuPaiva(e.target.value)}
            style={{ display: "block", marginBottom: 8 }}
          />
          <textarea
            value={menu}
            onChange={(e) => setMenu(e.target.value)}
            rows={8}
            cols={40}
            style={{ display: "block", marginBottom: 8 }}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "loading" || !menu.trim() || !valittuPaiva}
            className="p-2 bg-green-600 text-white rounded"
          >
            Tallenna ruokalista
          </button>
          {status === "success" && <p>Menu päivitetty onnistuneesti!</p>}
          {status === "error" && <p>Päivitys epäonnistui.</p>}
        </div>
      )}

      <hr style={{ margin: "2em 0" }} />
    </div>
  );
}
