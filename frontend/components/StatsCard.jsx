"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatsCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  color = "emerald",
}) {
  const colorMap = {
    emerald: {
      iconBg: "bg-emerald-500/15",
      iconText: "text-emerald-400",
    },
    blue: {
      iconBg: "bg-blue-500/15",
      iconText: "text-blue-400",
    },
    amber: {
      iconBg: "bg-amber-500/15",
      iconText: "text-amber-400",
    },
    red: {
      iconBg: "bg-red-500/15",
      iconText: "text-red-400",
    },
    purple: {
      iconBg: "bg-purple-500/15",
      iconText: "text-purple-400",
    },
  };

  const c = colorMap[color] || colorMap.emerald;

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-white mt-1 font-mono">
            {value}
          </p>
        </div>
        <div
          className={`w-10 h-10 ${c.iconBg} rounded-lg flex items-center justify-center`}
        >
          {Icon && <Icon className={`w-5 h-5 ${c.iconText}`} />}
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1.5 mt-3">
          {trend >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
          )}
          <span
            className={`text-xs font-medium ${
              trend >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {trend >= 0 ? "+" : ""}
            {trend}%
          </span>
          {trendLabel && (
            <span className="text-xs text-slate-500">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
