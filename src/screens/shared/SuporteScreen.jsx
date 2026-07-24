export function SuporteScreen({ onNavigate }) {
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Suporte</h1></div>
      <div className="content">
        <div className="card" style={{ textAlign: "center", padding: "32px 20px" }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>💬</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Fale com a gente</div>
          <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>
            Dúvidas, problemas ou sugestões? Entre em contato diretamente com o desenvolvedor do TRUKER.
          </p>
        </div>
        <div className="card">
          <div className="card-title">📧 E-mail</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gold)" }}>suporte@getruker.com</div>
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>Respondemos em até 24 horas úteis.</p>
        </div>
        <div className="card">
          <div className="card-title">🌐 Site</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gold)" }}>getruker.com</div>
        </div>
      </div>
    </div>
  );
}
