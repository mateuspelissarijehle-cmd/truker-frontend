import { ConteudoTermos } from "../../components/ConteudoTermos";

export function TermosScreen({ onNavigate }) {
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Termos de Uso</h1></div>
      <div className="content">
        <div className="card">
          <ConteudoTermos />
        </div>
      </div>
    </div>
  );
}
