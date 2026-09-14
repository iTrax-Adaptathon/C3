"use client";

import React from "react";
import { Plane, Radio, AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import type { OpsBoardState } from "@c3/shared";

interface HeaderProps {
  board: OpsBoardState | null;
  isConnected: boolean;
}

export function Header({ board, isConnected }: HeaderProps) {
  const flightCount = board?.flights.length || 0;
  const delayedCount =
    board?.flights.filter((f) => f.status === "delayed").length || 0;
  const gateCount = board?.gates.length || 0;

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Brand & System Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                C3 Airport Operations Console
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-sky-950 border border-sky-700/50 text-sky-300">
                JFK Terminal Ops
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Autonomous Dynamic Reassignment & Invariant Enforcement
            </p>
          </div>
        </div>

        {/* Live System Metrics & Connection Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Scheduled Flights:</span>
            <span className="text-white font-semibold">{flightCount}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Delays Active:</span>
            <span className="text-amber-400 font-semibold">{delayedCount}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Gates Managed:</span>
            <span className="text-white font-semibold">{gateCount}</span>
          </div>

          {/* WebSocket Status Indicator */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono transition-colors ${
              isConnected
                ? "bg-emerald-950/40 border-emerald-700/60 text-emerald-400"
                : "bg-rose-950/40 border-rose-700/60 text-rose-400 animate-pulse"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isConnected ? "LIVE STREAM ACTIVE" : "RECONNECTING..."}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
