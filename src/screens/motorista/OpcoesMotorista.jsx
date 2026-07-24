import { OpcoesMenu } from "../../components/OpcoesMenu";
import { BottomNavMotorista } from "../../components/BottomNavMotorista";

// ─────────────────────────────────────────────
// TELA OPÇÕES — Motorista
// ─────────────────────────────────────────────
export function OpcoesMotorista({ onNavigate }) {
  const itens = [
    { icon: "📨", label: "Minhas Propostas", sub: "Acompanhe negociações de valor", screen: "minhas-propostas" },
    { icon: "🎯", label: "Convites", sub: "Fretes que contratantes te convidaram direto", screen: "convites-motorista" },
    { icon: "📢", label: "Disponibilidade", sub: "Anuncie onde você está pra ser convidado", screen: "disponibilidade-motorista" },
    { icon: "💬", label: "Suporte", sub: "Fale com a gente", screen: "suporte" },
    { icon: "ℹ️", label: "Sobre o app", sub: "Versão, contato e créditos", screen: "sobre" },
  ];
  return (
    <OpcoesMenu itens={itens} onNavigate={onNavigate}>
      <BottomNavMotorista active="opcoes" onNavigate={onNavigate} />
    </OpcoesMenu>
  );
}
