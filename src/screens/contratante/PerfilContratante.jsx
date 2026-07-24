import { useAuth } from "../../context/AuthContext";
import { BottomNavContratante } from "../../components/BottomNavContratante";

// ─────────────────────────────────────────────
// PERFIL CONTRATANTE
// ─────────────────────────────────────────────
export function PerfilContratante({ onNavigate }) {
  const { user, logout } = useAuth();
  const settingsLinks = [
    { icon: "👤", label: "Dados Pessoais", sub: "Nome, foto, CPF/CNPJ, empresa", screen: "dados-pessoais-contratante" },
    { icon: "🔔", label: "Notificações", sub: "Push, sons e alertas", screen: "notificacoes" },
    { icon: "🔒", label: "Privacidade e segurança", sub: "Senha, dados pessoais", screen: "privacidade" },
    { icon: "📄", label: "Termos de uso", sub: "Política de privacidade", screen: "termos" },
  ];
  const accessLinks = [
    { icon: "📦", label: "Meus Fretes", sub: "Histórico e em andamento", screen: "meus-fretes" },
    { icon: "💰", label: "Painel Financeiro", sub: "Gastos, rotas e extrato completo", screen: "financas-contratante" },
    { icon: "💳", label: "Pagamentos", sub: "Formas de pagamento cadastradas", screen: "pagamentos" },
    { icon: "⭐", label: "Avaliações", sub: "Motoristas avaliados", screen: "avaliacoes" },
  ];
  return (
    <div className="screen">
      <div className="header"><h1>Conta</h1></div>
      <div className="content">
        <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #C9A84C, #A8873A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, border: "3px solid var(--gold)", boxShadow: "0 4px 12px rgba(201,168,76,0.3)" }}>🏢</div>
            <div onClick={() => onNavigate("dados-pessoais-contratante")} style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11, border: "2px solid var(--surface)" }}>✏️</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{user?.nome}</div>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>{user?.email}</div>
          <div style={{ marginTop: 8 }}><span className="badge badge-active">Contratante</span></div>
        </div>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">Informações de Contato</div>
          <div className="info-row"><span className="info-label">Email</span><span className="info-value">{user?.email}</span></div>
          <div className="info-row"><span className="info-label">Telefone</span><span className="info-value">{user?.telefone || "—"}</span></div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: "auto" }} onClick={() => onNavigate("dados-pessoais-contratante")}>✏️ Editar perfil</button>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Configurações</div>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          {settingsLinks.map((item, i) => (
            <div key={i} onClick={() => item.screen && onNavigate(item.screen)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < settingsLinks.length - 1 ? "1px solid var(--border)" : "none", cursor: item.screen ? "pointer" : "default" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Minha Atividade</div>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          {accessLinks.map((item, i) => (
            <div key={i} onClick={() => onNavigate(item.screen)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < accessLinks.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--gold-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
        <button className="btn btn-danger" onClick={logout}>Sair da Conta</button>
      </div>
      <BottomNavContratante active="conta" onNavigate={onNavigate} />
    </div>
  );
}
