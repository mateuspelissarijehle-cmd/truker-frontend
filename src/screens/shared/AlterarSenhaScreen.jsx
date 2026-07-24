import { useAuth } from "../../context/AuthContext";
import { useRedefinicaoSenha } from "../../hooks/useRedefinicaoSenha";
import { PasswordInput } from "../../components/PasswordInput";

// ─────────────────────────────────────────────
// ALTERAR SENHA (usuário logado — reaproveita o fluxo de recuperação)
// ─────────────────────────────────────────────
export function AlterarSenhaScreen({ onNavigate }) {
  const { user } = useAuth();
  const email = user?.email || "";
  const { step, code, setCode, novaSenha, setNovaSenha, loading, error, codigoTeste, enviarCodigo, verificarCodigo, redefinir } = useRedefinicaoSenha(email);

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("privacidade")}>←</button><h1>Alterar Senha</h1></div>
      <div className="content">
        {step < 4 && (
          <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>
            {step === 1 && <>Vamos enviar um código de verificação para <strong style={{ color: "var(--text)" }}>{email}</strong>.</>}
            {step === 2 && <>Código enviado para <strong style={{ color: "var(--gold)" }}>{email}</strong>. Digite abaixo.</>}
            {step === 3 && "Defina sua nova senha."}
          </p>
        )}
        {step === 2 && codigoTeste && (
          <div style={{ background: "rgba(201,168,76,0.1)", border: "1px dashed var(--gold)", borderRadius: 10, padding: "14px 12px", marginBottom: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🧪 Modo teste — email indisponível</div>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 14, color: "var(--text)", fontFamily: "monospace" }}>{codigoTeste}</div>
          </div>
        )}
        {step === 4 && (
          <div style={{ textAlign: "center", paddingTop: 20 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Senha alterada!</div>
            <div style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>Sua senha foi redefinida com sucesso.</div>
            <button className="btn btn-primary" onClick={() => onNavigate("privacidade")}>Voltar</button>
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
        {step === 1 && (
          <button className="btn btn-primary" onClick={enviarCodigo} disabled={loading}>{loading ? "Enviando..." : "Enviar código"}</button>
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
            <button className="btn btn-primary" onClick={() => redefinir()} disabled={loading}>{loading ? "Salvando..." : "Redefinir senha"}</button>
          </>
        )}
      </div>
    </div>
  );
}
