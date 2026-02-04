import HomeClient from "./components/HomeClient";

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="p-4">
        <h1 className="text-3xl font-bold mb-4">Lounas Tänään</h1>
        <p className="mb-2"></p>
        <p></p>
      </div>
      <HomeClient />
    </div>
  );
}
