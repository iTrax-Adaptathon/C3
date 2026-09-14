"use client";

import React from "react";
import type { ImpactEvent } from "@c3/shared";
import { History, Building2, Users, Luggage, ArrowRight } from "lucide-react";

interface LiveEventFeedProps {
  events: ImpactEvent[];
}

export function LiveEventFeed({ events }: LiveEventFeedProps) {
  return (
    <div
      data-testid="live-audit-feed"
      className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-sky-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Operational Audit Trail ({events.length})
          </h2>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          Auto-Logged Reassignments
        </span>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <div className="p-6 text-center text-slate-600 text-xs font-mono">
            No propagated impact events logged yet. Trigger a delay to view cascading audit records.
          </div>
        ) : (
          events.map((event, idx) => (
            <div
              key={event.id || idx}
              data-testid={`audit-event-${event.id || idx}`}
              className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-lg text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-slate-800 text-slate-300">
                    {event.resourceType === "gate" && (
                      <Building2 className="w-3 h-3 text-sky-400" />
                    )}
                    {event.resourceType === "crew" && (
                      <Users className="w-3 h-3 text-emerald-400" />
                    )}
                    {event.resourceType === "baggage" && (
                      <Luggage className="w-3 h-3 text-amber-400" />
                    )}
                  </div>
                  <span className="font-bold text-slate-200">
                    Flight {event.affectedFlightId}
                  </span>
                </div>

                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-400">Reassigned:</span>
                <span className="text-rose-400 line-through">
                  {event.oldResourceId || "None"}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                <span className="text-emerald-400 font-semibold">
                  {event.newResourceId}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                Reason: {event.reason}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
