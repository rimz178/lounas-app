import HomeClient from "./components/HomeClient";
import Navigation from "./components/Navigation";
export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="w-full bg-neutral-900 py-20 flex flex-col items-center justify-center">
        <h1 className="text-7xl font-bold text-center mb-4 text-white">
          Lounas Tänään
        </h1>
        <p className="text-3xl text-center text-white">
          Lounastänään.fi – löydä päivän lounas!
        </p>
      </header>
      <Navigation />
      <HomeClient />
    </div>
  );
}
