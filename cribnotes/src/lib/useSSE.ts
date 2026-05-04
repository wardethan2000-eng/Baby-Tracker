"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const LOG_TYPE_LABELS: Record<string, string> = {
  WAKE: "woke up",
  SLEEP: "fell asleep",
  FEED: "a feed",
  DIAPER: "a diaper change",
  NURSE: "nursing",
  PUMP: "pumping",
};

const TIMER_TYPE_LABELS: Record<string, string> = {
  SLEEP: "a sleep timer",
  NURSE: "a nursing timer",
  PUMP: "a pumping timer",
};

export function useSSE(childId: string | null) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEvent = useCallback((eventType: string, eventData: string) => {
    if (!childId) return;
    const data = JSON.parse(eventData);

    queryClient.invalidateQueries({ queryKey: ["logs", childId] });

    if (eventType === "log-create" || eventType === "timer-start" || eventType === "timer-stop") {
      queryClient.invalidateQueries({ queryKey: ["timers", childId] });
    }

    if (data.userId && data.userId !== session?.user?.id) {
      const name = data.userName || "Someone";
      let message = "";

      if (eventType === "timer-start" && data.logType && TIMER_TYPE_LABELS[data.logType]) {
        message = `${name} started ${TIMER_TYPE_LABELS[data.logType]}`;
      } else if (eventType === "timer-stop") {
        if (data.logType === "SLEEP") message = `${name} stopped the sleep timer`;
        else if (data.logType === "NURSE") message = `${name} stopped nursing`;
        else if (data.logType === "PUMP") message = `${name} stopped pumping`;
      } else if (data.logType && LOG_TYPE_LABELS[data.logType]) {
        message = `${name} logged ${LOG_TYPE_LABELS[data.logType]}`;
      }

      if (message) {
        toast(message, { duration: 3000 });
      }
    }
  }, [childId, queryClient, session?.user?.id]);

  const connect = useCallback(() => {
    if (!childId) return;

    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource(`/api/events?childId=${childId}`);
    esRef.current = es;

    es.addEventListener("connected", () => {
      retryRef.current = 0;
      queryClient.invalidateQueries({ queryKey: ["logs", childId] });
      queryClient.invalidateQueries({ queryKey: ["timers", childId] });
      queryClient.invalidateQueries({ queryKey: ["notes", childId] });
    });

    es.addEventListener("log-create", (e: MessageEvent) => handleEvent("log-create", e.data));
    es.addEventListener("log-update", (e: MessageEvent) => handleEvent("log-update", e.data));
    es.addEventListener("log-delete", (e: MessageEvent) => handleEvent("log-delete", e.data));
    es.addEventListener("log-restore", (e: MessageEvent) => handleEvent("log-restore", e.data));
    es.addEventListener("timer-start", (e: MessageEvent) => handleEvent("timer-start", e.data));
    es.addEventListener("timer-stop", (e: MessageEvent) => handleEvent("timer-stop", e.data));

    es.onerror = () => {
      es.close();
      esRef.current = null;
      const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30_000);
      retryRef.current += 1;
      retryTimerRef.current = setTimeout(connect, delay);
    };
  }, [childId, handleEvent, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [connect]);
}