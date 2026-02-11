import HomeClient from "./components/HomeClient";

async function refreshMenus() {
  "use server";

  const token = process.env.MENU_REFRESH_TOKEN;
  if (!token) throw new Error("MENU_REFRESH_TOKEN puuttuu");

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  await fetch(`${baseUrl}/api?token=${token}`, {
    method: "POST",
    cache: "no-store",
  });
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="p-4">
        <h1 className="text-3xl font-bold mb-4">Lounas Tänään</h1>

        <form action={refreshMenus}>
          <button
            type="submit"
            className="border rounded px-2 py-1 bg-blue-600 text-white"
          >
            Päivitä lounaslistat nyt
          </button>
        </form>
      </div>
      <HomeClient />
    </div>
  );
}
