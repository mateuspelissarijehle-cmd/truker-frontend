import { useEffect, useState } from "react";
import { AuthContext } from "./useAuth";
import { registrarPushNotifications } from "../services/push";

// ─────────────────────────────────────────────
// AUTH PROVIDER
// (o context object e o hook `useAuth` ficam em ./useAuth.js -- ver comentário lá)
// ─────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("truker_user")); } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem("truker_token") || null);

  const login = (userData, tok) => {
    setUser(userData); setToken(tok);
    localStorage.setItem("truker_user", JSON.stringify(userData));
    localStorage.setItem("truker_token", tok);
  };

  const updateUserData = (newData) => {
    const updated = { ...user, ...newData };
    setUser(updated);
    localStorage.setItem("truker_user", JSON.stringify(updated));
  };

  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem("truker_user");
    localStorage.removeItem("truker_token");
  };

  // Registra push notifications sempre que motorista abre o app
  useEffect(() => {
    if (user?.tipo === "motorista" && token) {
      registrarPushNotifications(token).then(() => {
        console.log("[TRUKER] Push registration OK para", user?.email);
      }).catch(err => {
        console.error("[TRUKER] Push registration ERRO:", err);
      });
    }
  }, [user?.id, user?.tipo, user?.email, token]);

  return <AuthContext.Provider value={{ user, token, login, logout, updateUserData }}>{children}</AuthContext.Provider>;
}
