"use client";

import React, { useState, useEffect } from "react";
import type { PassengerManifestResponse } from "@c3/shared";
import { fetchPassengerManifest } from "../../lib/api";
import {
  X,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Phone,
  Plane,
  Luggage
} from "lucide-react";

interface PassengerManifestModalProps {
  flightId: string;
  flightNumber: string;
  onClose: () => void;
}

export function PassengerManifestModal({
  flightId,
  flightNumber,
  onClose
}: PassengerManifestModalProps) {
  const [manifest, setManifest] = useState<PassengerManifestResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    loadManifest();
  }, [flightId]);

  const loadManifest = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPassengerManifest(flightId);
      setManifest(data);
    } catch (err: any) {
      setError(err.message || "Failed to load manifest");
    } finally {
      setLoading(false);
    }
  };

  const filteredPassengers = manifest?.passengers.filter(
    (item) =>
      item.passenger.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.passenger.seatNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.passenger.bookingReference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Passenger Manifest: {flightNumber}
                {manifest && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {manifest.totalPassengers} Passengers
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Active Seat Assignments & Real-Time Notification Status
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
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 font-mono text-xs gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
              <span>Loading passenger manifest...</span>
            </div>
          ) : manifest ? (
            <>
              {/* Manifest Summary Bar */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono">
                <div className="text-center border-r border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase block">Total Manifest</span>
                  <span className="text-base font-bold text-white">{manifest.totalPassengers}</span>
                </div>
                <div className="text-center border-r border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase block">Delivered</span>
                  <span className="text-base font-bold text-emerald-400">{manifest.notificationsDelivered}</span>
                </div>
                <div className="text-center border-r border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase block">Failed</span>
                  <span className="text-base font-bold text-rose-400">{manifest.notificationsFailed}</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 text-[10px] uppercase block">Connections at Risk</span>
                  <span className={`text-base font-bold ${manifest.missedConnectionsAtRisk > 0 ? "text-amber-400 animate-pulse" : "text-slate-400"}`}>
                    {manifest.missedConnectionsAtRisk}
                  </span>
                </div>
              </div>

              {/* Search filter input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by passenger name, seat number (12A), or booking reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Passenger List Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5">Seat</th>
                      <th className="px-4 py-2.5">Passenger Name</th>
                      <th className="px-4 py-2.5">Phone</th>
                      <th className="px-4 py-2.5">Ref</th>
                      <th className="px-4 py-2.5">Connecting Flight</th>
                      <th className="px-4 py-2.5 text-right">SMS Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredPassengers?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                          No passengers match search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredPassengers?.map((item) => {
                        const maskedPhone =
                          item.passenger.phoneNumber.length > 5
                            ? `${item.passenger.phoneNumber.slice(0, 3)} ******${item.passenger.phoneNumber.slice(-4)}`
                            : item.passenger.phoneNumber;

                        return (
                          <tr key={item.passenger.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-emerald-400">{item.passenger.seatNumber}</td>
                            <td className="px-4 py-2.5 font-sans font-semibold text-white">{item.passenger.name}</td>
                            <td className="px-4 py-2.5 text-slate-400">{maskedPhone}</td>
                            <td className="px-4 py-2.5 text-slate-400">{item.passenger.bookingReference}</td>
                            <td className="px-4 py-2.5">
                              {item.connectingFlightNumber ? (
                                <span className="inline-flex items-center gap-1">
                                  <Plane className="w-3 h-3 text-sky-400" />
                                  <span className="text-white">{item.connectingFlightNumber}</span>
                                  {item.connectionRisk === "HIGH" && (
                                    <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded text-[9px] font-bold">
                                      HIGH RISK
                                    </span>
                                  )}
                                  {item.connectionRisk === "MEDIUM" && (
                                    <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-[9px] font-bold">
                                      MED RISK
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {item.latestNotification ? (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    item.latestNotification.status === "DELIVERED"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                      : item.latestNotification.status === "SENT"
                                      ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                                      : item.latestNotification.status === "FAILED"
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                  }`}
                                >
                                  {item.latestNotification.status === "DELIVERED" && <CheckCircle2 className="w-2.5 h-2.5" />}
                                  {item.latestNotification.status === "FAILED" && <AlertTriangle className="w-2.5 h-2.5" />}
                                  {item.latestNotification.status}
                                </span>
                              ) : (
                                <span className="text-slate-600 text-[10px]">No Changes Yet</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close Manifest
          </button>
        </div>
      </div>
    </div>
  );
}
