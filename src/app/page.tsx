import HomeClient from "./components/HomeClient";
import AdminRefreshButton from "./components/AdminControl";
import AuthStatus from "./components/AuthStatus";

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lounas Tänään</h1>
        <div className="flex items-center gap-2">
          <AdminRefreshButton />
          <AuthStatus />
        </div>
      </div>
      <HomeClient />
    </div>
  );
}
