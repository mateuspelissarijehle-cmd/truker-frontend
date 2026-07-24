import { useState, useEffect, useRef } from "react";
import { CardPayment } from "@mercadopago/sdk-react";
import { MP_PUBLIC_KEY } from "./config";
import { api, apiUpload, abrirArquivoAutenticado } from "./services/api";
import { buscarEnderecoPorCep } from "./services/viaCep";
import { formatMoney, formatKm } from "./utils/format";
import { mascararDado, mascararEmail, maskCep, maskPlaca } from "./utils/mask";
import {
  TIPOS_CARGA, REGRAS_CARGA, regrasCarga, TIPOS_ANIMAL, TIPOS_MATERIAL,
  TIPOS_VEICULO, eixosPadraoDoChassi, ICONE_CARROCERIA, TIPOS_FRETE,
  CARGA_BACKEND_MAP, TIPOS_DESPESA,
} from "./data/catalogos";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { css } from "./styles/css";
import { StatusBadge } from "./components/StatusBadge";
import { Loading } from "./components/Loading";
import { PasswordInput } from "./components/PasswordInput";
import { TrukerLogo } from "./components/TrukerLogo";
import { BottomNavContratante } from "./components/BottomNavContratante";
import { BottomNavMotorista } from "./components/BottomNavMotorista";
import { OpcoesMenu } from "./components/OpcoesMenu";
import { CampoCidadeAutocomplete } from "./components/CampoCidadeAutocomplete";
import { HistoricoPrecoRota } from "./components/HistoricoPrecoRota";
import { MapaLeaflet } from "./components/MapaLeaflet";
import { useRedefinicaoSenha } from "./hooks/useRedefinicaoSenha";
import { useDespesasMotorista } from "./hooks/useDespesasMotorista";
import { SuporteScreen } from "./screens/shared/SuporteScreen";
import { SobreScreen } from "./screens/shared/SobreScreen";
import { PrivacidadeScreen } from "./screens/shared/PrivacidadeScreen";
import { AlterarSenhaScreen } from "./screens/shared/AlterarSenhaScreen";
import { NotificacoesScreen } from "./screens/shared/NotificacoesScreen";
import { TermosScreen } from "./screens/shared/TermosScreen";
import { SplashScreen } from "./screens/auth/SplashScreen";
import { EntradaScreen } from "./screens/auth/EntradaScreen";
import { LoginScreen } from "./screens/auth/LoginScreen";
import { EsqueciSenhaScreen } from "./screens/auth/EsqueciSenhaScreen";
import { AdminLoginScreen } from "./screens/admin/AdminLoginScreen";
import { AdminDashboard } from "./screens/admin/AdminDashboard";
import { AdminUsuarios } from "./screens/admin/AdminUsuarios";
import { AdminMotoristaTeste } from "./screens/admin/AdminMotoristaTeste";
import { AdminSeguradorasScreen } from "./screens/admin/AdminSeguradorasScreen";
import { AdminTrocarSenha } from "./screens/admin/AdminTrocarSenha";
import { ChatScreen } from "./screens/shared/ChatScreen";
import { AvaliarScreen } from "./screens/shared/AvaliarScreen";
import { OpcoesMotorista } from "./screens/motorista/OpcoesMotorista";
import { OpcoesContratante } from "./screens/contratante/OpcoesContratante";
import { ContratanteHome } from "./screens/contratante/ContratanteHome";
import { BuscarMotoristasScreen } from "./screens/contratante/BuscarMotoristasScreen";
import { MeusFretes } from "./screens/contratante/MeusFretes";
import { DetalheFrete } from "./screens/contratante/DetalheFrete";
import { PropostasRecebidasScreen } from "./screens/contratante/PropostasRecebidasScreen";
import { PerfilContratante } from "./screens/contratante/PerfilContratante";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// CADASTRO — fluxo passo a passo
// ─────────────────────────────────────────────
function CadastroScreen({ onNavigate, screenData }) {
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
      setPendingUser({ usuario: data.usuario, token: data.token, codigo_teste: data.codigo_teste || null });
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
      setReenviadoMsg("Novo código enviado!");
      if (resp.codigo_teste) setPendingUser(u => ({ ...u, codigo_teste: resp.codigo_teste }));
    } catch (e) { setReenviadoMsg("Erro ao reenviar."); }
    finally { setReenviando(false); }
  };

  // ── Estilos internos reutilizáveis ──────────────────────
  const sContainer = {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    background: "var(--surface)", padding: "0 0 40px",
  };
  const sHeader = {
    padding: "16px 20px 0",
  };
  const sProgressBar = {
    height: 4, background: "var(--border)", borderRadius: 2,
    margin: "12px 20px 0", overflow: "hidden",
  };
  const sProgressFill = {
    height: "100%", background: "var(--gold)", borderRadius: 2,
    width: `${pct}%`, transition: "width 0.3s ease",
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

  // helper para renderizar o topo (back + barra)
  const Topo = ({ showBar = true }) => (
    <div style={sHeader}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={step === 0 ? () => onNavigate("login") : voltar}
          style={{ background: "none", border: "none", fontSize: 22, color: "var(--text)", cursor: "pointer", padding: "4px 8px 4px 0" }}>
          ←
        </button>
        {showBar && (
          <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}>{pct}%</span>
        )}
      </div>
      {showBar && <div style={sProgressBar}><div style={sProgressFill} /></div>}
    </div>
  );

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
        <Topo />
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
        <Topo />
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
    const senhaOk = form.senha.length >= 6 && form.senha === (form.confirmarSenha || "");
    return (
      <div style={sContainer}>
        <Topo />
        <div style={sContent}>
          <div style={sBigTitle}>Crie uma senha</div>
          <div style={sSub}>Mínimo de 6 caracteres.</div>
          {error && <div className="alert alert-error">{error}</div>}
          <PasswordInput value={form.senha} onChange={e => set("senha", e.target.value)} placeholder="••••••••" inputStyle={sInput} />
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
        <Topo />
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
          <Topo />
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
          <Topo />
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
          <Topo />
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
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>Termos de uso</div>
            <div style={sSub}>Leia e aceite para criar sua conta.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                Ao criar uma conta no TRUKER, você concorda com nossas{" "}
                <span style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }} onClick={() => onNavigate("termos")}>
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
          <Topo />
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
          <Topo />
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
          <Topo />
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
          <Topo />
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
          <Topo />
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
          <Topo />
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
          <Topo />
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
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>Termos de uso</div>
            <div style={sSub}>Leia e aceite para finalizar seu cadastro.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                Ao criar uma conta no TRUKER como motorista, você concorda com nossas{" "}
                <span style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }} onClick={() => onNavigate("termos")}>
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

