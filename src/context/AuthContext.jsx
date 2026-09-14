import { useEffect, useState } from "react";
import { AuthContext } from "./useAuth";
import { registrarPushNotifications } from "../services/push";
import { definirHandlerTokenInvalido } from "../services/api";

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

  // Token expirado/inválido em qualquer chamada (ver api.js) desloga sozinho
  // em vez de deixar o usuário "logado" na aparência (nome, home, nav normais)
  // mas toda ação batendo em "Token inválido ou expirado" sem explicação —
  // limpar user/token aqui já basta pro App.jsx (efeito em [user]) mandar de
  // volta pra tela de entrada/login sozinho.
  useEffect(() => {
    definirHandlerTokenInvalido(() => logout());
  }, []);

  // Registra push notifications sempre que motorista abre o app
  useEffect(() => {
    if (user?.tipo === "motorista" && token) {
      registrarPushNotifications(token).catch(err => {
        console.error("[TRUKER] Push registration ERRO:", err);
      });
    }
  }, [user?.id, user?.tipo, user?.email, token]);

  return <AuthContext.Provider value={{ user, token, login, logout, updateUserData }}>{children}</AuthContext.Provider>;
}
