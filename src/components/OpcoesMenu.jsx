import { useAuth } from "../context/useAuth";
import { DesktopShell } from "./DesktopShell";

// Corpo comum das telas de Opções (motorista/contratante): cabeçalho do
// usuário + lista de itens navegáveis. A bottom nav varia por perfil, então
// fica a cargo de quem usa (via children).
function CabecalhoUsuario({ size = 56 }) {
  const { user } = useAuth();
  return (
    <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, #C9A84C, #A8873A)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
        <span style={{ fontSize: size * 0.4, fontWeight: 800, color: "#1A1209" }}>T</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{user?.nome}</div>
      <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{user?.email}</div>
    </div>
  );
}

export function OpcoesMenu({ itens, onNavigate, children }) {
  return (
    <>
      <div className="only-mobile screen">
        <div className="header"><h1>Opções</h1></div>
        <div className="content">
          <CabecalhoUsuario />
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {itens.map((item, i) => (
              <div key={i} onClick={() => item.screen && onNavigate(item.screen)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < itens.length - 1 ? "1px solid var(--border)" : "none", cursor: item.screen ? "pointer" : "default" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
                </div>
                {item.screen && <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>}
              </div>
            ))}
          </div>
        </div>
        {children}
      </div>

      {/* Desktop: mesmo shell (TopNavDesktop) de toda outra rota desktop --
          antes disso usava um header próprio (.screen-form-desktop), migrado
          aqui pro shell compartilhado (item 6, 08/09/2026). Só 3 itens hoje
          -- cartões lado a lado usam a largura real sem esticar pra
          full-bleed (não faria sentido pra um menu curto). */}
      <DesktopShell tipo="contratante" active="opcoes" onNavigate={onNavigate}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Opções</h1>
        <CabecalhoUsuario size={72} />
        <div className="menu-cards-desktop">
          {itens.map((item, i) => (
            <div key={i} className="card menu-card-desktop" onClick={() => item.screen && onNavigate(item.screen)}
              style={{ cursor: item.screen ? "pointer" : "default" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, marginBottom: 12 }}>{item.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{item.label}</div>
              <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </DesktopShell>
    </>
  );
}
