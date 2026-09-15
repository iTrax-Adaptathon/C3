"use client";

import React, { useState } from "react";
import type { PassengerNotification } from "@c3/shared";
import { retryNotification } from "../../lib/api";
import {
  X,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCw,
  ExternalLink,
  User,
  Phone,
  Plane
} from "lucide-react";

interface NotificationDetailModalProps {
  notification: PassengerNotification;
  onClose: () => void;
  onRefresh: () => void;
}

export function NotificationDetailModal({
  notification: initialNotif,
  onClose,
  onRefresh
}: NotificationDetailModalProps) {
  const [notification, setNotification] = useState<PassengerNotification>(initialNotif);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const maskedPhone =
    notification.passengerPhone.length > 5
      ? `${notification.passengerPhone.slice(0, 3)} ******${notification.passengerPhone.slice(-4)}`
      : notification.passengerPhone;

  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      setRetryError(null);
      const res = await retryNotification(notification.id);
      setNotification(res.notification);
      onRefresh();
    } catch (err: any) {
      setRetryError(err.message || "Failed to retry notification");
    } finally {
      setIsRetrying(false);
    }
  };

  const domain =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "http://localhost:3000";
  const passengerPortalUrl = `${domain}/p/${notification.secureToken}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Notification Details
                <span className="text-xs font-mono text-slate-400">
                  #{notification.id.slice(-6)}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Passenger SMS Audit Trail & Dispatch Record
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

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {retryError && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{retryError}</span>
            </div>
          )}

          {/* Passenger & Flight Summary Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-mono mb-0.5 flex items-center gap-1">
                <User className="w-3 h-3 text-sky-400" /> Passenger
              </span>
              <span className="font-semibold text-white">{notification.passengerName}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-mono mb-0.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-400" /> Phone
              </span>
              <span className="font-mono text-slate-300">{maskedPhone}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-mono mb-0.5 flex items-center gap-1">
                <Plane className="w-3 h-3 text-amber-400" /> Flight
              </span>
              <span className="font-bold text-white font-mono">{notification.flightNumber}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-mono mb-0.5">
                Delivery Status
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase font-mono ${
                  notification.status === "DELIVERED"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : notification.status === "SENT"
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                    : notification.status === "FAILED"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                }`}
              >
                {notification.status === "DELIVERED" && <CheckCircle2 className="w-3 h-3" />}
                {notification.status === "FAILED" && <AlertTriangle className="w-3 h-3" />}
                {notification.status === "PENDING" && <Clock className="w-3 h-3 animate-spin" />}
                {notification.status}
              </span>
            </div>
          </div>

          {/* Failure Reason Banner if FAILED */}
          {notification.status === "FAILED" && notification.failureReason && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs space-y-1">
              <div className="font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Dispatch Failure Log
              </div>
              <p className="text-rose-200 font-mono text-[11px]">{notification.failureReason}</p>
            </div>
          )}

          {/* SMS Body Content Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block uppercase font-mono tracking-wider">
              Dispatched SMS Content
            </label>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {notification.messageBody}
            </div>
          </div>

          {/* Secure Passenger Link */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Passenger Secure Live Web Link
            </span>
            <a
              href={passengerPortalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:text-sky-300 font-mono text-[11px] truncate flex items-center gap-1.5 group"
            >
              <span className="truncate">{passengerPortalUrl}</span>
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          {/* Timestamps */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-800/80 pt-3">
            <span>Created: {new Date(notification.createdAt).toLocaleTimeString()}</span>
            {notification.deliveredAt && (
              <span className="text-emerald-400">
                Delivered: {new Date(notification.deliveredAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <div>
            {notification.status === "FAILED" && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                <span>{isRetrying ? "Retrying Dispatch..." : "Retry Failed SMS"}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
