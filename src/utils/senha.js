// Política de senha forte -- espelha exatamente as regras do backend
// (truker-app/services/validacaoSenha.js), que é a fonte de verdade. Aqui é só
// pra feedback visual (checklist/indicador) no cadastro e na redefinição.

export const REQUISITOS_SENHA = [
  { chave: "tamanho", label: "Mínimo 8 caracteres", testa: (s) => s.length >= 8 },
  { chave: "maiuscula", label: "1 letra maiúscula", testa: (s) => /[A-Z]/.test(s) },
  { chave: "minuscula", label: "1 letra minúscula", testa: (s) => /[a-z]/.test(s) },
  { chave: "numero", label: "1 número", testa: (s) => /[0-9]/.test(s) },
  { chave: "especial", label: "1 caractere especial (! @ # $ …)", testa: (s) => /[^A-Za-z0-9]/.test(s) },
];

// true se a senha cumpre TODOS os requisitos.
export function senhaForte(senha) {
  const s = senha || "";
  return REQUISITOS_SENHA.every((r) => r.testa(s));
}
