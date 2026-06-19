import { useState, useEffect, createContext, useContext, useRef } from "react";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const API_BASE = "https://truker-app-production.up.railway.app";
const ADMIN_EMAIL = "admin@truker.app";
const ADMIN_SENHA = "truker2024";
const VAPID_PUBLIC_KEY = "BPXxf7PJkl_WSVBkmMFljhbNEZfZs61C7aPrPkL48U_Nk7T4OYOny6vPSJX6ny03qzdO4LvuvSP5sCg9u5JAFLg";

// ─── Registrar Service Worker e assinar push ──────────────────
async function registrarPushNotifications(token) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("[TRUKER] Push não suportado neste browser");
    return;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[TRUKER] Permissão de notificação negada");
      return;
    }
    // Cancela subscription antiga e cria nova para garantir validade
    const subExistente = await reg.pushManager.getSubscription();
    if (subExistente) await subExistente.unsubscribe();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await api("POST", "/api/push/subscribe", { subscription: sub.toJSON() }, token);
    console.log("[TRUKER] Push subscrito:", sub.endpoint);
  } catch (err) {
    console.error("[TRUKER] Push registration error:", err);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

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

// Mapeamento frontend → backend (ANTT só aceita categorias básicas)
const CARGA_BACKEND_MAP = {
  carga_seca: "geral", graneleiro: "geral", refrigerada: "frigorificado",
  frigorifico: "frigorificado", mudanca: "geral", carga_viva: "geral",
  liquidos: "geral", inflamavel: "perigoso", perigosa: "perigoso",
  farmaceutico: "geral", eletronicos: "geral", alimentos: "geral",
  bebidas: "geral", construcao: "geral", maquinario: "geral",
  superdimensionado: "geral", residuos: "geral", veiculos: "geral",
  classificados: "geral", madeira: "geral",
};

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

  const updateUserData = (newData) => {
    const updated = { ...user, ...newData };
    setUser(updated);
    localStorage.setItem("truker_user", JSON.stringify(updated));
  };

  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem("truker_user");
    localStorage.removeItem("truker_token");
  };

  // Registra push notifications sempre que motorista abre o app
  useEffect(() => {
    if (user?.tipo === "motorista" && token) {
      registrarPushNotifications(token).then(() => {
        console.log("[TRUKER] Push registration OK para", user?.email);
      }).catch(err => {
        console.error("[TRUKER] Push registration ERRO:", err);
      });
    }
  }, [user?.id, token]);

  return <AuthContext.Provider value={{ user, token, login, logout, updateUserData }}>{children}</AuthContext.Provider>;
}

