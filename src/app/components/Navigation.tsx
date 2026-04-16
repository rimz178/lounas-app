"use client";

import Link from "next/link";
import AuthButton from "./AuthButton";
import { useAuth } from "./AuthContext";
import { useProfile } from "../service/useProfile";
/**
 * Navigation-komponentti, joka näyttää sovelluksen navigaatiopalkin
 * @returns JSX-elementti, joka sisältää navigaatiolinkit ja AuthButton-komponentin
 */

export default function Navigation() {
  const { isLoggedIn } = useAuth();
  const profile = useProfile();
  const isAdmin = isLoggedIn && profile?.role === "admin";

  return (
    <nav className="w-full bg-neutral-900 py-2 sm:py-4 flex items-center px-4 sm:px-8">
      <div className="flex items-center space-x-4 sm:space-x-8">
        <Link
          href="/"
          className="text-white text-base sm:text-lg font-semibold hover:text-red-500 transition"
        >
          Etusivu
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="text-white text-base sm:text-lg font-semibold hover:text-red-500 transition"
          >
            Hallinta
          </Link>
        )}
        <Link
          href="/menu"
          className="text-white text-base sm:text-lg font-semibold hover:text-red-500 transition"
        >
          Ruokalistat
        </Link>
      </div>
      <div className="ml-auto">
        <AuthButton />
      </div>
    </nav>
  );
}
