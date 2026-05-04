import { EventEmitter } from "events";

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

export type BroadcastEventType =
  | "log-create"
  | "log-update"
  | "log-delete"
  | "log-restore"
  | "timer-start"
  | "timer-stop";

export interface BroadcastEvent {
  type: BroadcastEventType;
  childId: string;
  logId: string;
  logType: string;
  userId: string;
  userName: string;
}

export function broadcastEvent(event: BroadcastEvent) {
  emitter.emit(`child:${event.childId}`, event);
}

export function subscribeToChild(childId: string, listener: (event: BroadcastEvent) => void) {
  const channel = `child:${childId}`;
  emitter.on(channel, listener);
  return () => {
    emitter.off(channel, listener);
  };
}