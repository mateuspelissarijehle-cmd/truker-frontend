import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Loading } from "../../components/Loading";

// ─────────────────────────────────────────────
// ADMIN — SEGURADORAS PARCEIRAS
// ─────────────────────────────────────────────
export function AdminSeguradorasScreen({ onNavigate }) {
  const { token } = useAuth();
  const [seguradoras, setSeguradoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNova, setShowNova] = useState(false);
  const [nova, setNova] = useState({ nome: "", descricao: "", urlContato: "" });
  const [salvando, setSalvando] = useState(false);
  const [atualizandoId, setAtualizandoId] = useState(null);

  const carregar = () => {
    setLoading(true);
    api("GET", "/api/admin/seguradoras", null, token)
      .then(setSeguradoras)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const criar = async () => {
    if (!nova.nome.trim()) return setError("Informe o nome da seguradora");
    setError(""); setSalvando(true);
    try {
      await api("POST", "/api/admin/seguradoras", {
        nome: nova.nome.trim(),
        descricao: nova.descricao.trim() || undefined,
        urlContato: nova.urlContato.trim() || undefined,
      }, token);
      setNova({ nome: "", descricao: "", urlContato: "" });
      setShowNova(false);
      carregar();
    } catch (e) { setError(e.message); }
    finally { setSalvando(false); }
  };

  const alternarAtivo = async (seg) => {
    setAtualizandoId(seg.id); setError("");
    try {
      await api("PATCH", `/api/admin/seguradoras/${seg.id}`, { ativo: !seg.ativo }, token);
      carregar();
    } catch (e) { setError(e.message); }
    finally { setAtualizandoId(null); }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Seguradoras Parceiras</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={() => setShowNova(s => !s)}>
          {showNova ? "Cancelar" : "+ Nova Seguradora"}
        </button>

        {showNova && (
          <div className="card" style={{ borderColor: "var(--gold)", marginBottom: 14 }}>
            <div className="card-title">Nova Seguradora Parceira</div>
            <div className="field"><label>Nome</label><input value={nova.nome} onChange={e => setNova(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Porto Seguro" /></div>
            <div className="field"><label>Descrição (opcional)</label><input value={nova.descricao} onChange={e => setNova(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Desconto de 10% pra motoristas TRUKER" /></div>
            <div className="field"><label>Link de contato (opcional)</label><input value={nova.urlContato} onChange={e => setNova(f => ({ ...f, urlContato: e.target.value }))} placeholder="https://..." /></div>
            <button className="btn btn-primary" onClick={criar} disabled={salvando} style={{ width: "100%" }}>{salvando ? "Salvando..." : "Salvar"}</button>
          </div>
        )}

        {loading ? <Loading /> : seguradoras.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛡️</div>
            Nenhuma seguradora cadastrada ainda
          </div>
        ) : seguradoras.map(seg => (
          <div key={seg.id} className="card" style={{ opacity: seg.ativo ? 1 : 0.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{seg.nome}</div>
              <span className={`badge ${seg.ativo ? "badge-done" : "badge-cancel"}`}>{seg.ativo ? "Ativa" : "Inativa"}</span>
            </div>
            {seg.descricao && <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>{seg.descricao}</div>}
            {seg.url_contato && <div style={{ fontSize: 12, color: "var(--gold)", marginBottom: 8 }}>{seg.url_contato}</div>}
            <button className="btn btn-secondary btn-sm" onClick={() => alternarAtivo(seg)} disabled={atualizandoId === seg.id}>
              {atualizandoId === seg.id ? "Atualizando..." : seg.ativo ? "Desativar" : "Ativar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
