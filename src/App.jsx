import { useState, useEffect, createContext, useContext } from "react";

// ─────────────────────────────────────────────
// CONFIG DA API (Railway)
// ─────────────────────────────────────────────
const API_BASE = "https://truker-app-production.up.railway.app";

async function api(method, path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || JSON.stringify(data) || "Erro na requisição");
  return data;
}

// ─────────────────────────────────────────────
// CONTEXTO AUTH
// ─────────────────────────────────────────────
const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("truker_user")); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("truker_token") || null);

  const login = (userData, tok) => {
    setUser(userData);
    setToken(tok);
    localStorage.setItem("truker_user", JSON.stringify(userData));
    localStorage.setItem("truker_token", tok);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("truker_user");
    localStorage.removeItem("truker_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────
// ESTILOS GLOBAIS
// ─────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --orange: #F97316;
    --orange-dark: #EA6C0A;
    --black: #0A0A0A;
    --dark: #141414;
    --dark2: #1E1E1E;
    --dark3: #2A2A2A;
    --gray: #666;
    --gray2: #999;
    --white: #FAFAFA;
    --green: #22C55E;
    --red: #EF4444;
    --blue: #3B82F6;
  }

  body {
    font-family: 'Barlow', sans-serif;
    background: var(--black);
    color: var(--white);
    min-height: 100vh;
    max-width: 430px;
    margin: 0 auto;
  }

  .screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding-bottom: 80px;
  }

  .header {
    background: var(--dark);
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid #222;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .header h1 {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 22px;
    font-weight: 800;
    color: var(--orange);
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .header .back-btn {
    background: none;
    border: none;
    color: var(--white);
    font-size: 22px;
    cursor: pointer;
    padding: 4px;
    line-height: 1;
  }

  .content { flex: 1; padding: 20px; }

  /* Cards */
  .card {
    background: var(--dark2);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    border: 1px solid #2a2a2a;
  }

  .card-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--gray2);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }

  /* Botões */
  .btn {
    width: 100%;
    padding: 15px;
    border-radius: 10px;
    border: none;
    font-family: 'Barlow', sans-serif;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .btn:active { transform: scale(0.97); }

  .btn-primary {
    background: var(--orange);
    color: #fff;
  }

  .btn-primary:hover { background: var(--orange-dark); }

  .btn-secondary {
    background: var(--dark3);
    color: var(--white);
    border: 1px solid #333;
  }

  .btn-outline {
    background: transparent;
    color: var(--orange);
    border: 2px solid var(--orange);
  }

  .btn-danger {
    background: var(--red);
    color: #fff;
  }

  .btn-sm {
    padding: 10px 16px;
    width: auto;
    font-size: 13px;
  }

  /* Inputs */
  .field { margin-bottom: 16px; }

  .field label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--gray2);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 6px;
  }

  .field input, .field select, .field textarea {
    width: 100%;
    background: var(--dark3);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 13px 14px;
    color: var(--white);
    font-family: 'Barlow', sans-serif;
    font-size: 15px;
    outline: none;
    transition: border-color 0.15s;
  }

  .field input:focus, .field select:focus, .field textarea:focus {
    border-color: var(--orange);
  }

  .field input::placeholder { color: #555; }

  .field select option { background: var(--dark2); }

  /* Badge status */
  .badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-pending { background: #F97316/20; color: var(--orange); border: 1px solid var(--orange); }
  .badge-active { background: rgba(34,197,94,0.15); color: var(--green); border: 1px solid var(--green); }
  .badge-done { background: rgba(99,102,241,0.15); color: #818CF8; border: 1px solid #818CF8; }
  .badge-cancel { background: rgba(239,68,68,0.15); color: var(--red); border: 1px solid var(--red); }

  /* Bottom Nav */
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 430px;
    background: var(--dark);
    border-top: 1px solid #222;
    display: flex;
    z-index: 100;
  }

  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 8px;
    gap: 4px;
    cursor: pointer;
    border: none;
    background: none;
    color: var(--gray);
    font-family: 'Barlow', sans-serif;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: color 0.15s;
  }

  .nav-item.active { color: var(--orange); }

  .nav-item span { font-size: 20px; }

  /* Info row */
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #222;
  }
  .info-row:last-child { border-bottom: none; }
  .info-label { font-size: 13px; color: var(--gray2); }
  .info-value { font-size: 14px; font-weight: 600; color: var(--white); }

  /* Alert */
  .alert {
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 16px;
  }
  .alert-error { background: rgba(239,68,68,0.1); color: var(--red); border: 1px solid rgba(239,68,68,0.3); }
  .alert-success { background: rgba(34,197,94,0.1); color: var(--green); border: 1px solid rgba(34,197,94,0.3); }

  /* Logo splash */
  .logo-big {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 56px;
    font-weight: 800;
    color: var(--orange);
    letter-spacing: 4px;
    text-transform: uppercase;
  }

  /* Frete card */
  .frete-card {
    background: var(--dark2);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    border: 1px solid #2a2a2a;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .frete-card:hover { border-color: var(--orange); }
  .frete-card .route {
    font-size: 16px;
    font-weight: 700;
    margin: 8px 0 4px;
  }
  .frete-card .meta {
    font-size: 13px;
    color: var(--gray2);
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .frete-card .price {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 24px;
    font-weight: 800;
    color: var(--orange);
  }

  /* Stars */
  .stars { color: #FBBF24; letter-spacing: 2px; }

  /* Loading */
  .loading {
    text-align: center;
    padding: 40px;
    color: var(--gray2);
    font-size: 14px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #333;
    border-top-color: var(--orange);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 12px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Divider */
  .divider {
    height: 1px;
    background: #222;
    margin: 20px 0;
  }

  /* Tag tipo */
  .tipo-tag {
    display: inline-flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  .tipo-tag button {
    padding: 8px 20px;
    border-radius: 20px;
    border: 1px solid #333;
    background: var(--dark3);
    color: var(--gray2);
    font-family: 'Barlow', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .tipo-tag button.active {
    background: var(--orange);
    color: #fff;
    border-color: var(--orange);
  }

  /* Chat */
  .chat-area {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .msg {
    max-width: 80%;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.4;
  }
  .msg-me {
    background: var(--orange);
    color: #fff;
    align-self: flex-end;
    border-bottom-right-radius: 2px;
  }
  .msg-other {
    background: var(--dark3);
    color: var(--white);
    align-self: flex-start;
    border-bottom-left-radius: 2px;
  }
  .msg-time {
    font-size: 10px;
    opacity: 0.6;
    margin-top: 4px;
    text-align: right;
  }
  .chat-input {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    background: var(--dark);
    border-top: 1px solid #222;
  }
  .chat-input input {
    flex: 1;
    background: var(--dark3);
    border: 1px solid #333;
    border-radius: 20px;
    padding: 10px 16px;
    color: var(--white);
    font-family: 'Barlow', sans-serif;
    font-size: 14px;
    outline: none;
  }
  .chat-send {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: var(--orange);
    border: none;
    color: #fff;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Map placeholder */
  .map-placeholder {
    background: var(--dark3);
    border-radius: 12px;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 8px;
    color: var(--gray2);
    font-size: 14px;
    border: 1px dashed #333;
    margin-bottom: 16px;
  }
  .map-placeholder .icon { font-size: 32px; }

  /* Avaliação */
  .star-rating { display: flex; gap: 8px; font-size: 32px; cursor: pointer; }
  .star-rating span { transition: transform 0.1s; }
  .star-rating span:hover { transform: scale(1.2); }
`;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatMoney(v) {
  return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function StatusBadge({ status }) {
  const map = {
    pendente: ["badge-pending", "Pendente"],
    aceito: ["badge-active", "Aceito"],
    em_transito: ["badge-active", "Em Trânsito"],
    entregue: ["badge-done", "Entregue"],
    cancelado: ["badge-cancel", "Cancelado"],
  };
  const [cls, label] = map[status] || ["badge-pending", status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function Loading() {
  return (
    <div className="loading">
      <div className="spinner" />
      Carregando...
    </div>
  );
}

// ─────────────────────────────────────────────
// SPLASH / ONBOARDING
// ─────────────────────────────────────────────
function SplashScreen({ onNavigate }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: "linear-gradient(180deg, #141414 0%, #0A0A0A 100%)",
      }}
    >
      <div style={{ marginBottom: 8, fontSize: 48 }}>🚛</div>
      <div className="logo-big">TRUKER</div>
      <p style={{ color: "#666", fontSize: 14, marginTop: 8, marginBottom: 48, textAlign: "center" }}>
        Plataforma de fretes pesados
      </p>
      <button className="btn btn-primary" onClick={() => onNavigate("login")}>
        Entrar
      </button>
      <button
        className="btn btn-secondary"
        style={{ marginTop: 12 }}
        onClick={() => onNavigate("cadastro")}
      >
        Criar conta
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// AUTH — LOGIN
// ─────────────────────────────────────────────
function LoginScreen({ onNavigate }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    setError("");
    if (!form.email || !form.senha) return setError("Preencha todos os campos");
    setLoading(true);
    try {
      const data = await api("POST", "/api/auth/login", form);
      login(data.user || data.usuario, data.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 40 }}>🚛</div>
        <div className="logo-big" style={{ fontSize: 40 }}>TRUKER</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label>Email</label>
        <input
          type="email"
          placeholder="seu@email.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Senha</label>
        <input
          type="password"
          placeholder="••••••••"
          value={form.senha}
          onChange={(e) => setForm({ ...form, senha: e.target.value })}
        />
      </div>
      <button className="btn btn-primary" onClick={handle} disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </button>
      <p style={{ textAlign: "center", marginTop: 20, color: "#666", fontSize: 14 }}>
        Não tem conta?{" "}
        <span
          style={{ color: "var(--orange)", cursor: "pointer", fontWeight: 600 }}
          onClick={() => onNavigate("cadastro")}
        >
          Cadastre-se
        </span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// AUTH — CADASTRO
// ─────────────────────────────────────────────
function CadastroScreen({ onNavigate }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ nome: "", email: "", senha: "", tipo: "contratante", telefone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    setError("");
    if (!form.nome || !form.email || !form.senha) return setError("Preencha todos os campos");
    setLoading(true);
    try {
      const data = await api("POST", "/api/auth/cadastro", form);
      login(data.user || data.usuario, data.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div className="logo-big" style={{ fontSize: 36 }}>TRUKER</div>
        <p style={{ color: "#666", fontSize: 14, marginTop: 4 }}>Crie sua conta</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label>Tipo de conta</label>
        <div className="tipo-tag">
          <button
            className={form.tipo === "contratante" ? "active" : ""}
            onClick={() => setForm({ ...form, tipo: "contratante" })}
          >
            🏢 Contratante
          </button>
          <button
            className={form.tipo === "motorista" ? "active" : ""}
            onClick={() => setForm({ ...form, tipo: "motorista" })}
          >
            🚛 Motorista
          </button>
        </div>
      </div>

      {["nome", "email", "telefone", "senha"].map((f) => (
        <div className="field" key={f}>
          <label>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
          <input
            type={f === "senha" ? "password" : f === "email" ? "email" : "text"}
            placeholder={f === "telefone" ? "(41) 99999-9999" : ""}
            value={form[f]}
            onChange={(e) => setForm({ ...form, [f]: e.target.value })}
          />
        </div>
      ))}

      <button className="btn btn-primary" onClick={handle} disabled={loading}>
        {loading ? "Criando conta..." : "Criar Conta"}
      </button>
      <p style={{ textAlign: "center", marginTop: 16, color: "#666", fontSize: 14 }}>
        Já tem conta?{" "}
        <span
          style={{ color: "var(--orange)", cursor: "pointer", fontWeight: 600 }}
          onClick={() => onNavigate("login")}
        >
          Entrar
        </span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONTRATANTE — HOME
// ─────────────────────────────────────────────
function ContratanteHome({ onNavigate }) {
  const { user } = useAuth();
  const [fretes, setFretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    api("GET", "/api/fretes", null, token)
      .then(setFretes)
      .catch(() => setFretes([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    pendentes: fretes.filter((f) => f.status === "pendente").length,
    emTransito: fretes.filter((f) => f.status === "em_transito").length,
    entregues: fretes.filter((f) => f.status === "entregue").length,
  };

  return (
    <div className="screen">
      <div className="header">
        <div>
          <div style={{ fontSize: 12, color: "#666" }}>Olá,</div>
          <h1>{user?.nome?.split(" ")[0] || "Contratante"}</h1>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 24, cursor: "pointer" }} onClick={() => onNavigate("perfil")}>
          👤
        </div>
      </div>

      <div className="content">
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Pendentes", value: stats.pendentes, icon: "⏳" },
            { label: "Em Trânsito", value: stats.emTransito, icon: "🚛" },
            { label: "Entregues", value: stats.entregues, icon: "✅" },
          ].map((s) => (
            <div key={s.label} className="card" style={{ textAlign: "center", padding: 12 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--orange)" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary" style={{ marginBottom: 20 }} onClick={() => onNavigate("solicitar-frete")}>
          + Solicitar Frete
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 700 }}>Meus Fretes</span>
          <span
            style={{ fontSize: 12, color: "var(--orange)", cursor: "pointer" }}
            onClick={() => onNavigate("meus-fretes")}
          >
            Ver todos
          </span>
        </div>

        {loading ? (
          <Loading />
        ) : fretes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "#666" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <p>Nenhum frete ainda</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Solicite seu primeiro frete!</p>
          </div>
        ) : (
          fretes.slice(0, 3).map((f) => (
            <div key={f.id} className="frete-card" onClick={() => onNavigate("detalhe-frete", f)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <StatusBadge status={f.status} />
                <div className="price">{formatMoney(f.valor)}</div>
              </div>
              <div className="route">
                {f.origem} → {f.destino}
              </div>
              <div className="meta">
                <span>📦 {f.tipo_carga}</span>
                <span>📏 {f.distancia_km} km</span>
                <span>⚖️ {f.peso_kg} kg</span>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNavContratante active="home" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// CONTRATANTE — SOLICITAR FRETE
// ─────────────────────────────────────────────
function SolicitarFreteScreen({ onNavigate }) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    origem: "",
    destino: "",
    tipo_carga: "geral",
    peso_kg: "",
    descricao: "",
  });
  const [calc, setCalc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const calcular = async () => {
    if (!form.origem || !form.destino) return setError("Informe origem e destino");
    setError("");
    setCalcLoading(true);
    try {
      const data = await api(
        "GET",
        `/api/fretes/calcular?origem=${encodeURIComponent(form.origem)}&destino=${encodeURIComponent(form.destino)}&peso=${(Number(form.peso_kg)||1000)/1000}&veiculo=truck&carga=${form.tipo_carga}`,
        null,
        token
      );
      setCalc({ distancia_km: data.rota?.distanciaKm || data.rota?.distancia_km, duracao: data.rota?.duracao || data.rota?.duration, valor_estimado: data.frete?.valorAntt || data.frete?.valorFinal || data.frete?.valor_estimado });
    } catch (e) {
      setError(e.message);
    } finally {
      setCalcLoading(false);
    }
  };

  const solicitar = async () => {
    if (!calc) return setError("Calcule o valor primeiro");
    setLoading(true);
    setError("");
    try {
      await api("POST", "/api/fretes", {
        tipoCarga: form.tipo_carga,
        tipoVeiculo: 'truck',
        
        pesoTons: (Number(form.peso_kg) || 1000) / 1000,
        origemEndereco: form.origem,
        origemCidade: form.origem.split(',')[0]?.trim() || form.origem,
        origemEstado: form.origem.split(',')[1]?.trim() || 'PR',
        destEndereco: form.destino,
        destCidade: form.destino.split(',')[0]?.trim() || form.destino,
        destEstado: form.destino.split(',')[1]?.trim() || 'SP',
      }, token);
      setSuccess(true);
      setTimeout(() => onNavigate("meus-fretes"), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("home-contratante")}>←</button>
        <h1>Solicitar Frete</h1>
      </div>
      <div className="content">
        {success && <div className="alert alert-success">✅ Frete solicitado com sucesso!</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <div className="card-title">Rota</div>
          <div className="field">
            <label>Origem</label>
            <input placeholder="Ex: Curitiba, PR" value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} />
          </div>
          <div className="field">
            <label>Destino</label>
            <input placeholder="Ex: São Paulo, SP" value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Carga</div>
          <div className="field">
            <label>Tipo de Carga</label>
            <select value={form.tipo_carga} onChange={(e) => setForm({ ...form, tipo_carga: e.target.value })}>
              {["geral", "frigorificada", "perigosa", "granel", "viva", "veículos"].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Peso estimado (kg)</label>
            <input type="number" placeholder="Ex: 5000" value={form.peso_kg} onChange={(e) => setForm({ ...form, peso_kg: e.target.value })} />
          </div>
          <div className="field">
            <label>Descrição</label>
            <textarea
              placeholder="Detalhes da carga..."
              rows={3}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              style={{ resize: "none" }}
            />
          </div>
        </div>

        <button className="btn btn-secondary" onClick={calcular} disabled={calcLoading} style={{ marginBottom: 12 }}>
          {calcLoading ? "Calculando..." : "📍 Calcular Rota e Valor"}
        </button>

        {calc && (
          <div className="card" style={{ borderColor: "var(--orange)" }}>
            <div className="card-title">Resultado do Cálculo</div>
            <div className="info-row">
              <span className="info-label">Distância</span>
              <span className="info-value">{calc.distancia_km} km</span>
            </div>
            <div className="info-row">
              <span className="info-label">Duração estimada</span>
              <span className="info-value">{calc.duracao}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Valor estimado</span>
              <span className="info-value" style={{ color: "var(--orange)", fontSize: 18 }}>{formatMoney(calc.valor_estimado)}</span>
            </div>
          </div>
        )}

        {calc && (
          <button className="btn btn-primary" onClick={solicitar} disabled={loading}>
            {loading ? "Solicitando..." : "Confirmar Solicitação"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONTRATANTE — MEUS FRETES
// ─────────────────────────────────────────────
function MeusFretes({ onNavigate }) {
  const { token } = useAuth();
  const [fretes, setFretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    api("GET", "/api/fretes", null, token)
      .then(setFretes)
      .catch(() => setFretes([]))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = filtro === "todos" ? fretes : fretes.filter((f) => f.status === filtro);

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("home-contratante")}>←</button>
        <h1>Meus Fretes</h1>
      </div>
      <div className="content">
        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          {["todos", "pendente", "aceito", "em_transito", "entregue"].map((s) => (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid",
                borderColor: filtro === s ? "var(--orange)" : "#333",
                background: filtro === s ? "var(--orange)" : "var(--dark3)",
                color: filtro === s ? "#fff" : "#999",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "Barlow, sans-serif",
              }}
            >
              {s === "todos" ? "Todos" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading />
        ) : filtrados.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "#666" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
            Nenhum frete encontrado
          </div>
        ) : (
          filtrados.map((f) => (
            <div key={f.id} className="frete-card" onClick={() => onNavigate("detalhe-frete", f)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <StatusBadge status={f.status} />
                <div className="price">{formatMoney(f.valor)}</div>
              </div>
              <div className="route">{f.origem} → {f.destino}</div>
              <div className="meta">
                <span>📦 {f.tipo_carga}</span>
                <span>📏 {f.distancia_km} km</span>
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNavContratante active="fretes" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// DETALHE DO FRETE (Contratante)
// ─────────────────────────────────────────────
function DetalheFrete({ frete, onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!frete) return <div className="loading"><Loading /></div>;

  const cancelar = async () => {
    if (!confirm("Cancelar este frete?")) return;
    setLoading(true);
    try {
      await api("PATCH", `/api/fretes/${frete.id}/status`, {status: "cancelado"}, token);
      onNavigate("meus-fretes");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("meus-fretes")}>←</button>
        <h1>Detalhe do Frete</h1>
      </div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <StatusBadge status={frete.status} />
          <div className="price">{formatMoney(frete.valor)}</div>
        </div>

        <div className="card">
          <div className="card-title">Rota</div>
          <div className="map-placeholder">
            <div className="icon">🗺️</div>
            <span>{frete.origem} → {frete.destino}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Origem</span>
            <span className="info-value">{frete.origem}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Destino</span>
            <span className="info-value">{frete.destino}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Distância</span>
            <span className="info-value">{frete.distancia_km} km</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Carga</div>
          <div className="info-row">
            <span className="info-label">Tipo</span>
            <span className="info-value">{frete.tipo_carga}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Peso</span>
            <span className="info-value">{frete.peso_kg} kg</span>
          </div>
          {frete.descricao && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#999" }}>{frete.descricao}</div>
          )}
        </div>

        {frete.motorista_nome && (
          <div className="card">
            <div className="card-title">Motorista</div>
            <div className="info-row">
              <span className="info-label">Nome</span>
              <span className="info-value">{frete.motorista_nome}</span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => onNavigate("chat", { frete })}
            >
              💬 Abrir Chat
            </button>
          </div>
        )}

        {frete.status === "entregue" && (
          <button className="btn btn-outline" style={{ marginBottom: 12 }} onClick={() => onNavigate("avaliar", { frete })}>
            ⭐ Avaliar Motorista
          </button>
        )}

        {["pendente", "aceito"].includes(frete.status) && (
          <button className="btn btn-danger" onClick={cancelar} disabled={loading}>
            {loading ? "Cancelando..." : "Cancelar Frete"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONTRATANTE — PERFIL
// ─────────────────────────────────────────────
function PerfilContratante({ onNavigate }) {
  const { user, logout } = useAuth();
  return (
    <div className="screen">
      <div className="header">
        <h1>Perfil</h1>
      </div>
      <div className="content">
        <div style={{ textAlign: "center", padding: "24px 0 32px" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 32 }}>
            👤
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{user?.nome}</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{user?.email}</div>
          <div style={{ marginTop: 8 }}>
            <span className="badge badge-active">Contratante</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Informações</div>
          <div className="info-row">
            <span className="info-label">Email</span>
            <span className="info-value">{user?.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Telefone</span>
            <span className="info-value">{user?.telefone || "—"}</span>
          </div>
        </div>

        {[
          { icon: "📦", label: "Meus Fretes", screen: "meus-fretes" },
          { icon: "💳", label: "Pagamentos", screen: "pagamentos" },
          { icon: "⭐", label: "Avaliações", screen: "avaliacoes" },
        ].map((item) => (
          <div
            key={item.label}
            className="card"
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
            onClick={() => onNavigate(item.screen)}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontWeight: 600 }}>{item.label}</span>
            <span style={{ marginLeft: "auto", color: "#666" }}>›</span>
          </div>
        ))}

        <button className="btn btn-danger" style={{ marginTop: 8 }} onClick={logout}>
          Sair da Conta
        </button>
      </div>
      <BottomNavContratante active="perfil" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// MOTORISTA — HOME
// ─────────────────────────────────────────────
function MotoristaHome({ onNavigate }) {
  const { user, token } = useAuth();
  const [disponiveis, setDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("GET", "/api/fretes/disponiveis", null, token)
      .then(setDisponiveis)
      .catch(() => setDisponiveis([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <div className="header">
        <div>
          <div style={{ fontSize: 12, color: "#666" }}>Olá motorista,</div>
          <h1>{user?.nome?.split(" ")[0] || "Motorista"}</h1>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 24, cursor: "pointer" }} onClick={() => onNavigate("perfil-motorista")}>
          👤
        </div>
      </div>
      <div className="content">
        <div style={{ fontWeight: 700, marginBottom: 12 }}>🚛 Fretes Disponíveis</div>
        {loading ? (
          <Loading />
        ) : disponiveis.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "#666" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
            Nenhum frete disponível agora
          </div>
        ) : (
          disponiveis.map((f) => (
            <div key={f.id} className="frete-card" onClick={() => onNavigate("aceitar-frete", f)}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#666" }}>#{f.id}</span>
                <div className="price">{formatMoney(f.valor)}</div>
              </div>
              <div className="route">{f.origem} → {f.destino}</div>
              <div className="meta">
                <span>📦 {f.tipo_carga}</span>
                <span>📏 {f.distancia_km} km</span>
                <span>⚖️ {f.peso_kg} kg</span>
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNavMotorista active="home" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// MOTORISTA — ACEITAR FRETE
// ─────────────────────────────────────────────
function AceitarFreteScreen({ frete, onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!frete) return <Loading />;

  const aceitar = async () => {
    setLoading(true);
    setError("");
    try {
      await api("PATCH", `/api/fretes/${frete.id}/aceitar`, {}, token);
      onNavigate("meus-fretes-motorista");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button>
        <h1>Aceitar Frete</h1>
      </div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ textAlign: "center", padding: "20px 0 28px" }}>
          <div className="price" style={{ fontSize: 40 }}>{formatMoney(frete.valor)}</div>
          <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>Valor do frete</div>
        </div>

        <div className="card">
          <div className="map-placeholder">
            <div className="icon">🗺️</div>
            <span>{frete.origem} → {frete.destino}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Distância</span>
            <span className="info-value">{frete.distancia_km} km</span>
          </div>
          <div className="info-row">
            <span className="info-label">Tipo de carga</span>
            <span className="info-value">{frete.tipo_carga}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Peso</span>
            <span className="info-value">{frete.peso_kg} kg</span>
          </div>
          {frete.descricao && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#999" }}>{frete.descricao}</div>
          )}
        </div>

        <button className="btn btn-primary" onClick={aceitar} disabled={loading}>
          {loading ? "Aceitando..." : "✅ Aceitar Frete"}
        </button>
        <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => onNavigate("home-motorista")}>
          Voltar
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MOTORISTA — MEUS FRETES
// ─────────────────────────────────────────────
function MeusFretesMot({ onNavigate }) {
  const { token } = useAuth();
  const [fretes, setFretes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("GET", "/api/fretes", null, token)
      .then(setFretes)
      .catch(() => setFretes([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <div className="header">
        <h1>Meus Fretes</h1>
      </div>
      <div className="content">
        {loading ? (
          <Loading />
        ) : fretes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "#666" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
            Nenhum frete aceito ainda
          </div>
        ) : (
          fretes.map((f) => (
            <div key={f.id} className="frete-card" onClick={() => onNavigate("em-transito", f)}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <StatusBadge status={f.status} />
                <div className="price">{formatMoney(f.valor)}</div>
              </div>
              <div className="route">{f.origem} → {f.destino}</div>
              <div className="meta">
                <span>📦 {f.tipo_carga}</span>
                <span>📏 {f.distancia_km} km</span>
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNavMotorista active="fretes" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// MOTORISTA — EM TRÂNSITO
// ─────────────────────────────────────────────
function EmTransitoScreen({ frete, onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!frete) return <Loading />;

  const iniciar = async () => {
    setLoading(true);
    try {
      await api("PATCH", `/api/fretes/${frete.id}/status`, {status: "coletando"}, token);
      onNavigate("meus-fretes-motorista");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const finalizar = async () => {
    setLoading(true);
    try {
      await api("PATCH", `/api/fretes/${frete.id}/status`, {status: "entregue"}, token);
      onNavigate("meus-fretes-motorista");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("meus-fretes-motorista")}>←</button>
        <h1>Frete Ativo</h1>
      </div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}

        <StatusBadge status={frete.status} />

        <div className="card" style={{ marginTop: 16 }}>
          <div className="map-placeholder">
            <div className="icon">📍</div>
            <span>Rastreamento ativo</span>
            <span style={{ fontSize: 12 }}>{frete.origem} → {frete.destino}</span>
          </div>
        </div>

        <div className="card">
          <div className="info-row">
            <span className="info-label">Distância</span>
            <span className="info-value">{frete.distancia_km} km</span>
          </div>
          <div className="info-row">
            <span className="info-label">Valor</span>
            <span className="info-value" style={{ color: "var(--orange)" }}>{formatMoney(frete.valor)}</span>
          </div>
        </div>

        <button
          className="btn btn-secondary"
          style={{ marginBottom: 12 }}
          onClick={() => onNavigate("chat", { frete })}
        >
          💬 Chat com Contratante
        </button>

        {frete.status === "aceito" && (
          <button className="btn btn-primary" onClick={iniciar} disabled={loading}>
            🚛 Iniciar Viagem
          </button>
        )}
        {frete.status === "em_transito" && (
          <button className="btn btn-primary" onClick={finalizar} disabled={loading}>
            ✅ Confirmar Entrega
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MOTORISTA — PERFIL
// ─────────────────────────────────────────────
function PerfilMotorista({ onNavigate }) {
  const { user, logout } = useAuth();
  return (
    <div className="screen">
      <div className="header">
        <h1>Perfil</h1>
      </div>
      <div className="content">
        <div style={{ textAlign: "center", padding: "24px 0 32px" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 32 }}>
            🚛
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{user?.nome}</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{user?.email}</div>
          <div style={{ marginTop: 8 }}>
            <span className="badge badge-active">Motorista</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Ganhos</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--orange)" }}>R$ —</div>
          <div style={{ fontSize: 12, color: "#666" }}>Total acumulado</div>
        </div>

        {[
          { icon: "📦", label: "Meus Fretes", screen: "meus-fretes-motorista" },
          { icon: "💳", label: "Pagamentos", screen: "pagamentos" },
          { icon: "⭐", label: "Avaliações", screen: "avaliacoes" },
        ].map((item) => (
          <div
            key={item.label}
            className="card"
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
            onClick={() => onNavigate(item.screen)}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontWeight: 600 }}>{item.label}</span>
            <span style={{ marginLeft: "auto", color: "#666" }}>›</span>
          </div>
        ))}

        <button className="btn btn-danger" style={{ marginTop: 8 }} onClick={logout}>
          Sair da Conta
        </button>
      </div>
      <BottomNavMotorista active="perfil" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────
function ChatScreen({ data, onNavigate }) {
  const { token, user } = useAuth();
  const frete = data?.frete;
  const [msgs, setMsgs] = useState([
    { id: 1, texto: "Olá! Tudo certo com o frete?", de: "outro", hora: "14:20" },
    { id: 2, texto: "Sim! Estou a caminho.", de: "eu", hora: "14:21" },
  ]);
  const [text, setText] = useState("");

  const send = () => {
    if (!text.trim()) return;
    const now = new Date();
    const hora = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    setMsgs((m) => [...m, { id: Date.now(), texto: text, de: "eu", hora }]);
    setText("");
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate(-1)}>←</button>
        <h1>Chat</h1>
      </div>
      <div className="chat-area">
        {msgs.map((m) => (
          <div key={m.id} style={{ alignSelf: m.de === "eu" ? "flex-end" : "flex-start" }}>
            <div className={`msg ${m.de === "eu" ? "msg-me" : "msg-other"}`}>{m.texto}</div>
            <div className="msg-time">{m.hora}</div>
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          placeholder="Digite uma mensagem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="chat-send" onClick={send}>➤</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AVALIAÇÃO
// ─────────────────────────────────────────────
function AvaliarScreen({ data, onNavigate }) {
  const { token } = useAuth();
  const frete = data?.frete;
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const enviar = async () => {
    setLoading(true);
    try {
      await api("POST", `/api/fretes/${frete?.id}/avaliar`, { nota, comentario }, token);
      setSuccess(true);
      setTimeout(() => onNavigate("meus-fretes"), 2000);
    } catch (e) {
      // silently fail for now
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("meus-fretes")}>←</button>
        <h1>Avaliar</h1>
      </div>
      <div className="content">
        {success ? (
          <div className="alert alert-success">✅ Avaliação enviada! Obrigado.</div>
        ) : (
          <>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⭐</div>
              <div style={{ fontWeight: 700, marginBottom: 20 }}>Como foi a experiência?</div>
              <div className="star-rating" style={{ justifyContent: "center" }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} onClick={() => setNota(n)} style={{ fontSize: 36, cursor: "pointer" }}>
                    {n <= nota ? "⭐" : "☆"}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 8, color: "#666", fontSize: 14 }}>{nota}/5</div>
            </div>

            <div className="field">
              <label>Comentário</label>
              <textarea
                placeholder="Como foi o serviço?"
                rows={4}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                style={{ resize: "none" }}
              />
            </div>

            <button className="btn btn-primary" onClick={enviar} disabled={loading}>
              {loading ? "Enviando..." : "Enviar Avaliação"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGAMENTOS (placeholder)
// ─────────────────────────────────────────────
function PagamentosScreen({ onNavigate }) {
  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate(-1)}>←</button>
        <h1>Pagamentos</h1>
      </div>
      <div className="content">
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#666" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
          <p style={{ fontWeight: 600 }}>Em breve</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Histórico de pagamentos será exibido aqui</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BOTTOM NAVS
// ─────────────────────────────────────────────
function BottomNavContratante({ active, onNavigate }) {
  const items = [
    { id: "home", icon: "🏠", label: "Home", screen: "home-contratante" },
    { id: "fretes", icon: "📦", label: "Fretes", screen: "meus-fretes" },
    { id: "perfil", icon: "👤", label: "Perfil", screen: "perfil" },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((i) => (
        <button key={i.id} className={`nav-item ${active === i.id ? "active" : ""}`} onClick={() => onNavigate(i.screen)}>
          <span>{i.icon}</span>
          {i.label}
        </button>
      ))}
    </nav>
  );
}

function BottomNavMotorista({ active, onNavigate }) {
  const items = [
    { id: "home", icon: "🚛", label: "Disponíveis", screen: "home-motorista" },
    { id: "fretes", icon: "📦", label: "Meus Fretes", screen: "meus-fretes-motorista" },
    { id: "perfil", icon: "👤", label: "Perfil", screen: "perfil-motorista" },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((i) => (
        <button key={i.id} className={`nav-item ${active === i.id ? "active" : ""}`} onClick={() => onNavigate(i.screen)}>
          <span>{i.icon}</span>
          {i.label}
        </button>
      ))}
    </nav>
  );
}

// ─────────────────────────────────────────────
// ROTEADOR PRINCIPAL
// ─────────────────────────────────────────────
function Router() {
  const { user } = useAuth();
  const [screen, setScreen] = useState("splash");
  const [screenData, setScreenData] = useState(null);

  // Redireciona após login
  useEffect(() => {
    if (user) {
      setScreen(user.tipo === "motorista" ? "home-motorista" : "home-contratante");
    }
  }, [user]);

  const navigate = (to, data = null) => {
    if (to === -1) {
      // voltar simples
      setScreen(user?.tipo === "motorista" ? "home-motorista" : "home-contratante");
      return;
    }
    setScreenData(data);
    setScreen(to);
    window.scrollTo(0, 0);
  };

  const props = { onNavigate: navigate };

  switch (screen) {
    case "splash":          return <SplashScreen {...props} />;
    case "login":           return <LoginScreen {...props} />;
    case "cadastro":        return <CadastroScreen {...props} />;

    // Contratante
    case "home-contratante":  return <ContratanteHome {...props} />;
    case "solicitar-frete":   return <SolicitarFreteScreen {...props} />;
    case "meus-fretes":       return <MeusFretes {...props} />;
    case "detalhe-frete":     return <DetalheFrete frete={screenData} {...props} />;
    case "perfil":            return <PerfilContratante {...props} />;

    // Motorista
    case "home-motorista":         return <MotoristaHome {...props} />;
    case "aceitar-frete":          return <AceitarFreteScreen frete={screenData} {...props} />;
    case "meus-fretes-motorista":  return <MeusFretesMot {...props} />;
    case "em-transito":            return <EmTransitoScreen frete={screenData} {...props} />;
    case "perfil-motorista":       return <PerfilMotorista {...props} />;

    // Compartilhados
    case "chat":        return <ChatScreen data={screenData} {...props} />;
    case "avaliar":     return <AvaliarScreen data={screenData} {...props} />;
    case "pagamentos":  return <PagamentosScreen {...props} />;
    case "avaliacoes":  return <PagamentosScreen {...props} />;

    default:
      return <SplashScreen {...props} />;
  }
}

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────
export default function App() {
  return (
    <>
      <style>{css}</style>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </>
  );
}
