"use client";

import { Session, Profile, SessionParticipant, GUESS_FIELD_LABELS, GuessField } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  Wine,
  Play,
  QrCode,
  Crown,
} from "lucide-react";

interface LobbyProps {
  session: Session;
  participants: (SessionParticipant & { profiles: Profile })[];
  hostProfile: Profile;
  isHost: boolean;
  onStartTasting: () => void;
}

export function Lobby({
  session,
  participants,
  hostProfile,
  isHost,
  onStartTasting,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(session.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-dvh flex flex-col px-6 py-6 max-w-lg mx-auto">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-wine-600 hover:text-wine-800 mb-6 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Dashboard</span>
      </Link>

      <h1 className="text-2xl font-bold text-wine-950 mb-1">{session.name}</h1>
      <p className="text-sm text-wine-600/70 mb-6">
        Waiting for everyone to join...
      </p>

      {/* Join code */}
      <div className="bg-white rounded-2xl border border-wine-100 p-6 mb-6 text-center">
        <p className="text-xs font-medium text-wine-500 uppercase tracking-wider mb-2">
          Join code
        </p>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-4xl font-mono font-bold text-wine-950 tracking-[0.2em]">
            {session.join_code}
          </span>
          <button
            onClick={copyCode}
            className="p-2 rounded-lg hover:bg-wine-50 transition-colors text-wine-500"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
        <button
          onClick={() => setShowQR(!showQR)}
          className="text-sm text-wine-600 hover:text-wine-800 flex items-center gap-1.5 mx-auto"
        >
          <QrCode className="w-4 h-4" />
          {showQR ? "Hide QR" : "Show QR code"}
        </button>

        {showQR && (
          <div className="mt-4 flex justify-center">
            <div className="p-3 bg-white rounded-xl shadow-sm inline-block">
              <QRCodeSVG
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/session/join?code=${session.join_code}`}
                size={180}
                fgColor="#4a0d1f"
              />
            </div>
          </div>
        )}
      </div>

      {/* Session info */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 bg-white rounded-xl border border-wine-100 p-3 text-center">
          <Wine className="w-5 h-5 text-wine-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-wine-950">{session.wine_count}</p>
          <p className="text-xs text-wine-500">wines</p>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-wine-100 p-3 text-center">
          <Users className="w-5 h-5 text-wine-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-wine-950">
            {participants.length}
          </p>
          <p className="text-xs text-wine-500">tasters</p>
        </div>
      </div>

      {/* Guess fields */}
      <div className="mb-6">
        <p className="text-xs font-medium text-wine-500 uppercase tracking-wider mb-2">
          Guessing on
        </p>
        <div className="flex flex-wrap gap-2">
          {session.guess_fields.map((field) => (
            <span
              key={field}
              className="text-xs font-medium bg-wine-50 text-wine-700 px-2.5 py-1 rounded-full"
            >
              {GUESS_FIELD_LABELS[field as GuessField] ?? field}
            </span>
          ))}
        </div>
      </div>

      {/* Participants */}
      <div className="flex-1">
        <p className="text-xs font-medium text-wine-500 uppercase tracking-wider mb-3">
          Tasters
        </p>
        <div className="space-y-2">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-wine-100"
            >
              <div className="w-9 h-9 rounded-full bg-wine-100 flex items-center justify-center text-sm font-bold text-wine-700">
                {(p.profiles?.display_name ?? "?")[0].toUpperCase()}
              </div>
              <span className="font-medium text-wine-900 text-sm flex-1">
                {p.profiles?.display_name ?? "Unknown"}
              </span>
              {p.user_id === session.host_id && (
                <Crown className="w-4 h-4 text-gold-500" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Start button (host only) */}
      {isHost && (
        <button
          onClick={onStartTasting}
          disabled={participants.length < 1}
          className="mt-6 w-full py-3.5 rounded-xl bg-wine-900 text-cream-50 font-semibold hover:bg-wine-800 active:bg-wine-950 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          Start tasting
        </button>
      )}
    </main>
  );
}
