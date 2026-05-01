const isBrowser = typeof window !== "undefined";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function timeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} (${ms}ms)`)), ms)
    ),
  ]);
}

export function isPushSupported() {
  if (!isBrowser) return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function subscribeToPush(
  publicKey: string,
  permissionPromise?: Promise<NotificationPermission>
): Promise<PushSubscription> {
  if (!isBrowser) {
    throw new Error("Not in browser");
  }
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported on this device.");
  }

  const permission = await timeout(
    permissionPromise || Notification.requestPermission(),
    30000,
    "Notification permission prompt did not complete"
  );
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await timeout(
    navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    }),
    30000,
    "Service worker registration timed out"
  );

  await timeout(
    navigator.serviceWorker.ready,
    30000,
    "Service worker did not activate"
  );

  registration.update().catch(() => {});

  const existing = await registration.pushManager.getSubscription().catch(() => null);
  if (existing) {
    return existing;
  }

  return await timeout(
    registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }),
    30000,
    "Push subscription timed out"
  );
}

export async function getPushDiagnostics() {
  if (!isBrowser) return { error: "Not in browser" };
  if (!isPushSupported()) return { error: "Push not supported" };

  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    return {
      registrationExists: !!reg,
      active: !!reg?.active,
      activeState: reg?.active?.state || "none",
      installing: !!reg?.installing,
      installingState: reg?.installing?.state || "none",
      waiting: !!reg?.waiting,
      waitingState: reg?.waiting?.state || "none",
      controller: !!navigator.serviceWorker.controller,
      controllerState: navigator.serviceWorker.controller?.state || "none",
      notificationPermission: Notification.permission,
      scope: reg?.scope || "none",
    };
  } catch (e: any) {
    return { error: e.message };
  }
}
