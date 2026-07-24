// Mascara um dado sensível antes de mandar pro backend (ex.: chave Pix, conta
// bancária) — só os últimos dígitos ficam visíveis, o resto vira •. Usado pra
// nunca persistir o dado completo em "formas de pagamento salvas".
export function mascararDado(valor, visiveis = 4) {
  const v = (valor || "").toString().trim();
  if (!v) return "";
  if (v.length <= visiveis) return "•".repeat(v.length);
  return "••••" + v.slice(-visiveis);
}
// Mesma ideia, mas pra email (mantém domínio visível — senão fica ilegível).
export function mascararEmail(valor) {
  const v = (valor || "").trim();
  const [usuario, dominio] = v.split("@");
  if (!dominio) return mascararDado(v);
  return `${usuario.slice(0, 1)}${"•".repeat(Math.max(usuario.length - 1, 3))}@${dominio}`;
}

const maskCep = v => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

// Máscara de placa BR: antigo ABC-1234 ou Mercosul ABC1D23
const maskPlaca = v => {
  const s = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (s.length <= 3) return s;
  // Mercosul: 4ª posição é número, 5ª é letra
  if (s.length >= 5 && /\d/.test(s[3]) && /[A-Z]/.test(s[4])) {
    return s.slice(0, 3) + s.slice(3); // sem traço no Mercosul
  }
  // Antigo: ABC-1234
  return s.slice(0, 3) + "-" + s.slice(3);
};

export { maskCep, maskPlaca };
