import { useState } from "react";
import { useAuth } from "../../context/useAuth";
import { api } from "../../services/api";
import { maskPlaca } from "../../utils/mask";
import { TIPOS_CARGA, TIPOS_VEICULO } from "../../data/catalogos";
import { TrukerLogo } from "../../components/TrukerLogo";
import { PasswordInput } from "../../components/PasswordInput";
import { RequisitosSenha } from "../../components/RequisitosSenha";
import { senhaForte } from "../../utils/senha";
import { ConteudoTermos } from "../../components/ConteudoTermos";

const sHeaderTopo = {
  padding: "16px 20px 0",
};
const sProgressBarTopo = {
  height: 4, background: "var(--border)", borderRadius: 2,
  margin: "12px 20px 0", overflow: "hidden",
};

// Helper de topo (back + barra de progresso), reaproveitado em cada step.
// Fica no escopo do módulo (não dentro de CadastroScreen) pra não ser
// recriado a cada render.
function Topo({ showBar = true, step, pct, onNavigate, voltar }) {
  const sProgressFill = {
    height: "100%", background: "var(--gold)", borderRadius: 2,
    width: `${pct}%`, transition: "width 0.3s ease",
  };
  return (
    <div style={sHeaderTopo}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={step === 0 ? () => onNavigate("login") : voltar}
          style={{ background: "none", border: "none", fontSize: 22, color: "var(--text)", cursor: "pointer", padding: "4px 8px 4px 0" }}>
          ←
        </button>
        {showBar && (
          <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}>{pct}%</span>
        )}
      </div>
      {showBar && <div style={sProgressBarTopo}><div style={sProgressFill} /></div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// CADASTRO — fluxo passo a passo
// ─────────────────────────────────────────────
export function CadastroScreen({ onNavigate, screenData }) {
  const { login } = useAuth();

  // Se vier da EntradaScreen o tipo já está definido → começa no step 1
  // step 0  = escolha do tipo (tela de entrada, sem barra de progresso)
  // step 1..N = dados, um por tela
  // step 99 = verificação de e-mail
  const tipoInicial = screenData?.tipo || null;
  const [step, setStep] = useState(tipoInicial ? 1 : 0);
  const [tipo, setTipo] = useState(tipoInicial || "contratante");
  const [form, setForm] = useState({
    nome: "", email: "", senha: "", telefone: "",
    documento: "", nomeEmpresa: "", tiposCarga: [],
    tipoVeiculo: "", cnh: "", rntrc: "", placa: "", anoFab: "",
  });
  const [aceitouTermos, setAceitouTermos] = useState(false);
  // Modal inline (não navega pra outra tela) -- ver ConteudoTermos.jsx: antes o
  // link "Políticas de Uso" chamava onNavigate("termos"), e o botão voltar de lá
  // (onNavigate(-1)) jogava pra fora do cadastro (usuário ainda não está logado
  // nesse ponto, então -1 caía no fallback de "home", não existe "voltar de
  // verdade" no roteador atual) -- descartava todo o formulário preenchido.
  const [mostrarTermos, setMostrarTermos] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [pendingUser, setPendingUser] = useState(null);
  const [codigoVerif, setCodigoVerif] = useState("");
  const [reenviando, setReenviando]   = useState(false);
  const [reenviadoMsg, setReenviadoMsg] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleCarga = (id) =>
    setForm(f => ({ ...f, tiposCarga: f.tiposCarga.includes(id) ? f.tiposCarga.filter(x => x !== id) : [...f.tiposCarga, id] }));

  // Sequências de passos por tipo (1-based dentro do fluxo)
  // Contratante:  nome(1) email(2) senha(3) tel(4) doc(5) empresa(6) cargas(7) termos(8)
  // Motorista:    nome(1) email(2) senha(3) tel(4) cpf(5) cnh(6) rntrc(7) veiculo(8) placa(9) ano(10) cargas(11) termos(12)
  const TOTAL = tipo === "motorista" ? 12 : 8;
  const pct   = step === 0 ? 0 : Math.round((step / TOTAL) * 100);

  const [verificando, setVerificando] = useState(false);

  const verificarDisponibilidade = async (campo, valor) => {
    try {
      const data = await api("GET", `/api/auth/verificar-disponibilidade?campo=${campo}&valor=${encodeURIComponent(valor)}`);
      return data.disponivel;
    } catch { return true; } // em caso de erro de rede, deixa passar
  };

  const avancar = async () => {
    setError("");
    // Step 2: e-mail — verifica duplicidade antes de avançar
    if (step === 2) {
      if (!form.email.trim()) return setError("Digite seu e-mail.");
      setVerificando(true);
      const disponivel = await verificarDisponibilidade("email", form.email.trim());
      setVerificando(false);
      if (!disponivel) return setError("Este e-mail já está cadastrado. Faça login ou use outro e-mail.");
    }
    // Step 6 (motorista): CNH — verifica duplicidade
    if (step === 6 && tipo === "motorista") {
      if (form.cnh.trim()) {
        setVerificando(true);
        const disponivel = await verificarDisponibilidade("cnh", form.cnh.trim());
        setVerificando(false);
        if (!disponivel) return setError("Esta CNH já está cadastrada em outra conta.");
      }
    }
    // Step 7 (motorista): RNTRC — verifica duplicidade
    if (step === 7 && tipo === "motorista") {
      if (form.rntrc.trim()) {
        setVerificando(true);
        const disponivel = await verificarDisponibilidade("rntrc", form.rntrc.trim());
        setVerificando(false);
        if (!disponivel) return setError("Este RNTRC já está cadastrado em outra conta.");
      }
    }
    setStep(s => s + 1);
  };
  const voltar  = () => {
    setError("");
    if (step <= 1) {
      // Se veio da tela de entrada (tipo já vinha definido), volta pra lá
      if (tipoInicial) { onNavigate("entrada"); }
      else { setStep(0); }
    } else {
      setStep(s => s - 1);
    }
  };

  const finalizar = async () => {
    if (!aceitouTermos) return setError("Aceite os Termos de Uso para continuar.");
    setError(""); setLoading(true);
    try {
      const data = await api("POST", "/api/auth/cadastro", { ...form, tipo });
      setPendingUser({ usuario: data.usuario, token: data.token, codigo_teste: data.codigo_teste || null, emailEnviado: data.emailEnviado !== false });
      setStep(99);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const verificarEmail = async () => {
    if (codigoVerif.length !== 6) return setError("Digite o código de 6 dígitos.");
    setError(""); setLoading(true);
    try {
      await api("POST", "/api/auth/verificar-email", { usuarioId: pendingUser.usuario.id, codigo: codigoVerif });
      login(pendingUser.usuario, pendingUser.token);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const reenviarCodigo = async () => {
    setReenviando(true); setReenviadoMsg("");
    try {
      const resp = await api("POST", "/api/auth/reenviar-codigo", { usuarioId: pendingUser.usuario.id });
      setReenviadoMsg(resp.emailEnviado === false ? "Não conseguimos enviar o e-mail agora." : "Novo código enviado!");
      setPendingUser(u => ({ ...u, emailEnviado: resp.emailEnviado !== false, ...(resp.codigo_teste ? { codigo_teste: resp.codigo_teste } : {}) }));
    } catch { setReenviadoMsg("Erro ao reenviar."); }
    finally { setReenviando(false); }
  };

  // ── Estilos internos reutilizáveis ──────────────────────
  const sContainer = {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    background: "var(--surface)", padding: "0 0 40px",
  };
  const sContent = {
    flex: 1, padding: "32px 24px 0",
  };
  const sBigTitle = {
    fontSize: 28, fontWeight: 800, color: "var(--text)",
    lineHeight: 1.2, marginBottom: 6,
  };
  const sSub = {
    fontSize: 14, color: "var(--text3)", marginBottom: 28, lineHeight: 1.5,
  };
  const sInput = {
    width: "100%", fontSize: 17, padding: "14px 16px",
    border: "1.5px solid var(--border)", borderRadius: 12,
    background: "var(--surface2)", color: "var(--text)",
    outline: "none", boxSizing: "border-box",
  };
  const sFooter = {
    padding: "20px 24px 0",
  };
  const sContinuar = {
    width: "100%", padding: "16px", fontSize: 16, fontWeight: 700,
    background: "var(--gold)", color: "var(--text)", border: "none",
    borderRadius: 14, cursor: "pointer",
  };
  const sContinuarDisabled = { ...sContinuar, opacity: 0.4, cursor: "not-allowed" };

  // ── Modal de Termos/Privacidade (inline, não navega) ─────
  // Renderizado por cima de qualquer step -- fechar volta pro MESMO passo do
  // cadastro, com o formulário intacto (checkbox de aceite, dados digitados etc).
  if (mostrarTermos) {
    return (
      <div style={sContainer}>
        <div style={sHeaderTopo}>
          <button onClick={() => setMostrarTermos(false)}
            style={{ background: "none", border: "none", fontSize: 22, color: "var(--text)", cursor: "pointer", padding: "4px 8px 4px 0" }}>
            ←
          </button>
        </div>
        <div style={sContent}>
          <div style={sBigTitle}>Termos de uso</div>
          <div className="card">
            <ConteudoTermos />
          </div>
        </div>
        <div style={sFooter}>
          <button style={sContinuar} onClick={() => setMostrarTermos(false)}>Voltar pro cadastro</button>
        </div>
      </div>
    );
  }

  // ── STEP 99: Verificação de e-mail ───────────────────────
  if (step === 99 && pendingUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px", background: "var(--surface)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>📧</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "var(--text)" }}>Verifique seu e-mail</div>
          <p style={{ color: "var(--text3)", fontSize: 14, margin: 0 }}>
            Enviamos um código de 6 dígitos para<br />
            <strong style={{ color: "var(--gold)" }}>{pendingUser.usuario.email}</strong>
          </p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {reenviadoMsg && <div className="alert alert-success">✅ {reenviadoMsg}</div>}
        {pendingUser.emailEnviado === false && !pendingUser.codigo_teste && (
          <div className="alert alert-error">
            ⚠️ Não conseguimos enviar o e-mail agora. Confira sua caixa de spam ou toque em "Reenviar código" em alguns instantes.
          </div>
        )}
        {pendingUser.codigo_teste && (
          <div style={{ background: "rgba(201,168,76,0.1)", border: "1px dashed var(--gold)", borderRadius: 12, padding: "14px 12px", marginBottom: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🧪 Modo teste</div>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 14, color: "var(--text)", fontFamily: "monospace" }}>{pendingUser.codigo_teste}</div>
          </div>
        )}
        <div className="field">
          <label>Código de verificação</label>
          <input type="text" inputMode="numeric" maxLength={6}
            value={codigoVerif} onChange={e => setCodigoVerif(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            style={{ fontSize: 28, letterSpacing: 12, textAlign: "center", fontFamily: "monospace" }} />
        </div>
        <button className="btn btn-primary" onClick={verificarEmail} disabled={loading} style={{ marginBottom: 12 }}>
          {loading ? "Verificando..." : "✅ Verificar E-mail"}
        </button>
        <button className="btn btn-secondary" onClick={reenviarCodigo} disabled={reenviando}>
          {reenviando ? "Enviando..." : "🔄 Reenviar código"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, color: "var(--text3)", fontSize: 12 }}>O código expira em 15 minutos.</p>
      </div>
    );
  }

  // ── STEP 0: Escolha do tipo ───────────────────────────────
  if (step === 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--surface)" }}>
        <div style={{ padding: "16px 20px 0" }}>
          <button onClick={() => onNavigate("login")}
            style={{ background: "none", border: "none", fontSize: 22, color: "var(--text)", cursor: "pointer", padding: "4px 8px 4px 0" }}>
            ←
          </button>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <TrukerLogo size="sm" />
            <p style={{ color: "var(--text3)", marginTop: 8, fontSize: 15 }}>Como você quer usar o TRUKER?</p>
          </div>

          {/* Card Motorista */}
          <div onClick={() => { setTipo("motorista"); set("tipo", "motorista"); avancar(); }}
            style={{ background: "#fff", border: "2px solid var(--border)", borderRadius: 16, padding: "20px 20px", marginBottom: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>🚛</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>Sou motorista</div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>Quero encontrar fretes e trabalhar</div>
            </div>
            <div style={{ marginLeft: "auto", color: "var(--text3)", fontSize: 20 }}>›</div>
          </div>

          {/* Card Contratante */}
          <div onClick={() => { setTipo("contratante"); set("tipo", "contratante"); avancar(); }}
            style={{ background: "#fff", border: "2px solid var(--border)", borderRadius: 16, padding: "20px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>📦</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>Sou contratante</div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>Quero publicar fretes e contratar</div>
            </div>
            <div style={{ marginLeft: "auto", color: "var(--text3)", fontSize: 20 }}>›</div>
          </div>

          <p style={{ textAlign: "center", marginTop: 32, color: "var(--text3)", fontSize: 13 }}>
            Já tem conta?{" "}
            <span style={{ color: "var(--gold)", cursor: "pointer", fontWeight: 600 }} onClick={() => onNavigate("login")}>Entrar</span>
          </p>
        </div>
      </div>
    );
  }

  // ── STEPS 1–N: um campo por tela ─────────────────────────
  // Passos COMUNS (1-4): nome, email, senha, telefone
  if (step === 1) {
    return (
      <div style={sContainer}>
        <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
        <div style={sContent}>
          <div style={sBigTitle}>Digite seu nome</div>
          <div style={sSub}>Como você quer ser chamado no TRUKER.</div>
          {error && <div className="alert alert-error">{error}</div>}
          <input autoFocus style={sInput} placeholder="Nome completo"
            value={form.nome} onChange={e => set("nome", e.target.value)}
            onKeyDown={e => e.key === "Enter" && form.nome.trim() && avancar()} />
        </div>
        <div style={sFooter}>
          <button style={form.nome.trim() ? sContinuar : sContinuarDisabled}
            disabled={!form.nome.trim()}
            onClick={avancar}>Continuar</button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div style={sContainer}>
        <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
        <div style={sContent}>
          <div style={sBigTitle}>Digite seu e-mail</div>
          <div style={sSub}>Você vai usar este e-mail para entrar no app.</div>
          {error && <div className="alert alert-error">{error}</div>}
          <input autoFocus type="email" style={sInput} placeholder="seu@email.com"
            value={form.email} onChange={e => set("email", e.target.value)}
            onKeyDown={e => e.key === "Enter" && form.email.trim() && !loading && avancar()} />
        </div>
        <div style={sFooter}>
          <button style={form.email.trim() && !verificando ? sContinuar : sContinuarDisabled}
            disabled={!form.email.trim() || verificando}
            onClick={avancar}>{verificando ? "Verificando..." : "Continuar"}</button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    const senhaOk = senhaForte(form.senha) && form.senha === (form.confirmarSenha || "");
    return (
      <div style={sContainer}>
        <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
        <div style={sContent}>
          <div style={sBigTitle}>Crie uma senha</div>
          <div style={sSub}>Crie uma senha forte pra proteger sua conta.</div>
          {error && <div className="alert alert-error">{error}</div>}
          <PasswordInput value={form.senha} onChange={e => set("senha", e.target.value)} placeholder="••••••••" inputStyle={sInput} />
          <RequisitosSenha senha={form.senha} />
          <div style={{ height: 12 }} />
          <PasswordInput value={form.confirmarSenha || ""} onChange={e => set("confirmarSenha", e.target.value)} placeholder="Confirme a senha" inputStyle={sInput} />
          {form.confirmarSenha && form.senha !== form.confirmarSenha && (
            <div style={{ color: "var(--red)", fontSize: 13, marginTop: 8 }}>As senhas não coincidem.</div>
          )}
        </div>
        <div style={sFooter}>
          <button style={senhaOk ? sContinuar : sContinuarDisabled}
            disabled={!senhaOk}
            onClick={avancar}>Continuar</button>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div style={sContainer}>
        <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
        <div style={sContent}>
          <div style={sBigTitle}>Seu WhatsApp</div>
          <div style={sSub}>Para contato sobre fretes e suporte.</div>
          {error && <div className="alert alert-error">{error}</div>}
          <input autoFocus type="tel" style={sInput} placeholder="(41) 99999-9999"
            value={form.telefone} onChange={e => set("telefone", e.target.value)}
            onKeyDown={e => e.key === "Enter" && form.telefone.trim() && avancar()} />
        </div>
        <div style={sFooter}>
          <button style={form.telefone.trim() ? sContinuar : sContinuarDisabled}
            disabled={!form.telefone.trim()}
            onClick={avancar}>Continuar</button>
        </div>
      </div>
    );
  }

  // ── CONTRATANTE: passos 5–8 ───────────────────────────────
  if (tipo === "contratante") {
    if (step === 5) {
      return (
        <div style={sContainer}>
          <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
          <div style={sContent}>
            <div style={sBigTitle}>CPF ou CNPJ</div>
            <div style={sSub}>Para emissão de documentos fiscais.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus style={sInput} placeholder="000.000.000-00 ou 00.000.000/0001-00"
              value={form.documento} onChange={e => set("documento", e.target.value)}
              onKeyDown={e => e.key === "Enter" && form.documento.trim() && avancar()} />
          </div>
          <div style={sFooter}>
            <button style={form.documento.trim() ? sContinuar : sContinuarDisabled}
              disabled={!form.documento.trim()} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div style={sContainer}>
          <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
          <div style={sContent}>
            <div style={sBigTitle}>Nome da empresa</div>
            <div style={sSub}>Opcional. Pule se preferir usar seu nome.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus style={sInput} placeholder="Empresa LTDA (opcional)"
              value={form.nomeEmpresa} onChange={e => set("nomeEmpresa", e.target.value)} />
          </div>
          <div style={sFooter}>
            <button style={sContinuar} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 7) {
      return (
        <div style={sContainer}>
          <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
          <div style={sContent}>
            <div style={sBigTitle}>Tipos de carga</div>
            <div style={sSub}>Selecione o que você costuma precisar transportar.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="carga-grid">
              {TIPOS_CARGA.map(c => (
                <div key={c.id} className={`carga-item ${form.tiposCarga.includes(c.id) ? "selected" : ""}`} onClick={() => toggleCarga(c.id)}>
                  <div className="ci-icon">{c.icon}</div>
                  <div className="ci-label">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={sFooter}>
            <button style={form.tiposCarga.length > 0 ? sContinuar : sContinuarDisabled}
              disabled={form.tiposCarga.length === 0} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 8) {
      return (
        <div style={sContainer}>
          <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
          <div style={sContent}>
            <div style={sBigTitle}>Termos de uso</div>
            <div style={sSub}>Leia e aceite para criar sua conta.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                Ao criar uma conta no TRUKER, você concorda com nossas{" "}
                <span style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }} onClick={() => setMostrarTermos(true)}>
                  Políticas de Uso e Privacidade
                </span>
                . Seus dados serão utilizados exclusivamente para intermediação de fretes.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={aceitouTermos} onChange={e => setAceitouTermos(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: "var(--gold)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.5 }}>
                Li e aceito os Termos de Uso e a Política de Privacidade da TRUKER.
              </span>
            </label>
          </div>
          <div style={sFooter}>
            <button style={aceitouTermos ? sContinuar : sContinuarDisabled}
              disabled={!aceitouTermos || loading}
              onClick={finalizar}>
              {loading ? "Criando conta..." : "Criar Conta"}
            </button>
          </div>
        </div>
      );
    }
  }

  // ── MOTORISTA: passos 5–12 ────────────────────────────────
  if (tipo === "motorista") {
    if (step === 5) {
      return (
        <div style={sContainer}>
          <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
          <div style={sContent}>
            <div style={sBigTitle}>Seu CPF</div>
            <div style={sSub}>Número de Cadastro de Pessoa Física.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus style={sInput} placeholder="000.000.000-00"
              value={form.documento} onChange={e => set("documento", e.target.value)}
              onKeyDown={e => e.key === "Enter" && form.documento.trim() && avancar()} />
          </div>
          <div style={sFooter}>
            <button style={form.documento.trim() ? sContinuar : sContinuarDisabled}
              disabled={!form.documento.trim()} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div style={sContainer}>
          <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
          <div style={sContent}>
            <div style={sBigTitle}>Número da CNH</div>
            <div style={sSub}>Carteira Nacional de Habilitação — 11 dígitos.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus style={sInput} placeholder="00000000000" inputMode="numeric"
              value={form.cnh} onChange={e => set("cnh", e.target.value.replace(/\D/g, "").slice(0, 11))}
              onKeyDown={e => e.key === "Enter" && form.cnh.trim() && avancar()} />
          </div>
          <div style={sFooter}>
            <button style={form.cnh.trim() ? sContinuar : sContinuarDisabled}
              disabled={!form.cnh.trim()} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 7) {
      return (
        <div style={sContainer}>
          <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
          <div style={sContent}>
            <div style={sBigTitle}>RNTRC (ANTT)</div>
            <div style={sSub}>Registro Nacional de Transportadores Rodoviários de Cargas.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus style={sInput} placeholder="00000000" inputMode="numeric"
              value={form.rntrc} onChange={e => set("rntrc", e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={e => e.key === "Enter" && form.rntrc.trim() && avancar()} />
            <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 10 }}>
              Encontre no site da ANTT ou no seu CIOT.
            </p>
          </div>
          <div style={sFooter}>
            <button style={form.rntrc.trim() ? sContinuar : sContinuarDisabled}
              disabled={!form.rntrc.trim()} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 8) {
      // Grupos de tipo de veículo (CHASSI — carroceria é escolhida depois, em
      // "Meu Caminhão", já que é lá que a composição veicular completa é montada)
      const grupos = [
        { label: "Leves",   items: ["furgao", "vuc", "toco"] },
        { label: "Médios",  items: ["truck"] },
        { label: "Pesados", items: ["carreta", "bitrem", "rodotrem"] },
      ];
      return (
        <div style={sContainer}>
          <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
          <div style={sContent}>
            <div style={sBigTitle}>Tipo de veículo</div>
            <div style={sSub}>Selecione o tipo do seu caminhão.</div>
            {error && <div className="alert alert-error">{error}</div>}
            {grupos.map(g => (
              <div key={g.label} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{g.label}</div>
                {g.items.map(id => {
                  const v = TIPOS_VEICULO.find(x => x.id === id);
                  if (!v) return null;
                  const sel = form.tipoVeiculo === id;
                  return (
                    <div key={id} onClick={() => set("tipoVeiculo", id)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", marginBottom: 6, borderRadius: 12, border: `2px solid ${sel ? "var(--gold)" : "var(--border)"}`, background: sel ? "rgba(201,168,76,0.08)" : "#fff", cursor: "pointer" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${sel ? "var(--gold)" : "var(--border)"}`, background: sel ? "var(--gold)" : "transparent", flexShrink: 0 }} />
                      <span style={{ fontSize: 20 }}>{v.icon}</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{v.label}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>até {v.cap} · {v.eixosPadrao} eixos (padrão)</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={sFooter}>
            <button style={form.tipoVeiculo ? sContinuar : sContinuarDisabled}
              disabled={!form.tipoVeiculo} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 9) {
      return (
        <div style={sContainer}>
          <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
          <div style={sContent}>
            <div style={sBigTitle}>Placa do veículo</div>
            <div style={sSub}>Placa do cavalo mecânico.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus style={sInput} placeholder="ABC-1234 ou ABC1D23"
              value={form.placa} onChange={e => set("placa", maskPlaca(e.target.value))}
              onKeyDown={e => e.key === "Enter" && form.placa.trim() && avancar()} />
          </div>
          <div style={sFooter}>
            <button style={form.placa.trim() ? sContinuar : sContinuarDisabled}
              disabled={!form.placa.trim()} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 10) {
      return (
        <div style={sContainer}>
          <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
          <div style={sContent}>
            <div style={sBigTitle}>Ano de fabricação</div>
            <div style={sSub}>Do cavalo mecânico.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus type="number" style={sInput} placeholder="Ex: 2018" inputMode="numeric"
              min="1980" max="2026"
              value={form.anoFab} onChange={e => set("anoFab", e.target.value)}
              onKeyDown={e => e.key === "Enter" && form.anoFab && avancar()} />
          </div>
          <div style={sFooter}>
            <button style={form.anoFab ? sContinuar : sContinuarDisabled}
              disabled={!form.anoFab} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 11) {
      return (
        <div style={sContainer}>
          <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
          <div style={sContent}>
            <div style={sBigTitle}>Tipos de carga</div>
            <div style={sSub}>Selecione tudo que seu veículo pode transportar.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="carga-grid">
              {TIPOS_CARGA.map(c => (
                <div key={c.id} className={`carga-item ${form.tiposCarga.includes(c.id) ? "selected" : ""}`} onClick={() => toggleCarga(c.id)}>
                  <div className="ci-icon">{c.icon}</div>
                  <div className="ci-label">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={sFooter}>
            <button style={form.tiposCarga.length > 0 ? sContinuar : sContinuarDisabled}
              disabled={form.tiposCarga.length === 0} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 12) {
      return (
        <div style={sContainer}>
          <Topo step={step} pct={pct} onNavigate={onNavigate} voltar={voltar} />
          <div style={sContent}>
            <div style={sBigTitle}>Termos de uso</div>
            <div style={sSub}>Leia e aceite para finalizar seu cadastro.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                Ao criar uma conta no TRUKER como motorista, você concorda com nossas{" "}
                <span style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }} onClick={() => setMostrarTermos(true)}>
                  Políticas de Uso e Privacidade
                </span>
                . Seus dados serão usados exclusivamente para intermediação de fretes.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={aceitouTermos} onChange={e => setAceitouTermos(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: "var(--gold)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.5 }}>
                Li e aceito os Termos de Uso e a Política de Privacidade da TRUKER.
              </span>
            </label>
          </div>
          <div style={sFooter}>
            <button style={aceitouTermos ? sContinuar : sContinuarDisabled}
              disabled={!aceitouTermos || loading}
              onClick={finalizar}>
              {loading ? "Criando conta..." : "Finalizar Cadastro"}
            </button>
          </div>
        </div>
      );
    }
  }

  // fallback
  return null;
}
