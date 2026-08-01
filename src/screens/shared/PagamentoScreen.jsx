import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatMoney } from "../../utils/format";
import { Loading } from "../../components/Loading";

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

  const pago = statusPix === "approved";

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
            </>
          )}
        </>)}

        {metodo === "cartao" && (
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>Valor a pagar</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "var(--gold)", marginBottom: 20 }}>{formatMoney(valorInicial)}</div>
            <div className="alert alert-error">
              Pagamento com cartão está temporariamente indisponível enquanto migramos o processador
              de pagamento. Use o Pix por enquanto — assim que o novo fluxo de cartão estiver pronto,
              esta tela será atualizada.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
