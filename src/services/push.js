import { api } from "./api";

// ─── Registrar Service Worker e assinar push ──────────────────
export async function registrarPushNotifications(token) {
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
