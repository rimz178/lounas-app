"use client";

import { useState } from "react";
import { supabase } from "../../service/supabaseClient";

type AddedRestaurant = {
  id: string;
  name: string;
};

type Props = {
  onRestaurantAdded: (restaurant: AddedRestaurant) => void;
};

type SubmitStatus = "idle" | "loading" | "success" | "error";

export default function AddRestaurantForm({ onRestaurantAdded }: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [message, setMessage] = useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedUrl = url.trim();

    if (!trimmedName || !trimmedAddress) {
      setStatus("error");
      setMessage("Nimi ja osoite ovat pakollisia.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setStatus("error");
        setMessage("Kirjautuminen vanheni. Kirjaudu uudelleen.");
        return;
      }

      const res = await fetch("/api/admin/restaurants", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          address: trimmedAddress,
          url: trimmedUrl || null,
        }),
      });

      const payload = (await res.json()) as {
        restaurant?: AddedRestaurant;
        error?: string;
      };

      if (!res.ok || !payload.restaurant) {
        setStatus("error");
        setMessage(payload.error ?? "Ravintolan lisäys epäonnistui.");
        return;
      }

      onRestaurantAdded(payload.restaurant);
      setName("");
      setAddress("");
      setUrl("");
      setStatus("success");
      setMessage("Ravintola lisätty onnistuneesti.");
    } catch {
      setStatus("error");
      setMessage("Ravintolan lisäys epäonnistui.");
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Lisää uusi ravintola</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="new-restaurant-name"
            className="block text-sm font-medium"
          >
            Ravintolan nimi
          </label>
          <input
            id="new-restaurant-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full max-w-xl rounded-md border border-gray-300 px-3 py-2"
            placeholder="Esim. Lounaskulma"
          />
        </div>

        <div>
          <label
            htmlFor="new-restaurant-address"
            className="block text-sm font-medium"
          >
            Osoite
          </label>
          <input
            id="new-restaurant-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full max-w-xl rounded-md border border-gray-300 px-3 py-2"
            placeholder="Esim. Mannerheimintie 10, Helsinki"
          />
        </div>

        <div>
          <label
            htmlFor="new-restaurant-url"
            className="block text-sm font-medium"
          >
            Ravintolan URL (valinnainen)
          </label>
          <input
            id="new-restaurant-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full max-w-xl rounded-md border border-gray-300 px-3 py-2"
            placeholder="Esim. https://ravintola.fi"
          />
          <p className="mt-1 text-xs text-gray-600">
            Voit syöttää myös ilman https://, se lisätään automaattisesti.
          </p>
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {status === "loading" ? "Lisätään..." : "Lisää ravintola"}
        </button>

        {message ? (
          <p
            className={`text-sm ${
              status === "success" ? "text-green-700" : "text-red-700"
            }`}
          >
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
