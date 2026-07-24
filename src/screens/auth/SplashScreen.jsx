import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { TrukerLogo } from "../../components/TrukerLogo";

// ─────────────────────────────────────────────
// SPLASH
// ─────────────────────────────────────────────
export function SplashScreen({ onNavigate }) {
  const { user } = useAuth();
  useEffect(() => {
    const t = setTimeout(() => {
      if (user) {
        if (user.tipo === "admin") onNavigate("admin-dashboard");
        else if (user.tipo === "motorista") onNavigate("home-motorista");
        else onNavigate("home-contratante");
      } else {
        onNavigate("entrada");
      }
    }, 1800);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "linear-gradient(180deg, #F5F0E8 0%, #EFE9DC 100%)" }}>
      <TrukerLogo size="lg" />
      <div style={{ marginTop: 52, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", opacity: 0.4 }} />
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", opacity: 0.7 }} />
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C" }} />
      </div>
    </div>
  );
}
