"use client";

import React, { useState, useEffect } from "react";
import type { PassengerNotification, NotificationStatsResponse, NotificationStatus } from "@c3/shared";
import { fetchNotifications, fetchNotificationStats, retryNotification } from "../../lib/api";
import { NotificationDetailModal } from "./NotificationDetailModal";
import {
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCw,
  Search,
  Filter,
  ExternalLink,
  RefreshCw,
  Send
} from "lucide-react";

interface PassengerNotificationConsoleProps {
  onOpenManifest?: (flightId: string) => void;
}

export function PassengerNotificationConsole({
  onOpenManifest
}: PassengerNotificationConsoleProps) {
  const [stats, setStats] = useState<NotificationStatsResponse | null>(null);
  const [notifications, setNotifications] = useState<PassengerNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNotif, setSelectedNotif] = useState<PassengerNotification | null>(null);
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const loadData = async () => {
    try {
      const statsRes = await fetchNotificationStats();
      setStats(statsRes);

      const filterStatus = statusFilter === "ALL" ? undefined : statusFilter;
      const notifsRes = await fetchNotifications(undefined, filterStatus);
      setNotifications(notifsRes);
    } catch (err) {
      // ignore periodic polling errors silently
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySingle = async (e: React.MouseEvent, notif: PassengerNotification) => {
    e.stopPropagation();
    try {
      setRetryingId(notif.id);
      await retryNotification(notif.id);
      await loadData();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  const filteredNotifs = notifications.filter(
    (n) =>
      n.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.messageBody.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      {/* Console Header & Live Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Automated Passenger SMS Dispatch Console
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                LIVE DISPATCH
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Real-time audit log of SMS notifications triggered by dispatcher operational commits
            </p>
          </div>
        </div>

        {/* Stats Pill Badges */}
        {stats && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-1.5">
              <span className="text-slate-500">Total:</span>
              <span className="font-bold text-white">{stats.total}</span>
            </div>
            <div className="px-3 py-1.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Delivered:</span>
              <span className="font-bold">{stats.delivered}</span>
            </div>
            <div className="px-3 py-1.5 bg-sky-950/40 border border-sky-800/60 rounded-lg flex items-center gap-1.5 text-sky-400">
              <Send className="w-3.5 h-3.5" />
              <span>Sent:</span>
              <span className="font-bold">{stats.sent}</span>
            </div>
            <div className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${stats.failed > 0 ? "bg-rose-950/60 border border-rose-600/60 text-rose-400" : "bg-slate-950 border border-slate-800 text-slate-400"}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Failed:</span>
              <span className="font-bold">{stats.failed}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search passenger, flight AA101, or SMS text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filter Presets */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {(["ALL", "DELIVERED", "SENT", "FAILED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? "bg-sky-600 text-white font-bold shadow-md shadow-sky-600/20"
                  : "bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh Notification Log"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications Audit List */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-4 py-2.5">Passenger</th>
              <th className="px-4 py-2.5">Flight</th>
              <th className="px-4 py-2.5">Change Summary</th>
              <th className="px-4 py-2.5">Dispatched SMS</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredNotifs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                  {notifications.length === 0
                    ? "No SMS notifications dispatched yet. Execute a flight delay 'Confirm & Commit' above to trigger automated passenger SMS notifications."
                    : "No notifications match current filter criteria."}
                </td>
              </tr>
            ) : (
              filteredNotifs.map((n) => {
                const changesSummary = [
                  n.changes.departureChanged ? "Departure" : null,
                  n.changes.gateChanged ? `Gate → ${n.changes.newGate}` : null,
                  n.changes.terminalChanged ? `Term → ${n.changes.newTerminal}` : null,
                  n.changes.baggageChanged ? `Baggage → ${n.changes.newBaggage}` : null
                ]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <tr
                    key={n.id}
                    onClick={() => setSelectedNotif(n)}
                    className="hover:bg-slate-900/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-sans font-semibold text-white">
                      {n.passengerName}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenManifest?.(n.flightId);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-400 font-bold hover:bg-slate-800 transition-colors"
                      >
                        {n.flightNumber}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-emerald-400 font-semibold max-w-[200px] truncate">
                      {changesSummary || "Flight Update"}
                    </td>

                    <td className="px-4 py-3 text-slate-400 max-w-[300px] truncate">
                      {n.messageBody.split("\n")[0]}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          n.status === "DELIVERED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : n.status === "SENT"
                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                            : n.status === "FAILED"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {n.status === "DELIVERED" && <CheckCircle2 className="w-3 h-3" />}
                        {n.status === "FAILED" && <AlertTriangle className="w-3 h-3" />}
                        {n.status === "PENDING" && <Clock className="w-3 h-3 animate-spin" />}
                        {n.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {n.status === "FAILED" ? (
                        <button
                          onClick={(e) => handleRetrySingle(e, n)}
                          disabled={retryingId === n.id}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-all shadow flex items-center gap-1 ml-auto"
                        >
                          <RotateCw className={`w-3 h-3 ${retryingId === n.id ? "animate-spin" : ""}`} />
                          <span>Retry</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 group-hover:text-sky-400 text-[11px] flex items-center gap-1 justify-end">
                          Details <ExternalLink className="w-3 h-3" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedNotif && (
        <NotificationDetailModal
          notification={selectedNotif}
          onClose={() => setSelectedNotif(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
