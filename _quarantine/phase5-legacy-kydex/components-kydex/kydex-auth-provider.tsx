"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { LanguageProvider } from "../../i18n/i18n-provider";
import AuthShell from "../auth-shell";

type User = {
  name: string;
  email: string;
  tier: string;
  usage: { screensThisMonth: number; screensLimit: number };
  apiKeys: Array<{ id: string; isActive: boolean }>;
};

type AuthResult = { success: boolean; error?: string };

type AuthContextValue = {
  user: User | null;
  login: (opts: { email: string; password: string }) => Promise<AuthResult>;
  signup: (opts: { email: string; password: string; name?: string; company?: string }) => Promise<AuthResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function createDemoUser(email = "demo@kydex.local", name = "Demo User"): User {
  return {
    name,
    email,
    tier: "free",
    usage: { screensThisMonth: 12, screensLimit: 50 },
    apiKeys: [{ id: "demo-key-1", isActive: true }],
  };
}

export function KydexAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("kydex_user");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch (e) {
        localStorage.removeItem("kydex_user");
      }
    }
  }, []);

  const login = async ({ email }: { email: string; password: string }) => {
    const u = createDemoUser(email, email.split("@")[0]);
    setUser(u);
    localStorage.setItem("kydex_user", JSON.stringify(u));
    return { success: true } as AuthResult;
  };

  const signup = async ({ email, name }: { email: string; password: string; name?: string; company?: string }) => {
    const u = createDemoUser(email, name || email.split("@")[0]);
    setUser(u);
    localStorage.setItem("kydex_user", JSON.stringify(u));
    return { success: true } as AuthResult;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("kydex_user");
  };

  return (
    <LanguageProvider>
      <AuthShell>
        <AuthContext.Provider value={{ user, login, signup, logout }}>{children}</AuthContext.Provider>
      </AuthShell>
    </LanguageProvider>
  );
}

export function useKydexAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useKydexAuth must be used within KydexAuthProvider");
  return ctx;
}

export default KydexAuthProvider;
