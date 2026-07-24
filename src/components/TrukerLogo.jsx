// ─────────────────────────────────────────────
// LOGO COMPONENT
// ─────────────────────────────────────────────
export function TrukerLogo({ size = "md", noTagline = false }) {
  const sizes = {
    sm: { t: 28, box: 52, name: 16, tagline: false },
    md: { t: 44, box: 80, name: 26, tagline: true },
    lg: { t: 64, box: 112, name: 38, tagline: true },
  };
  const s = sizes[size] || sizes.md;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: s.box, height: s.box, borderRadius: s.box * 0.22,
        background: "linear-gradient(145deg, #D4A843, #9A7930, #C9A84C)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        marginBottom: 10,
        boxShadow: "0 4px 20px rgba(168,135,58,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}>
        <span style={{ fontSize: s.t, fontWeight: 800, color: "#1A1209", fontFamily: "Inter, sans-serif", lineHeight: 1, letterSpacing: -2 }}>T</span>
      </div>
      <div style={{ fontSize: s.name, fontWeight: 700, letterSpacing: 7, color: "#1A1209", fontFamily: "Inter, sans-serif", textTransform: "uppercase" }}>TRUKER</div>
      {s.tagline && !noTagline && <div style={{ fontSize: 12, color: "#8A7E6E", marginTop: 5, letterSpacing: 0.5 }}>Fretes pesados, sem km vazio</div>}
    </div>
  );
}
