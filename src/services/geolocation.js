import { Capacitor, registerPlugin } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

// @capacitor-community/background-geolocation não publica um bundle JS —
// o próprio README do plugin manda registrar assim manualmente.
const BackgroundGeolocation = registerPlugin("BackgroundGeolocation");

const isNative = Capacitor.isNativePlatform();

// ─────────────────────────────────────────────
// Rastreamento contínuo (watch). No app nativo usa o
// @capacitor-community/background-geolocation, que mantém o GPS ativo com o
// app em segundo plano/tela apagada (foreground service + notificação
// persistente no Android — exigência do próprio Android, não opcional).
// No navegador/PWA usa @capacitor/geolocation, que por baixo dos panos chama
// a Geolocation API padrão — só funciona com a aba em primeiro plano.
// ─────────────────────────────────────────────
export async function watchPosition(onPosition, onError) {
  if (isNative) {
    const id = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: "O TRUKER está rastreando sua localização durante a viagem.",
        backgroundTitle: "TRUKER — rastreamento ativo",
        requestPermissions: true,
        stale: false,
        distanceFilter: 30,
      },
      (location, error) => {
        if (error) { onError?.(error); return; }
        if (location) onPosition({ lat: location.latitude, lng: location.longitude });
      }
    );
    return { native: true, id };
  }

  const id = await Geolocation.watchPosition(
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 },
    (pos, err) => {
      if (err) { onError?.(err); return; }
      if (pos) onPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }
  );
  return { native: false, id };
}

export async function clearWatch(handle) {
  if (!handle) return;
  try {
    if (handle.native) await BackgroundGeolocation.removeWatcher({ id: handle.id });
    else await Geolocation.clearWatch({ id: handle.id });
  } catch (e) { console.error("clearWatch:", e.message); }
}

// ─────────────────────────────────────────────
// Captura pontual (não contínua). Funciona igual no nativo e no navegador.
// Timeout redundante por fora porque getCurrentPosition às vezes trava (nem
// resolve nem rejeita) em WebViews Android com localização desligada.
// ─────────────────────────────────────────────
export async function getCurrentPosition({ timeoutMs = 7000 } = {}) {
  return Promise.race([
    Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: Math.max(timeoutMs - 1000, 1000), maximumAge: 0 })
      .then(pos => ({ lat: pos.coords.latitude, lng: pos.coords.longitude })),
    new Promise((_, reject) => setTimeout(() => reject(new Error("GPS timeout")), timeoutMs)),
  ]);
}
