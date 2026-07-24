import { useState } from "react";
import { useRedefinicaoSenha } from "../../hooks/useRedefinicaoSenha";
import { PasswordInput } from "../../components/PasswordInput";

// ─────────────────────────────────────────────
// ESQUECI SENHA — ✅ REAL (integrado ao backend)
// ─────────────────────────────────────────────
export function EsqueciSenhaScreen({ onNavigate }) {
  const [email, setEmail] = useState("");
  const { step, code, setCode, novaSenha, setNovaSenha, loading, error, codigoTeste, enviarCodigo, verificarCodigo, redefinir } = useRedefinicaoSenha(email);

  const finalizar = () => redefinir(() => setTimeout(() => onNavigate("login"), 3000));

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <button className="back-btn" style={{ marginBottom: 24 }} onClick={() => onNavigate("login")}>← Voltar</button>
      <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Recuperar senha</div>
      {step === 1 && <p style={{ color: "var(--text3)", fontSize: 14, marginBottom: 24 }}>Digite seu email para receber o código de recuperação.</p>}
      {step === 2 && <p style={{ color: "var(--text3)", fontSize: 14, marginBottom: 24 }}>Código enviado para <strong style={{ color: "var(--gold)" }}>{email}</strong>. Digite abaixo.</p>}
      {step === 2 && codigoTeste && (
        <div style={{ background: "rgba(201,168,76,0.1)", border: "1px dashed var(--gold)", borderRadius: 10, padding: "14px 12px", marginBottom: 14, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🧪 Modo teste — email indisponível</div>
          <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 14, color: "var(--text)", fontFamily: "monospace" }}>{codigoTeste}</div>
        </div>
      )}
      {step === 3 && <p style={{ color: "var(--text3)", fontSize: 14, marginBottom: 24 }}>Defina sua nova senha.</p>}
      {step === 4 && (
        <div style={{ textAlign: "center", paddingTop: 20 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Senha redefinida!</div>
          <div style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>Redirecionando para o login em instantes...</div>
          <button className="btn btn-primary" onClick={() => onNavigate("login")}>Ir para o Login agora</button>
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {step === 1 && (
        <>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" /></div>
          <button className="btn btn-primary" onClick={enviarCodigo} disabled={loading}>{loading ? "Enviando..." : "Enviar código"}</button>
        </>
      )}
      {step === 2 && (
        <>
          <div className="field">
            <label>Código de verificação</label>
            <input
              type="text" inputMode="numeric" maxLength={6}
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              style={{ fontSize: 28, letterSpacing: 12, textAlign: "center", fontFamily: "monospace" }}
            />
          </div>
          <button className="btn btn-primary" onClick={verificarCodigo} disabled={loading}>{loading ? "Verificando..." : "Verificar código"}</button>
          <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={enviarCodigo} disabled={loading}>🔄 Reenviar código</button>
        </>
      )}
      {step === 3 && (
        <>
          <div className="field"><label>Nova senha</label><PasswordInput value={novaSenha} onChange={e => setNovaSenha(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={finalizar} disabled={loading}>{loading ? "Salvando..." : "Redefinir senha"}</button>
        </>
      )}
    </div>
  );
}
