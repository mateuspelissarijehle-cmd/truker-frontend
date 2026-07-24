import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { TIPOS_VEICULO } from "../../data/catalogos";
import { Loading } from "../../components/Loading";
import { PasswordInput } from "../../components/PasswordInput";

// ─────────────────────────────────────────────
// ADMIN — GESTÃO MASTER DE USUÁRIOS
// ─────────────────────────────────────────────
export function AdminUsuarios({ onNavigate }) {
  const { token } = useAuth();
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [form, setForm] = useState({});
  const [formVeiculo, setFormVeiculo] = useState({});
  const [novaSenha, setNovaSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [novoPerfilVeiculo, setNovoPerfilVeiculo] = useState("truck");
  const [novoPerfilPlaca, setNovoPerfilPlaca] = useState("");

  const buscar = async () => {
    setLoadingBusca(true);
    setErro("");
    try {
      const data = await api("GET", `/api/admin/usuarios?busca=${encodeURIComponent(busca)}`, null, token);
      setResultados(data);
    } catch (e) { setErro(e.message); }
    finally { setLoadingBusca(false); }
  };

  useEffect(() => { buscar(); }, []);

  const abrirUsuario = async (id) => {
    setSelecionado(id);
    setLoadingDetalhe(true);
    setMsg(""); setErro(""); setNovaSenha("");
    try {
      const data = await api("GET", `/api/admin/usuarios/${id}`, null, token);
      setDetalhe(data);
      setForm(data.usuario || {});
      setFormVeiculo(data.motorista || {});
    } catch (e) { setErro(e.message); }
    finally { setLoadingDetalhe(false); }
  };

  const fechar = () => {
    setSelecionado(null); setDetalhe(null); setForm({}); setFormVeiculo({});
    setNovaSenha(""); setMsg(""); setErro("");
  };

  const salvarDados = async () => {
    setSalvando(true); setMsg(""); setErro("");
    try {
      const { id, criado_em, ...campos } = form;
      const data = await api("PATCH", `/api/admin/usuarios/${selecionado}`, campos, token);
      setForm(data.usuario);
      setMsg("✅ Dados cadastrais atualizados");
      buscar();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const salvarVeiculo = async () => {
    if (!detalhe?.motorista) return;
    setSalvando(true); setMsg(""); setErro("");
    try {
      const { id, online, status, ...campos } = formVeiculo;
      const data = await api("PATCH", `/api/admin/motoristas/${detalhe.motorista.id}`, campos, token);
      setFormVeiculo(data.motorista);
      setMsg("✅ Dados do veículo atualizados");
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const trocarSenha = async () => {
    if (!novaSenha || novaSenha.length < 6) return setErro("A senha deve ter pelo menos 6 caracteres");
    setSalvando(true); setMsg(""); setErro("");
    try {
      await api("PATCH", `/api/admin/usuarios/${selecionado}/senha`, { novaSenha }, token);
      setMsg("✅ Senha redefinida com sucesso");
      setNovaSenha("");
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const forcarOffline = async () => {
    if (!detalhe?.motorista) return;
    setSalvando(true); setMsg(""); setErro("");
    try {
      await api("PATCH", `/api/admin/motoristas/${detalhe.motorista.id}/status`, { online: false }, token);
      setFormVeiculo({ ...formVeiculo, online: false });
      setMsg("✅ Motorista forçado para offline");
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const alternarStatus = async () => {
    if (!detalhe?.motorista) return;
    const novoStatus = formVeiculo.status === "bloqueado" ? "ativo" : "bloqueado";
    setSalvando(true); setMsg(""); setErro("");
    try {
      await api("PATCH", `/api/admin/motoristas/${detalhe.motorista.id}/status`, { status: novoStatus }, token);
      setFormVeiculo({ ...formVeiculo, status: novoStatus });
      setMsg(novoStatus === "bloqueado" ? "🚫 Motorista bloqueado" : "✅ Motorista desbloqueado");
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const excluirUsuario = async () => {
    if (!window.confirm(`Excluir permanentemente "${form.nome}"? Esta ação não pode ser desfeita.`)) return;
    setSalvando(true); setMsg(""); setErro("");
    try {
      await api("DELETE", `/api/admin/usuarios/${selecionado}`, null, token);
      fechar();
      buscar();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const criarPerfilMotorista = async () => {
    setSalvando(true); setMsg(""); setErro("");
    try {
      await api("POST", `/api/admin/usuarios/${selecionado}/criar-perfil-motorista`, {
        tipoVeiculo: novoPerfilVeiculo,
        placaVeiculo: novoPerfilPlaca || null,
      }, token);
      setMsg("✅ Perfil de motorista criado com sucesso");
      await abrirUsuario(selecionado); // recarrega para mostrar os novos cards
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const campo = (label, key, tipo = "text") => (
    <div className="field">
      <label>{label}</label>
      <input
        type={tipo}
        value={form[key] || ""}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  const campoVeiculo = (label, key, tipo = "text") => (
    <div className="field">
      <label>{label}</label>
      <input
        type={tipo}
        value={formVeiculo[key] || ""}
        onChange={e => setFormVeiculo({ ...formVeiculo, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("admin-dashboard")}>← Voltar</button>
        <h1>Gestão Master de Usuários</h1>
        <div className="badge badge-admin" style={{ marginLeft: "auto" }}>ADMIN</div>
      </div>
      <div className="content">
        {!selecionado && (
          <>
            <div className="card">
              <div className="card-title">Buscar usuário</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ flex: 1, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", color: "var(--text)", fontSize: 15 }}
                  placeholder="Nome, email ou CPF/CNPJ"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && buscar()}
                />
                <button className="btn btn-primary" style={{ width: "auto", padding: "0 20px" }} onClick={buscar} disabled={loadingBusca}>
                  {loadingBusca ? "..." : "🔍"}
                </button>
              </div>
            </div>

            {erro && <div className="alert alert-error">{erro}</div>}

            {loadingBusca && <Loading />}

            {!loadingBusca && resultados.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text2)" }}>Nenhum usuário encontrado</div>
            )}

            {!loadingBusca && resultados.map(u => (
              <div key={u.id} className="card" style={{ cursor: "pointer" }} onClick={() => abrirUsuario(u.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {u.motorista_id && (u.online ? <span className="online-dot" /> : <span className="offline-dot" />)}
                      {u.nome}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{u.email}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{u.telefone || "sem telefone"} {u.cidade ? `· ${u.cidade}/${u.uf}` : ""}</div>
                  </div>
                  <span className={`badge ${u.tipo === "motorista" ? "badge-active" : "badge-pending"}`}>{u.tipo}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {selecionado && (
          <>
            <button className="btn btn-secondary" style={{ marginBottom: 14 }} onClick={fechar}>← Voltar à busca</button>

            {loadingDetalhe && <Loading />}

            {!loadingDetalhe && detalhe && (
              <>
                {msg && <div className="alert alert-success">{msg}</div>}
                {erro && <div className="alert alert-error">{erro}</div>}

                <div className="card">
                  <div className="card-title">Dados Cadastrais</div>
                  {campo("Nome", "nome")}
                  {campo("Email", "email", "email")}
                  {campo("Telefone", "telefone")}
                  {campo("CPF/CNPJ", "cpf_cnpj")}
                  {campo("CEP", "cep")}
                  {campo("Logradouro", "logradouro")}
                  {campo("Número", "numero")}
                  {campo("Complemento", "complemento")}
                  {campo("Bairro", "bairro")}
                  {campo("Cidade", "cidade")}
                  {campo("UF", "uf")}
                  {form.tipo === "contratante" && (
                    <>
                      {campo("Nome da empresa", "nome_empresa")}
                      {campo("Inscrição Estadual", "inscricao_estadual")}
                    </>
                  )}
                  <button className="btn btn-primary" onClick={salvarDados} disabled={salvando}>
                    {salvando ? "Salvando..." : "💾 Salvar Dados Cadastrais"}
                  </button>
                </div>

                <div className="card">
                  <div className="card-title">🔑 Redefinir Senha</div>
                  <PasswordInput value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Nova senha (mín. 6 caracteres)" />
                  <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={trocarSenha} disabled={salvando}>
                    {salvando ? "Salvando..." : "Definir Nova Senha"}
                  </button>
                </div>

                {form.tipo === "motorista" && !detalhe.motorista && (
                  <div className="card" style={{ borderColor: "var(--red)", borderWidth: 2 }}>
                    <div className="card-title">⚠️ Perfil de Motorista Ausente</div>
                    <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 12 }}>
                      Este usuário é do tipo motorista, mas não tem um perfil correspondente na tabela de motoristas.
                      Isso impede aceitar fretes, propor valores e aparecer como online. Crie o perfil para corrigir.
                    </p>
                    <div className="field">
                      <label>Tipo de veículo</label>
                      <select value={novoPerfilVeiculo} onChange={e => setNovoPerfilVeiculo(e.target.value)}>
                        {TIPOS_VEICULO.map(v => <option key={v.id} value={v.id}>{v.icon} {v.label}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Placa (opcional)</label>
                      <input value={novoPerfilPlaca} onChange={e => setNovoPerfilPlaca(e.target.value)} placeholder="ABC1D23" />
                    </div>
                    <button className="btn btn-primary" onClick={criarPerfilMotorista} disabled={salvando}>
                      {salvando ? "Criando..." : "🔧 Criar Perfil de Motorista"}
                    </button>
                  </div>
                )}

                {detalhe.motorista && (
                  <div className="card">
                    <div className="card-title">Dados do Veículo / CNH</div>
                    {campoVeiculo("Número CNH", "cnh_numero")}
                    {campoVeiculo("Categoria CNH", "cnh_categoria")}
                    {campoVeiculo("Validade CNH", "cnh_validade", "date")}
                    {campoVeiculo("RNTRC", "rntrc")}
                    {campoVeiculo("Tipo de veículo", "tipo_veiculo")}
                    {campoVeiculo("Tipo de carreta", "tipo_carreta")}
                    {campoVeiculo("Marca", "marca_veiculo")}
                    {campoVeiculo("Modelo", "modelo_veiculo")}
                    {campoVeiculo("Placa", "placa_veiculo")}
                    {campoVeiculo("Ano", "ano_veiculo", "number")}
                    {campoVeiculo("Renavam", "renavam")}
                    {campoVeiculo("Tara (kg)", "tara_kg", "number")}
                    {campoVeiculo("Capacidade (t)", "capacidade_tons", "number")}
                    <button className="btn btn-primary" onClick={salvarVeiculo} disabled={salvando}>
                      {salvando ? "Salvando..." : "💾 Salvar Dados do Veículo"}
                    </button>
                  </div>
                )}

                {detalhe.motorista && (
                  <div className="card">
                    <div className="card-title">Status do Motorista</div>
                    <div className="info-row">
                      <span className="info-label">Online agora</span>
                      <span className="info-value">{formVeiculo.online ? "🟢 Online" : "⚪ Offline"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Status</span>
                      <span className="info-value">{formVeiculo.status === "bloqueado" ? "🚫 Bloqueado" : "✅ Ativo"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      {formVeiculo.online && (
                        <button className="btn btn-secondary" onClick={forcarOffline} disabled={salvando}>Forçar Offline</button>
                      )}
                      <button className="btn btn-secondary" onClick={alternarStatus} disabled={salvando}>
                        {formVeiculo.status === "bloqueado" ? "Desbloquear" : "Bloquear"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="card">
                  <div className="card-title">⚠️ Zona de Risco</div>
                  <button className="btn btn-danger" onClick={excluirUsuario} disabled={salvando}>
                    🗑️ Excluir Usuário Permanentemente
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
