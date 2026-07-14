import { useState, useEffect, createContext, useContext, useRef } from "react";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const API_BASE = "https://truker-app-production.up.railway.app";
const ADMIN_EMAIL = "admin@truker.app";
const ADMIN_SENHA = "truker2024";
const ADMIN_TOKEN = "08c427d2ef6a13f5ef4371b164e337902a766b4e66c57342ab899711e6d7e071";
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

// Baixa um arquivo binário autenticado (ex: PDF de contrato) e abre em nova aba.
// O endpoint só aceita token via header Authorization, então não dá pra usar
// window.open(url) direto — buscamos como blob e abrimos uma URL local.
// A aba é aberta ANTES do fetch (síncrono, dentro do clique do usuário) e só
// redirecionada depois — abrir só no final, após o await, é bloqueado como
// pop-up pela maioria dos navegadores por perder o gesto do usuário.
async function abrirArquivoAutenticado(path, token) {
  const novaJanela = window.open("", "_blank");
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      let msg = "Não foi possível abrir o arquivo";
      try { const data = await res.json(); msg = data.error || msg; } catch {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (novaJanela) novaJanela.location.href = url;
    else window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    if (novaJanela) novaJanela.close();
    throw e;
  }
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

// Regras de formulário dinâmico por tipo de carga:
//  - dimensoes: mostrar campos comprimento/largura/altura?
//  - especial:  campo extra específico ("animal" | "itens" | "material" | null)
// Peso é SEMPRE obrigatório (não entra aqui). Espelha a lógica do backend.
const REGRAS_CARGA = {
  carga_seca:        { dimensoes: true,  especial: null },
  graneleiro:        { dimensoes: false, especial: null },
  refrigerada:       { dimensoes: true,  especial: null },
  frigorifico:       { dimensoes: true,  especial: null },
  mudanca:           { dimensoes: false, especial: "itens" },
  carga_viva:        { dimensoes: false, especial: "animal" },
  liquidos:          { dimensoes: false, especial: null },
  inflamavel:        { dimensoes: false, especial: null },
  perigosa:          { dimensoes: true,  especial: null },
  farmaceutico:      { dimensoes: true,  especial: null },
  eletronicos:       { dimensoes: true,  especial: null },
  alimentos:         { dimensoes: true,  especial: null },
  bebidas:           { dimensoes: true,  especial: null },
  construcao:        { dimensoes: false, especial: "material" },
  maquinario:        { dimensoes: true,  especial: null },
  superdimensionado: { dimensoes: true,  especial: null },
  residuos:          { dimensoes: false, especial: null },
  veiculos:          { dimensoes: true,  especial: null },
  classificados:     { dimensoes: true,  especial: null },
  madeira:           { dimensoes: true,  especial: null },
};
const regrasCarga = (id) => REGRAS_CARGA[id] || { dimensoes: true, especial: null };

const TIPOS_ANIMAL = ["Bovino", "Suíno", "Aves", "Equino", "Ovino/Caprino", "Outros"];
const TIPOS_MATERIAL = ["Cimento", "Areia", "Brita", "Tijolo/Bloco", "Vergalhão/Aço", "Madeira", "Telhas", "Outros"];

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

// Mapeamento frontend → categoria oficial ANTT (Tabela A, Resolução 5.867/2020 + Portaria SUROC 4/2026)
// Categorias disponíveis: geral, frigorificado, perigoso, granel_liquido, granel_solido, neogranel, conteinerizado, granel_pressurizado
const CARGA_BACKEND_MAP = {
  carga_seca: "geral", graneleiro: "granel_solido", refrigerada: "frigorificado",
  frigorifico: "frigorificado", mudanca: "geral", carga_viva: "geral",
  liquidos: "granel_liquido", inflamavel: "perigoso", perigosa: "perigoso",
  farmaceutico: "geral", eletronicos: "geral", alimentos: "geral",
  bebidas: "geral", construcao: "granel_solido", maquinario: "geral",
  superdimensionado: "geral", residuos: "granel_solido", veiculos: "geral",
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
  /* Corrige frestas (seams) entre os tiles do mapa Leaflet — bug conhecido de
     arredondamento de subpixel ao usar fitBounds/zoom. Tiles levemente maiores
     cobrem a fresta; fundo claro evita que ela apareça escura quando visível. */
  .leaflet-tile { width: 257px !important; height: 257px !important; }
  .leaflet-container { background: #EFE9DC !important; }
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

// Cartão discreto de histórico de preços da rota (piso ANTT + média de mercado)
function HistoricoPrecoRota({ origemCidade, origemUf, destCidade, destUf, tipoVeiculo, tipoCarga, mostrarPiso = true }) {
  const { token } = useAuth();
  const [historico, setHistorico] = useState(null);

  useEffect(() => {
    if (!origemCidade || !origemUf || !destCidade || !destUf) { setHistorico(null); return; }
    let cancelado = false;
    const params = new URLSearchParams({ origem_cidade: origemCidade, origem_uf: origemUf, dest_cidade: destCidade, dest_uf: destUf });
    if (tipoVeiculo) params.set("tipo_veiculo", tipoVeiculo);
    if (tipoCarga) params.set("tipo_carga", tipoCarga);
    api("GET", `/api/fretes/historico-precos-rota?${params.toString()}`, null, token)
      .then(data => { if (!cancelado) setHistorico(data); })
      .catch(() => { if (!cancelado) setHistorico(null); });
    return () => { cancelado = true; };
  }, [origemCidade, origemUf, destCidade, destUf, tipoVeiculo, tipoCarga]);

  if (!historico) return null;
  const temMedia = historico.mediaMercado != null;

  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "var(--text2)" }}>
      <span>📊{" "}
        {mostrarPiso && <>Piso ANTT: <strong>{formatMoney(historico.pisoAntt)}</strong></>}
        {mostrarPiso && temMedia && " · "}
        {temMedia && <>Média paga nessa rota: <strong>{formatMoney(historico.mediaMercado)}</strong> (baseado em {historico.totalFretes} frete{historico.totalFretes === 1 ? "" : "s"})</>}
      </span>
      {temMedia && historico.granularidade === "estado" && (
        <div style={{ marginTop: 4, color: "var(--text3)" }}>Média do estado — poucos dados nessa cidade exata</div>
      )}
    </div>
  );
}

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
    <div ref={divRef} style={{ width: "100%", height: `${height}px`, borderRadius: 12, overflow: "hidden", position: "relative", zIndex: 1, background: "#EFE9DC" }} />
  );
}
function PasswordInput({ value, onChange, placeholder, inputStyle }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-eye">
      <input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder || "••••••••"} style={inputStyle} />
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
function TrukerLogo({ size = "md", noTagline = false }) {
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

function SplashScreen({ onNavigate }) {
  const { user } = useAuth();
  useEffect(() => {
    const t = setTimeout(() => {
      if (user) {
        if (user.tipo === "admin") onNavigate("admin-dashboard");
        else if (user.tipo === "motorista") onNavigate("home-motorista");
        else onNavigate("home-contratante");
      } else {
        onNavigate("entrada");
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
// ENTRADA — tela inicial (motorista / contratante)
// ─────────────────────────────────────────────
function EntradaScreen({ onNavigate }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--surface)", overflow: "hidden" }}>

      {/* Hero escuro com logo */}
      <div style={{
        background: "linear-gradient(180deg, #1A1209 0%, #271A0E 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "56px 24px 48px", position: "relative",
      }}>
        {/* Círculo decorativo sutil */}
        <div style={{
          position: "absolute", width: 280, height: 280, borderRadius: "50%",
          background: "rgba(201,168,76,0.07)", top: -60, right: -60, pointerEvents: "none",
        }} />
        <TrukerLogo size="lg" noTagline />
      </div>

      {/* Área de ação */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 24px 40px" }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 20, textAlign: "center" }}>
          Como você quer usar o TRUKER?
        </p>

        {/* Botão principal — Motorista */}
        <button
          onClick={() => onNavigate("cadastro", { tipo: "motorista" })}
          style={{
            width: "100%", padding: "18px 20px", marginBottom: 14,
            background: "var(--gold)", border: "none", borderRadius: 16,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 4px 16px rgba(201,168,76,0.30)",
          }}
        >
          <span style={{ fontSize: 34, lineHeight: 1 }}>🚛</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>Sou motorista</div>
            <div style={{ fontSize: 13, color: "rgba(26,18,9,0.65)", marginTop: 2 }}>Quero encontrar fretes e trabalhar</div>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 22, color: "var(--text)", opacity: 0.5 }}>›</span>
        </button>

        {/* Botão secundário — Contratante */}
        <button
          onClick={() => onNavigate("cadastro", { tipo: "contratante" })}
          style={{
            width: "100%", padding: "18px 20px",
            background: "transparent", border: "2px solid var(--border)", borderRadius: 16,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
          }}
        >
          <span style={{ fontSize: 34, lineHeight: 1 }}>📦</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>Sou contratante</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>Quero publicar fretes e contratar</div>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 22, color: "var(--text3)" }}>›</span>
        </button>

        {/* Link de login */}
        <p style={{ textAlign: "center", marginTop: "auto", paddingTop: 36, color: "var(--text3)", fontSize: 14 }}>
          Já tem conta?{" "}
          <span
            style={{ color: "var(--gold)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
            onClick={() => onNavigate("login")}
          >
            Faça login
          </span>
        </p>
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
      login({ nome: "Admin Master", email: ADMIN_EMAIL, tipo: "admin" }, ADMIN_TOKEN);
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
// CADASTRO — fluxo passo a passo
// ─────────────────────────────────────────────
function CadastroScreen({ onNavigate, screenData }) {
  const { login } = useAuth();

  // Se vier da EntradaScreen o tipo já está definido → começa no step 1
  // step 0  = escolha do tipo (tela de entrada, sem barra de progresso)
  // step 1..N = dados, um por tela
  // step 99 = verificação de e-mail
  const tipoInicial = screenData?.tipo || null;
  const [step, setStep] = useState(tipoInicial ? 1 : 0);
  const [tipo, setTipo] = useState(tipoInicial || "contratante");
  const [form, setForm] = useState({
    nome: "", email: "", senha: "", telefone: "",
    documento: "", nomeEmpresa: "", tiposCarga: [],
    tipoVeiculo: "", cnh: "", rntrc: "", placa: "", anoFab: "",
  });
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [pendingUser, setPendingUser] = useState(null);
  const [codigoVerif, setCodigoVerif] = useState("");
  const [reenviando, setReenviando]   = useState(false);
  const [reenviadoMsg, setReenviadoMsg] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleCarga = (id) =>
    setForm(f => ({ ...f, tiposCarga: f.tiposCarga.includes(id) ? f.tiposCarga.filter(x => x !== id) : [...f.tiposCarga, id] }));

  // Sequências de passos por tipo (1-based dentro do fluxo)
  // Contratante:  nome(1) email(2) senha(3) tel(4) doc(5) empresa(6) cargas(7) termos(8)
  // Motorista:    nome(1) email(2) senha(3) tel(4) cpf(5) cnh(6) rntrc(7) veiculo(8) placa(9) ano(10) cargas(11) termos(12)
  const TOTAL = tipo === "motorista" ? 12 : 8;
  const pct   = step === 0 ? 0 : Math.round((step / TOTAL) * 100);

  const [verificando, setVerificando] = useState(false);

  const verificarDisponibilidade = async (campo, valor) => {
    try {
      const data = await api("GET", `/api/auth/verificar-disponibilidade?campo=${campo}&valor=${encodeURIComponent(valor)}`);
      return data.disponivel;
    } catch { return true; } // em caso de erro de rede, deixa passar
  };

  const avancar = async () => {
    setError("");
    // Step 2: e-mail — verifica duplicidade antes de avançar
    if (step === 2) {
      if (!form.email.trim()) return setError("Digite seu e-mail.");
      setVerificando(true);
      const disponivel = await verificarDisponibilidade("email", form.email.trim());
      setVerificando(false);
      if (!disponivel) return setError("Este e-mail já está cadastrado. Faça login ou use outro e-mail.");
    }
    // Step 6 (motorista): CNH — verifica duplicidade
    if (step === 6 && tipo === "motorista") {
      if (form.cnh.trim()) {
        setVerificando(true);
        const disponivel = await verificarDisponibilidade("cnh", form.cnh.trim());
        setVerificando(false);
        if (!disponivel) return setError("Esta CNH já está cadastrada em outra conta.");
      }
    }
    // Step 7 (motorista): RNTRC — verifica duplicidade
    if (step === 7 && tipo === "motorista") {
      if (form.rntrc.trim()) {
        setVerificando(true);
        const disponivel = await verificarDisponibilidade("rntrc", form.rntrc.trim());
        setVerificando(false);
        if (!disponivel) return setError("Este RNTRC já está cadastrado em outra conta.");
      }
    }
    setStep(s => s + 1);
  };
  const voltar  = () => {
    setError("");
    if (step <= 1) {
      // Se veio da tela de entrada (tipo já vinha definido), volta pra lá
      if (tipoInicial) { onNavigate("entrada"); }
      else { setStep(0); }
    } else {
      setStep(s => s - 1);
    }
  };

  const finalizar = async () => {
    if (!aceitouTermos) return setError("Aceite os Termos de Uso para continuar.");
    setError(""); setLoading(true);
    try {
      const data = await api("POST", "/api/auth/cadastro", { ...form, tipo });
      setPendingUser({ usuario: data.usuario, token: data.token, codigo_teste: data.codigo_teste || null });
      setStep(99);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const verificarEmail = async () => {
    if (codigoVerif.length !== 6) return setError("Digite o código de 6 dígitos.");
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

  // ── Estilos internos reutilizáveis ──────────────────────
  const sContainer = {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    background: "var(--surface)", padding: "0 0 40px",
  };
  const sHeader = {
    padding: "16px 20px 0",
  };
  const sProgressBar = {
    height: 4, background: "var(--border)", borderRadius: 2,
    margin: "12px 20px 0", overflow: "hidden",
  };
  const sProgressFill = {
    height: "100%", background: "var(--gold)", borderRadius: 2,
    width: `${pct}%`, transition: "width 0.3s ease",
  };
  const sContent = {
    flex: 1, padding: "32px 24px 0",
  };
  const sBigTitle = {
    fontSize: 28, fontWeight: 800, color: "var(--text)",
    lineHeight: 1.2, marginBottom: 6,
  };
  const sSub = {
    fontSize: 14, color: "var(--text3)", marginBottom: 28, lineHeight: 1.5,
  };
  const sInput = {
    width: "100%", fontSize: 17, padding: "14px 16px",
    border: "1.5px solid var(--border)", borderRadius: 12,
    background: "var(--surface2)", color: "var(--text)",
    outline: "none", boxSizing: "border-box",
  };
  const sFooter = {
    padding: "20px 24px 0",
  };
  const sContinuar = {
    width: "100%", padding: "16px", fontSize: 16, fontWeight: 700,
    background: "var(--gold)", color: "var(--text)", border: "none",
    borderRadius: 14, cursor: "pointer",
  };
  const sContinuarDisabled = { ...sContinuar, opacity: 0.4, cursor: "not-allowed" };

  // helper para renderizar o topo (back + barra)
  const Topo = ({ showBar = true }) => (
    <div style={sHeader}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={step === 0 ? () => onNavigate("login") : voltar}
          style={{ background: "none", border: "none", fontSize: 22, color: "var(--text)", cursor: "pointer", padding: "4px 8px 4px 0" }}>
          ←
        </button>
        {showBar && (
          <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}>{pct}%</span>
        )}
      </div>
      {showBar && <div style={sProgressBar}><div style={sProgressFill} /></div>}
    </div>
  );

  // ── STEP 99: Verificação de e-mail ───────────────────────
  if (step === 99 && pendingUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px", background: "var(--surface)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>📧</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "var(--text)" }}>Verifique seu e-mail</div>
          <p style={{ color: "var(--text3)", fontSize: 14, margin: 0 }}>
            Enviamos um código de 6 dígitos para<br />
            <strong style={{ color: "var(--gold)" }}>{pendingUser.usuario.email}</strong>
          </p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {reenviadoMsg && <div className="alert alert-success">✅ {reenviadoMsg}</div>}
        {pendingUser.codigo_teste && (
          <div style={{ background: "rgba(201,168,76,0.1)", border: "1px dashed var(--gold)", borderRadius: 12, padding: "14px 12px", marginBottom: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🧪 Modo teste</div>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 14, color: "var(--text)", fontFamily: "monospace" }}>{pendingUser.codigo_teste}</div>
          </div>
        )}
        <div className="field">
          <label>Código de verificação</label>
          <input type="text" inputMode="numeric" maxLength={6}
            value={codigoVerif} onChange={e => setCodigoVerif(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            style={{ fontSize: 28, letterSpacing: 12, textAlign: "center", fontFamily: "monospace" }} />
        </div>
        <button className="btn btn-primary" onClick={verificarEmail} disabled={loading} style={{ marginBottom: 12 }}>
          {loading ? "Verificando..." : "✅ Verificar E-mail"}
        </button>
        <button className="btn btn-secondary" onClick={reenviarCodigo} disabled={reenviando}>
          {reenviando ? "Enviando..." : "🔄 Reenviar código"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, color: "var(--text3)", fontSize: 12 }}>O código expira em 15 minutos.</p>
      </div>
    );
  }

  // ── STEP 0: Escolha do tipo ───────────────────────────────
  if (step === 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--surface)" }}>
        <div style={{ padding: "16px 20px 0" }}>
          <button onClick={() => onNavigate("login")}
            style={{ background: "none", border: "none", fontSize: 22, color: "var(--text)", cursor: "pointer", padding: "4px 8px 4px 0" }}>
            ←
          </button>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <TrukerLogo size="sm" />
            <p style={{ color: "var(--text3)", marginTop: 8, fontSize: 15 }}>Como você quer usar o TRUKER?</p>
          </div>

          {/* Card Motorista */}
          <div onClick={() => { setTipo("motorista"); set("tipo", "motorista"); avancar(); }}
            style={{ background: "#fff", border: "2px solid var(--border)", borderRadius: 16, padding: "20px 20px", marginBottom: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>🚛</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>Sou motorista</div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>Quero encontrar fretes e trabalhar</div>
            </div>
            <div style={{ marginLeft: "auto", color: "var(--text3)", fontSize: 20 }}>›</div>
          </div>

          {/* Card Contratante */}
          <div onClick={() => { setTipo("contratante"); set("tipo", "contratante"); avancar(); }}
            style={{ background: "#fff", border: "2px solid var(--border)", borderRadius: 16, padding: "20px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>📦</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>Sou contratante</div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>Quero publicar fretes e contratar</div>
            </div>
            <div style={{ marginLeft: "auto", color: "var(--text3)", fontSize: 20 }}>›</div>
          </div>

          <p style={{ textAlign: "center", marginTop: 32, color: "var(--text3)", fontSize: 13 }}>
            Já tem conta?{" "}
            <span style={{ color: "var(--gold)", cursor: "pointer", fontWeight: 600 }} onClick={() => onNavigate("login")}>Entrar</span>
          </p>
        </div>
      </div>
    );
  }

  // ── STEPS 1–N: um campo por tela ─────────────────────────
  // Passos COMUNS (1-4): nome, email, senha, telefone
  if (step === 1) {
    return (
      <div style={sContainer}>
        <Topo />
        <div style={sContent}>
          <div style={sBigTitle}>Digite seu nome</div>
          <div style={sSub}>Como você quer ser chamado no TRUKER.</div>
          {error && <div className="alert alert-error">{error}</div>}
          <input autoFocus style={sInput} placeholder="Nome completo"
            value={form.nome} onChange={e => set("nome", e.target.value)}
            onKeyDown={e => e.key === "Enter" && form.nome.trim() && avancar()} />
        </div>
        <div style={sFooter}>
          <button style={form.nome.trim() ? sContinuar : sContinuarDisabled}
            disabled={!form.nome.trim()}
            onClick={avancar}>Continuar</button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div style={sContainer}>
        <Topo />
        <div style={sContent}>
          <div style={sBigTitle}>Digite seu e-mail</div>
          <div style={sSub}>Você vai usar este e-mail para entrar no app.</div>
          {error && <div className="alert alert-error">{error}</div>}
          <input autoFocus type="email" style={sInput} placeholder="seu@email.com"
            value={form.email} onChange={e => set("email", e.target.value)}
            onKeyDown={e => e.key === "Enter" && form.email.trim() && !loading && avancar()} />
        </div>
        <div style={sFooter}>
          <button style={form.email.trim() && !verificando ? sContinuar : sContinuarDisabled}
            disabled={!form.email.trim() || verificando}
            onClick={avancar}>{verificando ? "Verificando..." : "Continuar"}</button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    const senhaOk = form.senha.length >= 6 && form.senha === (form.confirmarSenha || "");
    return (
      <div style={sContainer}>
        <Topo />
        <div style={sContent}>
          <div style={sBigTitle}>Crie uma senha</div>
          <div style={sSub}>Mínimo de 6 caracteres.</div>
          {error && <div className="alert alert-error">{error}</div>}
          <PasswordInput value={form.senha} onChange={e => set("senha", e.target.value)} placeholder="••••••••" inputStyle={sInput} />
          <div style={{ height: 12 }} />
          <PasswordInput value={form.confirmarSenha || ""} onChange={e => set("confirmarSenha", e.target.value)} placeholder="Confirme a senha" inputStyle={sInput} />
          {form.confirmarSenha && form.senha !== form.confirmarSenha && (
            <div style={{ color: "var(--red)", fontSize: 13, marginTop: 8 }}>As senhas não coincidem.</div>
          )}
        </div>
        <div style={sFooter}>
          <button style={senhaOk ? sContinuar : sContinuarDisabled}
            disabled={!senhaOk}
            onClick={avancar}>Continuar</button>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div style={sContainer}>
        <Topo />
        <div style={sContent}>
          <div style={sBigTitle}>Seu WhatsApp</div>
          <div style={sSub}>Para contato sobre fretes e suporte.</div>
          {error && <div className="alert alert-error">{error}</div>}
          <input autoFocus type="tel" style={sInput} placeholder="(41) 99999-9999"
            value={form.telefone} onChange={e => set("telefone", e.target.value)}
            onKeyDown={e => e.key === "Enter" && form.telefone.trim() && avancar()} />
        </div>
        <div style={sFooter}>
          <button style={form.telefone.trim() ? sContinuar : sContinuarDisabled}
            disabled={!form.telefone.trim()}
            onClick={avancar}>Continuar</button>
        </div>
      </div>
    );
  }

  // ── CONTRATANTE: passos 5–8 ───────────────────────────────
  if (tipo === "contratante") {
    if (step === 5) {
      return (
        <div style={sContainer}>
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>CPF ou CNPJ</div>
            <div style={sSub}>Para emissão de documentos fiscais.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus style={sInput} placeholder="000.000.000-00 ou 00.000.000/0001-00"
              value={form.documento} onChange={e => set("documento", e.target.value)}
              onKeyDown={e => e.key === "Enter" && form.documento.trim() && avancar()} />
          </div>
          <div style={sFooter}>
            <button style={form.documento.trim() ? sContinuar : sContinuarDisabled}
              disabled={!form.documento.trim()} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div style={sContainer}>
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>Nome da empresa</div>
            <div style={sSub}>Opcional. Pule se preferir usar seu nome.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus style={sInput} placeholder="Empresa LTDA (opcional)"
              value={form.nomeEmpresa} onChange={e => set("nomeEmpresa", e.target.value)} />
          </div>
          <div style={sFooter}>
            <button style={sContinuar} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 7) {
      return (
        <div style={sContainer}>
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>Tipos de carga</div>
            <div style={sSub}>Selecione o que você costuma precisar transportar.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="carga-grid">
              {TIPOS_CARGA.map(c => (
                <div key={c.id} className={`carga-item ${form.tiposCarga.includes(c.id) ? "selected" : ""}`} onClick={() => toggleCarga(c.id)}>
                  <div className="ci-icon">{c.icon}</div>
                  <div className="ci-label">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={sFooter}>
            <button style={form.tiposCarga.length > 0 ? sContinuar : sContinuarDisabled}
              disabled={form.tiposCarga.length === 0} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 8) {
      return (
        <div style={sContainer}>
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>Termos de uso</div>
            <div style={sSub}>Leia e aceite para criar sua conta.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                Ao criar uma conta no TRUKER, você concorda com nossas{" "}
                <span style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }} onClick={() => onNavigate("termos")}>
                  Políticas de Uso e Privacidade
                </span>
                . Seus dados serão utilizados exclusivamente para intermediação de fretes.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={aceitouTermos} onChange={e => setAceitouTermos(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: "var(--gold)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.5 }}>
                Li e aceito os Termos de Uso e a Política de Privacidade da TRUKER.
              </span>
            </label>
          </div>
          <div style={sFooter}>
            <button style={aceitouTermos ? sContinuar : sContinuarDisabled}
              disabled={!aceitouTermos || loading}
              onClick={finalizar}>
              {loading ? "Criando conta..." : "Criar Conta"}
            </button>
          </div>
        </div>
      );
    }
  }

  // ── MOTORISTA: passos 5–12 ────────────────────────────────
  if (tipo === "motorista") {
    if (step === 5) {
      return (
        <div style={sContainer}>
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>Seu CPF</div>
            <div style={sSub}>Número de Cadastro de Pessoa Física.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus style={sInput} placeholder="000.000.000-00"
              value={form.documento} onChange={e => set("documento", e.target.value)}
              onKeyDown={e => e.key === "Enter" && form.documento.trim() && avancar()} />
          </div>
          <div style={sFooter}>
            <button style={form.documento.trim() ? sContinuar : sContinuarDisabled}
              disabled={!form.documento.trim()} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div style={sContainer}>
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>Número da CNH</div>
            <div style={sSub}>Carteira Nacional de Habilitação — 11 dígitos.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus style={sInput} placeholder="00000000000" inputMode="numeric"
              value={form.cnh} onChange={e => set("cnh", e.target.value.replace(/\D/g, "").slice(0, 11))}
              onKeyDown={e => e.key === "Enter" && form.cnh.trim() && avancar()} />
          </div>
          <div style={sFooter}>
            <button style={form.cnh.trim() ? sContinuar : sContinuarDisabled}
              disabled={!form.cnh.trim()} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 7) {
      return (
        <div style={sContainer}>
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>RNTRC (ANTT)</div>
            <div style={sSub}>Registro Nacional de Transportadores Rodoviários de Cargas.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus style={sInput} placeholder="00000000" inputMode="numeric"
              value={form.rntrc} onChange={e => set("rntrc", e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={e => e.key === "Enter" && form.rntrc.trim() && avancar()} />
            <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 10 }}>
              Encontre no site da ANTT ou no seu CIOT.
            </p>
          </div>
          <div style={sFooter}>
            <button style={form.rntrc.trim() ? sContinuar : sContinuarDisabled}
              disabled={!form.rntrc.trim()} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 8) {
      // Grupos de tipo de veículo
      const grupos = [
        { label: "Leves",   items: ["furgao", "vuc", "toco"] },
        { label: "Médios",  items: ["truck", "munck"] },
        { label: "Pesados", items: ["carreta", "bitrem", "rodotrem", "prancha", "graneleiro", "frigorifico", "tanque"] },
      ];
      return (
        <div style={sContainer}>
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>Tipo de veículo</div>
            <div style={sSub}>Selecione o tipo do seu caminhão.</div>
            {error && <div className="alert alert-error">{error}</div>}
            {grupos.map(g => (
              <div key={g.label} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{g.label}</div>
                {g.items.map(id => {
                  const v = TIPOS_VEICULO.find(x => x.id === id);
                  if (!v) return null;
                  const sel = form.tipoVeiculo === id;
                  return (
                    <div key={id} onClick={() => set("tipoVeiculo", id)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", marginBottom: 6, borderRadius: 12, border: `2px solid ${sel ? "var(--gold)" : "var(--border)"}`, background: sel ? "rgba(201,168,76,0.08)" : "#fff", cursor: "pointer" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${sel ? "var(--gold)" : "var(--border)"}`, background: sel ? "var(--gold)" : "transparent", flexShrink: 0 }} />
                      <span style={{ fontSize: 20 }}>{v.icon}</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{v.label}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>até {v.cap} · {v.eixos} eixos</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={sFooter}>
            <button style={form.tipoVeiculo ? sContinuar : sContinuarDisabled}
              disabled={!form.tipoVeiculo} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 9) {
      return (
        <div style={sContainer}>
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>Placa do veículo</div>
            <div style={sSub}>Placa do cavalo mecânico.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus style={sInput} placeholder="ABC-1234 ou ABC1D23"
              value={form.placa} onChange={e => set("placa", maskPlaca(e.target.value))}
              onKeyDown={e => e.key === "Enter" && form.placa.trim() && avancar()} />
          </div>
          <div style={sFooter}>
            <button style={form.placa.trim() ? sContinuar : sContinuarDisabled}
              disabled={!form.placa.trim()} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 10) {
      return (
        <div style={sContainer}>
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>Ano de fabricação</div>
            <div style={sSub}>Do cavalo mecânico.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <input autoFocus type="number" style={sInput} placeholder="Ex: 2018" inputMode="numeric"
              min="1980" max="2026"
              value={form.anoFab} onChange={e => set("anoFab", e.target.value)}
              onKeyDown={e => e.key === "Enter" && form.anoFab && avancar()} />
          </div>
          <div style={sFooter}>
            <button style={form.anoFab ? sContinuar : sContinuarDisabled}
              disabled={!form.anoFab} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 11) {
      return (
        <div style={sContainer}>
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>Tipos de carga</div>
            <div style={sSub}>Selecione tudo que seu veículo pode transportar.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="carga-grid">
              {TIPOS_CARGA.map(c => (
                <div key={c.id} className={`carga-item ${form.tiposCarga.includes(c.id) ? "selected" : ""}`} onClick={() => toggleCarga(c.id)}>
                  <div className="ci-icon">{c.icon}</div>
                  <div className="ci-label">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={sFooter}>
            <button style={form.tiposCarga.length > 0 ? sContinuar : sContinuarDisabled}
              disabled={form.tiposCarga.length === 0} onClick={avancar}>Continuar</button>
          </div>
        </div>
      );
    }

    if (step === 12) {
      return (
        <div style={sContainer}>
          <Topo />
          <div style={sContent}>
            <div style={sBigTitle}>Termos de uso</div>
            <div style={sSub}>Leia e aceite para finalizar seu cadastro.</div>
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
                Ao criar uma conta no TRUKER como motorista, você concorda com nossas{" "}
                <span style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }} onClick={() => onNavigate("termos")}>
                  Políticas de Uso e Privacidade
                </span>
                . Seus dados serão usados exclusivamente para intermediação de fretes.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={aceitouTermos} onChange={e => setAceitouTermos(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: "var(--gold)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.5 }}>
                Li e aceito os Termos de Uso e a Política de Privacidade da TRUKER.
              </span>
            </label>
          </div>
          <div style={sFooter}>
            <button style={aceitouTermos ? sContinuar : sContinuarDisabled}
              disabled={!aceitouTermos || loading}
              onClick={finalizar}>
              {loading ? "Criando conta..." : "Finalizar Cadastro"}
            </button>
          </div>
        </div>
      );
    }
  }

  // fallback
  return null;
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
      login({ nome: "Admin Master", email: ADMIN_EMAIL, tipo: "admin" }, ADMIN_TOKEN);
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

        <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={() => onNavigate("admin-usuarios")}>
          🔧 Gerenciar Usuários (Master)
        </button>
        <button className="btn btn-secondary" style={{ marginBottom: 14 }} onClick={() => onNavigate("admin-motorista-teste")}>
          🚛 Criar Motorista de Teste
        </button>
        <button className="btn btn-secondary" style={{ marginBottom: 14 }} onClick={() => onNavigate("admin-seguradoras")}>
          🛡️ Gerenciar Seguradoras
        </button>

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
                  <span className="price" style={{ fontSize: 16 }}>{formatMoney(f.valor_final || f.valor_antt)}</span>
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
// ADMIN — GESTÃO MASTER DE USUÁRIOS
// ─────────────────────────────────────────────
function AdminUsuarios({ onNavigate }) {
  const { token } = useAuth();
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [form, setForm] = useState({});
  const [formVeiculo, setFormVeiculo] = useState({});
  const [novaSenha, setNovaSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [novoPerfilVeiculo, setNovoPerfilVeiculo] = useState("truck");
  const [novoPerfilPlaca, setNovoPerfilPlaca] = useState("");

  const buscar = async () => {
    setLoadingBusca(true);
    setErro("");
    try {
      const data = await api("GET", `/api/admin/usuarios?busca=${encodeURIComponent(busca)}`, null, token);
      setResultados(data);
    } catch (e) { setErro(e.message); }
    finally { setLoadingBusca(false); }
  };

  useEffect(() => { buscar(); }, []);

  const abrirUsuario = async (id) => {
    setSelecionado(id);
    setLoadingDetalhe(true);
    setMsg(""); setErro(""); setNovaSenha("");
    try {
      const data = await api("GET", `/api/admin/usuarios/${id}`, null, token);
      setDetalhe(data);
      setForm(data.usuario || {});
      setFormVeiculo(data.motorista || {});
    } catch (e) { setErro(e.message); }
    finally { setLoadingDetalhe(false); }
  };

  const fechar = () => {
    setSelecionado(null); setDetalhe(null); setForm({}); setFormVeiculo({});
    setNovaSenha(""); setMsg(""); setErro("");
  };

  const salvarDados = async () => {
    setSalvando(true); setMsg(""); setErro("");
    try {
      const { id, criado_em, ...campos } = form;
      const data = await api("PATCH", `/api/admin/usuarios/${selecionado}`, campos, token);
      setForm(data.usuario);
      setMsg("✅ Dados cadastrais atualizados");
      buscar();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const salvarVeiculo = async () => {
    if (!detalhe?.motorista) return;
    setSalvando(true); setMsg(""); setErro("");
    try {
      const { id, online, status, ...campos } = formVeiculo;
      const data = await api("PATCH", `/api/admin/motoristas/${detalhe.motorista.id}`, campos, token);
      setFormVeiculo(data.motorista);
      setMsg("✅ Dados do veículo atualizados");
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const trocarSenha = async () => {
    if (!novaSenha || novaSenha.length < 6) return setErro("A senha deve ter pelo menos 6 caracteres");
    setSalvando(true); setMsg(""); setErro("");
    try {
      await api("PATCH", `/api/admin/usuarios/${selecionado}/senha`, { novaSenha }, token);
      setMsg("✅ Senha redefinida com sucesso");
      setNovaSenha("");
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const forcarOffline = async () => {
    if (!detalhe?.motorista) return;
    setSalvando(true); setMsg(""); setErro("");
    try {
      await api("PATCH", `/api/admin/motoristas/${detalhe.motorista.id}/status`, { online: false }, token);
      setFormVeiculo({ ...formVeiculo, online: false });
      setMsg("✅ Motorista forçado para offline");
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const alternarStatus = async () => {
    if (!detalhe?.motorista) return;
    const novoStatus = formVeiculo.status === "bloqueado" ? "ativo" : "bloqueado";
    setSalvando(true); setMsg(""); setErro("");
    try {
      await api("PATCH", `/api/admin/motoristas/${detalhe.motorista.id}/status`, { status: novoStatus }, token);
      setFormVeiculo({ ...formVeiculo, status: novoStatus });
      setMsg(novoStatus === "bloqueado" ? "🚫 Motorista bloqueado" : "✅ Motorista desbloqueado");
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const excluirUsuario = async () => {
    if (!window.confirm(`Excluir permanentemente "${form.nome}"? Esta ação não pode ser desfeita.`)) return;
    setSalvando(true); setMsg(""); setErro("");
    try {
      await api("DELETE", `/api/admin/usuarios/${selecionado}`, null, token);
      fechar();
      buscar();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const criarPerfilMotorista = async () => {
    setSalvando(true); setMsg(""); setErro("");
    try {
      await api("POST", `/api/admin/usuarios/${selecionado}/criar-perfil-motorista`, {
        tipoVeiculo: novoPerfilVeiculo,
        placaVeiculo: novoPerfilPlaca || null,
      }, token);
      setMsg("✅ Perfil de motorista criado com sucesso");
      await abrirUsuario(selecionado); // recarrega para mostrar os novos cards
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  const campo = (label, key, tipo = "text") => (
    <div className="field">
      <label>{label}</label>
      <input
        type={tipo}
        value={form[key] || ""}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  const campoVeiculo = (label, key, tipo = "text") => (
    <div className="field">
      <label>{label}</label>
      <input
        type={tipo}
        value={formVeiculo[key] || ""}
        onChange={e => setFormVeiculo({ ...formVeiculo, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("admin-dashboard")}>← Voltar</button>
        <h1>Gestão Master de Usuários</h1>
        <div className="badge badge-admin" style={{ marginLeft: "auto" }}>ADMIN</div>
      </div>
      <div className="content">
        {!selecionado && (
          <>
            <div className="card">
              <div className="card-title">Buscar usuário</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ flex: 1, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", color: "var(--text)", fontSize: 15 }}
                  placeholder="Nome, email ou CPF/CNPJ"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && buscar()}
                />
                <button className="btn btn-primary" style={{ width: "auto", padding: "0 20px" }} onClick={buscar} disabled={loadingBusca}>
                  {loadingBusca ? "..." : "🔍"}
                </button>
              </div>
            </div>

            {erro && <div className="alert alert-error">{erro}</div>}

            {loadingBusca && <Loading />}

            {!loadingBusca && resultados.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: 32, color: "#555" }}>Nenhum usuário encontrado</div>
            )}

            {!loadingBusca && resultados.map(u => (
              <div key={u.id} className="card" style={{ cursor: "pointer" }} onClick={() => abrirUsuario(u.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {u.motorista_id && (u.online ? <span className="online-dot" /> : <span className="offline-dot" />)}
                      {u.nome}
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>{u.email}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{u.telefone || "sem telefone"} {u.cidade ? `· ${u.cidade}/${u.uf}` : ""}</div>
                  </div>
                  <span className={`badge ${u.tipo === "motorista" ? "badge-active" : "badge-pending"}`}>{u.tipo}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {selecionado && (
          <>
            <button className="btn btn-secondary" style={{ marginBottom: 14 }} onClick={fechar}>← Voltar à busca</button>

            {loadingDetalhe && <Loading />}

            {!loadingDetalhe && detalhe && (
              <>
                {msg && <div className="alert alert-success">{msg}</div>}
                {erro && <div className="alert alert-error">{erro}</div>}

                <div className="card">
                  <div className="card-title">Dados Cadastrais</div>
                  {campo("Nome", "nome")}
                  {campo("Email", "email", "email")}
                  {campo("Telefone", "telefone")}
                  {campo("CPF/CNPJ", "cpf_cnpj")}
                  {campo("CEP", "cep")}
                  {campo("Logradouro", "logradouro")}
                  {campo("Número", "numero")}
                  {campo("Complemento", "complemento")}
                  {campo("Bairro", "bairro")}
                  {campo("Cidade", "cidade")}
                  {campo("UF", "uf")}
                  {form.tipo === "contratante" && (
                    <>
                      {campo("Nome da empresa", "nome_empresa")}
                      {campo("Inscrição Estadual", "inscricao_estadual")}
                    </>
                  )}
                  <button className="btn btn-primary" onClick={salvarDados} disabled={salvando}>
                    {salvando ? "Salvando..." : "💾 Salvar Dados Cadastrais"}
                  </button>
                </div>

                <div className="card">
                  <div className="card-title">🔑 Redefinir Senha</div>
                  <PasswordInput value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Nova senha (mín. 6 caracteres)" />
                  <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={trocarSenha} disabled={salvando}>
                    {salvando ? "Salvando..." : "Definir Nova Senha"}
                  </button>
                </div>

                {form.tipo === "motorista" && !detalhe.motorista && (
                  <div className="card" style={{ borderColor: "var(--red)", borderWidth: 2 }}>
                    <div className="card-title">⚠️ Perfil de Motorista Ausente</div>
                    <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
                      Este usuário é do tipo motorista, mas não tem um perfil correspondente na tabela de motoristas.
                      Isso impede aceitar fretes, propor valores e aparecer como online. Crie o perfil para corrigir.
                    </p>
                    <div className="field">
                      <label>Tipo de veículo</label>
                      <select value={novoPerfilVeiculo} onChange={e => setNovoPerfilVeiculo(e.target.value)}>
                        {TIPOS_VEICULO.map(v => <option key={v.id} value={v.id}>{v.icon} {v.label}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Placa (opcional)</label>
                      <input value={novoPerfilPlaca} onChange={e => setNovoPerfilPlaca(e.target.value)} placeholder="ABC1D23" />
                    </div>
                    <button className="btn btn-primary" onClick={criarPerfilMotorista} disabled={salvando}>
                      {salvando ? "Criando..." : "🔧 Criar Perfil de Motorista"}
                    </button>
                  </div>
                )}

                {detalhe.motorista && (
                  <div className="card">
                    <div className="card-title">Dados do Veículo / CNH</div>
                    {campoVeiculo("Número CNH", "cnh_numero")}
                    {campoVeiculo("Categoria CNH", "cnh_categoria")}
                    {campoVeiculo("Validade CNH", "cnh_validade", "date")}
                    {campoVeiculo("RNTRC", "rntrc")}
                    {campoVeiculo("Tipo de veículo", "tipo_veiculo")}
                    {campoVeiculo("Tipo de carreta", "tipo_carreta")}
                    {campoVeiculo("Marca", "marca_veiculo")}
                    {campoVeiculo("Modelo", "modelo_veiculo")}
                    {campoVeiculo("Placa", "placa_veiculo")}
                    {campoVeiculo("Ano", "ano_veiculo", "number")}
                    {campoVeiculo("Renavam", "renavam")}
                    {campoVeiculo("Tara (kg)", "tara_kg", "number")}
                    {campoVeiculo("Capacidade (t)", "capacidade_tons", "number")}
                    <button className="btn btn-primary" onClick={salvarVeiculo} disabled={salvando}>
                      {salvando ? "Salvando..." : "💾 Salvar Dados do Veículo"}
                    </button>
                  </div>
                )}

                {detalhe.motorista && (
                  <div className="card">
                    <div className="card-title">Status do Motorista</div>
                    <div className="info-row">
                      <span className="info-label">Online agora</span>
                      <span className="info-value">{formVeiculo.online ? "🟢 Online" : "⚪ Offline"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Status</span>
                      <span className="info-value">{formVeiculo.status === "bloqueado" ? "🚫 Bloqueado" : "✅ Ativo"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      {formVeiculo.online && (
                        <button className="btn btn-secondary" onClick={forcarOffline} disabled={salvando}>Forçar Offline</button>
                      )}
                      <button className="btn btn-secondary" onClick={alternarStatus} disabled={salvando}>
                        {formVeiculo.status === "bloqueado" ? "Desbloquear" : "Bloquear"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="card">
                  <div className="card-title">⚠️ Zona de Risco</div>
                  <button className="btn btn-danger" onClick={excluirUsuario} disabled={salvando}>
                    🗑️ Excluir Usuário Permanentemente
                  </button>
                </div>
              </>
            )}
          </>
        )}
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
        <button className="btn btn-primary" style={{ marginBottom: 10 }} onClick={() => onNavigate("solicitar-frete")}>+ Solicitar Frete</button>
        <button className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={() => onNavigate("buscar-motoristas")}>🔍 Buscar Motoristas Disponíveis</button>
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
              <div className="price">{formatMoney(f.valor_final || f.valor_antt || f.valor_motorista || 0)}</div>
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

// Máscara de placa BR: antigo ABC-1234 ou Mercosul ABC1D23
const maskPlaca = v => {
  const s = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (s.length <= 3) return s;
  // Mercosul: 4ª posição é número, 5ª é letra
  if (s.length >= 5 && /\d/.test(s[3]) && /[A-Z]/.test(s[4])) {
    return s.slice(0, 3) + s.slice(3); // sem traço no Mercosul
  }
  // Antigo: ABC-1234
  return s.slice(0, 3) + "-" + s.slice(3);
};

function SolicitarFreteScreen({ onNavigate, screenData }) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const motoristaConvidadoId = screenData?.motoristaConvidadoId || null;
  const motoristaConvidadoNome = screenData?.motoristaConvidadoNome || null;
  const [form, setForm] = useState({
    tipoFrete: "interestadual", tipoCarga: "carga_seca", tipoVeiculo: "truck",
    pesoKg: "", comprimentoM: "", larguraM: "", alturaM: "",
    descricao: "", precisaMunck: false, precisaEmpilhadeira: false,
    dataColeta: "", horario: "",
    // Campos especiais dinâmicos
    tipoAnimal: "", qtdAnimais: "", tipoMaterial: "",
    itensMudanca: [{ nome: "", qtd: "" }],
  });
  const [addr, setAddr] = useState({
    origemCep:"", origemLogradouro:"", origemNumero:"", origemComplemento:"",
    origemBairro:"", origemCidade: screenData?.origemCidadeSugerida || "", origemUF: screenData?.origemUfSugerida || "",
    destCep:"", destLogradouro:"", destNumero:"", destComplemento:"",
    destBairro:"", destCidade:"", destUF:"",
  });
  const [calc, setCalc] = useState(null);
  const [valorEditavel, setValorEditavel] = useState("");
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

    // Peso é sempre obrigatório
    if (!form.pesoKg || Number(form.pesoKg) <= 0) return setError("Informe o peso total da carga (kg).");

    // Validação dos campos especiais obrigatórios
    const regras = regrasCarga(form.tipoCarga);
    if (regras.especial === "animal" && !form.tipoAnimal) return setError("Selecione o tipo de animal.");
    if (regras.especial === "material" && !form.tipoMaterial) return setError("Selecione o tipo de material.");
    if (regras.especial === "itens" && !form.itensMudanca.some(i => i.nome)) return setError("Adicione ao menos um item da mudança.");

    setError(""); setCalcLoading(true);
    const cargaBackend = CARGA_BACKEND_MAP[form.tipoCarga] || "geral";
    try {
      const data = await api("GET", `/api/fretes/calcular?origem=${encodeURIComponent(origem)}&destino=${encodeURIComponent(dest)}&peso=${(Number(form.pesoKg)||1000)/1000}&veiculo=${form.tipoVeiculo}&carga=${cargaBackend}`, null, token);
      const pisoMinimo = data.frete?.pisoMinimo || data.frete?.valorAntt || 0;
      setCalc({ distancia_km: data.rota?.distanciaKm, duracao: data.rota?.duracao, pisoMinimo });
      setValorEditavel(pisoMinimo.toFixed(2));
      setStep(3);
    } catch (e) { setError(e.message); }
    finally { setCalcLoading(false); }
  };

  const solicitar = async () => {
    if (!calc) return;
    const valorNum = parseFloat(String(valorEditavel).replace(",", "."));
    if (!valorNum || valorNum < calc.pisoMinimo) {
      return setError(`O valor não pode ser menor que o piso mínimo ANTT (${formatMoney(calc.pisoMinimo)})`);
    }
    setLoading(true); setError("");
    const cargaBackend = CARGA_BACKEND_MAP[form.tipoCarga] || "geral";
    const regras = regrasCarga(form.tipoCarga);

    // Monta os detalhes da carga conforme o tipo (só o que faz sentido)
    const detalhesCarga = {
      tipoCargaLabel: TIPOS_CARGA.find(c => c.id === form.tipoCarga)?.label || form.tipoCarga,
      descricao: form.descricao || null,
    };
    if (regras.dimensoes) {
      detalhesCarga.dimensoes = {
        comprimentoM: form.comprimentoM || null,
        larguraM: form.larguraM || null,
        alturaM: form.alturaM || null,
      };
    }
    if (regras.especial === "animal") {
      detalhesCarga.animal = { tipo: form.tipoAnimal || null, quantidade: form.qtdAnimais || null };
    }
    if (regras.especial === "material") {
      detalhesCarga.material = form.tipoMaterial || null;
    }
    if (regras.especial === "itens") {
      detalhesCarga.itens = form.itensMudanca.filter(i => i.nome);
    }

    try {
      await api("POST", "/api/fretes", {
        tipoCarga: cargaBackend, tipoVeiculo: form.tipoVeiculo,
        pesoTons: (Number(form.pesoKg)||1000)/1000,
        origemEndereco: composeAddr("origem", addr), origemCidade: addr.origemCidade, origemEstado: addr.origemUF,
        destEndereco: composeAddr("dest", addr), destCidade: addr.destCidade, destEstado: addr.destUF,
        valorProposto: valorNum,
        detalhesCarga,
        ...(motoristaConvidadoId ? { motoristaConvidadoId } : {}),
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
        {motoristaConvidadoId && (
          <div style={{ background: "var(--gold-light)", border: "1px solid var(--gold)", borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🚛</span>
            <span>Convidando <strong>{motoristaConvidadoNome || "motorista selecionado"}</strong> pra este frete — ele será notificado assim que você publicar.</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            {motoristaConvidadoId ? "✅ Convite enviado! O motorista tem até 2h pra aceitar." : "✅ Frete solicitado! Motoristas serão notificados."}
          </div>
        )}
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
              <div className="card-title">Peso e Detalhes da Carga</div>
              <div className="field"><label>Peso total (kg) *</label><input type="number" placeholder="Ex: 5000" value={form.pesoKg} onChange={e => set("pesoKg", e.target.value)} /></div>

              {/* Dimensões — só quando o tipo de carga pede */}
              {regrasCarga(form.tipoCarga).dimensoes && (
                <div className="grid-3">
                  <div className="field"><label>Comp. (m)</label><input type="number" placeholder="6" value={form.comprimentoM} onChange={e => set("comprimentoM", e.target.value)} /></div>
                  <div className="field"><label>Larg. (m)</label><input type="number" placeholder="2.4" value={form.larguraM} onChange={e => set("larguraM", e.target.value)} /></div>
                  <div className="field"><label>Alt. (m)</label><input type="number" placeholder="2.8" value={form.alturaM} onChange={e => set("alturaM", e.target.value)} /></div>
                </div>
              )}

              {/* Campo especial: CARGA VIVA → tipo de animal + quantidade */}
              {regrasCarga(form.tipoCarga).especial === "animal" && (
                <div className="grid-2">
                  <div className="field"><label>Tipo de animal *</label>
                    <select value={form.tipoAnimal} onChange={e => set("tipoAnimal", e.target.value)}>
                      <option value="">Selecione...</option>
                      {TIPOS_ANIMAL.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Qtd. de cabeças</label><input type="number" placeholder="Ex: 18" value={form.qtdAnimais} onChange={e => set("qtdAnimais", e.target.value)} /></div>
                </div>
              )}

              {/* Campo especial: CONSTRUÇÃO → tipo de material */}
              {regrasCarga(form.tipoCarga).especial === "material" && (
                <div className="field"><label>Tipo de material *</label>
                  <select value={form.tipoMaterial} onChange={e => set("tipoMaterial", e.target.value)}>
                    <option value="">Selecione...</option>
                    {TIPOS_MATERIAL.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}

              {/* Campo especial: MUDANÇA → lista de itens */}
              {regrasCarga(form.tipoCarga).especial === "itens" && (
                <div className="field">
                  <label>Itens da mudança</label>
                  {form.itensMudanca.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input style={{ flex: 2 }} placeholder="Ex: Geladeira" value={item.nome}
                        onChange={e => {
                          const arr = [...form.itensMudanca]; arr[idx].nome = e.target.value; set("itensMudanca", arr);
                        }} />
                      <input style={{ flex: 1 }} type="number" placeholder="Qtd" value={item.qtd}
                        onChange={e => {
                          const arr = [...form.itensMudanca]; arr[idx].qtd = e.target.value; set("itensMudanca", arr);
                        }} />
                      {form.itensMudanca.length > 1 && (
                        <button onClick={() => set("itensMudanca", form.itensMudanca.filter((_, i) => i !== idx))}
                          style={{ background: "#FDECEA", color: "#C0392B", border: "none", borderRadius: 8, padding: "0 12px", cursor: "pointer", fontWeight: 700 }}>×</button>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-secondary" style={{ width: "100%", marginTop: 4 }}
                    onClick={() => set("itensMudanca", [...form.itensMudanca, { nome: "", qtd: "" }])}>
                    + Adicionar item
                  </button>
                </div>
              )}

              <div className="field"><label>Descrição / observações</label><textarea rows={3} placeholder="Detalhes importantes da carga..." value={form.descricao} onChange={e => set("descricao", e.target.value)} style={{ resize: "none" }} /></div>
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
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Piso mínimo legal (Tabela ANTT)</div>
                <div className="price" style={{ fontSize: 28, color: "var(--text3)" }}>{formatMoney(calc.pisoMinimo)}</div>
              </div>
            </div>
            <HistoricoPrecoRota
              origemCidade={addr.origemCidade} origemUf={addr.origemUF}
              destCidade={addr.destCidade} destUf={addr.destUF}
              tipoVeiculo={form.tipoVeiculo} tipoCarga={CARGA_BACKEND_MAP[form.tipoCarga] || "geral"}
            />
            <div className="card">
              <div className="card-title">💰 Defina o valor do frete</div>
              <p style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
                Você pode oferecer o piso mínimo ou um valor maior para atrair motoristas mais rápido. O valor não pode ficar abaixo do piso legal.
              </p>
              <div className="field">
                <label>Valor do frete (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min={calc.pisoMinimo}
                  value={valorEditavel}
                  onChange={e => setValorEditavel(e.target.value)}
                />
              </div>
              {parseFloat(String(valorEditavel).replace(",", ".")) < calc.pisoMinimo && (
                <div className="alert alert-error" style={{ marginBottom: 0 }}>
                  ⚠️ Valor abaixo do piso mínimo ANTT ({formatMoney(calc.pisoMinimo)})
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={solicitar} disabled={loading || parseFloat(String(valorEditavel).replace(",", ".")) < calc.pisoMinimo} style={{ marginBottom: 10 }}>{loading ? "Publicando frete..." : "🚛 Publicar Frete"}</button>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>← Editar</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BUSCAR MOTORISTAS (Contratante — proposta inversa)
// ─────────────────────────────────────────────
function BuscarMotoristasScreen({ onNavigate }) {
  const { token } = useAuth();
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buscar = async () => {
    if (!cidade.trim() || !uf.trim()) return setError("Informe cidade e UF");
    setError(""); setLoading(true);
    try {
      const data = await api("GET", `/api/motoristas/disponiveis-por-rota?cidade=${encodeURIComponent(cidade.trim())}&uf=${encodeURIComponent(uf.trim())}`, null, token);
      setResultados(data);
    } catch (e) { setError(e.message); setResultados([]); }
    finally { setLoading(false); }
  };

  const formatDisponibilidade = (disponivelEm) => {
    if (!disponivelEm) return "Disponível agora";
    const d = new Date(disponivelEm);
    if (d.getTime() <= Date.now()) return "Disponível agora";
    return `Disponível a partir de ${d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
  };

  const convidar = (m) => {
    onNavigate("solicitar-frete", {
      motoristaConvidadoId: m.motorista_id,
      motoristaConvidadoNome: m.motorista_nome,
      origemCidadeSugerida: m.cidade_atual,
      origemUfSugerida: m.uf_atual,
    });
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("home-contratante")}>←</button><h1>Buscar Motoristas</h1></div>
      <div className="content">
        <div className="card">
          <div className="card-title">📍 Onde o motorista está?</div>
          <div className="grid-2">
            <div className="field"><label>Cidade</label><input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Curitiba" /></div>
            <div className="field"><label>UF</label><input value={uf} onChange={e => setUf(e.target.value.toUpperCase())} maxLength={2} placeholder="PR" /></div>
          </div>
          <button className="btn btn-primary" onClick={buscar} disabled={loading} style={{ marginTop: 4 }}>{loading ? "Buscando..." : "🔍 Buscar"}</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}

        {resultados !== null && (
          resultados.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🚛</div>
              Nenhum motorista disponível nessa cidade no momento
            </div>
          ) : resultados.map(m => (
            <div key={m.motorista_id} className="uber-card">
              <div className="uber-card-header">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{m.motorista_nome}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>🚛 {m.tipo_veiculo}{m.placa_veiculo ? ` · ${m.placa_veiculo}` : ""}</div>
                  {Number(m.avaliacao_media) > 0 && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>⭐ {Number(m.avaliacao_media).toFixed(1)}</div>}
                </div>
              </div>
              <div style={{ padding: "0 16px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="tag-chip">🕐 {formatDisponibilidade(m.disponivel_em)}</span>
                {m.cidade_destino && <span className="tag-chip">🎯 Quer ir até {m.cidade_destino}/{m.uf_destino}</span>}
              </div>
              <div className="uber-card-footer">
                <span style={{ fontSize: 12, color: "var(--text3)" }}>{m.cidade_atual}/{m.uf_atual}</span>
                <button className="btn btn-primary btn-sm" onClick={() => convidar(m)}>Convidar pra este frete</button>
              </div>
            </div>
          ))
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

  const totalGasto = fretes.filter(f => f.status === "entregue").reduce((a, f) => a + Number(f.valor_final || f.valor_antt || 0), 0);

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
                  <div className="price" style={{ fontSize: 18 }}>{formatMoney(f.valor_final || f.valor_antt || 0)}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>valor do frete</div>
                </div>
              </div>
              <div className="route" style={{ fontSize: 14 }}>{f.origem_cidade || f.origem_endereco || "—"} → {f.dest_cidade || f.dest_endereco || "—"}</div>
              <div className="meta" style={{ marginTop: 6 }}><span>📦 {f.tipo_carga}</span><span>📏 {f.distancia_km} km</span><span>⚖️ {f.peso_tons}t</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text3)" }}>
                <span>📅 {data}</span>
                <span>🚛 {f.motorista_nome || "Aguardando"}</span>
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
  const [contratoLoading, setContratoLoading] = useState(false);
  if (!frete) return <Loading />;

  const temContrato = ["aceito", "coletando", "em_rota", "entregue"].includes(frete.status);

  const cancelar = async () => {
    if (!confirm("Cancelar este frete?")) return;
    setLoading(true);
    try { await api("PATCH", `/api/fretes/${frete.id}/status`, { status: "cancelado" }, token); onNavigate("meus-fretes"); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const verContrato = async () => {
    setContratoLoading(true); setError("");
    try { await abrirArquivoAutenticado(`/api/fretes/${frete.id}/contrato`, token); }
    catch (e) { setError(e.message); }
    finally { setContratoLoading(false); }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("meus-fretes")}>←</button><h1>Detalhe do Frete</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <StatusBadge status={frete.status} />
          <div className="price">{formatMoney(frete.valor_final || frete.valor_antt || 0)}</div>
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
        {temContrato && (
          <button className="btn btn-secondary" style={{ marginBottom: 10 }} onClick={verContrato} disabled={contratoLoading}>
            {contratoLoading ? "Abrindo contrato..." : "📄 Ver Contrato"}
          </button>
        )}
        {frete.status === "entregue" && !frete.ja_avaliou && <button className="btn btn-outline" style={{ marginBottom: 10 }} onClick={() => onNavigate("avaliar", { frete })}>⭐ Avaliar Motorista</button>}
        {frete.status === "entregue" && frete.ja_avaliou && <div className="alert alert-success" style={{ marginBottom: 10 }}>✅ Você já avaliou este frete.</div>}
        {frete.status === "aguardando" && (
          <button className="btn btn-secondary" style={{ marginBottom: 10 }} onClick={() => onNavigate("propostas-recebidas", frete)}>📨 Ver Propostas Recebidas</button>
        )}
        {(frete.status === "aguardando" || (frete.status === "aceito" && frete.status_pagamento !== "approved")) && (
          <button className="btn btn-primary" style={{ marginBottom: 10, background: "linear-gradient(135deg, #00b37e, #00a572)" }} onClick={() => onNavigate("pagamento", { freteId: frete.id, valor: frete.valor_final || frete.valor_antt || 0 })}>
            📱 Pagar via Pix — {formatMoney(frete.valor_final || frete.valor_antt || 0)}
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
// PROPOSTAS RECEBIDAS (Contratante)
// ─────────────────────────────────────────────
function PropostasRecebidasScreen({ frete, onNavigate }) {
  const { token } = useAuth();
  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [contraproporId, setContraproporId] = useState(null);
  const [novoValor, setNovoValor] = useState("");
  const [acao, setAcao] = useState(null); // id da proposta com ação em andamento

  const carregar = () => {
    if (!frete?.id) return;
    setLoading(true);
    api("GET", `/api/fretes/${frete.id}/propostas`, null, token)
      .then(setPropostas)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [frete?.id]);

  if (!frete) return <Loading />;

  const aceitar = async (propostaId) => {
    setAcao(propostaId); setError(""); setMsg("");
    try {
      await api("PATCH", `/api/fretes/propostas/${propostaId}/aceitar`, null, token);
      setMsg("✅ Proposta aceita! O frete foi atribuído a este motorista.");
      setTimeout(() => onNavigate("detalhe-frete", { ...frete, status: "aceito" }), 1500);
    } catch (e) { setError(e.message); }
    finally { setAcao(null); }
  };

  const recusar = async (propostaId) => {
    setAcao(propostaId); setError(""); setMsg("");
    try {
      await api("PATCH", `/api/fretes/propostas/${propostaId}/recusar`, null, token);
      setMsg("Proposta recusada.");
      carregar();
    } catch (e) { setError(e.message); }
    finally { setAcao(null); }
  };

  const enviarContraproposta = async (propostaId) => {
    const valor = parseFloat(String(novoValor).replace(",", "."));
    if (!valor || valor <= 0) return setError("Informe um valor válido");
    setAcao(propostaId); setError(""); setMsg("");
    try {
      await api("PATCH", `/api/fretes/propostas/${propostaId}/contrapropor`, { novoValor: valor }, token);
      setMsg("✅ Contraproposta enviada! Aguardando resposta do motorista.");
      setContraproporId(null); setNovoValor("");
      carregar();
    } catch (e) { setError(e.message); }
    finally { setAcao(null); }
  };

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("detalhe-frete", frete)}>←</button>
        <h1>Propostas Recebidas</h1>
      </div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-success">{msg}</div>}

        <div className="card" style={{ marginBottom: 14 }}>
          <div className="info-row"><span className="info-label">Frete</span><span className="info-value" style={{ fontSize: 12 }}>{frete.origem_cidade} → {frete.dest_cidade}</span></div>
          <div className="info-row"><span className="info-label">Valor publicado</span><span className="info-value">{formatMoney(frete.valor_final || frete.valor_antt || 0)}</span></div>
        </div>

        {loading && <Loading />}

        {!loading && propostas.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "#555" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <p style={{ fontWeight: 600 }}>Nenhuma proposta recebida ainda</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Motoristas podem aceitar pelo valor publicado ou enviar uma proposta diferente</p>
          </div>
        )}

        {!loading && propostas.map(p => (
          <div key={p.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.motorista_nome}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{p.tipo_veiculo} · {p.placa_veiculo || "—"} · ⭐ {Number(p.avaliacao_media).toFixed(1)}</div>
              </div>
              <span className={`badge ${p.rodada === 2 ? "badge-pending" : "badge-active"}`}>
                {p.rodada === 2 ? "Aguardando motorista" : "Proposta do motorista"}
              </span>
            </div>

            <div className="divider" />

            <div className="info-row">
              <span className="info-label">Valor proposto pelo motorista</span>
              <span className="info-value price" style={{ fontSize: 18 }}>{formatMoney(p.valor_motorista)}</span>
            </div>
            {p.rodada === 2 && (
              <div className="info-row">
                <span className="info-label">Sua contraproposta</span>
                <span className="info-value" style={{ color: "var(--gold)" }}>{formatMoney(p.valor_contratante)}</span>
              </div>
            )}

            {p.rodada === 1 && contraproporId !== p.id && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => aceitar(p.id)} disabled={acao === p.id}>✅ Aceitar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setContraproporId(p.id)} disabled={acao === p.id}>💬 Contrapropor</button>
                <button className="btn btn-danger btn-sm" onClick={() => recusar(p.id)} disabled={acao === p.id}>✕ Recusar</button>
              </div>
            )}

            {p.rodada === 1 && contraproporId === p.id && (
              <div style={{ marginTop: 12 }}>
                <div className="field">
                  <label>Sua contraproposta (R$)</label>
                  <input type="number" step="0.01" placeholder={String(p.valor_motorista)} value={novoValor} onChange={e => setNovoValor(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => enviarContraproposta(p.id)} disabled={acao === p.id}>Enviar</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setContraproporId(null); setNovoValor(""); }}>Cancelar</button>
                </div>
              </div>
            )}

            {p.rodada === 2 && (
              <p style={{ fontSize: 12, color: "#666", marginTop: 10 }}>Aguardando o motorista aceitar ou recusar sua contraproposta de {formatMoney(p.valor_contratante)}.</p>
            )}
          </div>
        ))}
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
    { icon: "🔔", label: "Notificações", sub: "Push, sons e alertas", screen: "notificacoes" },
    { icon: "🔒", label: "Privacidade e segurança", sub: "Senha, dados pessoais", screen: "privacidade" },
    { icon: "📄", label: "Termos de uso", sub: "Política de privacidade", screen: "termos" },
  ];
  const accessLinks = [
    { icon: "📦", label: "Meus Fretes", sub: "Histórico e em andamento", screen: "meus-fretes" },
    { icon: "💰", label: "Painel Financeiro", sub: "Gastos, rotas e extrato completo", screen: "financas-contratante" },
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
  const [buscaCidade, setBuscaCidade] = useState("");
  const [buscaCidadeDebounced, setBuscaCidadeDebounced] = useState("");
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
  const [propostasPendentes, setPropostasPendentes] = useState(0);
  const [convitesPendentes, setConvitesPendentes] = useState(0);
  const [temDisponibilidadeAtiva, setTemDisponibilidadeAtiva] = useState(false);
  const [seguroValido, setSeguroValido] = useState(true);
  const posicaoRef = useRef(null);

  // Verifica se há contrapropostas do contratante aguardando resposta do motorista
  useEffect(() => {
    api("GET", "/api/fretes/propostas/minhas", null, token)
      .then(lista => setPropostasPendentes(lista.filter(p => p.status === "pendente" && p.rodada === 2).length))
      .catch(() => {});
  }, [token]);

  // Verifica se há convites diretos de contratantes aguardando resposta
  useEffect(() => {
    api("GET", "/api/fretes/convidados", null, token)
      .then(lista => setConvitesPendentes(lista.length))
      .catch(() => {});
  }, [token]);

  // Verifica se já existe um anúncio de disponibilidade ativo (pra decidir se mostra o convite pra publicar)
  useEffect(() => {
    api("GET", "/api/motoristas/disponibilidade", null, token)
      .then(() => setTemDisponibilidadeAtiva(true))
      .catch(() => setTemDisponibilidadeAtiva(false));
  }, [token]);

  // Seguro é obrigatório pra aceitar fretes — avisa na Home se estiver faltando/vencido
  useEffect(() => {
    api("GET", "/api/motoristas/seguro", null, token)
      .then(s => setSeguroValido(!!s.valido))
      .catch(() => {});
  }, [token]);

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

  // Debounce da busca por cidade antes de consultar o backend
  useEffect(() => {
    const t = setTimeout(() => setBuscaCidadeDebounced(buscaCidade.trim()), 400);
    return () => clearTimeout(t);
  }, [buscaCidade]);

  // Carrega fretes disponíveis quando fica online ou quando a busca por cidade muda
  useEffect(() => {
    if (!online) { setDisponiveis([]); setLoading(false); return; }
    setLoading(true);
    const qs = buscaCidadeDebounced ? `?busca_origem_cidade=${encodeURIComponent(buscaCidadeDebounced)}` : "";
    api("GET", `/api/fretes/disponiveis${qs}`, null, token)
      .then(setDisponiveis).catch(() => setDisponiveis([])).finally(() => setLoading(false));
  }, [online, buscaCidadeDebounced]);

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
        {!seguroValido && (
          <div className="card" style={{ borderColor: "var(--red)", borderWidth: 2, cursor: "pointer", marginBottom: 14 }} onClick={() => onNavigate("seguro-motorista")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🛡️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Registre seu seguro pra poder aceitar fretes</div>
                <div style={{ fontSize: 12, color: "#666" }}>Toque para regularizar</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          </div>
        )}
        {propostasPendentes > 0 && (
          <div className="card" style={{ borderColor: "var(--gold)", borderWidth: 2, cursor: "pointer", marginBottom: 14 }} onClick={() => onNavigate("minhas-propostas")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>📨</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Você tem {propostasPendentes} contraproposta{propostasPendentes > 1 ? "s" : ""} para responder</div>
                <div style={{ fontSize: 12, color: "#666" }}>Toque para ver e decidir</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          </div>
        )}
        {convitesPendentes > 0 && (
          <div className="card" style={{ borderColor: "var(--gold)", borderWidth: 2, cursor: "pointer", marginBottom: 14 }} onClick={() => onNavigate("convites-motorista")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🎯</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Você tem {convitesPendentes} convite{convitesPendentes > 1 ? "s" : ""} direto{convitesPendentes > 1 ? "s" : ""} de contratante{convitesPendentes > 1 ? "s" : ""}</div>
                <div style={{ fontSize: 12, color: "#666" }}>Toque para ver e decidir</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          </div>
        )}
        {fretesAtivos.length === 0 && !temDisponibilidadeAtiva && (
          <div className="card" style={{ cursor: "pointer", marginBottom: 14 }} onClick={() => onNavigate("disponibilidade-motorista")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>📢</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Sem frete agora? Anuncie sua disponibilidade</div>
                <div style={{ fontSize: 12, color: "#666" }}>Contratantes da sua região podem te convidar direto</div>
              </div>
              <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
            </div>
          </div>
        )}
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
        <div style={{ marginBottom: 12, position: "relative" }}>
          <input
            type="text"
            value={buscaCidade}
            onChange={e => setBuscaCidade(e.target.value)}
            placeholder="🔍 Buscar por cidade de origem"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "Inter, sans-serif" }}
          />
        </div>
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
            <div key={f.id} className="uber-card" onClick={() => onNavigate("aceitar-frete", f)} style={f.prioridade_rota ? { borderColor: "var(--gold)" } : undefined}>
              <div className="uber-card-header">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="tag-chip">{cargaObj?.icon || "📦"} {cargaObj?.label || f.tipo_carga}</span>
                    <span className="tag-chip">📏 {f.distancia_km} km</span>
                    {f.prioridade_rota && <span className="tag-chip">📍 Perto da sua última entrega</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>⚖️ {f.peso_tons}t · 🚛 {f.tipo_veiculo}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="price">{formatMoney(f.valor_motorista || 0)}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>motorista</div>
                  {f.valorLiquidoEstimado != null && (
                    <div style={{ fontSize: 11, color: f.valorLiquidoEstimado >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700, marginTop: 2 }}>
                      ≈ {formatMoney(f.valorLiquidoEstimado)} líquido
                    </div>
                  )}
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
// DISPONIBILIDADE (Motorista — proposta inversa)
// ─────────────────────────────────────────────
function DisponibilidadeScreen({ onNavigate }) {
  const { token } = useAuth();
  const [anuncio, setAnuncio] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ cidadeAtual: "", ufAtual: "", cidadeDestino: "", ufDestino: "", modo: "agora", horas: "" });

  const carregar = () => {
    setLoading(true);
    api("GET", "/api/motoristas/disponibilidade", null, token)
      .then(d => { setAnuncio(d); setEditando(false); })
      .catch(() => setAnuncio(false))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const iniciarEdicao = () => {
    if (anuncio) {
      setForm({
        cidadeAtual: anuncio.cidade_atual || "", ufAtual: anuncio.uf_atual || "",
        cidadeDestino: anuncio.cidade_destino || "", ufDestino: anuncio.uf_destino || "",
        modo: "agora", horas: "",
      });
    }
    setEditando(true);
  };

  const publicar = async () => {
    if (!form.cidadeAtual.trim() || !form.ufAtual.trim()) return setError("Informe cidade e UF atual");
    if (form.modo === "horas" && (form.horas === "" || Number(form.horas) < 0)) return setError("Informe em quantas horas você fica disponível");
    setError(""); setSalvando(true);
    try {
      await api("POST", "/api/motoristas/disponibilidade", {
        cidadeAtual: form.cidadeAtual.trim(), ufAtual: form.ufAtual.trim().toUpperCase(),
        cidadeDestino: form.cidadeDestino.trim() || undefined, ufDestino: form.ufDestino.trim() || undefined,
        ...(form.modo === "horas" ? { disponivelEmHoras: Number(form.horas) } : {}),
      }, token);
      carregar();
    } catch (e) { setError(e.message); }
    finally { setSalvando(false); }
  };

  const cancelar = async () => {
    setCancelando(true); setError("");
    try {
      await api("DELETE", "/api/motoristas/disponibilidade", null, token);
      setAnuncio(false);
    } catch (e) { setError(e.message); }
    finally { setCancelando(false); }
  };

  const formatDisponibilidade = (disponivelEm) => {
    if (!disponivelEm) return "Disponível agora";
    const d = new Date(disponivelEm);
    if (d.getTime() <= Date.now()) return "Disponível agora";
    return `Disponível a partir de ${d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
  };

  const mostrarForm = !anuncio || editando;

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Disponibilidade</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Loading /> : (
          <>
            {anuncio && !editando && (
              <div className="card" style={{ borderColor: "var(--gold)" }}>
                <div className="card-title">📢 Seu anúncio está ativo</div>
                <div className="info-row"><span className="info-label">Você está em</span><span className="info-value">{anuncio.cidade_atual}/{anuncio.uf_atual}</span></div>
                {anuncio.cidade_destino && <div className="info-row"><span className="info-label">Quer ir até</span><span className="info-value">{anuncio.cidade_destino}/{anuncio.uf_destino}</span></div>}
                <div className="info-row"><span className="info-label">Disponibilidade</span><span className="info-value">{formatDisponibilidade(anuncio.disponivel_em)}</span></div>
                <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>
                  Contratantes dessa cidade podem te encontrar e te convidar direto pra um frete. Seu anúncio expira sozinho em 24h.
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn btn-secondary" onClick={iniciarEdicao}>✏️ Editar</button>
                  <button className="btn btn-danger" onClick={cancelar} disabled={cancelando}>{cancelando ? "Cancelando..." : "✕ Cancelar anúncio"}</button>
                </div>
              </div>
            )}

            {mostrarForm && (
              <div className="card">
                <div className="card-title">📍 Onde você está?</div>
                <div className="grid-2">
                  <div className="field"><label>Cidade atual</label><input value={form.cidadeAtual} onChange={e => setForm(f => ({ ...f, cidadeAtual: e.target.value }))} placeholder="Curitiba" /></div>
                  <div className="field"><label>UF</label><input value={form.ufAtual} onChange={e => setForm(f => ({ ...f, ufAtual: e.target.value.toUpperCase() }))} maxLength={2} placeholder="PR" /></div>
                </div>
                <div className="card-title" style={{ marginTop: 10 }}>🎯 Pra onde você quer ir? (opcional)</div>
                <div className="grid-2">
                  <div className="field"><label>Cidade destino</label><input value={form.cidadeDestino} onChange={e => setForm(f => ({ ...f, cidadeDestino: e.target.value }))} placeholder="São Paulo" /></div>
                  <div className="field"><label>UF</label><input value={form.ufDestino} onChange={e => setForm(f => ({ ...f, ufDestino: e.target.value.toUpperCase() }))} maxLength={2} placeholder="SP" /></div>
                </div>
                <div className="card-title" style={{ marginTop: 10 }}>⏱️ Quando você fica disponível?</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {[["agora", "Agora"], ["horas", "Em X horas"]].map(([id, label]) => (
                    <button key={id} onClick={() => setForm(f => ({ ...f, modo: id }))}
                      style={{ padding: "8px 14px", borderRadius: 20, border: "1px solid", borderColor: form.modo === id ? "var(--gold)" : "var(--border)", background: form.modo === id ? "var(--gold)" : "var(--surface)", color: form.modo === id ? "#fff" : "var(--text3)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {label}
                    </button>
                  ))}
                </div>
                {form.modo === "horas" && (
                  <div className="field"><label>Em quantas horas</label><input type="number" min="0" step="0.5" value={form.horas} onChange={e => setForm(f => ({ ...f, horas: e.target.value }))} placeholder="Ex: 3" /></div>
                )}
                <button className="btn btn-primary" onClick={publicar} disabled={salvando} style={{ marginTop: 4 }}>{salvando ? "Publicando..." : "📢 Publicar Disponibilidade"}</button>
                {editando && <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => setEditando(false)}>Cancelar edição</button>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SEGURO DE FRETE (Motorista — obrigatório pra aceitar fretes)
// ─────────────────────────────────────────────
function SeguroScreen({ onNavigate }) {
  const { token } = useAuth();
  const [seguro, setSeguro] = useState(null);
  const [seguradoras, setSeguradoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ modo: "parceira", seguradoraId: "", avulsoNome: "", avulsoApolice: "", validade: "" });

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api("GET", "/api/motoristas/seguro", null, token),
      api("GET", "/api/seguradoras", null, token).catch(() => []),
    ]).then(([s, segs]) => {
      setSeguro(s);
      setSeguradoras(segs);
      setEditando(false);
      if (!segs.length) setForm(f => ({ ...f, modo: "avulso" }));
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const iniciarEdicao = () => {
    if (seguro) {
      setForm({
        modo: seguro.seguro_seguradora_id ? "parceira" : "avulso",
        seguradoraId: seguro.seguro_seguradora_id || "",
        avulsoNome: seguro.seguro_avulso_nome || "",
        avulsoApolice: seguro.seguro_avulso_apolice || "",
        validade: seguro.seguro_validade ? String(seguro.seguro_validade).slice(0, 10) : "",
      });
    }
    setEditando(true);
  };

  const salvar = async () => {
    if (!form.validade) return setError("Informe a validade do seguro");
    if (form.modo === "parceira" && !form.seguradoraId) return setError("Escolha uma seguradora parceira");
    if (form.modo === "avulso" && (!form.avulsoNome.trim() || !form.avulsoApolice.trim())) return setError("Informe nome e número da apólice");
    setError(""); setSalvando(true);
    try {
      await api("PUT", "/api/motoristas/seguro", {
        ...(form.modo === "parceira"
          ? { seguradoraId: form.seguradoraId }
          : { seguroAvulsoNome: form.avulsoNome.trim(), seguroAvulsoApolice: form.avulsoApolice.trim() }),
        seguroValidade: form.validade,
      }, token);
      carregar();
    } catch (e) { setError(e.message); }
    finally { setSalvando(false); }
  };

  const mostrarForm = !seguro?.valido || editando;
  const semParceiras = seguradoras.length === 0;

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Seguro</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Loading /> : (
          <>
            {seguro?.valido && !editando && (
              <div className="card" style={{ borderColor: "rgba(45,122,58,0.3)" }}>
                <div className="card-title">✅ Seguro válido</div>
                <div className="info-row"><span className="info-label">Seguradora</span><span className="info-value">{seguro.seguro_seguradora_id ? seguro.seguradora_nome : seguro.seguro_avulso_nome}</span></div>
                {!seguro.seguro_seguradora_id && (
                  <div className="info-row"><span className="info-label">Apólice</span><span className="info-value">{seguro.seguro_avulso_apolice}</span></div>
                )}
                <div className="info-row"><span className="info-label">Validade</span><span className="info-value">{String(seguro.seguro_validade).slice(0, 10).split("-").reverse().join("/")}</span></div>
                <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={iniciarEdicao}>✏️ Atualizar</button>
              </div>
            )}

            {!seguro?.valido && !editando && (
              <div className="alert alert-error" style={{ marginBottom: 14 }}>
                ⚠️ {seguro?.seguro_validade ? "Seu seguro venceu." : "Você ainda não tem um seguro registrado."} Você não pode aceitar fretes até registrar um seguro válido.
              </div>
            )}

            {mostrarForm && (
              <div className="card">
                <div className="card-title">Registrar seguro</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {[["parceira", "Seguradora parceira"], ["avulso", "Seguro avulso"]].map(([id, label]) => (
                    <button key={id} onClick={() => setForm(f => ({ ...f, modo: id }))}
                      style={{ padding: "8px 14px", borderRadius: 20, border: "1px solid", borderColor: form.modo === id ? "var(--gold)" : "var(--border)", background: form.modo === id ? "var(--gold)" : "var(--surface)", color: form.modo === id ? "#fff" : "var(--text3)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {label}
                    </button>
                  ))}
                </div>

                {form.modo === "parceira" && (
                  semParceiras ? (
                    <div className="alert alert-info" style={{ marginBottom: 14 }}>
                      Nenhuma seguradora parceira cadastrada ainda — use seguro avulso por enquanto.
                    </div>
                  ) : (
                    <div className="field">
                      <label>Seguradora</label>
                      <select value={form.seguradoraId} onChange={e => setForm(f => ({ ...f, seguradoraId: e.target.value }))}>
                        <option value="">Selecione...</option>
                        {seguradoras.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                    </div>
                  )
                )}

                {form.modo === "avulso" && (
                  <>
                    <div className="field"><label>Nome da seguradora</label><input value={form.avulsoNome} onChange={e => setForm(f => ({ ...f, avulsoNome: e.target.value }))} placeholder="Ex: Porto Seguro" /></div>
                    <div className="field"><label>Número da apólice</label><input value={form.avulsoApolice} onChange={e => setForm(f => ({ ...f, avulsoApolice: e.target.value }))} placeholder="Ex: 123456789" /></div>
                  </>
                )}

                {!(form.modo === "parceira" && semParceiras) && (
                  <div className="field"><label>Validade</label><input type="date" value={form.validade} onChange={e => setForm(f => ({ ...f, validade: e.target.value }))} /></div>
                )}

                <button className="btn btn-primary" onClick={salvar} disabled={salvando || (form.modo === "parceira" && semParceiras)} style={{ marginTop: 4 }}>
                  {salvando ? "Salvando..." : "Registrar Seguro"}
                </button>
                {editando && <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => setEditando(false)}>Cancelar edição</button>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONVITES (Motorista — proposta inversa)
// ─────────────────────────────────────────────
function ConvitesScreen({ onNavigate }) {
  const { token } = useAuth();
  const [convites, setConvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("GET", "/api/fretes/convidados", null, token)
      .then(setConvites).catch(() => setConvites([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Convites</h1></div>
      <div className="content">
        {loading ? <Loading /> : convites.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
            <p style={{ fontWeight: 600 }}>Nenhum convite no momento</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Publique sua disponibilidade pra contratantes te encontrarem</p>
          </div>
        ) : convites.map(f => {
          const cargaObj = TIPOS_CARGA.find(c => c.id === f.tipo_carga);
          const expiraTexto = f.negociando_expira_em
            ? `expira ${new Date(f.negociando_expira_em).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
            : "";
          return (
            <div key={f.id} className="uber-card" onClick={() => onNavigate("aceitar-frete", f)} style={{ borderColor: "var(--gold)" }}>
              <div className="uber-card-header">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="tag-chip">🎯 Convite de {f.contratante_nome}</span>
                    <span className="tag-chip">{cargaObj?.icon || "📦"} {cargaObj?.label || f.tipo_carga}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{f.origem_cidade || "—"} → {f.dest_cidade || "—"}</div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>📏 {f.distancia_km} km · ⚖️ {f.peso_tons}t</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="price">{formatMoney(f.valor_motorista || 0)}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>motorista</div>
                </div>
              </div>
              <div className="uber-card-footer">
                <span style={{ fontSize: 12, color: "#555" }}>⏳ {expiraTexto}</span>
                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); onNavigate("aceitar-frete", f); }}>Ver e decidir</button>
              </div>
            </div>
          );
        })}
      </div>
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
  const [propondoValor, setPropondoValor] = useState(false);
  const [valorProposta, setValorProposta] = useState("");
  const [propostaEnviada, setPropostaEnviada] = useState(false);
  if (!frete) return <Loading />;
  const cargaObj = TIPOS_CARGA.find(c => c.id === frete.tipo_carga);

  const capturarGPS = async () => {
    let lat = null, lng = null;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {} // GPS indisponível
    }
    return { lat, lng };
  };

  const aceitar = async () => {
    setLoading(true); setError("");
    try {
      const { lat, lng } = await capturarGPS();
      await api("PATCH", `/api/fretes/${frete.id}/aceitar`, { lat, lng }, token);
      onNavigate("home-motorista");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const enviarProposta = async () => {
    const valor = parseFloat(String(valorProposta).replace(",", "."));
    if (!valor || valor <= 0) return setError("Informe um valor válido");
    setLoading(true); setError("");
    try {
      const { lat, lng } = await capturarGPS();
      await api("POST", `/api/fretes/${frete.id}/propor`, { valorProposto: valor, lat, lng }, token);
      setPropostaEnviada(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (propostaEnviada) {
    return (
      <div className="screen">
        <div className="header"><button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button><h1>Proposta Enviada</h1></div>
        <div className="content">
          <div className="alert alert-success">✅ Sua proposta de {formatMoney(parseFloat(String(valorProposta).replace(",", ".")))} foi enviada ao contratante.</div>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
            Acompanhe a resposta em <strong>Minhas Propostas</strong>. O contratante pode aceitar, recusar ou enviar uma contraproposta.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate("minhas-propostas")}>Ver Minhas Propostas</button>
          <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => onNavigate("home-motorista")}>Voltar ao início</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button><h1>Aceitar Frete</h1></div>
      <div className="content">
        {error && (
          <div className="alert alert-error">
            {error}
            {error.includes("seguro de frete registrado") && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => onNavigate("seguro-motorista")}>🛡️ Registrar Seguro</button>
            )}
          </div>
        )}
        <div style={{ textAlign: "center", padding: "16px 0 24px" }}>
          <div className="price" style={{ fontSize: 42 }}>{formatMoney(frete.valor_motorista || 0)}</div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>Seu valor como motorista (valor publicado)</div>
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

        <HistoricoPrecoRota
          origemCidade={frete.origem_cidade} origemUf={frete.origem_estado}
          destCidade={frete.dest_cidade} destUf={frete.dest_estado}
          tipoVeiculo={frete.tipo_veiculo} tipoCarga={frete.tipo_carga}
          mostrarPiso={false}
        />

        {(() => {
          const d = frete.detalhes_carga;
          if (!d || (typeof d === "object" && Object.keys(d).length === 0)) return null;
          const det = typeof d === "string" ? (() => { try { return JSON.parse(d); } catch { return {}; } })() : d;
          const temDim = det.dimensoes && (det.dimensoes.comprimentoM || det.dimensoes.larguraM || det.dimensoes.alturaM);
          const temAlgo = det.descricao || temDim || det.animal || det.material || (det.itens && det.itens.length);
          if (!temAlgo) return null;
          return (
            <div className="card">
              <div className="card-title">📋 Detalhes da Carga</div>
              {det.animal && (
                <div className="info-row"><span className="info-label">🐄 Animal</span><span className="info-value">{det.animal.tipo}{det.animal.quantidade ? ` · ${det.animal.quantidade} cabeças` : ""}</span></div>
              )}
              {det.material && (
                <div className="info-row"><span className="info-label">🧱 Material</span><span className="info-value">{det.material}</span></div>
              )}
              {temDim && (
                <div className="info-row"><span className="info-label">📏 Dimensões</span><span className="info-value">{[det.dimensoes.comprimentoM && `${det.dimensoes.comprimentoM}m C`, det.dimensoes.larguraM && `${det.dimensoes.larguraM}m L`, det.dimensoes.alturaM && `${det.dimensoes.alturaM}m A`].filter(Boolean).join(" × ")}</span></div>
              )}
              {det.itens && det.itens.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div className="info-label" style={{ marginBottom: 6 }}>📦 Itens da mudança</div>
                  {det.itens.map((it, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--text2)", padding: "2px 0" }}>• {it.nome}{it.qtd ? ` (${it.qtd})` : ""}</div>
                  ))}
                </div>
              )}
              {det.descricao && (
                <div style={{ marginTop: 8 }}>
                  <div className="info-label" style={{ marginBottom: 4 }}>Observações</div>
                  <div style={{ fontSize: 13, color: "var(--text2)" }}>{det.descricao}</div>
                </div>
              )}
            </div>
          );
        })()}

        {frete.custosEstimados && (
          <div className="card">
            <div className="card-title">💰 Estimativa antes de decidir</div>
            <div className="info-row"><span className="info-label">⛽ Combustível estimado</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(frete.custosEstimados.combustivel)}</span></div>
            <div className="info-row"><span className="info-label">🔧 Desgaste estimado</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(frete.custosEstimados.desgaste)}</span></div>
            <div className="divider" />
            <div className="info-row">
              <span className="info-label" style={{ fontWeight: 700 }}>Líquido estimado (valor publicado)</span>
              <span className="info-value" style={{ color: frete.valorLiquidoEstimado >= 0 ? "var(--green)" : "var(--red)", fontWeight: 800, fontSize: 16 }}>
                {formatMoney(frete.valorLiquidoEstimado)}
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
              Combustível e desgaste calculados com base nos coeficientes oficiais da ANTT para o veículo do seu perfil. Pedágio, alimentação e pernoite não estão incluídos aqui — você lança o valor real durante a viagem.
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {frete.precisa_munck && <span className="tag-chip">🏗️ Precisa Munck</span>}
          {frete.precisa_empilhadeira && <span className="tag-chip">🏭 Empilhadeira no pátio</span>}
        </div>

        {!propondoValor && (
          <>
            <button className="btn btn-primary" onClick={aceitar} disabled={loading} style={{ marginBottom: 10 }}>{loading ? "Aceitando..." : "✅ Aceitar pelo valor publicado"}</button>
            <button className="btn btn-secondary" onClick={() => setPropondoValor(true)} style={{ marginBottom: 10 }}>💬 Propor outro valor</button>
            <button className="btn btn-secondary" onClick={() => onNavigate("home-motorista")}>Voltar</button>
          </>
        )}

        {propondoValor && (
          <div className="card">
            <div className="card-title">Sua proposta de valor</div>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
              O valor publicado para você é {formatMoney(frete.valor_motorista || 0)}. Proponha o valor que você gostaria de receber (sujeito ao piso mínimo ANTT).
            </p>
            <div className="field">
              <label>Valor proposto (o que você vai receber, R$)</label>
              <input type="number" step="0.01" placeholder={String(frete.valor_motorista || "")} value={valorProposta} onChange={e => setValorProposta(e.target.value)} />
            </div>
            {frete.totalCustosEstimados != null && valorProposta && !isNaN(parseFloat(String(valorProposta).replace(",", "."))) && (() => {
              const seuTake = parseFloat(String(valorProposta).replace(",", "."));
              const liquidoProposta = seuTake - frete.totalCustosEstimados;
              return (
                <div className="alert alert-info" style={{ fontSize: 12 }}>
                  Se aceito: você recebe {formatMoney(seuTake)} − {formatMoney(frete.totalCustosEstimados)} (combustível+desgaste) = <strong>{formatMoney(liquidoProposta)} líquido estimado</strong>
                </div>
              );
            })()}
            <button className="btn btn-primary" onClick={enviarProposta} disabled={loading} style={{ marginBottom: 10 }}>{loading ? "Enviando..." : "📨 Enviar Proposta"}</button>
            <button className="btn btn-secondary" onClick={() => setPropondoValor(false)}>Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MINHAS PROPOSTAS (Motorista)
// ─────────────────────────────────────────────
function MinhasPropostasScreen({ onNavigate }) {
  const { token } = useAuth();
  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [acao, setAcao] = useState(null);

  const carregar = () => {
    setLoading(true);
    api("GET", "/api/fretes/propostas/minhas", null, token)
      .then(setPropostas)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const aceitar = async (propostaId) => {
    setAcao(propostaId); setError(""); setMsg("");
    try {
      await api("PATCH", `/api/fretes/propostas/${propostaId}/aceitar`, null, token);
      setMsg("✅ Contraproposta aceita! O frete foi atribuído a você.");
      setTimeout(() => onNavigate("home-motorista"), 1500);
    } catch (e) { setError(e.message); }
    finally { setAcao(null); }
  };

  const recusar = async (propostaId) => {
    setAcao(propostaId); setError(""); setMsg("");
    try {
      await api("PATCH", `/api/fretes/propostas/${propostaId}/recusar`, null, token);
      setMsg("Contraproposta recusada.");
      carregar();
    } catch (e) { setError(e.message); }
    finally { setAcao(null); }
  };

  const StatusProposta = ({ p }) => {
    const map = {
      pendente: p.rodada === 2 ? ["badge-pending", "Contraproposta recebida"] : ["badge-active", "Aguardando contratante"],
      aceita:   ["badge-done", "Aceita"],
      recusada: ["badge-cancel", "Recusada"],
      expirada: ["", "Encerrada"],
    };
    const [cls, label] = map[p.status] || ["", p.status];
    return <span className={`badge ${cls}`} style={!cls ? { background: "#222", color: "#666", border: "1px solid #333" } : {}}>{label}</span>;
  };

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate("home-motorista")}>←</button>
        <h1>Minhas Propostas</h1>
      </div>
      <div className="content">
        {error && (
          <div className="alert alert-error">
            {error}
            {error.includes("seguro de frete registrado") && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => onNavigate("seguro-motorista")}>🛡️ Registrar Seguro</button>
            )}
          </div>
        )}
        {msg && <div className="alert alert-success">{msg}</div>}

        {loading && <Loading />}

        {!loading && propostas.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "#555" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📨</div>
            <p style={{ fontWeight: 600 }}>Nenhuma proposta enviada ainda</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Proponha valores nos fretes disponíveis para negociar com contratantes</p>
          </div>
        )}

        {!loading && propostas.map(p => (
          <div key={p.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.origem_cidade} → {p.dest_cidade}</div>
                <div style={{ fontSize: 12, color: "#666" }}>Contratante: {p.contratante_nome}</div>
              </div>
              <StatusProposta p={p} />
            </div>

            <div className="divider" />

            <div className="info-row">
              <span className="info-label">Sua proposta</span>
              <span className="info-value">{formatMoney(p.valor_motorista)}</span>
            </div>
            {p.valor_contratante && (
              <div className="info-row">
                <span className="info-label">Contraproposta do contratante</span>
                <span className="info-value price" style={{ fontSize: 18 }}>{formatMoney(p.valor_contratante)}</span>
              </div>
            )}

            {p.status === "pendente" && p.rodada === 2 && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => aceitar(p.id)} disabled={acao === p.id}>✅ Aceitar</button>
                <button className="btn btn-danger btn-sm" onClick={() => recusar(p.id)} disabled={acao === p.id}>✕ Recusar</button>
              </div>
            )}

            {p.status === "pendente" && p.rodada === 1 && (
              <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>Aguardando resposta do contratante...</p>
            )}
          </div>
        ))}
      </div>
      <BottomNavMotorista active="inicio" onNavigate={onNavigate} />
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
  const [contratoLoadingId, setContratoLoadingId] = useState(null);
  const [contratoError, setContratoError] = useState("");

  useEffect(() => {
    api("GET", "/api/fretes", null, token).then(setFretes).catch(() => setFretes([])).finally(() => setLoading(false));
  }, []);

  const verContrato = async (freteId) => {
    setContratoLoadingId(freteId); setContratoError("");
    try { await abrirArquivoAutenticado(`/api/fretes/${freteId}/contrato`, token); }
    catch (e) { setContratoError(e.message); }
    finally { setContratoLoadingId(null); }
  };

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
        {contratoError && <div className="alert alert-error">{contratoError}</div>}
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
              {f.status === "entregue" && (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => verContrato(f.id)} disabled={contratoLoadingId === f.id}>
                  {contratoLoadingId === f.id ? "Abrindo contrato..." : "📄 Ver Contrato"}
                </button>
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
  const [extrato, setExtrato] = useState(null);
  const [loadingExtrato, setLoadingExtrato] = useState(true);
  const [showAddDespesa, setShowAddDespesa] = useState(false);
  const [novaDespesa, setNovaDespesa] = useState({ tipo: "pedagio", descricao: "", valor: "" });
  const [salvandoDespesa, setSalvandoDespesa] = useState(false);
  const [contratoLoading, setContratoLoading] = useState(false);

  const verContrato = async () => {
    setContratoLoading(true); setError("");
    try { await abrirArquivoAutenticado(`/api/fretes/${frete.id}/contrato`, token); }
    catch (e) { setError(e.message); }
    finally { setContratoLoading(false); }
  };

  const tiposDespesaFrete = [
    { id: "pedagio", icon: "🛣️", label: "Pedágio" },
    { id: "alimentacao", icon: "🍽️", label: "Alimentação" },
    { id: "hospedagem", icon: "🏨", label: "Pernoite" },
    { id: "outro", icon: "📦", label: "Outro" },
  ];

  const carregarExtrato = () => {
    if (!frete?.id) return;
    setLoadingExtrato(true);
    api("GET", `/api/fretes/${frete.id}/extrato`, null, token)
      .then(setExtrato)
      .catch(() => setExtrato(null))
      .finally(() => setLoadingExtrato(false));
  };

  useEffect(() => { carregarExtrato(); }, [frete?.id]);

  const adicionarDespesa = async () => {
    if (!novaDespesa.valor) return;
    setSalvandoDespesa(true);
    try {
      await api("POST", "/api/motoristas/despesas", {
        ...novaDespesa,
        data: new Date().toISOString().slice(0, 10),
        freteId: frete.id,
      }, token);
      setNovaDespesa({ tipo: "pedagio", descricao: "", valor: "" });
      setShowAddDespesa(false);
      carregarExtrato();
    } catch (e) { setError(e.message); }
    finally { setSalvandoDespesa(false); }
  };

  const removerDespesa = async (id) => {
    try {
      await api("DELETE", `/api/motoristas/despesas/${id}`, null, token);
      carregarExtrato();
    } catch (e) { setError(e.message); }
  };

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
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={verContrato} disabled={contratoLoading}>
            {contratoLoading ? "Abrindo contrato..." : "📄 Ver Contrato"}
          </button>
        </div>

        <div className="card">
          <div className="card-title">💰 Extrato Financeiro do Frete</div>
          {loadingExtrato && <Loading />}
          {!loadingExtrato && !extrato && (
            <p style={{ fontSize: 13, color: "#666" }}>Não foi possível carregar o extrato agora.</p>
          )}
          {!loadingExtrato && extrato && (
            <>
              <div className="info-row"><span className="info-label">Valor a receber</span><span className="info-value" style={{ color: "var(--green)", fontWeight: 800 }}>{formatMoney(extrato.valorReceber)}</span></div>
              <div className="divider" />
              <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Custos estimados (dados oficiais ANTT)</div>
              <div className="info-row"><span className="info-label">⛽ Combustível</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos.combustivel)}</span></div>
              <div className="info-row"><span className="info-label">🔧 Desgaste do veículo</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos.desgaste)}</span></div>

              {extrato.despesasManuais.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "10px 0 6px" }}>Despesas lançadas por você</div>
                  {extrato.despesasManuais.map(d => {
                    const tipoObj = tiposDespesaFrete.find(t => t.id === d.tipo) || { icon: "📦", label: d.tipo };
                    return (
                      <div key={d.id} className="info-row">
                        <span className="info-label">{tipoObj.icon} {tipoObj.label}{d.descricao ? ` — ${d.descricao}` : ""}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(d.valor)}</span>
                          <span onClick={() => removerDespesa(d.id)} style={{ cursor: "pointer", color: "var(--text3)", fontSize: 13 }}>✕</span>
                        </span>
                      </div>
                    );
                  })}
                </>
              )}

              <div className="divider" />
              <div className="info-row"><span className="info-label">Total de custos</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.totalCustos)}</span></div>
              <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Valor líquido estimado</span><span className="info-value" style={{ color: extrato.valorLiquido >= 0 ? "var(--green)" : "var(--red)", fontWeight: 800, fontSize: 16 }}>{formatMoney(extrato.valorLiquido)}</span></div>

              {!showAddDespesa ? (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowAddDespesa(true)}>+ Lançar despesa deste frete</button>
              ) : (
                <div style={{ marginTop: 12, padding: 12, background: "var(--surface2)", borderRadius: 10 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                    {tiposDespesaFrete.map(t => (
                      <button key={t.id} onClick={() => setNovaDespesa(d => ({ ...d, tipo: t.id }))}
                        style={{ padding: "6px 10px", borderRadius: 16, border: "1px solid", borderColor: novaDespesa.tipo === t.id ? "var(--gold)" : "var(--border)", background: novaDespesa.tipo === t.id ? "var(--gold)" : "var(--surface)", color: novaDespesa.tipo === t.id ? "#fff" : "var(--text2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="field">
                    <label>Valor (R$)</label>
                    <input type="number" step="0.01" value={novaDespesa.valor} onChange={e => setNovaDespesa(d => ({ ...d, valor: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div className="field">
                    <label>Descrição (opcional)</label>
                    <input value={novaDespesa.descricao} onChange={e => setNovaDespesa(d => ({ ...d, descricao: e.target.value }))} placeholder="Ex: Posto BR km 120" />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={adicionarDespesa} disabled={salvandoDespesa}>{salvandoDespesa ? "Salvando..." : "Salvar"}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddDespesa(false)}>Cancelar</button>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 10 }}>
                Combustível e desgaste são estimativas com base nos coeficientes oficiais da ANTT por eixo do veículo. Pedágio, alimentação e pernoite refletem exatamente o que você lançar aqui.
              </p>
            </>
          )}
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
                { icon: "🛡️", label: "Seguro", sub: "Obrigatório pra aceitar fretes", screen: "seguro-motorista" },
                { icon: "💰", label: "Minhas Finanças", sub: "Despesas, receitas e controle", screen: "financas-motorista" },
                { icon: "🔔", label: "Notificações", sub: "Push, sons e alertas", screen: "notificacoes" },
                { icon: "🔒", label: "Privacidade", sub: "Senha, dados pessoais", screen: "privacidade" },
                { icon: "📄", label: "Termos de uso", sub: "Política de privacidade", screen: "termos" },
              ].map((item, i) => (
                <div key={i} onClick={() => item.screen && onNavigate(item.screen)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderBottom: i < 6 ? "1px solid var(--border)" : "none", cursor: item.screen ? "pointer" : "default" }}>
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
    { icon: "📨", label: "Minhas Propostas", sub: "Acompanhe negociações de valor", screen: "minhas-propostas" },
    { icon: "🎯", label: "Convites", sub: "Fretes que contratantes te convidaram direto", screen: "convites-motorista" },
    { icon: "📢", label: "Disponibilidade", sub: "Anuncie onde você está pra ser convidado", screen: "disponibilidade-motorista" },
    { icon: "💬", label: "Suporte", sub: "Fale com a gente", screen: "suporte" },
    { icon: "ℹ️", label: "Sobre o app", sub: "Versão, contato e créditos", screen: "sobre" },
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
    { icon: "💬", label: "Suporte", sub: "Fale com a gente", screen: "suporte" },
    { icon: "ℹ️", label: "Sobre o app", sub: "Versão, contato e créditos", screen: "sobre" },
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
  const [resumoCustos, setResumoCustos] = useState(null);
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

  const carregarResumoCustos = () => {
    api("GET", "/api/motoristas/custos-resumo", null, token)
      .then(setResumoCustos).catch(() => setResumoCustos(null));
  };

  useEffect(() => {
    api("GET", "/api/motoristas/despesas", null, token)
      .then(setDespesas).catch(() => {});
    carregarResumoCustos();
  }, [token]);

  const total = resumoCustos ? resumoCustos.totalGeral : despesas.reduce((a, d) => a + Number(d.valor || 0), 0);

  const add = async () => {
    if (!nova.valor) return;
    setLoading(true);
    try {
      const salva = await api("POST", "/api/motoristas/despesas", nova, token);
      setDespesas(d => [salva, ...d]);
      setNova({ tipo: "combustivel", descricao: "", valor: "", data: new Date().toISOString().slice(0,10) });
      setShowAdd(false);
      carregarResumoCustos();
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    finally { setLoading(false); }
  };

  const remover = async (id) => {
    try {
      await api("DELETE", `/api/motoristas/despesas/${id}`, null, token);
      setDespesas(d => d.filter(x => x.id !== id));
      carregarResumoCustos();
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

      {resumoCustos && (
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div className="card" style={{ textAlign: "center", padding: "14px 10px" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>⛽</div>
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>Combustível</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--red)" }}>{formatMoney(resumoCustos.combustivelTotal)}</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "14px 10px" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>🔧</div>
            <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 2 }}>Desgaste</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--red)" }}>{formatMoney(resumoCustos.desgasteTotal)}</div>
          </div>
        </div>
      )}
      {resumoCustos && (
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: -8, marginBottom: 14, textAlign: "center" }}>
          Estimados com base nos coeficientes oficiais da ANTT, somando todos os {resumoCustos.totalFretesConsiderados} fretes aceitos. O detalhe de cada viagem está no card do frete.
        </p>
      )}
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
              {d.origem_cidade && (
                <div style={{ fontSize: 11, color: "var(--gold)", marginTop: 2, fontWeight: 600 }}>🚛 {d.origem_cidade} → {d.dest_cidade}</div>
              )}
            </div>
            <div style={{ fontWeight: 700, color: "var(--red)", fontSize: 15 }}>-{formatMoney(d.valor)}</div>
            {!d.automatica && (
              <button onClick={() => remover(d.id)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16, padding: 4 }}>🗑️</button>
            )}
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

  // ── Composição veicular (cavalo + carretas) ──────────────
  const [veiculos, setVeiculos] = useState([]);          // lista da composição
  const [carroceriasDisp, setCarroceriasDisp] = useState([]); // carrocerias válidas p/ o veículo
  const [novaCarreta, setNovaCarreta] = useState({ placa: "", carroceria: "", capacidadeTons: "", eixos: "" });
  const [addingCarreta, setAddingCarreta] = useState(false);
  const [erroComp, setErroComp] = useState("");
  const setNC = (k, v) => setNovaCarreta(f => ({ ...f, [k]: v }));

  const carregarComposicao = async () => {
    try {
      const lista = await api("GET", "/api/motoristas/veiculos", null, token);
      setVeiculos(Array.isArray(lista) ? lista : []);
    } catch { setVeiculos([]); }
  };

  const carregarCarroceriasDisp = async (veiculo) => {
    if (!veiculo) { setCarroceriasDisp([]); return; }
    try {
      const lista = await api("GET", `/api/motoristas/carrocerias-disponiveis?veiculo=${veiculo}`, null, token);
      setCarroceriasDisp(Array.isArray(lista) ? lista : []);
    } catch { setCarroceriasDisp([]); }
  };

  const adicionarCarreta = async () => {
    setErroComp("");
    if (!novaCarreta.placa) return setErroComp("Informe a placa da carreta.");
    if (!novaCarreta.carroceria) return setErroComp("Selecione a carroceria.");
    setAddingCarreta(true);
    try {
      await api("POST", "/api/motoristas/veiculos", {
        tipo: "carreta",
        placa: novaCarreta.placa,
        carroceria: novaCarreta.carroceria,
        capacidadeTons: novaCarreta.capacidadeTons || null,
        eixos: novaCarreta.eixos || null,
      }, token);
      setNovaCarreta({ placa: "", carroceria: "", capacidadeTons: "", eixos: "" });
      await carregarComposicao();
    } catch (e) { setErroComp(e.message); }
    finally { setAddingCarreta(false); }
  };

  const removerCarreta = async (id) => {
    try {
      await api("DELETE", `/api/motoristas/veiculos/${id}`, null, token);
      await carregarComposicao();
      await carregarConjuntos();
    } catch (e) { setErroComp(e.message); }
  };

  // ── Conjuntos (composições montadas: bitrem, rodotrem, simples) ──────────
  const [conjuntos, setConjuntos] = useState([]);
  const [selImplementos, setSelImplementos] = useState([]);   // ids selecionados p/ montar
  const [nomeConjunto, setNomeConjunto] = useState("");
  const [montandoConjunto, setMontandoConjunto] = useState(false);
  const [savingConjunto, setSavingConjunto] = useState(false);
  const [erroConjunto, setErroConjunto] = useState("");

  const carregarConjuntos = async () => {
    try {
      const lista = await api("GET", "/api/motoristas/conjuntos", null, token);
      setConjuntos(Array.isArray(lista) ? lista : []);
    } catch { setConjuntos([]); }
  };

  // Carretas disponíveis na garagem (para montar conjuntos)
  const carretasGaragem = veiculos.filter(v => v.tipo === "carreta");

  // Ao selecionar implementos, só deixa marcar os do MESMO tipo do primeiro escolhido
  const tipoSelecionado = selImplementos.length
    ? carretasGaragem.find(c => c.id === selImplementos[0])?.carroceria
    : null;

  const toggleImplemento = (id) => {
    setErroConjunto("");
    setSelImplementos(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  };

  const criarConjunto = async () => {
    setErroConjunto("");
    if (selImplementos.length === 0) return setErroConjunto("Selecione ao menos uma carreta.");
    setSavingConjunto(true);
    try {
      await api("POST", "/api/motoristas/conjuntos", {
        nome: nomeConjunto || null,
        veiculoIds: selImplementos,
      }, token);
      setSelImplementos([]); setNomeConjunto(""); setMontandoConjunto(false);
      await carregarConjuntos();
    } catch (e) { setErroConjunto(e.message); }
    finally { setSavingConjunto(false); }
  };

  const ativarConjunto = async (id) => {
    try {
      await api("PATCH", `/api/motoristas/conjuntos/${id}/ativar`, {}, token);
      await carregarConjuntos();
    } catch (e) { setErroConjunto(e.message); }
  };

  const removerConjunto = async (id) => {
    try {
      await api("DELETE", `/api/motoristas/conjuntos/${id}`, null, token);
      await carregarConjuntos();
    } catch (e) { setErroConjunto(e.message); }
  };

  const carregarPerfil = async () => {
    try {
      const d = await api("GET", "/api/motoristas/perfil", null, token);
      setForm({
        tipoVeiculo: d.tipo_veiculo || "", tipoCarreta: d.tipo_carreta || "",
        marca: d.marca_veiculo || "", modelo: d.modelo_veiculo || "",
        placa: d.placa_veiculo || "", anoFab: d.ano_veiculo || "",
        renavam: d.renavam || "", tara: d.tara_kg || "", capacidade: d.capacidade_tons || "",
      });
      if (d.tipo_veiculo) carregarCarroceriasDisp(d.tipo_veiculo);
    } catch (e) { setError("Erro ao carregar dados: " + e.message); }
    finally { setLoadingData(false); }
  };

  useEffect(() => { carregarPerfil(); carregarComposicao(); carregarConjuntos(); }, []);
  // Recarrega carrocerias válidas sempre que o tipo de veículo muda
  useEffect(() => { carregarCarroceriasDisp(form.tipoVeiculo); }, [form.tipoVeiculo]);

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
            <div className="field"><label>Placa</label><input value={form.placa} onChange={e => set("placa", maskPlaca(e.target.value))} placeholder="ABC-1234 ou ABC1D23" /></div>
            <div className="field"><label>Ano</label><input type="number" value={form.anoFab} onChange={e => set("anoFab", e.target.value)} placeholder="2018" /></div>
          </div>
          <div className="grid-2">
            <div className="field"><label>Tara (kg)</label><input type="number" value={form.tara} onChange={e => set("tara", e.target.value)} placeholder="7500" /></div>
            <div className="field"><label>Capacidade (t)</label><input type="number" value={form.capacidade} onChange={e => set("capacidade", e.target.value)} placeholder="25" /></div>
          </div>
          <div className="field"><label>RENAVAM</label><input value={form.renavam} onChange={e => set("renavam", e.target.value)} placeholder="00000000000" /></div>
        </div>

        <div className="card">
          <div className="card-title">🚛 Composição Veicular</div>
          <p style={{ fontSize: 13, color: "#8A7E6E", marginTop: -4, marginBottom: 14 }}>
            Cadastre cada carreta com sua placa e carroceria. O TRUKER só vai te mostrar fretes que seu conjunto consegue transportar.
          </p>

          {erroComp && <div className="alert alert-error" style={{ marginBottom: 12 }}>{erroComp}</div>}

          {/* Lista de carretas já cadastradas */}
          {veiculos.filter(v => v.tipo === "carreta").length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {veiculos.filter(v => v.tipo === "carreta").map(v => (
                <div key={v.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", marginBottom: 8, borderRadius: 12,
                  background: "#F5F0E8", border: "1px solid #DDD4C0",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1209" }}>
                      {v.carroceria_label || v.carroceria} · <span style={{ fontFamily: "monospace", letterSpacing: 1 }}>{v.placa}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#8A7E6E", marginTop: 2 }}>
                      {v.capacidade_tons ? `${v.capacidade_tons}t` : "capacidade não informada"}
                      {v.cargas_aceitas?.length ? ` · aceita: ${v.cargas_aceitas.join(", ")}` : ""}
                    </div>
                  </div>
                  <button onClick={() => removerCarreta(v.id)} style={{
                    background: "#FDECEA", color: "#C0392B", border: "none",
                    borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>Remover</button>
                </div>
              ))}
            </div>
          )}

          {veiculos.filter(v => v.tipo === "carreta").length === 0 && (
            <div style={{ padding: "16px", textAlign: "center", color: "#8A7E6E", fontSize: 13, background: "#F5F0E8", borderRadius: 12, marginBottom: 14 }}>
              Nenhuma carreta cadastrada ainda. Adicione abaixo.
            </div>
          )}

          {/* Formulário de adicionar carreta */}
          <div style={{ borderTop: "1px dashed #DDD4C0", paddingTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#4A3F30", marginBottom: 10 }}>Adicionar carreta</div>
            {!form.tipoVeiculo && (
              <div style={{ fontSize: 12, color: "#C0392B", marginBottom: 10 }}>
                Selecione primeiro o tipo de veículo acima para ver as carrocerias compatíveis.
              </div>
            )}
            <div className="field">
              <label>Carroceria</label>
              <select value={novaCarreta.carroceria} onChange={e => setNC("carroceria", e.target.value)} disabled={!form.tipoVeiculo}>
                <option value="">Selecione...</option>
                {carroceriasDisp.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="grid-2">
              <div className="field"><label>Placa da carreta</label><input value={novaCarreta.placa} onChange={e => setNC("placa", maskPlaca(e.target.value))} placeholder="ABC-1234 ou ABC1D23" /></div>
              <div className="field"><label>Capacidade (t)</label><input type="number" value={novaCarreta.capacidadeTons} onChange={e => setNC("capacidadeTons", e.target.value)} placeholder="25" /></div>
            </div>
            <button className="btn btn-secondary" onClick={adicionarCarreta} disabled={addingCarreta || !form.tipoVeiculo} style={{ width: "100%" }}>
              {addingCarreta ? "Adicionando..." : "+ Adicionar carreta"}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">🔗 Meus Conjuntos</div>
          <p style={{ fontSize: 13, color: "#8A7E6E", marginTop: -4, marginBottom: 14 }}>
            Monte conjuntos com suas carretas (ex: bitrem com 2 graneleiros). O conjunto <strong>ativo</strong> é o que está rodando agora — só ele define quais fretes você vê.
          </p>

          {erroConjunto && <div className="alert alert-error" style={{ marginBottom: 12 }}>{erroConjunto}</div>}

          {/* Lista de conjuntos */}
          {conjuntos.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {conjuntos.map(c => (
                <div key={c.id} style={{
                  padding: "12px 14px", marginBottom: 8, borderRadius: 12,
                  background: c.ativo ? "#F0F7F0" : "#F5F0E8",
                  border: c.ativo ? "2px solid #2D7A3A" : "1px solid #DDD4C0",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1209", display: "flex", alignItems: "center", gap: 6 }}>
                        {c.nome}
                        {c.ativo && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#2D7A3A", borderRadius: 6, padding: "2px 8px" }}>ATIVO</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#8A7E6E", marginTop: 3 }}>
                        {c.qtd_implementos} carreta{c.qtd_implementos > 1 ? "s" : ""} · {c.capacidade_total}t
                        {c.cargas_aceitas?.length ? ` · aceita: ${c.cargas_aceitas.join(", ")}` : ""}
                      </div>
                    </div>
                    <button onClick={() => removerConjunto(c.id)} style={{
                      background: "transparent", color: "#C0392B", border: "none",
                      fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: 8,
                    }}>Remover</button>
                  </div>
                  {!c.ativo && (
                    <button onClick={() => ativarConjunto(c.id)} style={{
                      marginTop: 10, width: "100%", background: "#C9A84C", color: "#1A1209",
                      border: "none", borderRadius: 8, padding: "8px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    }}>Ativar este conjunto</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {conjuntos.length === 0 && !montandoConjunto && (
            <div style={{ padding: "16px", textAlign: "center", color: "#8A7E6E", fontSize: 13, background: "#F5F0E8", borderRadius: 12, marginBottom: 14 }}>
              Nenhum conjunto montado. Crie um abaixo combinando suas carretas.
            </div>
          )}

          {/* Montar novo conjunto */}
          {!montandoConjunto && (
            <button className="btn btn-secondary" onClick={() => setMontandoConjunto(true)}
              disabled={carretasGaragem.length === 0} style={{ width: "100%" }}>
              {carretasGaragem.length === 0 ? "Cadastre carretas acima primeiro" : "+ Montar novo conjunto"}
            </button>
          )}

          {montandoConjunto && (
            <div style={{ borderTop: "1px dashed #DDD4C0", paddingTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#4A3F30", marginBottom: 4 }}>Selecione as carretas do conjunto</div>
              <div style={{ fontSize: 11, color: "#8A7E6E", marginBottom: 10 }}>
                Só carretas do mesmo tipo podem ir no mesmo conjunto.
              </div>

              {carretasGaragem.map(c => {
                const marcada = selImplementos.includes(c.id);
                const bloqueada = tipoSelecionado && c.carroceria !== tipoSelecionado && !marcada;
                return (
                  <div key={c.id} onClick={() => !bloqueada && toggleImplemento(c.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 6,
                    borderRadius: 10, cursor: bloqueada ? "not-allowed" : "pointer",
                    background: marcada ? "#FBF6E9" : "#F5F0E8",
                    border: marcada ? "2px solid #C9A84C" : "1px solid #DDD4C0",
                    opacity: bloqueada ? 0.4 : 1,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      border: marcada ? "none" : "2px solid #DDD4C0",
                      background: marcada ? "#C9A84C" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#1A1209", fontSize: 13, fontWeight: 700,
                    }}>{marcada ? "✓" : ""}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#1A1209" }}>{c.carroceria_label || c.carroceria} · {c.placa}</div>
                      <div style={{ fontSize: 11, color: "#8A7E6E" }}>{c.capacidade_tons ? `${c.capacidade_tons}t` : "—"}</div>
                    </div>
                  </div>
                );
              })}

              <div className="field" style={{ marginTop: 12 }}>
                <label>Nome do conjunto (opcional)</label>
                <input value={nomeConjunto} onChange={e => setNomeConjunto(e.target.value)} placeholder="Ex: Bitrem Graneleiro 60t (deixe vazio p/ sugerir)" />
              </div>

              <div className="grid-2">
                <button className="btn btn-secondary" onClick={() => { setMontandoConjunto(false); setSelImplementos([]); setNomeConjunto(""); setErroConjunto(""); }}>Cancelar</button>
                <button className="btn btn-primary" onClick={criarConjunto} disabled={savingConjunto || selImplementos.length === 0}>
                  {savingConjunto ? "Criando..." : "Criar conjunto"}
                </button>
              </div>
            </div>
          )}
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
  const [ganhos, setGanhos] = useState(null);
  const [extrato, setExtrato] = useState(null);
  const [loadingExtrato, setLoadingExtrato] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [nova, setNova] = useState({ tipo: "combustivel", descricao: "", valor: "", data: new Date().toISOString().slice(0,10) });
  const [loadingGanhos, setLoadingGanhos] = useState(true);
  const setN = (k, v) => setNova(f => ({ ...f, [k]: v }));
  const tiposDespesa = [
    { id: "combustivel", icon: "⛽", label: "Combustível" }, { id: "manutencao", icon: "🔧", label: "Manutenção" },
    { id: "pedagio", icon: "🛣️", label: "Pedágio" }, { id: "pneu", icon: "🔄", label: "Pneus" },
    { id: "seguro", icon: "🛡️", label: "Seguro" }, { id: "multa", icon: "🚨", label: "Multa" },
    { id: "alimentacao", icon: "🍽️", label: "Alimentação" }, { id: "hospedagem", icon: "🏨", label: "Hospedagem" },
    { id: "outro", icon: "📦", label: "Outro" },
  ];

  // Carrega despesas, ganhos e extrato de transações do banco já ao montar a tela (não só ao clicar na aba)
  useEffect(() => {
    api("GET", "/api/motoristas/despesas", null, token)
      .then(setDespesas).catch(() => {});
    setLoadingGanhos(true);
    api("GET", "/api/motoristas/ganhos", null, token)
      .then(setGanhos).catch(() => setGanhos(null)).finally(() => setLoadingGanhos(false));
    setLoadingExtrato(true);
    api("GET", "/api/motoristas/extrato", null, token)
      .then(d => setExtrato(d.transacoes || []))
      .catch(() => setExtrato([]))
      .finally(() => setLoadingExtrato(false));
  }, [token]);

  const totalDespesas = despesas.reduce((a, d) => a + Number(d.valor || 0), 0);
  const totalReceitas = Number(ganhos?.ganhos_total || 0);
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
                  {!d.automatica && (
                    <button onClick={() => remover(d.id)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 16, padding: 4 }}>🗑️</button>
                  )}
                </div>
              );
            })}
          </>
        )}
        {tab === "receitas" && (
          <>
            {loadingGanhos ? <Loading /> : !ganhos || Number(ganhos.total_fretes || 0) === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
                <p style={{ fontWeight: 600 }}>Nenhuma receita ainda</p>
                <p style={{ fontSize: 13, marginTop: 6 }}>Fretes concluídos entram aqui automaticamente.</p>
              </div>
            ) : (
              <>
                <div className="card" style={{ textAlign: "center", borderColor: "rgba(45,122,58,0.3)", marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Ganhos este mês</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--green)" }}>{formatMoney(ganhos.ganhos_mes_atual)}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                    {ganhos.fretes_mes_atual} frete{ganhos.fretes_mes_atual === 1 ? "" : "s"} · média {formatMoney(ganhos.media_por_frete)}/frete
                  </div>
                </div>
                {ganhos.historico_mensal?.length > 0 && (
                  <div className="card" style={{ marginBottom: 14 }}>
                    <div className="card-title">Histórico mensal</div>
                    {ganhos.historico_mensal.map((m, i) => (
                      <div key={i} style={{ marginBottom: 12 }}>
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
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="card-title">Resumo total</div>
                  <div className="info-row"><span className="info-label">Total de fretes</span><span className="info-value">{ganhos.total_fretes}</span></div>
                  <div className="info-row"><span className="info-label">Km carregado total</span><span className="info-value">{formatKm(ganhos.km_carregado)}</span></div>
                  <div className="info-row"><span className="info-label">Ganhos com entregas</span><span className="info-value" style={{ color: "var(--green)" }}>{formatMoney(ganhos.ganhos_entregas)}</span></div>
                  {Number(ganhos.ganhos_compensacoes || 0) > 0 && (
                    <div className="info-row"><span className="info-label">🔄 Compensações por cancelamento</span><span className="info-value" style={{ color: "var(--gold)" }}>{formatMoney(ganhos.ganhos_compensacoes)}</span></div>
                  )}
                  <div className="divider" />
                  <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Ganhos totais</span><span className="info-value" style={{ color: "var(--green)", fontWeight: 800 }}>{formatMoney(ganhos.ganhos_total)}</span></div>
                </div>
                <div className="card-title" style={{ marginBottom: 8 }}>Transações</div>
                {loadingExtrato ? <Loading /> : extrato?.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: 24, color: "var(--text3)" }}>Nenhuma transação registrada ainda</div>
                ) : (extrato || []).map(t => {
                  const ehCompensacao = t.tipo === "compensacao_cancelamento";
                  const data = t.data_evento ? new Date(t.data_evento).toLocaleDateString("pt-BR") : "—";
                  return (
                    <div key={t.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", borderColor: ehCompensacao ? "rgba(201,168,76,0.4)" : "var(--border)" }}
                      onClick={() => onNavigate("extrato-frete-motorista", { id: t.id })}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: ehCompensacao ? "rgba(201,168,76,0.15)" : "rgba(45,122,58,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                        {ehCompensacao ? "🔄" : "🚛"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{ehCompensacao ? "Compensação por cancelamento" : "Entrega"}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>{t.dest_cidade ? `→ ${t.dest_cidade}/${t.dest_estado}` : "—"} · {data}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: ehCompensacao ? "var(--gold)" : "var(--green)", fontSize: 15 }}>{formatMoney(t.valor)}</div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EXTRATO DE UM FRETE FINALIZADO (Motorista)
// Reaproveita GET /api/fretes/:id/extrato — mesmo endpoint usado em "Em Trânsito"
// pra fretes em andamento, mas aqui pra fretes já entregues ou cancelados com
// compensação (o backend diferencia pelo campo "tipo" da resposta).
// ─────────────────────────────────────────────
function ExtratoFreteMotoristaScreen({ dados, onNavigate }) {
  const { token } = useAuth();
  const [extrato, setExtrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dados?.id) return;
    setLoading(true);
    api("GET", `/api/fretes/${dados.id}/extrato`, null, token)
      .then(setExtrato)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [dados?.id]);

  const ehCompensacao = extrato?.tipo === "compensacao_cancelamento";
  const cd = extrato?.compensacaoDetalhes;

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate(-1)}>←</button>
        <h1>{ehCompensacao ? "Compensação" : "Extrato do Frete"}</h1>
      </div>
      <div className="content">
        {loading && <Loading />}
        {error && <div className="alert alert-error">{error}</div>}
        {extrato && (
          <>
            {ehCompensacao && (
              <div className="alert alert-info" style={{ marginBottom: 14 }}>
                🔄 Este frete foi cancelado pelo contratante depois que você já tinha saído pra coleta. O valor abaixo é a compensação pelo trecho percorrido, não o valor do frete completo.
              </div>
            )}
            <div className="card" style={{ textAlign: "center", borderColor: ehCompensacao ? "rgba(201,168,76,0.4)" : "rgba(45,122,58,0.3)", marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>{ehCompensacao ? "Compensação recebida" : "Valor a receber"}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: ehCompensacao ? "var(--gold)" : "var(--green)" }}>{formatMoney(extrato.valorReceber)}</div>
            </div>

            {ehCompensacao ? (
              <div className="card">
                <div className="card-title">Como foi calculado</div>
                {cd?.distanciaPercorridaKm != null && (
                  <div className="info-row"><span className="info-label">Distância percorrida</span><span className="info-value">{cd.distanciaPercorridaKm} km</span></div>
                )}
                <div className="info-row"><span className="info-label">⛽ Combustível (trecho percorrido)</span><span className="info-value">{formatMoney(extrato.custosAutomaticos.combustivel)}</span></div>
                <div className="info-row"><span className="info-label">🔧 Desgaste (trecho percorrido)</span><span className="info-value">{formatMoney(extrato.custosAutomaticos.desgaste)}</span></div>
                {cd?.taxaTranstorno != null && (
                  <div className="info-row"><span className="info-label">⚠️ Taxa de transtorno ({Math.round((cd.percentualTaxa || 0) * 100)}%)</span><span className="info-value">{formatMoney(cd.taxaTranstorno)}</span></div>
                )}
                <div className="divider" />
                <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Total da compensação</span><span className="info-value" style={{ color: "var(--gold)", fontWeight: 800, fontSize: 16 }}>{formatMoney(extrato.valorReceber)}</span></div>
                <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
                  Combustível e desgaste cobrem só o trecho que você já tinha percorrido até o cancelamento. A taxa de transtorno é um adicional fixo pela viagem interrompida.
                </p>
              </div>
            ) : (
              <div className="card">
                <div className="card-title">Custos estimados (dados oficiais ANTT)</div>
                <div className="info-row"><span className="info-label">⛽ Combustível</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos.combustivel)}</span></div>
                <div className="info-row"><span className="info-label">🔧 Desgaste do veículo</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.custosAutomaticos.desgaste)}</span></div>
              </div>
            )}

            {extrato.despesasManuais?.length > 0 && (
              <div className="card">
                <div className="card-title">Despesas lançadas por você</div>
                {extrato.despesasManuais.map(d => (
                  <div key={d.id} className="info-row">
                    <span className="info-label">{d.tipo}{d.descricao ? ` — ${d.descricao}` : ""}</span>
                    <span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(d.valor)}</span>
                  </div>
                ))}
              </div>
            )}

            {!ehCompensacao && (
              <div className="card">
                <div className="info-row"><span className="info-label">Total de custos</span><span className="info-value" style={{ color: "var(--red)" }}>− {formatMoney(extrato.totalCustos)}</span></div>
                <div className="info-row"><span className="info-label" style={{ fontWeight: 800 }}>Valor líquido estimado</span><span className="info-value" style={{ color: extrato.valorLiquido >= 0 ? "var(--green)" : "var(--red)", fontWeight: 800, fontSize: 16 }}>{formatMoney(extrato.valorLiquido)}</span></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAINEL FINANCEIRO — CONTRATANTE
// ─────────────────────────────────────────────
function FinancasContratante({ onNavigate }) {
  const { token } = useAuth();
  const [periodo, setPeriodo] = useState("12m");
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [aba, setAba] = useState("mes");

  useEffect(() => {
    setLoading(true);
    setErro(false);
    api("GET", `/api/contratantes/financeiro?periodo=${periodo}`, null, token)
      .then(setDados)
      .catch(() => setErro(true))
      .finally(() => setLoading(false));
  }, [periodo, token]);

  const iconCarga = (tipo) => TIPOS_CARGA.find(t => t.id === tipo)?.icon || "📦";
  const labelCarga = (tipo) => TIPOS_CARGA.find(t => t.id === tipo)?.label || tipo || "—";

  const resumo = dados?.resumo || dados || {};
  const porMes = dados?.por_mes || [];
  const porRota = dados?.por_rota || [];
  const porTipo = dados?.por_tipo_carga || [];
  const extrato = dados?.extrato || [];

  const maxMes = Math.max(1, ...porMes.map(m => Number(m.valor || 0)));
  const maxRota = Math.max(1, ...porRota.map(r => Number(r.valor || 0)));
  const maxTipo = Math.max(1, ...porTipo.map(t => Number(t.valor || 0)));

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Painel Financeiro</h1></div>
      <div className="content">
        <div className="tab-bar" style={{ marginBottom: 14 }}>
          {[["12m", "Últimos 12 meses"], ["desde_inicio", "Desde o início"]].map(([id, label]) => (
            <button key={id} className={`tab-btn ${periodo === id ? "active" : ""}`} onClick={() => setPeriodo(id)}>{label}</button>
          ))}
        </div>

        {loading ? <Loading /> : erro ? (
          <div className="alert alert-error">Não foi possível carregar os dados financeiros. Tente novamente mais tarde.</div>
        ) : (
          <>
            <div className="grid-2" style={{ marginBottom: 10 }}>
              <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total Gasto</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>{formatMoney(resumo.total_gasto)}</div></div>
              <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Ticket Médio</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{formatMoney(resumo.ticket_medio)}</div></div>
            </div>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Total de Fretes</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{resumo.total_fretes ?? 0}</div></div>
              <div className="stat-card"><div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", marginBottom: 4 }}>Km Total</div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{formatKm(resumo.km_total)}</div></div>
            </div>

            <div className="tab-bar" style={{ marginBottom: 14 }}>
              {[["mes", "Por Mês"], ["rota", "Por Rota"], ["tipo", "Por Tipo"], ["extrato", "Extrato"]].map(([id, label]) => (
                <button key={id} className={`tab-btn ${aba === id ? "active" : ""}`} onClick={() => setAba(id)}>{label}</button>
              ))}
            </div>

            {aba === "mes" && (
              porMes.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
                  <p style={{ fontWeight: 600 }}>Nenhum gasto no período</p>
                </div>
              ) : porMes.map((m, i) => (
                <div key={i} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{String(m.mes).slice(0, 3)}/{String(m.ano).slice(-2)}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{m.fretes} frete{m.fretes === 1 ? "" : "s"}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gold)" }}>{formatMoney(m.valor)}</div>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${(Number(m.valor || 0) / maxMes) * 100}%` }} /></div>
                </div>
              ))
            )}

            {aba === "rota" && (
              porRota.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🗺️</div>
                  <p style={{ fontWeight: 600 }}>Nenhuma rota no período</p>
                </div>
              ) : porRota.map((r, i) => (
                <div key={i} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.origem || "—"} → {r.destino || "—"}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gold)", whiteSpace: "nowrap" }}>{formatMoney(r.valor)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>{r.fretes} frete{r.fretes === 1 ? "" : "s"}</div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${(Number(r.valor || 0) / maxRota) * 100}%` }} /></div>
                </div>
              ))
            )}

            {aba === "tipo" && (
              porTipo.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
                  <p style={{ fontWeight: 600 }}>Nenhuma carga no período</p>
                </div>
              ) : porTipo.map((t, i) => (
                <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--gold-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{iconCarga(t.tipo_carga)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{labelCarga(t.tipo_carga)}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>{t.fretes} frete{t.fretes === 1 ? "" : "s"}</div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${(Number(t.valor || 0) / maxTipo) * 100}%` }} /></div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gold)", whiteSpace: "nowrap" }}>{formatMoney(t.valor)}</div>
                </div>
              ))
            )}

            {aba === "extrato" && (
              extrato.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                  <p style={{ fontWeight: 600 }}>Nenhum frete no período</p>
                </div>
              ) : extrato.map((f) => {
                const cancelado = f.status === "cancelado";
                return (
                  <div key={f.id} className="card" style={cancelado ? { background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.3)" } : {}}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{f.origem || "—"} → {f.destino || "—"}</div>
                      <StatusBadge status={f.status} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
                      {iconCarga(f.tipo_carga)} {labelCarga(f.tipo_carga)} · {f.criado_em ? new Date(f.criado_em).toLocaleDateString("pt-BR") : "—"}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: cancelado ? "var(--red)" : "var(--gold)" }}>{formatMoney(f.valor)}</div>
                  </div>
                );
              })
            )}
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
// SUPORTE
// ─────────────────────────────────────────────
function SuporteScreen({ onNavigate }) {
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

// ─────────────────────────────────────────────
// SOBRE
// ─────────────────────────────────────────────
function SobreScreen({ onNavigate }) {
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
          <div className="info-row"><span className="info-label">Versão</span><span className="info-value">1.0.0</span></div>
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

// ─────────────────────────────────────────────
// PRIVACIDADE
// ─────────────────────────────────────────────
function PrivacidadeScreen({ onNavigate }) {
  const { user } = useAuth();
  const dadosPessoaisScreen = user?.tipo === "motorista" ? "dados-pessoais-motorista" : "dados-pessoais-contratante";
  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Privacidade</h1></div>
      <div className="content">
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => onNavigate("alterar-senha")}>
          <span style={{ fontSize: 20 }}>🔑</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "var(--text)" }}>Alterar senha</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Redefina sua senha com um código enviado ao seu email</div>
          </div>
          <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
        </div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => onNavigate(dadosPessoaisScreen)}>
          <span style={{ fontSize: 20 }}>👤</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "var(--text)" }}>Dados pessoais</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Veja e edite seus dados cadastrados</div>
          </div>
          <span style={{ color: "var(--text3)", fontSize: 18 }}>›</span>
        </div>
        <div className="card">
          <div className="card-title">🔒 Segurança dos seus dados</div>
          <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
            Sua senha é armazenada com hash seguro e nunca fica visível para a equipe TRUKER. Para trocá-la, enviamos um código de verificação para o email cadastrado na sua conta.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ALTERAR SENHA (usuário logado — reaproveita o fluxo de recuperação)
// ─────────────────────────────────────────────
function AlterarSenhaScreen({ onNavigate }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codigoTeste, setCodigoTeste] = useState(null);
  const email = user?.email || "";

  const enviarCodigo = async () => {
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
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate("privacidade")}>←</button><h1>Alterar Senha</h1></div>
      <div className="content">
        {step < 4 && (
          <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>
            {step === 1 && <>Vamos enviar um código de verificação para <strong style={{ color: "var(--text)" }}>{email}</strong>.</>}
            {step === 2 && <>Código enviado para <strong style={{ color: "var(--gold)" }}>{email}</strong>. Digite abaixo.</>}
            {step === 3 && "Defina sua nova senha."}
          </p>
        )}
        {step === 2 && codigoTeste && (
          <div style={{ background: "rgba(201,168,76,0.1)", border: "1px dashed var(--gold)", borderRadius: 10, padding: "14px 12px", marginBottom: 14, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🧪 Modo teste — email indisponível</div>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 14, color: "var(--text)", fontFamily: "monospace" }}>{codigoTeste}</div>
          </div>
        )}
        {step === 4 && (
          <div style={{ textAlign: "center", paddingTop: 20 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Senha alterada!</div>
            <div style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>Sua senha foi redefinida com sucesso.</div>
            <button className="btn btn-primary" onClick={() => onNavigate("privacidade")}>Voltar</button>
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
        {step === 1 && (
          <button className="btn btn-primary" onClick={enviarCodigo} disabled={loading}>{loading ? "Enviando..." : "Enviar código"}</button>
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
    </div>
  );
}

// ─────────────────────────────────────────────
// NOTIFICAÇÕES
// ─────────────────────────────────────────────
function NotificacoesScreen({ onNavigate }) {
  const { token } = useAuth();
  const [prefs, setPrefs] = useState({ novo_frete: true, chat: true, status_frete: true });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("GET", "/api/usuarios/notificacoes", null, token)
      .then(setPrefs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const alternar = async (categoria, valor) => {
    setPrefs(p => ({ ...p, [categoria]: valor }));
    setSalvando(categoria); setError("");
    try {
      const atualizado = await api("PUT", "/api/usuarios/notificacoes", { [categoria]: valor }, token);
      setPrefs(atualizado);
    } catch (e) {
      setPrefs(p => ({ ...p, [categoria]: !valor }));
      setError(e.message);
    } finally { setSalvando(null); }
  };

  const itens = [
    { key: "novo_frete", label: "Novo frete disponível", sub: "Avisos de fretes compatíveis com você" },
    { key: "chat", label: "Mensagem no chat", sub: "Novas mensagens em conversas ativas" },
    { key: "status_frete", label: "Atualização de status do frete", sub: "Mudanças de status nos seus fretes" },
  ];

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Notificações</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Loading /> : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {itens.map((item, i) => (
              <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < itens.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{item.sub}</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={!!prefs[item.key]} disabled={salvando === item.key} onChange={e => alternar(item.key, e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 12, lineHeight: 1.6 }}>
          As alterações são salvas automaticamente.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN — MOTORISTA DE TESTE
// ─────────────────────────────────────────────
function AdminMotoristaTeste({ onNavigate }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");

  const criar = async () => {
    if (!confirm("Isso vai apagar o motorista de teste anterior (teste@truker.app) e criar um novo. Confirma?")) return;
    setLoading(true); setError(""); setResultado(null);
    try {
      const data = await api("POST", "/api/admin/motorista-teste", {}, token);
      setResultado(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Motorista de Teste</h1></div>
      <div className="content">
        <div className="card" style={{ textAlign: "center", padding: "24px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚛</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Criar motorista fictício</div>
          <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>
            Cria um motorista completo com rodotrem graneleiro 57t para testar o matching e todas as funcionalidades do app.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button className="btn btn-primary" onClick={criar} disabled={loading} style={{ width: "100%", marginBottom: 16 }}>
          {loading ? "Criando..." : "🚛 Criar / Recriar Motorista de Teste"}
        </button>

        {resultado && (
          <>
            <div className="alert alert-success">✅ Motorista criado com sucesso!</div>
            {/* FICHA VISUAL */}
            <div className="card" style={{ border: "2px solid var(--gold)", marginTop: 16 }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 32 }}>🚛</div>
                <div style={{ fontWeight: 900, fontSize: 18, color: "var(--gold)", letterSpacing: 2 }}>FICHA DO MOTORISTA DE TESTE</div>
              </div>

              <div className="card-title">👤 Dados de Acesso</div>
              <div className="info-row"><span className="info-label">Nome</span><span className="info-value">{resultado.usuario.nome}</span></div>
              <div className="info-row"><span className="info-label">E-mail</span><span className="info-value" style={{ color: "var(--gold)" }}>{resultado.usuario.email}</span></div>
              <div className="info-row"><span className="info-label">Senha</span><span className="info-value" style={{ color: "var(--gold)" }}>{resultado.usuario.senha}</span></div>

              <div className="card-title" style={{ marginTop: 14 }}>🚗 Cavalo Mecânico</div>
              <div className="info-row"><span className="info-label">Tipo</span><span className="info-value">Rodotrem</span></div>
              <div className="info-row"><span className="info-label">Marca/Modelo</span><span className="info-value">Scania R450 2022</span></div>
              <div className="info-row"><span className="info-label">Placa</span><span className="info-value">{resultado.motorista.placa_cavalo}</span></div>
              <div className="info-row"><span className="info-label">RNTRC</span><span className="info-value">{resultado.motorista.rntrc}</span></div>
              <div className="info-row"><span className="info-label">CNH</span><span className="info-value">{resultado.motorista.cnh} (Cat. E)</span></div>

              <div className="card-title" style={{ marginTop: 14 }}>🔗 Conjunto Ativo</div>
              <div className="info-row"><span className="info-label">Nome</span><span className="info-value">{resultado.motorista.conjunto}</span></div>
              <div className="info-row"><span className="info-label">Carretas</span><span className="info-value">{resultado.motorista.carretas.join(", ")}</span></div>
              <div className="info-row"><span className="info-label">Carroceria</span><span className="info-value">Graneleiro</span></div>
              <div className="info-row"><span className="info-label">Capacidade</span><span className="info-value">57 toneladas</span></div>
              <div className="info-row"><span className="info-label">Cargas aceitas</span><span className="info-value">Granel sólido, Neogranel, Geral</span></div>

              <div style={{ marginTop: 16, padding: "12px", background: "rgba(201,168,76,0.08)", borderRadius: 8, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
                ⚠️ Dados fictícios para uso exclusivo em testes internos
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN — SEGURADORAS PARCEIRAS
// ─────────────────────────────────────────────
function AdminSeguradorasScreen({ onNavigate }) {
  const { token } = useAuth();
  const [seguradoras, setSeguradoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNova, setShowNova] = useState(false);
  const [nova, setNova] = useState({ nome: "", descricao: "", urlContato: "" });
  const [salvando, setSalvando] = useState(false);
  const [atualizandoId, setAtualizandoId] = useState(null);

  const carregar = () => {
    setLoading(true);
    api("GET", "/api/admin/seguradoras", null, token)
      .then(setSeguradoras)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const criar = async () => {
    if (!nova.nome.trim()) return setError("Informe o nome da seguradora");
    setError(""); setSalvando(true);
    try {
      await api("POST", "/api/admin/seguradoras", {
        nome: nova.nome.trim(),
        descricao: nova.descricao.trim() || undefined,
        urlContato: nova.urlContato.trim() || undefined,
      }, token);
      setNova({ nome: "", descricao: "", urlContato: "" });
      setShowNova(false);
      carregar();
    } catch (e) { setError(e.message); }
    finally { setSalvando(false); }
  };

  const alternarAtivo = async (seg) => {
    setAtualizandoId(seg.id); setError("");
    try {
      await api("PATCH", `/api/admin/seguradoras/${seg.id}`, { ativo: !seg.ativo }, token);
      carregar();
    } catch (e) { setError(e.message); }
    finally { setAtualizandoId(null); }
  };

  return (
    <div className="screen">
      <div className="header"><button className="back-btn" onClick={() => onNavigate(-1)}>←</button><h1>Seguradoras Parceiras</h1></div>
      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={() => setShowNova(s => !s)}>
          {showNova ? "Cancelar" : "+ Nova Seguradora"}
        </button>

        {showNova && (
          <div className="card" style={{ borderColor: "var(--gold)", marginBottom: 14 }}>
            <div className="card-title">Nova Seguradora Parceira</div>
            <div className="field"><label>Nome</label><input value={nova.nome} onChange={e => setNova(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Porto Seguro" /></div>
            <div className="field"><label>Descrição (opcional)</label><input value={nova.descricao} onChange={e => setNova(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Desconto de 10% pra motoristas TRUKER" /></div>
            <div className="field"><label>Link de contato (opcional)</label><input value={nova.urlContato} onChange={e => setNova(f => ({ ...f, urlContato: e.target.value }))} placeholder="https://..." /></div>
            <button className="btn btn-primary" onClick={criar} disabled={salvando} style={{ width: "100%" }}>{salvando ? "Salvando..." : "Salvar"}</button>
          </div>
        )}

        {loading ? <Loading /> : seguradoras.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛡️</div>
            Nenhuma seguradora cadastrada ainda
          </div>
        ) : seguradoras.map(seg => (
          <div key={seg.id} className="card" style={{ opacity: seg.ativo ? 1 : 0.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{seg.nome}</div>
              <span className={`badge ${seg.ativo ? "badge-done" : "badge-cancel"}`}>{seg.ativo ? "Ativa" : "Inativa"}</span>
            </div>
            {seg.descricao && <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>{seg.descricao}</div>}
            {seg.url_contato && <div style={{ fontSize: 12, color: "var(--gold)", marginBottom: 8 }}>{seg.url_contato}</div>}
            <button className="btn btn-secondary btn-sm" onClick={() => alternarAtivo(seg)} disabled={atualizandoId === seg.id}>
              {atualizandoId === seg.id ? "Atualizando..." : seg.ativo ? "Desativar" : "Ativar"}
            </button>
          </div>
        ))}
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
      setScreen("entrada");
    }
  }, [user?.id, user?.tipo]);

  const navigate = (to, data = null) => {
    if (to === -1) { setScreen(user?.tipo === "motorista" ? "home-motorista" : user?.tipo === "admin" ? "admin-dashboard" : "home-contratante"); return; }
    setScreenData(data); setScreen(to); window.scrollTo(0, 0);
  };

  const p = { onNavigate: navigate };

  switch (screen) {
    case "splash": return <SplashScreen {...p} />;
    case "entrada": return <EntradaScreen {...p} />;
    case "login": return <LoginScreen {...p} />;
    case "cadastro": return <CadastroScreen screenData={screenData} {...p} />;
    case "login-admin": return <AdminLoginScreen {...p} />;
    case "esqueci-senha": return <EsqueciSenhaScreen {...p} />;
    case "admin-dashboard": return <AdminDashboard {...p} />;
    case "admin-usuarios": return <AdminUsuarios {...p} />;
    case "admin-motorista-teste": return <AdminMotoristaTeste {...p} />;
    case "admin-seguradoras": return <AdminSeguradorasScreen {...p} />;
    case "home-contratante": return <ContratanteHome {...p} />;
    case "solicitar-frete": return <SolicitarFreteScreen screenData={screenData} {...p} />;
    case "buscar-motoristas": return <BuscarMotoristasScreen {...p} />;
    case "meus-fretes": return <MeusFretes {...p} />;
    case "detalhe-frete": return <DetalheFrete frete={screenData} {...p} />;
    case "propostas-recebidas": return <PropostasRecebidasScreen frete={screenData} {...p} />;
    case "perfil": return <PerfilContratante {...p} />;
    case "dados-pessoais-contratante": return <DadosPessoaisContratante {...p} />;
    case "pagamentos": return <PagamentosScreen {...p} />;
    case "financas-contratante": return <FinancasContratante {...p} />;
    case "home-motorista": return <MotoristaHome {...p} />;
    case "aceitar-frete": return <AceitarFreteScreen frete={screenData} {...p} />;
    case "disponibilidade-motorista": return <DisponibilidadeScreen {...p} />;
    case "seguro-motorista": return <SeguroScreen {...p} />;
    case "convites-motorista": return <ConvitesScreen {...p} />;
    case "minhas-propostas": return <MinhasPropostasScreen {...p} />;
    case "meus-fretes-motorista": return <MeusFretesMot {...p} />;
    case "em-transito": return <EmTransitoScreen frete={screenData} {...p} />;
    case "perfil-motorista": return <PerfilMotorista {...p} />;
    case "dados-pessoais-motorista": return <DadosPessoaisMotorista {...p} />;
    case "dados-caminhao": return <DadosCaminhaoMotorista {...p} />;
    case "financas-motorista": return <FinancasMotorista {...p} />;
    case "extrato-frete-motorista": return <ExtratoFreteMotoristaScreen dados={screenData} {...p} />;
    case "chat": return <ChatScreen data={screenData} {...p} />;
    case "avaliar": return <AvaliarScreen data={screenData} {...p} />;
    case "opcoes-motorista": return <OpcoesMotorista {...p} />;
    case "opcoes-contratante": return <OpcoesContratante {...p} />;
    case "termos": return <TermosScreen {...p} />;
    case "pagamento": return <PagamentoScreen data={screenData} {...p} />;
    case "avaliacoes": return <AvaliacoesScreen {...p} />;
    case "suporte": return <SuporteScreen {...p} />;
    case "sobre": return <SobreScreen {...p} />;
    case "privacidade": return <PrivacidadeScreen {...p} />;
    case "alterar-senha": return <AlterarSenhaScreen {...p} />;
    case "notificacoes": return <NotificacoesScreen {...p} />;
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