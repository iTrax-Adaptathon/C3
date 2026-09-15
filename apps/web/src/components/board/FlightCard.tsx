"use client";

import React from "react";
import { Clock, Users, Luggage, AlertCircle } from "lucide-react";
import type { BaggageRoute, Crew, Flight, Gate } from "@c3/shared";

interface FlightCardProps {
  flight: Flight;
  gate?: Gate;
  crew?: Crew;
  baggage?: BaggageRoute;
  onSimulateDelay: (flight: Flight) => void;
}

export function FlightCard({
  flight,
  gate,
  crew,
  baggage,
  onSimulateDelay
}: FlightCardProps) {
  const isDelayed = flight.status === "delayed";
  const startStr = new Date(flight.scheduledArrival).toISOString().slice(11, 16);
  const endStr = new Date(flight.estimatedDeparture).toISOString().slice(11, 16);

  return (
    <div
      data-testid={`flight-card-${flight.id}`}
      className={`rounded-lg p-3.5 border transition-all text-xs flex flex-col justify-between gap-3 ${
        isDelayed
          ? "bg-amber-950/30 border-amber-500/50 shadow-sm shadow-amber-900/20"
          : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-white tracking-wide">
              {flight.flightNumber}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
              {flight.aircraftType}
            </span>
          </div>

          <span
            className={`px-2 py-0.5 rounded-full font-mono uppercase text-[10px] font-semibold ${
              isDelayed
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}
          >
            {flight.status}
          </span>
        </div>

        {/* Time Window */}
        <div className="flex items-center gap-1.5 text-slate-400 font-mono mt-1">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>
            {startStr} - {endStr}Z
          </span>
          {isDelayed && (
            <span className="text-amber-400 font-bold ml-auto flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              DELAYED
            </span>
          )}
        </div>

        {/* Crew and Baggage status tags */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1 text-slate-300 truncate" title={crew?.name || "No crew"}>
            <Users className="w-3 h-3 text-sky-400 flex-shrink-0" />
            <span className="truncate">{crew ? crew.name.split(" ")[0] : "Unassigned"}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300 truncate" title={`Carousel: ${baggage?.destinationCarousel || "None"}`}>
            <Luggage className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span className="truncate">{baggage ? baggage.destinationCarousel : "None"}</span>
          </div>
        </div>
      </div>

      {/* Action to simulate delay */}
      <button
        data-testid={`simulate-delay-btn-${flight.id}`}
        onClick={() => onSimulateDelay(flight)}
        className="w-full mt-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium transition-colors text-[11px] flex items-center justify-center gap-1.5 border border-slate-700/60"
      >
        <Clock className="w-3 h-3 text-amber-400" />
        <span>Simulate Delay</span>
      </button>
    </div>
  );
}
