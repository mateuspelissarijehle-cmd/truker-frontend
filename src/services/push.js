import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { api } from "./api";

const isNative = Capacitor.isNativePlatform();

// ─── Entrada única — escolhe o canal certo pela plataforma ────
// Nativo (app empacotado Android/iOS): Firebase Cloud Messaging via
// @capacitor/push-notifications. Navegador/PWA: Web Push (VAPID) padrão,
// inalterado. Mesmo padrão de src/services/geolocation.js.
export async function registrarPushNotifications(token) {
  if (isNative) return registrarPushNotificationsNativo(token);
  return registrarPushNotificationsWeb(token);
}

// ─── Nativo (FCM) ──────────────────────────────────────────
let authTokenAtual = null;
let listenersNativosRegistrados = false;

function registrarListenersNativos() {
  if (listenersNativosRegistrados) return;
  listenersNativosRegistrados = true;

  // Dispara depois de PushNotifications.register() -- token.value é o device
  // token do FCM. authTokenAtual é atualizado a cada chamada de
  // registrarPushNotificationsNativo, então o listener sempre manda pro
  // usuário logado no momento (não fecha sobre um token de sessão antigo).
  PushNotifications.addListener("registration", async (token) => {
    console.log("[TRUKER] FCM token obtido:", token.value.slice(0, 20) + "...");
    try {
      await api("POST", "/api/push/subscribe-fcm", { token: token.value }, authTokenAtual);
    } catch (err) {
      console.error("[TRUKER] Falha ao enviar FCM token pro backend:", err);
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("[TRUKER] Erro ao registrar push nativo:", err);
  });

  // App em primeiro plano: o SO não mostra notificação sozinho, só loga por
  // enquanto (a tela já está aberta, o usuário vê a mudança direto na UI).
  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("[TRUKER] Push recebido em foreground:", notification);
  });

  // Usuário tocou na notificação (app em segundo plano ou fechado) -- mesmo
  // comportamento do notificationclick em public/sw.js na web.
  PushNotifications.addListener("pushNotificationActionPerformed", (acao) => {
    const url = acao.notification?.data?.url;
    if (url) window.location.href = url;
  });
}

async function registrarPushNotificationsNativo(token) {
  authTokenAtual = token;
  registrarListenersNativos();
  try {
    let permissao = await PushNotifications.checkPermissions();
    if (permissao.receive !== "granted") {
      permissao = await PushNotifications.requestPermissions();
    }
    if (permissao.receive !== "granted") {
      console.warn("[TRUKER] Permissão de notificação nativa negada");
      return;
    }
    await PushNotifications.register();
  } catch (err) {
    console.error("[TRUKER] Push nativo registration error:", err);
  }
}

// ─── Navegador/PWA (Web Push / VAPID) — inalterado ────────────
async function registrarPushNotificationsWeb(token) {
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
    // Chave pública buscada do backend (não hardcoded) -- fonte única de
    // verdade é o VAPID_PUBLIC_KEY do .env do servidor, evita divergência
    // silenciosa se a chave rotacionar um dia.
    const { key: vapidPublicKey } = await api("GET", "/api/push/vapid-public-key");
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    await api("POST", "/api/push/subscribe", { subscription: sub.toJSON() }, token);
    console.log("[TRUKER] Push subscrito:", sub.endpoint);
  } catch (err) {
    console.error("[TRUKER] Push registration error:", err);
  }
}

export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
