"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setLoading(false);

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/");
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    if (data.user && !data.session) {
      setInfo("Tunnus luotu, tarkista vahvistuslinkki sähköpostistasi.");
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 border rounded p-6 bg-black"
      >
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm underline"
        >
          Takaisin etusivulle
        </button>
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-semibold">
            {mode === "login" ? "Kirjaudu sisään" : "Luo uusi tunnus"}
          </h1>
          <button
            type="button"
            className="text-xs underline"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setInfo(null);
            }}
          >
            {mode === "login" ? "Luo tunnus" : "Minulla on jo tunnus"}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {info && <p className="text-green-500 text-sm">{info}</p>}

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
          <label className="block text-sm font-medium mb-1" htmlFor="password">
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
      </form>
    </div>
  );
}
