import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Loading } from "../../components/Loading";
import { CampoCidadeAutocomplete } from "../../components/CampoCidadeAutocomplete";

// ─────────────────────────────────────────────
// DISPONIBILIDADE (Motorista — proposta inversa)
// ─────────────────────────────────────────────
export function DisponibilidadeScreen({ onNavigate }) {
  const { token } = useAuth();
  const [anuncio, setAnuncio] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ cidadeAtual: "", ufAtual: "", cidadeDestino: "", ufDestino: "", modo: "agora", horas: "" });

  const carregar = () => {
    setLoading(true);
    api("GET", "/api/motoristas/disponibilidade", null, token)
      .then(d => { setAnuncio(d); setEditando(false); })
      .catch(() => setAnuncio(false))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const iniciarEdicao = () => {
    if (anuncio) {
      setForm({
        cidadeAtual: anuncio.cidade_atual || "", ufAtual: anuncio.uf_atual || "",
        cidadeDestino: anuncio.cidade_destino || "", ufDestino: anuncio.uf_destino || "",
        modo: "agora", horas: "",
      });
    }
    setEditando(true);
  };

  const publicar = async () => {
    if (!form.cidadeAtual.trim() || !form.ufAtual.trim()) return setError("Informe cidade e UF atual");
    if (form.modo === "horas" && (form.horas === "" || Number(form.horas) < 0)) return setError("Informe em quantas horas você fica disponível");
    setError(""); setSalvando(true);
    try {
      await api("POST", "/api/motoristas/disponibilidade", {
        cidadeAtual: form.cidadeAtual.trim(), ufAtual: form.ufAtual.trim().toUpperCase(),
        cidadeDestino: form.cidadeDestino.trim() || undefined, ufDestino: form.ufDestino.trim() || undefined,
        ...(form.modo === "horas" ? { disponivelEmHoras: Number(form.horas) } : {}),
      }, token);
      carregar();
    } catch (e) { setError(e.message); }
    finally { setSalvando(false); }
  };

  const cancelar = async () => {
    setCancelando(true); setError("");
    try {
      await api("DELETE", "/api/motoristas/disponibilidade", null, token);
      setAnuncio(false);
    } catch (e) { setError(e.message); }
    finally { setCancelando(false); }
  };

  const formatDisponibilidade = (disponivelEm) => {
    if (!disponivelEm) return "Disponível agora";
    const d = new Date(disponivelEm);
    if (d.getTime() <= Date.now()) return "Disponível agora";
    return `Disponível a partir de ${d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
  };

  const mostrarForm = !anuncio || editando;

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Disponibilidade</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Loading /> : (
          <>
            {anuncio && !editando && (
              <div className="card" style={{ borderColor: "var(--gold)" }}>
                <div className="card-title">📢 Seu anúncio está ativo</div>
                <div className="info-row"><span className="info-label">Você está em</span><span className="info-value">{anuncio.cidade_atual}/{anuncio.uf_atual}</span></div>
                {anuncio.cidade_destino && <div className="info-row"><span className="info-label">Quer ir até</span><span className="info-value">{anuncio.cidade_destino}/{anuncio.uf_destino}</span></div>}
                <div className="info-row"><span className="info-label">Disponibilidade</span><span className="info-value">{formatDisponibilidade(anuncio.disponivel_em)}</span></div>
                <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>
                  Contratantes dessa cidade podem te encontrar e te convidar direto pra um frete. Seu anúncio expira sozinho em 24h.
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn btn-secondary" onClick={iniciarEdicao}>✏️ Editar</button>
                  <button className="btn btn-danger" onClick={cancelar} disabled={cancelando}>{cancelando ? "Cancelando..." : "✕ Cancelar anúncio"}</button>
                </div>
              </div>
            )}

            {mostrarForm && (
              <div className="card">
                <div className="card-title">📍 Onde você está?</div>
                <div className="grid-2">
                  <CampoCidadeAutocomplete
                    label="Cidade atual" value={form.cidadeAtual}
                    onChange={v => setForm(f => ({ ...f, cidadeAtual: v }))}
                    onSelecionar={({ cidade, uf }) => setForm(f => ({ ...f, cidadeAtual: cidade, ufAtual: uf || f.ufAtual }))}
                    placeholder="Curitiba"
                  />
                  <div className="field"><label>UF</label><input value={form.ufAtual} onChange={e => setForm(f => ({ ...f, ufAtual: e.target.value.toUpperCase() }))} maxLength={2} placeholder="PR" /></div>
                </div>
                <div className="card-title" style={{ marginTop: 10 }}>🎯 Pra onde você quer ir? (opcional)</div>
                <div className="grid-2">
                  <CampoCidadeAutocomplete
                    label="Cidade destino" value={form.cidadeDestino}
                    onChange={v => setForm(f => ({ ...f, cidadeDestino: v }))}
                    onSelecionar={({ cidade, uf }) => setForm(f => ({ ...f, cidadeDestino: cidade, ufDestino: uf || f.ufDestino }))}
                    placeholder="São Paulo"
                  />
                  <div className="field"><label>UF</label><input value={form.ufDestino} onChange={e => setForm(f => ({ ...f, ufDestino: e.target.value.toUpperCase() }))} maxLength={2} placeholder="SP" /></div>
                </div>
                <div className="card-title" style={{ marginTop: 10 }}>⏱️ Quando você fica disponível?</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {[["agora", "Agora"], ["horas", "Em X horas"]].map(([id, label]) => (
                    <button key={id} onClick={() => setForm(f => ({ ...f, modo: id }))}
                      style={{ padding: "8px 14px", borderRadius: 20, border: "1px solid", borderColor: form.modo === id ? "var(--gold)" : "var(--border)", background: form.modo === id ? "var(--gold)" : "var(--surface)", color: form.modo === id ? "#fff" : "var(--text3)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {label}
                    </button>
                  ))}
                </div>
                {form.modo === "horas" && (
                  <div className="field"><label>Em quantas horas</label><input type="number" min="0" step="0.5" value={form.horas} onChange={e => setForm(f => ({ ...f, horas: e.target.value }))} placeholder="Ex: 3" /></div>
                )}
                <button className="btn btn-primary" onClick={publicar} disabled={salvando} style={{ marginTop: 4 }}>{salvando ? "Publicando..." : "📢 Publicar Disponibilidade"}</button>
                {editando && <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => setEditando(false)}>Cancelar edição</button>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
