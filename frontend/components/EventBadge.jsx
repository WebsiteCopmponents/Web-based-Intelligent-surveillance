"use client";

import React from "react";

const eventColors = {
  normal_writing: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    label: "Normal Writing",
  },
  looking_around: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
    label: "Looking Around",
  },
  mass_copying: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
    label: "Mass Copying",
  },
  phone_usage: {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/30",
    label: "Phone Usage",
  },
  talking: {
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/30",
    label: "Talking",
  },
  absent_from_seat: {
    bg: "bg-gray-500/15",
    text: "text-gray-400",
    border: "border-gray-500/30",
    label: "Absent from Seat",
  },
  unknown_person: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
    label: "Unknown Person",
  },
};

export function getEventColor(eventType) {
  return (
    eventColors[eventType] || {
      bg: "bg-slate-500/15",
      text: "text-slate-400",
      border: "border-slate-500/30",
      label: eventType || "Unknown",
    }
  );
}

export function getBoxColor(eventType) {
  const map = {
    normal_writing: "#10b981",
    looking_around: "#eab308",
    mass_copying: "#ef4444",
    phone_usage: "#f97316",
    talking: "#a855f7",
    absent_from_seat: "#6b7280",
    unknown_person: "#3b82f6",
  };
  return map[eventType] || "#10b981";
}

export default function EventBadge({ type, className = "" }) {
  const color = getEventColor(type);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${color.bg} ${color.text} ${color.border} ${className}`}
    >
      {color.label}
    </span>
  );
}
