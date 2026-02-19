"use client";

import { useState } from "react";
import { supabase } from "../service/supabaseClient";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { refreshAuth } = useAuth(); 
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw new Error(error.message);
      }

    
      await refreshAuth();
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Jotain meni pieleen. Yritä uudelleen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Kirjaudu sisään</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Sähköposti"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          required
        />
        <input
          type="password"
          placeholder="Salasana"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="border rounded px-4 py-2 bg-blue-600 text-white"
        >
          {loading ? "Kirjaudutaan..." : "Kirjaudu"}
        </button>
      </form>
    </div>
  );
}
