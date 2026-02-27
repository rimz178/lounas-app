"use client";

import Link from "next/link";
import AuthButton from "./AuthButton";
import { useAuth } from "./AuthContext";
import { useProfile } from "../service/useProfile";

export default function Navigation() {
  const { isLoggedIn } = useAuth();
  const profile = useProfile();
  const isAdmin = isLoggedIn && profile?.role === "admin";

  return (
    <nav className="flex gap-4 p-4 bg-black-100 border-b">
      <Link href="/">Etusivu</Link>
      {isAdmin && <Link href="/hallinta">Hallinta</Link>}
      <div className="ml-auto">
        <AuthButton />
      </div>
    </nav>
  );
}
