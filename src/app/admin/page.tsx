"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AddRestaurantForm from "../components/admin/AddRestaurantForm";
import DeleteRestaurantPanel, {
  type DeleteStatus,
} from "../components/admin/DeleteRestaurantPanel";
import MenuEditor, {
  type AdminMenuRow,
  type AdminRestaurantOption,
  type SaveStatus,
} from "../components/admin/MenuEditor";
import { supabase } from "../service/supabaseClient";
import { useProfile } from "../service/useProfile";
/**
 * Hallintasivu, jossa voi päivittää ruokalistat käyttäen OpenAi:ta, lisätä
 * ravintoloita, poistaa ravintoloita ja muokata ruokalistoja.
 */
type UpdateStatus = "idle" | "loading" | "success" | "error";
type RefreshRun = {
  id: number;
  url: string;
  status: string;
  conclusion: string | null;
  runNumber: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  totalSteps: number;
  completedSteps: number;
  progressPercent: number | null;
  currentStep: string | null;
};

const refreshStatusLabels: Record<string, string> = {
  queued: "Jonossa",
  in_progress: "Käynnissä",
  completed: "Valmis",
  pending: "Odottaa",
  requested: "Pyydetty",
  waiting: "Odottaa",
};

const refreshConclusionLabels: Record<string, string> = {
  success: "Onnistui",
  failure: "Epäonnistui",
  cancelled: "Peruutettu",
  skipped: "Ohitettu",
  neutral: "Valmis",
  timed_out: "Aikakatkaistu",
  action_required: "Vaatii toimia",
};

