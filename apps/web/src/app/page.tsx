"use client";

import React, { useState } from "react";
import type { Flight } from "@c3/shared";
import { useLiveBoard } from "../hooks/useLiveBoard";
import { Header } from "../components/Header";
import { GanttBoard } from "../components/board/GanttBoard";
import { DelayModal } from "../components/simulation/DelayModal";
import { LiveEventFeed } from "../components/events/LiveEventFeed";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function OperationsConsolePage() {
  const { board, loading, error, isConnected, impactEvents, refresh } =
    useLiveBoard();
  const [selectedFlightForDelay, setSelectedFlightForDelay] =
    useState<Flight | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Top Operations Header */}
      <Header board={board} isConnected={isConnected} />

      {/* Main Operations Container */}
      <main className="flex-1 p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {error && (
          <div className="p-4 bg-rose-950/50 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={refresh}
              className="px-3 py-1 bg-rose-900/60 hover:bg-rose-900 rounded text-rose-100 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </div>
        )}

        {loading && !board ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-500 font-mono text-sm gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
            <span>Synchronizing airport operational state...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Primary Gantt / Allocation Grid (3 Cols) */}
            <div className="lg:col-span-3 space-y-4">
              <GanttBoard
                board={board}
                onSimulateDelay={(flight) => setSelectedFlightForDelay(flight)}
              />
            </div>

            {/* Real-Time Audit Log Stream (1 Col) */}
            <div className="lg:col-span-1 space-y-4">
              <LiveEventFeed events={impactEvents} />
            </div>
          </div>
        )}
      </main>

      {/* Delay Simulation & Impact Preview Modal */}
      {selectedFlightForDelay && (
        <DelayModal
          flight={selectedFlightForDelay}
          onClose={() => setSelectedFlightForDelay(null)}
          onCommitSuccess={() => {
            refresh();
          }}
        />
      )}
    </div>
  );
}
