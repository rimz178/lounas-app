"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthContext";
import { supabase } from "../service/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, isLoggedIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          throw new Error(error.message);
        }
        router.push("/"); // Ohjaa käyttäjä etusivulle kirjautumisen jälkeen
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          throw new Error(error.message);
        }
        alert("Tunnus luotu! Tarkista sähköpostisi vahvistuslinkin varalta.");
        setMode("login");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Tapahtui virhe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-4 border rounded p-6 bg-black shadow-md">
        {isLoggedIn ? (
          <>
            <h1 className="text-xl font-semibold">
              Tervetuloa, {user?.email}!
            </h1>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
              className="w-full border rounded px-2 py-1 bg-red-600 text-white"
            >
              Kirjaudu ulos
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="text-xl font-semibold">
              {mode === "login" ? "Kirjaudu sisään" : "Luo tunnus"}
            </h1>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">
                Sähköposti
              </label>
              <input
                id="email"
                type="email"
                className="w-full border rounded px-2 py-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="password"
              >
                Salasana
              </label>
              <input
                id="password"
                type="password"
                className="w-full border rounded px-2 py-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full border rounded px-2 py-1 bg-blue-600 text-white disabled:opacity-60"
            >
              {loading
                ? mode === "login"
                  ? "Kirjaudutaan..."
                  : "Luodaan tunnusta..."
                : mode === "login"
                  ? "Kirjaudu"
                  : "Luo tunnus"}
            </button>
            <button
              type="button"
              className="text-sm underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Luo tunnus" : "Minulla on jo tunnus"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
