import type {
  CommitChangeSetResponse,
  DelayRequest,
  ImpactEvent,
  OpsBoardState,
  SimulationResult,
  NotificationStatsResponse,
  PassengerNotification,
  RetryNotificationResponse,
  PassengerPortalResponse,
  PassengerManifestResponse,
  NotificationStatus
} from "@c3/shared";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : "http://127.0.0.1:3001");

export async function fetchBoardState(): Promise<OpsBoardState> {
  const res = await fetch(`${API_BASE}/board`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch board state: ${res.statusText}`);
  }
  return res.json();
}

export async function reportFlightDelay(
  flightId: string,
  dto: DelayRequest
): Promise<SimulationResult> {
  const res = await fetch(`${API_BASE}/flights/${flightId}/delay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to simulate delay: ${err}`);
  }
  return res.json();
}

export async function commitChangeSet(
  changeSetToken: string
): Promise<CommitChangeSetResponse> {
  const res = await fetch(`${API_BASE}/assignments/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changeSetToken })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to commit change set: ${err}`);
  }
  return res.json();
}

export async function fetchEventHistory(): Promise<ImpactEvent[]> {
  const res = await fetch(`${API_BASE}/events/history`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch event history: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchNotificationStats(): Promise<NotificationStatsResponse> {
  const res = await fetch(`${API_BASE}/notifications/stats`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch notification stats: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchNotifications(
  flightId?: string,
  status?: NotificationStatus
): Promise<PassengerNotification[]> {
  const params = new URLSearchParams();
  if (flightId) params.append("flightId", flightId);
  if (status) params.append("status", status);

  const res = await fetch(`${API_BASE}/notifications?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch notifications: ${res.statusText}`);
  }
  return res.json();
}

export async function retryNotification(id: string): Promise<RetryNotificationResponse> {
  const res = await fetch(`${API_BASE}/notifications/${id}/retry`, {
    method: "POST"
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to retry notification: ${err}`);
  }
  return res.json();
}

export async function fetchPassengerPortal(token: string): Promise<PassengerPortalResponse> {
  const res = await fetch(`${API_BASE}/passenger/portal/${token}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch passenger portal data: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchPassengerManifest(flightId: string): Promise<PassengerManifestResponse> {
  const res = await fetch(`${API_BASE}/passengers/manifest/${flightId}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch passenger manifest: ${res.statusText}`);
  }
  return res.json();
}

export function getWebSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return `${process.env.NEXT_PUBLIC_WS_URL}/live`;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.hostname}:3001/live`;
  }
  return "ws://127.0.0.1:3001/live";
}

