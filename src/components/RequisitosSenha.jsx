import { REQUISITOS_SENHA } from "../utils/senha";

// Checklist visual dos requisitos de senha forte. Cada item fica verde quando
// atendido. Não bloqueia nada sozinho -- só dá feedback; o bloqueio de avançar
// fica na tela que usa (via senhaForte()), e o backend valida de novo.
export function RequisitosSenha({ senha = "" }) {
  return (
    <div style={{ marginTop: 10, marginBottom: 4 }}>
      {REQUISITOS_SENHA.map((r) => {
        const ok = r.testa(senha);
        return (
          <div key={r.chave} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 3, color: ok ? "var(--green)" : "var(--text3)" }}>
            <span style={{ fontSize: 13, width: 14, textAlign: "center" }}>{ok ? "✓" : "○"}</span>
            <span>{r.label}</span>
          </div>
        );
      })}
    </div>
  );
}
