import { IconHome, IconActivity, IconAccount, IconOptions } from "./NavIcons";

export function BottomNavMotorista({ active, onNavigate }) {
  const tabs = [
    { id: "inicio", label: "Início", screen: "home-motorista", Icon: IconHome },
    { id: "atividade", label: "Atividade", screen: "meus-fretes-motorista", Icon: IconActivity },
    { id: "conta", label: "Conta", screen: "perfil-motorista", Icon: IconAccount },
    { id: "opcoes", label: "Opções", screen: "opcoes-motorista", Icon: IconOptions },
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
