"use client";
import type { PostgrestError } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AddRestaurantForm from "../components/admin/AddRestaurantForm";
import MenuEditor, {
  type AdminMenuRow,
  type AdminRestaurantOption,
  type SaveStatus,
} from "../components/admin/MenuEditor";
import { supabase } from "../service/supabaseClient";
import { useProfile } from "../service/useProfile";

type UpdateStatus = "idle" | "loading" | "success" | "error";

export default function Hallinta() {
  const router = useRouter();
  const profile = useProfile();

  const [restaurants, setRestaurants] = useState<AdminRestaurantOption[]>([]);
  const [menus, setMenus] = useState<AdminMenuRow[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [menu, setMenu] = useState<string>("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");

  useEffect(() => {
    if (profile && profile.role !== "admin") {
      router.replace("/");
    }
  }, [profile, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const [{ data: restaurantData }, { data: menuData }] = await Promise.all([
        supabase.from("ravintolat").select("id, name").order("name"),
        supabase.from("menus").select("id, restaurant_id, menu_text"),
      ]);

      if (cancelled) return;

      setRestaurants((restaurantData ?? []) as AdminRestaurantOption[]);
      setMenus((menuData ?? []) as AdminMenuRow[]);
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selected) {
      const found = menus.find((m) => m.restaurant_id === selected);
      setMenu(found?.menu_text || "");
      setStatus("idle");
    }
  }, [selected, menus]);

  if (!profile) {
    return <p>Ei oikeuksia palaa etusivulle</p>;
  }
  if (profile.role !== "admin") {
    router.replace("/");
    return null;
  }

  function handleRestaurantAdded(restaurant: AdminRestaurantOption) {
    setRestaurants((prev) =>
      [...prev, restaurant].sort((a, b) => a.name.localeCompare(b.name, "fi")),
    );
    setSelected(restaurant.id);
    setMenu("");
    setStatus("idle");
  }

  async function handleSave() {
    if (!selected || !menu.trim()) return;

    setStatus("loading");
    const trimmedMenu = menu.trim();

    const { error: menuError } = await supabase
      .from("menus")
      .upsert(
        { restaurant_id: selected, menu_text: trimmedMenu },
        { onConflict: "restaurant_id" },
      );

    let modeError: PostgrestError | null = null;
    if (!menuError) {
      const { error: updateModeError } = await supabase
        .from("ravintolat")
        .update({ menu_mode: "manual" })
        .eq("id", selected);
      modeError = updateModeError;
    }

    if (!menuError && !modeError) {
      setStatus("success");
      setMenus((prev) => {
        const idx = prev.findIndex((m) => m.restaurant_id === selected);
        if (idx > -1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], menu_text: trimmedMenu };
          return copy;
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            restaurant_id: selected,
            menu_text: trimmedMenu,
          },
        ];
      });
    } else {
      setStatus("error");
    }
  }

  async function handleUpdate() {
    setUpdateStatus("loading");

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setUpdateStatus("error");
        return;
      }

      const res = await fetch("/api/refresh-lunches", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      setUpdateStatus(res.ok ? "success" : "error");
    } catch {
      setUpdateStatus("error");
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Hallinta</h1>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Automaattinen päivitys</h2>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={updateStatus === "loading"}
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {updateStatus === "loading"
            ? "Päivitetään..."
            : "Päivitä ruokalistat OpenAI:lla"}
        </button>
        {updateStatus === "success" ? (
          <p className="mt-2 text-sm text-green-700">
            Päivitys käynnistetty. Tämä voi kestää hetken.
          </p>
        ) : null}
        {updateStatus === "error" ? (
          <p className="mt-2 text-sm text-red-700">Päivitys epaonnistui.</p>
        ) : null}
      </section>

      <AddRestaurantForm onRestaurantAdded={handleRestaurantAdded} />

      <MenuEditor
        restaurants={restaurants}
        selected={selected}
        menu={menu}
        status={status}
        onSelect={setSelected}
        onMenuChange={setMenu}
        onSave={handleSave}
      />
    </main>
  );
}
