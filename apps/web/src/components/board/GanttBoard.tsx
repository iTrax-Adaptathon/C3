"use client";

import React, { useState } from "react";
import type { BaggageRoute, Crew, Flight, Gate, OpsBoardState } from "@c3/shared";
import { FlightCard } from "./FlightCard";
import { Building2, Users, Luggage, ShieldAlert } from "lucide-react";

interface GanttBoardProps {
  board: OpsBoardState | null;
  onSimulateDelay: (flight: Flight) => void;
}

export function GanttBoard({ board, onSimulateDelay }: GanttBoardProps) {
  const [activeTab, setActiveTab] = useState<"gates" | "crews" | "baggage">("gates");

  if (!board) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 font-mono text-sm">
        Loading airport operations board...
      </div>
    );
  }

  const crewsById = new Map<string, Crew>(board.crews.map((c) => [c.id, c]));
  const baggageByFlight = new Map<string, BaggageRoute>(
    board.baggageRoutes.map((b) => [b.flightId, b])
  );
  const gatesById = new Map<string, Gate>(board.gates.map((g) => [g.id, g]));

  // Group flights by gate
  const flightsByGate = new Map<string, Flight[]>();
  for (const g of board.gates) flightsByGate.set(g.id, []);
  for (const f of board.flights) {
    if (f.gateId && flightsByGate.has(f.gateId)) {
      flightsByGate.get(f.gateId)!.push(f);
    }
  }

  // Group flights by crew
  const flightsByCrew = new Map<string, Flight[]>();
  for (const c of board.crews) flightsByCrew.set(c.id, []);
  for (const f of board.flights) {
    if (f.crewId && flightsByCrew.has(f.crewId)) {
      flightsByCrew.get(f.crewId)!.push(f);
    }
  }

  return (
    <div className="space-y-4">
      {/* Board View Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("gates")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "gates"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Gate Allocation View ({board.gates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("crews")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "crews"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Crew Roster View ({board.crews.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("baggage")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "baggage"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            }`}
          >
            <Luggage className="w-3.5 h-3.5" />
            <span>Baggage Routing View ({board.baggageRoutes.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
          <span>Double-Booking Guard:</span>
          <span className="text-emerald-400 font-bold">100% INVARIANT ENFORCED</span>
        </div>
      </div>

      {/* Gates Column Grid */}
      {activeTab === "gates" && (
        <div
          data-testid="gate-allocation-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {board.gates.map((gate) => {
            const assignedFlights = flightsByGate.get(gate.id) || [];
            return (
              <div
                key={gate.id}
                data-testid={`gate-column-${gate.id}`}
                className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col gap-3"
              >
                {/* Gate Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white tracking-wide">
                        {gate.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-mono text-[10px]">
                        {gate.terminal}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Fits: {gate.compatibleAircraft.join(", ")}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      assignedFlights.length > 0
                        ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                        : "bg-slate-900 text-slate-500 border border-slate-800"
                    }`}
                  >
                    {assignedFlights.length} {assignedFlights.length === 1 ? "Flight" : "Flights"}
                  </span>
                </div>

                {/* Gate Flights */}
                <div className="space-y-2.5 min-h-[140px] flex flex-col justify-start">
                  {assignedFlights.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-4 border border-dashed border-slate-800 rounded-lg text-slate-600 text-xs font-mono">
                      Gate Available
                    </div>
                  ) : (
                    assignedFlights.map((flight) => (
                      <FlightCard
                        key={flight.id}
                        flight={flight}
                        gate={gate}
                        crew={flight.crewId ? crewsById.get(flight.crewId) : undefined}
                        baggage={baggageByFlight.get(flight.id)}
                        onSimulateDelay={onSimulateDelay}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Crews Column Grid */}
      {activeTab === "crews" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {board.crews.map((crew) => {
            const assignedFlights = flightsByCrew.get(crew.id) || [];
            return (
              <div
                key={crew.id}
                className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div>
                    <span className="font-bold text-white">{crew.name}</span>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Quals: {crew.qualifications.join(", ")} | {crew.currentTerminal}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                    {assignedFlights.length} Flights
                  </span>
                </div>

                <div className="space-y-2.5">
                  {assignedFlights.length === 0 ? (
                    <div className="p-4 border border-dashed border-slate-800 rounded-lg text-slate-600 text-xs font-mono text-center">
                      On Standby
                    </div>
                  ) : (
                    assignedFlights.map((flight) => (
                      <FlightCard
                        key={flight.id}
                        flight={flight}
                        gate={flight.gateId ? gatesById.get(flight.gateId) : undefined}
                        crew={crew}
                        baggage={baggageByFlight.get(flight.id)}
                        onSimulateDelay={onSimulateDelay}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Baggage Routes Grid */}
      {activeTab === "baggage" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {board.baggageRoutes.map((route) => {
            const flight = board.flights.find((f) => f.id === route.flightId);
            const gate = gatesById.get(route.sourceGateId);
            return (
              <div
                key={route.id}
                className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">
                    {flight?.flightNumber || route.flightId}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${
                      route.status === "transferring"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {route.status}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-400 font-mono">
                  <div>Source Gate: <span className="text-white font-semibold">{gate?.name || route.sourceGateId}</span></div>
                  <div>Destination: <span className="text-amber-400 font-semibold">{route.destinationCarousel}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
