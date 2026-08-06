import { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { useAuth } from "../../context/useAuth";
import { api } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { Loading } from "../../components/Loading";

const isNative = Capacitor.isNativePlatform();

// Abre a página hospedada do Checkout Asaas -- no app nativo via plugin @capacitor/browser
// (abre num navegador in-app e devolve o foco pro TRUKER ao fechar); no navegador/PWA numa
// nova aba, senão o redirect direto perderia a tela de pagamento.
async function abrirUrlCheckout(url) {
  if (isNative) await Browser.open({ url });
  else window.open(url, "_blank");
}

// ─────────────────────────────────────────────
// PAGAMENTO PIX/CARTÃO — Asaas
// ─────────────────────────────────────────────
export function PagamentoScreen({ data, onNavigate }) {
  const { token } = useAuth();
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

  // ── Estado do fluxo Cartão (Checkout Asaas hospedado) ──
  const [statusCartao, setStatusCartao] = useState("idle"); // idle | criando | aguardando | approved | erro
  const [erroCartao, setErroCartao] = useState("");
  const checkoutAbertoRef = useRef(false);

  const pago = statusPix === "approved" || statusCartao === "approved";

  const abrirCheckoutCartao = async () => {
    if (!freteId) { setErroCartao("Frete não identificado"); setStatusCartao("erro"); return; }
    setErroCartao("");
    setStatusCartao("criando");
    try {
      const d = await api("POST", `/api/pagamentos/checkout-cartao/${freteId}`, {}, token);
      if (d.status === "approved") { setStatusCartao("approved"); return; } // conta_teste (QA)
      if (!d.checkout_url) throw new Error("Checkout não retornou URL de pagamento");
      checkoutAbertoRef.current = true;
      setStatusCartao("aguardando");
      await abrirUrlCheckout(d.checkout_url);
    } catch (e) {
      setErroCartao(e.message);
      setStatusCartao("erro");
    }
  };

  // A confirmação real do pagamento chega via webhook (evento CHECKOUT_PAID), não existe
  // payment_id no cliente antes disso -- então ao voltar o foco pro app (o pagador fechou/voltou
  // da aba ou do navegador in-app do checkout), reconsulta a lista de fretes e olha
  // status_pagamento pelo freteId, mesma fonte que as outras telas já usam.
  const reconsultarStatusCartao = useCallback(async () => {
    if (!checkoutAbertoRef.current || !freteId) return;
    try {
      const fretes = await api("GET", "/api/fretes", null, token);
      const frete = Array.isArray(fretes) ? fretes.find(f => String(f.id) === String(freteId)) : null;
      if (frete?.status_pagamento === "approved") setStatusCartao("approved");
    } catch { /* reconsulta best-effort ao voltar o foco; falha silenciosa não bloqueia o usuário */ }
  }, [freteId, token]);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === "visible") reconsultarStatusCartao(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", reconsultarStatusCartao);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", reconsultarStatusCartao);
    };
  }, [reconsultarStatusCartao]);

  // Sem freteId não há o que fazer -- nesse caso a mensagem de erro é derivada
  // direto no render (ver `semFreteId` abaixo), sem precisar de estado/efeito.
  useEffect(() => {
    if (metodo !== "pix" || !freteId) return;
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
            } catch { /* poll de status falhou, tenta de novo no próximo intervalo */ }
          }, 5000);
        }
      })
      .catch(e => { setErroPix(e.message); setStatusPix("erro"); });
    return () => clearInterval(intervalRef.current);
    // `qrCode`/`statusPix` são lidos só como guarda anti-recriação (não recriar o Pix ao
    // trocar de aba e voltar) -- incluí-los faria o efeito reagir à SUA PRÓPRIA escrita
    // (setQrCode/setStatusPix logo abaixo), recriando o efeito e derrubando o interval de
    // polling quase imediatamente após criado. `valorInicial` só é usado como fallback
    // dentro do .then() e raramente muda depois do mount; deixado de fora de propósito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metodo, freteId, token]);

  const copiar = () => {
    if (!pixKey) return;
    try {
      navigator.clipboard.writeText(pixKey);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch { /* clipboard indisponível/negado, ignora */ }
  };

  if (pago) return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("meus-fretes")}>←</button><h1>Pagamento</h1></div>
      <div className="content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "var(--green)", marginBottom: 8 }}>Pago!</div>
        <div style={{ color: "var(--text3)", marginBottom: 32, textAlign: "center" }}>Pagamento confirmado.<br/>Aguardando motorista disponível.</div>
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
          {statusPix === "criando" && freteId && <Loading />}
          {(erroPix || !freteId) && <div className="alert alert-error">{erroPix || "Frete não identificado"}</div>}
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
            </>
          )}
        </>)}

        {metodo === "cartao" && (
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>Valor a pagar</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "var(--gold)", marginBottom: 20 }}>{formatMoney(valorInicial)}</div>

            {erroCartao && <div className="alert alert-error" style={{ marginBottom: 16 }}>{erroCartao}</div>}

            {statusCartao === "criando" && <Loading />}

            {(statusCartao === "idle" || statusCartao === "erro") && (
              <button className="btn btn-primary" onClick={abrirCheckoutCartao}>
                💳 Pagar com Cartão
              </button>
            )}

            {statusCartao === "aguardando" && (
              <>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8, marginBottom: 16 }}>
                  Complete o pagamento na página que abriu (à vista ou parcelado em até 6x).<br/>
                  Assim que confirmarmos, esta tela atualiza sozinha.
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", opacity: 0.7 }} />
                  Aguardando confirmação do pagamento...
                </div>
                <button className="btn btn-secondary" onClick={reconsultarStatusCartao}>Já paguei, verificar</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
