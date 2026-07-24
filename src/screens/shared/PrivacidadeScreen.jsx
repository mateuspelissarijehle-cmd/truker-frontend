import { useAuth } from "../../context/AuthContext";

// ─────────────────────────────────────────────
// PRIVACIDADE
// ─────────────────────────────────────────────
export function PrivacidadeScreen({ onNavigate }) {
  const { user } = useAuth();
  const dadosPessoaisScreen = user?.tipo === "motorista" ? "dados-pessoais-motorista" : "dados-pessoais-contratante";
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Privacidade</h1></div>
      <div className="content">
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => onNavigate("alterar-senha")}>
          <span style={{ fontSize: 20 }}>🔑</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "var(--text)" }}>Alterar senha</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Redefina sua senha com um código enviado ao seu email</div>
          </div>
          <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
        </div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => onNavigate(dadosPessoaisScreen)}>
          <span style={{ fontSize: 20 }}>👤</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "var(--text)" }}>Dados pessoais</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Veja e edite seus dados cadastrados</div>
          </div>
          <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
        </div>
        <div className="card">
          <div className="card-title">🔒 Segurança dos seus dados</div>
          <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
            Sua senha é armazenada com hash seguro e nunca fica visível para a equipe TRUKER. Para trocá-la, enviamos um código de verificação para o email cadastrado na sua conta.
          </p>
        </div>
      </div>
    </div>
  );
}
