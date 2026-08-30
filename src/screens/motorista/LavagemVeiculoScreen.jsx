import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/useAuth";
import { api, apiUpload } from "../../services/api";
import { Loading } from "../../components/Loading";
import { API_BASE } from "../../config";

// ─────────────────────────────────────────────
// LAVAGEM DO VEÍCULO (Motorista) — Item 5, 27/08/2026
//
// Trava anti-contaminação cruzada: ao entregar um frete de fertilizante
// (tipo_carga "neogranel"), o motorista fica bloqueado de aceitar frete de
// grão até registrar um certificado de lavagem aqui. Mesmo padrão de tela
// da SeguroScreen.jsx (status + formulário de registro + histórico).
// ─────────────────────────────────────────────
export function LavagemVeiculoScreen({ onNavigate }) {
  const { token } = useAuth();
  const [status, setStatus] = useState(null); // { bloqueado, freteFertilizante }
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [form, setForm] = useState({ dataLavagem: "", responsavel: "", comprovante: null });

  const carregar = useCallback(() => {
    setLoading(true);
    Promise.all([
      api("GET", "/api/motoristas/higienizacao/status", null, token),
      api("GET", "/api/motoristas/higienizacao/lavagens", null, token).catch(() => []),
    ]).then(([s, h]) => { setStatus(s); setHistorico(h); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { queueMicrotask(carregar); }, [carregar]);

  const registrar = async () => {
    if (!form.dataLavagem) return setError("Informe a data da lavagem");
    setError(""); setSucesso(""); setSalvando(true);
    try {
      const formData = new FormData();
      formData.append("dataLavagem", form.dataLavagem);
      if (form.responsavel.trim()) formData.append("responsavel", form.responsavel.trim());
      if (status?.freteFertilizante?.id) formData.append("freteFertilizanteId", status.freteFertilizante.id);
      if (form.comprovante) formData.append("comprovante", form.comprovante);
      await apiUpload("POST", "/api/motoristas/higienizacao/lavagens", formData, token);
      setSucesso("✅ Lavagem registrada! Seu veículo já está liberado pra grão de novo.");
      setForm({ dataLavagem: "", responsavel: "", comprovante: null });
      carregar();
    } catch (e) { setError(e.message); }
    finally { setSalvando(false); }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Lavagem do Veículo</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        {sucesso && <div className="alert alert-success">{sucesso}</div>}
        {loading ? <Loading /> : (
          <>
            {status?.bloqueado ? (
              <div className="alert alert-error" style={{ marginBottom: 14 }}>
                🧼 <strong>Veículo bloqueado pra frete de grão</strong> — contaminação cruzada após transportar fertilizante
                {status.freteFertilizante && ` (entrega em ${status.freteFertilizante.dest_cidade}/${status.freteFertilizante.dest_estado})`}.
                Registre a lavagem abaixo pra liberar.
              </div>
            ) : (
              <div className="card" style={{ borderColor: "rgba(45,122,58,0.3)", marginBottom: 14 }}>
                <div className="card-title">✅ Sem bloqueio ativo</div>
                <p style={{ fontSize: 13, color: "var(--text2)" }}>
                  Seu veículo está liberado pra aceitar frete de grão. Registre uma lavagem aqui sempre que transportar fertilizante ou outra carga que exija higienização depois.
                </p>
              </div>
            )}

            <div className="card">
              <div className="card-title">Registrar lavagem</div>
              <div className="field"><label>Data da lavagem *</label>
                <input type="date" value={form.dataLavagem} onChange={e => setForm(f => ({ ...f, dataLavagem: e.target.value }))} />
              </div>
              <div className="field"><label>Responsável / posto</label>
                <input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Ex: Posto Lava-Tudo, Sorriso/MT" />
              </div>
              <div className="field"><label>Comprovante / foto</label>
                <input type="file" accept="image/*,.pdf" onChange={e => setForm(f => ({ ...f, comprovante: e.target.files?.[0] || null }))} />
              </div>
              <button className="btn btn-primary" onClick={registrar} disabled={salvando} style={{ marginTop: 4 }}>
                {salvando ? "Registrando..." : "Registrar Lavagem"}
              </button>
            </div>

            {historico.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="card-title" style={{ marginBottom: 8 }}>Histórico</div>
                {historico.map(l => (
                  <div key={l.id} className="card" style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                      {String(l.data_lavagem).slice(0, 10).split("-").reverse().join("/")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text2)" }}>{l.responsavel || "Responsável não informado"}</div>
                    {l.dest_cidade && (
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                        Vinculada ao frete de fertilizante entregue em {l.dest_cidade}/{l.dest_estado}
                      </div>
                    )}
                    {l.comprovante_url && (
                      <a href={`${API_BASE}${l.comprovante_url}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--gold-dark)", marginTop: 4, display: "inline-block" }}>
                        📎 Ver comprovante
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
