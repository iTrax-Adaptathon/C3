"use client";

import React, { useState } from "react";
import type { Flight, SimulationResult } from "@c3/shared";
import { commitChangeSet, reportFlightDelay } from "../../lib/api";
import {
  X,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Luggage,
  Building2,
  Users
} from "lucide-react";

interface DelayModalProps {
  flight: Flight;
  onClose: () => void;
  onCommitSuccess: () => void;
}

export function DelayModal({
  flight,
  onClose,
  onCommitSuccess
}: DelayModalProps) {
  const [delayMinutes, setDelayMinutes] = useState<number>(60);
  const [reason, setReason] = useState<string>("Inbound weather / ATC ground stop");
  const [preview, setPreview] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const presets = [15, 30, 45, 60, 90, 120];

  const handleSimulate = async () => {
    try {
      setIsSimulating(true);
      setError(null);
      const res = await reportFlightDelay(flight.id, { delayMinutes, reason });
      setPreview(res);
    } catch (err: any) {
      setError(err.message || "Failed to simulate delay");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    try {
      setIsCommitting(true);
      setError(null);
      await commitChangeSet(preview.changeSetToken);
      onCommitSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to commit changes");
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        data-testid="delay-simulation-modal"
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Simulate Flight Delay: {flight.flightNumber}
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {flight.aircraftType}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Evaluates multi-hop downstream gate, crew, and baggage knock-on effects
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Delay Input Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Delay Duration: <span className="text-amber-400 text-sm">{delayMinutes} Minutes</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {presets.map((min) => (
                <button
                  key={min}
                  type="button"
                  data-testid={`preset-delay-${min}`}
                  onClick={() => setDelayMinutes(min)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                    delayMinutes === min
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  +{min}m
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Delay Reason
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Inbound aircraft late arrival, maintenance check..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="button"
              data-testid="run-simulation-btn"
              onClick={handleSimulate}
              disabled={isSimulating}
              className="w-full mt-2 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2"
            >
              {isSimulating ? (
                <span>Simulating Graph Propagation...</span>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Compute Cascading Knock-On Preview</span>
                </>
              )}
            </button>
          </div>

          {/* Simulation Preview Output */}
          {preview && (
            <div
              data-testid="simulation-preview-panel"
              className="space-y-4 pt-4 border-t border-slate-800"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Propagation Plan Computed ({preview.impactEvents.length} Impacts)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Token: {preview.changeSetToken}
                </span>
              </div>

              <div className="p-3 bg-sky-950/40 border border-sky-500/30 rounded-xl text-xs text-sky-200 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span>📱 Automated Passenger SMS Dispatch:</span>
                  <span className="text-sky-300">Active</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Smart SMS will be sent to affected passengers on Commit
                </span>
              </div>


              {preview.hasUnresolvableConflicts && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-500/50 rounded-xl text-rose-200 text-xs">
                  <div className="font-bold flex items-center gap-1.5 text-rose-400 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    Unresolvable Conflict Detected
                  </div>
                  <p>{preview.unresolvableReason}</p>
                </div>
              )}

              {/* Impact Events List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {preview.impactEvents.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                    No downstream flights bumped. The flight can hold its existing gate without conflict.
                  </div>
                ) : (
                  preview.impactEvents.map((event, idx) => (
                    <div
                      key={idx}
                      data-testid={`impact-event-${idx}`}
                      className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs flex items-start gap-3"
                    >
                      <div className="p-1.5 rounded bg-slate-900 text-slate-300 mt-0.5">
                        {event.resourceType === "gate" && (
                          <Building2 className="w-3.5 h-3.5 text-sky-400" />
                        )}
                        {event.resourceType === "crew" && (
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        {event.resourceType === "baggage" && (
                          <Luggage className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">
                            {event.resourceType.toUpperCase()} REASSIGNMENT
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Flight: {event.affectedFlightId}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
                          <span className="text-rose-400 line-through">
                            {event.oldResourceId || "None"}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="text-emerald-400 font-bold">
                            {event.newResourceId}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400">{event.reason}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Discard
          </button>

          {preview && (
            <button
              type="button"
              data-testid="confirm-commit-btn"
              onClick={handleCommit}
              disabled={isCommitting || preview.hasUnresolvableConflicts}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              {isCommitting ? (
                <span>Committing Under Lock...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Commit Changes</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
