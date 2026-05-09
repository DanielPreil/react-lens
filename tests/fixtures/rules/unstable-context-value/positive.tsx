import { createContext } from "react";
import type { ReactNode } from "react";

const AuthContext = createContext({ user: null as null | { id: string }, logout: () => {} });

type AuthProviderProps = {
  user: { id: string } | null;
  logout: () => void;
  children: ReactNode;
};

export function AuthProvider({ user, logout, children }: AuthProviderProps) {
  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}
