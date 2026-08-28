import { OpcoesMenu } from "../../components/OpcoesMenu";
import { BottomNavContratante } from "../../components/BottomNavContratante";

// ─────────────────────────────────────────────
// TELA OPÇÕES — Contratante
// ─────────────────────────────────────────────
export function OpcoesContratante({ onNavigate }) {
  const itens = [
    { icon: "🚛", label: "Painel de Caminhões", sub: "Acompanhe todos os fretes em rota ao vivo — melhor numa tela grande", screen: "painel-caminhoes" },
    { icon: "💬", label: "Suporte", sub: "Fale com a gente", screen: "suporte" },
    { icon: "ℹ️", label: "Sobre o app", sub: "Versão, contato e créditos", screen: "sobre" },
  ];
  return (
    <OpcoesMenu itens={itens} onNavigate={onNavigate}>
      <BottomNavContratante active="opcoes" onNavigate={onNavigate} />
    </OpcoesMenu>
  );
}
