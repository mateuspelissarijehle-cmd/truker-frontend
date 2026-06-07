import { useState, useEffect, createContext, useContext, useRef } from "react";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const API_BASE = "https://truker-app-production.up.railway.app";
const ADMIN_EMAIL = "admin@truker.app";
const ADMIN_SENHA = "truker2024";

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
  if (!res.ok) throw new Error(data.error || data.message || "Erro na requisição");
  return data;
}

// ─────────────────────────────────────────────
// TIPOS DE CARGA
// ─────────────────────────────────────────────
const TIPOS_CARGA = [
  { id: "carga_seca", label: "Carga Seca", icon: "📦", desc: "Paletes, caixas, embalagens gerais" },
  { id: "graneleiro", label: "Graneleiro", icon: "🌾", desc: "Grãos, cereais, farinha" },
  { id: "refrigerada", label: "Refrigerada", icon: "❄️", desc: "Alimentos perecíveis, laticínios" },
  { id: "frigorifico", label: "Frigorífico", icon: "🥩", desc: "Carnes, aves, embutidos" },
  { id: "mudanca", label: "Mudança", icon: "🏠", desc: "Móveis, eletrodomésticos" },
  { id: "carga_viva", label: "Carga Viva", icon: "🐄", desc: "Animais vivos" },
  { id: "liquidos", label: "Líquidos", icon: "💧", desc: "Água, sucos, bebidas" },
  { id: "inflamavel", label: "Inflamável", icon: "🔥", desc: "Combustíveis, solventes" },
  { id: "perigosa", label: "Perigosa/IMOS", icon: "⚠️", desc: "Produtos químicos, explosivos" },
  { id: "farmaceutico", label: "Farmacêutico", icon: "💊", desc: "Medicamentos, insumos" },
  { id: "eletronicos", label: "Eletrônicos", icon: "💻", desc: "Computadores, celulares, TVs" },
  { id: "alimentos", label: "Alimentos Secos", icon: "🥫", desc: "Enlatados, grãos embalados" },
  { id: "bebidas", label: "Bebidas", icon: "🍺", desc: "Cerveja, refrigerante, água" },
  { id: "construcao", label: "Construção", icon: "🧱", desc: "Cimento, areia, tijolos" },
  { id: "maquinario", label: "Maquinário", icon: "⚙️", desc: "Máquinas agrícolas, equipamentos" },
  { id: "superdimensionado", label: "Superdimensionado", icon: "🏗️", desc: "Cargas indivisíveis, oversized" },
  { id: "residuos", label: "Resíduos/Sucata", icon: "♻️", desc: "Recicláveis, resíduos industriais" },
  { id: "veiculos", label: "Veículos", icon: "🚗", desc: "Carros, motos, caminhões" },
  { id: "classificados", label: "Classificados", icon: "🔒", desc: "Valores, documentos, escolta" },
  { id: "madeira", label: "Madeira", icon: "🪵", desc: "Toras, compensados, móveis" },
];

const TIPOS_VEICULO = [
  { id: "furgao", label: "Furgão", icon: "🚐", cap: "1,5t", eixos: 2 },
  { id: "vuc", label: "VUC", icon: "🚚", cap: "3t", eixos: 2 },
  { id: "toco", label: "Toco", icon: "🚛", cap: "6t", eixos: 2 },
  { id: "truck", label: "Truck", icon: "🚛", cap: "14t", eixos: 3 },
  { id: "carreta", label: "Carreta", icon: "🚛", cap: "25t", eixos: 4 },
  { id: "bitrem", label: "Bitrem", icon: "🚛", cap: "45t", eixos: 6 },
  { id: "rodotrem", label: "Rodotrem", icon: "🚛", cap: "57t", eixos: 9 },
  { id: "prancha", label: "Prancha", icon: "🚛", cap: "35t", eixos: 4 },
  { id: "munck", label: "Munck", icon: "🏗️", cap: "10t", eixos: 3 },
  { id: "graneleiro", label: "Graneleiro", icon: "🌾", cap: "30t", eixos: 4 },
  { id: "frigorifico", label: "Frigorífico", icon: "❄️", cap: "20t", eixos: 4 },
  { id: "tanque", label: "Tanque", icon: "⛽", cap: "30t", eixos: 4 },
];

const TIPOS_FRETE = [
  { id: "urbano", label: "Urbano", icon: "🏙️", desc: "Até 50km, dentro da cidade" },
  { id: "intermunicipal", label: "Intermunicipal", icon: "🛣️", desc: "50 a 300km, entre cidades" },
  { id: "interestadual", label: "Interestadual", icon: "🗺️", desc: "Acima de 300km, entre estados" },
  { id: "internacional", label: "Internacional", icon: "🌎", desc: "Cruzando fronteiras" },
];

// ─────────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────────
const AuthContext = createContext(null);
function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("truker_user")); } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem("truker_token") || null);

  const login = (userData, tok) => {
    setUser(userData); setToken(tok);
    localStorage.setItem("truker_user", JSON.stringify(userData));
    localStorage.setItem("truker_token", tok);
  };

  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem("truker_user");
    localStorage.removeItem("truker_token");
  };

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
}

