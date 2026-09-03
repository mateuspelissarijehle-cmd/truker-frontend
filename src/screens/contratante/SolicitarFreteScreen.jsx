import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../services/api";
import { buscarEnderecoPorCep } from "../../services/viaCep";
import { formatMoney } from "../../utils/format";
import { maskCep } from "../../utils/mask";
import {
  TIPOS_CARGA, TIPOS_CARGA_VISIVEIS, TIPOS_GRAO, MODO_AGRO_V1,
  TIPOS_VEICULO, TIPOS_ANIMAL, TIPOS_MATERIAL,
  CARGA_BACKEND_MAP, ICONE_CARROCERIA, eixosPadraoDoChassi, regrasCarga,
} from "../../data/catalogos";
import { CampoCidadeAutocomplete } from "../../components/CampoCidadeAutocomplete";
import { HistoricoPrecoRota } from "../../components/HistoricoPrecoRota";

// ─────────────────────────────────────────────
// SOLICITAR FRETE
// ─────────────────────────────────────────────
export function SolicitarFreteScreen({ onNavigate, screenData }) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const motoristaConvidadoId = screenData?.motoristaConvidadoId || null;
  const motoristaConvidadoNome = screenData?.motoristaConvidadoNome || null;
  const [form, setForm] = useState({
    tipoCarga: MODO_AGRO_V1 ? "graneleiro" : "carga_seca", tipoVeiculo: "truck",
    numeroEixos: eixosPadraoDoChassi("truck"), carroceria: "",
    pesoKg: "", comprimentoM: "", larguraM: "", alturaM: "",
    descricao: "", precisaMunck: false, precisaEmpilhadeira: false,
    dataColeta: "", horario: "",
    // Campos especiais dinâmicos
    tipoGrao: "", tipoAnimal: "", qtdAnimais: "", tipoMaterial: "",
    itensMudanca: [{ id: crypto.randomUUID(), nome: "", qtd: "" }],
  });
  const [carroceriasDisp, setCarroceriasDisp] = useState([]);
  const [addr, setAddr] = useState({
    origemCep:"", origemLogradouro:"", origemNumero:"", origemComplemento:"",
    origemBairro:"", origemCidade:"", origemUF:"",
    destCep:"", destLogradouro:"", destNumero:"", destComplemento:"",
    destBairro:"", destCidade:"", destUF:"",
  });
  // Cidade/UF são controlados (não refs) — o autocomplete precisa reagir a cada
  // tecla digitada pra buscar sugestões, e escolher uma sugestão preenche os dois.
  const [origemCidade, setOrigemCidade] = useState(screenData?.origemCidadeSugerida || "");
  const [origemUF, setOrigemUF] = useState(screenData?.origemUfSugerida || "");
  const [destCidade, setDestCidade] = useState("");
  const [destUF, setDestUF] = useState("");
  const [calc, setCalc] = useState(null);
  const [valorEditavel, setValorEditavel] = useState("");
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Inputs não-controlados (defaultValue + ref) pra não re-renderizar a tela inteira
  // a cada tecla digitada em endereço -- só lidos na hora de enviar (rv) ou preenchidos
  // via CEP (fillCep). `FR` é um objeto plano (não um ref) só pra poder indexar por
  // chave dinâmica (`${tipo}${campo}`); os refs em si (useRef) são os valores estáveis.
  const origemCepRef = useRef(null);
  const origemLogradouroRef = useRef(null);
  const origemNumeroRef = useRef(null);
  const origemComplementoRef = useRef(null);
  const origemBairroRef = useRef(null);
  const destCepRef = useRef(null);
  const destLogradouroRef = useRef(null);
  const destNumeroRef = useRef(null);
  const destComplementoRef = useRef(null);
  const destBairroRef = useRef(null);
  const FR = {
    origemCep: origemCepRef, origemLogradouro: origemLogradouroRef, origemNumero: origemNumeroRef,
    origemComplemento: origemComplementoRef, origemBairro: origemBairroRef,
    destCep: destCepRef, destLogradouro: destLogradouroRef, destNumero: destNumeroRef,
    destComplemento: destComplementoRef, destBairro: destBairroRef,
  };
  const rv = k => FR[k]?.current?.value?.trim() || "";

  const set = (k, val) => setForm(f => ({ ...f, [k]: val }));
  const tipoCargaObj = TIPOS_CARGA.find(c => c.id === form.tipoCarga);
  const tipoVeiculoObj = TIPOS_VEICULO.find(v => v.id === form.tipoVeiculo);

  // Trocar o chassi reresseta o número de eixos pro padrão daquele chassi
  // (o contratante pode ajustar se a composição real for diferente).
  const setTipoVeiculo = (id) => setForm(f => ({ ...f, tipoVeiculo: id, numeroEixos: eixosPadraoDoChassi(id) }));

  // Carroceria desejada (opcional) — carrega o catálogo compatível com o
  // chassi escolhido, filtrado pelas que aceitam o tipo de carga selecionado
  // (mesmo catálogo que o motorista usa em "Meu Caminhão", services/matching.js).
  useEffect(() => {
    if (!form.tipoVeiculo || !token) { queueMicrotask(() => setCarroceriasDisp([])); return; }
    api("GET", `/api/motoristas/carrocerias-disponiveis?veiculo=${form.tipoVeiculo}`, null, token)
      .then(lista => {
        const cargaBackend = CARGA_BACKEND_MAP[form.tipoCarga] || "geral";
        const compativeis = lista.filter(c => c.cargas.includes(cargaBackend));
        setCarroceriasDisp(compativeis);
        setForm(f => (compativeis.some(c => c.id === f.carroceria) ? f : { ...f, carroceria: "" }));
      })
      .catch(() => setCarroceriasDisp([]));
  }, [form.tipoVeiculo, form.tipoCarga, token]);

  const fillCep = async (cep, tipo) => {
    const endereco = await buscarEnderecoPorCep(cep);
    if (!endereco) return;
    [["Logradouro", endereco.logradouro], ["Bairro", endereco.bairro]].forEach(([f, val]) => {
      if (FR[`${tipo}${f}`]?.current) FR[`${tipo}${f}`].current.value = val || "";
    });
    if (tipo === "origem") { setOrigemCidade(endereco.cidade); setOrigemUF(endereco.uf); }
    else { setDestCidade(endereco.cidade); setDestUF(endereco.uf); }
  };

  const composeAddr = (tipo, a) => [a[`${tipo}Logradouro`], a[`${tipo}Numero`], a[`${tipo}Complemento`], a[`${tipo}Bairro`], a[`${tipo}Cidade`], a[`${tipo}UF`]].filter(Boolean).join(", ");

  const handleContinuar = () => {
    const snap = {
      origemCep: rv("origemCep"), origemLogradouro: rv("origemLogradouro"), origemNumero: rv("origemNumero"),
      origemComplemento: rv("origemComplemento"), origemBairro: rv("origemBairro"), origemCidade: origemCidade.trim(), origemUF: origemUF.trim(),
      destCep: rv("destCep"), destLogradouro: rv("destLogradouro"), destNumero: rv("destNumero"),
      destComplemento: rv("destComplemento"), destBairro: rv("destBairro"), destCidade: destCidade.trim(), destUF: destUF.trim(),
    };
    if (!snap.origemLogradouro || !snap.origemNumero || !snap.origemCidade) return setError("Preencha logradouro, número e cidade da coleta");
    if (!snap.destLogradouro || !snap.destNumero || !snap.destCidade) return setError("Preencha logradouro, número e cidade da entrega");
    setError(""); setAddr(snap); setStep(2);
  };

  const calcular = async () => {
    const origem = composeAddr("origem", addr);
    const dest = composeAddr("dest", addr);
    if (!origem || !dest) return setError("Endereço incompleto — volte ao passo 1");

    // Peso é sempre obrigatório
    if (!form.pesoKg || Number(form.pesoKg) <= 0) return setError("Informe o peso total da carga (kg).");

    // Validação dos campos especiais obrigatórios
    const regras = regrasCarga(form.tipoCarga);
    if (regras.especial === "animal" && !form.tipoAnimal) return setError("Selecione o tipo de animal.");
    if (regras.especial === "material" && !form.tipoMaterial) return setError("Selecione o tipo de material.");
    if (regras.especial === "itens" && !form.itensMudanca.some(i => i.nome)) return setError("Adicione ao menos um item da mudança.");

    setError(""); setCalcLoading(true);
    const cargaBackend = CARGA_BACKEND_MAP[form.tipoCarga] || "geral";
    try {
      const data = await api("GET", `/api/fretes/calcular?origem=${encodeURIComponent(origem)}&destino=${encodeURIComponent(dest)}&peso=${(Number(form.pesoKg)||1000)/1000}&veiculo=${form.tipoVeiculo}&carga=${cargaBackend}&numeroEixos=${form.numeroEixos}`, null, token);
      const pisoMinimo = data.frete?.pisoMinimo || data.frete?.valorAntt || 0;
      setCalc({ distancia_km: data.rota?.distanciaKm, duracao: data.rota?.duracao, pisoMinimo });
      setValorEditavel(pisoMinimo.toFixed(2));
      setStep(3);
    } catch (e) { setError(e.message); }
    finally { setCalcLoading(false); }
  };

  const solicitar = async () => {
    if (!calc) return;
    const valorNum = parseFloat(String(valorEditavel).replace(",", "."));
    if (!valorNum || valorNum < calc.pisoMinimo) {
      return setError(`O valor não pode ser menor que o piso mínimo ANTT (${formatMoney(calc.pisoMinimo)})`);
    }
    setLoading(true); setError("");
    const cargaBackend = CARGA_BACKEND_MAP[form.tipoCarga] || "geral";
    const regras = regrasCarga(form.tipoCarga);

    // Monta os detalhes da carga conforme o tipo (só o que faz sentido)
    const detalhesCarga = {
      tipoCargaLabel: TIPOS_CARGA.find(c => c.id === form.tipoCarga)?.label || form.tipoCarga,
      descricao: form.descricao || null,
    };
    if (form.tipoCarga === "graneleiro" && form.tipoGrao) {
      detalhesCarga.grao = TIPOS_GRAO.find(g => g.id === form.tipoGrao)?.label || form.tipoGrao;
    }
    if (regras.dimensoes) {
      detalhesCarga.dimensoes = {
        comprimentoM: form.comprimentoM || null,
        larguraM: form.larguraM || null,
        alturaM: form.alturaM || null,
      };
    }
    if (regras.especial === "animal") {
      detalhesCarga.animal = { tipo: form.tipoAnimal || null, quantidade: form.qtdAnimais || null };
    }
    if (regras.especial === "material") {
      detalhesCarga.material = form.tipoMaterial || null;
    }
    if (regras.especial === "itens") {
      detalhesCarga.itens = form.itensMudanca.filter(i => i.nome);
    }

    try {
      await api("POST", "/api/fretes", {
        tipoCarga: cargaBackend, tipoVeiculo: form.tipoVeiculo,
        numeroEixos: form.numeroEixos, carroceria: form.carroceria || undefined,
        pesoTons: (Number(form.pesoKg)||1000)/1000,
        origemEndereco: composeAddr("origem", addr), origemCidade: addr.origemCidade, origemEstado: addr.origemUF,
        destEndereco: composeAddr("dest", addr), destCidade: addr.destCidade, destEstado: addr.destUF,
        valorProposto: valorNum,
        detalhesCarga,
        ...(motoristaConvidadoId ? { motoristaConvidadoId } : {}),
      }, token);
      setSuccess(true);
      setTimeout(() => onNavigate("meus-fretes"), 2000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => step > 1 ? setStep(s => s - 1) : onNavigate("home-contratante")}>←</button>
        <h1>Solicitar Frete</h1>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text2)" }}>{step}/3</span>
      </div>
      <div className="content">
        {motoristaConvidadoId && (
          <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🚛</span>
            <span>Convidando <strong>{motoristaConvidadoNome || "motorista selecionado"}</strong> pra este frete — ele será notificado assim que você publicar.</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            {motoristaConvidadoId ? "✅ Convite enviado! O motorista tem até 2h pra aceitar." : "✅ Frete solicitado! Motoristas serão notificados."}
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}

        {step === 1 && (
          <>
            {/* "Tipo de Frete" (urbano/intermunicipal/interestadual) removido
                daqui (item 2, 01/09/2026, pedido do Mateus) -- nunca era
                enviado/salvo em lugar nenhum, e o backend agora deriva
                sozinho a partir de UF/cidade de origem×destino (ver
                derivarTipoFrete em routes/fretes.js) -- "resolve com o CEP",
                sem exigir clique do solicitante. */}
            <div className="card">
              <div className="card-title">📍 Endereço de Coleta</div>
              <div className="field"><label>CEP</label>
                <input ref={origemCepRef} defaultValue={addr.origemCep} placeholder="00000-000"
                  onChange={e => { e.target.value = maskCep(e.target.value); if (e.target.value.replace(/\D/g,"").length===8) fillCep(e.target.value,"origem"); }} /></div>
              <div className="field"><label>Logradouro</label>
                <input ref={origemLogradouroRef} defaultValue={addr.origemLogradouro} placeholder="Rua, Avenida, Rodovia..." /></div>
              <div className="grid-2">
                <div className="field"><label>Número</label><input ref={origemNumeroRef} defaultValue={addr.origemNumero} placeholder="123" /></div>
                <div className="field"><label>Complemento</label><input ref={origemComplementoRef} defaultValue={addr.origemComplemento} placeholder="Galpão, Sala..." /></div>
              </div>
              <div className="field"><label>Bairro / Distrito</label>
                <input ref={origemBairroRef} defaultValue={addr.origemBairro} placeholder="Bairro" /></div>
              <div className="grid-2">
                <CampoCidadeAutocomplete
                  value={origemCidade} onChange={setOrigemCidade}
                  onSelecionar={({ cidade, uf }) => { setOrigemCidade(cidade); if (uf) setOrigemUF(uf); }}
                  placeholder="Curitiba"
                />
                <div className="field"><label>UF</label><input value={origemUF} onChange={e => setOrigemUF(e.target.value.toUpperCase())} placeholder="PR" maxLength={2} /></div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">🏁 Endereço de Entrega</div>
              <div className="field"><label>CEP</label>
                <input ref={destCepRef} defaultValue={addr.destCep} placeholder="00000-000"
                  onChange={e => { e.target.value = maskCep(e.target.value); if (e.target.value.replace(/\D/g,"").length===8) fillCep(e.target.value,"dest"); }} /></div>
              <div className="field"><label>Logradouro</label>
                <input ref={destLogradouroRef} defaultValue={addr.destLogradouro} placeholder="Rua, Avenida, Rodovia..." /></div>
              <div className="grid-2">
                <div className="field"><label>Número</label><input ref={destNumeroRef} defaultValue={addr.destNumero} placeholder="123" /></div>
                <div className="field"><label>Complemento</label><input ref={destComplementoRef} defaultValue={addr.destComplemento} placeholder="Galpão, Sala..." /></div>
              </div>
              <div className="field"><label>Bairro / Distrito</label>
                <input ref={destBairroRef} defaultValue={addr.destBairro} placeholder="Bairro" /></div>
              <div className="grid-2">
                <CampoCidadeAutocomplete
                  value={destCidade} onChange={setDestCidade}
                  onSelecionar={({ cidade, uf }) => { setDestCidade(cidade); if (uf) setDestUF(uf); }}
                  placeholder="São Paulo"
                />
                <div className="field"><label>UF</label><input value={destUF} onChange={e => setDestUF(e.target.value.toUpperCase())} placeholder="SP" maxLength={2} /></div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Agendamento</div>
              <div className="field"><label>Data de coleta</label><input type="date" value={form.dataColeta} onChange={e => set("dataColeta", e.target.value)} /></div>
              <div className="field"><label>Horário preferido</label><input type="time" value={form.horario} onChange={e => set("horario", e.target.value)} /></div>
            </div>
            <button className="btn btn-primary" onClick={handleContinuar}>Continuar →</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="card">
              <div className="card-title">Tipo de Carga</div>
              <div className="carga-grid">
                {TIPOS_CARGA_VISIVEIS.map(c => (
                  <div key={c.id} className={`carga-item ${form.tipoCarga === c.id ? "selected" : ""}`} onClick={() => set("tipoCarga", c.id)}>
                    <div className="ci-icon">{c.icon}</div><div className="ci-label">{c.label}</div>
                  </div>
                ))}
              </div>
              {form.tipoCarga === "graneleiro" && (
                <div className="field" style={{ marginTop: 12 }}>
                  <label>Tipo de grão</label>
                  <select value={form.tipoGrao} onChange={e => set("tipoGrao", e.target.value)}>
                    <option value="">Selecione...</option>
                    {TIPOS_GRAO.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                    Só entra na descrição da carga — o piso mínimo ANTT é o mesmo pra qualquer grão a granel (categoria "granel sólido").
                  </div>
                </div>
              )}
            </div>
            <div className="card">
              <div className="card-title">Veículo necessário</div>
              <div className="field">
                <label>Tipo de chassi *</label>
                <select value={form.tipoVeiculo} onChange={e => setTipoVeiculo(e.target.value)}>
                  {TIPOS_VEICULO.map(v => <option key={v.id} value={v.id}>{v.icon} {v.label} — até {v.cap}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Número de eixos *</label>
                  <input type="number" min="2" max="9" value={form.numeroEixos}
                    onChange={e => set("numeroEixos", e.target.value)} />
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                    Padrão pra {tipoVeiculoObj?.label}: {tipoVeiculoObj?.eixosPadrao} eixos — ajuste se a composição real for diferente. É isso que define o piso mínimo ANTT.
                  </div>
                </div>
                <div className="field">
                  <label>Carroceria desejada (opcional)</label>
                  <select value={form.carroceria} onChange={e => set("carroceria", e.target.value)} disabled={!carroceriasDisp.length}>
                    <option value="">Qualquer uma compatível</option>
                    {carroceriasDisp.map(c => <option key={c.id} value={c.id}>{ICONE_CARROCERIA[c.id] || ""} {c.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Peso e Detalhes da Carga</div>
              <div className="field"><label>Peso total (kg) *</label><input type="number" placeholder="Ex: 5000" value={form.pesoKg} onChange={e => set("pesoKg", e.target.value)} /></div>

              {/* Dimensões — só quando o tipo de carga pede */}
              {regrasCarga(form.tipoCarga).dimensoes && (
                <div className="grid-3">
                  <div className="field"><label>Comp. (m)</label><input type="number" placeholder="6" value={form.comprimentoM} onChange={e => set("comprimentoM", e.target.value)} /></div>
                  <div className="field"><label>Larg. (m)</label><input type="number" placeholder="2.4" value={form.larguraM} onChange={e => set("larguraM", e.target.value)} /></div>
                  <div className="field"><label>Alt. (m)</label><input type="number" placeholder="2.8" value={form.alturaM} onChange={e => set("alturaM", e.target.value)} /></div>
                </div>
              )}

              {/* Campo especial: CARGA VIVA → tipo de animal + quantidade */}
              {regrasCarga(form.tipoCarga).especial === "animal" && (
                <div className="grid-2">
                  <div className="field"><label>Tipo de animal *</label>
                    <select value={form.tipoAnimal} onChange={e => set("tipoAnimal", e.target.value)}>
                      <option value="">Selecione...</option>
                      {TIPOS_ANIMAL.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Qtd. de cabeças</label><input type="number" placeholder="Ex: 18" value={form.qtdAnimais} onChange={e => set("qtdAnimais", e.target.value)} /></div>
                </div>
              )}

              {/* Campo especial: CONSTRUÇÃO → tipo de material */}
              {regrasCarga(form.tipoCarga).especial === "material" && (
                <div className="field"><label>Tipo de material *</label>
                  <select value={form.tipoMaterial} onChange={e => set("tipoMaterial", e.target.value)}>
                    <option value="">Selecione...</option>
                    {TIPOS_MATERIAL.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}

              {/* Campo especial: MUDANÇA → lista de itens */}
              {regrasCarga(form.tipoCarga).especial === "itens" && (
                <div className="field">
                  <label>Itens da mudança</label>
                  {form.itensMudanca.map((item, idx) => (
                    <div key={item.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input style={{ flex: 2 }} placeholder="Ex: Geladeira" value={item.nome}
                        onChange={e => {
                          const arr = [...form.itensMudanca]; arr[idx].nome = e.target.value; set("itensMudanca", arr);
                        }} />
                      <input style={{ flex: 1 }} type="number" placeholder="Qtd" value={item.qtd}
                        onChange={e => {
                          const arr = [...form.itensMudanca]; arr[idx].qtd = e.target.value; set("itensMudanca", arr);
                        }} />
                      {form.itensMudanca.length > 1 && (
                        <button onClick={() => set("itensMudanca", form.itensMudanca.filter((_, i) => i !== idx))}
                          style={{ background: "#FDECEA", color: "#C0392B", border: "none", borderRadius: 8, padding: "0 12px", cursor: "pointer", fontWeight: 700 }}>×</button>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-secondary" style={{ width: "100%", marginTop: 4 }}
                    onClick={() => set("itensMudanca", [...form.itensMudanca, { id: crypto.randomUUID(), nome: "", qtd: "" }])}>
                    + Adicionar item
                  </button>
                </div>
              )}

              <div className="field"><label>Descrição / observações</label><textarea rows={3} placeholder="Detalhes importantes da carga..." value={form.descricao} onChange={e => set("descricao", e.target.value)} style={{ resize: "none" }} /></div>
            </div>
            <div className="card">
              <div className="card-title">Equipamentos no pátio</div>
              {[["precisaMunck", "🏗️ Necessário Munck"], ["precisaEmpilhadeira", "🏭 Há empilhadeira no pátio"]].map(([k, label]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 14 }}>{label}</span>
                  <label className="toggle"><input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} /><span className="toggle-slider" /></label>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Documentos e Fotos</div>
              <div className="upload-area" style={{ marginBottom: 8 }}>📸 Fotos da carga</div>
              <div className="upload-area" style={{ marginBottom: 8 }}>📄 Nota fiscal</div>
              <div className="upload-area">🏭 Fotos do pátio</div>
            </div>
            <button className="btn btn-primary" onClick={calcular} disabled={calcLoading}>{calcLoading ? "Calculando rota..." : "📍 Calcular Rota e Valor"}</button>
          </>
        )}

        {step === 3 && calc && (
          <>
            <div className="card" style={{ borderColor: "var(--orange)", borderWidth: 2 }}>
              <div className="card-title">Resumo do Frete</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <span className="tag-chip">{tipoCargaObj?.icon} {tipoCargaObj?.label}</span>
                <span className="tag-chip">🚛 {tipoVeiculoObj?.label}</span>
              </div>
              {form.precisaMunck && <span className="tag-chip">🏗️ Munck</span>}
              {form.precisaEmpilhadeira && <span className="tag-chip">🏭 Empilhadeira</span>}
              <div className="divider" />
              <div className="info-row"><span className="info-label">Coleta</span><span className="info-value" style={{ fontSize: 12 }}>{composeAddr("origem", addr)}</span></div>
              <div className="info-row"><span className="info-label">Entrega</span><span className="info-value" style={{ fontSize: 12 }}>{composeAddr("dest", addr)}</span></div>
              <div className="info-row"><span className="info-label">Distância</span><span className="info-value">{calc.distancia_km} km</span></div>
              <div className="info-row"><span className="info-label">Duração</span><span className="info-value">{calc.duracao}</span></div>
              <div className="info-row"><span className="info-label">Peso</span><span className="info-value">{form.pesoKg} kg</span></div>
              <div className="divider" />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Piso mínimo legal (Tabela ANTT)</div>
                <div className="price" style={{ fontSize: 28, color: "var(--text3)" }}>{formatMoney(calc.pisoMinimo)}</div>
              </div>
            </div>
            <HistoricoPrecoRota
              origemCidade={addr.origemCidade} origemUf={addr.origemUF}
              destCidade={addr.destCidade} destUf={addr.destUF}
              tipoVeiculo={form.tipoVeiculo} numeroEixos={form.numeroEixos}
              tipoCarga={CARGA_BACKEND_MAP[form.tipoCarga] || "geral"}
            />
            <div className="card">
              <div className="card-title">💰 Defina o valor do frete</div>
              <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>
                Você pode oferecer o piso mínimo ou um valor maior para atrair motoristas mais rápido. O valor não pode ficar abaixo do piso legal.
              </p>
              <div className="field">
                <label>Valor do frete (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min={calc.pisoMinimo}
                  value={valorEditavel}
                  onChange={e => setValorEditavel(e.target.value)}
                />
              </div>
              {parseFloat(String(valorEditavel).replace(",", ".")) < calc.pisoMinimo && (
                <div className="alert alert-error" style={{ marginBottom: 0 }}>
                  ⚠️ Valor abaixo do piso mínimo ANTT ({formatMoney(calc.pisoMinimo)})
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={solicitar} disabled={loading || parseFloat(String(valorEditavel).replace(",", ".")) < calc.pisoMinimo} style={{ marginBottom: 10 }}>{loading ? "Publicando frete..." : "🚛 Publicar Frete"}</button>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>← Editar</button>
          </>
        )}
      </div>
    </div>
  );
}
