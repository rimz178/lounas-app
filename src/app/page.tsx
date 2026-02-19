import HomeClient from "./components/HomeClient";
import AuthButton from "./components/AuthButton";

async function refreshMenus() {
  "use server";

  const token = process.env.MENU_REFRESH_TOKEN;
  if (!token) throw new Error("MENU_REFRESH_TOKEN puuttuu");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  await fetch(`${baseUrl}/api?token=${token}`, {
    method: "POST",
    cache: "no-store",
  });
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lounas Tändään</h1>
        <AuthButton />
      </div>

      <HomeClient />
    </div>
  );
}
