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

async function waitForActiveRegistration(registration: ServiceWorkerRegistration) {
  if (registration.active) return registration;

  const installingWorker = registration.installing || registration.waiting;
  if (!installingWorker) return navigator.serviceWorker.ready;

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Service worker setup timed out. Refresh the app and try again."));
    }, 10000);

    installingWorker.addEventListener("statechange", () => {
      if (installingWorker.state === "activated") {
        window.clearTimeout(timeout);
        resolve();
      }
    });
  });

  return registration;
}

async function getReadyRegistration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  const registration = existing || await navigator.serviceWorker.register("/sw.js", { scope: "/" });

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

  const registration = await getReadyRegistration();
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

export async function getPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await getReadyRegistration();
  return registration.pushManager.getSubscription();
}
