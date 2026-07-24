import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { buscarEnderecoPorCep } from "../../services/viaCep";
import { maskCep } from "../../utils/mask";
import { Loading } from "../../components/Loading";
import { CampoCidadeAutocomplete } from "../../components/CampoCidadeAutocomplete";

// ─────────────────────────────────────────────
// DADOS PESSOAIS — CONTRATANTE
// ─────────────────────────────────────────────
export function DadosPessoaisContratante({ onNavigate }) {
  const { user, token, updateUserData } = useAuth();
  const [form, setForm] = useState({ nome: user?.nome || "", email: user?.email || "", telefone: user?.telefone || "", documento: "", nomeEmpresa: "", inscricaoEstadual: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const carregarPerfil = async () => {
    try {
      const d = await api("GET", "/api/contratantes/perfil", null, token);
      setForm({ nome: d.nome || "", email: d.email || "", telefone: d.telefone || "", documento: d.cpf_cnpj || "", nomeEmpresa: d.nome_empresa || "", inscricaoEstadual: d.inscricao_estadual || "", cep: d.cep || "", logradouro: d.logradouro || "", numero: d.numero || "", complemento: d.complemento || "", bairro: d.bairro || "", cidade: d.cidade || "", uf: d.uf || "" });
    } catch (e) { setError("Erro ao carregar perfil: " + e.message); }
    finally { setLoadingData(false); }
  };

  useEffect(() => { carregarPerfil(); }, []);

  const fillCep = async (cep) => {
    const endereco = await buscarEnderecoPorCep(cep);
    if (endereco) setForm(f => ({ ...f, ...endereco }));
  };
  const salvar = async () => {
    setError(""); setLoading(true);
    try {
      await api("PATCH", "/api/contratantes/perfil", {
        nome: form.nome, telefone: form.telefone,
        nomeEmpresa: form.nomeEmpresa, inscricaoEstadual: form.inscricaoEstadual,
        cep: form.cep, logradouro: form.logradouro, numero: form.numero,
        complemento: form.complemento, bairro: form.bairro, cidade: form.cidade, uf: form.uf,
      }, token);
      updateUserData({ nome: form.nome, email: form.email, telefone: form.telefone });
      await carregarPerfil();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Dados Pessoais</h1></div>
      <div className="content">
        {loadingData && <Loading />}
        {!loadingData && <>
        {success && <div className="alert alert-success">✅ Dados salvos com sucesso!</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #C9A84C, #A8873A)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 34, border: "3px solid var(--gold)" }}>🏢</div>
          <button className="btn btn-secondary btn-sm" style={{ width: "auto" }}>📷 Trocar foto / logomarca</button>
        </div>
        <div className="card">
          <div className="card-title">Identificação</div>
          <div className="field"><label>Nome completo</label><input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Seu nome" /></div>
          <div className="field"><label>CPF ou CNPJ</label><input value={form.documento} onChange={e => set("documento", e.target.value)} placeholder="000.000.000-00 ou 00.000.000/0001-00" /></div>
          <div className="field"><label>Nome da empresa (opcional)</label><input value={form.nomeEmpresa} onChange={e => set("nomeEmpresa", e.target.value)} placeholder="Empresa LTDA" /></div>
          <div className="field"><label>Inscrição Estadual (opcional)</label><input value={form.inscricaoEstadual} onChange={e => set("inscricaoEstadual", e.target.value)} placeholder="000.000.000.000" /></div>
        </div>
        <div className="card">
          <div className="card-title">Contato</div>
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="seu@email.com" /></div>
          <div className="field"><label>Telefone / WhatsApp</label><input value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(41) 99999-9999" /></div>
        </div>
        <div className="card">
          <div className="card-title">Endereço</div>
          <div className="field"><label>CEP</label><input value={form.cep} onChange={e => { const v = maskCep(e.target.value); set("cep", v); if (v.replace(/\D/g,"").length===8) fillCep(v); }} placeholder="00000-000" /></div>
          <div className="field"><label>Logradouro</label><input value={form.logradouro} onChange={e => set("logradouro", e.target.value)} placeholder="Rua, Avenida..." /></div>
          <div className="grid-2">
            <div className="field"><label>Número</label><input value={form.numero} onChange={e => set("numero", e.target.value)} placeholder="123" /></div>
            <div className="field"><label>Complemento</label><input value={form.complemento} onChange={e => set("complemento", e.target.value)} placeholder="Sala..." /></div>
          </div>
          <div className="field"><label>Bairro</label><input value={form.bairro} onChange={e => set("bairro", e.target.value)} placeholder="Centro" /></div>
          <div className="grid-2">
            <CampoCidadeAutocomplete
              value={form.cidade} onChange={v => set("cidade", v)}
              onSelecionar={({ cidade, uf }) => { set("cidade", cidade); if (uf) set("uf", uf); }}
              placeholder="Curitiba"
            />
            <div className="field"><label>UF</label><input value={form.uf} onChange={e => set("uf", e.target.value.toUpperCase())} placeholder="PR" maxLength={2} /></div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Documentação fiscal e jurídica</div>
          <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 14 }}>Envie documentos para habilitar contratações de maior valor.</p>
          {[["📋 Contrato Social / Estatuto", false], ["🏦 Comprovante bancário", false], ["🪪 Doc. do responsável (RG/CNH)", false], ["📄 Procuração (se aplicável)", false]].map(([doc, ok], i) => (
            <div key={i} className="info-row">
              <span className="info-label" style={{ fontSize: 13 }}>{doc}</span>
              <span className={`badge ${ok ? "badge-active" : "badge-pending"}`}>{ok ? "Aprovado" : "Pendente"}</span>
            </div>
          ))}
          <div className="upload-area" style={{ marginTop: 14 }}>📤 Enviar documento</div>
        </div>
        <button className="btn btn-primary" onClick={salvar} disabled={loading}>{loading ? "Salvando..." : "Salvar alterações"}</button>
        </>}
      </div>
    </div>
  );
}
