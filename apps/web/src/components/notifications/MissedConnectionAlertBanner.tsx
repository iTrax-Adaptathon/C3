"use client";

import React from "react";
import type { OpsBoardState } from "@c3/shared";
import { AlertTriangle, Plane, ArrowRight } from "lucide-react";

interface MissedConnectionAlertBannerProps {
  board: OpsBoardState | null;
  onOpenManifest?: (flightId: string) => void;
}

export function MissedConnectionAlertBanner({
  board,
  onOpenManifest
}: MissedConnectionAlertBannerProps) {
  if (!board) return null;

  // Evaluate flight delays and connecting risks
  const delayedFlights = board.flights.filter((f) => f.status === "delayed" || new Date(f.estimatedDeparture).getTime() > new Date(f.scheduledDeparture).getTime());

  if (delayedFlights.length === 0) return null;

  return (
    <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span>MISSED-CONNECTION RISK ALERT: Flight Delays Active</span>
        </div>
        <span className="text-[10px] font-mono text-amber-500/80 uppercase">
          Autonomous Operational Risk Monitor
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {delayedFlights.map((flight) => {
          const delayMinutes = Math.round(
            (new Date(flight.estimatedDeparture).getTime() - new Date(flight.scheduledDeparture).getTime()) / (1000 * 60)
          );

          return (
            <div
              key={flight.id}
              onClick={() => onOpenManifest?.(flight.id)}
              className="p-2.5 bg-slate-950/80 border border-amber-500/30 rounded-lg hover:border-amber-400 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <Plane className="w-3.5 h-3.5 text-amber-400" />
                  <span>{flight.flightNumber}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded">
                    +{delayMinutes}m delay
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Click to inspect passenger manifest & connection risks
                </p>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
