import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { PasswordInput } from "../../components/PasswordInput";

// ─────────────────────────────────────────────
// ADMIN LOGIN
// ─────────────────────────────────────────────
export function AdminLoginScreen({ onNavigate }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    setError("");
    if (!form.email || !form.senha) return setError("Preencha todos os campos");
    setLoading(true);
    try {
      const data = await api("POST", "/api/admin/login", { email: form.email, senha: form.senha });
      login({ ...data.admin, tipo: "admin" }, data.token);
    } catch (e) {
      setError(e.message || "Credenciais incorretas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px" }}>
      <button className="back-btn" style={{ marginBottom: 24 }} onClick={() => onNavigate("splash")}>← Voltar</button>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 40 }}>🔑</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>Acesso Master</div>
        <div className="badge badge-admin" style={{ marginTop: 8 }}>ADMIN</div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="field"><label>Email admin</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@truker.app" /></div>
      <div className="field"><label>Senha</label><PasswordInput value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} /></div>
      <button className="btn btn-primary" onClick={handle} disabled={loading}>{loading ? "Entrando..." : "Entrar como Admin"}</button>
    </div>
  );
}
