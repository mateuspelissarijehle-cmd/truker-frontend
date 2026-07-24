import { useState } from "react";
import { api } from "../services/api";

// Lógica compartilhada entre EsqueciSenhaScreen e AlterarSenhaScreen: os
// mesmos 3 passos (enviar código → verificar código → redefinir) e as
// mesmas chamadas de API, variando só o `email` e o que acontece ao concluir.
export function useRedefinicaoSenha(email) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codigoTeste, setCodigoTeste] = useState(null);

  const enviarCodigo = async () => {
    if (!email) return setError("Digite seu email");
    setError(""); setLoading(true);
    try {
      const resp = await api("POST", "/api/auth/esqueci-senha", { email });
      if (resp.codigo_teste) setCodigoTeste(resp.codigo_teste);
      setStep(2);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const verificarCodigo = async () => {
    if (code.length < 6) return setError("Digite o código de 6 dígitos");
    setError(""); setLoading(true);
    try {
      await api("POST", "/api/auth/verificar-codigo-senha", { email, codigo: code });
      setStep(3);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const redefinir = async (aoConcluir) => {
    if (!novaSenha || novaSenha.length < 6) return setError("A senha deve ter pelo menos 6 caracteres");
    setError(""); setLoading(true);
    try {
      await api("POST", "/api/auth/redefinir-senha", { email, codigo: code, novaSenha });
      setStep(4);
      if (aoConcluir) aoConcluir();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return { step, code, setCode, novaSenha, setNovaSenha, loading, error, codigoTeste, enviarCodigo, verificarCodigo, redefinir };
}