// ─────────────────────────────────────────────
// SOLICITAR FRETE
// ─────────────────────────────────────────────
function SolicitarFreteScreen({ onNavigate, screenData }) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const motoristaConvidadoId = screenData?.motoristaConvidadoId || null;
  const motoristaConvidadoNome = screenData?.motoristaConvidadoNome || null;
  const [form, setForm] = useState({
    tipoFrete: "interestadual", tipoCarga: "carga_seca", tipoVeiculo: "truck",
    numeroEixos: eixosPadraoDoChassi("truck"), carroceria: "",
    pesoKg: "", comprimentoM: "", larguraM: "", alturaM: "",
    descricao: "", precisaMunck: false, precisaEmpilhadeira: false,
    dataColeta: "", horario: "",
    // Campos especiais dinâmicos
    tipoAnimal: "", qtdAnimais: "", tipoMaterial: "",
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

  const FR = useRef(null);
  if (!FR.current) FR.current = {
    origemCep:{current:null}, origemLogradouro:{current:null}, origemNumero:{current:null},
    origemComplemento:{current:null}, origemBairro:{current:null},
    destCep:{current:null}, destLogradouro:{current:null}, destNumero:{current:null},
    destComplemento:{current:null}, destBairro:{current:null},
  };
  const rv = k => FR.current[k]?.current?.value?.trim() || "";

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
    if (!form.tipoVeiculo || !token) { setCarroceriasDisp([]); return; }
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
      if (FR.current[`${tipo}${f}`]?.current) FR.current[`${tipo}${f}`].current.value = val || "";
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
            <div className="card">
              <div className="card-title">Tipo de Frete</div>
              <div className="carga-grid">
                {TIPOS_FRETE.map(t => (
                  <div key={t.id} className={`carga-item ${form.tipoFrete === t.id ? "selected" : ""}`} onClick={() => set("tipoFrete", t.id)}>
                    <div className="ci-icon">{t.icon}</div><div className="ci-label">{t.label}</div><div className="ci-desc">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-title">📍 Endereço de Coleta</div>
              <div className="field"><label>CEP</label>
                <input ref={FR.current.origemCep} defaultValue={addr.origemCep} placeholder="00000-000"
                  onChange={e => { e.target.value = maskCep(e.target.value); if (e.target.value.replace(/\D/g,"").length===8) fillCep(e.target.value,"origem"); }} /></div>
              <div className="field"><label>Logradouro</label>
                <input ref={FR.current.origemLogradouro} defaultValue={addr.origemLogradouro} placeholder="Rua, Avenida, Rodovia..." /></div>
              <div className="grid-2">
                <div className="field"><label>Número</label><input ref={FR.current.origemNumero} defaultValue={addr.origemNumero} placeholder="123" /></div>
                <div className="field"><label>Complemento</label><input ref={FR.current.origemComplemento} defaultValue={addr.origemComplemento} placeholder="Galpão, Sala..." /></div>
              </div>
              <div className="field"><label>Bairro / Distrito</label>
                <input ref={FR.current.origemBairro} defaultValue={addr.origemBairro} placeholder="Bairro" /></div>
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
                <input ref={FR.current.destCep} defaultValue={addr.destCep} placeholder="00000-000"
                  onChange={e => { e.target.value = maskCep(e.target.value); if (e.target.value.replace(/\D/g,"").length===8) fillCep(e.target.value,"dest"); }} /></div>
              <div className="field"><label>Logradouro</label>
                <input ref={FR.current.destLogradouro} defaultValue={addr.destLogradouro} placeholder="Rua, Avenida, Rodovia..." /></div>
              <div className="grid-2">
                <div className="field"><label>Número</label><input ref={FR.current.destNumero} defaultValue={addr.destNumero} placeholder="123" /></div>
                <div className="field"><label>Complemento</label><input ref={FR.current.destComplemento} defaultValue={addr.destComplemento} placeholder="Galpão, Sala..." /></div>
              </div>
              <div className="field"><label>Bairro / Distrito</label>
                <input ref={FR.current.destBairro} defaultValue={addr.destBairro} placeholder="Bairro" /></div>
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
                {TIPOS_CARGA.map(c => (
                  <div key={c.id} className={`carga-item ${form.tipoCarga === c.id ? "selected" : ""}`} onClick={() => set("tipoCarga", c.id)}>
                    <div className="ci-icon">{c.icon}</div><div className="ci-label">{c.label}</div>
                  </div>
                ))}
              </div>
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

// ─────────────────────────────────────────────
// MOTORISTA HOME — ✅ toggle online chama API
// ─────────────────────────────────────────────
function MotoristaHome({ onNavigate }) {
  const { user, token } = useAuth();
  const [disponiveis, setDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(() => { try { return localStorage.getItem("truker_online") === "true"; } catch { return false; } });
  const [erroOnline, setErroOnline] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroPeso, setFiltroPeso] = useState("todos");
  const [buscaCidade, setBuscaCidade] = useState("");
  const [buscaCidadeDebounced, setBuscaCidadeDebounced] = useState("");
  const [kmVazio, setKmVazio] = useState(0);
  const [metaKmVazio, setMetaKmVazio] = useState(800);

  // Busca km vazio real do dia
  useEffect(() => {
    api("GET", "/api/motoristas/ganhos", null, token)
      .then(d => {
        setKmVazio(parseFloat(d.km_vazio_hoje || 0));
      })
      .catch(() => {});
  }, [token]);
  const [posicaoAtual, setPosicaoAtual] = useState(null);
  const [fretesAtivos, setFretesAtivos] = useState([]);
  const [propostasPendentes, setPropostasPendentes] = useState(0);
  const [convitesPendentes, setConvitesPendentes] = useState(0);
  const [temDisponibilidadeAtiva, setTemDisponibilidadeAtiva] = useState(false);
  const [seguroValido, setSeguroValido] = useState(true);
  const posicaoRef = useRef(null);

  // Verifica se há contrapropostas do contratante aguardando resposta do motorista
  useEffect(() => {
    api("GET", "/api/fretes/propostas/minhas", null, token)
      .then(lista => setPropostasPendentes(lista.filter(p => p.status === "pendente" && p.rodada === 2).length))
      .catch(() => {});
  }, [token]);

  // Verifica se há convites diretos de contratantes aguardando resposta
  useEffect(() => {
    api("GET", "/api/fretes/convidados", null, token)
      .then(lista => setConvitesPendentes(lista.length))
      .catch(() => {});
  }, [token]);

  // Verifica se já existe um anúncio de disponibilidade ativo (pra decidir se mostra o convite pra publicar)
  useEffect(() => {
    api("GET", "/api/motoristas/disponibilidade", null, token)
      .then(() => setTemDisponibilidadeAtiva(true))
      .catch(() => setTemDisponibilidadeAtiva(false));
  }, [token]);

  // Seguro é obrigatório pra aceitar fretes — avisa na Home se estiver faltando/vencido
  useEffect(() => {
    api("GET", "/api/motoristas/seguro", null, token)
      .then(s => setSeguroValido(!!s.valido))
      .catch(() => {});
  }, [token]);

  // GPS para mostrar no mapa
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosicaoAtual(coords);
        posicaoRef.current = coords;
      },
      err => console.error("GPS home:", err),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Envia posição para o backend a cada 30s para todos os fretes ativos
  useEffect(() => {
    if (fretesAtivos.length === 0 || !token) return;
    const interval = setInterval(async () => {
      if (!posicaoRef.current) return;
      try {
        for (const f of fretesAtivos) {
          await api("PATCH", "/api/motoristas/localizacao", {
            lat: posicaoRef.current.lat,
            lng: posicaoRef.current.lng,
            freteId: f.id,
          }, token);
        }
      } catch (e) { console.error("GPS send home:", e.message); }
    }, 30000);
    return () => clearInterval(interval);
  }, [fretesAtivos.length, token]);

  // Debounce da busca por cidade antes de consultar o backend
  useEffect(() => {
    const t = setTimeout(() => setBuscaCidadeDebounced(buscaCidade.trim()), 400);
    return () => clearTimeout(t);
  }, [buscaCidade]);

  // Carrega fretes disponíveis quando fica online ou quando a busca por cidade muda
  useEffect(() => {
    if (!online) { setDisponiveis([]); setLoading(false); return; }
    setLoading(true);
    const qs = buscaCidadeDebounced ? `?busca_origem_cidade=${encodeURIComponent(buscaCidadeDebounced)}` : "";
    api("GET", `/api/fretes/disponiveis${qs}`, null, token)
      .then(setDisponiveis).catch(() => setDisponiveis([])).finally(() => setLoading(false));
  }, [online, buscaCidadeDebounced]);

  // Carrega fretes ativos do motorista (aceito/coletando/em_rota)
  useEffect(() => {
    api("GET", "/api/fretes", null, token)
      .then(todos => setFretesAtivos(todos.filter(f => ["aceito", "coletando", "em_rota"].includes(f.status))))
      .catch(() => setFretesAtivos([]));
  }, [token]);

  // ✅ Toggle online/offline — atualiza no banco, com rollback se falhar
  const toggleOnline = async (val) => {
    const anterior = online;
    setOnline(val);
    localStorage.setItem("truker_online", val ? "true" : "false");
    setErroOnline("");
    try {
      await api("PATCH", "/api/motoristas/online", { online: val }, token);
    } catch (e) {
      setOnline(anterior);
      localStorage.setItem("truker_online", anterior ? "true" : "false");
      setErroOnline("Não foi possível atualizar seu status. Tente novamente.");
      console.error("Erro ao atualizar status online:", e.message);
    }
  };

  const pctMeta = Math.min(100, Math.round((kmVazio / metaKmVazio) * 100));

  const filtrados = disponiveis.filter(f => {
    if (filtroTipo !== "todos" && f.tipo_frete !== filtroTipo) return false;
    const peso = f.peso_tons || 0;
    if (filtroPeso === "leve" && peso > 3) return false;
    if (filtroPeso === "medio" && (peso < 3 || peso > 14)) return false;
    if (filtroPeso === "pesado" && peso < 14) return false;
    return true;
  });

  const marcadoresFretes = disponiveis
    .filter(f => f.origem_lat && f.origem_lng)
    .map(f => ({ lat: parseFloat(f.origem_lat), lng: parseFloat(f.origem_lng), label: f.origem_cidade || "Frete" }));

  // Rotas otimizadas: ordenar por proximidade do motorista (greedy)
  const rotasAtivas = [...fretesAtivos]
    .filter(f => f.origem_lat && (f.dest_lat || f.destino_lat))
    .sort((a, b) => {
      if (!posicaoAtual) return 0;
      const dA = Math.pow(parseFloat(a.origem_lat) - posicaoAtual.lat, 2) + Math.pow(parseFloat(a.origem_lng) - posicaoAtual.lng, 2);
      const dB = Math.pow(parseFloat(b.origem_lat) - posicaoAtual.lat, 2) + Math.pow(parseFloat(b.origem_lng) - posicaoAtual.lng, 2);
      return dA - dB;
    })
    .map(f => ({
      origem: { lat: parseFloat(f.origem_lat), lng: parseFloat(f.origem_lng), label: f.origem_cidade || "Coleta" },
      destino: { lat: parseFloat(f.dest_lat || f.destino_lat), lng: parseFloat(f.dest_lng || f.destino_lng), label: f.dest_cidade || f.destino_cidade || "Entrega" },
    }));

  return (
    <div className="screen">
      <div className="header">
        <div>
          <div style={{ fontSize: 11, color: "var(--text2)", display: "flex", alignItems: "center" }}>
            <span className={online ? "online-dot" : "offline-dot"} />
            {online ? "Online — aceitando fretes" : "Offline"}
          </div>
          <h1>{user?.nome?.split(" ")[0] || "Motorista"}</h1>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <label className="toggle">
            <input type="checkbox" checked={online} onChange={e => toggleOnline(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
          <span style={{ fontSize: 22, cursor: "pointer" }} onClick={() => onNavigate("perfil-motorista")}>👤</span>
        </div>
      </div>
      <div className="content">
        {erroOnline && <div className="alert alert-error" style={{ marginBottom: 14 }}>{erroOnline}</div>}
        {!seguroValido && (
          <div className="card" style={{ borderColor: "var(--red)", borderWidth: 2, cursor: "pointer", marginBottom: 14 }} onClick={() => onNavigate("seguro-motorista")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🛡️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Registre seu seguro pra poder aceitar fretes</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>Toque para regularizar</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          </div>
        )}
        {propostasPendentes > 0 && (
          <div className="card" style={{ borderColor: "var(--gold)", borderWidth: 2, cursor: "pointer", marginBottom: 14 }} onClick={() => onNavigate("minhas-propostas")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>📨</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Você tem {propostasPendentes} contraproposta{propostasPendentes > 1 ? "s" : ""} para responder</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>Toque para ver e decidir</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          </div>
        )}
        {convitesPendentes > 0 && (
          <div className="card" style={{ borderColor: "var(--gold)", borderWidth: 2, cursor: "pointer", marginBottom: 14 }} onClick={() => onNavigate("convites-motorista")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🎯</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Você tem {convitesPendentes} convite{convitesPendentes > 1 ? "s" : ""} direto{convitesPendentes > 1 ? "s" : ""} de contratante{convitesPendentes > 1 ? "s" : ""}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>Toque para ver e decidir</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          </div>
        )}
        {fretesAtivos.length === 0 && !temDisponibilidadeAtiva && (
          <div className="card" style={{ cursor: "pointer", marginBottom: 14 }} onClick={() => onNavigate("disponibilidade-motorista")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>📢</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Sem frete agora? Anuncie sua disponibilidade</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>Contratantes da sua região podem te convidar direto</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          </div>
        )}
        <div className="km-vazio-bar">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>📊 KM VAZIO HOJE</span>
            <span style={{ fontSize: 11, color: "var(--text2)" }}>Meta: {formatKm(metaKmVazio)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: pctMeta > 100 ? "var(--red)" : pctMeta > 75 ? "var(--orange)" : "var(--green)" }}>{formatKm(kmVazio)}</span>
            <span style={{ fontSize: 12, color: "var(--text2)" }}>({pctMeta}% da meta)</span>
          </div>
          <div className="progress-bar">
            <div className={`progress-fill ${pctMeta > 100 ? "red" : pctMeta > 75 ? "" : "green"}`} style={{ width: `${Math.min(pctMeta, 100)}%` }} />
          </div>
        </div>

        <MapaLeaflet
          key={`home-map-${rotasAtivas.length}-${posicaoAtual ? 1 : 0}`}
          lat={posicaoAtual?.lat}
          lng={posicaoAtual?.lng}
          height={rotasAtivas.length > 0 ? 220 : 180}
          marcadores={rotasAtivas.length === 0 ? marcadoresFretes : []}
          rotas={rotasAtivas}
        />

        {fretesAtivos.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
              🚛 Fretes em andamento ({fretesAtivos.length})
            </div>
            {fretesAtivos.map((f, idx) => {
              const cores = ["#C9A84C", "#2D7A3A", "#2563EB", "#9333EA", "#EF4444"];
              const cor = cores[idx % cores.length];
              return (
                <div key={f.id} style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `2px solid ${cor}`, cursor: "pointer" }}
                  onClick={() => onNavigate("em-transito", f)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: cor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{idx + 1}</div>
                      <StatusBadge status={f.status} />
                    </div>
                    <span style={{ color: "var(--green)", fontWeight: 800, fontSize: 14 }}>{formatMoney(f.valor_motorista || 0)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>📏 {f.distancia_km} km · 📦 {f.tipo_carga}</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <CampoCidadeAutocomplete
            label={null}
            value={buscaCidade}
            onChange={setBuscaCidade}
            onSelecionar={({ cidade }) => setBuscaCidade(cidade)}
            placeholder="🔍 Buscar por cidade de origem"
            inputStyle={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "Inter, sans-serif" }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>Tipo de frete</div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {[["todos", "Todos"], ["urbano", "🏙️ Urbano"], ["intermunicipal", "🛣️ Intermunic."], ["interestadual", "🗺️ Interestadual"]].map(([id, label]) => (
              <button key={id} onClick={() => setFiltroTipo(id)} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid", borderColor: filtroTipo === id ? "var(--orange)" : "var(--border)", background: filtroTipo === id ? "var(--orange)" : "var(--dark3)", color: filtroTipo === id ? "#fff" : "var(--text3)", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "Inter, sans-serif" }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>Peso da carga</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["todos", "Todos"], ["leve", "Até 3t"], ["medio", "3–14t"], ["pesado", "+14t"]].map(([id, label]) => (
              <button key={id} onClick={() => setFiltroPeso(id)} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid", borderColor: filtroPeso === id ? "var(--orange)" : "var(--border)", background: filtroPeso === id ? "var(--orange)" : "var(--dark3)", color: filtroPeso === id ? "#fff" : "var(--text3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
          {online ? `${filtrados.length || disponiveis.length} Fretes Disponíveis` : "Você está offline"}
        </div>

        {!online && (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text2)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>😴</div>
            <p style={{ fontWeight: 600 }}>Você está offline</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Ative o toggle para receber fretes</p>
          </div>
        )}

        {online && loading && <Loading />}

        {online && !loading && (disponiveis.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text2)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <p style={{ fontWeight: 600 }}>Nenhum frete disponível</p>
            <p style={{ fontSize: 13, marginTop: 4, color: "#444" }}>Novos fretes aparecem aqui automaticamente</p>
          </div>
        ) : (filtrados.length > 0 ? filtrados : disponiveis).map(f => {
          const cargaObj = TIPOS_CARGA.find(c => c.id === f.tipo_carga);
          return (
            <div key={f.id} className="uber-card" onClick={() => onNavigate("aceitar-frete", f)} style={f.prioridade_rota ? { borderColor: "var(--gold)" } : undefined}>
              <div className="uber-card-header">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="tag-chip">{cargaObj?.icon || "📦"} {cargaObj?.label || f.tipo_carga}</span>
                    <span className="tag-chip">📏 {f.distancia_km} km</span>
                    {f.prioridade_rota && <span className="tag-chip">📍 Perto da sua última entrega</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>⚖️ {f.peso_tons}t · 🚛 {f.tipo_veiculo}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="price">{formatMoney(f.valor_motorista || 0)}</div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>motorista</div>
                  {f.valorLiquidoEstimado != null && (
                    <div style={{ fontSize: 11, color: f.valorLiquidoEstimado >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700, marginTop: 2 }}>
                      ≈ {formatMoney(f.valorLiquidoEstimado)} líquido
                    </div>
                  )}
                </div>
              </div>
              <div className="uber-card-footer">
                <span style={{ fontSize: 12, color: "var(--text2)" }}>📍 {f.distancia_motorista_km || "?"} km de você</span>
                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); onNavigate("aceitar-frete", f); }}>Ver frete</button>
              </div>
            </div>
          );
        }))}
      </div>
      <BottomNavMotorista active="inicio" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// DISPONIBILIDADE (Motorista — proposta inversa)
// ─────────────────────────────────────────────
function DisponibilidadeScreen({ onNavigate }) {
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

// ─────────────────────────────────────────────
// SEGURO DE FRETE (Motorista — obrigatório pra aceitar fretes)
// ─────────────────────────────────────────────
function SeguroScreen({ onNavigate }) {
  const { token } = useAuth();
  const [seguro, setSeguro] = useState(null);
  const [seguradoras, setSeguradoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ modo: "parceira", seguradoraId: "", avulsoNome: "", avulsoApolice: "", validade: "" });

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api("GET", "/api/motoristas/seguro", null, token),
      api("GET", "/api/seguradoras", null, token).catch(() => []),
    ]).then(([s, segs]) => {
      setSeguro(s);
      setSeguradoras(segs);
      setEditando(false);
      if (!segs.length) setForm(f => ({ ...f, modo: "avulso" }));
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const iniciarEdicao = () => {
    if (seguro) {
      setForm({
        modo: seguro.seguro_seguradora_id ? "parceira" : "avulso",
        seguradoraId: seguro.seguro_seguradora_id || "",
        avulsoNome: seguro.seguro_avulso_nome || "",
        avulsoApolice: seguro.seguro_avulso_apolice || "",
        validade: seguro.seguro_validade ? String(seguro.seguro_validade).slice(0, 10) : "",
      });
    }
    setEditando(true);
  };

  const salvar = async () => {
    if (!form.validade) return setError("Informe a validade do seguro");
    if (form.modo === "parceira" && !form.seguradoraId) return setError("Escolha uma seguradora parceira");
    if (form.modo === "avulso" && (!form.avulsoNome.trim() || !form.avulsoApolice.trim())) return setError("Informe nome e número da apólice");
    setError(""); setSalvando(true);
    try {
      await api("PUT", "/api/motoristas/seguro", {
        ...(form.modo === "parceira"
          ? { seguradoraId: form.seguradoraId }
          : { seguroAvulsoNome: form.avulsoNome.trim(), seguroAvulsoApolice: form.avulsoApolice.trim() }),
        seguroValidade: form.validade,
      }, token);
      carregar();
    } catch (e) { setError(e.message); }
    finally { setSalvando(false); }
  };

  const mostrarForm = !seguro?.valido || editando;
  const semParceiras = seguradoras.length === 0;

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Seguro</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Loading /> : (
          <>
            {seguro?.valido && !editando && (
              <div className="card" style={{ borderColor: "rgba(45,122,58,0.3)" }}>
                <div className="card-title">✅ Seguro válido</div>
                <div className="info-row"><span className="info-label">Seguradora</span><span className="info-value">{seguro.seguro_seguradora_id ? seguro.seguradora_nome : seguro.seguro_avulso_nome}</span></div>
                {!seguro.seguro_seguradora_id && (
                  <div className="info-row"><span className="info-label">Apólice</span><span className="info-value">{seguro.seguro_avulso_apolice}</span></div>
                )}
                <div className="info-row"><span className="info-label">Validade</span><span className="info-value">{String(seguro.seguro_validade).slice(0, 10).split("-").reverse().join("/")}</span></div>
                <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={iniciarEdicao}>✏️ Atualizar</button>
              </div>
            )}

            {!seguro?.valido && !editando && (
              <div className="alert alert-error" style={{ marginBottom: 14 }}>
                ⚠️ {seguro?.seguro_validade ? "Seu seguro venceu." : "Você ainda não tem um seguro registrado."} Você não pode aceitar fretes até registrar um seguro válido.
              </div>
            )}

            {mostrarForm && (
              <div className="card">
                <div className="card-title">Registrar seguro</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {[["parceira", "Seguradora parceira"], ["avulso", "Seguro avulso"]].map(([id, label]) => (
                    <button key={id} onClick={() => setForm(f => ({ ...f, modo: id }))}
                      style={{ padding: "8px 14px", borderRadius: 20, border: "1px solid", borderColor: form.modo === id ? "var(--gold)" : "var(--border)", background: form.modo === id ? "var(--gold)" : "var(--surface)", color: form.modo === id ? "#fff" : "var(--text3)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {label}
                    </button>
                  ))}
                </div>

                {form.modo === "parceira" && (
                  semParceiras ? (
                    <div className="alert alert-info" style={{ marginBottom: 14 }}>
                      Nenhuma seguradora parceira cadastrada ainda — use seguro avulso por enquanto.
                    </div>
                  ) : (
                    <div className="field">
                      <label>Seguradora</label>
                      <select value={form.seguradoraId} onChange={e => setForm(f => ({ ...f, seguradoraId: e.target.value }))}>
                        <option value="">Selecione...</option>
                        {seguradoras.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                    </div>
                  )
                )}

                {form.modo === "avulso" && (
                  <>
                    <div className="field"><label>Nome da seguradora</label><input value={form.avulsoNome} onChange={e => setForm(f => ({ ...f, avulsoNome: e.target.value }))} placeholder="Ex: Porto Seguro" /></div>
                    <div className="field"><label>Número da apólice</label><input value={form.avulsoApolice} onChange={e => setForm(f => ({ ...f, avulsoApolice: e.target.value }))} placeholder="Ex: 123456789" /></div>
                  </>
                )}

                {!(form.modo === "parceira" && semParceiras) && (
                  <div className="field"><label>Validade</label><input type="date" value={form.validade} onChange={e => setForm(f => ({ ...f, validade: e.target.value }))} /></div>
                )}

                <button className="btn btn-primary" onClick={salvar} disabled={salvando || (form.modo === "parceira" && semParceiras)} style={{ marginTop: 4 }}>
                  {salvando ? "Salvando..." : "Registrar Seguro"}
                </button>
                {editando && <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => setEditando(false)}>Cancelar edição</button>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONVITES (Motorista — proposta inversa)
// ─────────────────────────────────────────────
function ConvitesScreen({ onNavigate }) {
  const { token } = useAuth();
  const [convites, setConvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("GET", "/api/fretes/convidados", null, token)
      .then(setConvites).catch(() => setConvites([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Convites</h1></div>
      <div className="content">
        {loading ? <Loading /> : convites.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
            <p style={{ fontWeight: 600 }}>Nenhum convite no momento</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Publique sua disponibilidade pra contratantes te encontrarem</p>
          </div>
        ) : convites.map(f => {
          const cargaObj = TIPOS_CARGA.find(c => c.id === f.tipo_carga);
          const expiraTexto = f.negociando_expira_em
            ? `expira ${new Date(f.negociando_expira_em).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
            : "";
          return (
            <div key={f.id} className="uber-card" onClick={() => onNavigate("aceitar-frete", f)} style={{ borderColor: "var(--gold)" }}>
              <div className="uber-card-header">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="tag-chip">🎯 Convite de {f.contratante_nome}</span>
                    <span className="tag-chip">{cargaObj?.icon || "📦"} {cargaObj?.label || f.tipo_carga}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>📏 {f.distancia_km} km · ⚖️ {f.peso_tons}t</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="price">{formatMoney(f.valor_motorista || 0)}</div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>motorista</div>
                </div>
              </div>
              <div className="uber-card-footer">
                <span style={{ fontSize: 12, color: "var(--text2)" }}>⏳ {expiraTexto}</span>
                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); onNavigate("aceitar-frete", f); }}>Ver e decidir</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ACEITAR FRETE
// ─────────────────────────────────────────────
function AceitarFreteScreen({ frete, onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [propondoValor, setPropondoValor] = useState(false);
  const [valorProposta, setValorProposta] = useState("");
  const [propostaEnviada, setPropostaEnviada] = useState(false);
  if (!frete) return <Loading />;
  const cargaObj = TIPOS_CARGA.find(c => c.id === frete.tipo_carga);

  const capturarGPS = async () => {
    let lat = null, lng = null;
    if (navigator.geolocation) {
      try {
        // A opção `timeout` do getCurrentPosition é só um pedido pro navegador —
        // em alguns WebViews/Android com localização do aparelho desligada, nem
        // sucesso nem erro nunca chega, e a promise fica pendurada pra sempre.
        // Por isso um timeout nosso por fora, redundante mas garantido.
        const pos = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("GPS timeout")), 6000);
          navigator.geolocation.getCurrentPosition(
            (p) => { clearTimeout(timer); resolve(p); },
            (err) => { clearTimeout(timer); reject(err); },
            { timeout: 5000, enableHighAccuracy: true }
          );
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {} // GPS indisponível — segue sem lat/lng
    }
    return { lat, lng };
  };

  const aceitar = async () => {
    setLoading(true); setError("");
    try {
      const { lat, lng } = await capturarGPS();
      await api("PATCH", `/api/fretes/${frete.id}/aceitar`, { lat, lng }, token);
      onNavigate("home-motorista");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const enviarProposta = async () => {
    const valor = parseFloat(String(valorProposta).replace(",", "."));
    if (!valor || valor <= 0) return setError("Informe um valor válido");
    setLoading(true); setError("");
    try {
      const { lat, lng } = await capturarGPS();
      await api("POST", `/api/fretes/${frete.id}/propor`, { valorProposto: valor, lat, lng }, token);
      setPropostaEnviada(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (propostaEnviada) {
    return (
      <div className="screen">
        <div className="header"><button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button><h1>Proposta Enviada</h1></div>
        <div className="content">
          <div className="alert alert-success">✅ Sua proposta de {formatMoney(parseFloat(String(valorProposta).replace(",", ".")))} foi enviada ao contratante.</div>
          <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>
            Acompanhe a resposta em <strong>Minhas Propostas</strong>. O contratante pode aceitar, recusar ou enviar uma contraproposta.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate("minhas-propostas")}>Ver Minhas Propostas</button>
          <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => onNavigate("home-motorista")}>Voltar ao início</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button><h1>Aceitar Frete</h1></div>
      <div className="content">
        {error && (
          <div className="alert alert-error">
            {error}
            {error.includes("seguro de frete registrado") && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => onNavigate("seguro-motorista")}>🛡️ Registrar Seguro</button>
            )}
          </div>
        )}
        <div style={{ textAlign: "center", padding: "16px 0 24px" }}>
          <div className="price" style={{ fontSize: 42 }}>{formatMoney(frete.valor_motorista || 0)}</div>
          <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>Seu valor como motorista (valor publicado)</div>
        </div>
        <div className="card">
          <div className="map-placeholder">
            <div style={{ fontSize: 28 }}>🗺️</div>
            <span style={{ fontWeight: 700 }}>{frete.origem_cidade || "—"} → {frete.dest_cidade || "—"}</span>
          </div>
          <div className="info-row"><span className="info-label">Distância</span><span className="info-value">{frete.distancia_km} km</span></div>
          <div className="info-row"><span className="info-label">Tipo de carga</span><span className="info-value">{cargaObj?.icon} {cargaObj?.label || frete.tipo_carga}</span></div>
          <div className="info-row"><span className="info-label">Peso</span><span className="info-value">{frete.peso_tons}t</span></div>
          <div className="info-row"><span className="info-label">Veículo necessário</span><span className="info-value">{TIPOS_VEICULO.find(v => v.id === frete.tipo_veiculo)?.label || frete.tipo_veiculo}{frete.numero_eixos ? ` · ${frete.numero_eixos} eixos` : ""}</span></div>
          {frete.carroceria && <div className="info-row"><span className="info-label">Carroceria desejada</span><span className="info-value">{ICONE_CARROCERIA[frete.carroceria] || ""} {frete.carroceria}</span></div>}
        </div>

        <HistoricoPrecoRota
          origemCidade={frete.origem_cidade} origemUf={frete.origem_estado}
          destCidade={frete.dest_cidade} destUf={frete.dest_estado}
          tipoVeiculo={frete.tipo_veiculo} tipoCarga={frete.tipo_carga} numeroEixos={frete.numero_eixos}
          mostrarPiso={false}
        />

        {(() => {
          const d = frete.detalhes_carga;
          if (!d || (typeof d === "object" && Object.keys(d).length === 0)) return null;
          const det = typeof d === "string" ? (() => { try { return JSON.parse(d); } catch { return {}; } })() : d;
          const temDim = det.dimensoes && (det.dimensoes.comprimentoM || det.dimensoes.larguraM || det.dimensoes.alturaM);
          const temAlgo = det.descricao || temDim || det.animal || det.material || (det.itens && det.itens.length);
          if (!temAlgo) return null;
          return (
            <div className="card">
              <div className="card-title">📋 Detalhes da Carga</div>
              {det.animal && (
                <div className="info-row"><span className="info-label">🐄 Animal</span><span className="info-value">{det.animal.tipo}{det.animal.quantidade ? ` · ${det.animal.quantidade} cabeças` : ""}</span></div>
              )}
              {det.material && (
                <div className="info-row"><span className="info-label">🧱 Material</span><span className="info-value">{det.material}</span></div>
              )}
              {temDim && (
                <div className="info-row"><span className="info-label">📏 Dimensões</span><span className="info-value">{[det.dimensoes.comprimentoM && `${det.dimensoes.comprimentoM}m C`, det.dimensoes.larguraM && `${det.dimensoes.larguraM}m L`, det.dimensoes.alturaM && `${det.dimensoes.alturaM}m A`].filter(Boolean).join(" × ")}</span></div>
              )}
              {det.itens && det.itens.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div className="info-label" style={{ marginBottom: 6 }}>📦 Itens da mudança</div>
                  {det.itens.map((it, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--text2)", padding: "2px 0" }}>• {it.nome}{it.qtd ? ` (${it.qtd})` : ""}</div>
                  ))}
                </div>
              )}
              {det.descricao && (
                <div style={{ marginTop: 8 }}>
                  <div className="info-label" style={{ marginBottom: 4 }}>Observações</div>
                  <div style={{ fontSize: 13, color: "var(--text2)" }}>{det.descricao}</div>
                </div>
              )}
            </div>
          );
        })()}

        {frete.custosEstimados && (
          <div className="card">
            <div className="card-title">💰 Estimativa antes de decidir</div>
            <div className="info-row"><span className="info-label">⛽ Combustível estimado</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(frete.custosEstimados.combustivel)}</span></div>
            <div className="info-row"><span className="info-label">🔧 Desgaste estimado</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(frete.custosEstimados.desgaste)}</span></div>
            <div className="divider" />
            <div className="info-row">
              <span className="info-label" style={{ fontWeight: 700 }}>Líquido estimado (valor publicado)</span>
              <span className="info-value" style={{ color: frete.valorLiquidoEstimado >= 0 ? "var(--green)" : "var(--red)", fontWeight: 800, fontSize: 16 }}>
                {formatMoney(frete.valorLiquidoEstimado)}
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
              Combustível e desgaste calculados com base nos coeficientes oficiais da ANTT para o veículo do seu perfil. Pedágio, alimentação e pernoite não estão incluídos aqui — você lança o valor real durante a viagem.
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {frete.precisa_munck && <span className="tag-chip">🏗️ Precisa Munck</span>}
          {frete.precisa_empilhadeira && <span className="tag-chip">🏭 Empilhadeira no pátio</span>}
        </div>

        {!propondoValor && (
          <>
            <button className="btn btn-primary" onClick={aceitar} disabled={loading} style={{ marginBottom: 10 }}>{loading ? "Aceitando..." : "✅ Aceitar pelo valor publicado"}</button>
            <button className="btn btn-secondary" onClick={() => setPropondoValor(true)} style={{ marginBottom: 10 }}>💬 Propor outro valor</button>
            <button className="btn btn-secondary" onClick={() => onNavigate("home-motorista")}>Voltar</button>
          </>
        )}

        {propondoValor && (
          <div className="card">
            <div className="card-title">Sua proposta de valor</div>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>
              O valor publicado para você é {formatMoney(frete.valor_motorista || 0)}. Proponha o valor que você gostaria de receber (sujeito ao piso mínimo ANTT).
            </p>
            <div className="field">
              <label>Valor proposto (o que você vai receber, R$)</label>
              <input type="number" step="0.01" placeholder={String(frete.valor_motorista || "")} value={valorProposta} onChange={e => setValorProposta(e.target.value)} />
            </div>
            {frete.totalCustosEstimados != null && valorProposta && !isNaN(parseFloat(String(valorProposta).replace(",", "."))) && (() => {
              const seuTake = parseFloat(String(valorProposta).replace(",", "."));
              const liquidoProposta = seuTake - frete.totalCustosEstimados;
              return (
                <div className="alert alert-info" style={{ fontSize: 12 }}>
                  Se aceito: você recebe {formatMoney(seuTake)} − {formatMoney(frete.totalCustosEstimados)} (combustível+desgaste) = <strong>{formatMoney(liquidoProposta)} líquido estimado</strong>
                </div>
              );
            })()}
            <button className="btn btn-primary" onClick={enviarProposta} disabled={loading} style={{ marginBottom: 10 }}>{loading ? "Enviando..." : "📨 Enviar Proposta"}</button>
            <button className="btn btn-secondary" onClick={() => setPropondoValor(false)}>Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MINHAS PROPOSTAS (Motorista)
// ─────────────────────────────────────────────
function MinhasPropostasScreen({ onNavigate }) {
  const { token } = useAuth();
  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [acao, setAcao] = useState(null);

  const carregar = () => {
    setLoading(true);
    api("GET", "/api/fretes/propostas/minhas", null, token)
      .then(setPropostas)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const aceitar = async (propostaId) => {
    setAcao(propostaId); setError(""); setMsg("");
    try {
      await api("PATCH", `/api/fretes/propostas/${propostaId}/aceitar`, null, token);
      setMsg("✅ Contraproposta aceita! O frete foi atribuído a você.");
      setTimeout(() => onNavigate("home-motorista"), 1500);
    } catch (e) { setError(e.message); }
    finally { setAcao(null); }
  };

  const recusar = async (propostaId) => {
    setAcao(propostaId); setError(""); setMsg("");
    try {
      await api("PATCH", `/api/fretes/propostas/${propostaId}/recusar`, null, token);
      setMsg("Contraproposta recusada.");
      carregar();
    } catch (e) { setError(e.message); }
    finally { setAcao(null); }
  };

  const StatusProposta = ({ p }) => {
    const map = {
      pendente: p.rodada === 2 ? ["badge-pending", "Contraproposta recebida"] : ["badge-active", "Aguardando contratante"],
      aceita:   ["badge-done", "Aceita"],
      recusada: ["badge-cancel", "Recusada"],
      expirada: ["", "Encerrada"],
    };
    const [cls, label] = map[p.status] || ["", p.status];
    return <span className={`badge ${cls}`} style={!cls ? { background: "var(--surface2)", color: "var(--text3)", border: "1px solid var(--border)" } : {}}>{label}</span>;
  };

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button>
        <h1>Minhas Propostas</h1>
      </div>
      <div className="content">
        {error && (
          <div className="alert alert-error">
            {error}
            {error.includes("seguro de frete registrado") && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => onNavigate("seguro-motorista")}>🛡️ Registrar Seguro</button>
            )}
          </div>
        )}
        {msg && <div className="alert alert-success">{msg}</div>}

        {loading && <Loading />}

        {!loading && propostas.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text2)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📨</div>
            <p style={{ fontWeight: 600 }}>Nenhuma proposta enviada ainda</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Proponha valores nos fretes disponíveis para negociar com contratantes</p>
          </div>
        )}

        {!loading && propostas.map(p => (
          <div key={p.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.origem_cidade} → {p.dest_cidade}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>Contratante: {p.contratante_nome}</div>
              </div>
              <StatusProposta p={p} />
            </div>

            <div className="divider" />

            <div className="info-row">
              <span className="info-label">Sua proposta</span>
              <span className="info-value">{formatMoney(p.valor_motorista)}</span>
            </div>
            {p.valor_contratante && (
              <div className="info-row">
                <span className="info-label">Contraproposta do contratante</span>
                <span className="info-value price" style={{ fontSize: 18 }}>{formatMoney(p.valor_contratante)}</span>
              </div>
            )}

            {p.status === "pendente" && p.rodada === 2 && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => aceitar(p.id)} disabled={acao === p.id}>✅ Aceitar</button>
                <button className="btn btn-danger btn-sm" onClick={() => recusar(p.id)} disabled={acao === p.id}>✕ Recusar</button>
              </div>
            )}

            {p.status === "pendente" && p.rodada === 1 && (
              <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>Aguardando resposta do contratante...</p>
            )}
          </div>
        ))}
      </div>
      <BottomNavMotorista active="inicio" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// MEUS FRETES MOTORISTA
// ─────────────────────────────────────────────
function MeusFretesMot({ onNavigate }) {
  const { token } = useAuth();
  const [fretes, setFretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [contratoLoadingId, setContratoLoadingId] = useState(null);
  const [contratoError, setContratoError] = useState("");

  useEffect(() => {
    api("GET", "/api/fretes", null, token).then(setFretes).catch(() => setFretes([])).finally(() => setLoading(false));
  }, []);

  const verContrato = async (freteId) => {
    setContratoLoadingId(freteId); setContratoError("");
    try { await abrirArquivoAutenticado(`/api/fretes/${freteId}/contrato`, token); }
    catch (e) { setContratoError(e.message); }
    finally { setContratoLoadingId(null); }
  };

  const filtrados = filtro === "todos" ? fretes : fretes.filter(f => {
    if (filtro === "andamento") return ["aceito", "em_rota", "coletando"].includes(f.status);
    if (filtro === "concluido") return f.status === "entregue";
    return true;
  });

  const totalGanho = fretes.filter(f => f.status === "entregue").reduce((a, f) => a + Number(f.valor_motorista || 0), 0);

  return (
    <div className="screen">
      <div className="header"><h1>Meus Fretes</h1></div>
      <div className="content">
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div className="stat-card">
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total fretes</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{fretes.length}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total ganho</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--green)" }}>{formatMoney(totalGanho)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[["todos","Todos"],["andamento","Em andamento"],["concluido","Concluídos"]].map(([s, l]) => (
            <button key={s} onClick={() => setFiltro(s)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: filtro === s ? "var(--gold)" : "var(--border)", background: filtro === s ? "var(--gold)" : "var(--surface)", color: filtro === s ? "#fff" : "var(--text3)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{l}</button>
          ))}
        </div>
        {contratoError && <div className="alert alert-error">{contratoError}</div>}
        {loading ? <Loading /> : filtrados.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}><div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>Nenhum frete nessa categoria</div>
        ) : filtrados.map(f => {
          const data = f.criado_em ? new Date(f.criado_em).toLocaleDateString("pt-BR") : "—";
          const emAndamento = ["aceito", "em_rota", "coletando"].includes(f.status);
          return (
            <div key={f.id} className="frete-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <StatusBadge status={f.status} />
                <div style={{ fontWeight: 800, color: "var(--green)", fontSize: 18 }}>{formatMoney(f.valor_motorista || f.valor_antt || 0)}</div>
              </div>
              <div className="route" style={{ fontSize: 14 }}>{f.origem_cidade || f.origem_endereco || "—"} → {f.dest_cidade || f.dest_endereco || "—"}</div>
              <div className="meta" style={{ marginTop: 6 }}><span>📦 {f.tipo_carga}</span><span>📏 {f.distancia_km} km</span><span>📅 {data}</span></div>
              {emAndamento && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => onNavigate("em-transito", f)}>📍 Ver em trânsito</button>
              )}
              {f.status === "entregue" && (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => verContrato(f.id)} disabled={contratoLoadingId === f.id}>
                  {contratoLoadingId === f.id ? "Abrindo contrato..." : "📄 Ver Contrato"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <BottomNavMotorista active="atividade" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// EM TRÂNSITO — sem mapa próprio (mapa fica na aba Início)
// ─────────────────────────────────────────────
function EmTransitoScreen({ frete, onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [freteStatus, setFreteStatus] = useState(frete?.status);
  const [confirmStep, setConfirmStep] = useState(null);
  const [codigoDigitado, setCodigoDigitado] = useState("");
  const [codigoTeste, setCodigoTeste] = useState(null);
  const [entregueOk, setEntregueOk] = useState(false);
  const [extrato, setExtrato] = useState(null);
  const [loadingExtrato, setLoadingExtrato] = useState(true);
  const [showAddDespesa, setShowAddDespesa] = useState(false);
  const [novaDespesa, setNovaDespesa] = useState({ tipo: "pedagio", descricao: "", valor: "" });
  const [salvandoDespesa, setSalvandoDespesa] = useState(false);
  const [contratoLoading, setContratoLoading] = useState(false);
  const [posicaoAtual, setPosicaoAtual] = useState(null);
  const [etaInfo, setEtaInfo] = useState(null);
  const posicaoRef = useRef(null);

  // GPS ao vivo desta tela — a Home também tem o próprio watch+envio, mas
  // essa tela SUBSTITUI a Home quando o motorista navega pra cá (renderer é
  // switch-case, só um componente montado por vez), então sem isso aqui o
  // envio de posição parava assim que o motorista saísse da Home — bem no
  // momento em que ele mais fica nesta tela durante uma entrega de verdade.
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosicaoAtual(coords);
        posicaoRef.current = coords;
      },
      err => console.error("GPS em-transito:", err),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    if (!frete?.id || !token) return;
    const enviar = () => {
      if (!posicaoRef.current) return;
      api("PATCH", "/api/motoristas/localizacao", {
        lat: posicaoRef.current.lat, lng: posicaoRef.current.lng, freteId: frete.id,
      }, token).catch(e => console.error("GPS send em-transito:", e.message));
    };
    enviar();
    const interval = setInterval(enviar, 30000);
    return () => clearInterval(interval);
  }, [frete?.id, token]);

  // Alvo da rota: ainda não coletou (aceito) -> vai até a origem; já coletou
  // (coletando/em_rota) -> vai até o destino. Calculado localmente (o
  // motorista já tem tudo isso no próprio objeto `frete`, sem precisar
  // consultar o backend só pra saber pra onde ele mesmo está indo).
  const alvo = freteStatus === "aceito"
    ? { lat: parseFloat(frete.origem_lat), lng: parseFloat(frete.origem_lng), label: frete.origem_cidade || "Coleta" }
    : ["coletando", "em_rota"].includes(freteStatus)
      ? { lat: parseFloat(frete.dest_lat), lng: parseFloat(frete.dest_lng), label: frete.dest_cidade || "Entrega" }
      : null;

  // Abre o Waze com navegação já carregada pro alvo atual (coleta ou
  // entrega). Tenta o app nativo primeiro (waze://); se o app não estiver
  // instalado, nada acontece e a aba não perde o foco — depois de um tempo
  // curto sem "blur" (sinal de que o app abriu), cai pro link web, que
  // funciona tanto em mobile (abre o app ou App/Play Store) quanto desktop.
  const abrirWaze = () => {
    if (!alvo?.lat || !alvo?.lng) return;
    const appUrl = `waze://?ll=${alvo.lat},${alvo.lng}&navigate=yes`;
    const webUrl = `https://waze.com/ul?ll=${alvo.lat},${alvo.lng}&navigate=yes`;
    const timer = setTimeout(() => { window.location.href = webUrl; }, 1500);
    window.addEventListener("blur", () => clearTimeout(timer), { once: true });
    window.location.href = appUrl;
  };

  const verContrato = async () => {
    setContratoLoading(true); setError("");
    try { await abrirArquivoAutenticado(`/api/fretes/${frete.id}/contrato`, token); }
    catch (e) { setError(e.message); }
    finally { setContratoLoading(false); }
  };

  const tiposDespesaFrete = [
    { id: "pedagio", icon: "🛣️", label: "Pedágio" },
    { id: "alimentacao", icon: "🍽️", label: "Alimentação" },
    { id: "hospedagem", icon: "🏨", label: "Pernoite" },
    { id: "outro", icon: "📦", label: "Outro" },
  ];

  const carregarExtrato = () => {
    if (!frete?.id) return;
    setLoadingExtrato(true);
    api("GET", `/api/fretes/${frete.id}/extrato`, null, token)
      .then(setExtrato)
      .catch(() => setExtrato(null))
      .finally(() => setLoadingExtrato(false));
  };

  useEffect(() => { carregarExtrato(); }, [frete?.id]);

  const adicionarDespesa = async () => {
    if (!novaDespesa.valor) return;
    setSalvandoDespesa(true);
    try {
      await api("POST", "/api/motoristas/despesas", {
        ...novaDespesa,
        data: new Date().toISOString().slice(0, 10),
        freteId: frete.id,
      }, token);
      setNovaDespesa({ tipo: "pedagio", descricao: "", valor: "" });
      setShowAddDespesa(false);
      carregarExtrato();
    } catch (e) { setError(e.message); }
    finally { setSalvandoDespesa(false); }
  };

  const removerDespesa = async (id) => {
    try {
      await api("DELETE", `/api/motoristas/despesas/${id}`, null, token);
      carregarExtrato();
    } catch (e) { setError(e.message); }
  };

  if (!frete) return <Loading />;

  const atualizarStatus = async (status) => {
    setLoading(true);
    try {
      await api("PATCH", `/api/fretes/${frete.id}/status`, { status }, token);
      setFreteStatus(status);
      if (status !== "entregue") onNavigate("home-motorista");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const solicitarCodigo = async () => {
    setLoading(true); setError("");
    try {
      const resp = await api("POST", `/api/fretes/${frete.id}/solicitar-codigo-entrega`, {}, token);
      setConfirmStep("aguardando");
      if (resp.codigo_teste) setCodigoTeste(resp.codigo_teste);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const confirmarComCodigo = async () => {
    if (codigoDigitado.length !== 6) return setError("Digite o código de 6 dígitos");
    setLoading(true); setError("");
    try {
      await api("POST", `/api/fretes/${frete.id}/confirmar-entrega`, { codigo: codigoDigitado }, token);
      setEntregueOk(true);
      setFreteStatus("entregue");
      setTimeout(() => onNavigate("home-motorista"), 3000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fretesRetorno = [
    { id: "r1", origem: frete.dest_cidade || "SP", destino: frete.origem_cidade || "CWB", distancia: Math.round(frete.distancia_km * 0.95), valor: formatMoney(Math.round((frete.valor_motorista || 0) * 0.85)), tipo: "Carga Seca" },
    { id: "r2", origem: frete.dest_cidade || "SP", destino: "Campinas, SP", distancia: 100, valor: "R$ 980,00", tipo: "Graneleiro" },
  ];

  if (entregueOk) return (
    <div className="screen">
      <div className="header"><h1>Frete Ativo</h1></div>
      <div className="content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--green)", marginBottom: 8 }}>Entrega confirmada!</div>
        <div style={{ color: "var(--text3)", textAlign: "center", marginBottom: 24 }}>Frete concluído com sucesso.<br/>Redirecionando...</div>
        <div style={{ width: "100%" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 8 }}>🎯 Fretes de retorno disponíveis:</div>
          {fretesRetorno.map(fr => (
            <div key={fr.id} className="frete-card" onClick={() => onNavigate("aceitar-frete", fr)}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{fr.origem} → {fr.destino}</span>
                <span style={{ color: "var(--gold)", fontWeight: 800 }}>{fr.valor}</span>
              </div>
              <div className="meta" style={{ marginTop: 4 }}><span>📦 {fr.tipo}</span><span>📏 {fr.distancia} km</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button>
        <h1>Frete Ativo</h1>
      </div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <StatusBadge status={freteStatus} />
          <span style={{ fontWeight: 800, fontSize: 20, color: "var(--green)" }}>{formatMoney(frete.valor_motorista || 0)}</span>
        </div>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Rota {alvo && <span style={{ color: "var(--gold)" }}>· indo para {freteStatus === "aceito" ? "coleta" : "entrega"}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", border: "2px solid white", boxShadow: "0 0 0 2px var(--green)" }} />
                  <div style={{ width: 2, height: 24, background: "var(--border)" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--red)", border: "2px solid white", boxShadow: "0 0 0 2px var(--red)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{frete.origem_cidade || frete.origem_endereco || "—"}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{frete.dest_cidade || frete.dest_endereco || "—"}</div>
                </div>
              </div>
            </div>
          </div>

          {alvo && (
            <>
              <MapaLeaflet
                height="52vh"
                lat={posicaoAtual?.lat}
                lng={posicaoAtual?.lng}
                metaAoVivo={alvo}
                onRotaInfo={setEtaInfo}
                modoNavegacao
                zoomNavegacao={17}
                seguirPorPadrao
                mostrarOrientacao
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0" }}>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>
                  {!posicaoAtual ? "📡 Obtendo localização..." : etaInfo
                    ? <><strong style={{ color: "var(--text)" }}>⏱️ {etaInfo.duracaoMin} min</strong> · {etaInfo.distanciaKm} km até {freteStatus === "aceito" ? "a coleta" : "a entrega"}</>
                    : "Calculando rota..."}
                </div>
              </div>
              <button className="btn btn-primary btn-sm" style={{ width: "100%", marginBottom: 10, background: "#33CCFF" }} onClick={abrirWaze}>
                🧭 Abrir no Waze
              </button>
            </>
          )}

          <div className="info-row"><span className="info-label">Distância</span><span className="info-value">{frete.distancia_km} km</span></div>
          <div className="info-row"><span className="info-label">Tipo de carga</span><span className="info-value">{frete.tipo_carga}</span></div>
          <div className="info-row"><span className="info-label">Peso</span><span className="info-value">{frete.peso_tons}t</span></div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={verContrato} disabled={contratoLoading}>
            {contratoLoading ? "Abrindo contrato..." : "📄 Ver Contrato"}
          </button>
        </div>

        <div className="card">
          <div className="card-title">💰 Extrato Financeiro do Frete</div>
          {loadingExtrato && <Loading />}
          {!loadingExtrato && !extrato && (
            <p style={{ fontSize: 13, color: "var(--text3)" }}>Não foi possível carregar o extrato agora.</p>
          )}
          {!loadingExtrato && extrato && (
            <>
              <div className="info-row"><span className="info-label">Valor a receber</span><span className="info-value" style={{ color: "var(--green)", fontWeight: 800 }}>{formatMoney(extrato.valorReceber)}</span></div>
              <div className="divider" />
              <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Custos estimados (dados oficiais ANTT)</div>
              <div className="info-row"><span className="info-label">⛽ Combustível</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos.combustivel)}</span></div>
              <div className="info-row"><span className="info-label">🔧 Desgaste do veículo</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos.desgaste)}</span></div>

              {extrato.despesasManuais.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "10px 0 6px" }}>Despesas lançadas por você</div>
                  {extrato.despesasManuais.map(d => {
                    const tipoObj = tiposDespesaFrete.find(t => t.id === d.tipo) || { icon: "📦", label: d.tipo };
                    return (
                      <div key={d.id} className="info-row">
                        <span className="info-label">{tipoObj.icon} {tipoObj.label}{d.descricao ? ` — ${d.descricao}` : ""}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(d.valor)}</span>
                          <span onClick={() => removerDespesa(d.id)} style={{ cursor: "pointer", color: "var(--text3)", fontSize: 13 }}>✕</span>
                        </span>
                      </div>
                    );
                  })}
                </>
              )}

              <div className="divider" />
              <div className="info-row"><span className="info-label">Total de custos</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.totalCustos)}</span></div>
              <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Valor líquido estimado</span><span className="info-value" style={{ color: extrato.valorLiquido >= 0 ? "var(--green)" : "var(--red)", fontWeight: 800, fontSize: 16 }}>{formatMoney(extrato.valorLiquido)}</span></div>

              {!showAddDespesa ? (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowAddDespesa(true)}>+ Lançar despesa deste frete</button>
              ) : (
                <div style={{ marginTop: 12, padding: 12, background: "var(--surface2)", borderRadius: 10 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                    {tiposDespesaFrete.map(t => (
                      <button key={t.id} onClick={() => setNovaDespesa(d => ({ ...d, tipo: t.id }))}
                        style={{ padding: "6px 10px", borderRadius: 16, border: "1px solid", borderColor: novaDespesa.tipo === t.id ? "var(--gold)" : "var(--border)", background: novaDespesa.tipo === t.id ? "var(--gold)" : "var(--surface)", color: novaDespesa.tipo === t.id ? "#fff" : "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="field">
                    <label>Valor (R$)</label>
                    <input type="number" step="0.01" value={novaDespesa.valor} onChange={e => setNovaDespesa(d => ({ ...d, valor: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div className="field">
                    <label>Descrição (opcional)</label>
                    <input value={novaDespesa.descricao} onChange={e => setNovaDespesa(d => ({ ...d, descricao: e.target.value }))} placeholder="Ex: Posto BR km 120" />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={adicionarDespesa} disabled={salvandoDespesa}>{salvandoDespesa ? "Salvando..." : "Salvar"}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddDespesa(false)}>Cancelar</button>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 10 }}>
                Combustível e desgaste são estimativas com base nos coeficientes oficiais da ANTT por eixo do veículo. Pedágio, alimentação e pernoite refletem exatamente o que você lançar aqui.
              </p>
            </>
          )}
        </div>
        <button className="btn btn-secondary" style={{ marginBottom: 10 }} onClick={() => onNavigate("chat", { frete })}>💬 Chat com Contratante</button>
        {freteStatus === "aceito" && frete.status_pagamento === "approved" && (
          <button className="btn btn-primary" style={{ marginBottom: 10 }} onClick={() => atualizarStatus("coletando")} disabled={loading}>🚛 Iniciar Coleta</button>
        )}
        {freteStatus === "aceito" && frete.status_pagamento !== "approved" && (
          <div className="alert alert-info" style={{ textAlign: "center", marginBottom: 10 }}>⏳ Aguardando pagamento do contratante para liberar a coleta</div>
        )}
        {freteStatus === "coletando" && (
          <button className="btn btn-primary" style={{ marginBottom: 10 }} onClick={() => atualizarStatus("em_rota")} disabled={loading}>🛣️ Em Rota</button>
        )}
        {freteStatus === "em_rota" && !confirmStep && (
          <button className="btn btn-success" onClick={() => setConfirmStep("solicitando")} disabled={loading}>✅ Confirmar Entrega</button>
        )}
        {freteStatus === "em_rota" && confirmStep === "solicitando" && (
          <div className="card" style={{ borderLeft: "4px solid var(--green)" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Confirmação de entrega</div>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16, lineHeight: 1.6 }}>
              Um código de 6 dígitos será enviado por email ao contratante. Peça o código a ele para confirmar o recebimento da carga.
            </p>
            <button className="btn btn-primary" onClick={solicitarCodigo} disabled={loading} style={{ marginBottom: 8 }}>
              {loading ? "Enviando..." : "📧 Enviar código para o contratante"}
            </button>
            <button className="btn btn-secondary" onClick={() => setConfirmStep(null)}>Cancelar</button>
          </div>
        )}
        {freteStatus === "em_rota" && confirmStep === "aguardando" && (
          <div className="card" style={{ borderLeft: "4px solid var(--green)" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>✉️ Código gerado!</div>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 12 }}>
              {codigoTeste ? "Email indisponível no modo teste. Use o código abaixo:" : "O contratante recebeu o código por email. Digite abaixo:"}
            </p>
            {codigoTeste && (
              <div style={{ background: "rgba(201,168,76,0.1)", border: "1px dashed var(--gold)", borderRadius: 10, padding: "14px 12px", marginBottom: 14, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🧪 Modo teste — mostre ao contratante</div>
                <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 14, color: "var(--text)", fontFamily: "monospace" }}>{codigoTeste}</div>
              </div>
            )}
            <div className="field">
              <label>Código de confirmação</label>
              <input type="text" inputMode="numeric" maxLength={6}
                value={codigoDigitado}
                onChange={e => setCodigoDigitado(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                style={{ fontSize: 32, letterSpacing: 14, textAlign: "center", fontFamily: "monospace" }}
              />
            </div>
            <button className="btn btn-success" onClick={confirmarComCodigo} disabled={loading || codigoDigitado.length !== 6} style={{ marginBottom: 8 }}>
              {loading ? "Confirmando..." : "✅ Confirmar Entrega"}
            </button>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 4 }} onClick={solicitarCodigo} disabled={loading}>🔄 Reenviar código</button>
          </div>
        )}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────
// PERFIL MOTORISTA — ✅ ganhos reais da API
// ─────────────────────────────────────────────
function PerfilMotorista({ onNavigate }) {
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState("resumo");
  const [metaKmVazio, setMetaKmVazio] = useState(800);
  const [editMeta, setEditMeta] = useState(false);
  const [novaMeta, setNovaMeta] = useState("800");
  const [ganhos, setGanhos] = useState(null);
  const [loadingGanhos, setLoadingGanhos] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [testePushMsg, setTestePushMsg] = useState(null);

  const testarPush = async () => {
    setTestePushMsg("Enviando...");
    try {
      const res = await api("POST", "/api/push/testar", {}, token);
      const ok = res.resultados?.some(r => r.ok);
      if (ok) {
        setTestePushMsg("✅ Push enviado! Verifique a notificação.");
      } else {
        const erros = res.resultados?.map(r => `${r.status}: ${r.erro}`).join(", ");
        setTestePushMsg("❌ Falhou: " + (erros || "sem subscription"));
      }
    } catch (e) {
      setTestePushMsg("❌ Erro: " + e.message);
    }
    setTimeout(() => setTestePushMsg(null), 8000);
  };
  // Km vazio real do mês, vindo do mesmo endpoint que a MotoristaHome usa
  // (não há, hoje, um detalhamento por tipo de carga no backend — ver aba
  // "KM Vazio por tipo de carga" abaixo).
  const kmVazio = Number(ganhos?.km_vazio_total || 0);
  const pctMeta = Math.min(100, Math.round((kmVazio / metaKmVazio) * 100));

  // Carrega perfil completo ao montar
  useEffect(() => {
    api("GET", "/api/motoristas/perfil", null, token)
      .then(setPerfil)
      .catch(() => {});
  }, []);

  // Busca ganhos reais ao entrar na aba
  useEffect(() => {
    if ((tab === "ganhos" || tab === "resumo" || tab === "km-vazio") && !ganhos && !loadingGanhos) {
      setLoadingGanhos(true);
      api("GET", "/api/motoristas/ganhos", null, token)
        .then(setGanhos)
        .catch(() => setGanhos(null))
        .finally(() => setLoadingGanhos(false));
    }
  }, [tab]);

  return (
    <div className="screen">
      <div className="header"><h1>Perfil</h1></div>
      <div className="content">
        <div style={{ textAlign: "center", padding: "14px 0 20px" }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 28 }}>🚛</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.nome}</div>
          <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>{user?.email}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
            <span className="badge badge-active">Motorista</span>
            <span className="badge" style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.4)" }}>⭐ {ganhos ? Number(ganhos.avaliacao_media).toFixed(1) : "—"}</span>
          </div>
        </div>

        <div className="tab-bar" style={{ marginBottom: 14 }}>
          {[["resumo", "Resumo"], ["ganhos", "Ganhos"], ["km-vazio", "KM Vazio"], ["despesas", "Despesas"]].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {tab === "resumo" && (
          <>
            {loadingGanhos ? <Loading /> : (
              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div className="stat-card"><div className="stat-value">{ganhos?.total_fretes ?? "—"}</div><div className="stat-label">Fretes feitos</div></div>
                <div className="stat-card"><div className="stat-value">{ganhos ? Number(ganhos.avaliacao_media).toFixed(1) : "—"}</div><div className="stat-label">Avaliação</div></div>
                <div className="stat-card"><div className="stat-value">{ganhos ? formatKm(ganhos.km_carregado) : "—"}</div><div className="stat-label">Km carregado</div></div>
                <div className="stat-card"><div className="stat-value">{ganhos ? formatKm(ganhos.km_vazio_total || 0) : "—"}</div><div className="stat-label">Km vazio total</div></div>
              </div>
            )}
            <div className="card">
              <div className="card-title">Dados do veículo</div>
              <div className="info-row"><span className="info-label">Tipo</span><span className="info-value">{(() => { const t = TIPOS_VEICULO.find(v => v.id === (perfil?.tipo_veiculo || user?.tipo_veiculo)); return t ? `${t.icon} ${t.label}` : (perfil?.tipo_veiculo || "—"); })()}</span></div>
              <div className="info-row"><span className="info-label">Marca/Modelo</span><span className="info-value">{[perfil?.marca_veiculo, perfil?.modelo_veiculo].filter(Boolean).join(" ") || "—"}</span></div>
              <div className="info-row"><span className="info-label">Placa</span><span className="info-value">{perfil?.placa_veiculo || "—"}</span></div>
              <div className="info-row"><span className="info-label">Ano</span><span className="info-value">{perfil?.ano_veiculo || "—"}</span></div>
              <div className="info-row"><span className="info-label">RNTRC</span><span className="info-value">{perfil?.rntrc || "—"}</span></div>
              <div className="info-row"><span className="info-label">CNH</span><span className="info-value">{perfil?.cnh_numero || "—"}</span></div>
            </div>
            {[["📦", "Meus Fretes", "meus-fretes-motorista"], ["💬", "Chat", "chat"], ["⭐", "Avaliações", "avaliacoes"]].map(([icon, label, screen]) => (
              <div key={label} className="card" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => onNavigate(screen)}>
                <span style={{ fontSize: 20 }}>{icon}</span><span style={{ fontWeight: 600 }}>{label}</span><span style={{ marginLeft: "auto", color: "var(--text2)" }}>›</span>
              </div>
            ))}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 4 }}>Minha Conta</div>
            <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
              {[
                { icon: "👤", label: "Dados Pessoais", sub: "Nome, foto, CPF, CNH, endereço", screen: "dados-pessoais-motorista" },
                { icon: "🚛", label: "Meu Caminhão", sub: "Tipo, carreta, placa, documentos", screen: "dados-caminhao" },
                { icon: "🛡️", label: "Seguro", sub: "Obrigatório pra aceitar fretes", screen: "seguro-motorista" },
                { icon: "💰", label: "Minhas Finanças", sub: "Despesas, receitas e controle", screen: "financas-motorista" },
                { icon: "🔔", label: "Notificações", sub: "Push, sons e alertas", screen: "notificacoes" },
                { icon: "🔒", label: "Privacidade", sub: "Senha, dados pessoais", screen: "privacidade" },
                { icon: "📄", label: "Termos de uso", sub: "Política de privacidade", screen: "termos" },
              ].map((item, i) => (
                <div key={i} onClick={() => item.screen && onNavigate(item.screen)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderBottom: i < 6 ? "1px solid var(--border)" : "none", cursor: item.screen ? "pointer" : "default" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: i < 3 ? "var(--gold-light)" : "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
                  </div>
                  <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
                </div>
              ))}
            </div>
            <button className="btn btn-danger" style={{ marginTop: 4 }} onClick={logout}>Sair da Conta</button>
            <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={testarPush}>🔔 Testar Push Notification</button>
            {testePushMsg && <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 8, fontSize: 13, color: "#f97316", textAlign: "center" }}>{testePushMsg}</div>}
          </>
        )}

        {tab === "ganhos" && (
          <>
            {loadingGanhos ? <Loading /> : ganhos ? (
              <>
                <div className="card" style={{ textAlign: "center", borderColor: "rgba(201,168,76,0.3)" }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Ganhos este mês</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "var(--gold)" }}>{formatMoney(ganhos.ganhos_mes_atual)}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                    {ganhos.fretes_mes_atual} fretes · média {formatMoney(ganhos.media_por_frete)}/frete
                  </div>
                </div>
                {ganhos.historico_mensal?.length > 0 && (
                  <div className="card">
                    <div className="card-title">Histórico mensal</div>
                    {ganhos.historico_mensal.map(m => (
                      <div key={m.mes} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                          <span style={{ fontWeight: 700 }}>{m.mes}/{m.ano}</span>
                          <span style={{ color: "var(--green)", fontWeight: 700 }}>{formatMoney(m.valor)}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill green" style={{ width: `${Math.round((Number(m.valor) / Math.max(...ganhos.historico_mensal.map(x => Number(x.valor)), 1)) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="card">
                  <div className="card-title">Resumo total</div>
                  <div className="info-row"><span className="info-label">Total de fretes</span><span className="info-value">{ganhos.total_fretes}</span></div>
                  <div className="info-row"><span className="info-label">Km carregado total</span><span className="info-value">{formatKm(ganhos.km_carregado)}</span></div>
                  <div className="info-row"><span className="info-label">Ganhos totais</span><span className="info-value" style={{ color: "var(--green)", fontWeight: 800 }}>{formatMoney(ganhos.ganhos_total)}</span></div>
                </div>
              </>
            ) : (
              <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
                <p style={{ fontWeight: 600 }}>Nenhum dado disponível</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Complete seu primeiro frete para ver os ganhos</p>
              </div>
            )}
          </>
        )}

        {tab === "km-vazio" && (
          loadingGanhos && !ganhos ? <Loading /> : (
          <>
            <div className="card">
              <div className="card-title">Meta de KM Vazio (mensal)</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: pctMeta > 100 ? "var(--red)" : pctMeta > 75 ? "var(--orange)" : "var(--green)" }}>{formatKm(kmVazio)}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)" }}>rodado vazio este mês</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {!editMeta ? (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Meta: {formatKm(metaKmVazio)}</div>
                      <span style={{ fontSize: 12, color: "var(--orange)", cursor: "pointer" }} onClick={() => setEditMeta(true)}>✏️ Editar</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="number" value={novaMeta} onChange={e => setNovaMeta(e.target.value)} style={{ width: 80, background: "var(--dark3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", color: "var(--white)", fontSize: 14, fontFamily: "Inter, sans-serif" }} />
                      <button className="btn btn-primary btn-sm" onClick={() => { setMetaKmVazio(Number(novaMeta)); setEditMeta(false); }}>OK</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className={`progress-fill ${pctMeta > 100 ? "red" : pctMeta > 75 ? "" : "green"}`} style={{ width: `${Math.min(pctMeta, 100)}%` }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>
                {pctMeta >= 100 ? "⚠️ Meta ultrapassada! Aceite fretes de retorno." : pctMeta > 75 ? "⚡ Atenção: próximo da meta." : `✅ ${formatKm(metaKmVazio - kmVazio)} restantes até a meta`}
              </div>
            </div>
            <div className="card">
              <div className="card-title">KM Vazio por tipo de carga</div>
              <div style={{ textAlign: "center", padding: "16px 8px", color: "var(--text3)" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
                <p style={{ fontSize: 13 }}>Ainda não temos esse detalhamento por tipo de carga.</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Em breve você poderá ver aqui em quais tipos de carga está rodando mais vazio.</p>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Eficiência geral</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--green)" }}>✅ Carregado: {ganhos ? formatKm(ganhos.km_carregado) : "—"}</span>
                <span style={{ fontSize: 13, color: "var(--red)" }}>⬜ Vazio: {formatKm(kmVazio)}</span>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill green" style={{ width: `${ganhos ? Math.round((Number(ganhos.km_carregado) / Math.max(Number(ganhos.km_carregado) + kmVazio, 1)) * 100) : 0}%` }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: "var(--green)" }}>
                {ganhos ? `${Math.round((Number(ganhos.km_carregado) / Math.max(Number(ganhos.km_carregado) + kmVazio, 1)) * 100)}% de eficiência` : "—"}
              </div>
            </div>
          </>
          )
        )}

        {tab === "despesas" && <DespesasTab />}
      </div>
      <BottomNavMotorista active="conta" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE DE DESPESAS (usado na aba Despesas do PerfilMotorista)
// ─────────────────────────────────────────────
function DespesasTab() {
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

// ─────────────────────────────────────────────
// DADOS PESSOAIS — CONTRATANTE
// ─────────────────────────────────────────────
function DadosPessoaisContratante({ onNavigate }) {
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

// ─────────────────────────────────────────────
// DADOS PESSOAIS — MOTORISTA
// ─────────────────────────────────────────────
function DadosPessoaisMotorista({ onNavigate }) {
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

// ─────────────────────────────────────────────
// DADOS DO CAMINHÃO — MOTORISTA
// ─────────────────────────────────────────────
function DadosCaminhaoMotorista({ onNavigate }) {
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

// ─────────────────────────────────────────────
// MINHAS FINANÇAS — MOTORISTA
// ─────────────────────────────────────────────
function FinancasMotorista({ onNavigate }) {
  const { token } = useAuth();
  const [tab, setTab] = useState("despesas");
  const [ganhos, setGanhos] = useState(null);
  const [extrato, setExtrato] = useState(null);
  const [loadingExtrato, setLoadingExtrato] = useState(true);
  const [loadingGanhos, setLoadingGanhos] = useState(true);
  const tiposDespesa = TIPOS_DESPESA;

  // Mesma fonte de verdade da aba Despesas do Perfil — antes esta tela somava
  // só o valor bruto das despesas registradas manualmente, sem o resumo ANTT
  // (combustível + desgaste estimados), batendo um total diferente pro mesmo mês.
  const {
    despesas, resumoCustos, total: totalDespesas, showAdd, setShowAdd, loading: loadingAdd,
    nova, setN, comprovanteUrl, lendoNf, nfAviso,
    add, remover, handleNF,
  } = useDespesasMotorista();

  // Carrega ganhos e extrato de transações do banco já ao montar a tela (não só ao clicar na aba)
  useEffect(() => {
    setLoadingGanhos(true);
    api("GET", "/api/motoristas/ganhos", null, token)
      .then(setGanhos).catch(() => setGanhos(null)).finally(() => setLoadingGanhos(false));
    setLoadingExtrato(true);
    api("GET", "/api/motoristas/extrato", null, token)
      .then(d => setExtrato(d.transacoes || []))
      .catch(() => setExtrato([]))
      .finally(() => setLoadingExtrato(false));
  }, [token]);

  const totalReceitas = Number(ganhos?.ganhos_total || 0);
  const saldo = totalReceitas - totalDespesas;

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Minhas Finanças</h1></div>
      <div className="content">
        <div className="grid-2" style={{ marginBottom: 10 }}>
          <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Receitas</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--green)" }}>{formatMoney(totalReceitas)}</div></div>
          <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Despesas</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--red)" }}>{formatMoney(totalDespesas)}</div></div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 14, marginBottom: 14, borderColor: saldo >= 0 ? "rgba(45,122,58,0.3)" : "rgba(192,57,43,0.3)" }}>
          <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Saldo</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: saldo >= 0 ? "var(--green)" : "var(--red)" }}>{formatMoney(saldo)}</div>
        </div>
        <div className="tab-bar" style={{ marginBottom: 14 }}>
          {[["despesas","💸 Despesas"],["receitas","💰 Receitas"]].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        {tab === "despesas" && (
          <>
            {resumoCustos && (
              <div className="grid-2" style={{ marginBottom: 6 }}>
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
                O total de despesas inclui combustível e desgaste estimados com base nos coeficientes oficiais da ANTT, somando todos os {resumoCustos.totalFretesConsiderados} fretes aceitos — além do que você registra manualmente abaixo.
              </p>
            )}
            <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={() => setShowAdd(true)}>+ Adicionar Despesa</button>
            {showAdd && (
              <div className="card" style={{ borderColor: "var(--gold)", marginBottom: 14 }}>
                <div className="card-title">Nova Despesa</div>
                <div className="field"><label>Tipo</label>
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
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={add} disabled={loadingAdd}>{loadingAdd ? "Salvando..." : "Salvar"}</button>
                </div>
              </div>
            )}
            {despesas.length === 0 && !showAdd && (
              <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                <p style={{ fontWeight: 600 }}>Nenhuma despesa registrada</p>
                <p style={{ fontSize: 13, marginTop: 6 }}>Registre combustível, pedágio, manutenção e mais.</p>
              </div>
            )}
            {despesas.map(d => {
              const t = tiposDespesa.find(x => x.id === d.tipo) || { icon: "📦", label: d.tipo };
              return (
                <div key={d.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(192,57,43,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{t.icon}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{t.label}</div><div style={{ fontSize: 12, color: "var(--text3)" }}>{d.descricao || "—"} · {d.data?.slice(0,10)}</div></div>
                  <div style={{ fontWeight: 700, color: "var(--red)", fontSize: 15 }}>-{formatMoney(d.valor)}</div>
                  {!d.automatica && (
                    <button onClick={() => remover(d.id)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16, padding: 4 }}>🗑️</button>
                  )}
                </div>
              );
            })}
          </>
        )}
        {tab === "receitas" && (
          <>
            {loadingGanhos ? <Loading /> : !ganhos || Number(ganhos.total_fretes || 0) === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
                <p style={{ fontWeight: 600 }}>Nenhuma receita ainda</p>
                <p style={{ fontSize: 13, marginTop: 6 }}>Fretes concluídos entram aqui automaticamente.</p>
              </div>
            ) : (
              <>
                <div className="card" style={{ textAlign: "center", borderColor: "rgba(45,122,58,0.3)", marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Ganhos este mês</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--green)" }}>{formatMoney(ganhos.ganhos_mes_atual)}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                    {ganhos.fretes_mes_atual} frete{ganhos.fretes_mes_atual === 1 ? "" : "s"} · média {formatMoney(ganhos.media_por_frete)}/frete
                  </div>
                </div>
                {ganhos.historico_mensal?.length > 0 && (
                  <div className="card" style={{ marginBottom: 14 }}>
                    <div className="card-title">Histórico mensal</div>
                    {ganhos.historico_mensal.map((m, i) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                          <span style={{ fontWeight: 700 }}>{m.mes}/{m.ano}</span>
                          <span style={{ color: "var(--green)", fontWeight: 700 }}>{formatMoney(m.valor)}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill green" style={{ width: `${Math.round((Number(m.valor) / Math.max(...ganhos.historico_mensal.map(x => Number(x.valor)), 1)) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="card-title">Resumo total</div>
                  <div className="info-row"><span className="info-label">Total de fretes</span><span className="info-value">{ganhos.total_fretes}</span></div>
                  <div className="info-row"><span className="info-label">Km carregado total</span><span className="info-value">{formatKm(ganhos.km_carregado)}</span></div>
                  <div className="info-row"><span className="info-label">Ganhos com entregas</span><span className="info-value" style={{ color: "var(--green)" }}>{formatMoney(ganhos.ganhos_entregas)}</span></div>
                  {Number(ganhos.ganhos_compensacoes || 0) > 0 && (
                    <div className="info-row"><span className="info-label">🔄 Compensações por cancelamento</span><span className="info-value" style={{ color: "var(--gold)" }}>{formatMoney(ganhos.ganhos_compensacoes)}</span></div>
                  )}
                  <div className="divider" />
                  <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Ganhos totais</span><span className="info-value" style={{ color: "var(--green)", fontWeight: 800 }}>{formatMoney(ganhos.ganhos_total)}</span></div>
                </div>
                <div className="card-title" style={{ marginBottom: 8 }}>Transações</div>
                {loadingExtrato ? <Loading /> : extrato?.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: 24, color: "var(--text3)" }}>Nenhuma transação registrada ainda</div>
                ) : (extrato || []).map(t => {
                  const ehCompensacao = t.tipo === "compensacao_cancelamento";
                  const data = t.data_evento ? new Date(t.data_evento).toLocaleDateString("pt-BR") : "—";
                  return (
                    <div key={t.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", borderColor: ehCompensacao ? "rgba(201,168,76,0.4)" : "var(--border)" }}
                      onClick={() => onNavigate("extrato-frete-motorista", { id: t.id })}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: ehCompensacao ? "rgba(201,168,76,0.15)" : "rgba(45,122,58,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                        {ehCompensacao ? "🔄" : "🚛"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{ehCompensacao ? "Compensação por cancelamento" : "Entrega"}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>{t.dest_cidade ? `→ ${t.dest_cidade}/${t.dest_estado}` : "—"} · {data}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: ehCompensacao ? "var(--gold)" : "var(--green)", fontSize: 15 }}>{formatMoney(t.valor)}</div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EXTRATO DE UM FRETE FINALIZADO (Motorista)
// Reaproveita GET /api/fretes/:id/extrato — mesmo endpoint usado em "Em Trânsito"
// pra fretes em andamento, mas aqui pra fretes já entregues ou cancelados com
// compensação (o backend diferencia pelo campo "tipo" da resposta).
// ─────────────────────────────────────────────
function ExtratoFreteMotoristaScreen({ dados, onNavigate }) {
  const { token } = useAuth();
  const [extrato, setExtrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dados?.id) return;
    setLoading(true);
    api("GET", `/api/fretes/${dados.id}/extrato`, null, token)
      .then(setExtrato)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [dados?.id]);

  const ehCompensacao = extrato?.tipo === "compensacao_cancelamento";
  const cd = extrato?.compensacaoDetalhes;

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate(-1)}>←</button>
        <h1>{ehCompensacao ? "Compensação" : "Extrato do Frete"}</h1>
      </div>
      <div className="content">
        {loading && <Loading />}
        {error && <div className="alert alert-error">{error}</div>}
        {extrato && (
          <>
            {ehCompensacao && (
              <div className="alert alert-info" style={{ marginBottom: 14 }}>
                🔄 Este frete foi cancelado pelo contratante depois que você já tinha saído pra coleta. O valor abaixo é a compensação pelo trecho percorrido, não o valor do frete completo.
              </div>
            )}
            <div className="card" style={{ textAlign: "center", borderColor: ehCompensacao ? "rgba(201,168,76,0.4)" : "rgba(45,122,58,0.3)", marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>{ehCompensacao ? "Compensação recebida" : "Valor a receber"}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: ehCompensacao ? "var(--gold)" : "var(--green)" }}>{formatMoney(extrato.valorReceber)}</div>
            </div>

            {ehCompensacao ? (
              <div className="card">
                <div className="card-title">Como foi calculado</div>
                {cd?.distanciaPercorridaKm != null && (
                  <div className="info-row"><span className="info-label">Distância percorrida</span><span className="info-value">{cd.distanciaPercorridaKm} km</span></div>
                )}
                <div className="info-row"><span className="info-label">⛽ Combustível (trecho percorrido)</span><span className="info-value">{formatMoney(extrato.custosAutomaticos.combustivel)}</span></div>
                <div className="info-row"><span className="info-label">🔧 Desgaste (trecho percorrido)</span><span className="info-value">{formatMoney(extrato.custosAutomaticos.desgaste)}</span></div>
                {cd?.taxaTranstorno != null && (
                  <div className="info-row"><span className="info-label">⚠️ Taxa de transtorno ({Math.round((cd.percentualTaxa || 0) * 100)}%)</span><span className="info-value">{formatMoney(cd.taxaTranstorno)}</span></div>
                )}
                <div className="divider" />
                <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Total da compensação</span><span className="info-value" style={{ color: "var(--gold)", fontWeight: 800, fontSize: 16 }}>{formatMoney(extrato.valorReceber)}</span></div>
                <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
                  Combustível e desgaste cobrem só o trecho que você já tinha percorrido até o cancelamento. A taxa de transtorno é um adicional fixo pela viagem interrompida.
                </p>
              </div>
            ) : (
              <div className="card">
                <div className="card-title">Custos estimados (dados oficiais ANTT)</div>
                <div className="info-row"><span className="info-label">⛽ Combustível</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos.combustivel)}</span></div>
                <div className="info-row"><span className="info-label">🔧 Desgaste do veículo</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos.desgaste)}</span></div>
              </div>
            )}

            {extrato.despesasManuais?.length > 0 && (
              <div className="card">
                <div className="card-title">Despesas lançadas por você</div>
                {extrato.despesasManuais.map(d => (
                  <div key={d.id} className="info-row">
                    <span className="info-label">{d.tipo}{d.descricao ? ` — ${d.descricao}` : ""}</span>
                    <span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(d.valor)}</span>
                  </div>
                ))}
              </div>
            )}

            {!ehCompensacao && (
              <div className="card">
                <div className="info-row"><span className="info-label">Total de custos</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.totalCustos)}</span></div>
                <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Valor líquido estimado</span><span className="info-value" style={{ color: extrato.valorLiquido >= 0 ? "var(--green)" : "var(--red)", fontWeight: 800, fontSize: 16 }}>{formatMoney(extrato.valorLiquido)}</span></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAINEL FINANCEIRO — CONTRATANTE
// ─────────────────────────────────────────────
function FinancasContratante({ onNavigate }) {
  const { token } = useAuth();
  const [periodo, setPeriodo] = useState("12m");
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [aba, setAba] = useState("mes");

  useEffect(() => {
    setLoading(true);
    setErro(false);
    api("GET", `/api/contratantes/financeiro?periodo=${periodo}`, null, token)
      .then(setDados)
      .catch(() => setErro(true))
      .finally(() => setLoading(false));
  }, [periodo, token]);

  const iconCarga = (tipo) => TIPOS_CARGA.find(t => t.id === tipo)?.icon || "📦";
  const labelCarga = (tipo) => TIPOS_CARGA.find(t => t.id === tipo)?.label || tipo || "—";

  const resumo = dados?.resumo || dados || {};
  const porMes = dados?.por_mes || [];
  const porRota = dados?.por_rota || [];
  const porTipo = dados?.por_tipo_carga || [];
  const extrato = dados?.extrato || [];

  const maxMes = Math.max(1, ...porMes.map(m => Number(m.valor || 0)));
  const maxRota = Math.max(1, ...porRota.map(r => Number(r.valor || 0)));
  const maxTipo = Math.max(1, ...porTipo.map(t => Number(t.valor || 0)));

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Painel Financeiro</h1></div>
      <div className="content">
        <div className="tab-bar" style={{ marginBottom: 14 }}>
          {[["12m", "Últimos 12 meses"], ["desde_inicio", "Desde o início"]].map(([id, label]) => (
            <button key={id} className={`tab-btn ${periodo === id ? "active" : ""}`} onClick={() => setPeriodo(id)}>{label}</button>
          ))}
        </div>

        {loading ? <Loading /> : erro ? (
          <div className="alert alert-error">Não foi possível carregar os dados financeiros. Tente novamente mais tarde.</div>
        ) : (
          <>
            <div className="grid-2" style={{ marginBottom: 10 }}>
              <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total Gasto</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>{formatMoney(resumo.total_gasto)}</div></div>
              <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Ticket Médio</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{formatMoney(resumo.ticket_medio)}</div></div>
            </div>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total de Fretes</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{resumo.total_fretes ?? 0}</div></div>
              <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Km Total</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{formatKm(resumo.km_total)}</div></div>
            </div>

            <div className="tab-bar" style={{ marginBottom: 14 }}>
              {[["mes", "Por Mês"], ["rota", "Por Rota"], ["tipo", "Por Tipo"], ["extrato", "Extrato"]].map(([id, label]) => (
                <button key={id} className={`tab-btn ${aba === id ? "active" : ""}`} onClick={() => setAba(id)}>{label}</button>
              ))}
            </div>

            {aba === "mes" && (
              porMes.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
                  <p style={{ fontWeight: 600 }}>Nenhum gasto no período</p>
                </div>
              ) : porMes.map((m, i) => (
                <div key={i} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{String(m.mes).slice(0, 3)}/{String(m.ano).slice(-2)}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{m.fretes} frete{m.fretes === 1 ? "" : "s"}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gold)" }}>{formatMoney(m.valor)}</div>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${(Number(m.valor || 0) / maxMes) * 100}%` }} /></div>
                </div>
              ))
            )}

            {aba === "rota" && (
              porRota.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🗺️</div>
                  <p style={{ fontWeight: 600 }}>Nenhuma rota no período</p>
                </div>
              ) : porRota.map((r, i) => (
                <div key={i} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.origem || "—"} → {r.destino || "—"}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gold)", whiteSpace: "nowrap" }}>{formatMoney(r.valor)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>{r.fretes} frete{r.fretes === 1 ? "" : "s"}</div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${(Number(r.valor || 0) / maxRota) * 100}%` }} /></div>
                </div>
              ))
            )}

            {aba === "tipo" && (
              porTipo.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
                  <p style={{ fontWeight: 600 }}>Nenhuma carga no período</p>
                </div>
              ) : porTipo.map((t, i) => (
                <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--gold-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{iconCarga(t.tipo_carga)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{labelCarga(t.tipo_carga)}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>{t.fretes} frete{t.fretes === 1 ? "" : "s"}</div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${(Number(t.valor || 0) / maxTipo) * 100}%` }} /></div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gold)", whiteSpace: "nowrap" }}>{formatMoney(t.valor)}</div>
                </div>
              ))
            )}

            {aba === "extrato" && (
              extrato.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                  <p style={{ fontWeight: 600 }}>Nenhum frete no período</p>
                </div>
              ) : extrato.map((f) => {
                const cancelado = f.status === "cancelado";
                return (
                  <div key={f.id} className="card" style={cancelado ? { background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.3)" } : {}}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{f.origem || "—"} → {f.destino || "—"}</div>
                      <StatusBadge status={f.status} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
                      {iconCarga(f.tipo_carga)} {labelCarga(f.tipo_carga)} · {f.criado_em ? new Date(f.criado_em).toLocaleDateString("pt-BR") : "—"}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: cancelado ? "var(--red)" : "var(--gold)" }}>{formatMoney(f.valor)}</div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGAMENTOS — CONTRATANTE
// ─────────────────────────────────────────────
function PagamentosScreen({ onNavigate }) {
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

// ─────────────────────────────────────────────
// AVALIAÇÕES — lista de avaliações recebidas/dadas
// ─────────────────────────────────────────────
function AvaliacoesScreen({ onNavigate }) {
  const { user, token } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState(0);
  const isMot = user?.tipo === "motorista";

  useEffect(() => {
    const rota = isMot ? "/api/motoristas/avaliacoes" : "/api/contratantes/historico";
    api("GET", rota, null, token)
      .then(d => {
        if (isMot) {
          setAvaliacoes(Array.isArray(d) ? d : []);
          if (d?.length) setMedia((d.reduce((a, x) => a + Number(x.nota), 0) / d.length).toFixed(1));
        } else {
          // contratante: filtra fretes entregues que tem info de avaliação
          const entregues = (Array.isArray(d) ? d : []).filter(f => f.status === "entregue");
          setAvaliacoes(entregues);
        }
      })
      .catch(() => setAvaliacoes([]))
      .finally(() => setLoading(false));
  }, []);

  const Estrelas = ({ nota }) => (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ fontSize: 16, color: n <= nota ? "#C9A84C" : "var(--border)" }}>★</span>
      ))}
    </div>
  );

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate(-1)}>←</button>
        <h1>Avaliações</h1>
      </div>
      <div className="content">
        {isMot && avaliacoes.length > 0 && (
          <div className="card" style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: "var(--gold)" }}>{media}</div>
            <Estrelas nota={Math.round(media)} />
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 6 }}>{avaliacoes.length} avaliação{avaliacoes.length !== 1 ? "ões" : ""} recebida{avaliacoes.length !== 1 ? "s" : ""}</div>
          </div>
        )}
        {loading ? <Loading /> : avaliacoes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>
              {isMot ? "Nenhuma avaliação recebida" : "Nenhum frete concluído"}
            </p>
            <p style={{ fontSize: 13, marginTop: 6 }}>
              {isMot ? "As avaliações dos contratantes aparecerão aqui após cada entrega." : "Complete fretes para ver o histórico aqui."}
            </p>
          </div>
        ) : isMot ? (
          avaliacoes.map((a, i) => (
            <div key={a.id || i} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.avaliador_nome || "Contratante"}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                    {a.criado_em ? new Date(a.criado_em).toLocaleDateString("pt-BR") : "—"}
                  </div>
                </div>
                <Estrelas nota={Number(a.nota)} />
              </div>
              {a.comentario && (
                <div style={{ fontSize: 13, color: "var(--text2)", fontStyle: "italic", borderLeft: "3px solid var(--gold)", paddingLeft: 10, marginTop: 8 }}>
                  "{a.comentario}"
                </div>
              )}
            </div>
          ))
        ) : (
          avaliacoes.map((f, i) => (
            <div key={f.id || i} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{f.motorista_nome || "Motorista"}</div>
                <span className="badge badge-done">Entregue</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                {f.criado_em ? new Date(f.criado_em).toLocaleDateString("pt-BR") : "—"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// PAGAMENTO PIX — MercadoPago
// ─────────────────────────────────────────────
function PagamentoScreen({ data, onNavigate }) {
  const { token, user } = useAuth();
  const freteId = data?.freteId;
  const valorInicial = data?.valor || 0;
  const [metodo, setMetodo] = useState("pix"); // "pix" | "cartao"

  // ── Estado do fluxo Pix ──
  const [qrCode, setQrCode] = useState(null);
  const [pixKey, setPixKey] = useState(null);
  const [statusPix, setStatusPix] = useState("criando"); // criando | pending | approved | erro
  const [valor, setValor] = useState(valorInicial);
  const [copiado, setCopiado] = useState(false);
  const [erroPix, setErroPix] = useState("");
  const intervalRef = useRef(null);

  // ── Estado do fluxo Cartão ──
  const [salvarCartao, setSalvarCartao] = useState(true);
  const [statusCartao, setStatusCartao] = useState("idle"); // idle | approved
  const [erroCartao, setErroCartao] = useState("");

  const pago = statusPix === "approved" || statusCartao === "approved";

  useEffect(() => {
    if (metodo !== "pix") return;
    if (!freteId) { setErroPix("Frete não identificado"); setStatusPix("erro"); return; }
    if (qrCode || statusPix === "approved") return; // já criado, não recriar ao trocar de aba
    api("POST", `/api/pagamentos/criar-pix/${freteId}`, {}, token)
      .then(d => {
        setQrCode(d.qr_code);
        setPixKey(d.pix_key);
        setValor(d.valor || valorInicial);
        setStatusPix(d.status === "approved" ? "approved" : "pending");
        if (d.status !== "approved" && d.payment_id) {
          intervalRef.current = setInterval(async () => {
            try {
              const s = await api("GET", `/api/pagamentos/status/${d.payment_id}`, null, token);
              if (s.status === "approved") { setStatusPix("approved"); clearInterval(intervalRef.current); }
            } catch {}
          }, 5000);
        }
      })
      .catch(e => { setErroPix(e.message); setStatusPix("erro"); });
    return () => clearInterval(intervalRef.current);
  }, [metodo, freteId]);

  const copiar = () => {
    if (!pixKey) return;
    try {
      navigator.clipboard.writeText(pixKey);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {}
  };

  // Chamado pelo Card Payment Brick do Mercado Pago já com o token gerado no
  // navegador (número/validade/CVV nunca passam pelo nosso backend). Resolver
  // a promise = sucesso (Brick reseta o botão); rejeitar = falha (idem, mas o
  // Brick mostra o próprio aviso genérico — por isso também mostramos o nosso
  // alerta detalhado logo acima do formulário).
  const onCardSubmit = (formData) => new Promise(async (resolve, reject) => {
    setErroCartao("");
    try {
      const resp = await api("POST", `/api/pagamentos/criar-cartao/${freteId}`, {
        token: formData.token,
        payment_method_id: formData.payment_method_id,
        installments: formData.installments,
        issuer_id: formData.issuer_id,
        payer: formData.payer,
        salvarCartao,
      }, token);
      if (resp.status === "approved") {
        setStatusCartao("approved");
        resolve();
        return;
      }
      if (resp.status === "rejected") {
        setErroCartao("Pagamento recusado pela operadora do cartão. Verifique os dados ou tente outro cartão.");
      } else {
        setErroCartao(`Pagamento em análise (${resp.status_detail || resp.status}). Você será avisado quando for confirmado.`);
      }
      reject(new Error("Pagamento não aprovado"));
    } catch (e) {
      setErroCartao(e.message || "Erro ao processar pagamento com cartão.");
      reject(e);
    }
  });

  if (pago) return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("meus-fretes")}>←</button><h1>Pagamento</h1></div>
      <div className="content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "var(--green)", marginBottom: 8 }}>Pago!</div>
        <div style={{ color: "var(--text3)", marginBottom: 32, textAlign: "center" }}>Pagamento confirmado pelo MercadoPago.<br/>Aguardando motorista disponível.</div>
        <button className="btn btn-primary" onClick={() => onNavigate("meus-fretes")}>Ver Meus Fretes</button>
      </div>
    </div>
  );

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Pagar Frete</h1></div>
      <div className="content">
        <div className="carga-grid" style={{ marginBottom: 16, gridTemplateColumns: "1fr 1fr" }}>
          <div className={`carga-item ${metodo === "pix" ? "selected" : ""}`} onClick={() => setMetodo("pix")}>
            <div className="ci-icon">📱</div>
            <div className="ci-label" style={{ fontSize: 12 }}>Pix</div>
          </div>
          <div className={`carga-item ${metodo === "cartao" ? "selected" : ""}`} onClick={() => setMetodo("cartao")}>
            <div className="ci-icon">💳</div>
            <div className="ci-label" style={{ fontSize: 12 }}>Cartão</div>
          </div>
        </div>

        {metodo === "pix" && (<>
          {statusPix === "criando" && <Loading />}
          {erroPix && <div className="alert alert-error">{erroPix}</div>}
          {statusPix === "pending" && qrCode && (
            <>
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>Valor a pagar</div>
                <div style={{ fontSize: 40, fontWeight: 900, color: "var(--gold)", marginBottom: 20 }}>{formatMoney(valor)}</div>
                <img src={`data:image/png;base64,${qrCode}`} alt="QR Code Pix" style={{ width: 220, height: 220, margin: "0 auto 16px", display: "block", borderRadius: 12, border: "2px solid var(--border)" }} />
                <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 14 }}>Escaneie com o app do seu banco ou copie a chave</p>
                <button className="btn btn-primary" onClick={copiar}>
                  {copiado ? "✅ Copiado!" : "📋 Copiar Chave Pix"}
                </button>
              </div>
              <div className="card" style={{ borderLeft: "4px solid var(--gold)" }}>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Como pagar:</div>
                <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
                  1. Abra o app do seu banco<br/>
                  2. Escolha <strong>Pix → Pagar</strong><br/>
                  3. Leia o QR Code ou cole a chave copiada<br/>
                  4. Confirme o pagamento de <strong>{formatMoney(valor)}</strong><br/>
                  5. Esta tela confirma automaticamente ✓
                </div>
              </div>
              <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", opacity: 0.7 }} />
                Aguardando confirmação do pagamento...
              </div>
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text3)" }}>
                Powered by MercadoPago
              </div>
            </>
          )}
        </>)}

        {metodo === "cartao" && (<>
          <div className="card" style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>Valor a pagar</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "var(--gold)" }}>{formatMoney(valorInicial)}</div>
          </div>

          {erroCartao && <div className="alert alert-error">{erroCartao}</div>}

          {!MP_PUBLIC_KEY && (
            <div className="alert alert-error">Pagamento com cartão indisponível no momento: chave pública do Mercado Pago não configurada.</div>
          )}

          {MP_PUBLIC_KEY && freteId && (
            <div className="card">
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={salvarCartao} onChange={e => setSalvarCartao(e.target.checked)} />
                Salvar cartão para próximas vezes
              </label>
              <CardPayment
                initialization={{ amount: valorInicial, payer: { email: user?.email || "" } }}
                onSubmit={onCardSubmit}
                onError={(err) => console.error("[MP CardPayment]", err)}
              />
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text3)" }}>
                Powered by MercadoPago
              </div>
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────
function Router() {
  const { user } = useAuth();
  const [screen, setScreen] = useState("splash");
  const [screenData, setScreenData] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.tipo === "admin") setScreen("admin-dashboard");
      else if (user.tipo === "motorista") setScreen("home-motorista");
      else setScreen("home-contratante");
    } else {
      // ?admin=1 é a única forma de chegar na tela de login admin — não existe
      // link nenhum na interface, de propósito (não expor pra visitante comum).
      const params = new URLSearchParams(window.location.search);
      setScreen(params.get("admin") === "1" ? "login-admin" : "entrada");
    }
  }, [user?.id, user?.tipo]);

  const navigate = (to, data = null) => {
    if (to === -1) { setScreen(user?.tipo === "motorista" ? "home-motorista" : user?.tipo === "admin" ? "admin-dashboard" : "home-contratante"); return; }
    setScreenData(data); setScreen(to); window.scrollTo(0, 0);
  };

  const p = { onNavigate: navigate };

  switch (screen) {
    case "splash": return <SplashScreen {...p} />;
    case "entrada": return <EntradaScreen {...p} />;
    case "login": return <LoginScreen {...p} />;
    case "cadastro": return <CadastroScreen screenData={screenData} {...p} />;
    case "login-admin": return <AdminLoginScreen {...p} />;
    case "esqueci-senha": return <EsqueciSenhaScreen {...p} />;
    case "admin-dashboard": return <AdminDashboard {...p} />;
    case "admin-usuarios": return <AdminUsuarios {...p} />;
    case "admin-motorista-teste": return <AdminMotoristaTeste {...p} />;
    case "admin-seguradoras": return <AdminSeguradorasScreen {...p} />;
    case "admin-trocar-senha": return <AdminTrocarSenha {...p} />;
    case "home-contratante": return <ContratanteHome {...p} />;
    case "solicitar-frete": return <SolicitarFreteScreen screenData={screenData} {...p} />;
    case "buscar-motoristas": return <BuscarMotoristasScreen {...p} />;
    case "meus-fretes": return <MeusFretes {...p} />;
    case "detalhe-frete": return <DetalheFrete frete={screenData} {...p} />;
    case "propostas-recebidas": return <PropostasRecebidasScreen frete={screenData} {...p} />;
    case "perfil": return <PerfilContratante {...p} />;
    case "dados-pessoais-contratante": return <DadosPessoaisContratante {...p} />;
    case "pagamentos": return <PagamentosScreen {...p} />;
    case "financas-contratante": return <FinancasContratante {...p} />;
    case "home-motorista": return <MotoristaHome {...p} />;
    case "aceitar-frete": return <AceitarFreteScreen frete={screenData} {...p} />;
    case "disponibilidade-motorista": return <DisponibilidadeScreen {...p} />;
    case "seguro-motorista": return <SeguroScreen {...p} />;
    case "convites-motorista": return <ConvitesScreen {...p} />;
    case "minhas-propostas": return <MinhasPropostasScreen {...p} />;
    case "meus-fretes-motorista": return <MeusFretesMot {...p} />;
    case "em-transito": return <EmTransitoScreen frete={screenData} {...p} />;
    case "perfil-motorista": return <PerfilMotorista {...p} />;
    case "dados-pessoais-motorista": return <DadosPessoaisMotorista {...p} />;
    case "dados-caminhao": return <DadosCaminhaoMotorista {...p} />;
    case "financas-motorista": return <FinancasMotorista {...p} />;
    case "extrato-frete-motorista": return <ExtratoFreteMotoristaScreen dados={screenData} {...p} />;
    case "chat": return <ChatScreen data={screenData} {...p} />;
    case "avaliar": return <AvaliarScreen data={screenData} {...p} />;
    case "opcoes-motorista": return <OpcoesMotorista {...p} />;
    case "opcoes-contratante": return <OpcoesContratante {...p} />;
    case "termos": return <TermosScreen {...p} />;
    case "pagamento": return <PagamentoScreen data={screenData} {...p} />;
    case "avaliacoes": return <AvaliacoesScreen {...p} />;
    case "suporte": return <SuporteScreen {...p} />;
    case "sobre": return <SobreScreen {...p} />;
    case "privacidade": return <PrivacidadeScreen {...p} />;
    case "alterar-senha": return <AlterarSenhaScreen {...p} />;
    case "notificacoes": return <NotificacoesScreen {...p} />;
    default: return <SplashScreen {...p} />;
  }
}

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────
export default function App() {
  return (
    <>
      <style>{css}</style>
      <AuthProvider><Router /></AuthProvider>
    </>
  );
}