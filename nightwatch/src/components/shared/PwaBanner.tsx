"use client";

import { useState, useEffect } from "react";
import { Download, Share, X } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const pwaBannerDismissed = useAppStore((s) => s.pwaBannerDismissed);
  const dismissPwaBanner = useAppStore((s) => s.dismissPwaBanner);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && Boolean(window.navigator.standalone));

    if (standalone) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isiOS = /iphone|ipad|ipod/.test(ua);
    setIsIos(isiOS);

    if (isiOS) {
      if (!pwaBannerDismissed) setIsVisible(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (!pwaBannerDismissed) setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, [pwaBannerDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    dismissPwaBanner();
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") {
      handleDismiss();
    }
  };

  if (!isVisible || (!deferredPrompt && !isIos)) return null;

  return (
    <div className="bg-elevated text-text-secondary px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {isIos ? <Share size={18} className="text-primary shrink-0" /> : <Download size={18} className="text-primary shrink-0" />}
        <p className="text-sm">
          {isIos ? "Use Share, then Add to Home Screen." : "Install NightWatch on this device."}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {deferredPrompt && (
          <button onClick={handleInstall} className="text-primary text-sm font-medium">
            Install
          </button>
        )}
        <button onClick={handleDismiss} className="text-text-muted hover:text-primary">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