// ─────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --orange: #F97316; --orange-dark: #EA6C0A; --orange-light: rgba(249,115,22,0.12);
    --black: #0A0A0A; --dark: #141414; --dark2: #1C1C1C; --dark3: #252525; --dark4: #2E2E2E;
    --gray: #555; --gray2: #888; --gray3: #AAA;
    --white: #F5F5F5; --green: #22C55E; --red: #EF4444; --blue: #3B82F6; --yellow: #F59E0B;
  }
  body { font-family: 'Barlow', sans-serif; background: var(--black); color: var(--white); min-height: 100vh; max-width: 430px; margin: 0 auto; }
  .screen { min-height: 100vh; display: flex; flex-direction: column; padding-bottom: 80px; }
  .header { background: var(--dark); padding: 14px 18px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #222; position: sticky; top: 0; z-index: 10; }
  .header h1 { font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 800; color: var(--orange); letter-spacing: 1px; text-transform: uppercase; }
  .back-btn { background: none; border: none; color: var(--white); font-size: 22px; cursor: pointer; padding: 4px; line-height: 1; }
  .content { flex: 1; padding: 16px; }
  .card { background: var(--dark2); border-radius: 14px; padding: 16px; margin-bottom: 12px; border: 1px solid #272727; }
  .card-title { font-size: 11px; font-weight: 700; color: var(--gray2); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 12px; }
  .btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-family: 'Barlow', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn:active { transform: scale(0.97); }
  .btn-primary { background: var(--orange); color: #fff; }
  .btn-primary:hover { background: var(--orange-dark); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary { background: var(--dark3); color: var(--white); border: 1px solid #333; }
  .btn-outline { background: transparent; color: var(--orange); border: 2px solid var(--orange); }
  .btn-danger { background: var(--red); color: #fff; }
  .btn-success { background: var(--green); color: #fff; }
  .btn-sm { padding: 9px 14px; width: auto; font-size: 12px; border-radius: 8px; }
  .field { margin-bottom: 14px; }
  .field label { display: block; font-size: 11px; font-weight: 700; color: var(--gray2); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
  .field input, .field select, .field textarea { width: 100%; background: var(--dark3); border: 1px solid #333; border-radius: 10px; padding: 12px 14px; color: var(--white); font-family: 'Barlow', sans-serif; font-size: 15px; outline: none; transition: border-color 0.15s; }
  .field input:focus, .field select:focus, .field textarea:focus { border-color: var(--orange); }
  .field input::placeholder { color: #444; }
  .field select option { background: var(--dark2); }
  .input-eye { position: relative; }
  .input-eye input { padding-right: 44px; }
  .input-eye .eye { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--gray2); cursor: pointer; font-size: 18px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-pending { background: rgba(249,115,22,0.15); color: var(--orange); border: 1px solid rgba(249,115,22,0.4); }
  .badge-active { background: rgba(34,197,94,0.15); color: var(--green); border: 1px solid rgba(34,197,94,0.4); }
  .badge-done { background: rgba(99,102,241,0.15); color: #818CF8; border: 1px solid rgba(99,102,241,0.4); }
  .badge-cancel { background: rgba(239,68,68,0.15); color: var(--red); border: 1px solid rgba(239,68,68,0.4); }
  .badge-admin { background: rgba(245,158,11,0.15); color: var(--yellow); border: 1px solid rgba(245,158,11,0.4); }
  .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; background: var(--dark); border-top: 1px solid #222; display: flex; z-index: 100; }
  .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 10px 8px; gap: 3px; cursor: pointer; border: none; background: none; color: var(--gray); font-family: 'Barlow', sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; transition: color 0.15s; }
  .nav-item.active { color: var(--orange); }
  .nav-item span { font-size: 20px; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #222; }
  .info-row:last-child { border-bottom: none; }
  .info-label { font-size: 13px; color: var(--gray2); }
  .info-value { font-size: 13px; font-weight: 600; color: var(--white); text-align: right; max-width: 60%; }
  .alert { padding: 12px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; margin-bottom: 14px; }
  .alert-error { background: rgba(239,68,68,0.1); color: var(--red); border: 1px solid rgba(239,68,68,0.3); }
  .alert-success { background: rgba(34,197,94,0.1); color: var(--green); border: 1px solid rgba(34,197,94,0.3); }
  .alert-info { background: rgba(59,130,246,0.1); color: var(--blue); border: 1px solid rgba(59,130,246,0.3); }
  .logo-big { font-family: 'Barlow Condensed', sans-serif; font-size: 56px; font-weight: 800; color: var(--orange); letter-spacing: 4px; text-transform: uppercase; }
  .frete-card { background: var(--dark2); border-radius: 14px; padding: 16px; margin-bottom: 10px; border: 1px solid #272727; cursor: pointer; transition: border-color 0.15s, transform 0.1s; }
  .frete-card:hover { border-color: var(--orange); transform: translateY(-1px); }
  .frete-card:active { transform: scale(0.98); }
  .price { font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-weight: 800; color: var(--orange); }
  .route { font-size: 15px; font-weight: 700; margin: 8px 0 4px; }
  .meta { font-size: 12px; color: var(--gray2); display: flex; gap: 12px; flex-wrap: wrap; }
  .loading { text-align: center; padding: 40px; color: var(--gray2); font-size: 14px; }
  .spinner { width: 28px; height: 28px; border: 3px solid #333; border-top-color: var(--orange); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .divider { height: 1px; background: #222; margin: 16px 0; }
  .tipo-tag { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .tipo-tag button { padding: 8px 16px; border-radius: 20px; border: 1px solid #333; background: var(--dark3); color: var(--gray2); font-family: 'Barlow', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
  .tipo-tag button.active { background: var(--orange); color: #fff; border-color: var(--orange); }
  .map-placeholder { background: var(--dark3); border-radius: 12px; height: 160px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; color: var(--gray2); font-size: 13px; border: 1px dashed #333; margin-bottom: 14px; }
  .star-rating { display: flex; gap: 6px; font-size: 28px; cursor: pointer; }
  .chat-area { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .msg { max-width: 80%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.4; }
  .msg-me { background: var(--orange); color: #fff; align-self: flex-end; border-bottom-right-radius: 2px; }
  .msg-other { background: var(--dark3); color: var(--white); align-self: flex-start; border-bottom-left-radius: 2px; }
  .msg-time { font-size: 10px; opacity: 0.5; margin-top: 3px; text-align: right; }
  .chat-input { display: flex; gap: 8px; padding: 10px 14px; background: var(--dark); border-top: 1px solid #222; }
  .chat-input input { flex: 1; background: var(--dark3); border: 1px solid #333; border-radius: 20px; padding: 10px 16px; color: var(--white); font-family: 'Barlow', sans-serif; font-size: 14px; outline: none; }
  .chat-send { width: 40px; height: 40px; border-radius: 50%; background: var(--orange); border: none; color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .stat-card { background: var(--dark2); border-radius: 12px; padding: 14px; text-align: center; border: 1px solid #272727; }
  .stat-value { font-family: 'Barlow Condensed', sans-serif; font-size: 28px; font-weight: 800; color: var(--orange); }
  .stat-label { font-size: 10px; color: var(--gray2); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
  .carga-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .carga-item { background: var(--dark3); border: 1px solid #333; border-radius: 10px; padding: 10px; cursor: pointer; transition: all 0.15s; text-align: center; }
  .carga-item.selected { border-color: var(--orange); background: var(--orange-light); }
  .carga-item .ci-icon { font-size: 22px; margin-bottom: 4px; }
  .carga-item .ci-label { font-size: 11px; font-weight: 700; color: var(--white); }
  .carga-item .ci-desc { font-size: 10px; color: var(--gray2); margin-top: 2px; }
  .progress-bar { height: 8px; background: var(--dark4); border-radius: 4px; overflow: hidden; margin-top: 6px; }
  .progress-fill { height: 100%; border-radius: 4px; background: var(--orange); transition: width 0.3s; }
  .progress-fill.green { background: var(--green); }
  .progress-fill.red { background: var(--red); }
  .online-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--green); display: inline-block; margin-right: 6px; animation: pulse 2s infinite; }
  .offline-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--gray); display: inline-block; margin-right: 6px; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.2)} }
  .toggle { position: relative; width: 48px; height: 26px; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: var(--dark4); border-radius: 26px; transition: 0.3s; }
  .toggle-slider:before { content: ""; position: absolute; width: 20px; height: 20px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
  .toggle input:checked + .toggle-slider { background: var(--orange); }
  .toggle input:checked + .toggle-slider:before { transform: translateX(22px); }
  .tag-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; background: var(--orange-light); color: var(--orange); font-size: 11px; font-weight: 700; border: 1px solid rgba(249,115,22,0.3); margin: 2px; }
  .upload-area { border: 2px dashed #333; border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; transition: border-color 0.15s; color: var(--gray2); font-size: 13px; }
  .upload-area:hover { border-color: var(--orange); color: var(--orange); }
  .section-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; margin-top: 4px; }
  .km-vazio-bar { background: var(--dark2); border-radius: 12px; padding: 14px; margin-bottom: 10px; border: 1px solid #272727; }
  .uber-card { background: var(--dark2); border-radius: 16px; margin-bottom: 10px; border: 1px solid #272727; overflow: hidden; cursor: pointer; transition: all 0.15s; }
  .uber-card:hover { border-color: var(--orange); transform: translateY(-1px); }
  .uber-card-header { padding: 14px 16px; display: flex; justify-content: space-between; align-items: flex-start; }
  .uber-card-footer { background: var(--dark3); padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #2a2a2a; }
  .tab-bar { display: flex; gap: 0; margin-bottom: 16px; background: var(--dark2); border-radius: 10px; padding: 3px; }
  .tab-btn { flex: 1; padding: 8px; border: none; background: none; color: var(--gray2); font-family: 'Barlow', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; border-radius: 8px; transition: all 0.15s; text-transform: uppercase; }
  .tab-btn.active { background: var(--orange); color: #fff; }
  .admin-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #1e1e1e; }
  .admin-row:last-child { border-bottom: none; }
`;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatMoney(v) { return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
function formatKm(v) { return Number(v || 0).toLocaleString("pt-BR") + " km"; }
function StatusBadge({ status }) {
  const map = { aguardando: ["badge-pending", "Aguardando"], aceito: ["badge-active", "Aceito"], coletando: ["badge-active", "Coletando"], em_rota: ["badge-active", "Em Rota"], entregue: ["badge-done", "Entregue"], cancelado: ["badge-cancel", "Cancelado"] };
  const [cls, label] = map[status] || ["badge-pending", status];
  return <span className={`badge ${cls}`}>{label}</span>;
}
function Loading() { return <div className="loading"><div className="spinner" />Carregando...</div>; }
function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-eye">
      <input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder || "••••••••"} />
      <button className="eye" type="button" onClick={() => setShow(!show)}>{show ? "🙈" : "👁"}</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// SPLASH
// ─────────────────────────────────────────────
function SplashScreen({ onNavigate }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "linear-gradient(180deg, #141414 0%, #0A0A0A 100%)" }}>
      <div style={{ marginBottom: 8, fontSize: 52 }}>🚛</div>
      <div className="logo-big">TRUKER</div>
      <p style={{ color: "#555", fontSize: 13, marginTop: 6, marginBottom: 52, textAlign: "center" }}>Plataforma de fretes pesados</p>
      <button className="btn btn-primary" onClick={() => onNavigate("login")}>Entrar</button>
      <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => onNavigate("cadastro")}>Criar conta</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
function LoginScreen({ onNavigate }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    setError("");
    if (!form.email || !form.senha) return setError("Preencha todos os campos");
    // Admin master login
    if (form.email === ADMIN_EMAIL && form.senha === ADMIN_SENHA) {
      login({ nome: "Admin Master", email: ADMIN_EMAIL, tipo: "admin" }, "admin-token-truker-2024");
      return;
    }
    setLoading(true);
    try {
      const data = await api("POST", "/api/auth/login", form);
      login(data.user || data.usuario, data.token);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 44 }}>🚛</div>
        <div className="logo-big" style={{ fontSize: 44 }}>TRUKER</div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="field"><label>Email</label><input type="email" placeholder="seu@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
      <div className="field"><label>Senha</label><PasswordInput value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} /></div>
      <p style={{ textAlign: "right", marginBottom: 16, fontSize: 13 }}>
        <span style={{ color: "var(--orange)", cursor: "pointer" }} onClick={() => onNavigate("esqueci-senha")}>Esqueceu a senha?</span>
      </p>
      <button className="btn btn-primary" onClick={handle} disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      <p style={{ textAlign: "center", marginTop: 20, color: "#666", fontSize: 14 }}>
        Não tem conta? <span style={{ color: "var(--orange)", cursor: "pointer", fontWeight: 600 }} onClick={() => onNavigate("cadastro")}>Cadastre-se</span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// ESQUECI SENHA
// ─────────────────────────────────────────────
function EsqueciSenhaScreen({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const enviarCodigo = async () => {
    if (!email) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setStep(2);
  };

  const verificarCodigo = async () => {
    if (code.length < 4) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setStep(3);
  };

  const redefinir = async () => {
    if (!novaSenha) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setStep(4);
  };

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <button className="back-btn" style={{ marginBottom: 24 }} onClick={() => onNavigate("login")}>← Voltar</button>
      <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Recuperar senha</div>
      {step === 1 && <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Digite seu email para receber o código de recuperação.</p>}
      {step === 2 && <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Enviamos um código para <strong style={{ color: "var(--orange)" }}>{email}</strong>. Digite abaixo.</p>}
      {step === 3 && <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Defina sua nova senha.</p>}
      {step === 4 && (
        <div>
          <div className="alert alert-success">✅ Senha redefinida com sucesso!</div>
          <button className="btn btn-primary" onClick={() => onNavigate("login")}>Ir para o Login</button>
        </div>
      )}
      {step === 1 && (<><div className="field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" /></div><button className="btn btn-primary" onClick={enviarCodigo} disabled={loading}>{loading ? "Enviando..." : "Enviar código"}</button></>)}
      {step === 2 && (<><div className="field"><label>Código de verificação</label><input value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: 1234" maxLength={6} /></div><button className="btn btn-primary" onClick={verificarCodigo} disabled={loading}>{loading ? "Verificando..." : "Verificar"}</button></>)}
      {step === 3 && (<><div className="field"><label>Nova senha</label><PasswordInput value={novaSenha} onChange={e => setNovaSenha(e.target.value)} /></div><button className="btn btn-primary" onClick={redefinir} disabled={loading}>{loading ? "Salvando..." : "Redefinir senha"}</button></>)}
    </div>
  );
}

// ─────────────────────────────────────────────
// CADASTRO
// ─────────────────────────────────────────────
function CadastroScreen({ onNavigate }) {
  const { login } = useAuth();
  const [tipo, setTipo] = useState("contratante");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", telefone: "", tipo: "contratante", documento: "", nomeEmpresa: "", tiposCarga: [], tipoVeiculo: "", cnh: "", rntrc: "", placa: "", anoFab: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleCarga = (id) => setForm(f => ({ ...f, tiposCarga: f.tiposCarga.includes(id) ? f.tiposCarga.filter(x => x !== id) : [...f.tiposCarga, id] }));

  const finalizar = async () => {
    setError(""); setLoading(true);
    try {
      const data = await api("POST", "/api/auth/cadastro", { ...form, tipo });
      login(data.user || data.usuario, data.token);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "24px" }}>
      <button className="back-btn" style={{ marginBottom: 16 }} onClick={() => step > 1 ? setStep(s => s - 1) : onNavigate("login")}>←</button>
      <div style={{ marginBottom: 24 }}>
        <div className="logo-big" style={{ fontSize: 32 }}>TRUKER</div>
        <p style={{ color: "#666", fontSize: 13, marginTop: 4 }}>Criar conta · Passo {step} de {tipo === "motorista" ? 3 : 2}</p>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      {step === 1 && (
        <>
          <div className="field">
            <label>Tipo de conta</label>
            <div className="tipo-tag">
              {[["contratante", "🏢 Empresa/Pessoa"], ["motorista", "🚛 Motorista"]].map(([v, l]) => (
                <button key={v} className={tipo === v ? "active" : ""} onClick={() => { setTipo(v); set("tipo", v); }}>{l}</button>
              ))}
            </div>
          </div>
          <div className="field"><label>Nome completo</label><input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Seu nome" /></div>
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="seu@email.com" /></div>
          <div className="field"><label>Telefone / WhatsApp</label><input value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(41) 99999-9999" /></div>
          <div className="field"><label>Senha</label><PasswordInput value={form.senha} onChange={e => set("senha", e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => { if (!form.nome || !form.email || !form.senha) { setError("Preencha todos os campos"); return; } setError(""); setStep(2); }}>Continuar →</button>
        </>
      )}

      {step === 2 && tipo === "contratante" && (
        <>
          <p className="section-title">Dados da empresa</p>
          <div className="field"><label>CPF ou CNPJ</label><input value={form.documento} onChange={e => set("documento", e.target.value)} placeholder="000.000.000-00 ou 00.000.000/0001-00" /></div>
          <div className="field"><label>Nome da empresa (opcional)</label><input value={form.nomeEmpresa} onChange={e => set("nomeEmpresa", e.target.value)} placeholder="Empresa LTDA" /></div>
          <p style={{ fontSize: 12, color: "#666", marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Tipos de carga que irá contratar</p>
          <div className="carga-grid">
            {TIPOS_CARGA.map(c => (
              <div key={c.id} className={`carga-item ${form.tiposCarga.includes(c.id) ? "selected" : ""}`} onClick={() => toggleCarga(c.id)}>
                <div className="ci-icon">{c.icon}</div>
                <div className="ci-label">{c.label}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={finalizar} disabled={loading}>{loading ? "Criando conta..." : "Criar Conta"}</button>
        </>
      )}

      {step === 2 && tipo === "motorista" && (
        <>
          <p className="section-title">Dados profissionais</p>
          <div className="field"><label>CPF</label><input value={form.documento} onChange={e => set("documento", e.target.value)} placeholder="000.000.000-00" /></div>
          <div className="field"><label>Número CNH</label><input value={form.cnh} onChange={e => set("cnh", e.target.value)} placeholder="00000000000" /></div>
          <div className="field"><label>RNTRC (ANTT)</label><input value={form.rntrc} onChange={e => set("rntrc", e.target.value)} placeholder="00000000" /></div>
          <div className="field">
            <label>Tipo de veículo</label>
            <select value={form.tipoVeiculo} onChange={e => set("tipoVeiculo", e.target.value)}>
              <option value="">Selecione...</option>
              {TIPOS_VEICULO.map(v => <option key={v.id} value={v.id}>{v.icon} {v.label} — até {v.cap}</option>)}
            </select>
          </div>
          <div className="field"><label>Placa do veículo</label><input value={form.placa} onChange={e => set("placa", e.target.value.toUpperCase())} placeholder="ABC-1234" /></div>
          <div className="field"><label>Ano de fabricação</label><input type="number" value={form.anoFab} onChange={e => set("anoFab", e.target.value)} placeholder="2018" /></div>
          <button className="btn btn-primary" onClick={() => { setError(""); setStep(3); }}>Continuar →</button>
        </>
      )}

      {step === 3 && tipo === "motorista" && (
        <>
          <p className="section-title">Tipos de carga que transporta</p>
          <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>Selecione todos os tipos que seu veículo é habilitado para transportar.</p>
          <div className="carga-grid">
            {TIPOS_CARGA.map(c => (
              <div key={c.id} className={`carga-item ${form.tiposCarga.includes(c.id) ? "selected" : ""}`} onClick={() => toggleCarga(c.id)}>
                <div className="ci-icon">{c.icon}</div>
                <div className="ci-label">{c.label}</div>
                <div className="ci-desc">{c.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11, color: "#666", marginBottom: 10, fontWeight: 700, textTransform: "uppercase" }}>Upload de documentos</p>
            <div className="upload-area" style={{ marginBottom: 8 }}>📄 CNH + Documentos pessoais</div>
            <div className="upload-area" style={{ marginBottom: 8 }}>🚛 Fotos do caminhão (frente, lateral, traseira)</div>
            <div className="upload-area">📋 Placa ANTT + RNTRC</div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={finalizar} disabled={loading}>{loading ? "Criando conta..." : "✅ Finalizar Cadastro"}</button>
        </>
      )}

      <p style={{ textAlign: "center", marginTop: 16, color: "#555", fontSize: 13 }}>
        Já tem conta? <span style={{ color: "var(--orange)", cursor: "pointer", fontWeight: 600 }} onClick={() => onNavigate("login")}>Entrar</span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN LOGIN
// ─────────────────────────────────────────────
function AdminLoginScreen({ onNavigate }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [error, setError] = useState("");

  const handle = () => {
    if (form.email === ADMIN_EMAIL && form.senha === ADMIN_SENHA) {
      login({ nome: "Admin Master", email: ADMIN_EMAIL, tipo: "admin" }, "admin-token-truker-2024");
    } else {
      setError("Credenciais incorretas");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px" }}>
      <button className="back-btn" style={{ marginBottom: 24 }} onClick={() => onNavigate("splash")}>← Voltar</button>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 40 }}>🔑</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>Acesso Master</div>
        <div className="badge badge-admin" style={{ marginTop: 8 }}>ADMIN</div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="field"><label>Email admin</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@truker.app" /></div>
      <div className="field"><label>Senha</label><PasswordInput value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} /></div>
      <button className="btn btn-primary" onClick={handle}>Entrar como Admin</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────
function AdminDashboard({ onNavigate }) {
  const { logout } = useAuth();
  const [tab, setTab] = useState("overview");

  const mockMotoristas = [
    { nome: "Carlos Silva", veiculo: "Truck", kmVazio: 1240, kmCarregado: 8420, meta: 1000, fretes: 28, avaliacao: 4.8, online: true },
    { nome: "José Oliveira", veiculo: "Carreta", kmVazio: 560, kmCarregado: 12300, meta: 800, fretes: 41, avaliacao: 4.6, online: true },
    { nome: "Pedro Santos", veiculo: "Toco", kmVazio: 2100, kmCarregado: 5600, meta: 1500, fretes: 15, avaliacao: 4.2, online: false },
    { nome: "Ana Costa", veiculo: "VUC", kmVazio: 320, kmCarregado: 3200, meta: 500, fretes: 22, avaliacao: 4.9, online: true },
  ];

  const totalKmVazio = mockMotoristas.reduce((a, m) => a + m.kmVazio, 0);
  const totalKmCarregado = mockMotoristas.reduce((a, m) => a + m.kmCarregado, 0);
  const eficiencia = Math.round((totalKmCarregado / (totalKmVazio + totalKmCarregado)) * 100);

  return (
    <div className="screen">
      <div className="header">
        <h1>Dashboard Master</h1>
        <div className="badge badge-admin" style={{ marginLeft: "auto" }}>ADMIN</div>
      </div>
      <div className="content">
        <div className="tab-bar">
          {[["overview", "Visão Geral"], ["motoristas", "Motoristas"], ["fretes", "Fretes"], ["relatorios", "Relatórios"]].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div className="stat-card"><div className="stat-value">4</div><div className="stat-label">Motoristas Ativos</div></div>
              <div className="stat-card"><div className="stat-value">106</div><div className="stat-label">Fretes Totais</div></div>
              <div className="stat-card"><div className="stat-value">{eficiencia}%</div><div className="stat-label">Eficiência Frota</div></div>
              <div className="stat-card"><div className="stat-value">{formatKm(totalKmVazio)}</div><div className="stat-label">Km Vazios Total</div></div>
            </div>
            <div className="card">
              <div className="card-title">Km Vazio vs Carregado (frota)</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "var(--green)" }}>Carregado: {formatKm(totalKmCarregado)}</span>
                  <span style={{ color: "var(--red)" }}>Vazio: {formatKm(totalKmVazio)}</span>
                </div>
                <div className="progress-bar" style={{ height: 12 }}>
                  <div className="progress-fill green" style={{ width: `${eficiencia}%` }} />
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Motoristas Online agora</div>
              {mockMotoristas.filter(m => m.online).map(m => (
                <div key={m.nome} className="admin-row">
                  <div><span className="online-dot" /><strong>{m.nome}</strong><div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{m.veiculo} · ⭐ {m.avaliacao}</div></div>
                  <div style={{ textAlign: "right", fontSize: 12 }}>
                    <div style={{ color: "var(--green)" }}>{formatKm(m.kmCarregado)}</div>
                    <div style={{ color: "var(--red)", fontSize: 11 }}>Vazio: {formatKm(m.kmVazio)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "motoristas" && (
          <>
            {mockMotoristas.map(m => {
              const pct = Math.min(100, Math.round((m.kmVazio / m.meta) * 100));
              const cor = pct > 100 ? "red" : pct > 75 ? "" : "green";
              return (
                <div key={m.nome} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{m.online ? <><span className="online-dot" /></> : <><span className="offline-dot" /></>}{m.nome}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{m.veiculo} · {m.fretes} fretes · ⭐ {m.avaliacao}</div>
                    </div>
                    <span className={`badge ${m.online ? "badge-active" : ""}`} style={!m.online ? { background: "#222", color: "#555", border: "1px solid #333" } : {}}>{m.online ? "Online" : "Offline"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                    Meta km vazio: {formatKm(m.meta)} · Atual: {formatKm(m.kmVazio)} ({pct}%)
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${cor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 12 }}>
                    <span style={{ color: "var(--green)" }}>✅ Carregado: {formatKm(m.kmCarregado)}</span>
                    <span style={{ color: "var(--red)" }}>⬜ Vazio: {formatKm(m.kmVazio)}</span>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === "fretes" && (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "#555" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
            <p>Lista de todos os fretes da plataforma</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>Conectar à API em breve</p>
          </div>
        )}

        {tab === "relatorios" && (
          <>
            <div className="card">
              <div className="card-title">Relatório de Eficiência</div>
              {mockMotoristas.map(m => {
                const total = m.kmVazio + m.kmCarregado;
                const ef = Math.round((m.kmCarregado / total) * 100);
                return (
                  <div key={m.nome} className="admin-row">
                    <span style={{ fontSize: 13 }}>{m.nome}</span>
                    <span style={{ fontSize: 13, color: ef > 80 ? "var(--green)" : ef > 60 ? "var(--orange)" : "var(--red)", fontWeight: 700 }}>{ef}% eficiência</span>
                  </div>
                );
              })}
            </div>
            <div className="card">
              <div className="card-title">Tipos de carga mais solicitados</div>
              {[["Carga Seca", "📦", 42], ["Graneleiro", "🌾", 28], ["Refrigerada", "❄️", 18], ["Líquidos", "💧", 12]].map(([l, i, v]) => (
                <div key={l} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span>{i} {l}</span><span style={{ color: "#666" }}>{v} fretes</span></div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${v * 2}%` }} /></div>
                </div>
              ))}
            </div>
          </>
        )}

        <button className="btn btn-danger" style={{ marginTop: 8 }} onClick={logout}>Sair do Admin</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONTRATANTE HOME
// ─────────────────────────────────────────────
function ContratanteHome({ onNavigate }) {
  const { user, token } = useAuth();
  const [fretes, setFretes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("GET", "/api/fretes", null, token).then(setFretes).catch(() => setFretes([])).finally(() => setLoading(false));
  }, []);

  const stats = {
    pendentes: fretes.filter(f => f.status === "aguardando").length,
    emTransito: fretes.filter(f => ["aceito", "em_rota", "coletando"].includes(f.status)).length,
    entregues: fretes.filter(f => f.status === "entregue").length,
  };

  return (
    <div className="screen">
      <div className="header">
        <div><div style={{ fontSize: 11, color: "#555" }}>Olá,</div><h1>{user?.nome?.split(" ")[0] || "Contratante"}</h1></div>
        <div style={{ marginLeft: "auto", fontSize: 24, cursor: "pointer" }} onClick={() => onNavigate("perfil")}>👤</div>
      </div>
      <div className="content">
        <div className="grid-3" style={{ marginBottom: 16 }}>
          {[["⏳", stats.pendentes, "Pendentes"], ["🚛", stats.emTransito, "Em Rota"], ["✅", stats.entregues, "Entregues"]].map(([icon, val, label]) => (
            <div key={label} className="stat-card"><div style={{ fontSize: 18 }}>{icon}</div><div className="stat-value" style={{ fontSize: 22 }}>{val}</div><div className="stat-label">{label}</div></div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => onNavigate("solicitar-frete")}>+ Solicitar Frete</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Meus Fretes</span>
          <span style={{ fontSize: 12, color: "var(--orange)", cursor: "pointer" }} onClick={() => onNavigate("meus-fretes")}>Ver todos</span>
        </div>
        {loading ? <Loading /> : fretes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "#555" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
            <p style={{ fontWeight: 600 }}>Nenhum frete ainda</p>
            <p style={{ fontSize: 13, marginTop: 4, color: "#444" }}>Solicite seu primeiro frete!</p>
          </div>
        ) : fretes.slice(0, 3).map(f => (
          <div key={f.id} className="frete-card" onClick={() => onNavigate("detalhe-frete", f)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <StatusBadge status={f.status} />
              <div className="price">{formatMoney(f.valor_final || f.valor_motorista || 0)}</div>
            </div>
            <div className="route">{f.origem_cidade || f.origem_endereco || "—"} → {f.dest_cidade || f.dest_endereco || "—"}</div>
            <div className="meta"><span>📦 {f.tipo_carga}</span><span>📏 {f.distancia_km} km</span><span>⚖️ {f.peso_tons}t</span></div>
          </div>
        ))}
      </div>
      <BottomNavContratante active="home" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// SOLICITAR FRETE
// ─────────────────────────────────────────────
function SolicitarFreteScreen({ onNavigate }) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    origem: "", destino: "", tipoFrete: "interestadual",
    tipoCarga: "carga_seca", tipoVeiculo: "truck",
    pesoKg: "", comprimentoM: "", larguraM: "", alturaM: "",
    descricao: "", precisaMunck: false, precisaEmpilhadeira: false,
    dataColeta: "", horario: "", freteRecorrente: false,
    multiDestinos: false,
  });
  const [calc, setCalc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const tipoCargaObj = TIPOS_CARGA.find(c => c.id === form.tipoCarga);
  const tipoVeiculoObj = TIPOS_VEICULO.find(v => v.id === form.tipoVeiculo);

  const calcular = async () => {
    if (!form.origem || !form.destino) return setError("Informe origem e destino");
    setError(""); setCalcLoading(true);
    try {
      const data = await api("GET", `/api/fretes/calcular?origem=${encodeURIComponent(form.origem)}&destino=${encodeURIComponent(form.destino)}&peso=${(Number(form.pesoKg) || 1000) / 1000}&veiculo=${form.tipoVeiculo}&carga=${form.tipoCarga}`, null, token);
      setCalc({ distancia_km: data.rota?.distanciaKm, duracao: data.rota?.duracao, valor: data.frete?.valorAntt || data.frete?.valorFinal });
      setStep(3);
    } catch (e) { setError(e.message); }
    finally { setCalcLoading(false); }
  };

  const solicitar = async () => {
    if (!calc) return;
    setLoading(true); setError("");
    try {
      await api("POST", "/api/fretes", {
        tipoCarga: form.tipoCarga, tipoVeiculo: form.tipoVeiculo,
        pesoTons: (Number(form.pesoKg) || 1000) / 1000,
        origemEndereco: form.origem, origemCidade: form.origem.split(",")[0]?.trim(), origemEstado: form.origem.split(",")[1]?.trim() || "PR",
        destEndereco: form.destino, destCidade: form.destino.split(",")[0]?.trim(), destEstado: form.destino.split(",")[1]?.trim() || "SP",
      }, token);
      setSuccess(true);
      setTimeout(() => onNavigate("meus-fretes"), 2000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => step > 1 ? setStep(s => s - 1) : onNavigate("home-contratante")}>←</button>
        <h1>Solicitar Frete</h1>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#555" }}>{step}/3</span>
      </div>
      <div className="content">
        {success && <div className="alert alert-success">✅ Frete solicitado! Motoristas serão notificados.</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {step === 1 && (
          <>
            <div className="card">
              <div className="card-title">Tipo de Frete</div>
              <div className="carga-grid">
                {TIPOS_FRETE.map(t => (
                  <div key={t.id} className={`carga-item ${form.tipoFrete === t.id ? "selected" : ""}`} onClick={() => set("tipoFrete", t.id)}>
                    <div className="ci-icon">{t.icon}</div>
                    <div className="ci-label">{t.label}</div>
                    <div className="ci-desc">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-title">Rota</div>
              <div className="field"><label>Origem</label><input placeholder="Ex: Curitiba, PR" value={form.origem} onChange={e => set("origem", e.target.value)} /></div>
              <div className="field"><label>Destino</label><input placeholder="Ex: São Paulo, SP" value={form.destino} onChange={e => set("destino", e.target.value)} /></div>
              <div className="field"><label>Data de coleta</label><input type="date" value={form.dataColeta} onChange={e => set("dataColeta", e.target.value)} /></div>
              <div className="field"><label>Horário preferido</label><input type="time" value={form.horario} onChange={e => set("horario", e.target.value)} /></div>
            </div>
            <button className="btn btn-primary" onClick={() => { if (!form.origem || !form.destino) { setError("Informe origem e destino"); return; } setError(""); setStep(2); }}>Continuar →</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="card">
              <div className="card-title">Tipo de Carga</div>
              <div className="carga-grid">
                {TIPOS_CARGA.map(c => (
                  <div key={c.id} className={`carga-item ${form.tipoCarga === c.id ? "selected" : ""}`} onClick={() => set("tipoCarga", c.id)}>
                    <div className="ci-icon">{c.icon}</div>
                    <div className="ci-label">{c.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-title">Veículo necessário</div>
              <div className="field">
                <select value={form.tipoVeiculo} onChange={e => set("tipoVeiculo", e.target.value)}>
                  {TIPOS_VEICULO.map(v => <option key={v.id} value={v.id}>{v.icon} {v.label} — até {v.cap}</option>)}
                </select>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Peso e Dimensões</div>
              <div className="field"><label>Peso total (kg)</label><input type="number" placeholder="Ex: 5000" value={form.pesoKg} onChange={e => set("pesoKg", e.target.value)} /></div>
              <div className="grid-3">
                <div className="field"><label>Comp. (m)</label><input type="number" placeholder="Ex: 6" value={form.comprimentoM} onChange={e => set("comprimentoM", e.target.value)} /></div>
                <div className="field"><label>Larg. (m)</label><input type="number" placeholder="Ex: 2.4" value={form.larguraM} onChange={e => set("larguraM", e.target.value)} /></div>
                <div className="field"><label>Alt. (m)</label><input type="number" placeholder="Ex: 2.8" value={form.alturaM} onChange={e => set("alturaM", e.target.value)} /></div>
              </div>
              <div className="field"><label>Descrição da carga</label><textarea rows={3} placeholder="Detalhes importantes da carga..." value={form.descricao} onChange={e => set("descricao", e.target.value)} style={{ resize: "none" }} /></div>
            </div>
            <div className="card">
              <div className="card-title">Equipamentos no pátio</div>
              {[["precisaMunck", "🏗️ Necessário Munck"], ["precisaEmpilhadeira", "🏭 Há empilhadeira no pátio"]].map(([k, label]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 14 }}>{label}</span>
                  <label className="toggle"><input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} /><span className="toggle-slider" /></label>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Documentos e Fotos</div>
              <div className="upload-area" style={{ marginBottom: 8 }}>📸 Fotos da carga</div>
              <div className="upload-area" style={{ marginBottom: 8 }}>📄 Nota fiscal</div>
              <div className="upload-area">🏭 Fotos do pátio</div>
            </div>
            <button className="btn btn-primary" onClick={calcular} disabled={calcLoading}>{calcLoading ? "Calculando rota..." : "📍 Calcular Rota e Valor"}</button>
          </>
        )}

        {step === 3 && calc && (
          <>
            <div className="card" style={{ borderColor: "var(--orange)", borderWidth: 2 }}>
              <div className="card-title">Resumo do Frete</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <span className="tag-chip">{tipoCargaObj?.icon} {tipoCargaObj?.label}</span>
                <span className="tag-chip">🚛 {tipoVeiculoObj?.label}</span>
              </div>
              {form.precisaMunck && <span className="tag-chip">🏗️ Munck</span>}
              {form.precisaEmpilhadeira && <span className="tag-chip">🏭 Empilhadeira</span>}
              <div className="divider" />
              <div className="info-row"><span className="info-label">Origem</span><span className="info-value">{form.origem}</span></div>
              <div className="info-row"><span className="info-label">Destino</span><span className="info-value">{form.destino}</span></div>
              <div className="info-row"><span className="info-label">Distância</span><span className="info-value">{calc.distancia_km} km</span></div>
              <div className="info-row"><span className="info-label">Duração</span><span className="info-value">{calc.duracao}</span></div>
              <div className="info-row"><span className="info-label">Peso</span><span className="info-value">{form.pesoKg} kg</span></div>
              <div className="divider" />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Valor estimado (tabela ANTT)</div>
                <div className="price" style={{ fontSize: 36 }}>{formatMoney(calc.valor)}</div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={solicitar} disabled={loading} style={{ marginBottom: 10 }}>{loading ? "Publicando frete..." : "🚛 Publicar Frete"}</button>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>← Editar</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MEUS FRETES CONTRATANTE
// ─────────────────────────────────────────────
function MeusFretes({ onNavigate }) {
  const { token } = useAuth();
  const [fretes, setFretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    api("GET", "/api/fretes", null, token).then(setFretes).catch(() => setFretes([])).finally(() => setLoading(false));
  }, []);

  const filtrados = filtro === "todos" ? fretes : fretes.filter(f => f.status === filtro);

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("home-contratante")}>←</button>
        <h1>Meus Fretes</h1>
      </div>
      <div className="content">
        <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
          {[["todos", "Todos"], ["aguardando", "Aguardando"], ["aceito", "Aceito"], ["em_rota", "Em Rota"], ["entregue", "Entregue"]].map(([s, l]) => (
            <button key={s} onClick={() => setFiltro(s)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: filtro === s ? "var(--orange)" : "#333", background: filtro === s ? "var(--orange)" : "var(--dark3)", color: filtro === s ? "#fff" : "#888", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "Barlow, sans-serif" }}>{l}</button>
          ))}
        </div>
        {loading ? <Loading /> : filtrados.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "#555" }}><div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>Nenhum frete encontrado</div>
        ) : filtrados.map(f => (
          <div key={f.id} className="frete-card" onClick={() => onNavigate("detalhe-frete", f)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <StatusBadge status={f.status} />
              <div className="price">{formatMoney(f.valor_final || 0)}</div>
            </div>
            <div className="route">{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
            <div className="meta"><span>📦 {f.tipo_carga}</span><span>📏 {f.distancia_km} km</span></div>
          </div>
        ))}
      </div>
      <BottomNavContratante active="fretes" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// DETALHE FRETE
// ─────────────────────────────────────────────
function DetalheFrete({ frete, onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!frete) return <Loading />;

  const cancelar = async () => {
    if (!confirm("Cancelar este frete?")) return;
    setLoading(true);
    try { await api("PATCH", `/api/fretes/${frete.id}/status`, { status: "cancelado" }, token); onNavigate("meus-fretes"); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("meus-fretes")}>←</button><h1>Detalhe do Frete</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <StatusBadge status={frete.status} />
          <div className="price">{formatMoney(frete.valor_final || 0)}</div>
        </div>
        <div className="card">
          <div className="card-title">Rota</div>
          <div className="map-placeholder"><div style={{ fontSize: 28 }}>🗺️</div><span>{frete.origem_cidade || "—"} → {frete.dest_cidade || "—"}</span></div>
          <div className="info-row"><span className="info-label">Origem</span><span className="info-value">{frete.origem_endereco || frete.origem_cidade || "—"}</span></div>
          <div className="info-row"><span className="info-label">Destino</span><span className="info-value">{frete.dest_endereco || frete.dest_cidade || "—"}</span></div>
          <div className="info-row"><span className="info-label">Distância</span><span className="info-value">{frete.distancia_km} km</span></div>
        </div>
        <div className="card">
          <div className="card-title">Carga</div>
          <div className="info-row"><span className="info-label">Tipo</span><span className="info-value">{frete.tipo_carga}</span></div>
          <div className="info-row"><span className="info-label">Peso</span><span className="info-value">{frete.peso_tons}t</span></div>
          <div className="info-row"><span className="info-label">Veículo</span><span className="info-value">{frete.tipo_veiculo}</span></div>
        </div>
        {frete.motorista_nome && (
          <div className="card">
            <div className="card-title">Motorista</div>
            <div className="info-row"><span className="info-label">Nome</span><span className="info-value">{frete.motorista_nome}</span></div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={() => onNavigate("chat", { frete })}>💬 Chat</button>
          </div>
        )}
        {frete.status === "entregue" && <button className="btn btn-outline" style={{ marginBottom: 10 }} onClick={() => onNavigate("avaliar", { frete })}>⭐ Avaliar Motorista</button>}
        {["aguardando", "aceito"].includes(frete.status) && <button className="btn btn-danger" onClick={cancelar} disabled={loading}>{loading ? "Cancelando..." : "Cancelar Frete"}</button>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PERFIL CONTRATANTE
// ─────────────────────────────────────────────
function PerfilContratante({ onNavigate }) {
  const { user, logout } = useAuth();
  return (
    <div className="screen">
      <div className="header"><h1>Perfil</h1></div>
      <div className="content">
        <div style={{ textAlign: "center", padding: "20px 0 28px" }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 28 }}>🏢</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.nome}</div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>{user?.email}</div>
          <div style={{ marginTop: 8 }}><span className="badge badge-active">Contratante</span></div>
        </div>
        <div className="card">
          <div className="card-title">Informações</div>
          <div className="info-row"><span className="info-label">Email</span><span className="info-value">{user?.email}</span></div>
          <div className="info-row"><span className="info-label">Telefone</span><span className="info-value">{user?.telefone || "—"}</span></div>
        </div>
        {[["📦", "Meus Fretes", "meus-fretes"], ["💳", "Pagamentos", "pagamentos"], ["⭐", "Avaliações", "avaliacoes"]].map(([icon, label, screen]) => (
          <div key={label} className="card" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => onNavigate(screen)}>
            <span style={{ fontSize: 20 }}>{icon}</span><span style={{ fontWeight: 600 }}>{label}</span><span style={{ marginLeft: "auto", color: "#555" }}>›</span>
          </div>
        ))}
        <button className="btn btn-danger" style={{ marginTop: 8 }} onClick={logout}>Sair da Conta</button>
      </div>
      <BottomNavContratante active="perfil" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// MOTORISTA HOME (estilo Uber)
// ─────────────────────────────────────────────
function MotoristaHome({ onNavigate }) {
  const { user, token } = useAuth();
  const [disponiveis, setDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroPeso, setFiltroPeso] = useState("todos");
  const [kmVazio, setKmVazio] = useState(342);
  const [metaKmVazio, setMetaKmVazio] = useState(800);

  useEffect(() => {
    if (!online) { setDisponiveis([]); setLoading(false); return; }
    api("GET", "/api/fretes/disponiveis", null, token).then(setDisponiveis).catch(() => setDisponiveis([])).finally(() => setLoading(false));
  }, [online]);

  const pctMeta = Math.min(100, Math.round((kmVazio / metaKmVazio) * 100));

  const filtrados = disponiveis.filter(f => {
    if (filtroTipo !== "todos" && f.tipo_frete !== filtroTipo) return false;
    const peso = f.peso_tons || 0;
    if (filtroPeso === "leve" && peso > 3) return false;
    if (filtroPeso === "medio" && (peso < 3 || peso > 14)) return false;
    if (filtroPeso === "pesado" && peso < 14) return false;
    return true;
  });

  return (
    <div className="screen">
      <div className="header">
        <div>
          <div style={{ fontSize: 11, color: "#555", display: "flex", alignItems: "center" }}>
            <span className={online ? "online-dot" : "offline-dot"} />
            {online ? "Online — aceitando fretes" : "Offline"}
          </div>
          <h1>{user?.nome?.split(" ")[0] || "Motorista"}</h1>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <label className="toggle"><input type="checkbox" checked={online} onChange={e => setOnline(e.target.checked)} /><span className="toggle-slider" /></label>
          <span style={{ fontSize: 22, cursor: "pointer" }} onClick={() => onNavigate("perfil-motorista")}>👤</span>
        </div>
      </div>
      <div className="content">
        {/* KM Vazio tracker */}
        <div className="km-vazio-bar">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>📊 KM VAZIO HOJE</span>
            <span style={{ fontSize: 11, color: "#555" }}>Meta: {formatKm(metaKmVazio)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: pctMeta > 100 ? "var(--red)" : pctMeta > 75 ? "var(--orange)" : "var(--green)" }}>{formatKm(kmVazio)}</span>
            <span style={{ fontSize: 12, color: "#555" }}>({pctMeta}% da meta)</span>
          </div>
          <div className="progress-bar">
            <div className={`progress-fill ${pctMeta > 100 ? "red" : pctMeta > 75 ? "" : "green"}`} style={{ width: `${Math.min(pctMeta, 100)}%` }} />
          </div>
        </div>

        {/* Mapa placeholder */}
        <div className="map-placeholder" style={{ height: 180 }}>
          <div style={{ fontSize: 36 }}>🗺️</div>
          <span style={{ fontWeight: 700 }}>Mapa ao vivo</span>
          <span style={{ fontSize: 12 }}>Sua localização · {filtrados.length} fretes próximos</span>
        </div>

        {/* Filtros */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>Tipo de frete</div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {[["todos", "Todos"], ["urbano", "🏙️ Urbano"], ["intermunicipal", "🛣️ Intermunic."], ["interestadual", "🗺️ Interestadual"]].map(([id, label]) => (
              <button key={id} onClick={() => setFiltroTipo(id)} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid", borderColor: filtroTipo === id ? "var(--orange)" : "#333", background: filtroTipo === id ? "var(--orange)" : "var(--dark3)", color: filtroTipo === id ? "#fff" : "#888", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "Barlow, sans-serif" }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>Peso da carga</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["todos", "Todos"], ["leve", "Até 3t"], ["medio", "3–14t"], ["pesado", "+14t"]].map(([id, label]) => (
              <button key={id} onClick={() => setFiltroPeso(id)} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid", borderColor: filtroPeso === id ? "var(--orange)" : "#333", background: filtroPeso === id ? "var(--orange)" : "var(--dark3)", color: filtroPeso === id ? "#fff" : "#888", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Barlow, sans-serif" }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
          {online ? `${filtrados.length || disponiveis.length} Fretes Disponíveis` : "Você está offline"}
        </div>

        {!online && (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "#555" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>😴</div>
            <p style={{ fontWeight: 600 }}>Você está offline</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Ative o toggle para receber fretes</p>
          </div>
        )}

        {online && loading && <Loading />}

        {online && !loading && (disponiveis.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "#555" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <p style={{ fontWeight: 600 }}>Nenhum frete disponível</p>
            <p style={{ fontSize: 13, marginTop: 4, color: "#444" }}>Novos fretes aparecem aqui automaticamente</p>
          </div>
        ) : (disponiveis).map(f => {
          const cargaObj = TIPOS_CARGA.find(c => c.id === f.tipo_carga);
          return (
            <div key={f.id} className="uber-card" onClick={() => onNavigate("aceitar-frete", f)}>
              <div className="uber-card-header">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="tag-chip">{cargaObj?.icon || "📦"} {cargaObj?.label || f.tipo_carga}</span>
                    <span className="tag-chip">📏 {f.distancia_km} km</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>⚖️ {f.peso_tons}t · 🚛 {f.tipo_veiculo}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="price">{formatMoney(f.valor_motorista || 0)}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>motorista</div>
                </div>
              </div>
              <div className="uber-card-footer">
                <span style={{ fontSize: 12, color: "#555" }}>📍 {f.distancia_motorista_km || "?"} km de você</span>
                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); onNavigate("aceitar-frete", f); }}>Ver frete</button>
              </div>
            </div>
          );
        }))}
      </div>
      <BottomNavMotorista active="home" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// ACEITAR FRETE
// ─────────────────────────────────────────────
function AceitarFreteScreen({ frete, onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!frete) return <Loading />;
  const cargaObj = TIPOS_CARGA.find(c => c.id === frete.tipo_carga);

  const aceitar = async () => {
    setLoading(true); setError("");
    try { await api("PATCH", `/api/fretes/${frete.id}/aceitar`, {}, token); onNavigate("meus-fretes-motorista"); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button><h1>Aceitar Frete</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        <div style={{ textAlign: "center", padding: "16px 0 24px" }}>
          <div className="price" style={{ fontSize: 42 }}>{formatMoney(frete.valor_motorista || 0)}</div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>Seu valor como motorista</div>
          <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>Plataforma: {formatMoney(frete.comissao_truker || 0)} · Total: {formatMoney(frete.valor_final || 0)}</div>
        </div>
        <div className="card">
          <div className="map-placeholder">
            <div style={{ fontSize: 28 }}>🗺️</div>
            <span style={{ fontWeight: 700 }}>{frete.origem_cidade || "—"} → {frete.dest_cidade || "—"}</span>
          </div>
          <div className="info-row"><span className="info-label">Distância</span><span className="info-value">{frete.distancia_km} km</span></div>
          <div className="info-row"><span className="info-label">Tipo de carga</span><span className="info-value">{cargaObj?.icon} {cargaObj?.label || frete.tipo_carga}</span></div>
          <div className="info-row"><span className="info-label">Peso</span><span className="info-value">{frete.peso_tons}t</span></div>
          <div className="info-row"><span className="info-label">Veículo necessário</span><span className="info-value">{frete.tipo_veiculo}</span></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {frete.precisa_munck && <span className="tag-chip">🏗️ Precisa Munck</span>}
          {frete.precisa_empilhadeira && <span className="tag-chip">🏭 Empilhadeira no pátio</span>}
        </div>
        <button className="btn btn-primary" onClick={aceitar} disabled={loading} style={{ marginBottom: 10 }}>{loading ? "Aceitando..." : "✅ Aceitar Frete"}</button>
        <button className="btn btn-secondary" onClick={() => onNavigate("home-motorista")}>Voltar</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MEUS FRETES MOTORISTA
// ─────────────────────────────────────────────
function MeusFretesMot({ onNavigate }) {
  const { token } = useAuth();
  const [fretes, setFretes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("GET", "/api/fretes", null, token).then(setFretes).catch(() => setFretes([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <div className="header"><h1>Meus Fretes</h1></div>
      <div className="content">
        {loading ? <Loading /> : fretes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "#555" }}><div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>Nenhum frete aceito ainda</div>
        ) : fretes.map(f => (
          <div key={f.id} className="frete-card" onClick={() => onNavigate("em-transito", f)}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <StatusBadge status={f.status} />
              <div className="price">{formatMoney(f.valor_motorista || 0)}</div>
            </div>
            <div className="route">{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
            <div className="meta"><span>📦 {f.tipo_carga}</span><span>📏 {f.distancia_km} km</span></div>
          </div>
        ))}
      </div>
      <BottomNavMotorista active="fretes" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// EM TRÂNSITO
// ─────────────────────────────────────────────
function EmTransitoScreen({ frete, onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFreteRetorno, setShowFreteRetorno] = useState(false);
  if (!frete) return <Loading />;

  const atualizarStatus = async (status) => {
    setLoading(true);
    try {
      await api("PATCH", `/api/fretes/${frete.id}/status`, { status }, token);
      if (status === "entregue") setShowFreteRetorno(true);
      else onNavigate("meus-fretes-motorista");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fretesRetorno = [
    { id: "r1", origem: frete.dest_cidade || "SP", destino: frete.origem_cidade || "CWB", distancia: Math.round(frete.distancia_km * 0.95), valor: formatMoney(Math.round((frete.valor_motorista || 0) * 0.85)), tipo: "Carga Seca" },
    { id: "r2", origem: frete.dest_cidade || "SP", destino: "Campinas, SP", distancia: 100, valor: "R$ 980,00", tipo: "Graneleiro" },
  ];

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("meus-fretes-motorista")}>←</button><h1>Frete Ativo</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        {showFreteRetorno && (
          <div className="alert alert-info">
            🎯 Descarga quase concluída! Fretes de retorno disponíveis:
            {fretesRetorno.map(fr => (
              <div key={fr.id} className="frete-card" style={{ marginTop: 8 }} onClick={() => onNavigate("aceitar-frete", fr)}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{fr.origem} → {fr.destino}</span>
                  <span style={{ color: "var(--orange)", fontWeight: 800 }}>{fr.valor}</span>
                </div>
                <div className="meta" style={{ marginTop: 4 }}><span>📦 {fr.tipo}</span><span>📏 {fr.distancia} km</span></div>
              </div>
            ))}
          </div>
        )}
        <StatusBadge status={frete.status} />
        <div className="card" style={{ marginTop: 12 }}>
          <div className="map-placeholder" style={{ height: 180 }}>
            <div style={{ fontSize: 36 }}>📍</div>
            <span style={{ fontWeight: 700 }}>Rastreamento ativo</span>
            <span style={{ fontSize: 12 }}>{frete.origem_cidade || "—"} → {frete.dest_cidade || "—"}</span>
          </div>
          <div className="info-row"><span className="info-label">Distância total</span><span className="info-value">{frete.distancia_km} km</span></div>
          <div className="info-row"><span className="info-label">Seu valor</span><span className="info-value" style={{ color: "var(--orange)" }}>{formatMoney(frete.valor_motorista || 0)}</span></div>
        </div>
        <button className="btn btn-secondary" style={{ marginBottom: 10 }} onClick={() => onNavigate("chat", { frete })}>💬 Chat com Contratante</button>
        {frete.status === "aceito" && <button className="btn btn-primary" style={{ marginBottom: 10 }} onClick={() => atualizarStatus("coletando")} disabled={loading}>🚛 Iniciar Coleta</button>}
        {frete.status === "coletando" && <button className="btn btn-primary" style={{ marginBottom: 10 }} onClick={() => atualizarStatus("em_rota")} disabled={loading}>🛣️ Em Rota</button>}
        {frete.status === "em_rota" && (
          <>
            <button className="btn btn-secondary" style={{ marginBottom: 10 }} onClick={() => setShowFreteRetorno(true)}>🔔 Descarga quase acabando</button>
            <button className="btn btn-success" onClick={() => atualizarStatus("entregue")} disabled={loading}>✅ Confirmar Entrega</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PERFIL MOTORISTA
// ─────────────────────────────────────────────
function PerfilMotorista({ onNavigate }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("resumo");
  const [kmVazio] = useState(342);
  const [metaKmVazio, setMetaKmVazio] = useState(800);
  const [editMeta, setEditMeta] = useState(false);
  const [novaMeta, setNovaMeta] = useState("800");
  const pctMeta = Math.min(100, Math.round((kmVazio / metaKmVazio) * 100));

  const kmVazioPorCarga = [
    { tipo: "Carga Seca", icon: "📦", km: 180, fretes: 12 },
    { tipo: "Graneleiro", icon: "🌾", km: 95, fretes: 8 },
    { tipo: "Refrigerada", icon: "❄️", km: 42, fretes: 5 },
    { tipo: "Líquidos", icon: "💧", km: 25, fretes: 3 },
  ];

  const ganhosPorMes = [
    { mes: "Abr", valor: 11200 }, { mes: "Mai", valor: 13800 },
    { mes: "Jun", valor: 14280 },
  ];

  return (
    <div className="screen">
      <div className="header"><h1>Perfil</h1></div>
      <div className="content">
        {/* Header perfil */}
        <div style={{ textAlign: "center", padding: "14px 0 20px" }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 28 }}>🚛</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.nome}</div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 3 }}>{user?.email}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
            <span className="badge badge-active">Motorista</span>
            <span className="badge" style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.4)" }}>⭐ 4.8</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar" style={{ marginBottom: 14 }}>
          {[["resumo", "Resumo"], ["ganhos", "Ganhos"], ["km-vazio", "KM Vazio"], ["docs", "Docs"]].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {tab === "resumo" && (
          <>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="stat-card"><div className="stat-value">28</div><div className="stat-label">Fretes feitos</div></div>
              <div className="stat-card"><div className="stat-value">4.8</div><div className="stat-label">Avaliação</div></div>
              <div className="stat-card"><div className="stat-value">{formatKm(8420)}</div><div className="stat-label">Km carregado</div></div>
              <div className="stat-card"><div className="stat-value">{formatKm(kmVazio)}</div><div className="stat-label">Km vazio</div></div>
            </div>
            <div className="card">
              <div className="card-title">Dados do veículo</div>
              <div className="info-row"><span className="info-label">Tipo</span><span className="info-value">🚛 Truck</span></div>
              <div className="info-row"><span className="info-label">Placa</span><span className="info-value">{user?.placa || "ABC-1234"}</span></div>
              <div className="info-row"><span className="info-label">RNTRC</span><span className="info-value">{user?.rntrc || "—"}</span></div>
              <div className="info-row"><span className="info-label">CNH</span><span className="info-value">{user?.cnh || "—"}</span></div>
            </div>
            {[["📦", "Meus Fretes", "meus-fretes-motorista"], ["💬", "Chat", "chat"], ["⭐", "Avaliações", "avaliacoes"]].map(([icon, label, screen]) => (
              <div key={label} className="card" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => onNavigate(screen)}>
                <span style={{ fontSize: 20 }}>{icon}</span><span style={{ fontWeight: 600 }}>{label}</span><span style={{ marginLeft: "auto", color: "#555" }}>›</span>
              </div>
            ))}
            <button className="btn btn-danger" style={{ marginTop: 8 }} onClick={logout}>Sair da Conta</button>
          </>
        )}

        {tab === "ganhos" && (
          <>
            <div className="card" style={{ textAlign: "center", borderColor: "rgba(249,115,22,0.3)" }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>Ganhos este mês</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--orange)" }}>R$ 14.280,00</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>28 fretes · média R$ 510/frete</div>
            </div>
            <div className="card">
              <div className="card-title">Histórico mensal</div>
              {ganhosPorMes.map(m => (
                <div key={m.mes} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                    <span style={{ fontWeight: 700 }}>{m.mes}/2026</span>
                    <span style={{ color: "var(--green)", fontWeight: 700 }}>{formatMoney(m.valor)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill green" style={{ width: `${Math.round((m.valor / 15000) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Breakdown</div>
              <div className="info-row"><span className="info-label">Valor bruto fretes</span><span className="info-value" style={{ color: "var(--green)" }}>R$ 15.867,00</span></div>
              <div className="info-row"><span className="info-label">Comissão TRUKER (10%)</span><span className="info-value" style={{ color: "var(--red)" }}>- R$ 1.587,00</span></div>
              <div className="info-row"><span className="info-label">Líquido recebido</span><span className="info-value" style={{ color: "var(--orange)", fontWeight: 800, fontSize: 16 }}>R$ 14.280,00</span></div>
            </div>
          </>
        )}

        {tab === "km-vazio" && (
          <>
            <div className="card">
              <div className="card-title">Meta de KM Vazio (mensal)</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: pctMeta > 100 ? "var(--red)" : pctMeta > 75 ? "var(--orange)" : "var(--green)" }}>{formatKm(kmVazio)}</div>
                  <div style={{ fontSize: 12, color: "#555" }}>rodado vazio este mês</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {!editMeta ? (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Meta: {formatKm(metaKmVazio)}</div>
                      <span style={{ fontSize: 12, color: "var(--orange)", cursor: "pointer" }} onClick={() => setEditMeta(true)}>✏️ Editar</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="number" value={novaMeta} onChange={e => setNovaMeta(e.target.value)} style={{ width: 80, background: "var(--dark3)", border: "1px solid #333", borderRadius: 8, padding: "6px 8px", color: "var(--white)", fontSize: 14, fontFamily: "Barlow, sans-serif" }} />
                      <button className="btn btn-primary btn-sm" onClick={() => { setMetaKmVazio(Number(novaMeta)); setEditMeta(false); }}>OK</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className={`progress-fill ${pctMeta > 100 ? "red" : pctMeta > 75 ? "" : "green"}`} style={{ width: `${Math.min(pctMeta, 100)}%` }} />
              </div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
                {pctMeta >= 100 ? "⚠️ Meta ultrapassada! Aceite fretes de retorno." : pctMeta > 75 ? "⚡ Atenção: próximo da meta." : `✅ ${formatKm(metaKmVazio - kmVazio)} restantes até a meta`}
              </div>
            </div>
            <div className="card">
              <div className="card-title">KM Vazio por tipo de carga</div>
              {kmVazioPorCarga.map(c => (
                <div key={c.tipo} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                    <span>{c.icon} {c.tipo}</span>
                    <span style={{ color: "#666" }}>{formatKm(c.km)} · {c.fretes} fretes</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.round((c.km / kmVazio) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Eficiência geral</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--green)" }}>✅ Carregado: {formatKm(8420)}</span>
                <span style={{ fontSize: 13, color: "var(--red)" }}>⬜ Vazio: {formatKm(kmVazio)}</span>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill green" style={{ width: `${Math.round((8420 / (8420 + kmVazio)) * 100)}%` }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: "var(--green)" }}>
                {Math.round((8420 / (8420 + kmVazio)) * 100)}% de eficiência
              </div>
            </div>
          </>
        )}

        {tab === "docs" && (
          <>
            <div className="card">
              <div className="card-title">Documentos pessoais</div>
              {[["📄 CNH", "Aprovado", true], ["🪪 CPF", "Aprovado", true], ["📋 Comprovante endereço", "Pendente", false]].map(([doc, status, ok]) => (
                <div key={doc} className="info-row">
                  <span className="info-label">{doc}</span>
                  <span className={`badge ${ok ? "badge-active" : "badge-pending"}`}>{status}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Documentos do veículo</div>
              {[["🚛 CRLV", "Aprovado", true], ["📋 RNTRC/ANTT", "Aprovado", true], ["📸 Foto placa", "Aprovado", true], ["🔍 Vistoria", "Pendente", false]].map(([doc, status, ok]) => (
                <div key={doc} className="info-row">
                  <span className="info-label">{doc}</span>
                  <span className={`badge ${ok ? "badge-active" : "badge-pending"}`}>{status}</span>
                </div>
              ))}
            </div>
            <div className="upload-area" onClick={() => {}}>📤 Enviar documento pendente</div>
          </>
        )}
      </div>
      <BottomNavMotorista active="perfil" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────
function ChatScreen({ data, onNavigate }) {
  const { user } = useAuth();
  const frete = data?.frete;
  const [msgs, setMsgs] = useState([
    { id: 1, texto: "Olá! Tudo certo com o frete?", de: "outro", hora: "14:20" },
    { id: 2, texto: "Sim! Estou a caminho.", de: "eu", hora: "14:21" },
  ]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = () => {
    if (!text.trim()) return;
    const now = new Date();
    setMsgs(m => [...m, { id: Date.now(), texto: text, de: "eu", hora: `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}` }]);
    setText("");
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Chat</h1></div>
      <div className="chat-area">
        {msgs.map(m => (
          <div key={m.id} style={{ alignSelf: m.de === "eu" ? "flex-end" : "flex-start" }}>
            <div className={`msg ${m.de === "eu" ? "msg-me" : "msg-other"}`}>{m.texto}</div>
            <div className="msg-time">{m.hora}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input">
        <input placeholder="Digite uma mensagem..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
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
    try { await api("POST", `/api/fretes/${frete?.id}/avaliar`, { nota, comentario }, token); setSuccess(true); setTimeout(() => onNavigate("meus-fretes"), 2000); }
    catch { setSuccess(true); }
    finally { setLoading(false); }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("meus-fretes")}>←</button><h1>Avaliar</h1></div>
      <div className="content">
        {success ? <div className="alert alert-success">✅ Avaliação enviada! Obrigado.</div> : (
          <>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>⭐</div>
              <div style={{ fontWeight: 700, marginBottom: 18 }}>Como foi a experiência?</div>
              <div className="star-rating" style={{ justifyContent: "center" }}>
                {[1, 2, 3, 4, 5].map(n => <span key={n} onClick={() => setNota(n)} style={{ fontSize: 36, cursor: "pointer" }}>{n <= nota ? "⭐" : "☆"}</span>)}
              </div>
              <div style={{ marginTop: 8, color: "#555", fontSize: 13 }}>{nota}/5</div>
            </div>
            <div className="field"><label>Comentário</label><textarea placeholder="Como foi o serviço?" rows={4} value={comentario} onChange={e => setComentario(e.target.value)} style={{ resize: "none" }} /></div>
            <button className="btn btn-primary" onClick={enviar} disabled={loading}>{loading ? "Enviando..." : "Enviar Avaliação"}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BOTTOM NAVS
// ─────────────────────────────────────────────
function BottomNavContratante({ active, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {[["home", "🏠", "Home", "home-contratante"], ["fretes", "📦", "Fretes", "meus-fretes"], ["perfil", "👤", "Perfil", "perfil"]].map(([id, icon, label, screen]) => (
        <button key={id} className={`nav-item ${active === id ? "active" : ""}`} onClick={() => onNavigate(screen)}><span>{icon}</span>{label}</button>
      ))}
    </nav>
  );
}

function BottomNavMotorista({ active, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {[["home", "🚛", "Fretes", "home-motorista"], ["meus", "📋", "Meus", "meus-fretes-motorista"], ["perfil", "👤", "Perfil", "perfil-motorista"]].map(([id, icon, label, screen]) => (
        <button key={id} className={`nav-item ${active === id ? "active" : ""}`} onClick={() => onNavigate(screen)}><span>{icon}</span>{label}</button>
      ))}
    </nav>
  );
}

// ─────────────────────────────────────────────
// PLACEHOLDER
// ─────────────────────────────────────────────
function PlaceholderScreen({ titulo, icon, onNavigate }) {
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>{titulo}</h1></div>
      <div className="content">
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#555" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
          <p style={{ fontWeight: 600 }}>Em breve</p>
          <p style={{ fontSize: 13, marginTop: 6, color: "#444" }}>Esta funcionalidade será disponibilizada em breve.</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────
function Router() {
  const { user } = useAuth();
  const [screen, setScreen] = useState("splash");
  const [screenData, setScreenData] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.tipo === "admin") setScreen("admin-dashboard");
      else if (user.tipo === "motorista") setScreen("home-motorista");
      else setScreen("home-contratante");
    }
  }, [user]);

  const navigate = (to, data = null) => {
    if (to === -1) { setScreen(user?.tipo === "motorista" ? "home-motorista" : user?.tipo === "admin" ? "admin-dashboard" : "home-contratante"); return; }
    setScreenData(data); setScreen(to); window.scrollTo(0, 0);
  };

  const p = { onNavigate: navigate };

  switch (screen) {
    case "splash": return <SplashScreen {...p} />;
    case "login": return <LoginScreen {...p} />;
    case "cadastro": return <CadastroScreen {...p} />;
    case "login-admin": return <AdminLoginScreen {...p} />;
    case "esqueci-senha": return <EsqueciSenhaScreen {...p} />;
    case "admin-dashboard": return <AdminDashboard {...p} />;
    case "home-contratante": return <ContratanteHome {...p} />;
    case "solicitar-frete": return <SolicitarFreteScreen {...p} />;
    case "meus-fretes": return <MeusFretes {...p} />;
    case "detalhe-frete": return <DetalheFrete frete={screenData} {...p} />;
    case "perfil": return <PerfilContratante {...p} />;
    case "home-motorista": return <MotoristaHome {...p} />;
    case "aceitar-frete": return <AceitarFreteScreen frete={screenData} {...p} />;
    case "meus-fretes-motorista": return <MeusFretesMot {...p} />;
    case "em-transito": return <EmTransitoScreen frete={screenData} {...p} />;
    case "perfil-motorista": return <PerfilMotorista {...p} />;
    case "chat": return <ChatScreen data={screenData} {...p} />;
    case "avaliar": return <AvaliarScreen data={screenData} {...p} />;
    case "pagamentos": return <PlaceholderScreen titulo="Pagamentos" icon="💳" {...p} />;
    case "avaliacoes": return <PlaceholderScreen titulo="Avaliações" icon="⭐" {...p} />;
    default: return <SplashScreen {...p} />;
  }
}

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────
export default function App() {
  return (
    <>
      <style>{css}</style>
      <AuthProvider><Router /></AuthProvider>
    </>
  );
}
