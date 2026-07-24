import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Loading } from "../../components/Loading";

// ─────────────────────────────────────────────
// NOTIFICAÇÕES
// ─────────────────────────────────────────────
export function NotificacoesScreen({ onNavigate }) {
  const { token } = useAuth();
  const [prefs, setPrefs] = useState({ novo_frete: true, chat: true, status_frete: true });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("GET", "/api/usuarios/notificacoes", null, token)
      .then(setPrefs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const alternar = async (categoria, valor) => {
    setPrefs(p => ({ ...p, [categoria]: valor }));
    setSalvando(categoria); setError("");
    try {
      const atualizado = await api("PUT", "/api/usuarios/notificacoes", { [categoria]: valor }, token);
      setPrefs(atualizado);
    } catch (e) {
      setPrefs(p => ({ ...p, [categoria]: !valor }));
      setError(e.message);
    } finally { setSalvando(null); }
  };

  const itens = [
    { key: "novo_frete", label: "Novo frete disponível", sub: "Avisos de fretes compatíveis com você" },
    { key: "chat", label: "Mensagem no chat", sub: "Novas mensagens em conversas ativas" },
    { key: "status_frete", label: "Atualização de status do frete", sub: "Mudanças de status nos seus fretes" },
  ];

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Notificações</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Loading /> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {itens.map((item, i) => (
              <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < itens.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={!!prefs[item.key]} disabled={salvando === item.key} onChange={e => alternar(item.key, e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 12, lineHeight: 1.6 }}>
          As alterações são salvas automaticamente.
        </p>
      </div>
    </div>
  );
}
