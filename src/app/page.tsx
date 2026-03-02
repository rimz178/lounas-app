import HomeClient from "./components/HomeClient";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="w-full bg-orange-200 py-20 flex flex-col items-center justify-center">
        <h1 className="text-7xl font-bold text-center mb-4">Lounas Tänään</h1>
        <p className="text-3xl text-center">
          Lounastänään.fi – löydä päivän lounas!
        </p>
      </header>
      <HomeClient />
    </div>
  );
}
