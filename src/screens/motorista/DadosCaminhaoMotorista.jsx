import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { maskPlaca } from "../../utils/mask";
import { TIPOS_VEICULO, ICONE_CARROCERIA, eixosPadraoDoChassi } from "../../data/catalogos";
import { Loading } from "../../components/Loading";

// ─────────────────────────────────────────────
// DADOS DO CAMINHÃO — MOTORISTA
// ─────────────────────────────────────────────
export function DadosCaminhaoMotorista({ onNavigate }) {
  const { user, token, updateUserData } = useAuth();
  const [form, setForm] = useState({ tipoVeiculo: "", numeroEixos: "", tipoCarreta: "", marca: "", modelo: "", placa: "", anoFab: "", renavam: "", tara: "", capacidade: "" });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  // Trocar o chassi ressesta o número de eixos pro padrão daquele chassi.
  const setTipoVeiculo = (id) => setForm(f => ({ ...f, tipoVeiculo: id, numeroEixos: id ? eixosPadraoDoChassi(id) : "" }));

  // ── Composição veicular (cavalo + carretas) ──────────────
  const [veiculos, setVeiculos] = useState([]);          // lista da composição
  const [carroceriasDisp, setCarroceriasDisp] = useState([]); // carrocerias válidas p/ o veículo
  const [novaCarreta, setNovaCarreta] = useState({ placa: "", carroceria: "", capacidadeTons: "", eixos: "" });
  const [addingCarreta, setAddingCarreta] = useState(false);
  const [erroComp, setErroComp] = useState("");
  const setNC = (k, v) => setNovaCarreta(f => ({ ...f, [k]: v }));

  const carregarComposicao = async () => {
    try {
      const lista = await api("GET", "/api/motoristas/veiculos", null, token);
      setVeiculos(Array.isArray(lista) ? lista : []);
    } catch { setVeiculos([]); }
  };

  const carregarCarroceriasDisp = async (veiculo) => {
    if (!veiculo) { setCarroceriasDisp([]); return; }
    try {
      const lista = await api("GET", `/api/motoristas/carrocerias-disponiveis?veiculo=${veiculo}`, null, token);
      setCarroceriasDisp(Array.isArray(lista) ? lista : []);
    } catch { setCarroceriasDisp([]); }
  };

  const adicionarCarreta = async () => {
    setErroComp("");
    if (!novaCarreta.placa) return setErroComp("Informe a placa da carreta.");
    if (!novaCarreta.carroceria) return setErroComp("Selecione a carroceria.");
    setAddingCarreta(true);
    try {
      await api("POST", "/api/motoristas/veiculos", {
        tipo: "carreta",
        placa: novaCarreta.placa,
        carroceria: novaCarreta.carroceria,
        capacidadeTons: novaCarreta.capacidadeTons || null,
        eixos: novaCarreta.eixos || null,
      }, token);
      setNovaCarreta({ placa: "", carroceria: "", capacidadeTons: "", eixos: "" });
      await carregarComposicao();
    } catch (e) { setErroComp(e.message); }
    finally { setAddingCarreta(false); }
  };

  const removerCarreta = async (id) => {
    try {
      await api("DELETE", `/api/motoristas/veiculos/${id}`, null, token);
      await carregarComposicao();
      await carregarConjuntos();
    } catch (e) { setErroComp(e.message); }
  };

  // ── Conjuntos (composições montadas: bitrem, rodotrem, simples) ──────────
  const [conjuntos, setConjuntos] = useState([]);
  const [selImplementos, setSelImplementos] = useState([]);   // ids selecionados p/ montar
  const [nomeConjunto, setNomeConjunto] = useState("");
  const [montandoConjunto, setMontandoConjunto] = useState(false);
  const [savingConjunto, setSavingConjunto] = useState(false);
  const [erroConjunto, setErroConjunto] = useState("");

  const carregarConjuntos = async () => {
    try {
      const lista = await api("GET", "/api/motoristas/conjuntos", null, token);
      setConjuntos(Array.isArray(lista) ? lista : []);
    } catch { setConjuntos([]); }
  };

  // Carretas disponíveis na garagem (para montar conjuntos)
  const carretasGaragem = veiculos.filter(v => v.tipo === "carreta");

  // Ao selecionar implementos, só deixa marcar os do MESMO tipo do primeiro escolhido
  const tipoSelecionado = selImplementos.length
    ? carretasGaragem.find(c => c.id === selImplementos[0])?.carroceria
    : null;

  const toggleImplemento = (id) => {
    setErroConjunto("");
    setSelImplementos(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  };

  const criarConjunto = async () => {
    setErroConjunto("");
    if (selImplementos.length === 0) return setErroConjunto("Selecione ao menos uma carreta.");
    setSavingConjunto(true);
    try {
      await api("POST", "/api/motoristas/conjuntos", {
        nome: nomeConjunto || null,
        veiculoIds: selImplementos,
      }, token);
      setSelImplementos([]); setNomeConjunto(""); setMontandoConjunto(false);
      await carregarConjuntos();
    } catch (e) { setErroConjunto(e.message); }
    finally { setSavingConjunto(false); }
  };

  const ativarConjunto = async (id) => {
    try {
      await api("PATCH", `/api/motoristas/conjuntos/${id}/ativar`, {}, token);
      await carregarConjuntos();
    } catch (e) { setErroConjunto(e.message); }
  };

  const removerConjunto = async (id) => {
    try {
      await api("DELETE", `/api/motoristas/conjuntos/${id}`, null, token);
      await carregarConjuntos();
    } catch (e) { setErroConjunto(e.message); }
  };

  const carregarPerfil = async () => {
    try {
      const d = await api("GET", "/api/motoristas/perfil", null, token);
      setForm({
        tipoVeiculo: d.tipo_veiculo || "", numeroEixos: d.numero_eixos || (d.tipo_veiculo ? eixosPadraoDoChassi(d.tipo_veiculo) : ""),
        tipoCarreta: d.tipo_carreta || "",
        marca: d.marca_veiculo || "", modelo: d.modelo_veiculo || "",
        placa: d.placa_veiculo || "", anoFab: d.ano_veiculo || "",
        renavam: d.renavam || "", tara: d.tara_kg || "", capacidade: d.capacidade_tons || "",
      });
      if (d.tipo_veiculo) carregarCarroceriasDisp(d.tipo_veiculo);
    } catch (e) { setError("Erro ao carregar dados: " + e.message); }
    finally { setLoadingData(false); }
  };

  useEffect(() => { carregarPerfil(); carregarComposicao(); carregarConjuntos(); }, []);
  // Recarrega carrocerias válidas sempre que o tipo de veículo muda
  useEffect(() => { carregarCarroceriasDisp(form.tipoVeiculo); }, [form.tipoVeiculo]);

  const salvar = async () => {
    setError(""); setLoading(true);
    try {
      await api("PATCH", "/api/motoristas/veiculo", {
        tipoVeiculo: form.tipoVeiculo, numeroEixos: form.numeroEixos, tipoCarreta: form.tipoCarreta,
        marca: form.marca, modelo: form.modelo, placa: form.placa,
        anoFab: form.anoFab, renavam: form.renavam, tara: form.tara, capacidade: form.capacidade,
      }, token);
      updateUserData({ tipo_veiculo: form.tipoVeiculo, placa_veiculo: form.placa });
      await carregarPerfil();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Meu Caminhão</h1></div>
      <div className="content">
        {loadingData && <Loading />}
        {!loadingData && <>
        {success && <div className="alert alert-success">✅ Dados salvos!</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <div className="card">
          <div className="card-title">Tipo do Veículo</div>
          <div className="field"><label>Tipo de chassi (troca de caminhão)</label>
            <select value={form.tipoVeiculo} onChange={e => setTipoVeiculo(e.target.value)}>
              <option value="">Selecione...</option>
              {TIPOS_VEICULO.map(v => <option key={v.id} value={v.id}>{v.icon} {v.label} — até {v.cap}</option>)}
            </select>
          </div>
          {form.tipoVeiculo && (
            <div className="field">
              <label>Número de eixos</label>
              <input type="number" min="2" max="9" value={form.numeroEixos} onChange={e => set("numeroEixos", e.target.value)} />
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                Padrão pra {TIPOS_VEICULO.find(v => v.id === form.tipoVeiculo)?.label}: {eixosPadraoDoChassi(form.tipoVeiculo)} eixos — ajuste se a sua composição real for diferente.
              </div>
            </div>
          )}
          <div className="field"><label>Carroceria principal (troca de carreta)</label>
            <select value={form.tipoCarreta} onChange={e => set("tipoCarreta", e.target.value)} disabled={!form.tipoVeiculo}>
              <option value="">Selecione...</option>
              {carroceriasDisp.map(c => <option key={c.id} value={c.id}>{ICONE_CARROCERIA[c.id] || ""} {c.label}</option>)}
            </select>
            {!form.tipoVeiculo ? (
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>Selecione o chassi acima primeiro.</div>
            ) : (
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                Só vale pro matching de fretes se você <strong>não</strong> tiver um conjunto de carretas ativo em "Composição Veicular" logo abaixo — assim que você ativa um conjunto lá, é ele que passa a decidir quais fretes aparecem pra você, e este campo é ignorado.
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Dados do Veículo</div>
          <div className="field"><label>Marca</label><input value={form.marca} onChange={e => set("marca", e.target.value)} placeholder="Scania, Volvo, Mercedes..." /></div>
          <div className="field"><label>Modelo</label><input value={form.modelo} onChange={e => set("modelo", e.target.value)} placeholder="R450, FH540, Actros..." /></div>
          <div className="grid-2">
            <div className="field"><label>Placa</label><input value={form.placa} onChange={e => set("placa", maskPlaca(e.target.value))} placeholder="ABC-1234 ou ABC1D23" /></div>
            <div className="field"><label>Ano</label><input type="number" value={form.anoFab} onChange={e => set("anoFab", e.target.value)} placeholder="2018" /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Tara (kg)</label><input type="number" value={form.tara} onChange={e => set("tara", e.target.value)} placeholder="7500" /></div>
            <div className="field"><label>Capacidade (t)</label><input type="number" value={form.capacidade} onChange={e => set("capacidade", e.target.value)} placeholder="25" /></div>
          </div>
          <div className="field"><label>RENAVAM</label><input value={form.renavam} onChange={e => set("renavam", e.target.value)} placeholder="00000000000" /></div>
        </div>

        <div className="card">
          <div className="card-title">🚛 Composição Veicular</div>
          <p style={{ fontSize: 13, color: "#8A7E6E", marginTop: -4, marginBottom: 14 }}>
            Cadastre cada carreta com sua placa e carroceria. O TRUKER só vai te mostrar fretes que seu conjunto consegue transportar.
          </p>

          {erroComp && <div className="alert alert-error" style={{ marginBottom: 12 }}>{erroComp}</div>}

          {/* Lista de carretas já cadastradas */}
          {veiculos.filter(v => v.tipo === "carreta").length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {veiculos.filter(v => v.tipo === "carreta").map(v => (
                <div key={v.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", marginBottom: 8, borderRadius: 12,
                  background: "#F5F0E8", border: "1px solid #DDD4C0",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1209" }}>
                      {v.carroceria_label || v.carroceria} · <span style={{ fontFamily: "monospace", letterSpacing: 1 }}>{v.placa}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#8A7E6E", marginTop: 2 }}>
                      {v.capacidade_tons ? `${v.capacidade_tons}t` : "capacidade não informada"}
                      {v.cargas_aceitas?.length ? ` · aceita: ${v.cargas_aceitas.join(", ")}` : ""}
                    </div>
                  </div>
                  <button onClick={() => removerCarreta(v.id)} style={{
                    background: "#FDECEA", color: "#C0392B", border: "none",
                    borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>Remover</button>
                </div>
              ))}
            </div>
          )}

          {veiculos.filter(v => v.tipo === "carreta").length === 0 && (
            <div style={{ padding: "16px", textAlign: "center", color: "#8A7E6E", fontSize: 13, background: "#F5F0E8", borderRadius: 12, marginBottom: 14 }}>
              Nenhuma carreta cadastrada ainda. Adicione abaixo.
            </div>
          )}

          {/* Formulário de adicionar carreta */}
          <div style={{ borderTop: "1px dashed #DDD4C0", paddingTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#4A3F30", marginBottom: 10 }}>Adicionar carreta</div>
            {!form.tipoVeiculo && (
              <div style={{ fontSize: 12, color: "#C0392B", marginBottom: 10 }}>
                Selecione primeiro o tipo de veículo acima para ver as carrocerias compatíveis.
              </div>
            )}
            <div className="field">
              <label>Carroceria</label>
              <select value={novaCarreta.carroceria} onChange={e => setNC("carroceria", e.target.value)} disabled={!form.tipoVeiculo}>
                <option value="">Selecione...</option>
                {carroceriasDisp.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="grid-2">
              <div className="field"><label>Placa da carreta</label><input value={novaCarreta.placa} onChange={e => setNC("placa", maskPlaca(e.target.value))} placeholder="ABC-1234 ou ABC1D23" /></div>
              <div className="field"><label>Capacidade (t)</label><input type="number" value={novaCarreta.capacidadeTons} onChange={e => setNC("capacidadeTons", e.target.value)} placeholder="25" /></div>
            </div>
            <div className="field"><label>Eixos desta carreta (opcional)</label><input type="number" min="1" max="9" value={novaCarreta.eixos} onChange={e => setNC("eixos", e.target.value)} placeholder="Ex: 3" /></div>
            <button className="btn btn-secondary" onClick={adicionarCarreta} disabled={addingCarreta || !form.tipoVeiculo} style={{ width: "100%" }}>
              {addingCarreta ? "Adicionando..." : "+ Adicionar carreta"}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">🔗 Meus Conjuntos</div>
          <p style={{ fontSize: 13, color: "#8A7E6E", marginTop: -4, marginBottom: 14 }}>
            Monte conjuntos com suas carretas (ex: bitrem com 2 graneleiros). O conjunto <strong>ativo</strong> é o que está rodando agora — só ele define quais fretes você vê.
          </p>

          {erroConjunto && <div className="alert alert-error" style={{ marginBottom: 12 }}>{erroConjunto}</div>}

          {/* Lista de conjuntos */}
          {conjuntos.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {conjuntos.map(c => (
                <div key={c.id} style={{
                  padding: "12px 14px", marginBottom: 8, borderRadius: 12,
                  background: c.ativo ? "#F0F7F0" : "#F5F0E8",
                  border: c.ativo ? "2px solid #2D7A3A" : "1px solid #DDD4C0",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1209", display: "flex", alignItems: "center", gap: 6 }}>
                        {c.nome}
                        {c.ativo && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#2D7A3A", borderRadius: 6, padding: "2px 8px" }}>ATIVO</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#8A7E6E", marginTop: 3 }}>
                        {c.qtd_implementos} carreta{c.qtd_implementos > 1 ? "s" : ""} · {c.capacidade_total}t
                        {c.cargas_aceitas?.length ? ` · aceita: ${c.cargas_aceitas.join(", ")}` : ""}
                      </div>
                    </div>
                    <button onClick={() => removerConjunto(c.id)} style={{
                      background: "transparent", color: "#C0392B", border: "none",
                      fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: 8,
                    }}>Remover</button>
                  </div>
                  {!c.ativo && (
                    <button onClick={() => ativarConjunto(c.id)} style={{
                      marginTop: 10, width: "100%", background: "#C9A84C", color: "#1A1209",
                      border: "none", borderRadius: 8, padding: "8px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    }}>Ativar este conjunto</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {conjuntos.length === 0 && !montandoConjunto && (
            <div style={{ padding: "16px", textAlign: "center", color: "#8A7E6E", fontSize: 13, background: "#F5F0E8", borderRadius: 12, marginBottom: 14 }}>
              Nenhum conjunto montado. Crie um abaixo combinando suas carretas.
            </div>
          )}

          {/* Montar novo conjunto */}
          {!montandoConjunto && (
            <button className="btn btn-secondary" onClick={() => setMontandoConjunto(true)}
              disabled={carretasGaragem.length === 0} style={{ width: "100%" }}>
              {carretasGaragem.length === 0 ? "Cadastre carretas acima primeiro" : "+ Montar novo conjunto"}
            </button>
          )}

          {montandoConjunto && (
            <div style={{ borderTop: "1px dashed #DDD4C0", paddingTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#4A3F30", marginBottom: 4 }}>Selecione as carretas do conjunto</div>
              <div style={{ fontSize: 11, color: "#8A7E6E", marginBottom: 10 }}>
                Só carretas do mesmo tipo podem ir no mesmo conjunto.
              </div>

              {carretasGaragem.map(c => {
                const marcada = selImplementos.includes(c.id);
                const bloqueada = tipoSelecionado && c.carroceria !== tipoSelecionado && !marcada;
                return (
                  <div key={c.id} onClick={() => !bloqueada && toggleImplemento(c.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 6,
                    borderRadius: 10, cursor: bloqueada ? "not-allowed" : "pointer",
                    background: marcada ? "#FBF6E9" : "#F5F0E8",
                    border: marcada ? "2px solid #C9A84C" : "1px solid #DDD4C0",
                    opacity: bloqueada ? 0.4 : 1,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      border: marcada ? "none" : "2px solid #DDD4C0",
                      background: marcada ? "#C9A84C" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#1A1209", fontSize: 13, fontWeight: 700,
                    }}>{marcada ? "✓" : ""}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#1A1209" }}>{c.carroceria_label || c.carroceria} · {c.placa}</div>
                      <div style={{ fontSize: 11, color: "#8A7E6E" }}>{c.capacidade_tons ? `${c.capacidade_tons}t` : "—"}</div>
                    </div>
                  </div>
                );
              })}

              <div className="field" style={{ marginTop: 12 }}>
                <label>Nome do conjunto (opcional)</label>
                <input value={nomeConjunto} onChange={e => setNomeConjunto(e.target.value)} placeholder="Ex: Bitrem Graneleiro 60t (deixe vazio p/ sugerir)" />
              </div>

              <div className="grid-2">
                <button className="btn btn-secondary" onClick={() => { setMontandoConjunto(false); setSelImplementos([]); setNomeConjunto(""); setErroConjunto(""); }}>Cancelar</button>
                <button className="btn btn-primary" onClick={criarConjunto} disabled={savingConjunto || selImplementos.length === 0}>
                  {savingConjunto ? "Criando..." : "Criar conjunto"}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title">Documentos do Veículo</div>
          {[["🚛 CRLV / Licenciamento", false], ["📋 RNTRC / ANTT", false], ["📸 Fotos do caminhão (frente/lateral/traseira)", false], ["🔍 Laudo de vistoria", false]].map(([doc, ok], i) => (
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
