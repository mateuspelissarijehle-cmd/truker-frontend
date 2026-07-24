import { IconHome, IconActivity, IconAccount, IconOptions } from "./NavIcons";

// ─────────────────────────────────────────────
// BOTTOM NAVS — estilo Uber 4 abas
// ─────────────────────────────────────────────
export function BottomNavContratante({ active, onNavigate }) {
  const tabs = [
    { id: "inicio", label: "Início", screen: "home-contratante", Icon: IconHome },
    { id: "atividade", label: "Atividade", screen: "meus-fretes", Icon: IconActivity },
    { id: "conta", label: "Conta", screen: "perfil", Icon: IconAccount },
    { id: "opcoes", label: "Opções", screen: "opcoes-contratante", Icon: IconOptions },
  ];
  return (
    <nav className="bottom-nav">
      {tabs.map(({ id, label, screen, Icon }) => (
        <button key={id} className={`nav-item ${active === id ? "active" : ""}`} onClick={() => onNavigate(screen)}>
          <Icon active={active === id} />
          <span style={{ fontSize: 9 }}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
