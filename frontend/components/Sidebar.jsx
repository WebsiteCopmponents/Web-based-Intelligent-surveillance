"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserPlus,
  Video,
  FileText,
  BarChart3,
  Users,
  Shield,
  Eye,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/register", label: "Register", icon: UserPlus },
  { href: "/monitor", label: "Monitor", icon: Video },
  { href: "/events", label: "Events", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/students", label: "Students", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-slate-900 border-r border-slate-800 flex flex-col z-50">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">
              SurveilanceAI
            </h1>
            <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest">
              Monitoring Active
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Status indicator */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-glow" />
          <span className="font-mono">System Online</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 mt-1.5">
          <Eye className="w-3 h-3" />
          <span className="font-mono">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
