import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiUpload } from "../../services/api";
import { buscarEnderecoPorCep } from "../../services/viaCep";
import { maskCep } from "../../utils/mask";
import { Loading } from "../../components/Loading";
import { CampoCidadeAutocomplete } from "../../components/CampoCidadeAutocomplete";

// ─────────────────────────────────────────────
// DADOS PESSOAIS — MOTORISTA
// ─────────────────────────────────────────────
export function DadosPessoaisMotorista({ onNavigate }) {
  const { user, token, updateUserData } = useAuth();
  const [form, setForm] = useState({ nome: user?.nome || "", email: user?.email || "", telefone: user?.telefone || "", cpf: "", cnh: "", rntrc: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [cnhUrl, setCnhUrl] = useState(null);
  const [enviandoCnh, setEnviandoCnh] = useState(false);
  const [cnhErro, setCnhErro] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const carregarPerfil = async () => {
    try {
      const d = await api("GET", "/api/motoristas/perfil", null, token);
      setForm({
        nome: d.nome || "", email: d.email || "", telefone: d.telefone || "",
        cpf: d.cpf || "", cnh: d.cnh_numero || "", rntrc: d.rntrc || "",
        cep: d.cep || "", logradouro: d.logradouro || "", numero: d.numero || "",
        complemento: d.complemento || "", bairro: d.bairro || "",
        cidade: d.cidade || "", uf: d.uf || "",
      });
      setCnhUrl(d.cnh_url || null);
    } catch (e) { setError("Erro ao carregar perfil: " + e.message); }
    finally { setLoadingData(false); }
  };

  useEffect(() => { carregarPerfil(); }, []);

  // Bug real relatado: o botão de subir a CNH não fazia nada -- não existia input de
  // arquivo nem chamada pro backend, era só um <div> decorativo. Agora envia de verdade
  // pro POST /api/motoristas/documentos (campo "cnh"), que já existe no backend.
  const enviarCnh = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCnhErro("");
    setEnviandoCnh(true);
    try {
      const formData = new FormData();
      formData.append("cnh", file);
      const resp = await apiUpload("POST", "/api/motoristas/documentos", formData, token);
      setCnhUrl(resp.urls?.cnh_url || null);
    } catch (err) {
      setCnhErro(err.message);
    } finally {
      setEnviandoCnh(false);
      e.target.value = "";
    }
  };

  const fillCep = async (cep) => {
    const endereco = await buscarEnderecoPorCep(cep);
    if (endereco) setForm(f => ({ ...f, ...endereco }));
  };

  const salvar = async () => {
    setError(""); setLoading(true);
    try {
      await api("PATCH", "/api/motoristas/perfil", {
        nome: form.nome, telefone: form.telefone,
        cnh: form.cnh, rntrc: form.rntrc,
        cep: form.cep, logradouro: form.logradouro, numero: form.numero,
        complemento: form.complemento, bairro: form.bairro, cidade: form.cidade, uf: form.uf,
      }, token);
      updateUserData({ nome: form.nome, email: form.email, telefone: form.telefone });
      // Re-carrega para confirmar os dados salvos
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
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #C9A84C, #A8873A)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 34, border: "3px solid var(--gold)" }}>🚛</div>
          <button className="btn btn-secondary btn-sm" style={{ width: "auto" }}>📷 Trocar foto de perfil</button>
        </div>
        <div className="card">
          <div className="card-title">Identificação</div>
          <div className="field"><label>CPF</label><input value={form.cpf} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
          <div className="field"><label>Número CNH</label><input value={form.cnh} onChange={e => set("cnh", e.target.value)} placeholder="00000000000" /></div>
          <div className="field"><label>RNTRC (ANTT)</label><input value={form.rntrc} onChange={e => set("rntrc", e.target.value)} placeholder="00000000" /></div>
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
            <div className="field"><label>Complemento</label><input value={form.complemento} onChange={e => set("complemento", e.target.value)} placeholder="Apto..." /></div>
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
          <div className="card-title">Documentação</div>
          <div className="info-row">
            <span className="info-label" style={{ fontSize: 13 }}>📄 CNH (frente e verso)</span>
            <span className={`badge ${cnhUrl ? "badge-active" : "badge-pending"}`}>{cnhUrl ? "Enviada" : "Pendente"}</span>
          </div>
          {["🪪 CPF", "📋 Comprovante de endereço", "📝 RNTRC / ANTT"].map((doc, i) => (
            <div key={i} className="info-row">
              <span className="info-label" style={{ fontSize: 13 }}>{doc}</span>
              <span className="badge badge-pending">Pendente</span>
            </div>
          ))}
          {cnhErro && <div className="alert alert-error" style={{ marginTop: 10 }}>{cnhErro}</div>}
          <label className="upload-area" style={{ display: "block", marginTop: 14, cursor: enviandoCnh ? "default" : "pointer", opacity: enviandoCnh ? 0.6 : 1 }}>
            {enviandoCnh ? "Enviando..." : "📤 Enviar CNH (frente e verso)"}
            <input
              type="file" accept="image/*,.pdf,.heic,.heif" style={{ display: "none" }}
              disabled={enviandoCnh}
              onChange={enviarCnh}
            />
          </label>
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
            Os outros documentos (CPF, comprovante de endereço, RNTRC) ainda não têm envio pelo app — em breve.
          </p>
        </div>
        <button className="btn btn-primary" onClick={salvar} disabled={loading}>{loading ? "Salvando..." : "Salvar alterações"}</button>
        </>}
      </div>
    </div>
  );
}
