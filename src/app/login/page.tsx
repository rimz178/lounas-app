"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail, signUpWithEmail } from "../service/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          throw new Error(error.message);
        }
        router.push("/");
      } else {
        const { error } = await signUpWithEmail(email, password);
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
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 border rounded p-6 bg-white shadow-md"
      >
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
        <button
          type="button"
          className="text-sm underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Luo tunnus" : "Minulla on jo tunnus"}
        </button>
      </form>
    </div>
  );
}
