import { useDespesasMotorista } from "../../hooks/useDespesasMotorista";
import { formatMoney } from "../../utils/format";
import { TIPOS_DESPESA } from "../../data/catalogos";

// ─────────────────────────────────────────────
// COMPONENTE DE DESPESAS (usado na aba Despesas do PerfilMotorista)
// ─────────────────────────────────────────────
export function DespesasTab() {
  const {
    despesas, resumoCustos, total, showAdd, setShowAdd, loading,
    nova, setN, comprovanteUrl, lendoNf, nfAviso,
    add, remover, handleNF,
  } = useDespesasMotorista();
  const tiposDespesa = TIPOS_DESPESA;

  return (
    <>
      <div className="stat-card" style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total de despesas</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "var(--red)" }}>{formatMoney(total)}</div>
      </div>

      {resumoCustos && (
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div className="card" style={{ textAlign: "center", padding: "14px 10px" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>⛽</div>
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>Combustível</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--red)" }}>{formatMoney(resumoCustos.combustivelTotal)}</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "14px 10px" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>🔧</div>
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>Desgaste</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--red)" }}>{formatMoney(resumoCustos.desgasteTotal)}</div>
          </div>
        </div>
      )}
      {resumoCustos && (
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: -8, marginBottom: 14, textAlign: "center" }}>
          Estimados com base nos coeficientes oficiais da ANTT, somando todos os {resumoCustos.totalFretesConsiderados} fretes aceitos. O detalhe de cada viagem está no card do frete.
        </p>
      )}
      <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={() => setShowAdd(true)}>+ Registrar Despesa</button>
      {showAdd && (
        <div className="card" style={{ borderColor: "var(--gold)", marginBottom: 14 }}>
          <div className="card-title">Nova Despesa</div>
          <div className="field">
            <label>Tipo</label>
            <select value={nova.tipo} onChange={e => setN("tipo", e.target.value)}>
              {tiposDespesa.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div className="field"><label>Descrição</label><input value={nova.descricao} onChange={e => setN("descricao", e.target.value)} placeholder="Ex: Abastecimento posto BR" /></div>
          <div className="field"><label>Valor (R$)</label><input type="number" step="0.01" value={nova.valor} onChange={e => setN("valor", e.target.value)} placeholder="0,00" /></div>
          <div className="field"><label>Data</label><input type="date" value={nova.data} onChange={e => setN("data", e.target.value)} /></div>
          <label className="upload-area" style={{ display: "block", marginBottom: 8, cursor: lendoNf ? "default" : "pointer", opacity: lendoNf ? 0.6 : 1 }}>
            {lendoNf ? "Lendo NF..." : comprovanteUrl ? "📄 NF anexada — trocar arquivo" : "📄 Anexar NF — tipo e valor detectados automaticamente (PDF)"}
            <input type="file" accept="image/*,application/pdf,.heic,.heif" style={{ display: "none" }} onChange={handleNF} disabled={lendoNf} />
          </label>
          {nfAviso && <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>{nfAviso}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={add} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
          </div>
        </div>
      )}
      {despesas.length === 0 && !showAdd && (
        <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
          <p style={{ fontWeight: 600 }}>Nenhuma despesa registrada</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Registre combustível, manutenção e pedágios.</p>
        </div>
      )}
      {despesas.map(d => {
        const t = tiposDespesa.find(x => x.id === d.tipo) || { icon: "📦", label: d.tipo };
        return (
          <div key={d.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(192,57,43,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{t.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>{d.descricao || "—"} · {d.data?.slice(0,10)}</div>
              {d.origem_cidade && (
                <div style={{ fontSize: 11, color: "var(--gold)", marginTop: 2, fontWeight: 600 }}>🚛 {d.origem_cidade} → {d.dest_cidade}</div>
              )}
            </div>
            <div style={{ fontWeight: 700, color: "var(--red)", fontSize: 15 }}>-{formatMoney(d.valor)}</div>
            {!d.automatica && (
              <button onClick={() => remover(d.id)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16, padding: 4 }}>🗑️</button>
            )}
          </div>
        );
      })}
    </>
  );
}
