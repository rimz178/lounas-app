import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthContext";
import { supabase } from "./supabaseClient"; 

type Profile = {
  id: string;
  role: "admin" | "user";
};

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  return profile;
}