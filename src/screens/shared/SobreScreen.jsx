import { useEffect, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { TrukerLogo } from "../../components/TrukerLogo";

// ─────────────────────────────────────────────
// SOBRE
// ─────────────────────────────────────────────
export function SobreScreen({ onNavigate }) {
  // No app nativo (Android/iOS), pega version/build de verdade do
  // versionName/versionCode do build.gradle (via @capacitor/app) -- antes
  // era um "1.0.0" fixo no código-fonte, que nunca mudava entre builds e não
  // servia pra saber qual versão estava instalada no celular. Na web (PWA),
  // getInfo() não é implementado pelo plugin -- mantém o fallback fixo.
  const [versao, setVersao] = useState("1.0.0");
  useEffect(() => {
    CapacitorApp.getInfo()
      .then((info) => setVersao(`${info.version} (build ${info.build})`))
      .catch(() => {});
  }, []);

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Sobre o TRUKER</h1></div>
      <div className="content">
        <div className="card" style={{ textAlign: "center", padding: "32px 20px" }}>
          <TrukerLogo size="md" />
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 16, lineHeight: 1.6 }}>
            Marketplace de frete pesado que conecta motoristas autônomos a contratantes no Brasil — garantindo o piso mínimo ANTT e eliminando km vazio.
          </p>
        </div>
        <div className="card">
          <div className="info-row"><span className="info-label">Versão</span><span className="info-value">{versao}</span></div>
          <div className="info-row"><span className="info-label">Plataforma</span><span className="info-value">PWA (Android · iOS)</span></div>
          <div className="info-row"><span className="info-label">Desenvolvedor</span><span className="info-value">Mateus Pelissari Jehle</span></div>
          <div className="info-row"><span className="info-label">Contato</span><span className="info-value" style={{ color: "var(--gold)" }}>suporte@getruker.com</span></div>
          <div className="info-row"><span className="info-label">Site</span><span className="info-value" style={{ color: "var(--gold)" }}>getruker.com</span></div>
        </div>
        <div className="card">
          <div className="card-title">⚖️ Legal</div>
          <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>
            Os valores mínimos de frete seguem a tabela oficial da ANTT (Portaria SUROC nº 4/2026), conforme exigido pela Lei 13.703/2018.
          </p>
          <div style={{ marginTop: 12, cursor: "pointer", color: "var(--gold)", fontSize: 13, fontWeight: 600 }} onClick={() => onNavigate("termos")}>
            📄 Termos de Uso e Política de Privacidade →
          </div>
        </div>
      </div>
    </div>
  );
}
