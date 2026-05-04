import { EventEmitter } from "events";

const localEmitter = new EventEmitter();
localEmitter.setMaxListeners(100);

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
  localEmitter.emit(`child:${event.childId}`, event);
}

export function subscribeToChild(childId: string, listener: (event: BroadcastEvent) => void) {
  const channel = `child:${childId}`;
  localEmitter.on(channel, listener);
  return () => {
    localEmitter.off(channel, listener);
  };
}