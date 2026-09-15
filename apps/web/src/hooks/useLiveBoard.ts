"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { ImpactEvent, OpsBoardState } from "@c3/shared";
import { fetchBoardState, getWebSocketUrl } from "../lib/api";

export function useLiveBoard() {
  const [board, setBoard] = useState<OpsBoardState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [impactEvents, setImpactEvents] = useState<ImpactEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchBoardState();
      setBoard(data);
      if (data.recentImpactEvents) {
        setImpactEvents(data.recentImpactEvents);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load board state");
    } finally {
      setLoading(false);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    try {
      const url = getWebSocketUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "BOARD_STATE") {
            setBoard(msg.payload);
            if (msg.payload.recentImpactEvents) {
              setImpactEvents(msg.payload.recentImpactEvents);
            }
          } else if (msg.type === "IMPACT_ALERT") {
            setImpactEvents((prev) => [msg.payload, ...prev.slice(0, 49)]);
          }
        } catch {
          // ignore non-json
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Reconnect after 3s
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [loadInitial, connectWebSocket]);

  return {
    board,
    loading,
    error,
    isConnected,
    impactEvents,
    refresh: loadInitial
  };
}
