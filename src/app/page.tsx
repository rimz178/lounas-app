import HomeClient from "./components/HomeClient";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lounas Tänään</h1>
        <Link href="/login">
          <button
            type="button"
            className="border rounded px-3 py-1 bg-blue-600 text-white"
          >
            Kirjaudu sisään
          </button>
        </Link>
      </div>
      <HomeClient />
    </div>
  );
}
