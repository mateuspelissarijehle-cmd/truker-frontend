import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { mascararDado, mascararEmail } from "../../utils/mask";
import { Loading } from "../../components/Loading";

// ─────────────────────────────────────────────
// PAGAMENTOS — CONTRATANTE
// ─────────────────────────────────────────────
export function PagamentosScreen({ onNavigate }) {
  const { token } = useAuth();
  const [formas, setFormas] = useState([]);
  const [loadingFormas, setLoadingFormas] = useState(true);
  const [erroFormas, setErroFormas] = useState("");
  const [salvandoForma, setSalvandoForma] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [tipo, setTipo] = useState("pix");
  const [form, setForm] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const BANCOS = ["001 - Banco do Brasil","033 - Santander","041 - Banrisul","077 - Banco Inter","104 - Caixa Econômica","208 - BTG Pactual","212 - Banco Original","237 - Bradesco","260 - Nubank","336 - C6 Bank","341 - Itaú","380 - PicPay","422 - Safra","633 - Rendimento","748 - Sicredi","756 - Sicoob"];
  const tiposForma = [
    { id: "pix", icon: "📱", label: "Pix", desc: "Transferência instantânea" },
    { id: "ted", icon: "🏦", label: "TED/DOC", desc: "Transferência bancária" },
    { id: "cartao", icon: "💳", label: "Cartão de Crédito/Débito", desc: "Visa, Master, Elo, Amex" },
    { id: "boleto", icon: "📄", label: "Boleto", desc: "Gerado automaticamente" },
    { id: "carteira", icon: "💰", label: "Carteira Digital", desc: "PicPay, Mercado Pago" },
  ];

  // Formas de pagamento salvas de verdade no backend (antes era só estado local
  // — "adicionar" nunca chamava a API, então a lista sumia ao sair da tela e
  // voltar). Só guardamos dados mascarados (nunca a chave/conta completa).
  useEffect(() => {
    api("GET", "/api/pagamentos/formas", null, token)
      .then(d => setFormas(Array.isArray(d) ? d : []))
      .catch(e => setErroFormas(e.message))
      .finally(() => setLoadingFormas(false));
  }, []);

  const adicionar = async () => {
    let dados = {};
    if (tipo === "pix") {
      if (!form.chave) return;
      dados = {
        tipoChave: form.tipoChave || "",
        chaveMascarada: form.tipoChave === "email" ? mascararEmail(form.chave) : mascararDado(form.chave),
        titular: form.titular || "",
      };
    } else if (tipo === "ted") {
      if (!form.banco || !form.conta) return;
      dados = {
        banco: form.banco,
        agenciaMascarada: mascararDado(form.agencia, 2),
        contaMascarada: mascararDado(form.conta),
        tipoConta: form.tipoConta || "",
        titular: form.titular || "",
      };
    } else if (tipo === "carteira") {
      if (!form.carteira || !form.conta) return;
      dados = {
        carteira: form.carteira,
        contaMascarada: form.conta.includes("@") ? mascararEmail(form.conta) : mascararDado(form.conta),
      };
    }
    // boleto: nada pra guardar, é gerado automaticamente no pagamento
    setSalvandoForma(true);
    try {
      const salva = await api("POST", "/api/pagamentos/formas", { tipo, dados }, token);
      setFormas(f => [salva, ...f]);
      setForm({});
      setShowAdd(false);
    } catch (e) {
      setErroFormas(e.message);
    } finally {
      setSalvandoForma(false);
    }
  };

  const remover = async (id) => {
    if (!window.confirm("Remover esta forma de pagamento?")) return;
    try {
      await api("DELETE", `/api/pagamentos/formas/${id}`, null, token);
      setFormas(f => f.filter(x => x.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  const getIcon = t => ({ pix: "📱", ted: "🏦", cartao: "💳", boleto: "📄", carteira: "💰" }[t] || "💳");
  const getLabel = t => tiposForma.find(x => x.id === t)?.label || t;
  const getDesc = f => {
    const d = f.dados || {};
    if (f.tipo === "pix") return `Chave: ${d.chaveMascarada || "—"}`;
    if (f.tipo === "ted") return `${(d.banco || "").split(" - ")[1] || "—"} · Ag: ${d.agenciaMascarada || "—"} · CC: ${d.contaMascarada || "—"}`;
    if (f.tipo === "carteira") return `${d.carteira || "—"} · ${d.contaMascarada || "—"}`;
    return "Gerado automaticamente no pagamento";
  };

  // Cartões salvos de verdade (tokenizados via Mercado Pago ao pagar um frete
  // com "salvar cartão para próxima vez" marcado — ver PagamentoScreen).
  const [cartoesSalvos, setCartoesSalvos] = useState([]);
  const [loadingCartoes, setLoadingCartoes] = useState(true);
  const [erroCartoes, setErroCartoes] = useState("");

  useEffect(() => {
    api("GET", "/api/pagamentos/cartoes", null, token)
      .then(d => setCartoesSalvos(Array.isArray(d) ? d : []))
      .catch(e => setErroCartoes(e.message))
      .finally(() => setLoadingCartoes(false));
  }, []);

  const removerCartao = async (id) => {
    if (!window.confirm("Remover este cartão salvo?")) return;
    try {
      await api("DELETE", `/api/pagamentos/cartoes/${id}`, null, token);
      setCartoesSalvos(c => c.filter(x => x.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Pagamentos</h1></div>
      <div className="content">
        <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowAdd(true)}>+ Adicionar forma de pagamento</button>
        {showAdd && (
          <div className="card" style={{ borderColor: "var(--gold)", marginBottom: 16 }}>
            <div className="card-title">Nova forma de pagamento</div>
            <div className="carga-grid" style={{ marginBottom: 14 }}>
              {tiposForma.map(t => (
                <div key={t.id} className={`carga-item ${tipo === t.id ? "selected" : ""}`} style={{ padding: "10px 8px" }} onClick={() => { setTipo(t.id); setForm({}); }}>
                  <div className="ci-icon">{t.icon}</div>
                  <div className="ci-label" style={{ fontSize: 11 }}>{t.label}</div>
                  <div className="ci-desc">{t.desc}</div>
                </div>
              ))}
            </div>
            {tipo === "pix" && (<>
              <div className="field"><label>Tipo de chave</label><select value={form.tipoChave || ""} onChange={e => set("tipoChave", e.target.value)}><option value="">Selecione...</option><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="telefone">Telefone</option><option value="email">Email</option><option value="aleatoria">Chave aleatória</option></select></div>
              <div className="field"><label>Chave Pix</label><input value={form.chave || ""} onChange={e => set("chave", e.target.value)} placeholder="Digite a chave" /></div>
              <div className="field"><label>Nome do titular</label><input value={form.titular || ""} onChange={e => set("titular", e.target.value)} placeholder="Nome como no banco" /></div>
            </>)}
            {tipo === "ted" && (<>
              <div className="field"><label>Banco</label><select value={form.banco || ""} onChange={e => set("banco", e.target.value)}><option value="">Selecione o banco...</option>{BANCOS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
              <div className="grid-2">
                <div className="field"><label>Agência</label><input value={form.agencia || ""} onChange={e => set("agencia", e.target.value)} placeholder="0000-0" /></div>
                <div className="field"><label>Conta</label><input value={form.conta || ""} onChange={e => set("conta", e.target.value)} placeholder="00000-0" /></div>
              </div>
              <div className="field"><label>Tipo de conta</label><select value={form.tipoConta || ""} onChange={e => set("tipoConta", e.target.value)}><option value="">Selecione...</option><option value="corrente">Corrente</option><option value="poupanca">Poupança</option><option value="pagamento">Conta de Pagamento</option></select></div>
              <div className="field"><label>CPF/CNPJ do titular</label><input value={form.cpf || ""} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
              <div className="field"><label>Nome do titular</label><input value={form.titular || ""} onChange={e => set("titular", e.target.value)} placeholder="Nome completo" /></div>
            </>)}
            {tipo === "cartao" && (
              <div className="alert alert-info">
                💳 Cartões não são cadastrados por aqui digitando os dados. Por segurança, eles são salvos automaticamente quando você paga um frete e marca a opção <strong>"Salvar cartão para próximas vezes"</strong> na tela de pagamento. Os cartões já salvos aparecem na lista abaixo.
              </div>
            )}
            {tipo === "boleto" && (<div className="alert alert-info">O boleto é gerado automaticamente no momento do pagamento do frete.</div>)}
            {tipo === "carteira" && (<>
              <div className="field"><label>Carteira digital</label><select value={form.carteira || ""} onChange={e => set("carteira", e.target.value)}><option value="">Selecione...</option>{["PicPay","Mercado Pago","PayPal","RecargaPay","AME Digital"].map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="field"><label>Email / telefone da conta</label><input value={form.conta || ""} onChange={e => set("conta", e.target.value)} placeholder="seu@email.com" /></div>
            </>)}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowAdd(false); setForm({}); }}>Cancelar</button>
              {tipo !== "cartao" && (
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={adicionar} disabled={salvandoForma}>{salvandoForma ? "Salvando..." : "Adicionar"}</button>
              )}
            </div>
          </div>
        )}
        {erroFormas && <div className="alert alert-error" style={{ marginBottom: 14 }}>{erroFormas}</div>}
        {loadingFormas ? <Loading /> : (
          <>
            {formas.length === 0 && !showAdd && (
              <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
                <p style={{ fontWeight: 700, fontSize: 16 }}>Nenhuma forma de pagamento</p>
                <p style={{ fontSize: 13, marginTop: 6 }}>Adicione Pix, TED, boleto ou carteira digital para pagar seus fretes.</p>
              </div>
            )}
            {formas.map(f => (
              <div key={f.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--gold-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{getIcon(f.tipo)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{getLabel(f.tipo)}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>{getDesc(f)}</div>
                </div>
                <button onClick={() => remover(f.id)} style={{ background: "none", border: "none", color: "var(--red)", fontSize: 18, cursor: "pointer" }}>🗑️</button>
              </div>
            ))}
          </>
        )}

        <div className="card-title" style={{ marginTop: 24, marginBottom: 10 }}>Cartões salvos</div>
        {loadingCartoes ? <Loading /> : erroCartoes ? (
          <div className="alert alert-error">{erroCartoes}</div>
        ) : cartoesSalvos.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 24, color: "var(--text3)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💳</div>
            <p style={{ fontSize: 13 }}>Nenhum cartão salvo ainda.<br/>Cartões são salvos automaticamente quando você paga um frete com a opção "salvar para próxima vez".</p>
          </div>
        ) : (
          cartoesSalvos.map(c => (
            <div key={c.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--gold-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>💳</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{c.bandeira || "Cartão"} ····{c.ultimos_digitos}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>Validade {String(c.validade_mes || "").padStart(2, "0")}/{c.validade_ano}</div>
              </div>
              <button onClick={() => removerCartao(c.id)} style={{ background: "none", border: "none", color: "var(--red)", fontSize: 18, cursor: "pointer" }}>🗑️</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
