import { useAuth } from "../context/AuthContext";

// Corpo comum das telas de Opções (motorista/contratante): cabeçalho do
// usuário + lista de itens navegáveis. A bottom nav varia por perfil, então
// fica a cargo de quem usa (via children).
export function OpcoesMenu({ itens, onNavigate, children }) {
  const { user } = useAuth();
  return (
    <div className="screen">
      <div className="header"><h1>Opções</h1></div>
      <div className="content">
        <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #C9A84C, #A8873A)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#1A1209" }}>T</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{user?.nome}</div>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{user?.email}</div>
        </div>
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
  );
}