function formatRefreshStatus(run: RefreshRun | null) {
  if (!run) return "Ei aiempaa ajoa";

  if (run.status === "completed") {
    return refreshConclusionLabels[run.conclusion ?? ""] ?? "Valmis";
  }

  return refreshStatusLabels[run.status] ?? run.status;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Hallinta() {
  const router = useRouter();
  const profile = useProfile();

  const [restaurants, setRestaurants] = useState<AdminRestaurantOption[]>([]);
  const [menus, setMenus] = useState<AdminMenuRow[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [selectedToDelete, setSelectedToDelete] = useState<string>("");
  const [menu, setMenu] = useState<string>("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus>("idle");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [refreshRun, setRefreshRun] = useState<RefreshRun | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string>("");
  const [loadError, setLoadError] = useState<string>("");

  useEffect(() => {
    if (profile && profile.role !== "admin") {
      router.replace("/");
    }
  }, [profile, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const [
        { data: restaurantData, error: restaurantError },
        { data: menuData, error: menuError },
      ] = await Promise.all([
        supabase.from("ravintolat").select("id, name").order("name"),
        supabase.from("menus").select("id, restaurant_id, menu_text"),
      ]);

      if (cancelled) return;

      if (restaurantError || menuError) {
        console.error("Admin data load failed", {
          restaurantError,
          menuError,
        });

        const messages: string[] = [];
        if (restaurantError) {
          messages.push(
            `Ravintoloiden lataus epäonnistui: ${restaurantError.message}`,
          );
        }
        if (menuError) {
          messages.push(`Menulistan lataus epäonnistui: ${menuError.message}`);
        }

        setLoadError(
          messages.join(" ") ||
            "Hallintadatan lataus epäonnistui. Yritä päivittää sivu.",
        );
      } else {
        setLoadError("");
      }

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

  const fetchRefreshStatus = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) return;

    const res = await fetch("/api/refresh-lunches", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      return;
    }

    const payload = (await res.json()) as { run: RefreshRun | null };
    setRefreshRun(payload.run ?? null);
  }, []);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    void fetchRefreshStatus();
  }, [fetchRefreshStatus, profile]);

  useEffect(() => {
    if (profile?.role !== "admin" || !refreshRun?.isActive) return;

    const interval = window.setInterval(() => {
      void fetchRefreshStatus();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchRefreshStatus, profile, refreshRun?.isActive]);

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
    setSelectedToDelete(restaurant.id);
    setMenu("");
    setStatus("idle");
    setDeleteStatus("idle");
    setDeleteMessage("");
  }

  async function handleSave() {
    if (!selected || !menu.trim()) return;

    setStatus("loading");
    const trimmedMenu = menu.trim();

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setStatus("error");
        return;
      }

      const res = await fetch("/api/admin/menus", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantId: selected,
          menuText: trimmedMenu,
        }),
      });

      const payload = (await res.json()) as {
        menu?: AdminMenuRow;
        error?: string;
      };

      if (!res.ok || !payload.menu) {
        setStatus("error");
        return;
      }

      const savedMenu = payload.menu;

      setStatus("success");
      setMenus((prev) => {
        const idx = prev.findIndex((m) => m.restaurant_id === selected);
        if (idx > -1) {
          const copy = [...prev];
          copy[idx] = savedMenu;
          return copy;
        }
        return [...prev, savedMenu];
      });
    } catch {
      setStatus("error");
    }
  }

  async function handleDelete() {
    if (!selectedToDelete) return;

    setDeleteStatus("loading");
    setDeleteMessage("");

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setDeleteStatus("error");
        setDeleteMessage("Kirjautuminen vanheni. Kirjaudu uudelleen.");
        return;
      }

      const res = await fetch("/api/admin/restaurants", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ restaurantId: selectedToDelete }),
      });

      const payload = (await res.json()) as {
        deleted?: boolean;
        error?: string;
        restaurant?: { id: string; name: string };
      };

      if (!res.ok || !payload.deleted || !payload.restaurant) {
        setDeleteStatus("error");
        setDeleteMessage(payload.error ?? "Ravintolan poisto epäonnistui.");
        return;
      }

      setRestaurants((prev) =>
        prev.filter((restaurant) => restaurant.id !== selectedToDelete),
      );
      setMenus((prev) =>
        prev.filter((menuRow) => menuRow.restaurant_id !== selectedToDelete),
      );

      if (selected === selectedToDelete) {
        setSelected("");
        setMenu("");
        setStatus("idle");
      }

      setSelectedToDelete("");
      setMenu("");
      setDeleteStatus("success");
      setDeleteMessage(`Ravintola poistettu: ${payload.restaurant.name}`);
    } catch {
      setDeleteStatus("error");
      setDeleteMessage("Ravintolan poisto epäonnistui.");
    }
  }

  async function handleUpdate() {
    setUpdateStatus("loading");
    setRefreshMessage("");

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setUpdateStatus("error");
        setRefreshMessage("Kirjautuminen vanheni. Kirjaudu uudelleen.");
        return;
      }

      const res = await fetch("/api/refresh-lunches", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const payload = (await res.json()) as {
        started?: boolean;
        message?: string;
        error?: string;
        run?: RefreshRun | null;
      };

      if (!res.ok) {
        setUpdateStatus("error");
        setRefreshMessage(payload.error ?? "Päivitys epäonnistui.");
        return;
      }

      setRefreshRun(payload.run ?? null);
      setRefreshMessage(payload.message ?? "Päivityksen tila päivitetty.");
      setUpdateStatus("success");
    } catch {
      setUpdateStatus("error");
      setRefreshMessage("Päivitys epäonnistui.");
    }
  }

  const isRefreshActive = refreshRun?.isActive ?? false;
  const refreshStatusText = formatRefreshStatus(refreshRun);
  const progressPercent = refreshRun?.progressPercent ?? 0;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Hallinta</h1>

      {loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Automaattinen päivitys</h2>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={updateStatus === "loading" || isRefreshActive}
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {updateStatus === "loading"
            ? "Tarkistetaan..."
            : isRefreshActive
              ? "Päivitys käynnissä"
              : "Päivitä ruokalistat OpenAI:lla"}
        </button>

        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-700">
            Tila: <span className="font-medium">{refreshStatusText}</span>
          </p>

          {refreshRun ? (
            <>
              <p className="text-sm text-gray-600">
                Ajo #{refreshRun.runNumber} päivitetty{" "}
                {formatTimestamp(refreshRun.updatedAt)}
              </p>

              {refreshRun.totalSteps > 0 ? (
                <>
                  <div className="h-2 w-full max-w-xl overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    {refreshRun.completedSteps} / {refreshRun.totalSteps}{" "}
                    vaihetta valmiina
                    {refreshRun.currentStep
                      ? ` • Nyt: ${refreshRun.currentStep}`
                      : ""}
                  </p>
                </>
              ) : isRefreshActive ? (
                <p className="text-sm text-gray-600">
                  Workflow on käynnistynyt, vaiheiden tietoja haetaan...
                </p>
              ) : null}

              <a
                href={refreshRun.url}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm font-medium text-blue-700 hover:underline"
              >
                Avaa GitHub Actions -ajo
              </a>
            </>
          ) : null}

          {refreshMessage ? (
            <p
              className={`text-sm ${
                updateStatus === "error" ? "text-red-700" : "text-green-700"
              }`}
            >
              {refreshMessage}
            </p>
          ) : null}
        </div>
      </section>

      <AddRestaurantForm onRestaurantAdded={handleRestaurantAdded} />

      <DeleteRestaurantPanel
        restaurants={restaurants}
        selected={selectedToDelete}
        deleteStatus={deleteStatus}
        deleteMessage={deleteMessage}
        onSelect={setSelectedToDelete}
        onDelete={handleDelete}
      />

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
