import { TopNavDesktop } from "./TopNavDesktop";

// ─────────────────────────────────────────────
// DESKTOP SHELL — layout único pra toda rota desktop (solicitante e motorista)
// ─────────────────────────────────────────────
// Antes disso, cada tela remontava sua própria decisão de desktop (algumas
// via .screen-form-desktop, o Painel via .screen-wide com header próprio, a
// maioria nunca decidia nada) -- daí o mesmo app parecer "ora desktop, ora
// celular" dependendo de qual tela a pessoa estava (achado do Mateus,
// 08/09/2026, comparando com o site da Uber no PC). Este componente é o
// único lugar que decide "como é uma página desktop": barra fixa
// (TopNavDesktop) + container centralizado. Cada tela só entra com o
// conteúdo -- não recria header nem escolhe largura.
//
// wide=true escapa pro conteúdo usar a tela inteira abaixo da barra (só o
// Painel de Caminhões precisa disso, pelo mapa) -- toda outra tela usa o
// container centralizado padrão (max-width confortável de leitura, nem
// esticado cru nem cartão de celular minúsculo).
export function DesktopShell({ tipo, active, onNavigate, wide = false, children }) {
  return (
    <div className="only-desktop desktop-shell">
      <TopNavDesktop tipo={tipo} active={active} onNavigate={onNavigate} />
      <div className={wide ? "desktop-shell-body-wide" : "desktop-shell-body"}>
        {children}
      </div>
    </div>
  );
}
