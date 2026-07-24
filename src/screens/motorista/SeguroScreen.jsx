import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Loading } from "../../components/Loading";

// ─────────────────────────────────────────────
// SEGURO DE FRETE (Motorista — obrigatório pra aceitar fretes)
// ─────────────────────────────────────────────
export function SeguroScreen({ onNavigate }) {
  const { token } = useAuth();
  const [seguro, setSeguro] = useState(null);
  const [seguradoras, setSeguradoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ modo: "parceira", seguradoraId: "", avulsoNome: "", avulsoApolice: "", validade: "" });

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api("GET", "/api/motoristas/seguro", null, token),
      api("GET", "/api/seguradoras", null, token).catch(() => []),
    ]).then(([s, segs]) => {
      setSeguro(s);
      setSeguradoras(segs);
      setEditando(false);
      if (!segs.length) setForm(f => ({ ...f, modo: "avulso" }));
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const iniciarEdicao = () => {
    if (seguro) {
      setForm({
        modo: seguro.seguro_seguradora_id ? "parceira" : "avulso",
        seguradoraId: seguro.seguro_seguradora_id || "",
        avulsoNome: seguro.seguro_avulso_nome || "",
        avulsoApolice: seguro.seguro_avulso_apolice || "",
        validade: seguro.seguro_validade ? String(seguro.seguro_validade).slice(0, 10) : "",
      });
    }
    setEditando(true);
  };

  const salvar = async () => {
    if (!form.validade) return setError("Informe a validade do seguro");
    if (form.modo === "parceira" && !form.seguradoraId) return setError("Escolha uma seguradora parceira");
    if (form.modo === "avulso" && (!form.avulsoNome.trim() || !form.avulsoApolice.trim())) return setError("Informe nome e número da apólice");
    setError(""); setSalvando(true);
    try {
      await api("PUT", "/api/motoristas/seguro", {
        ...(form.modo === "parceira"
          ? { seguradoraId: form.seguradoraId }
          : { seguroAvulsoNome: form.avulsoNome.trim(), seguroAvulsoApolice: form.avulsoApolice.trim() }),
        seguroValidade: form.validade,
      }, token);
      carregar();
    } catch (e) { setError(e.message); }
    finally { setSalvando(false); }
  };

  const mostrarForm = !seguro?.valido || editando;
  const semParceiras = seguradoras.length === 0;

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Seguro</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Loading /> : (
          <>
            {seguro?.valido && !editando && (
              <div className="card" style={{ borderColor: "rgba(45,122,58,0.3)" }}>
                <div className="card-title">✅ Seguro válido</div>
                <div className="info-row"><span className="info-label">Seguradora</span><span className="info-value">{seguro.seguro_seguradora_id ? seguro.seguradora_nome : seguro.seguro_avulso_nome}</span></div>
                {!seguro.seguro_seguradora_id && (
                  <div className="info-row"><span className="info-label">Apólice</span><span className="info-value">{seguro.seguro_avulso_apolice}</span></div>
                )}
                <div className="info-row"><span className="info-label">Validade</span><span className="info-value">{String(seguro.seguro_validade).slice(0, 10).split("-").reverse().join("/")}</span></div>
                <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={iniciarEdicao}>✏️ Atualizar</button>
              </div>
            )}

            {!seguro?.valido && !editando && (
              <div className="alert alert-error" style={{ marginBottom: 14 }}>
                ⚠️ {seguro?.seguro_validade ? "Seu seguro venceu." : "Você ainda não tem um seguro registrado."} Você não pode aceitar fretes até registrar um seguro válido.
              </div>
            )}

            {mostrarForm && (
              <div className="card">
                <div className="card-title">Registrar seguro</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {[["parceira", "Seguradora parceira"], ["avulso", "Seguro avulso"]].map(([id, label]) => (
                    <button key={id} onClick={() => setForm(f => ({ ...f, modo: id }))}
                      style={{ padding: "8px 14px", borderRadius: 20, border: "1px solid", borderColor: form.modo === id ? "var(--gold)" : "var(--border)", background: form.modo === id ? "var(--gold)" : "var(--surface)", color: form.modo === id ? "#fff" : "var(--text3)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {label}
                    </button>
                  ))}
                </div>

                {form.modo === "parceira" && (
                  semParceiras ? (
                    <div className="alert alert-info" style={{ marginBottom: 14 }}>
                      Nenhuma seguradora parceira cadastrada ainda — use seguro avulso por enquanto.
                    </div>
                  ) : (
                    <div className="field">
                      <label>Seguradora</label>
                      <select value={form.seguradoraId} onChange={e => setForm(f => ({ ...f, seguradoraId: e.target.value }))}>
                        <option value="">Selecione...</option>
                        {seguradoras.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                    </div>
                  )
                )}

                {form.modo === "avulso" && (
                  <>
                    <div className="field"><label>Nome da seguradora</label><input value={form.avulsoNome} onChange={e => setForm(f => ({ ...f, avulsoNome: e.target.value }))} placeholder="Ex: Porto Seguro" /></div>
                    <div className="field"><label>Número da apólice</label><input value={form.avulsoApolice} onChange={e => setForm(f => ({ ...f, avulsoApolice: e.target.value }))} placeholder="Ex: 123456789" /></div>
                  </>
                )}

                {!(form.modo === "parceira" && semParceiras) && (
                  <div className="field"><label>Validade</label><input type="date" value={form.validade} onChange={e => setForm(f => ({ ...f, validade: e.target.value }))} /></div>
                )}

                <button className="btn btn-primary" onClick={salvar} disabled={salvando || (form.modo === "parceira" && semParceiras)} style={{ marginTop: 4 }}>
                  {salvando ? "Salvando..." : "Registrar Seguro"}
                </button>
                {editando && <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => setEditando(false)}>Cancelar edição</button>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
