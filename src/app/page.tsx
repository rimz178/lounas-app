
import HomeClient from "./components/HomeClient";

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lounas Tänään</h1>
      </div>
      <HomeClient />
    </div>
  );
}
