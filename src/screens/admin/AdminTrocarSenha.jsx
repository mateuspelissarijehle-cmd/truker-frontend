import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { PasswordInput } from "../../components/PasswordInput";

// ─────────────────────────────────────────────
// ADMIN — TROCAR SENHA
// ─────────────────────────────────────────────
export function AdminTrocarSenha({ onNavigate }) {
  const { token } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const salvar = async () => {
    setError(""); setSucesso(false);
    if (!senhaAtual || !novaSenha || !confirmarSenha) return setError("Preencha todos os campos");
    if (novaSenha.length < 8) return setError("A nova senha deve ter pelo menos 8 caracteres");
    if (novaSenha !== confirmarSenha) return setError("A nova senha e a confirmação não são iguais");

    setLoading(true);
    try {
      await api("PATCH", "/api/admin/me/senha", { senhaAtual, novaSenha }, token);
      setSucesso(true);
      setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Trocar Senha</h1></div>
      <div className="content">
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
          <p style={{ fontSize: 13, color: "var(--text3)" }}>Altere a senha da sua conta de administrador</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {sucesso && <div className="alert alert-success">✅ Senha alterada com sucesso!</div>}

        <div className="field">
          <label>Senha atual</label>
          <PasswordInput value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} />
        </div>
        <div className="field">
          <label>Nova senha (mínimo 8 caracteres)</label>
          <PasswordInput value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
        </div>
        <div className="field">
          <label>Confirmar nova senha</label>
          <PasswordInput value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} />
        </div>

        <button className="btn btn-primary" onClick={salvar} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </div>
    </div>
  );
}
