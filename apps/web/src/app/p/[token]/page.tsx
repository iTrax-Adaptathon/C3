"use client";

import React, { useState, useEffect, use } from "react";
import type { PassengerPortalResponse, WsMessage } from "@c3/shared";
import { fetchPassengerPortal, getWebSocketUrl } from "../../../lib/api";
import {
  Plane,
  Clock,
  Building2,
  Luggage,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Footprints,
  ShieldCheck
} from "lucide-react";

export default function PassengerPortalPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<PassengerPortalResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  useEffect(() => {
    loadPortalData();
  }, [token]);

  // Establish WebSocket connection for real-time live passenger updates
  useEffect(() => {
    if (!token) return;

    let ws: WebSocket | null = null;
    try {
      const wsUrl = getWebSocketUrl();
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsLiveConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsMessage;
          if (msg.type === "BOARD_STATE" || msg.type === "NOTIFICATION_UPDATE") {
            // Re-fetch portal data to get updated flight/gate state instantly
            loadPortalData(false);
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        setIsLiveConnected(false);
      };

      ws.onerror = () => {
        setIsLiveConnected(false);
      };
    } catch {
      setIsLiveConnected(false);
    }

    // Polling fallback every 8 seconds
    const interval = setInterval(() => loadPortalData(false), 8000);

    return () => {
      if (ws) ws.close();
      clearInterval(interval);
    };
  }, [token]);

  const loadPortalData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const res = await fetchPassengerPortal(token);
      setData(res);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || "Unable to load flight portal");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-400 font-mono text-xs gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
        <span>Loading live flight portal...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 inline-block">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white">Invalid or Expired Link</h2>
          <p className="text-xs text-slate-400">{error || "Passenger record not found."}</p>
          <button
            onClick={() => loadPortalData()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const { passenger, flight, gate, baggageRoute, latestNotification, connectingFlight, missedConnectionRisk } = data;
  const changes = latestNotification?.changes;

  const departureTimeStr = new Date(flight.estimatedDeparture).toISOString().substring(11, 16) + "Z";
  const isDelayed = flight.status === "delayed" || new Date(flight.estimatedDeparture).getTime() > new Date(flight.scheduledDeparture).getTime();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 font-sans">
      <main className="w-full max-w-md space-y-4">
        {/* Header Badge */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-sky-500/10 rounded border border-sky-500/30 text-sky-400">
              <Plane className="w-4 h-4" />
            </div>
            <span className="font-bold text-white">SkyOps Passenger Portal</span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px]">
            <span className={`w-2 h-2 rounded-full ${isLiveConnected ? "bg-emerald-400 animate-ping" : "bg-slate-600"}`} />
            <span className="text-slate-400">{isLiveConnected ? "LIVE UPDATES" : "POLLING"}</span>
          </div>
        </div>

        {/* Passenger Welcome Card */}
        <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Passenger</span>
              <h1 className="text-lg font-bold text-white">{passenger.name}</h1>
            </div>
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-400 uppercase block">Seat</span>
              <span className="text-base font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {passenger.seatNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-mono pt-1">
            <span className="text-slate-400">Ref: <span className="text-white">{passenger.bookingReference}</span></span>
            <span className="text-slate-400">Flight: <span className="text-white font-bold">{flight.flightNumber}</span></span>
          </div>
        </div>

        {/* Flight Status Live Overview Card */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white font-mono">{flight.flightNumber}</h2>
              <span className="text-xs text-slate-400 font-mono">({flight.aircraftType})</span>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
                isDelayed
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {isDelayed ? "FLIGHT UPDATED" : flight.status.toUpperCase()}
            </span>
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Departure */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Departure</span>
              </div>
              <div className="text-lg font-bold text-white font-mono">{departureTimeStr}</div>
              {changes?.departureChanged && changes.delayMinutes && changes.delayMinutes > 0 && (
                <span className="text-[10px] text-amber-400 font-mono font-bold block">
                  (+{changes.delayMinutes}m delay)
                </span>
              )}
            </div>

            {/* Terminal */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Terminal</span>
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {gate?.terminal || "TBD"}
              </div>
              {changes?.terminalChanged && (
                <span className="text-[10px] text-sky-400 font-mono font-bold block">
                  (New Terminal)
                </span>
              )}
            </div>

            {/* Gate */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gate</span>
              </div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {gate?.name || "TBD"}
              </div>
              {changes?.gateChanged && (
                <span className="text-[10px] text-emerald-400 font-mono font-bold block">
                  (Reassigned)
                </span>
              )}
            </div>

            {/* Baggage */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Luggage className="w-3.5 h-3.5 text-purple-400" />
                <span>Baggage</span>
              </div>
              <div className="text-base font-bold text-white font-mono truncate">
                {baggageRoute?.destinationCarousel || "Carousel 1"}
              </div>
              {changes?.baggageChanged && (
                <span className="text-[10px] text-purple-400 font-mono font-bold block">
                  (Redirected)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* "What Changed?" Diff Panel */}
        {changes && (changes.departureChanged || changes.gateChanged || changes.terminalChanged || changes.baggageChanged) && (
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              What Changed?
            </h3>

            <div className="space-y-2 text-xs font-mono">
              {changes.departureChanged && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">Departure</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 line-through">
                      {changes.oldDeparture ? new Date(changes.oldDeparture).toISOString().substring(11, 16) + "Z" : "Scheduled"}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span className="text-amber-400 font-bold">
                      {changes.newDeparture ? new Date(changes.newDeparture).toISOString().substring(11, 16) + "Z" : departureTimeStr}
                    </span>
                  </div>
                </div>
              )}

              {changes.terminalChanged && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">Terminal</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 line-through">{changes.oldTerminal || "T1"}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span className="text-sky-400 font-bold">{changes.newTerminal}</span>
                  </div>
                </div>
              )}

              {changes.gateChanged && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">Gate</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 line-through">{changes.oldGate || "A1"}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span className="text-emerald-400 font-bold">{changes.newGate}</span>
                  </div>
                </div>
              )}

              {changes.baggageChanged && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">Baggage</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 line-through">{changes.oldBaggage || "Carousel 4"}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span className="text-purple-400 font-bold">{changes.newBaggage}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Passenger Guidance Card */}
        {changes?.terminalChanged && (
          <div className="p-5 bg-sky-950/40 border border-sky-800/60 rounded-2xl space-y-2 shadow-xl">
            <h3 className="text-xs font-bold text-sky-300 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Footprints className="w-4 h-4 text-sky-400" />
              Terminal Transfer Guidance
            </h3>
            <p className="text-xs text-sky-200 leading-relaxed font-sans">
              Your terminal changed from <span className="font-bold text-white font-mono">{changes.oldTerminal}</span> to{" "}
              <span className="font-bold text-white font-mono">{changes.newTerminal}</span>.
            </p>
            <div className="p-3 bg-slate-950/80 border border-sky-800/40 rounded-xl flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400">Estimated Walking Transfer:</span>
              <span className="font-bold text-sky-300">~{changes.transferTimeMinutes || 10} minutes</span>
            </div>
          </div>
        )}

        {/* Missed Connection Alert for Passenger if at risk */}
        {connectingFlight && missedConnectionRisk !== "NONE" && (
          <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Connecting Flight Alert</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                {missedConnectionRisk} RISK
              </span>
            </div>
            <p className="text-slate-300 font-sans">
              Connecting flight <span className="font-bold text-white font-mono">{connectingFlight.flightNumber}</span> departs at{" "}
              <span className="font-mono text-amber-300">{new Date(connectingFlight.estimatedDeparture).toISOString().substring(11, 16)}Z</span>.
              Please contact airport ground staff upon arrival for priority transit assistance.
            </p>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-500 font-mono pt-4 space-y-1">
          <div className="flex items-center justify-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted Token Verification Passed</span>
          </div>
          <p>Updated: {lastUpdated.toLocaleTimeString()}</p>
        </div>
      </main>
    </div>
  );
}
