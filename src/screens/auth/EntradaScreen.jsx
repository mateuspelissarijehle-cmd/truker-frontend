import { TrukerLogo } from "../../components/TrukerLogo";

// ─────────────────────────────────────────────
// ENTRADA — tela inicial (motorista / contratante)
// ─────────────────────────────────────────────
export function EntradaScreen({ onNavigate }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--surface)", overflow: "hidden" }}>

      {/* Hero escuro com logo */}
      <div style={{
        background: "linear-gradient(180deg, #1A1209 0%, #271A0E 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "56px 24px 48px", position: "relative",
      }}>
        {/* Círculo decorativo sutil */}
        <div style={{
          position: "absolute", width: 280, height: 280, borderRadius: "50%",
          background: "rgba(201,168,76,0.07)", top: -60, right: -60, pointerEvents: "none",
        }} />
        <TrukerLogo size="lg" noTagline />
      </div>

      {/* Área de ação */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 24px 40px" }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 20, textAlign: "center" }}>
          Como você quer usar o TRUKER?
        </p>

        {/* Botão principal — Motorista */}
        <button
          onClick={() => onNavigate("cadastro", { tipo: "motorista" })}
          style={{
            width: "100%", padding: "18px 20px", marginBottom: 14,
            background: "var(--gold)", border: "none", borderRadius: 16,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 4px 16px rgba(201,168,76,0.30)",
          }}
        >
          <span style={{ fontSize: 34, lineHeight: 1 }}>🚛</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>Sou motorista</div>
            <div style={{ fontSize: 13, color: "rgba(26,18,9,0.65)", marginTop: 2 }}>Quero encontrar fretes e trabalhar</div>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 22, color: "var(--text)", opacity: 0.5 }}>›</span>
        </button>

        {/* Botão secundário — Contratante */}
        <button
          onClick={() => onNavigate("cadastro", { tipo: "contratante" })}
          style={{
            width: "100%", padding: "18px 20px",
            background: "transparent", border: "2px solid var(--border)", borderRadius: 16,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
          }}
        >
          <span style={{ fontSize: 34, lineHeight: 1 }}>📦</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>Sou contratante</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>Quero publicar fretes e contratar</div>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 22, color: "var(--text3)" }}>›</span>
        </button>

        {/* Link de login */}
        <p style={{ textAlign: "center", marginTop: "auto", paddingTop: 36, color: "var(--text3)", fontSize: 14 }}>
          Já tem conta?{" "}
          <span
            style={{ color: "var(--gold)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
            onClick={() => onNavigate("login")}
          >
            Faça login
          </span>
        </p>
      </div>
    </div>
  );
}
