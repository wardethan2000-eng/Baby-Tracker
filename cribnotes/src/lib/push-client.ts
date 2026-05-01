"use client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

type PushDiagnostic = {
  supported: boolean;
  notificationPermission: NotificationPermission | "unavailable";
  hasController: boolean;
  registrationScope: string | null;
  activeState: string | null;
  installingState: string | null;
  waitingState: string | null;
  standalone: boolean;
  userAgent: string;
};

function isStandaloneDisplay() {
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in window.navigator && Boolean((window.navigator as any).standalone));
}

async function waitForActiveRegistration(registration: ServiceWorkerRegistration) {
  if (registration.active) return registration;

  const installingWorker = registration.installing || registration.waiting;
  if (!installingWorker) {
    return Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("Service worker setup timed out. Close and reopen the installed app, then try again.")), 30000);
      }),
    ]);
  }

  if (installingWorker.state === "activated") {
    return registration;
  }

  if (installingWorker.state === "installed" && !registration.active) {
    installingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Service worker setup timed out. Close and reopen the installed app, then try again."));
    }, 30000);

    installingWorker.addEventListener("statechange", () => {
      if (installingWorker.state === "redundant") {
        window.clearTimeout(timeout);
        reject(new Error("Service worker setup was interrupted. Refresh the app and try again."));
      }

      if (installingWorker.state === "activated") {
        window.clearTimeout(timeout);
        resolve();
      }
    });
  });

  return registration;
}

async function getReadyRegistration() {
  await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  const registration = await navigator.serviceWorker.ready;
  registration.update().catch(() => undefined);
  return waitForActiveRegistration(registration);
}

export function isPushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export async function subscribeToPush(publicKey: string) {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported on this device.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  try {
    const registration = await getReadyRegistration();
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;

    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  } catch (error: any) {
    const details = await getPushDiagnostics().catch(() => null);
    const state = details
      ? ` active=${details.activeState || "none"} waiting=${details.waitingState || "none"} installing=${details.installingState || "none"} standalone=${details.standalone}`
      : "";
    throw new Error(`${error?.name ? `${error.name}: ` : ""}${error?.message || "Could not subscribe this device to push notifications."}${state}`);
  }
}

export async function getPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await getReadyRegistration();
  return registration.pushManager.getSubscription();
}

export async function getPushDiagnostics(): Promise<PushDiagnostic> {
  if (!isPushSupported()) {
    return {
      supported: false,
      notificationPermission: "Notification" in window ? Notification.permission : "unavailable",
      hasController: Boolean(navigator.serviceWorker?.controller),
      registrationScope: null,
      activeState: null,
      installingState: null,
      waitingState: null,
      standalone: isStandaloneDisplay(),
      userAgent: window.navigator.userAgent,
    };
  }

  const registration = await navigator.serviceWorker.getRegistration("/");
  return {
    supported: true,
    notificationPermission: Notification.permission,
    hasController: Boolean(navigator.serviceWorker.controller),
    registrationScope: registration?.scope || null,
    activeState: registration?.active?.state || null,
    installingState: registration?.installing?.state || null,
    waitingState: registration?.waiting?.state || null,
    standalone: isStandaloneDisplay(),
    userAgent: window.navigator.userAgent,
  };
}
