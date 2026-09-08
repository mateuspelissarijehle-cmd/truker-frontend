import { useAuth } from "../context/useAuth";
import { Avatar } from "./Avatar";
import { IconHome, IconActivity, IconOptions } from "./NavIcons";

// ─────────────────────────────────────────────
// TOP NAV DESKTOP — barra fixa compartilhada por TODAS as rotas desktop
// ─────────────────────────────────────────────
// Item 6 (08/09/2026, redirecionamento amplo do Mateus após ver o site da
// Uber): até aqui, cada tela decidia sozinha se/como tratar desktop --
// algumas ganharam uma versão larga própria (Solicitar Frete, Painel), a
// maioria nunca decidiu nada e continuava renderizando o cartão mobile cru
// dentro de uma janela de PC (assim que ele viu em Meus Fretes/Conta/Home).
// Essa barra + <DesktopShell> (mesmo arquivo de componentes) é o "shell"
// único: navegação fixa igual em toda página, pensada uma vez só. Ícones
// reaproveitados do NavIcons.jsx (mesma linguagem visual do bottom-nav
// mobile) -- consistência entre os 2 modos, não dois designs concorrentes.
const NAV_CONTRATANTE = [
  { id: "inicio", label: "Início", screen: "painel-caminhoes", Icon: IconHome },
  { id: "atividade", label: "Meus Fretes", screen: "meus-fretes", Icon: IconActivity },
  { id: "buscar", label: "Buscar Motoristas", screen: "buscar-motoristas", Icon: null },
  { id: "opcoes", label: "Opções", screen: "opcoes-contratante", Icon: IconOptions },
];
const NAV_MOTORISTA = [
  { id: "inicio", label: "Início", screen: "home-motorista", Icon: IconHome },
  { id: "atividade", label: "Meus Fretes", screen: "meus-fretes-motorista", Icon: IconActivity },
];

export function TopNavDesktop({ tipo, active, onNavigate }) {
  const { user } = useAuth();
  const itens = tipo === "motorista" ? NAV_MOTORISTA : NAV_CONTRATANTE;
  const contaScreen = tipo === "motorista" ? "perfil-motorista" : "perfil";

  return (
    <header className="desktop-topnav">
      <div className="desktop-topnav-inner">
        <button className="desktop-topnav-brand" onClick={() => onNavigate(-1)}>
          <span className="desktop-topnav-logo">T</span>
          <span className="desktop-topnav-wordmark">TRUKER</span>
        </button>
        <nav className="desktop-topnav-links">
          {itens.map(({ id, label, screen, Icon }) => (
            <button
              key={id}
              className={`desktop-topnav-link ${active === id ? "active" : ""}`}
              onClick={() => onNavigate(screen)}
            >
              {Icon && <Icon active={active === id} />}
              {label}
            </button>
          ))}
        </nav>
        {tipo === "contratante" && (
          <button className="btn btn-primary desktop-topnav-cta" onClick={() => onNavigate("solicitar-frete")}>
            + Solicitar Frete
          </button>
        )}
        <button className={`desktop-topnav-user ${active === "conta" ? "active" : ""}`} onClick={() => onNavigate(contaScreen)}>
          <Avatar nome={user?.nome} size={32} />
          <span className="desktop-topnav-user-nome">{user?.nome?.split(" ")[0] || "Conta"}</span>
        </button>
      </div>
    </header>
  );
}
