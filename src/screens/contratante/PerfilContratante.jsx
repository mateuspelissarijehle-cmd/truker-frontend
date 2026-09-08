import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../services/api";
import { BottomNavContratante } from "../../components/BottomNavContratante";
import { Avatar } from "../../components/Avatar";

// ─────────────────────────────────────────────
// PERFIL CONTRATANTE
// ─────────────────────────────────────────────
export function PerfilContratante({ onNavigate }) {
  const { user, token, logout } = useAuth();
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    api("GET", "/api/contratantes/perfil", null, token).then(setPerfil).catch(() => {});
  }, [token]);
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
  const listaLinks = (links, corIcone) => links.map((item, i) => (
    <div key={i} onClick={() => item.screen && onNavigate(item.screen)}
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < links.length - 1 ? "1px solid var(--border)" : "none", cursor: item.screen ? "pointer" : "default" }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: corIcone, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
      </div>
      <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
    </div>
  ));

  const cartaoPerfil = (avatarSize) => (
    <div className="card" style={{ textAlign: "center", padding: "20px" }}>
      <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
        <Avatar nome={user?.nome} fotoUrl={perfil?.foto_url} logoEmpresaUrl={perfil?.logo_empresa_url} size={avatarSize} />
        <div onClick={() => onNavigate("dados-pessoais-contratante")} style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11, border: "2px solid var(--surface)" }}>✏️</div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{user?.nome}</div>
      <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>{user?.email}</div>
      <div style={{ marginTop: 8 }}><span className="badge badge-active">Contratante</span></div>
      <div style={{ textAlign: "left", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <div className="info-row"><span className="info-label">Email</span><span className="info-value">{user?.email}</span></div>
        <div className="info-row"><span className="info-label">Telefone</span><span className="info-value">{user?.telefone || "—"}</span></div>
      </div>
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 14 }} onClick={() => onNavigate("dados-pessoais-contratante")}>✏️ Editar perfil</button>
    </div>
  );

  return (
    <>
      <div className="only-mobile screen">
        <div className="header"><h1>Conta</h1></div>
        <div className="content">
          <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
            <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
              <Avatar nome={user?.nome} fotoUrl={perfil?.foto_url} logoEmpresaUrl={perfil?.logo_empresa_url} size={80} />
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
            {listaLinks(settingsLinks, "var(--surface2)")}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Minha Atividade</div>
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
            {listaLinks(accessLinks, "var(--gold-light)")}
          </div>
          <button className="btn btn-danger" onClick={logout}>Sair da Conta</button>
        </div>
        <BottomNavContratante active="conta" onNavigate={onNavigate} />
      </div>

      {/* Desktop: perfil vira uma barra lateral fixa (não precisa rolar pra
          ver quem está logado nem pra sair da conta) e as duas listas de
          links ficam lado a lado -- página de conta de verdade, não uma
          lista de celular esticada (achado do Mateus, 02/09/2026). */}
      <div className="only-desktop screen-form-desktop">
        <div className="header"><h1>Conta</h1></div>
        <div className="form-wide-inner" style={{ paddingTop: 8, paddingBottom: 40, display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>
          <div style={{ position: "sticky", top: 16 }}>
            {cartaoPerfil(88)}
            <button className="btn btn-danger" style={{ marginTop: 14 }} onClick={logout}>Sair da Conta</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Configurações</div>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {listaLinks(settingsLinks, "var(--surface2)")}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Minha Atividade</div>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {listaLinks(accessLinks, "var(--gold-light)")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