// ─────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --orange: #C9A84C; --orange-dark: #A8873A; --orange-light: rgba(201,168,76,0.12);
    --gold: #C9A84C; --gold-dark: #A8873A; --gold-light: rgba(201,168,76,0.12);
    --black: #F5F0E8; --dark: #FFFFFF; --dark2: #F9F5EE; --dark3: #EFE9DC; --dark4: #E5DDD0;
    --gray: #8A7E6E; --gray2: #A09282; --gray3: #C0B4A4;
    --white: #1A1209; --green: #2D7A3A; --red: #C0392B; --blue: #2563EB; --yellow: #C9A84C;
    --text: #1A1209; --text2: #4A3F30; --text3: #8A7E6E;
    --surface: #FFFFFF; --surface2: #F9F5EE; --surface3: #EFE9DC;
    --border: #DDD4C0; --border2: #E8E0D0;
  }
  body { font-family: 'Inter', sans-serif; background: var(--black); color: var(--white); min-height: 100vh; max-width: 430px; margin: 0 auto; }
  .screen { min-height: 100vh; display: flex; flex-direction: column; padding-bottom: 80px; }
  .header { background: var(--surface); padding: 14px 18px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .header h1 { font-family: 'Inter', sans-serif; font-size: 17px; font-weight: 700; color: var(--text); letter-spacing: -0.2px; }
  .back-btn { background: none; border: none; color: var(--text); font-size: 22px; cursor: pointer; padding: 4px; line-height: 1; }
  .content { flex: 1; padding: 16px; }
  .card { background: var(--surface); border-radius: 14px; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .card-title { font-size: 11px; font-weight: 700; color: var(--gray2); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 12px; }
  .btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn:active { transform: scale(0.97); }
  .btn-primary { background: linear-gradient(135deg, #C9A84C, #A8873A); color: #fff; box-shadow: 0 2px 8px rgba(201,168,76,0.3); }
  .btn-primary:hover { background: linear-gradient(135deg, #D4A843, #9A7930); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-outline { background: transparent; color: var(--gold); border: 2px solid var(--gold); }
  .btn-danger { background: var(--red); color: #fff; }
  .btn-success { background: var(--green); color: #fff; }
  .btn-sm { padding: 9px 14px; width: auto; font-size: 12px; border-radius: 8px; }
  .field { margin-bottom: 14px; }
  .field label { display: block; font-size: 11px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
  .field input, .field select, .field textarea { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; color: var(--text); font-family: 'Inter', sans-serif; font-size: 15px; outline: none; transition: all 0.15s; }
  .field input:focus, .field select:focus, .field textarea:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(201,168,76,0.12); }
  .field input::placeholder { color: var(--text3); }
  .field select option { background: var(--surface2); color: var(--text); }
  .input-eye { position: relative; }
  .input-eye input { padding-right: 44px; }
  .input-eye .eye { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--gray2); cursor: pointer; font-size: 18px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-pending { background: rgba(249,115,22,0.15); color: var(--orange); border: 1px solid rgba(249,115,22,0.4); }
  .badge-active { background: rgba(34,197,94,0.15); color: var(--green); border: 1px solid rgba(34,197,94,0.4); }
  .badge-done { background: rgba(99,102,241,0.15); color: #818CF8; border: 1px solid rgba(99,102,241,0.4); }
  .badge-cancel { background: rgba(239,68,68,0.15); color: var(--red); border: 1px solid rgba(239,68,68,0.3); }
  .badge-admin { background: rgba(245,158,11,0.15); color: var(--yellow); border: 1px solid rgba(245,158,11,0.4); }
  .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; background: var(--surface); border-top: 1px solid var(--border); display: flex; z-index: 100; box-shadow: 0 -2px 12px rgba(0,0,0,0.08); }
  .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 10px 6px; gap: 3px; cursor: pointer; border: none; background: none; color: var(--text3); font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; transition: color 0.15s; }
  .nav-item.active { color: var(--gold); }
  
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .info-row:last-child { border-bottom: none; }
  .info-label { font-size: 13px; color: var(--gray2); }
  .info-value { font-size: 13px; font-weight: 600; color: var(--white); text-align: right; max-width: 60%; }
  .alert { padding: 12px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; margin-bottom: 14px; }
  .alert-error { background: rgba(239,68,68,0.1); color: var(--red); border: 1px solid rgba(239,68,68,0.3); }
  .alert-success { background: rgba(34,197,94,0.1); color: var(--green); border: 1px solid rgba(34,197,94,0.3); }
  .alert-info { background: rgba(201,168,76,0.1); color: var(--gold); border: 1px solid rgba(201,168,76,0.3); }
  .logo-big { font-family: 'Inter', sans-serif; font-size: 56px; font-weight: 800; color: var(--gold); letter-spacing: 6px; text-transform: uppercase; }
  .frete-card { background: var(--surface); border-radius: 14px; padding: 16px; margin-bottom: 10px; border: 1px solid var(--border); cursor: pointer; transition: all 0.15s; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .frete-card:hover { border-color: var(--gold); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(201,168,76,0.15); }
  .frete-card:active { transform: scale(0.98); }
  .price { font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 800; color: var(--gold); }
  .route { font-size: 15px; font-weight: 700; margin: 8px 0 4px; }
  .meta { font-size: 12px; color: var(--gray2); display: flex; gap: 12px; flex-wrap: wrap; }
  .loading { text-align: center; padding: 40px; color: var(--gray2); font-size: 14px; }
  .spinner { width: 28px; height: 28px; border: 3px solid #333; border-top-color: var(--orange); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .divider { height: 1px; background: var(--border); margin: 16px 0; }
  .tipo-tag { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .tipo-tag button { padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface2); color: var(--text3); font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
  .tipo-tag button.active { background: linear-gradient(135deg, #C9A84C, #A8873A); color: #fff; border-color: var(--gold); }
  .map-placeholder { background: var(--surface2); border-radius: 12px; height: 160px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; color: var(--text3); font-size: 13px; border: 1px dashed var(--border); margin-bottom: 14px; }
  .star-rating { display: flex; gap: 6px; font-size: 28px; cursor: pointer; }
  .chat-area { flex: 1; overflow-y: auto; padding: 14px; padding-top: 18px; display: flex; flex-direction: column; gap: 10px; }
  .msg { max-width: 80%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.4; }
  .msg-me { background: var(--orange); color: #fff; align-self: flex-end; border-bottom-right-radius: 2px; }
  .msg-other { background: var(--dark3); color: var(--white); align-self: flex-start; border-bottom-left-radius: 2px; }
  .msg-time { font-size: 10px; opacity: 0.5; margin-top: 3px; text-align: right; }
  .chat-input { display: flex; gap: 8px; padding: 10px 14px; background: var(--surface); border-top: 1px solid var(--border); }
  .chat-input input { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 20px; padding: 10px 16px; color: var(--text); font-family: 'Inter', sans-serif; font-size: 14px; outline: none; }
  .chat-send { width: 40px; height: 40px; border-radius: 50%; background: var(--gold); border: none; color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .stat-card { background: var(--surface); border-radius: 12px; padding: 14px; text-align: center; border: 1px solid var(--border); box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .stat-value { font-family: 'Inter', sans-serif; letter-spacing: -0.5px; font-size: 28px; font-weight: 800; color: var(--orange); }
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
  .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: var(--border); border-radius: 26px; transition: 0.3s; }
  .toggle-slider:before { content: ""; position: absolute; width: 20px; height: 20px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
  .toggle input:checked + .toggle-slider { background: var(--gold); }
  .toggle input:checked + .toggle-slider:before { transform: translateX(22px); }
  .tag-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; background: var(--gold-light); color: var(--gold); font-size: 11px; font-weight: 700; border: 1px solid rgba(201,168,76,0.3); margin: 2px; }
  .upload-area { border: 2px dashed var(--border); border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; transition: border-color 0.15s; color: var(--text3); font-size: 13px; }
  .upload-area:hover { border-color: var(--gold); color: var(--gold); }
  .section-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; margin-top: 4px; }
  .km-vazio-bar { background: var(--dark2); border-radius: 12px; padding: 14px; margin-bottom: 10px; border: 1px solid #272727; }
  .uber-card { background: var(--surface); border-radius: 16px; margin-bottom: 10px; border: 1px solid var(--border); overflow: hidden; cursor: pointer; transition: all 0.15s; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .uber-card:hover { border-color: var(--gold); transform: translateY(-1px); }
  .uber-card-header { padding: 14px 16px; display: flex; justify-content: space-between; align-items: flex-start; }
  .uber-card-footer { background: var(--surface2); padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); }
  .tab-bar { display: flex; gap: 0; margin-bottom: 16px; background: var(--surface2); border-radius: 10px; padding: 3px; border: 1px solid var(--border); }
  .tab-btn { flex: 1; padding: 8px; border: none; background: none; color: var(--text3); font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; border-radius: 8px; transition: all 0.15s; text-transform: uppercase; }
  .tab-btn.active { background: linear-gradient(135deg, #C9A84C, #A8873A); color: #fff; }
  .admin-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border); }
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

// ─────────────────────────────────────────────
// MAPA LEAFLET + OPENSTREETMAP (gratuito)
// ─────────────────────────────────────────────
function MapaLeaflet({ lat, lng, zoom = 14, height = 200, marcadores = [], origem = null, destino = null, rotas = [] }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const marcadorRef = useRef(null);
  const propsRef = useRef({ lat, lng, zoom, origem, destino, rotas });
  propsRef.current = { lat, lng, zoom, origem, destino, rotas };

  const initMap = () => {
    if (!divRef.current || mapRef.current) return;
    const L = window.L;
    const p = propsRef.current;
    const centerLat = p.lat || p.origem?.lat || -25.4284;
    const centerLng = p.lng || p.origem?.lng || -49.2733;
    const map = L.map(divRef.current, { zoomControl: false, attributionControl: false })
      .setView([centerLat, centerLng], p.zoom);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);

    // Marcador do motorista (laranja)
    if (p.lat && p.lng) {
      const icon = L.divIcon({
        html: '<div style="background:#C9A84C;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(201,168,76,0.8)"></div>',
        className: "", iconSize: [14, 14], iconAnchor: [7, 7],
      });
      marcadorRef.current = L.marker([p.lat, p.lng], { icon }).addTo(map);
    }

    // Marcador de coleta (verde)
    if (p.origem?.lat && p.origem?.lng) {
      const icon = L.divIcon({
        html: `<div style="background:#22C55E;color:#fff;padding:2px 8px;border-radius:6px;font-size:9px;font-weight:700;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.4)">📍 ${p.origem.label || "Coleta"}</div>`,
        className: "", iconAnchor: [0, 12],
      });
      L.marker([p.origem.lat, p.origem.lng], { icon }).addTo(map);
    }

    // Marcador de entrega (vermelho)
    if (p.destino?.lat && p.destino?.lng) {
      const icon = L.divIcon({
        html: `<div style="background:#EF4444;color:#fff;padding:2px 8px;border-radius:6px;font-size:9px;font-weight:700;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.4)">🏁 ${p.destino.label || "Entrega"}</div>`,
        className: "", iconAnchor: [0, 12],
      });
      L.marker([p.destino.lat, p.destino.lng], { icon }).addTo(map);
    }

    // Marcadores de fretes disponíveis (azul)
    marcadores.forEach(m => {
      if (!m.lat || !m.lng) return;
      const icon = L.divIcon({
        html: `<div style="background:#3B82F6;color:#fff;padding:2px 7px;border-radius:6px;font-size:9px;font-weight:700;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.4)">📦 ${m.label || ""}</div>`,
        className: "", iconAnchor: [0, 8],
      });
      L.marker([m.lat, m.lng], { icon }).addTo(map);
    });

    // Ajusta zoom para mostrar todos os pontos
    const pontos = [];
    if (p.lat && p.lng) pontos.push([p.lat, p.lng]);
    if (p.origem?.lat) pontos.push([p.origem.lat, p.origem.lng]);
    if (p.destino?.lat) pontos.push([p.destino.lat, p.destino.lng]);
    (p.rotas || []).forEach(r => {
      if (r.origem?.lat) pontos.push([r.origem.lat, r.origem.lng]);
      if (r.destino?.lat) pontos.push([r.destino.lat, r.destino.lng]);
    });
    if (pontos.length > 1) map.fitBounds(L.latLngBounds(pontos), { padding: [35, 35] });

    mapRef.current = map;

    // Rota principal via OSRM (gratuito, sem API key)
    const start = p.lat && p.lng ? `${p.lng},${p.lat}` : p.origem?.lng ? `${p.origem.lng},${p.origem.lat}` : null;
    const end = p.destino?.lat ? `${p.destino.lng},${p.destino.lat}` : p.origem?.lat ? `${p.origem.lng},${p.origem.lat}` : null;
    if (start && end && start !== end) {
      fetch(`https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`)
        .then(r => r.json())
        .then(data => {
          if (data.routes?.[0]?.geometry && mapRef.current) {
            window.L.geoJSON(data.routes[0].geometry, {
              style: { color: "#F97316", weight: 4, opacity: 0.75, dashArray: "10,6" }
            }).addTo(mapRef.current);
          }
        })
        .catch(() => {});
    }

    // Múltiplas rotas de fretes ativos (cada uma com cor e número)
    const coresRotas = ["#C9A84C", "#2D7A3A", "#2563EB", "#9333EA", "#EF4444"];
    (p.rotas || []).forEach((rota, idx) => {
      const cor = coresRotas[idx % coresRotas.length];
      const num = idx + 1;
      if (rota.origem?.lat && rota.origem?.lng) {
        const icon = L.divIcon({
          html: `<div style="background:${cor};color:#fff;padding:3px 8px;border-radius:6px;font-size:9px;font-weight:800;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.4)">${num}📍 ${rota.origem.label||"Coleta"}</div>`,
          className: "", iconAnchor: [0, 12],
        });
        L.marker([rota.origem.lat, rota.origem.lng], { icon }).addTo(map);
      }
      if (rota.destino?.lat && rota.destino?.lng) {
        const icon = L.divIcon({
          html: `<div style="background:${cor};color:#fff;padding:3px 8px;border-radius:6px;font-size:9px;font-weight:800;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.4)">${num}🏁 ${rota.destino.label||"Entrega"}</div>`,
          className: "", iconAnchor: [0, 12],
        });
        L.marker([rota.destino.lat, rota.destino.lng], { icon }).addTo(map);
      }
      if (rota.origem?.lat && rota.destino?.lat) {
        const s = `${rota.origem.lng},${rota.origem.lat}`;
        const e = `${rota.destino.lng},${rota.destino.lat}`;
        fetch(`https://router.project-osrm.org/route/v1/driving/${s};${e}?overview=full&geometries=geojson`)
          .then(r => r.json())
          .then(data => {
            if (data.routes?.[0]?.geometry && mapRef.current) {
              window.L.geoJSON(data.routes[0].geometry, {
                style: { color: cor, weight: 3, opacity: 0.85 }
              }).addTo(mapRef.current);
            }
          })
          .catch(() => {});
      }
    });
  };

  useEffect(() => {
    if (window.L) { initMap(); return; }
    if (!document.querySelector("#leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!document.querySelector("#leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js"; script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; marcadorRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.L || !lat || !lng) return;
    if (marcadorRef.current) marcadorRef.current.setLatLng([lat, lng]);
    else {
      const L = window.L;
      const icon = L.divIcon({
        html: '<div style="background:#C9A84C;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(201,168,76,0.8)"></div>',
        className: "", iconSize: [14, 14], iconAnchor: [7, 7],
      });
      marcadorRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current);
    }
  }, [lat, lng]);

  return (
    <div ref={divRef} style={{ width: "100%", height: `${height}px`, borderRadius: 12, overflow: "hidden", position: "relative", zIndex: 1, background: "#1C1C1C" }} />
  );
}
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
// ─────────────────────────────────────────────
// LOGO COMPONENT
// ─────────────────────────────────────────────
function TrukerLogo({ size = "md" }) {
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
      {s.tagline && <div style={{ fontSize: 12, color: "#8A7E6E", marginTop: 5, letterSpacing: 0.5 }}>Fretes pesados, sem km vazio</div>}
    </div>
  );
}

function SplashScreen({ onNavigate }) {
  const { user } = useAuth();
  useEffect(() => {
    const t = setTimeout(() => {
      if (user) {
        if (user.tipo === "admin") onNavigate("admin-dashboard");
        else if (user.tipo === "motorista") onNavigate("home-motorista");
        else onNavigate("home-contratante");
      } else {
        onNavigate("login");
      }
    }, 1800);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "linear-gradient(180deg, #F5F0E8 0%, #EFE9DC 100%)" }}>
      <TrukerLogo size="lg" />
      <div style={{ marginTop: 52, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", opacity: 0.4 }} />
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", opacity: 0.7 }} />
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C" }} />
      </div>
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
        <TrukerLogo size="md" />
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="field"><label>Email</label><input type="email" placeholder="seu@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
      <div className="field"><label>Senha</label><PasswordInput value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} /></div>
      <p style={{ textAlign: "right", marginBottom: 16, fontSize: 13 }}>
        <span style={{ color: "var(--gold)", cursor: "pointer" }} onClick={() => onNavigate("esqueci-senha")}>Esqueceu a senha?</span>
      </p>
      <button className="btn btn-primary" onClick={handle} disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      <p style={{ textAlign: "center", marginTop: 20, color: "var(--text3)", fontSize: 14 }}>
        Não tem conta? <span style={{ color: "var(--gold)", cursor: "pointer", fontWeight: 600 }} onClick={() => onNavigate("cadastro")}>Cadastre-se</span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// ESQUECI SENHA — ✅ REAL (integrado ao backend)
// ─────────────────────────────────────────────
function EsqueciSenhaScreen({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codigoTeste, setCodigoTeste] = useState(null);

  const enviarCodigo = async () => {
    if (!email) return setError("Digite seu email");
    setError(""); setLoading(true);
    try {
      const resp = await api("POST", "/api/auth/esqueci-senha", { email });
      if (resp.codigo_teste) setCodigoTeste(resp.codigo_teste);
      setStep(2);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const verificarCodigo = async () => {
    if (code.length < 6) return setError("Digite o código de 6 dígitos");
    setError(""); setLoading(true);
    try {
      await api("POST", "/api/auth/verificar-codigo-senha", { email, codigo: code });
      setStep(3);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const redefinir = async () => {
    if (!novaSenha || novaSenha.length < 6) return setError("A senha deve ter pelo menos 6 caracteres");
    setError(""); setLoading(true);
    try {
      await api("POST", "/api/auth/redefinir-senha", { email, codigo: code, novaSenha });
      setStep(4);
      setTimeout(() => onNavigate("login"), 3000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <button className="back-btn" style={{ marginBottom: 24 }} onClick={() => onNavigate("login")}>← Voltar</button>
      <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Recuperar senha</div>
      {step === 1 && <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Digite seu email para receber o código de recuperação.</p>}
      {step === 2 && <p style={{ color: "var(--text3)", fontSize: 14, marginBottom: 24 }}>Código enviado para <strong style={{ color: "var(--gold)" }}>{email}</strong>. Digite abaixo.</p>}
      {step === 2 && codigoTeste && (
        <div style={{ background: "rgba(201,168,76,0.1)", border: "1px dashed var(--gold)", borderRadius: 10, padding: "14px 12px", marginBottom: 14, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🧪 Modo teste — email indisponível</div>
          <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 14, color: "var(--text)", fontFamily: "monospace" }}>{codigoTeste}</div>
        </div>
      )}
      {step === 3 && <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Defina sua nova senha.</p>}
      {step === 4 && (
        <div style={{ textAlign: "center", paddingTop: 20 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Senha redefinida!</div>
          <div style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>Redirecionando para o login em instantes...</div>
          <button className="btn btn-primary" onClick={() => onNavigate("login")}>Ir para o Login agora</button>
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {step === 1 && (
        <>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" /></div>
          <button className="btn btn-primary" onClick={enviarCodigo} disabled={loading}>{loading ? "Enviando..." : "Enviar código"}</button>
        </>
      )}
      {step === 2 && (
        <>
          <div className="field">
            <label>Código de verificação</label>
            <input
              type="text" inputMode="numeric" maxLength={6}
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              style={{ fontSize: 28, letterSpacing: 12, textAlign: "center", fontFamily: "monospace" }}
            />
          </div>
          <button className="btn btn-primary" onClick={verificarCodigo} disabled={loading}>{loading ? "Verificando..." : "Verificar código"}</button>
          <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={enviarCodigo} disabled={loading}>🔄 Reenviar código</button>
        </>
      )}
      {step === 3 && (
        <>
          <div className="field"><label>Nova senha</label><PasswordInput value={novaSenha} onChange={e => setNovaSenha(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={redefinir} disabled={loading}>{loading ? "Salvando..." : "Redefinir senha"}</button>
        </>
      )}
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
  const [pendingUser, setPendingUser] = useState(null);
  const [codigoVerif, setCodigoVerif] = useState("");
  const [reenviando, setReenviando] = useState(false);
  const [reenviadoMsg, setReenviadoMsg] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleCarga = (id) => setForm(f => ({ ...f, tiposCarga: f.tiposCarga.includes(id) ? f.tiposCarga.filter(x => x !== id) : [...f.tiposCarga, id] }));

  const finalizar = async () => {
    if (!aceitouTermos) return setError("Você precisa aceitar os Termos de Uso para continuar");
    setError(""); setLoading(true);
    try {
      const data = await api("POST", "/api/auth/cadastro", { ...form, tipo });
      setPendingUser({ usuario: data.usuario, token: data.token, codigo_teste: data.codigo_teste || null });
      setStep(99);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const verificarEmail = async () => {
    if (codigoVerif.length !== 6) return setError("Digite o código de 6 dígitos");
    setError(""); setLoading(true);
    try {
      await api("POST", "/api/auth/verificar-email", { usuarioId: pendingUser.usuario.id, codigo: codigoVerif });
      login(pendingUser.usuario, pendingUser.token);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const reenviarCodigo = async () => {
    setReenviando(true); setReenviadoMsg("");
    try {
      const resp = await api("POST", "/api/auth/reenviar-codigo", { usuarioId: pendingUser.usuario.id });
      setReenviadoMsg("Novo código enviado!");
      if (resp.codigo_teste) setPendingUser(u => ({ ...u, codigo_teste: resp.codigo_teste }));
    } catch (e) { setReenviadoMsg("Erro ao reenviar."); }
    finally { setReenviando(false); }
  };

  if (step === 99 && pendingUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>📧</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Verifique seu email</div>
          <p style={{ color: "#666", fontSize: 14, margin: 0 }}>
            Enviamos um código de 6 dígitos para<br />
            <strong style={{ color: "var(--orange)" }}>{pendingUser.usuario.email}</strong>
          </p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {reenviadoMsg && <div className="alert alert-success">✅ {reenviadoMsg}</div>}
        {pendingUser.codigo_teste && (
          <div style={{ background: "rgba(201,168,76,0.1)", border: "1px dashed var(--gold)", borderRadius: 10, padding: "14px 12px", marginBottom: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🧪 Modo teste — email indisponível</div>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 14, color: "var(--text)", fontFamily: "monospace" }}>{pendingUser.codigo_teste}</div>
          </div>
        )}
        <div className="field">
          <label>Código de verificação</label>
          <input
            type="text" inputMode="numeric" maxLength={6}
            value={codigoVerif} onChange={e => setCodigoVerif(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            style={{ fontSize: 28, letterSpacing: 12, textAlign: "center", fontFamily: "monospace" }}
          />
        </div>
        <button className="btn btn-primary" onClick={verificarEmail} disabled={loading} style={{ marginBottom: 12 }}>
          {loading ? "Verificando..." : "✅ Verificar Email"}
        </button>
        <button className="btn btn-secondary" onClick={reenviarCodigo} disabled={reenviando}>
          {reenviando ? "Enviando..." : "🔄 Reenviar código"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, color: "#555", fontSize: 12 }}>O código expira em 15 minutos</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "24px" }}>
      <button className="back-btn" style={{ marginBottom: 16 }} onClick={() => step > 1 ? setStep(s => s - 1) : onNavigate("login")}>←</button>
      <div style={{ marginBottom: 24 }}>
        <TrukerLogo size="sm" />
        <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 8, textAlign: "center" }}>Criar conta · Passo {step} de {tipo === "motorista" ? 3 : 2}</p>
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
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "var(--surface2)", borderRadius: 10, border: `1px solid ${aceitouTermos ? "var(--gold)" : "var(--border)"}`, cursor: "pointer", marginBottom: 14, marginTop: 4 }}>
            <input
              type="checkbox"
              checked={aceitouTermos}
              onChange={e => setAceitouTermos(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--gold)", flexShrink: 0, marginTop: 1 }}
            />
            <span style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>
              Li e aceito os{" "}
              <span style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }} onClick={e => { e.preventDefault(); onNavigate("termos"); }}>
                Termos de Uso e Política de Privacidade
              </span>{" "}
              da TRUKER
            </span>
          </label>
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
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "var(--surface2)", borderRadius: 10, border: `1px solid ${aceitouTermos ? "var(--gold)" : "var(--border)"}`, cursor: "pointer", marginBottom: 4, marginTop: 16 }}>
            <input
              type="checkbox"
              checked={aceitouTermos}
              onChange={e => setAceitouTermos(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--gold)", flexShrink: 0, marginTop: 1 }}
            />
            <span style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>
              Li e aceito os{" "}
              <span style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }} onClick={e => { e.preventDefault(); onNavigate("termos"); }}>
                Termos de Uso e Política de Privacidade
              </span>{" "}
              da TRUKER
            </span>
          </label>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={finalizar} disabled={loading}>{loading ? "Criando conta..." : "✅ Finalizar Cadastro"}</button>
        </>
      )}

      <p style={{ textAlign: "center", marginTop: 16, color: "var(--text3)", fontSize: 13 }}>
        Já tem conta? <span style={{ color: "var(--gold)", cursor: "pointer", fontWeight: 600 }} onClick={() => onNavigate("login")}>Entrar</span>
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
  const { token, logout } = useAuth();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [motoristas, setMotoristas] = useState([]);
  const [fretes, setFretes] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    setLoadingStats(true);
    Promise.all([
      api("GET", "/api/admin/stats", null, token),
      api("GET", "/api/admin/motoristas", null, token),
      api("GET", "/api/admin/fretes", null, token),
    ]).then(([s, m, f]) => { setStats(s); setMotoristas(m); setFretes(f); })
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, []);

  const totalKmCarregado = motoristas.reduce((a, m) => a + Number(m.km_carregado || 0), 0);
  const eficiencia = stats ? Math.round((stats.fretes_entregues / Math.max(stats.total_fretes, 1)) * 100) : 0;

  const StatusFreteTag = ({ status }) => {
    const map = { aguardando: ["badge-pending","Aguardando"], aceito: ["badge-active","Aceito"], em_rota: ["badge-active","Em Rota"], entregue: ["badge-done","Entregue"], cancelado: ["badge-cancel","Cancelado"] };
    const [cls, label] = map[status] || ["badge-pending", status];
    return <span className={`badge ${cls}`}>{label}</span>;
  };

  return (
    <div className="screen">
      <div className="header">
        <h1>Dashboard Master</h1>
        <div className="badge badge-admin" style={{ marginLeft: "auto" }}>ADMIN</div>
      </div>
      <div className="content">
        <div className="tab-bar">
          {[["overview","Visão Geral"],["motoristas","Motoristas"],["fretes","Fretes"],["relatorios","Relatórios"]].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {loadingStats && <Loading />}

        {!loadingStats && tab === "overview" && stats && (
          <>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div className="stat-card"><div className="stat-value">{stats.total_motoristas}</div><div className="stat-label">Motoristas</div></div>
              <div className="stat-card"><div className="stat-value">{stats.total_fretes}</div><div className="stat-label">Fretes Totais</div></div>
              <div className="stat-card"><div className="stat-value">{stats.fretes_entregues}</div><div className="stat-label">Entregues</div></div>
              <div className="stat-card"><div className="stat-value">{stats.motoristas_online}</div><div className="stat-label">Online Agora</div></div>
            </div>
            <div className="card">
              <div className="card-title">Receita da Plataforma</div>
              <div className="info-row"><span className="info-label">Volume total movimentado</span><span className="info-value" style={{ color: "var(--orange)" }}>{formatMoney(stats.valor_total_movimentado)}</span></div>
              <div className="info-row"><span className="info-label">Pago aos motoristas</span><span className="info-value" style={{ color: "var(--green)" }}>{formatMoney(stats.valor_pago_motoristas)}</span></div>
              <div className="info-row"><span className="info-label">Receita TRUKER</span><span className="info-value" style={{ color: "var(--orange)" }}>{formatMoney(stats.receita_truker)}</span></div>
            </div>
            <div className="card">
              <div className="card-title">Status dos Fretes</div>
              {[["Aguardando", stats.fretes_aguardando, "var(--orange)"], ["Aceitos / Em Rota", stats.fretes_aceito + stats.fretes_em_rota, "var(--blue)"], ["Entregues", stats.fretes_entregues, "var(--green)"], ["Cancelados", stats.fretes_cancelados, "var(--red)"]].map(([label, val, cor]) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span>{label}</span><span style={{ color: cor, fontWeight: 700 }}>{val}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.round((val / Math.max(stats.total_fretes, 1)) * 100)}%`, background: cor }} /></div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Motoristas Online</div>
              {motoristas.filter(m => m.online).length === 0 && <p style={{ fontSize: 13, color: "#555" }}>Nenhum motorista online agora</p>}
              {motoristas.filter(m => m.online).map(m => (
                <div key={m.id} className="admin-row">
                  <div><span className="online-dot" /><strong>{m.nome}</strong><div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{m.tipo_veiculo} · {m.total_fretes} fretes · ⭐ {Number(m.avaliacao_media).toFixed(1)}</div></div>
                  <div style={{ textAlign: "right", fontSize: 12 }}>
                    <div style={{ color: "var(--green)" }}>{formatKm(m.km_carregado)}</div>
                    <div style={{ color: "var(--orange)", fontSize: 11 }}>{formatMoney(m.ganhos_total)} ganhos</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loadingStats && tab === "overview" && !stats && (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "#555" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
            <p style={{ fontWeight: 600 }}>Erro ao carregar dados</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Verifique a conexão com o banco de dados</p>
          </div>
        )}

        {!loadingStats && tab === "motoristas" && (
          <>
            {motoristas.length === 0 && <div className="card" style={{ textAlign: "center", padding: 32, color: "#555" }}>Nenhum motorista cadastrado</div>}
            {motoristas.map(m => (
              <div key={m.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.online ? <span className="online-dot" /> : <span className="offline-dot" />}{m.nome}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{m.tipo_veiculo || "—"} · {m.total_fretes} fretes · ⭐ {Number(m.avaliacao_media).toFixed(1)}</div>
                  </div>
                  <span className={`badge ${m.online ? "badge-active" : ""}`} style={!m.online ? { background: "#222", color: "#555", border: "1px solid #333" } : {}}>{m.online ? "Online" : "Offline"}</span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                  <span style={{ color: "var(--green)" }}>✅ {formatKm(m.km_carregado)} carregado</span>
                  <span style={{ color: "var(--orange)" }}>💰 {formatMoney(m.ganhos_total)}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {!loadingStats && tab === "fretes" && (
          <>
            {fretes.length === 0 && <div className="card" style={{ textAlign: "center", padding: 32, color: "#555" }}>Nenhum frete na plataforma</div>}
            {fretes.map(f => (
              <div key={f.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <StatusFreteTag status={f.status} />
                  <span className="price" style={{ fontSize: 16 }}>{formatMoney(f.valor_antt)}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{f.origem_cidade} → {f.dest_cidade}</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  📦 {f.tipo_carga} · 📏 {f.distancia_km} km · ⚖️ {f.peso_tons}t
                </div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>
                  Contratante: {f.contratante_nome} {f.motorista_nome ? `· Motorista: ${f.motorista_nome}` : ""}
                </div>
              </div>
            ))}
          </>
        )}

        {!loadingStats && tab === "relatorios" && (
          <>
            <div className="card">
              <div className="card-title">Eficiência por Motorista</div>
              {motoristas.length === 0 && <p style={{ fontSize: 13, color: "#555" }}>Sem dados ainda</p>}
              {motoristas.map(m => (
                <div key={m.id} className="admin-row">
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{m.nome}</span>
                    <div style={{ fontSize: 11, color: "#666" }}>{m.total_fretes} fretes · {formatKm(m.km_carregado)}</div>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 700 }}>{formatMoney(m.ganhos_total)}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Resumo Financeiro</div>
              {stats && (
                <>
                  <div className="info-row"><span className="info-label">Contratantes</span><span className="info-value">{stats.total_contratantes}</span></div>
                  <div className="info-row"><span className="info-label">Fretes aguardando</span><span className="info-value" style={{ color: "var(--orange)" }}>{stats.fretes_aguardando}</span></div>
                  <div className="info-row"><span className="info-label">Taxa de entrega</span><span className="info-value" style={{ color: "var(--green)" }}>{eficiencia}%</span></div>
                  <div className="info-row"><span className="info-label">Volume total</span><span className="info-value">{formatMoney(stats.valor_total_movimentado)}</span></div>
                </>
              )}
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
              <div className="price">{formatMoney(f.valor_antt || f.valor_final || f.valor_motorista || 0)}</div>
            </div>
            <div className="route">{f.origem_cidade || f.origem_endereco || "—"} → {f.dest_cidade || f.dest_endereco || "—"}</div>
            <div className="meta"><span>📦 {f.tipo_carga}</span><span>📏 {f.distancia_km} km</span><span>⚖️ {f.peso_tons}t</span></div>
          </div>
        ))}
      </div>
      <BottomNavContratante active="inicio" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// SOLICITAR FRETE
// ─────────────────────────────────────────────
const maskCep = v => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

function SolicitarFreteScreen({ onNavigate }) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    tipoFrete: "interestadual", tipoCarga: "carga_seca", tipoVeiculo: "truck",
    pesoKg: "", comprimentoM: "", larguraM: "", alturaM: "",
    descricao: "", precisaMunck: false, precisaEmpilhadeira: false,
    dataColeta: "", horario: "",
  });
  const [addr, setAddr] = useState({
    origemCep:"", origemLogradouro:"", origemNumero:"", origemComplemento:"",
    origemBairro:"", origemCidade:"", origemUF:"",
    destCep:"", destLogradouro:"", destNumero:"", destComplemento:"",
    destBairro:"", destCidade:"", destUF:"",
  });
  const [calc, setCalc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const FR = useRef(null);
  if (!FR.current) FR.current = {
    origemCep:{current:null}, origemLogradouro:{current:null}, origemNumero:{current:null},
    origemComplemento:{current:null}, origemBairro:{current:null}, origemCidade:{current:null}, origemUF:{current:null},
    destCep:{current:null}, destLogradouro:{current:null}, destNumero:{current:null},
    destComplemento:{current:null}, destBairro:{current:null}, destCidade:{current:null}, destUF:{current:null},
  };
  const rv = k => FR.current[k]?.current?.value?.trim() || "";

  const set = (k, val) => setForm(f => ({ ...f, [k]: val }));
  const tipoCargaObj = TIPOS_CARGA.find(c => c.id === form.tipoCarga);
  const tipoVeiculoObj = TIPOS_VEICULO.find(v => v.id === form.tipoVeiculo);

  const fillCep = async (cep, tipo) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const d = await res.json();
      if (!d.erro) {
        [["Logradouro", d.logradouro], ["Bairro", d.bairro], ["Cidade", d.localidade], ["UF", d.uf]].forEach(([f, val]) => {
          if (FR.current[`${tipo}${f}`]?.current) FR.current[`${tipo}${f}`].current.value = val || "";
        });
      }
    } catch {}
  };

  const composeAddr = (tipo, a) => [a[`${tipo}Logradouro`], a[`${tipo}Numero`], a[`${tipo}Complemento`], a[`${tipo}Bairro`], a[`${tipo}Cidade`], a[`${tipo}UF`]].filter(Boolean).join(", ");

  const handleContinuar = () => {
    const snap = {
      origemCep: rv("origemCep"), origemLogradouro: rv("origemLogradouro"), origemNumero: rv("origemNumero"),
      origemComplemento: rv("origemComplemento"), origemBairro: rv("origemBairro"), origemCidade: rv("origemCidade"), origemUF: rv("origemUF"),
      destCep: rv("destCep"), destLogradouro: rv("destLogradouro"), destNumero: rv("destNumero"),
      destComplemento: rv("destComplemento"), destBairro: rv("destBairro"), destCidade: rv("destCidade"), destUF: rv("destUF"),
    };
    if (!snap.origemLogradouro || !snap.origemNumero || !snap.origemCidade) return setError("Preencha logradouro, número e cidade da coleta");
    if (!snap.destLogradouro || !snap.destNumero || !snap.destCidade) return setError("Preencha logradouro, número e cidade da entrega");
    setError(""); setAddr(snap); setStep(2);
  };

  const calcular = async () => {
    const origem = composeAddr("origem", addr);
    const dest = composeAddr("dest", addr);
    if (!origem || !dest) return setError("Endereço incompleto — volte ao passo 1");
    setError(""); setCalcLoading(true);
    const cargaBackend = CARGA_BACKEND_MAP[form.tipoCarga] || "geral";
    try {
      const data = await api("GET", `/api/fretes/calcular?origem=${encodeURIComponent(origem)}&destino=${encodeURIComponent(dest)}&peso=${(Number(form.pesoKg)||1000)/1000}&veiculo=${form.tipoVeiculo}&carga=${cargaBackend}`, null, token);
      setCalc({ distancia_km: data.rota?.distanciaKm, duracao: data.rota?.duracao, valor: data.frete?.valorAntt || data.frete?.valorFinal });
      setStep(3);
    } catch (e) { setError(e.message); }
    finally { setCalcLoading(false); }
  };

  const solicitar = async () => {
    if (!calc) return;
    setLoading(true); setError("");
    const cargaBackend = CARGA_BACKEND_MAP[form.tipoCarga] || "geral";
    try {
      await api("POST", "/api/fretes", {
        tipoCarga: cargaBackend, tipoVeiculo: form.tipoVeiculo,
        pesoTons: (Number(form.pesoKg)||1000)/1000,
        origemEndereco: composeAddr("origem", addr), origemCidade: addr.origemCidade, origemEstado: addr.origemUF,
        destEndereco: composeAddr("dest", addr), destCidade: addr.destCidade, destEstado: addr.destUF,
        distanciaKm: calc?.distancia_km, valorAntt: calc?.valor,
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
                    <div className="ci-icon">{t.icon}</div><div className="ci-label">{t.label}</div><div className="ci-desc">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-title">📍 Endereço de Coleta</div>
              <div className="field"><label>CEP</label>
                <input ref={FR.current.origemCep} defaultValue={addr.origemCep} placeholder="00000-000"
                  onChange={e => { e.target.value = maskCep(e.target.value); if (e.target.value.replace(/\D/g,"").length===8) fillCep(e.target.value,"origem"); }} /></div>
              <div className="field"><label>Logradouro</label>
                <input ref={FR.current.origemLogradouro} defaultValue={addr.origemLogradouro} placeholder="Rua, Avenida, Rodovia..." /></div>
              <div className="grid-2">
                <div className="field"><label>Número</label><input ref={FR.current.origemNumero} defaultValue={addr.origemNumero} placeholder="123" /></div>
                <div className="field"><label>Complemento</label><input ref={FR.current.origemComplemento} defaultValue={addr.origemComplemento} placeholder="Galpão, Sala..." /></div>
              </div>
              <div className="field"><label>Bairro / Distrito</label>
                <input ref={FR.current.origemBairro} defaultValue={addr.origemBairro} placeholder="Bairro" /></div>
              <div className="grid-2">
                <div className="field"><label>Cidade</label><input ref={FR.current.origemCidade} defaultValue={addr.origemCidade} placeholder="Curitiba" /></div>
                <div className="field"><label>UF</label><input ref={FR.current.origemUF} defaultValue={addr.origemUF} placeholder="PR" maxLength={2} onChange={e => { e.target.value = e.target.value.toUpperCase(); }} /></div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">🏁 Endereço de Entrega</div>
              <div className="field"><label>CEP</label>
                <input ref={FR.current.destCep} defaultValue={addr.destCep} placeholder="00000-000"
                  onChange={e => { e.target.value = maskCep(e.target.value); if (e.target.value.replace(/\D/g,"").length===8) fillCep(e.target.value,"dest"); }} /></div>
              <div className="field"><label>Logradouro</label>
                <input ref={FR.current.destLogradouro} defaultValue={addr.destLogradouro} placeholder="Rua, Avenida, Rodovia..." /></div>
              <div className="grid-2">
                <div className="field"><label>Número</label><input ref={FR.current.destNumero} defaultValue={addr.destNumero} placeholder="123" /></div>
                <div className="field"><label>Complemento</label><input ref={FR.current.destComplemento} defaultValue={addr.destComplemento} placeholder="Galpão, Sala..." /></div>
              </div>
              <div className="field"><label>Bairro / Distrito</label>
                <input ref={FR.current.destBairro} defaultValue={addr.destBairro} placeholder="Bairro" /></div>
              <div className="grid-2">
                <div className="field"><label>Cidade</label><input ref={FR.current.destCidade} defaultValue={addr.destCidade} placeholder="São Paulo" /></div>
                <div className="field"><label>UF</label><input ref={FR.current.destUF} defaultValue={addr.destUF} placeholder="SP" maxLength={2} onChange={e => { e.target.value = e.target.value.toUpperCase(); }} /></div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Agendamento</div>
              <div className="field"><label>Data de coleta</label><input type="date" value={form.dataColeta} onChange={e => set("dataColeta", e.target.value)} /></div>
              <div className="field"><label>Horário preferido</label><input type="time" value={form.horario} onChange={e => set("horario", e.target.value)} /></div>
            </div>
            <button className="btn btn-primary" onClick={handleContinuar}>Continuar →</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="card">
              <div className="card-title">Tipo de Carga</div>
              <div className="carga-grid">
                {TIPOS_CARGA.map(c => (
                  <div key={c.id} className={`carga-item ${form.tipoCarga === c.id ? "selected" : ""}`} onClick={() => set("tipoCarga", c.id)}>
                    <div className="ci-icon">{c.icon}</div><div className="ci-label">{c.label}</div>
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
              <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <span className="tag-chip">{tipoCargaObj?.icon} {tipoCargaObj?.label}</span>
                <span className="tag-chip">🚛 {tipoVeiculoObj?.label}</span>
              </div>
              {form.precisaMunck && <span className="tag-chip">🏗️ Munck</span>}
              {form.precisaEmpilhadeira && <span className="tag-chip">🏭 Empilhadeira</span>}
              <div className="divider" />
              <div className="info-row"><span className="info-label">Coleta</span><span className="info-value" style={{ fontSize: 12 }}>{composeAddr("origem", addr)}</span></div>
              <div className="info-row"><span className="info-label">Entrega</span><span className="info-value" style={{ fontSize: 12 }}>{composeAddr("dest", addr)}</span></div>
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

  const filtrados = filtro === "todos" ? fretes : fretes.filter(f => {
    if (filtro === "andamento") return ["aceito", "em_rota", "coletando"].includes(f.status);
    if (filtro === "aguardando") return f.status === "aguardando";
    if (filtro === "concluido") return f.status === "entregue";
    if (filtro === "cancelado") return f.status === "cancelado";
    return true;
  });

  const totalGasto = fretes.filter(f => f.status === "entregue").reduce((a, f) => a + Number(f.valor_antt || 0), 0);

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("home-contratante")}>←</button>
        <h1>Meus Fretes</h1>
      </div>
      <div className="content">
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div className="stat-card">
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total fretes</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{fretes.length}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total gasto</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--gold)" }}>{formatMoney(totalGasto)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
          {[["todos","Todos"],["andamento","Em andamento"],["aguardando","Aguardando"],["concluido","Concluídos"],["cancelado","Cancelados"]].map(([s, l]) => (
            <button key={s} onClick={() => setFiltro(s)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: filtro === s ? "var(--gold)" : "var(--border)", background: filtro === s ? "var(--gold)" : "var(--surface)", color: filtro === s ? "#fff" : "var(--text3)", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "Inter, sans-serif" }}>{l}</button>
          ))}
        </div>
        {loading ? <Loading /> : filtrados.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}><div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>Nenhum frete nessa categoria</div>
        ) : filtrados.map(f => {
          const data = f.criado_em ? new Date(f.criado_em).toLocaleDateString("pt-BR") : "—";
          return (
            <div key={f.id} className="frete-card" onClick={() => onNavigate("detalhe-frete", f)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <StatusBadge status={f.status} />
                <div style={{ textAlign: "right" }}>
                  <div className="price" style={{ fontSize: 18 }}>{formatMoney(f.valor_antt || f.valor_final || 0)}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>ANTT</div>
                </div>
              </div>
              <div className="route" style={{ fontSize: 14 }}>{f.origem_cidade || f.origem_endereco || "—"} → {f.dest_cidade || f.dest_endereco || "—"}</div>
              <div className="meta" style={{ marginTop: 6 }}><span>📦 {f.tipo_carga}</span><span>📏 {f.distancia_km} km</span><span>⚖️ {f.peso_tons}t</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text3)" }}>
                <span>📅 {data}</span>
                <span>🚛 {f.motorista_nome || "Aguardando"}</span>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 12, color: "var(--text3)" }}>
                <span>💰 Motorista: {formatMoney(f.valor_motorista || 0)}</span>
                <span>📊 Taxa: {formatMoney(f.comissao_truker || 0)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <BottomNavContratante active="atividade" onNavigate={onNavigate} />
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
          <div className="price">{formatMoney(frete.valor_antt || frete.valor_final || 0)}</div>
        </div>
        <div className="card">
          <div className="card-title">Rota</div>
          {frete.origem_lat && frete.dest_lat ? (
            <MapaLeaflet
              height={200}
              origem={{ lat: parseFloat(frete.origem_lat), lng: parseFloat(frete.origem_lng), label: frete.origem_cidade }}
              destino={{ lat: parseFloat(frete.dest_lat), lng: parseFloat(frete.dest_lng), label: frete.dest_cidade }}
            />
          ) : (
            <div className="map-placeholder"><div style={{ fontSize: 28 }}>🗺️</div><span>{frete.origem_cidade || "—"} → {frete.dest_cidade || "—"}</span></div>
          )}
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
        {(frete.status === "aguardando" || (frete.status === "aceito" && frete.status_pagamento !== "approved")) && (
          <button className="btn btn-primary" style={{ marginBottom: 10, background: "linear-gradient(135deg, #00b37e, #00a572)" }} onClick={() => onNavigate("pagamento", { freteId: frete.id, valor: frete.valor_antt || frete.valor_final || 0 })}>
            📱 Pagar via Pix — {formatMoney(frete.valor_antt || 0)}
          </button>
        )}
        {frete.status === "aceito" && frete.status_pagamento === "approved" && (
          <div className="alert alert-success" style={{ marginBottom: 10 }}>✅ Pagamento confirmado — aguardando início da coleta</div>
        )}
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
  const settingsLinks = [
    { icon: "👤", label: "Dados Pessoais", sub: "Nome, foto, CPF/CNPJ, empresa", screen: "dados-pessoais-contratante" },
    { icon: "🔔", label: "Notificações", sub: "Push, sons e alertas", screen: null },
    { icon: "🔒", label: "Privacidade e segurança", sub: "Senha, dados pessoais", screen: null },
    { icon: "📄", label: "Termos de uso", sub: "Política de privacidade", screen: "termos" },
  ];
  const accessLinks = [
    { icon: "📦", label: "Meus Fretes", sub: "Histórico e em andamento", screen: "meus-fretes" },
    { icon: "💳", label: "Pagamentos", sub: "Formas de pagamento cadastradas", screen: "pagamentos" },
    { icon: "⭐", label: "Avaliações", sub: "Motoristas avaliados", screen: "avaliacoes" },
  ];
  return (
    <div className="screen">
      <div className="header"><h1>Conta</h1></div>
      <div className="content">
        <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #C9A84C, #A8873A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, border: "3px solid var(--gold)", boxShadow: "0 4px 12px rgba(201,168,76,0.3)" }}>🏢</div>
            <div onClick={() => onNavigate("dados-pessoais-contratante")} style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11, border: "2px solid var(--surface)" }}>✏️</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{user?.nome}</div>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>{user?.email}</div>
          <div style={{ marginTop: 8 }}><span className="badge badge-active">Contratante</span></div>
        </div>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">Informações de Contato</div>
          <div className="info-row"><span className="info-label">Email</span><span className="info-value">{user?.email}</span></div>
          <div className="info-row"><span className="info-label">Telefone</span><span className="info-value">{user?.telefone || "—"}</span></div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: "auto" }} onClick={() => onNavigate("dados-pessoais-contratante")}>✏️ Editar perfil</button>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Configurações</div>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          {settingsLinks.map((item, i) => (
            <div key={i} onClick={() => item.screen && onNavigate(item.screen)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < settingsLinks.length - 1 ? "1px solid var(--border)" : "none", cursor: item.screen ? "pointer" : "default" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Minha Atividade</div>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          {accessLinks.map((item, i) => (
            <div key={i} onClick={() => onNavigate(item.screen)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < accessLinks.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--gold-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
        <button className="btn btn-danger" onClick={logout}>Sair da Conta</button>
      </div>
      <BottomNavContratante active="conta" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// MOTORISTA HOME — ✅ toggle online chama API
// ─────────────────────────────────────────────
function MotoristaHome({ onNavigate }) {
  const { user, token } = useAuth();
  const [disponiveis, setDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(() => { try { return localStorage.getItem("truker_online") === "true"; } catch { return false; } });
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroPeso, setFiltroPeso] = useState("todos");
  const [kmVazio, setKmVazio] = useState(0);
  const [metaKmVazio, setMetaKmVazio] = useState(800);
  const [ganhosDia, setGanhosDia] = useState(null);

  // Busca km vazio real do dia
  useEffect(() => {
    api("GET", "/api/motoristas/ganhos", null, token)
      .then(d => {
        setGanhosDia(d);
        setKmVazio(parseFloat(d.km_vazio_hoje || 0));
      })
      .catch(() => {});
  }, [token]);
  const [posicaoAtual, setPosicaoAtual] = useState(null);
  const [fretesAtivos, setFretesAtivos] = useState([]);
  const posicaoRef = useRef(null);

  // GPS para mostrar no mapa
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosicaoAtual(coords);
        posicaoRef.current = coords;
      },
      err => console.error("GPS home:", err),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Envia posição para o backend a cada 30s para todos os fretes ativos
  useEffect(() => {
    if (fretesAtivos.length === 0 || !token) return;
    const interval = setInterval(async () => {
      if (!posicaoRef.current) return;
      try {
        for (const f of fretesAtivos) {
          await api("PATCH", "/api/motoristas/localizacao", {
            lat: posicaoRef.current.lat,
            lng: posicaoRef.current.lng,
            freteId: f.id,
          }, token);
        }
      } catch (e) { console.error("GPS send home:", e.message); }
    }, 30000);
    return () => clearInterval(interval);
  }, [fretesAtivos.length, token]);

  // Carrega fretes disponíveis quando fica online
  useEffect(() => {
    if (!online) { setDisponiveis([]); setLoading(false); return; }
    setLoading(true);
    api("GET", "/api/fretes/disponiveis", null, token)
      .then(setDisponiveis).catch(() => setDisponiveis([])).finally(() => setLoading(false));
  }, [online]);

  // Carrega fretes ativos do motorista (aceito/coletando/em_rota)
  useEffect(() => {
    api("GET", "/api/fretes", null, token)
      .then(todos => setFretesAtivos(todos.filter(f => ["aceito", "coletando", "em_rota"].includes(f.status))))
      .catch(() => setFretesAtivos([]));
  }, [token]);

  // ✅ Toggle online/offline — atualiza no banco
  const toggleOnline = async (val) => {
    setOnline(val);
    localStorage.setItem("truker_online", val ? "true" : "false");
    try {
      await api("PATCH", "/api/motoristas/online", { online: val }, token);
    } catch (e) {
      console.error("Erro ao atualizar status online:", e.message);
    }
  };

  const pctMeta = Math.min(100, Math.round((kmVazio / metaKmVazio) * 100));

  const filtrados = disponiveis.filter(f => {
    if (filtroTipo !== "todos" && f.tipo_frete !== filtroTipo) return false;
    const peso = f.peso_tons || 0;
    if (filtroPeso === "leve" && peso > 3) return false;
    if (filtroPeso === "medio" && (peso < 3 || peso > 14)) return false;
    if (filtroPeso === "pesado" && peso < 14) return false;
    return true;
  });

  const marcadoresFretes = disponiveis
    .filter(f => f.origem_lat && f.origem_lng)
    .map(f => ({ lat: parseFloat(f.origem_lat), lng: parseFloat(f.origem_lng), label: f.origem_cidade || "Frete" }));

  // Rotas otimizadas: ordenar por proximidade do motorista (greedy)
  const rotasAtivas = [...fretesAtivos]
    .filter(f => f.origem_lat && (f.dest_lat || f.destino_lat))
    .sort((a, b) => {
      if (!posicaoAtual) return 0;
      const dA = Math.pow(parseFloat(a.origem_lat) - posicaoAtual.lat, 2) + Math.pow(parseFloat(a.origem_lng) - posicaoAtual.lng, 2);
      const dB = Math.pow(parseFloat(b.origem_lat) - posicaoAtual.lat, 2) + Math.pow(parseFloat(b.origem_lng) - posicaoAtual.lng, 2);
      return dA - dB;
    })
    .map(f => ({
      origem: { lat: parseFloat(f.origem_lat), lng: parseFloat(f.origem_lng), label: f.origem_cidade || "Coleta" },
      destino: { lat: parseFloat(f.dest_lat || f.destino_lat), lng: parseFloat(f.dest_lng || f.destino_lng), label: f.dest_cidade || f.destino_cidade || "Entrega" },
    }));

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
          <label className="toggle">
            <input type="checkbox" checked={online} onChange={e => toggleOnline(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
          <span style={{ fontSize: 22, cursor: "pointer" }} onClick={() => onNavigate("perfil-motorista")}>👤</span>
        </div>
      </div>
      <div className="content">
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

        <MapaLeaflet
          key={`home-map-${rotasAtivas.length}-${posicaoAtual ? 1 : 0}`}
          lat={posicaoAtual?.lat}
          lng={posicaoAtual?.lng}
          height={rotasAtivas.length > 0 ? 220 : 180}
          marcadores={rotasAtivas.length === 0 ? marcadoresFretes : []}
          rotas={rotasAtivas}
        />

        {fretesAtivos.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
              🚛 Fretes em andamento ({fretesAtivos.length})
            </div>
            {fretesAtivos.map((f, idx) => {
              const cores = ["#C9A84C", "#2D7A3A", "#2563EB", "#9333EA", "#EF4444"];
              const cor = cores[idx % cores.length];
              return (
                <div key={f.id} style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `2px solid ${cor}`, cursor: "pointer" }}
                  onClick={() => onNavigate("em-transito", f)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: cor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{idx + 1}</div>
                      <StatusBadge status={f.status} />
                    </div>
                    <span style={{ color: "var(--green)", fontWeight: 800, fontSize: 14 }}>{formatMoney(f.valor_motorista || 0)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>📏 {f.distancia_km} km · 📦 {f.tipo_carga}</div>
                </div>
              );
            })}
          </div>
        )}
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
        ) : (filtrados.length > 0 ? filtrados : disponiveis).map(f => {
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
      <BottomNavMotorista active="inicio" onNavigate={onNavigate} />
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
    try {
      // Captura posição GPS para calcular km vazio
      let lat = null, lng = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {} // GPS indisponível — aceita sem km_vazio
      }
      await api("PATCH", `/api/fretes/${frete.id}/aceitar`, { lat, lng }, token);
      onNavigate("home-motorista");
    } catch (e) { setError(e.message); }
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
          <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>Plataforma: {formatMoney(frete.comissao_truker || 0)} · Total: {formatMoney(frete.valor_antt || frete.valor_final || 0)}</div>
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
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    api("GET", "/api/fretes", null, token).then(setFretes).catch(() => setFretes([])).finally(() => setLoading(false));
  }, []);

  const filtrados = filtro === "todos" ? fretes : fretes.filter(f => {
    if (filtro === "andamento") return ["aceito", "em_rota", "coletando"].includes(f.status);
    if (filtro === "concluido") return f.status === "entregue";
    return true;
  });

  const totalGanho = fretes.filter(f => f.status === "entregue").reduce((a, f) => a + Number(f.valor_motorista || 0), 0);

  return (
    <div className="screen">
      <div className="header"><h1>Meus Fretes</h1></div>
      <div className="content">
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div className="stat-card">
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total fretes</div>
            <div className="stat-value" style={{ fontSize: 24 }}>{fretes.length}</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total ganho</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--green)" }}>{formatMoney(totalGanho)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[["todos","Todos"],["andamento","Em andamento"],["concluido","Concluídos"]].map(([s, l]) => (
            <button key={s} onClick={() => setFiltro(s)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: filtro === s ? "var(--gold)" : "var(--border)", background: filtro === s ? "var(--gold)" : "var(--surface)", color: filtro === s ? "#fff" : "var(--text3)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{l}</button>
          ))}
        </div>
        {loading ? <Loading /> : filtrados.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}><div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>Nenhum frete nessa categoria</div>
        ) : filtrados.map(f => {
          const data = f.criado_em ? new Date(f.criado_em).toLocaleDateString("pt-BR") : "—";
          const emAndamento = ["aceito", "em_rota", "coletando"].includes(f.status);
          return (
            <div key={f.id} className="frete-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <StatusBadge status={f.status} />
                <div style={{ fontWeight: 800, color: "var(--green)", fontSize: 18 }}>{formatMoney(f.valor_motorista || f.valor_antt || 0)}</div>
              </div>
              <div className="route" style={{ fontSize: 14 }}>{f.origem_cidade || f.origem_endereco || "—"} → {f.dest_cidade || f.dest_endereco || "—"}</div>
              <div className="meta" style={{ marginTop: 6 }}><span>📦 {f.tipo_carga}</span><span>📏 {f.distancia_km} km</span><span>📅 {data}</span></div>
              {emAndamento && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => onNavigate("em-transito", f)}>📍 Ver em trânsito</button>
              )}
            </div>
          );
        })}
      </div>
      <BottomNavMotorista active="atividade" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// EM TRÂNSITO — sem mapa próprio (mapa fica na aba Início)
// ─────────────────────────────────────────────
function EmTransitoScreen({ frete, onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [freteStatus, setFreteStatus] = useState(frete?.status);
  const [confirmStep, setConfirmStep] = useState(null);
  const [codigoDigitado, setCodigoDigitado] = useState("");
  const [codigoTeste, setCodigoTeste] = useState(null);
  const [entregueOk, setEntregueOk] = useState(false);

  if (!frete) return <Loading />;

  const atualizarStatus = async (status) => {
    setLoading(true);
    try {
      await api("PATCH", `/api/fretes/${frete.id}/status`, { status }, token);
      setFreteStatus(status);
      if (status !== "entregue") onNavigate("home-motorista");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const solicitarCodigo = async () => {
    setLoading(true); setError("");
    try {
      const resp = await api("POST", `/api/fretes/${frete.id}/solicitar-codigo-entrega`, {}, token);
      setConfirmStep("aguardando");
      if (resp.codigo_teste) setCodigoTeste(resp.codigo_teste);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const confirmarComCodigo = async () => {
    if (codigoDigitado.length !== 6) return setError("Digite o código de 6 dígitos");
    setLoading(true); setError("");
    try {
      await api("POST", `/api/fretes/${frete.id}/confirmar-entrega`, { codigo: codigoDigitado }, token);
      setEntregueOk(true);
      setFreteStatus("entregue");
      setTimeout(() => onNavigate("home-motorista"), 3000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fretesRetorno = [
    { id: "r1", origem: frete.dest_cidade || "SP", destino: frete.origem_cidade || "CWB", distancia: Math.round(frete.distancia_km * 0.95), valor: formatMoney(Math.round((frete.valor_motorista || 0) * 0.85)), tipo: "Carga Seca" },
    { id: "r2", origem: frete.dest_cidade || "SP", destino: "Campinas, SP", distancia: 100, valor: "R$ 980,00", tipo: "Graneleiro" },
  ];

  if (entregueOk) return (
    <div className="screen">
      <div className="header"><h1>Frete Ativo</h1></div>
      <div className="content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--green)", marginBottom: 8 }}>Entrega confirmada!</div>
        <div style={{ color: "var(--text3)", textAlign: "center", marginBottom: 24 }}>Frete concluído com sucesso.<br/>Redirecionando...</div>
        <div style={{ width: "100%" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 8 }}>🎯 Fretes de retorno disponíveis:</div>
          {fretesRetorno.map(fr => (
            <div key={fr.id} className="frete-card" onClick={() => onNavigate("aceitar-frete", fr)}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{fr.origem} → {fr.destino}</span>
                <span style={{ color: "var(--gold)", fontWeight: 800 }}>{fr.valor}</span>
              </div>
              <div className="meta" style={{ marginTop: 4 }}><span>📦 {fr.tipo}</span><span>📏 {fr.distancia} km</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button>
        <h1>Frete Ativo</h1>
      </div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <StatusBadge status={freteStatus} />
          <span style={{ fontWeight: 800, fontSize: 20, color: "var(--green)" }}>{formatMoney(frete.valor_motorista || 0)}</span>
        </div>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Rota</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", border: "2px solid white", boxShadow: "0 0 0 2px var(--green)" }} />
                  <div style={{ width: 2, height: 24, background: "var(--border)" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--red)", border: "2px solid white", boxShadow: "0 0 0 2px var(--red)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{frete.origem_cidade || frete.origem_endereco || "—"}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{frete.dest_cidade || frete.dest_endereco || "—"}</div>
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate("home-motorista")} style={{ flexShrink: 0 }}>🗺️ Ver no Mapa</button>
          </div>
          <div className="info-row"><span className="info-label">Distância</span><span className="info-value">{frete.distancia_km} km</span></div>
          <div className="info-row"><span className="info-label">Tipo de carga</span><span className="info-value">{frete.tipo_carga}</span></div>
          <div className="info-row"><span className="info-label">Peso</span><span className="info-value">{frete.peso_tons}t</span></div>
        </div>
        <button className="btn btn-secondary" style={{ marginBottom: 10 }} onClick={() => onNavigate("chat", { frete })}>💬 Chat com Contratante</button>
        {freteStatus === "aceito" && frete.status_pagamento === "approved" && (
          <button className="btn btn-primary" style={{ marginBottom: 10 }} onClick={() => atualizarStatus("coletando")} disabled={loading}>🚛 Iniciar Coleta</button>
        )}
        {freteStatus === "aceito" && frete.status_pagamento !== "approved" && (
          <div className="alert alert-info" style={{ textAlign: "center", marginBottom: 10 }}>⏳ Aguardando pagamento do contratante para liberar a coleta</div>
        )}
        {freteStatus === "coletando" && (
          <button className="btn btn-primary" style={{ marginBottom: 10 }} onClick={() => atualizarStatus("em_rota")} disabled={loading}>🛣️ Em Rota</button>
        )}
        {freteStatus === "em_rota" && !confirmStep && (
          <button className="btn btn-success" onClick={() => setConfirmStep("solicitando")} disabled={loading}>✅ Confirmar Entrega</button>
        )}
        {freteStatus === "em_rota" && confirmStep === "solicitando" && (
          <div className="card" style={{ borderLeft: "4px solid var(--green)" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Confirmação de entrega</div>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16, lineHeight: 1.6 }}>
              Um código de 6 dígitos será enviado por email ao contratante. Peça o código a ele para confirmar o recebimento da carga.
            </p>
            <button className="btn btn-primary" onClick={solicitarCodigo} disabled={loading} style={{ marginBottom: 8 }}>
              {loading ? "Enviando..." : "📧 Enviar código para o contratante"}
            </button>
            <button className="btn btn-secondary" onClick={() => setConfirmStep(null)}>Cancelar</button>
          </div>
        )}
        {freteStatus === "em_rota" && confirmStep === "aguardando" && (
          <div className="card" style={{ borderLeft: "4px solid var(--green)" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>✉️ Código gerado!</div>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 12 }}>
              {codigoTeste ? "Email indisponível no modo teste. Use o código abaixo:" : "O contratante recebeu o código por email. Digite abaixo:"}
            </p>
            {codigoTeste && (
              <div style={{ background: "rgba(201,168,76,0.1)", border: "1px dashed var(--gold)", borderRadius: 10, padding: "14px 12px", marginBottom: 14, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🧪 Modo teste — mostre ao contratante</div>
                <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 14, color: "var(--text)", fontFamily: "monospace" }}>{codigoTeste}</div>
              </div>
            )}
            <div className="field">
              <label>Código de confirmação</label>
              <input type="text" inputMode="numeric" maxLength={6}
                value={codigoDigitado}
                onChange={e => setCodigoDigitado(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                style={{ fontSize: 32, letterSpacing: 14, textAlign: "center", fontFamily: "monospace" }}
              />
            </div>
            <button className="btn btn-success" onClick={confirmarComCodigo} disabled={loading || codigoDigitado.length !== 6} style={{ marginBottom: 8 }}>
              {loading ? "Confirmando..." : "✅ Confirmar Entrega"}
            </button>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 4 }} onClick={solicitarCodigo} disabled={loading}>🔄 Reenviar código</button>
          </div>
        )}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────
// PERFIL MOTORISTA — ✅ ganhos reais da API
// ─────────────────────────────────────────────
function PerfilMotorista({ onNavigate }) {
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState("resumo");
  const [kmVazio] = useState(0);
  const [metaKmVazio, setMetaKmVazio] = useState(800);
  const [editMeta, setEditMeta] = useState(false);
  const [novaMeta, setNovaMeta] = useState("800");
  const [ganhos, setGanhos] = useState(null);
  const [loadingGanhos, setLoadingGanhos] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [testePushMsg, setTestePushMsg] = useState(null);

  const testarPush = async () => {
    setTestePushMsg("Enviando...");
    try {
      const res = await api("POST", "/api/push/testar", {}, token);
      const ok = res.resultados?.some(r => r.ok);
      if (ok) {
        setTestePushMsg("✅ Push enviado! Verifique a notificação.");
      } else {
        const erros = res.resultados?.map(r => `${r.status}: ${r.erro}`).join(", ");
        setTestePushMsg("❌ Falhou: " + (erros || "sem subscription"));
      }
    } catch (e) {
      setTestePushMsg("❌ Erro: " + e.message);
    }
    setTimeout(() => setTestePushMsg(null), 8000);
  };
  const pctMeta = Math.min(100, Math.round((kmVazio / metaKmVazio) * 100));

  // Carrega perfil completo ao montar
  useEffect(() => {
    api("GET", "/api/motoristas/perfil", null, token)
      .then(setPerfil)
      .catch(() => {});
  }, []);

  // Busca ganhos reais ao entrar na aba
  useEffect(() => {
    if ((tab === "ganhos" || tab === "resumo") && !ganhos && !loadingGanhos) {
      setLoadingGanhos(true);
      api("GET", "/api/motoristas/ganhos", null, token)
        .then(setGanhos)
        .catch(() => setGanhos(null))
        .finally(() => setLoadingGanhos(false));
    }
  }, [tab]);

  const kmVazioPorCarga = [
    { tipo: "Carga Seca", icon: "📦", km: 180, fretes: 12 },
    { tipo: "Graneleiro", icon: "🌾", km: 95, fretes: 8 },
    { tipo: "Refrigerada", icon: "❄️", km: 42, fretes: 5 },
    { tipo: "Líquidos", icon: "💧", km: 25, fretes: 3 },
  ];

  return (
    <div className="screen">
      <div className="header"><h1>Perfil</h1></div>
      <div className="content">
        <div style={{ textAlign: "center", padding: "14px 0 20px" }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 28 }}>🚛</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.nome}</div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 3 }}>{user?.email}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
            <span className="badge badge-active">Motorista</span>
            <span className="badge" style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.4)" }}>⭐ {ganhos ? Number(ganhos.avaliacao_media).toFixed(1) : "—"}</span>
          </div>
        </div>

        <div className="tab-bar" style={{ marginBottom: 14 }}>
          {[["resumo", "Resumo"], ["ganhos", "Ganhos"], ["km-vazio", "KM Vazio"], ["despesas", "Despesas"]].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {tab === "resumo" && (
          <>
            {loadingGanhos ? <Loading /> : (
              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div className="stat-card"><div className="stat-value">{ganhos?.total_fretes ?? "—"}</div><div className="stat-label">Fretes feitos</div></div>
                <div className="stat-card"><div className="stat-value">{ganhos ? Number(ganhos.avaliacao_media).toFixed(1) : "—"}</div><div className="stat-label">Avaliação</div></div>
                <div className="stat-card"><div className="stat-value">{ganhos ? formatKm(ganhos.km_carregado) : "—"}</div><div className="stat-label">Km carregado</div></div>
                <div className="stat-card"><div className="stat-value">{ganhos ? formatKm(ganhos.km_vazio_total || 0) : "—"}</div><div className="stat-label">Km vazio total</div></div>
              </div>
            )}
            <div className="card">
              <div className="card-title">Dados do veículo</div>
              <div className="info-row"><span className="info-label">Tipo</span><span className="info-value">{(() => { const t = TIPOS_VEICULO.find(v => v.id === (perfil?.tipo_veiculo || user?.tipo_veiculo)); return t ? `${t.icon} ${t.label}` : (perfil?.tipo_veiculo || "—"); })()}</span></div>
              <div className="info-row"><span className="info-label">Marca/Modelo</span><span className="info-value">{[perfil?.marca_veiculo, perfil?.modelo_veiculo].filter(Boolean).join(" ") || "—"}</span></div>
              <div className="info-row"><span className="info-label">Placa</span><span className="info-value">{perfil?.placa_veiculo || "—"}</span></div>
              <div className="info-row"><span className="info-label">Ano</span><span className="info-value">{perfil?.ano_veiculo || "—"}</span></div>
              <div className="info-row"><span className="info-label">RNTRC</span><span className="info-value">{perfil?.rntrc || "—"}</span></div>
              <div className="info-row"><span className="info-label">CNH</span><span className="info-value">{perfil?.cnh_numero || "—"}</span></div>
            </div>
            {[["📦", "Meus Fretes", "meus-fretes-motorista"], ["💬", "Chat", "chat"], ["⭐", "Avaliações", "avaliacoes"]].map(([icon, label, screen]) => (
              <div key={label} className="card" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => onNavigate(screen)}>
                <span style={{ fontSize: 20 }}>{icon}</span><span style={{ fontWeight: 600 }}>{label}</span><span style={{ marginLeft: "auto", color: "#555" }}>›</span>
              </div>
            ))}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 4 }}>Minha Conta</div>
            <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
              {[
                { icon: "👤", label: "Dados Pessoais", sub: "Nome, foto, CPF, CNH, endereço", screen: "dados-pessoais-motorista" },
                { icon: "🚛", label: "Meu Caminhão", sub: "Tipo, carreta, placa, documentos", screen: "dados-caminhao" },
                { icon: "💰", label: "Minhas Finanças", sub: "Despesas, receitas e controle", screen: "financas-motorista" },
                { icon: "🔔", label: "Notificações", sub: "Push, sons e alertas", screen: null },
                { icon: "🔒", label: "Privacidade", sub: "Senha, dados pessoais", screen: null },
                { icon: "📄", label: "Termos de uso", sub: "Política de privacidade", screen: "termos" },
              ].map((item, i) => (
                <div key={i} onClick={() => item.screen && onNavigate(item.screen)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderBottom: i < 5 ? "1px solid var(--border)" : "none", cursor: item.screen ? "pointer" : "default" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: i < 3 ? "var(--gold-light)" : "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
                  </div>
                  <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
                </div>
              ))}
            </div>
            <button className="btn btn-danger" style={{ marginTop: 4 }} onClick={logout}>Sair da Conta</button>
            <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={testarPush}>🔔 Testar Push Notification</button>
            {testePushMsg && <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 8, fontSize: 13, color: "#f97316", textAlign: "center" }}>{testePushMsg}</div>}
          </>
        )}

        {tab === "ganhos" && (
          <>
            {loadingGanhos ? <Loading /> : ganhos ? (
              <>
                <div className="card" style={{ textAlign: "center", borderColor: "rgba(201,168,76,0.3)" }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Ganhos este mês</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "var(--gold)" }}>{formatMoney(ganhos.ganhos_mes_atual)}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                    {ganhos.fretes_mes_atual} fretes · média {formatMoney(ganhos.media_por_frete)}/frete
                  </div>
                </div>
                {ganhos.historico_mensal?.length > 0 && (
                  <div className="card">
                    <div className="card-title">Histórico mensal</div>
                    {ganhos.historico_mensal.map(m => (
                      <div key={m.mes} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                          <span style={{ fontWeight: 700 }}>{m.mes}/{m.ano}</span>
                          <span style={{ color: "var(--green)", fontWeight: 700 }}>{formatMoney(m.valor)}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill green" style={{ width: `${Math.round((Number(m.valor) / Math.max(...ganhos.historico_mensal.map(x => Number(x.valor)), 1)) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="card">
                  <div className="card-title">Resumo total</div>
                  <div className="info-row"><span className="info-label">Total de fretes</span><span className="info-value">{ganhos.total_fretes}</span></div>
                  <div className="info-row"><span className="info-label">Km carregado total</span><span className="info-value">{formatKm(ganhos.km_carregado)}</span></div>
                  <div className="info-row"><span className="info-label">Ganhos totais</span><span className="info-value" style={{ color: "var(--green)", fontWeight: 800 }}>{formatMoney(ganhos.ganhos_total)}</span></div>
                </div>
              </>
            ) : (
              <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
                <p style={{ fontWeight: 600 }}>Nenhum dado disponível</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Complete seu primeiro frete para ver os ganhos</p>
              </div>
            )}
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
                    <div className="progress-fill" style={{ width: `${Math.round((c.km / Math.max(kmVazio, 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Eficiência geral</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--green)" }}>✅ Carregado: {ganhos ? formatKm(ganhos.km_carregado) : "—"}</span>
                <span style={{ fontSize: 13, color: "var(--red)" }}>⬜ Vazio: {formatKm(kmVazio)}</span>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill green" style={{ width: `${ganhos ? Math.round((Number(ganhos.km_carregado) / Math.max(Number(ganhos.km_carregado) + kmVazio, 1)) * 100) : 0}%` }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: "var(--green)" }}>
                {ganhos ? `${Math.round((Number(ganhos.km_carregado) / Math.max(Number(ganhos.km_carregado) + kmVazio, 1)) * 100)}% de eficiência` : "—"}
              </div>
            </div>
          </>
        )}

        {tab === "despesas" && <DespesasTab />}
      </div>
      <BottomNavMotorista active="conta" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────
function ChatScreen({ data, onNavigate }) {
  const { user, token } = useAuth();
  const frete = data?.frete;
  const freteId = frete?.id;
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [erroLoad, setErroLoad] = useState("");
  const bottomRef = useRef(null);
  const intervalRef = useRef(null);

  const carregarMsgs = async () => {
    if (!freteId) { setLoading(false); return; }
    try {
      const res = await api("GET", `/api/chat/${freteId}`, null, token);
      if (Array.isArray(res)) { setMsgs(res); setErroLoad(""); }
    } catch(e) { setErroLoad(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    carregarMsgs();
    intervalRef.current = setInterval(carregarMsgs, 5000);
    return () => clearInterval(intervalRef.current);
  }, [freteId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || enviando) return;
    if (!freteId) { setErroEnvio("Abra o chat a partir de um frete ativo"); return; }
    const texto = text.trim();
    setText(""); setErroEnvio(""); setEnviando(true);
    try {
      await api("POST", `/api/chat/${freteId}`, { mensagem: texto }, token);
      await carregarMsgs();
    } catch(e) {
      setErroEnvio("Erro ao enviar: " + e.message);
      setText(texto);
    }
    finally { setEnviando(false); }
  };

  const formatHora = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate(-1)}>←</button>
        <h1>Chat{frete ? ` — ${frete.origem_cidade || "Frete"}` : ""}</h1>
      </div>
      <div className="chat-area">
        <div style={{ flex: 1, minHeight: 8 }} />
        {loading && <div style={{ textAlign: "center", padding: 20, color: "var(--text3)" }}>Carregando...</div>}
        {!loading && msgs.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
            <p>Nenhuma mensagem ainda. Inicie a conversa!</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={m.id || i} style={{ alignSelf: m.e_meu ? "flex-end" : "flex-start", maxWidth: "80%" }}>
            {!m.e_meu && <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2, paddingLeft: 4 }}>{m.nome}</div>}
            <div className={`msg ${m.e_meu ? "msg-me" : "msg-other"}`}>{m.mensagem}</div>
            <div className="msg-time" style={{ textAlign: m.e_meu ? "right" : "left" }}>{formatHora(m.criado_em)}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {erroLoad && <div style={{ background: "rgba(192,57,43,0.08)", color: "var(--red)", padding: "8px 14px", fontSize: 12, borderTop: "1px solid rgba(192,57,43,0.2)" }}>&#9888; {erroLoad}</div>}
      {erroEnvio && <div style={{ background: "rgba(192,57,43,0.08)", color: "var(--red)", padding: "6px 14px", fontSize: 12 }}>{erroEnvio}</div>}
      <div className="chat-input">
        <input
          placeholder={freteId ? "Digite uma mensagem..." : "Abra por um frete ativo"}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          disabled={!freteId}
        />
        <button className="chat-send" onClick={send} disabled={enviando || !freteId}>
          {enviando ? "•••" : "➤"}
        </button>
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
// SVG ICONS para Bottom Nav
// ─────────────────────────────────────────────
function IconHome({ active }) {
  const c = active ? "#C9A84C" : "#A09282";
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z" fill={c}/></svg>;
}
function IconActivity({ active }) {
  const c = active ? "#C9A84C" : "#A09282";
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="2" rx="1" fill={c}/><rect x="3" y="9" width="14" height="2" rx="1" fill={c}/><rect x="3" y="14" width="18" height="2" rx="1" fill={c}/><rect x="3" y="19" width="10" height="2" rx="1" fill={c}/></svg>;
}
function IconAccount({ active }) {
  const c = active ? "#C9A84C" : "#A09282";
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill={c}/><path d="M4 20C4 16.69 7.58 14 12 14C16.42 14 20 16.69 20 20" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>;
}
function IconOptions({ active }) {
  const c = active ? "#C9A84C" : "#A09282";
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="2" fill={c}/><circle cx="12" cy="12" r="2" fill={c}/><circle cx="12" cy="19" r="2" fill={c}/></svg>;
}

// ─────────────────────────────────────────────
// BOTTOM NAVS — estilo Uber 4 abas
// ─────────────────────────────────────────────
function BottomNavContratante({ active, onNavigate }) {
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

function BottomNavMotorista({ active, onNavigate }) {
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

// ─────────────────────────────────────────────
// PLACEHOLDER
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// TELA OPÇÕES — Motorista
// ─────────────────────────────────────────────
function OpcoesMotorista({ onNavigate }) {
  const { user } = useAuth();
  const items = [
    { icon: "💬", label: "Suporte", sub: "Fale com a gente", screen: null },
    { icon: "⭐", label: "Avalie o TRUKER", sub: "Nos dê sua opinião", screen: null },
    { icon: "ℹ️", label: "Sobre o app", sub: "Versão 1.0.0", screen: null },
  ];
  return (
    <div className="screen">
      <div className="header"><h1>Opções</h1></div>
      <div className="content">
        <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #C9A84C, #A8873A)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#1A1209" }}>T</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{user?.nome}</div>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{user?.email}</div>
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {items.map((item, i) => (
            <div key={i} onClick={() => item.screen && onNavigate(item.screen)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none", cursor: item.screen ? "pointer" : "default" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
              </div>
              {item.screen && <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>}
            </div>
          ))}
        </div>
      </div>
      <BottomNavMotorista active="opcoes" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// TELA OPÇÕES — Contratante
// ─────────────────────────────────────────────
function OpcoesContratante({ onNavigate }) {
  const { user } = useAuth();
  const items = [
    { icon: "💬", label: "Suporte", sub: "Fale com a gente", screen: null },
    { icon: "⭐", label: "Avalie o TRUKER", sub: "Nos dê sua opinião", screen: null },
    { icon: "ℹ️", label: "Sobre o app", sub: "Versão 1.0.0", screen: null },
  ];
  return (
    <div className="screen">
      <div className="header"><h1>Opções</h1></div>
      <div className="content">
        <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #C9A84C, #A8873A)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#1A1209" }}>T</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{user?.nome}</div>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{user?.email}</div>
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {items.map((item, i) => (
            <div key={i} onClick={() => item.screen && onNavigate(item.screen)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none", cursor: item.screen ? "pointer" : "default" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
              </div>
              {item.screen && <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>}
            </div>
          ))}
        </div>
      </div>
      <BottomNavContratante active="opcoes" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────
// TERMOS DE USO
// ─────────────────────────────────────────────
function TermosScreen({ onNavigate }) {
  const { user } = useAuth();
  const isMotorista = user?.tipo === "motorista";
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Termos de Uso</h1></div>
      <div className="content">
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "var(--text)" }}>Política de Privacidade e Termos de Uso — TRUKER</p>
            <p style={{ marginBottom: 10 }}><strong>Última atualização:</strong> {new Date().toLocaleDateString("pt-BR")}</p>
            <p style={{ marginBottom: 14 }}>A TRUKER Plataforma de Fretes Pesados ("TRUKER", "nós") valoriza sua privacidade. Este documento descreve como coletamos, usamos e protegemos suas informações ao usar nosso aplicativo.</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>1. Informações que coletamos</p>
            <p style={{ marginBottom: 14 }}>Coletamos informações que você fornece diretamente (nome, e-mail, CPF/CNPJ, telefone), dados de localização GPS quando o app está em uso, informações do veículo e documentos enviados pelos motoristas, e dados de uso da plataforma.</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>2. Como usamos suas informações</p>
            <p style={{ marginBottom: 14 }}>Utilizamos seus dados para conectar contratantes e motoristas, processar pagamentos, enviar notificações sobre fretes disponíveis, melhorar nossos serviços e cumprir obrigações legais.</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>3. Compartilhamento de dados</p>
            <p style={{ marginBottom: 14 }}>Seus dados são compartilhados apenas entre as partes envolvidas em um frete (contratante e motorista). Não vendemos seus dados a terceiros. Podemos compartilhar dados com autoridades quando exigido por lei.</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>4. Localização GPS</p>
            <p style={{ marginBottom: 14 }}>A localização do motorista é coletada em tempo real durante fretes ativos. O contratante pode visualizar a posição do motorista durante a entrega. Você pode desativar o GPS a qualquer momento nas configurações do dispositivo.</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>5. Segurança</p>
            <p style={{ marginBottom: 14 }}>Utilizamos criptografia e boas práticas de segurança para proteger seus dados. Senhas são armazenadas com hash seguro e tokens JWT com expiração.</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>6. Seus direitos</p>
            <p style={{ marginBottom: 14 }}>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo suporte. Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>7. Contato</p>
            <p>Para dúvidas sobre privacidade: <strong>privacidade@truker.app</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE DE DESPESAS (usado na aba Despesas do PerfilMotorista)
// ─────────────────────────────────────────────
function DespesasTab() {
  const { token } = useAuth();
  const [despesas, setDespesas] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nova, setNova] = useState({ tipo: "combustivel", descricao: "", valor: "", data: new Date().toISOString().slice(0,10) });
  const setN = (k, v) => setNova(f => ({ ...f, [k]: v }));
  const tiposDespesa = [
    { id: "combustivel", icon: "⛽", label: "Combustível" }, { id: "manutencao", icon: "🔧", label: "Manutenção" },
    { id: "pedagio", icon: "🛣️", label: "Pedágio" }, { id: "pneu", icon: "🔄", label: "Pneus" },
    { id: "seguro", icon: "🛡️", label: "Seguro" }, { id: "multa", icon: "🚨", label: "Multa" },
    { id: "alimentacao", icon: "🍽️", label: "Alimentação" }, { id: "hospedagem", icon: "🏨", label: "Hospedagem" },
    { id: "outro", icon: "📦", label: "Outro" },
  ];

  useEffect(() => {
    api("GET", "/api/motoristas/despesas", null, token)
      .then(setDespesas).catch(() => {});
  }, [token]);

  const total = despesas.reduce((a, d) => a + Number(d.valor || 0), 0);

  const add = async () => {
    if (!nova.valor) return;
    setLoading(true);
    try {
      const salva = await api("POST", "/api/motoristas/despesas", nova, token);
      setDespesas(d => [salva, ...d]);
      setNova({ tipo: "combustivel", descricao: "", valor: "", data: new Date().toISOString().slice(0,10) });
      setShowAdd(false);
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    finally { setLoading(false); }
  };

  const remover = async (id) => {
    try {
      await api("DELETE", `/api/motoristas/despesas/${id}`, null, token);
      setDespesas(d => d.filter(x => x.id !== id));
    } catch (e) { alert("Erro ao remover: " + e.message); }
  };

  const handleNF = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const nome = file.name.toLowerCase();
    let tipo = "outro";
    if (/ipiranga|petrobras|shell|posto|diesel|gasolina|combustivel/.test(nome)) tipo = "combustivel";
    else if (/manutencao|oficina|mecanica|reparo/.test(nome)) tipo = "manutencao";
    else if (/pedagio|concession|autopista|ecopistas/.test(nome)) tipo = "pedagio";
    else if (/pneu|borracharia/.test(nome)) tipo = "pneu";
    setNova(f => ({ ...f, tipo, descricao: file.name.replace(/\.[^.]+$/, "") }));
  };

  return (
    <>
      <div className="stat-card" style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total de despesas</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "var(--red)" }}>{formatMoney(total)}</div>
      </div>
      <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={() => setShowAdd(true)}>+ Registrar Despesa</button>
      {showAdd && (
        <div className="card" style={{ borderColor: "var(--gold)", marginBottom: 14 }}>
          <div className="card-title">Nova Despesa</div>
          <div className="field">
            <label>Tipo</label>
            <select value={nova.tipo} onChange={e => setN("tipo", e.target.value)}>
              {tiposDespesa.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div className="field"><label>Descrição</label><input value={nova.descricao} onChange={e => setN("descricao", e.target.value)} placeholder="Ex: Abastecimento posto BR" /></div>
          <div className="field"><label>Valor (R$)</label><input type="number" step="0.01" value={nova.valor} onChange={e => setN("valor", e.target.value)} placeholder="0,00" /></div>
          <div className="field"><label>Data</label><input type="date" value={nova.data} onChange={e => setN("data", e.target.value)} /></div>
          <label className="upload-area" style={{ display: "block", marginBottom: 12, cursor: "pointer" }}>
            📄 Anexar NF — tipo detectado automaticamente
            <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleNF} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={add} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
          </div>
        </div>
      )}
      {despesas.length === 0 && !showAdd && (
        <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
          <p style={{ fontWeight: 600 }}>Nenhuma despesa registrada</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Registre combustível, manutenção e pedágios.</p>
        </div>
      )}
      {despesas.map(d => {
        const t = tiposDespesa.find(x => x.id === d.tipo) || { icon: "📦", label: d.tipo };
        return (
          <div key={d.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(192,57,43,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{t.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>{d.descricao || "—"} · {d.data?.slice(0,10)}</div>
            </div>
            <div style={{ fontWeight: 700, color: "var(--red)", fontSize: 15 }}>-{formatMoney(d.valor)}</div>
            <button onClick={() => remover(d.id)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16, padding: 4 }}>🗑️</button>
          </div>
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────
// DADOS PESSOAIS — CONTRATANTE
// ─────────────────────────────────────────────
function DadosPessoaisContratante({ onNavigate }) {
  const { user, token, updateUserData } = useAuth();
  const [form, setForm] = useState({ nome: user?.nome || "", email: user?.email || "", telefone: user?.telefone || "", documento: "", nomeEmpresa: "", inscricaoEstadual: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const carregarPerfil = async () => {
    try {
      const d = await api("GET", "/api/contratantes/perfil", null, token);
      setForm({ nome: d.nome || "", email: d.email || "", telefone: d.telefone || "", documento: d.cpf_cnpj || "", nomeEmpresa: d.nome_empresa || "", inscricaoEstadual: d.inscricao_estadual || "", cep: d.cep || "", logradouro: d.logradouro || "", numero: d.numero || "", complemento: d.complemento || "", bairro: d.bairro || "", cidade: d.cidade || "", uf: d.uf || "" });
    } catch (e) { setError("Erro ao carregar perfil: " + e.message); }
    finally { setLoadingData(false); }
  };

  useEffect(() => { carregarPerfil(); }, []);

  const fillCep = async (cep) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try { const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`); const d = await r.json(); if (!d.erro) setForm(f => ({ ...f, logradouro: d.logradouro || "", bairro: d.bairro || "", cidade: d.localidade || "", uf: d.uf || "" })); } catch {}
  };
  const salvar = async () => {
    setError(""); setLoading(true);
    try {
      await api("PATCH", "/api/contratantes/perfil", {
        nome: form.nome, telefone: form.telefone,
        nomeEmpresa: form.nomeEmpresa, inscricaoEstadual: form.inscricaoEstadual,
        cep: form.cep, logradouro: form.logradouro, numero: form.numero,
        complemento: form.complemento, bairro: form.bairro, cidade: form.cidade, uf: form.uf,
      }, token);
      updateUserData({ nome: form.nome, email: form.email, telefone: form.telefone });
      await carregarPerfil();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Dados Pessoais</h1></div>
      <div className="content">
        {loadingData && <Loading />}
        {!loadingData && <>
        {success && <div className="alert alert-success">✅ Dados salvos com sucesso!</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #C9A84C, #A8873A)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 34, border: "3px solid var(--gold)" }}>🏢</div>
          <button className="btn btn-secondary btn-sm" style={{ width: "auto" }}>📷 Trocar foto / logomarca</button>
        </div>
        <div className="card">
          <div className="card-title">Identificação</div>
          <div className="field"><label>Nome completo</label><input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Seu nome" /></div>
          <div className="field"><label>CPF ou CNPJ</label><input value={form.documento} onChange={e => set("documento", e.target.value)} placeholder="000.000.000-00 ou 00.000.000/0001-00" /></div>
          <div className="field"><label>Nome da empresa (opcional)</label><input value={form.nomeEmpresa} onChange={e => set("nomeEmpresa", e.target.value)} placeholder="Empresa LTDA" /></div>
          <div className="field"><label>Inscrição Estadual (opcional)</label><input value={form.inscricaoEstadual} onChange={e => set("inscricaoEstadual", e.target.value)} placeholder="000.000.000.000" /></div>
        </div>
        <div className="card">
          <div className="card-title">Contato</div>
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="seu@email.com" /></div>
          <div className="field"><label>Telefone / WhatsApp</label><input value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(41) 99999-9999" /></div>
        </div>
        <div className="card">
          <div className="card-title">Endereço</div>
          <div className="field"><label>CEP</label><input value={form.cep} onChange={e => { const v = maskCep(e.target.value); set("cep", v); if (v.replace(/\D/g,"").length===8) fillCep(v); }} placeholder="00000-000" /></div>
          <div className="field"><label>Logradouro</label><input value={form.logradouro} onChange={e => set("logradouro", e.target.value)} placeholder="Rua, Avenida..." /></div>
          <div className="grid-2">
            <div className="field"><label>Número</label><input value={form.numero} onChange={e => set("numero", e.target.value)} placeholder="123" /></div>
            <div className="field"><label>Complemento</label><input value={form.complemento} onChange={e => set("complemento", e.target.value)} placeholder="Sala..." /></div>
          </div>
          <div className="field"><label>Bairro</label><input value={form.bairro} onChange={e => set("bairro", e.target.value)} placeholder="Centro" /></div>
          <div className="grid-2">
            <div className="field"><label>Cidade</label><input value={form.cidade} onChange={e => set("cidade", e.target.value)} placeholder="Curitiba" /></div>
            <div className="field"><label>UF</label><input value={form.uf} onChange={e => set("uf", e.target.value.toUpperCase())} placeholder="PR" maxLength={2} /></div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Documentação fiscal e jurídica</div>
          <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 14 }}>Envie documentos para habilitar contratações de maior valor.</p>
          {[["📋 Contrato Social / Estatuto", false], ["🏦 Comprovante bancário", false], ["🪪 Doc. do responsável (RG/CNH)", false], ["📄 Procuração (se aplicável)", false]].map(([doc, ok], i) => (
            <div key={i} className="info-row">
              <span className="info-label" style={{ fontSize: 13 }}>{doc}</span>
              <span className={`badge ${ok ? "badge-active" : "badge-pending"}`}>{ok ? "Aprovado" : "Pendente"}</span>
            </div>
          ))}
          <div className="upload-area" style={{ marginTop: 14 }}>📤 Enviar documento</div>
        </div>
        <button className="btn btn-primary" onClick={salvar} disabled={loading}>{loading ? "Salvando..." : "Salvar alterações"}</button>
        </>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DADOS PESSOAIS — MOTORISTA
// ─────────────────────────────────────────────
function DadosPessoaisMotorista({ onNavigate }) {
  const { user, token, updateUserData } = useAuth();
  const [form, setForm] = useState({ nome: user?.nome || "", email: user?.email || "", telefone: user?.telefone || "", cpf: "", cnh: "", rntrc: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const carregarPerfil = async () => {
    try {
      const d = await api("GET", "/api/motoristas/perfil", null, token);
      setForm({
        nome: d.nome || "", email: d.email || "", telefone: d.telefone || "",
        cpf: d.cpf || "", cnh: d.cnh_numero || "", rntrc: d.rntrc || "",
        cep: d.cep || "", logradouro: d.logradouro || "", numero: d.numero || "",
        complemento: d.complemento || "", bairro: d.bairro || "",
        cidade: d.cidade || "", uf: d.uf || "",
      });
    } catch (e) { setError("Erro ao carregar perfil: " + e.message); }
    finally { setLoadingData(false); }
  };

  useEffect(() => { carregarPerfil(); }, []);

  const fillCep = async (cep) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try { const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`); const d = await r.json(); if (!d.erro) setForm(f => ({ ...f, logradouro: d.logradouro || "", bairro: d.bairro || "", cidade: d.localidade || "", uf: d.uf || "" })); } catch {}
  };

  const salvar = async () => {
    setError(""); setLoading(true);
    try {
      await api("PATCH", "/api/motoristas/perfil", {
        nome: form.nome, telefone: form.telefone,
        cnh: form.cnh, rntrc: form.rntrc,
        cep: form.cep, logradouro: form.logradouro, numero: form.numero,
        complemento: form.complemento, bairro: form.bairro, cidade: form.cidade, uf: form.uf,
      }, token);
      updateUserData({ nome: form.nome, email: form.email, telefone: form.telefone });
      // Re-carrega para confirmar os dados salvos
      await carregarPerfil();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Dados Pessoais</h1></div>
      <div className="content">
        {loadingData && <Loading />}
        {!loadingData && <>
        {success && <div className="alert alert-success">✅ Dados salvos com sucesso!</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #C9A84C, #A8873A)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 34, border: "3px solid var(--gold)" }}>🚛</div>
          <button className="btn btn-secondary btn-sm" style={{ width: "auto" }}>📷 Trocar foto de perfil</button>
        </div>
        <div className="card">
          <div className="card-title">Identificação</div>
          <div className="field"><label>CPF</label><input value={form.cpf} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
          <div className="field"><label>Número CNH</label><input value={form.cnh} onChange={e => set("cnh", e.target.value)} placeholder="00000000000" /></div>
          <div className="field"><label>RNTRC (ANTT)</label><input value={form.rntrc} onChange={e => set("rntrc", e.target.value)} placeholder="00000000" /></div>
        </div>
        <div className="card">
          <div className="card-title">Contato</div>
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="seu@email.com" /></div>
          <div className="field"><label>Telefone / WhatsApp</label><input value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(41) 99999-9999" /></div>
        </div>
        <div className="card">
          <div className="card-title">Endereço</div>
          <div className="field"><label>CEP</label><input value={form.cep} onChange={e => { const v = maskCep(e.target.value); set("cep", v); if (v.replace(/\D/g,"").length===8) fillCep(v); }} placeholder="00000-000" /></div>
          <div className="field"><label>Logradouro</label><input value={form.logradouro} onChange={e => set("logradouro", e.target.value)} placeholder="Rua, Avenida..." /></div>
          <div className="grid-2">
            <div className="field"><label>Número</label><input value={form.numero} onChange={e => set("numero", e.target.value)} placeholder="123" /></div>
            <div className="field"><label>Complemento</label><input value={form.complemento} onChange={e => set("complemento", e.target.value)} placeholder="Apto..." /></div>
          </div>
          <div className="field"><label>Bairro</label><input value={form.bairro} onChange={e => set("bairro", e.target.value)} placeholder="Centro" /></div>
          <div className="grid-2">
            <div className="field"><label>Cidade</label><input value={form.cidade} onChange={e => set("cidade", e.target.value)} placeholder="Curitiba" /></div>
            <div className="field"><label>UF</label><input value={form.uf} onChange={e => set("uf", e.target.value.toUpperCase())} placeholder="PR" maxLength={2} /></div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Documentação</div>
          {[["📄 CNH (frente e verso)", false], ["🪪 CPF", false], ["📋 Comprovante de endereço", false], ["📝 RNTRC / ANTT", false]].map(([doc, ok], i) => (
            <div key={i} className="info-row">
              <span className="info-label" style={{ fontSize: 13 }}>{doc}</span>
              <span className={`badge ${ok ? "badge-active" : "badge-pending"}`}>{ok ? "Aprovado" : "Pendente"}</span>
            </div>
          ))}
          <div className="upload-area" style={{ marginTop: 14 }}>📤 Enviar documento</div>
        </div>
        <button className="btn btn-primary" onClick={salvar} disabled={loading}>{loading ? "Salvando..." : "Salvar alterações"}</button>
        </>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DADOS DO CAMINHÃO — MOTORISTA
// ─────────────────────────────────────────────
function DadosCaminhaoMotorista({ onNavigate }) {
  const { user, token, updateUserData } = useAuth();
  const [form, setForm] = useState({ tipoVeiculo: "", tipoCarreta: "", marca: "", modelo: "", placa: "", anoFab: "", renavam: "", tara: "", capacidade: "" });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const tiposCarreta = ["Baú","Grade Baixa","Sider","Tanque","Frigorífico","Graneleiro","Porta Container","Prancha","Munck","Sem carreta"];

  const carregarPerfil = async () => {
    try {
      const d = await api("GET", "/api/motoristas/perfil", null, token);
      setForm({
        tipoVeiculo: d.tipo_veiculo || "", tipoCarreta: d.tipo_carreta || "",
        marca: d.marca_veiculo || "", modelo: d.modelo_veiculo || "",
        placa: d.placa_veiculo || "", anoFab: d.ano_veiculo || "",
        renavam: d.renavam || "", tara: d.tara_kg || "", capacidade: d.capacidade_tons || "",
      });
    } catch (e) { setError("Erro ao carregar dados: " + e.message); }
    finally { setLoadingData(false); }
  };

  useEffect(() => { carregarPerfil(); }, []);

  const salvar = async () => {
    setError(""); setLoading(true);
    try {
      await api("PATCH", "/api/motoristas/veiculo", {
        tipoVeiculo: form.tipoVeiculo, tipoCarreta: form.tipoCarreta,
        marca: form.marca, modelo: form.modelo, placa: form.placa,
        anoFab: form.anoFab, renavam: form.renavam, tara: form.tara, capacidade: form.capacidade,
      }, token);
      updateUserData({ tipo_veiculo: form.tipoVeiculo, placa_veiculo: form.placa });
      await carregarPerfil();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Meu Caminhão</h1></div>
      <div className="content">
        {loadingData && <Loading />}
        {!loadingData && <>
        {success && <div className="alert alert-success">✅ Dados salvos!</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <div className="card">
          <div className="card-title">Tipo do Veículo</div>
          <div className="field"><label>Tipo de veículo (troca de caminhão)</label>
            <select value={form.tipoVeiculo} onChange={e => set("tipoVeiculo", e.target.value)}>
              <option value="">Selecione...</option>
              {TIPOS_VEICULO.map(v => <option key={v.id} value={v.id}>{v.icon} {v.label} — até {v.cap}</option>)}
            </select>
          </div>
          <div className="field"><label>Tipo de carreta / implemento (troca de carreta)</label>
            <select value={form.tipoCarreta} onChange={e => set("tipoCarreta", e.target.value)}>
              <option value="">Selecione...</option>
              {tiposCarreta.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Dados do Veículo</div>
          <div className="field"><label>Marca</label><input value={form.marca} onChange={e => set("marca", e.target.value)} placeholder="Scania, Volvo, Mercedes..." /></div>
          <div className="field"><label>Modelo</label><input value={form.modelo} onChange={e => set("modelo", e.target.value)} placeholder="R450, FH540, Actros..." /></div>
          <div className="grid-2">
            <div className="field"><label>Placa</label><input value={form.placa} onChange={e => set("placa", e.target.value.toUpperCase())} placeholder="ABC-1234" /></div>
            <div className="field"><label>Ano</label><input type="number" value={form.anoFab} onChange={e => set("anoFab", e.target.value)} placeholder="2018" /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Tara (kg)</label><input type="number" value={form.tara} onChange={e => set("tara", e.target.value)} placeholder="7500" /></div>
            <div className="field"><label>Capacidade (t)</label><input type="number" value={form.capacidade} onChange={e => set("capacidade", e.target.value)} placeholder="25" /></div>
          </div>
          <div className="field"><label>RENAVAM</label><input value={form.renavam} onChange={e => set("renavam", e.target.value)} placeholder="00000000000" /></div>
        </div>
        <div className="card">
          <div className="card-title">Documentos do Veículo</div>
          {[["🚛 CRLV / Licenciamento", false], ["📋 RNTRC / ANTT", false], ["📸 Fotos do caminhão (frente/lateral/traseira)", false], ["🔍 Laudo de vistoria", false]].map(([doc, ok], i) => (
            <div key={i} className="info-row">
              <span className="info-label" style={{ fontSize: 13 }}>{doc}</span>
              <span className={`badge ${ok ? "badge-active" : "badge-pending"}`}>{ok ? "Aprovado" : "Pendente"}</span>
            </div>
          ))}
          <div className="upload-area" style={{ marginTop: 14 }}>📤 Enviar documento</div>
        </div>
        <button className="btn btn-primary" onClick={salvar} disabled={loading}>{loading ? "Salvando..." : "Salvar alterações"}</button>
        </>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MINHAS FINANÇAS — MOTORISTA
// ─────────────────────────────────────────────
function FinancasMotorista({ onNavigate }) {
  const { token } = useAuth();
  const [tab, setTab] = useState("despesas");
  const [despesas, setDespesas] = useState([]);
  const [receitas, setReceitas] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [nova, setNova] = useState({ tipo: "combustivel", descricao: "", valor: "", data: new Date().toISOString().slice(0,10) });
  const [loadingReceitas, setLoadingReceitas] = useState(false);
  const setN = (k, v) => setNova(f => ({ ...f, [k]: v }));
  const tiposDespesa = [
    { id: "combustivel", icon: "⛽", label: "Combustível" }, { id: "manutencao", icon: "🔧", label: "Manutenção" },
    { id: "pedagio", icon: "🛣️", label: "Pedágio" }, { id: "pneu", icon: "🔄", label: "Pneus" },
    { id: "seguro", icon: "🛡️", label: "Seguro" }, { id: "multa", icon: "🚨", label: "Multa" },
    { id: "alimentacao", icon: "🍽️", label: "Alimentação" }, { id: "hospedagem", icon: "🏨", label: "Hospedagem" },
    { id: "outro", icon: "📦", label: "Outro" },
  ];

  // Carrega despesas do banco ao montar
  useEffect(() => {
    api("GET", "/api/motoristas/despesas", null, token)
      .then(setDespesas).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (tab === "receitas" && receitas.length === 0) {
      setLoadingReceitas(true);
      api("GET", "/api/motoristas/extrato", null, token).then(d => setReceitas(Array.isArray(d) ? d : [])).catch(() => setReceitas([])).finally(() => setLoadingReceitas(false));
    }
  }, [tab]);

  const totalDespesas = despesas.reduce((a, d) => a + Number(d.valor || 0), 0);
  const totalReceitas = receitas.reduce((a, r) => a + Number(r.valor_motorista || 0), 0);
  const saldo = totalReceitas - totalDespesas;

  const add = async () => {
    if (!nova.valor) return;
    setLoadingAdd(true);
    try {
      const salva = await api("POST", "/api/motoristas/despesas", nova, token);
      setDespesas(d => [salva, ...d]);
      setNova({ tipo: "combustivel", descricao: "", valor: "", data: new Date().toISOString().slice(0,10) });
      setShowAdd(false);
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    finally { setLoadingAdd(false); }
  };

  const remover = async (id) => {
    try {
      await api("DELETE", `/api/motoristas/despesas/${id}`, null, token);
      setDespesas(d => d.filter(x => x.id !== id));
    } catch (e) { alert("Erro ao remover: " + e.message); }
  };
  const handleNF = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const nome = file.name.toLowerCase();
    let tipo = "outro";
    if (/ipiranga|petrobras|shell|posto|diesel|gasolina/.test(nome)) tipo = "combustivel";
    else if (/manutencao|oficina|mecanica/.test(nome)) tipo = "manutencao";
    else if (/pedagio|autopista|ecopistas/.test(nome)) tipo = "pedagio";
    else if (/pneu|borracharia/.test(nome)) tipo = "pneu";
    setNova(f => ({ ...f, tipo, descricao: file.name.replace(/\.[^.]+$/, "") }));
  };
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Minhas Finanças</h1></div>
      <div className="content">
        <div className="grid-2" style={{ marginBottom: 10 }}>
          <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Receitas</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--green)" }}>{formatMoney(totalReceitas)}</div></div>
          <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Despesas</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--red)" }}>{formatMoney(totalDespesas)}</div></div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 14, marginBottom: 14, borderColor: saldo >= 0 ? "rgba(45,122,58,0.3)" : "rgba(192,57,43,0.3)" }}>
          <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Saldo</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: saldo >= 0 ? "var(--green)" : "var(--red)" }}>{formatMoney(saldo)}</div>
        </div>
        <div className="tab-bar" style={{ marginBottom: 14 }}>
          {[["despesas","💸 Despesas"],["receitas","💰 Receitas"]].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        {tab === "despesas" && (
          <>
            <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={() => setShowAdd(true)}>+ Adicionar Despesa</button>
            {showAdd && (
              <div className="card" style={{ borderColor: "var(--gold)", marginBottom: 14 }}>
                <div className="card-title">Nova Despesa</div>
                <div className="field"><label>Tipo</label>
                  <select value={nova.tipo} onChange={e => setN("tipo", e.target.value)}>
                    {tiposDespesa.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div className="field"><label>Descrição</label><input value={nova.descricao} onChange={e => setN("descricao", e.target.value)} placeholder="Ex: Abastecimento posto BR" /></div>
                <div className="field"><label>Valor (R$)</label><input type="number" step="0.01" value={nova.valor} onChange={e => setN("valor", e.target.value)} placeholder="0,00" /></div>
                <div className="field"><label>Data</label><input type="date" value={nova.data} onChange={e => setN("data", e.target.value)} /></div>
                <label className="upload-area" style={{ display: "block", marginBottom: 12, cursor: "pointer" }}>
                  📄 Anexar NF — tipo detectado automaticamente
                  <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleNF} />
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancelar</button>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={add} disabled={loadingAdd}>{loadingAdd ? "Salvando..." : "Salvar"}</button>
                </div>
              </div>
            )}
            {despesas.length === 0 && !showAdd && (
              <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                <p style={{ fontWeight: 600 }}>Nenhuma despesa registrada</p>
                <p style={{ fontSize: 13, marginTop: 6 }}>Registre combustível, pedágio, manutenção e mais.</p>
              </div>
            )}
            {despesas.map(d => {
              const t = tiposDespesa.find(x => x.id === d.tipo) || { icon: "📦", label: d.tipo };
              return (
                <div key={d.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(192,57,43,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{t.icon}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{t.label}</div><div style={{ fontSize: 12, color: "var(--text3)" }}>{d.descricao || "—"} · {d.data?.slice(0,10)}</div></div>
                  <div style={{ fontWeight: 700, color: "var(--red)", fontSize: 15 }}>-{formatMoney(d.valor)}</div>
                  <button onClick={() => remover(d.id)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16, padding: 4 }}>🗑️</button>
                </div>
              );
            })}
          </>
        )}
        {tab === "receitas" && (
          <>
            {loadingReceitas ? <Loading /> : receitas.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
                <p style={{ fontWeight: 600 }}>Nenhuma receita ainda</p>
                <p style={{ fontSize: 13, marginTop: 6 }}>Fretes concluídos entram aqui automaticamente.</p>
              </div>
            ) : receitas.map((r, i) => (
              <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(45,122,58,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🚛</div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{r.origem_cidade || "—"} → {r.dest_cidade || "—"}</div><div style={{ fontSize: 12, color: "var(--text3)" }}>{r.tipo_carga || "—"} · {r.distancia_km || "—"} km</div></div>
                <div style={{ fontWeight: 700, color: "var(--green)", fontSize: 15 }}>+{formatMoney(r.valor_motorista || 0)}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGAMENTOS — CONTRATANTE
// ─────────────────────────────────────────────
function PagamentosScreen({ onNavigate }) {
  const [formas, setFormas] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [tipo, setTipo] = useState("pix");
  const [form, setForm] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const BANCOS = ["001 - Banco do Brasil","033 - Santander","041 - Banrisul","077 - Banco Inter","104 - Caixa Econômica","208 - BTG Pactual","212 - Banco Original","237 - Bradesco","260 - Nubank","336 - C6 Bank","341 - Itaú","380 - PicPay","422 - Safra","633 - Rendimento","748 - Sicredi","756 - Sicoob"];
  const tiposForma = [
    { id: "pix", icon: "📱", label: "Pix", desc: "Transferência instantânea" },
    { id: "ted", icon: "🏦", label: "TED/DOC", desc: "Transferência bancária" },
    { id: "cartao_credito", icon: "💳", label: "Cartão Crédito", desc: "Visa, Master, Elo, Amex" },
    { id: "cartao_debito", icon: "💳", label: "Cartão Débito", desc: "Visa Débito, Master Débito" },
    { id: "boleto", icon: "📄", label: "Boleto", desc: "Gerado automaticamente" },
    { id: "carteira", icon: "💰", label: "Carteira Digital", desc: "PicPay, Mercado Pago" },
  ];
  const adicionar = () => { setFormas(f => [...f, { tipo, form: { ...form }, id: Date.now() }]); setForm({}); setShowAdd(false); };
  const remover = (id) => setFormas(f => f.filter(x => x.id !== id));
  const getIcon = t => ({ pix: "📱", ted: "🏦", cartao_credito: "💳", cartao_debito: "💳", boleto: "📄", carteira: "💰" }[t] || "💳");
  const getLabel = t => tiposForma.find(x => x.id === t)?.label || t;
  const getDesc = f => {
    if (f.tipo === "pix") return `Chave: ${f.form.chave || "—"}`;
    if (f.tipo === "ted") return `${(f.form.banco || "").split(" - ")[1] || "—"} · Ag: ${f.form.agencia || "—"} · CC: ${f.form.conta || "—"}`;
    if (f.tipo === "cartao_credito" || f.tipo === "cartao_debito") return `${f.form.bandeira || "—"} ····${(f.form.numero || "").replace(/\s/g,"").slice(-4)}`;
    if (f.tipo === "carteira") return f.form.carteira || "—";
    return "Gerado automaticamente no pagamento";
  };
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Pagamentos</h1></div>
      <div className="content">
        <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowAdd(true)}>+ Adicionar forma de pagamento</button>
        {showAdd && (
          <div className="card" style={{ borderColor: "var(--gold)", marginBottom: 16 }}>
            <div className="card-title">Nova forma de pagamento</div>
            <div className="carga-grid" style={{ marginBottom: 14 }}>
              {tiposForma.map(t => (
                <div key={t.id} className={`carga-item ${tipo === t.id ? "selected" : ""}`} style={{ padding: "10px 8px" }} onClick={() => { setTipo(t.id); setForm({}); }}>
                  <div className="ci-icon">{t.icon}</div>
                  <div className="ci-label" style={{ fontSize: 11 }}>{t.label}</div>
                  <div className="ci-desc">{t.desc}</div>
                </div>
              ))}
            </div>
            {tipo === "pix" && (<>
              <div className="field"><label>Tipo de chave</label><select value={form.tipoChave || ""} onChange={e => set("tipoChave", e.target.value)}><option value="">Selecione...</option><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="telefone">Telefone</option><option value="email">Email</option><option value="aleatoria">Chave aleatória</option></select></div>
              <div className="field"><label>Chave Pix</label><input value={form.chave || ""} onChange={e => set("chave", e.target.value)} placeholder="Digite a chave" /></div>
              <div className="field"><label>Nome do titular</label><input value={form.titular || ""} onChange={e => set("titular", e.target.value)} placeholder="Nome como no banco" /></div>
            </>)}
            {tipo === "ted" && (<>
              <div className="field"><label>Banco</label><select value={form.banco || ""} onChange={e => set("banco", e.target.value)}><option value="">Selecione o banco...</option>{BANCOS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
              <div className="grid-2">
                <div className="field"><label>Agência</label><input value={form.agencia || ""} onChange={e => set("agencia", e.target.value)} placeholder="0000-0" /></div>
                <div className="field"><label>Conta</label><input value={form.conta || ""} onChange={e => set("conta", e.target.value)} placeholder="00000-0" /></div>
              </div>
              <div className="field"><label>Tipo de conta</label><select value={form.tipoConta || ""} onChange={e => set("tipoConta", e.target.value)}><option value="">Selecione...</option><option value="corrente">Corrente</option><option value="poupanca">Poupança</option><option value="pagamento">Conta de Pagamento</option></select></div>
              <div className="field"><label>CPF/CNPJ do titular</label><input value={form.cpf || ""} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" /></div>
              <div className="field"><label>Nome do titular</label><input value={form.titular || ""} onChange={e => set("titular", e.target.value)} placeholder="Nome completo" /></div>
            </>)}
            {(tipo === "cartao_credito" || tipo === "cartao_debito") && (<>
              <div className="field"><label>Número do cartão</label><input value={form.numero || ""} onChange={e => set("numero", e.target.value.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim().slice(0,19))} placeholder="0000 0000 0000 0000" /></div>
              <div className="field"><label>Nome no cartão</label><input value={form.titular || ""} onChange={e => set("titular", e.target.value.toUpperCase())} placeholder="NOME COMO NO CARTÃO" /></div>
              <div className="grid-2">
                <div className="field"><label>Validade</label><input value={form.validade || ""} onChange={e => set("validade", e.target.value.replace(/\D/g,"").replace(/^(\d{2})(\d)/,"$1/$2").slice(0,5))} placeholder="MM/AA" /></div>
                <div className="field"><label>CVV</label><input type="password" value={form.cvv || ""} onChange={e => set("cvv", e.target.value.slice(0,4))} placeholder="000" /></div>
              </div>
              <div className="field"><label>Bandeira</label><select value={form.bandeira || ""} onChange={e => set("bandeira", e.target.value)}><option value="">Selecione...</option>{["Visa","Mastercard","Elo","American Express","Hipercard","Diners"].map(b => <option key={b}>{b}</option>)}</select></div>
            </>)}
            {tipo === "boleto" && (<div className="alert alert-info">O boleto é gerado automaticamente no momento do pagamento do frete.</div>)}
            {tipo === "carteira" && (<>
              <div className="field"><label>Carteira digital</label><select value={form.carteira || ""} onChange={e => set("carteira", e.target.value)}><option value="">Selecione...</option>{["PicPay","Mercado Pago","PayPal","RecargaPay","AME Digital"].map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="field"><label>Email / telefone da conta</label><input value={form.conta || ""} onChange={e => set("conta", e.target.value)} placeholder="seu@email.com" /></div>
            </>)}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowAdd(false); setForm({}); }}>Cancelar</button>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={adicionar}>Adicionar</button>
            </div>
          </div>
        )}
        {formas.length === 0 && !showAdd && (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>Nenhuma forma de pagamento</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Adicione Pix, cartão, TED ou boleto para pagar seus fretes.</p>
          </div>
        )}
        {formas.map(f => (
          <div key={f.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--gold-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{getIcon(f.tipo)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{getLabel(f.tipo)}</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>{getDesc(f)}</div>
            </div>
            <button onClick={() => remover(f.id)} style={{ background: "none", border: "none", color: "var(--red)", fontSize: 18, cursor: "pointer" }}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AVALIAÇÕES — lista de avaliações recebidas/dadas
// ─────────────────────────────────────────────
function AvaliacoesScreen({ onNavigate }) {
  const { user, token } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState(0);
  const isMot = user?.tipo === "motorista";

  useEffect(() => {
    const rota = isMot ? "/api/motoristas/avaliacoes" : "/api/contratantes/historico";
    api("GET", rota, null, token)
      .then(d => {
        if (isMot) {
          setAvaliacoes(Array.isArray(d) ? d : []);
          if (d?.length) setMedia((d.reduce((a, x) => a + Number(x.nota), 0) / d.length).toFixed(1));
        } else {
          // contratante: filtra fretes entregues que tem info de avaliação
          const entregues = (Array.isArray(d) ? d : []).filter(f => f.status === "entregue");
          setAvaliacoes(entregues);
        }
      })
      .catch(() => setAvaliacoes([]))
      .finally(() => setLoading(false));
  }, []);

  const Estrelas = ({ nota }) => (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ fontSize: 16, color: n <= nota ? "#C9A84C" : "var(--border)" }}>★</span>
      ))}
    </div>
  );

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate(-1)}>←</button>
        <h1>Avaliações</h1>
      </div>
      <div className="content">
        {isMot && avaliacoes.length > 0 && (
          <div className="card" style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: "var(--gold)" }}>{media}</div>
            <Estrelas nota={Math.round(media)} />
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 6 }}>{avaliacoes.length} avaliação{avaliacoes.length !== 1 ? "ões" : ""} recebida{avaliacoes.length !== 1 ? "s" : ""}</div>
          </div>
        )}
        {loading ? <Loading /> : avaliacoes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>
              {isMot ? "Nenhuma avaliação recebida" : "Nenhum frete concluído"}
            </p>
            <p style={{ fontSize: 13, marginTop: 6 }}>
              {isMot ? "As avaliações dos contratantes aparecerão aqui após cada entrega." : "Complete fretes para ver o histórico aqui."}
            </p>
          </div>
        ) : isMot ? (
          avaliacoes.map((a, i) => (
            <div key={a.id || i} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.avaliador_nome || "Contratante"}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                    {a.criado_em ? new Date(a.criado_em).toLocaleDateString("pt-BR") : "—"}
                  </div>
                </div>
                <Estrelas nota={Number(a.nota)} />
              </div>
              {a.comentario && (
                <div style={{ fontSize: 13, color: "var(--text2)", fontStyle: "italic", borderLeft: "3px solid var(--gold)", paddingLeft: 10, marginTop: 8 }}>
                  "{a.comentario}"
                </div>
              )}
            </div>
          ))
        ) : (
          avaliacoes.map((f, i) => (
            <div key={f.id || i} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{f.motorista_nome || "Motorista"}</div>
                <span className="badge badge-done">Entregue</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                {f.criado_em ? new Date(f.criado_em).toLocaleDateString("pt-BR") : "—"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// PAGAMENTO PIX — MercadoPago
// ─────────────────────────────────────────────
function PagamentoScreen({ data, onNavigate }) {
  const { token } = useAuth();
  const freteId = data?.freteId;
  const valorInicial = data?.valor || 0;
  const [qrCode, setQrCode] = useState(null);
  const [pixKey, setPixKey] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [status, setStatus] = useState("criando");
  const [valor, setValor] = useState(valorInicial);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!freteId) { setErro("Frete não identificado"); setStatus("erro"); return; }
    api("POST", `/api/pagamentos/criar-pix/${freteId}`, {}, token)
      .then(d => {
        setQrCode(d.qr_code);
        setPixKey(d.pix_key);
        setPaymentId(d.payment_id);
        setValor(d.valor || valorInicial);
        setStatus(d.status === "approved" ? "approved" : "pending");
        if (d.status !== "approved" && d.payment_id) {
          intervalRef.current = setInterval(async () => {
            try {
              const s = await api("GET", `/api/pagamentos/status/${d.payment_id}`, null, token);
              if (s.status === "approved") { setStatus("approved"); clearInterval(intervalRef.current); }
            } catch {}
          }, 5000);
        }
      })
      .catch(e => { setErro(e.message); setStatus("erro"); });
    return () => clearInterval(intervalRef.current);
  }, [freteId]);

  const copiar = () => {
    if (!pixKey) return;
    try {
      navigator.clipboard.writeText(pixKey);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {}
  };

  const simularAprovacao = async () => {
    if (!freteId) return;
    try {
      await api("POST", `/api/pagamentos/simular-aprovacao/${freteId}`, {}, token);
      setStatus("approved");
      clearInterval(intervalRef.current);
    } catch (e) {
      setErro("Erro ao simular: " + e.message);
    }
  };

  if (status === "approved") return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("meus-fretes")}>←</button><h1>Pagamento</h1></div>
      <div className="content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "var(--green)", marginBottom: 8 }}>Pago!</div>
        <div style={{ color: "var(--text3)", marginBottom: 32, textAlign: "center" }}>Pagamento confirmado pelo MercadoPago.<br/>Aguardando motorista disponível.</div>
        <button className="btn btn-primary" onClick={() => onNavigate("meus-fretes")}>Ver Meus Fretes</button>
      </div>
    </div>
  );

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Pagar via Pix</h1></div>
      <div className="content">
        {status === "criando" && <Loading />}
        {erro && <div className="alert alert-error">{erro}</div>}
        {status === "pending" && qrCode && (
          <>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>Valor a pagar</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: "var(--gold)", marginBottom: 20 }}>{formatMoney(valor)}</div>
              <img src={`data:image/png;base64,${qrCode}`} alt="QR Code Pix" style={{ width: 220, height: 220, margin: "0 auto 16px", display: "block", borderRadius: 12, border: "2px solid var(--border)" }} />
              <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 14 }}>Escaneie com o app do seu banco ou copie a chave</p>
              <button className="btn btn-primary" onClick={copiar}>
                {copiado ? "✅ Copiado!" : "📋 Copiar Chave Pix"}
              </button>
            </div>
            <div className="card" style={{ borderLeft: "4px solid var(--gold)" }}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Como pagar:</div>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
                1. Abra o app do seu banco<br/>
                2. Escolha <strong>Pix → Pagar</strong><br/>
                3. Leia o QR Code ou cole a chave copiada<br/>
                4. Confirme o pagamento de <strong>{formatMoney(valor)}</strong><br/>
                5. Esta tela confirma automaticamente ✓
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", opacity: 0.7 }} />
              Aguardando confirmação do pagamento...
            </div>
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text3)" }}>
              Powered by MercadoPago · Ambiente de testes
            </div>
            <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(201,168,76,0.08)", borderRadius: 10, border: "1px dashed var(--gold)" }}>
              <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", marginBottom: 8, letterSpacing: 1 }}>🧪 Sandbox — apenas para testes</div>
              <button className="btn btn-outline btn-sm" style={{ width: "100%" }} onClick={simularAprovacao}>
                ✅ Simular Pagamento Aprovado
              </button>
            </div>
          </>
        )}
      </div>
    </div>
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
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
          <p style={{ fontWeight: 600 }}>Em breve</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Esta funcionalidade será disponibilizada em breve.</p>
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
    } else {
      setScreen("login");
    }
  }, [user?.id, user?.tipo]);

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
    case "dados-pessoais-contratante": return <DadosPessoaisContratante {...p} />;
    case "pagamentos": return <PagamentosScreen {...p} />;
    case "home-motorista": return <MotoristaHome {...p} />;
    case "aceitar-frete": return <AceitarFreteScreen frete={screenData} {...p} />;
    case "meus-fretes-motorista": return <MeusFretesMot {...p} />;
    case "em-transito": return <EmTransitoScreen frete={screenData} {...p} />;
    case "perfil-motorista": return <PerfilMotorista {...p} />;
    case "dados-pessoais-motorista": return <DadosPessoaisMotorista {...p} />;
    case "dados-caminhao": return <DadosCaminhaoMotorista {...p} />;
    case "financas-motorista": return <FinancasMotorista {...p} />;
    case "chat": return <ChatScreen data={screenData} {...p} />;
    case "avaliar": return <AvaliarScreen data={screenData} {...p} />;
    case "opcoes-motorista": return <OpcoesMotorista {...p} />;
    case "opcoes-contratante": return <OpcoesContratante {...p} />;
    case "termos": return <TermosScreen {...p} />;
    case "pagamento": return <PagamentoScreen data={screenData} {...p} />;
    case "avaliacoes": return <AvaliacoesScreen {...p} />;
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