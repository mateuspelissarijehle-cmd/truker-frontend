import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { TrukerLogo } from "../../components/TrukerLogo";
import { PasswordInput } from "../../components/PasswordInput";

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
export function LoginScreen({ onNavigate }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    setError("");
    if (!form.email || !form.senha) return setError("Preencha todos os campos");
    setLoading(true);
    try {
      const data = await api("POST", "/api/auth/login", form);
      login(data.user || data.usuario, data.token);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <TrukerLogo size="md" />
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="field"><label>Email</label><input type="email" placeholder="seu@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
      <div className="field"><label>Senha</label><PasswordInput value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} /></div>
      <p style={{ textAlign: "right", marginBottom: 16, fontSize: 13 }}>
        <span style={{ color: "var(--gold)", cursor: "pointer" }} onClick={() => onNavigate("esqueci-senha")}>Esqueceu a senha?</span>
      </p>
      <button className="btn btn-primary" onClick={handle} disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      <p style={{ textAlign: "center", marginTop: 20, color: "var(--text3)", fontSize: 14 }}>
        Não tem conta? <span style={{ color: "var(--gold)", cursor: "pointer", fontWeight: 600 }} onClick={() => onNavigate("cadastro")}>Cadastre-se</span>
      </p>
    </div>
  );
}
