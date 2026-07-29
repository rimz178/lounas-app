"use client";

import { useRef, useState } from "react";
import { supabase } from "../../service/supabaseClient";

export type AdminRestaurantOption = {
  id: string;
  name: string;
};

export type AdminMenuRow = {
  id: string;
  restaurant_id: string;
  menu_text: string;
};

export type SaveStatus = "idle" | "loading" | "success" | "error";

type ExtractStatus = "idle" | "loading" | "error";

type Props = {
  restaurants: AdminRestaurantOption[];
  selected: string;
  menu: string;
  status: SaveStatus;
  onSelect: (restaurantId: string) => void;
  onMenuChange: (value: string) => void;
  onSave: () => void;
};

export default function MenuEditor({
  restaurants,
  selected,
  menu,
  status,
  onSelect,
  onMenuChange,
  onSave,
}: Props) {
  const [extractStatus, setExtractStatus] = useState<ExtractStatus>("idle");
  const [extractError, setExtractError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    setExtractStatus("loading");
    setExtractError("");

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        setExtractStatus("error");
        setExtractError("Kirjautuminen vanheni. Kirjaudu uudelleen.");
        return;
      }

      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/admin/menus/extract", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      const payload = (await res.json()) as {
        menuText?: string;
        error?: string;
      };

      if (!res.ok || !payload.menuText) {
        setExtractStatus("error");
        setExtractError(payload.error ?? "Kuvan lukeminen epäonnistui.");
        return;
      }

      onMenuChange(payload.menuText);
      setExtractStatus("idle");
    } catch {
      setExtractStatus("error");
      setExtractError("Kuvan lukeminen epäonnistui.");
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Muokkaa ruokalistaa</h2>

      <label htmlFor="restaurant-select" className="block text-sm font-medium">
        Valitse ravintola
      </label>
      <select
        id="restaurant-select"
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        className="mt-2 w-full max-w-md rounded-md border border-gray-300 px-3 py-2"
      >
        <option value="">-- Valitse --</option>
        {restaurants.map((restaurant) => (
          <option key={restaurant.id} value={restaurant.id}>
            {restaurant.name}
          </option>
        ))}
      </select>

      {selected ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Lue ruokalista kuvasta</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={extractStatus === "loading"}
              className="rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
            >
              {extractStatus === "loading"
                ? "Luetaan kuvaa..."
                : "Valitse kuva"}
            </button>
            <span className="ml-2 text-xs text-gray-500">
              JPEG, PNG, GIF tai WebP, max 5 MB
            </span>
            {extractStatus === "error" ? (
              <p className="mt-1 text-sm text-red-700">{extractError}</p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="menu-textarea"
              className="block text-sm font-medium"
            >
              Muokkaa ruokalistaa
            </label>
            <textarea
              id="menu-textarea"
              value={menu}
              onChange={(e) => onMenuChange(e.target.value)}
              rows={8}
              className="mt-2 block w-full max-w-2xl rounded-md border border-gray-300 px-3 py-2"
            />

            <button
              type="button"
              onClick={onSave}
              disabled={status === "loading" || !menu.trim()}
              className="mt-3 rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-60"
            >
              {status === "loading" ? "Tallennetaan..." : "Tallenna ruokalista"}
            </button>

            {status === "success" ? (
              <p className="mt-2 text-sm text-green-700">
                Menu päivitetty onnistuneesti.
              </p>
            ) : null}
            {status === "error" ? (
              <p className="mt-2 text-sm text-red-700">Päivitys epäonnistui.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
