import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../services/api";
import { formatKm } from "../../utils/format";
import { TIPOS_VEICULO } from "../../data/catalogos";
import { Loading } from "../../components/Loading";
import { BottomNavMotorista } from "../../components/BottomNavMotorista";
import { Avatar } from "../../components/Avatar";

// ─────────────────────────────────────────────
// PERFIL MOTORISTA — ✅ ganhos reais da API
// ─────────────────────────────────────────────
export function PerfilMotorista({ onNavigate }) {
  const { user, token, logout } = useAuth();
  const [ganhos, setGanhos] = useState(null);
  const [loadingGanhos, setLoadingGanhos] = useState(false);
  const [perfil, setPerfil] = useState(null);

  // Carrega perfil completo ao montar
  useEffect(() => {
    api("GET", "/api/motoristas/perfil", null, token)
      .then(setPerfil)
      .catch(() => {});
  }, [token]);

  // Busca ganhos reais ao entrar na tela (usados nos cards de resumo)
  useEffect(() => {
    queueMicrotask(() => setLoadingGanhos(true));
    api("GET", "/api/motoristas/ganhos", null, token)
      .then(setGanhos)
      .catch(() => setGanhos(null))
      .finally(() => setLoadingGanhos(false));
  }, [token]);

  return (
    <div className="screen">
      <div className="header"><h1>Perfil</h1></div>
      <div className="content">
        <div style={{ textAlign: "center", padding: "14px 0 20px" }}>
          <div style={{ margin: "0 auto 10px", width: 68 }}>
            <Avatar nome={user?.nome} fotoUrl={perfil?.foto_url} logoEmpresaUrl={perfil?.logo_empresa_url} size={68} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.nome}</div>
          <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>{user?.email}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
            <span className="badge badge-active">Motorista</span>
            <span className="badge" style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.4)" }}>⭐ {ganhos ? Number(ganhos.avaliacao_media).toFixed(1) : "—"}</span>
          </div>
        </div>

        {loadingGanhos ? <Loading /> : (
          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div className="stat-card"><div className="stat-value">{ganhos?.total_fretes ?? "—"}</div><div className="stat-label">Fretes feitos</div></div>
            <div className="stat-card"><div className="stat-value">{ganhos ? Number(ganhos.avaliacao_media).toFixed(1) : "—"}</div><div className="stat-label">Avaliação</div></div>
            <div className="stat-card"><div className="stat-value">{ganhos ? formatKm(ganhos.km_carregado) : "—"}</div><div className="stat-label">Km carregado</div></div>
            <div className="stat-card"><div className="stat-value">{ganhos ? formatKm(ganhos.km_vazio_total || 0) : "—"}</div><div className="stat-label">Km vazio total</div></div>
          </div>
        )}
        <div className="card">
          <div className="card-title">Dados do veículo</div>
          <div className="info-row"><span className="info-label">Tipo</span><span className="info-value">{(() => { const t = TIPOS_VEICULO.find(v => v.id === (perfil?.tipo_veiculo || user?.tipo_veiculo)); return t ? `${t.icon} ${t.label}` : (perfil?.tipo_veiculo || "—"); })()}</span></div>
          <div className="info-row"><span className="info-label">Marca/Modelo</span><span className="info-value">{[perfil?.marca_veiculo, perfil?.modelo_veiculo].filter(Boolean).join(" ") || "—"}</span></div>
          <div className="info-row"><span className="info-label">Placa</span><span className="info-value">{perfil?.placa_veiculo || "—"}</span></div>
          <div className="info-row"><span className="info-label">Ano</span><span className="info-value">{perfil?.ano_veiculo || "—"}</span></div>
          <div className="info-row"><span className="info-label">RNTRC</span><span className="info-value">{perfil?.rntrc || "—"}</span></div>
          <div className="info-row"><span className="info-label">CNH</span><span className="info-value">{perfil?.cnh_numero || "—"}</span></div>
        </div>
        {[["💬", "Chat", "chat"], ["⭐", "Avaliações", "avaliacoes"]].map(([icon, label, screen]) => (
          <div key={label} className="card" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => onNavigate(screen)}>
            <span style={{ fontSize: 20 }}>{icon}</span><span style={{ fontWeight: 600 }}>{label}</span><span style={{ marginLeft: "auto", color: "var(--text2)" }}>›</span>
          </div>
        ))}
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 4 }}>Minha Conta</div>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
          {[
            { icon: "👤", label: "Dados Pessoais", sub: "Nome, foto, CPF, CNH, endereço", screen: "dados-pessoais-motorista" },
            { icon: "🚛", label: "Meu Caminhão", sub: "Tipo, carreta, placa, documentos", screen: "dados-caminhao" },
            { icon: "🛡️", label: "Seguro", sub: "Obrigatório pra aceitar fretes", screen: "seguro-motorista" },
            { icon: "🧼", label: "Lavagem do Veículo", sub: "Certificado de higienização pós-fertilizante", screen: "lavagem-veiculo" },
            { icon: "💰", label: "Minhas Finanças", sub: "Receitas, despesas e KM vazio", screen: "financas-motorista" },
          ].map((item, i, arr) => (
            <div key={i} onClick={() => item.screen && onNavigate(item.screen)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", cursor: item.screen ? "pointer" : "default" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--gold-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 4 }}>Ajuda e Conta</div>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
          {[
            { icon: "🔔", label: "Notificações", sub: "Push, sons e alertas", screen: "notificacoes" },
            { icon: "🔒", label: "Privacidade", sub: "Senha, dados pessoais", screen: "privacidade" },
            { icon: "📄", label: "Termos de uso", sub: "Política de privacidade", screen: "termos" },
            { icon: "💬", label: "Suporte", sub: "Fale com a gente", screen: "suporte" },
            { icon: "ℹ️", label: "Sobre o app", sub: "Versão, contato e créditos", screen: "sobre" },
          ].map((item, i, arr) => (
            <div key={i} onClick={() => item.screen && onNavigate(item.screen)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", cursor: item.screen ? "pointer" : "default" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
        <button className="btn btn-danger" style={{ marginTop: 4 }} onClick={logout}>Sair da Conta</button>
      </div>
      <BottomNavMotorista active="conta" onNavigate={onNavigate} />
    </div>
  );
}
