// ─────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────
export const css = `
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
  .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--orange); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
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
  .carga-item { background: var(--dark3); border: 1px solid var(--border); border-radius: 10px; padding: 10px; cursor: pointer; transition: all 0.15s; text-align: center; }
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
