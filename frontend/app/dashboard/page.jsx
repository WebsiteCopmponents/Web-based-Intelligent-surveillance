"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  AlertTriangle,
  Video,
  Clock,
  Activity,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import StatsCard from "../../components/StatsCard";
import EventBadge from "../../components/EventBadge";
import { getOverview, getRecentEvents, getEventsTimeline } from "../../lib/api";

const PIE_COLORS = [
  "#10b981",
  "#eab308",
  "#ef4444",
  "#f97316",
  "#a855f7",
  "#6b7280",
  "#3b82f6",
];

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, eventsRes, timelineRes] = await Promise.allSettled([
          getOverview(),
          getRecentEvents(),
          getEventsTimeline(),
        ]);
        if (overviewRes.status === "fulfilled") setOverview(overviewRes.value);
        if (eventsRes.status === "fulfilled") setRecentEvents(eventsRes.value);
        if (timelineRes.status === "fulfilled") setTimeline(timelineRes.value);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = overview || {};
  const totalStudents = stats.total_users || 0;
  const presentToday = stats.present_today || 0;
  const eventsToday = stats.events_today || 0;
  const activeCameras = stats.active_cameras || 1;

  const eventDistribution = stats.event_distribution
    ? Object.entries(stats.event_distribution).map(([name, value]) => ({
        name: name.replace(/_/g, " "),
        value,
        key: name,
      }))
    : [
        { name: "Normal Writing", value: 45, key: "normal_writing" },
        { name: "Looking Around", value: 20, key: "looking_around" },
        { name: "Phone Usage", value: 10, key: "phone_usage" },
        { name: "Mass Copying", value: 5, key: "mass_copying" },
        { name: "Talking", value: 8, key: "talking" },
      ];

  const attendanceTrend =
    timeline.length > 0
      ? timeline
      : [
          { date: "Mon", count: 28 },
          { date: "Tue", count: 32 },
          { date: "Wed", count: 30 },
          { date: "Thu", count: 35 },
          { date: "Fri", count: 25 },
        ];

  function formatTime(timestamp) {
    if (!timestamp) return "--";
    const d = new Date(timestamp);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          System overview and real-time monitoring status
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Users}
          label="Total Students"
          value={totalStudents}
          trend={12}
          trendLabel="vs last month"
          color="blue"
        />
        <StatsCard
          icon={UserCheck}
          label="Present Today"
          value={presentToday}
          trend={5}
          trendLabel="vs yesterday"
          color="emerald"
        />
        <StatsCard
          icon={AlertTriangle}
          label="Events Today"
          value={eventsToday}
          trend={-8}
          trendLabel="vs yesterday"
          color="amber"
        />
        <StatsCard
          icon={Video}
          label="Active Cameras"
          value={activeCameras}
          color="purple"
        />
      </div>

      {/* Charts + Events Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Distribution Pie Chart */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Event Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={eventDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {eventDistribution.map((entry, i) => (
                    <Cell
                      key={entry.key}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Trend Line Chart */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Attendance Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  stroke="#475569"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Recent Events
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentEvents.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-6">
                No recent events
              </p>
            )}
            {recentEvents.slice(0, 10).map((event, i) => (
              <div
                key={event.id || i}
                className="flex items-center justify-between p-2.5 bg-slate-900/50 rounded-lg border border-slate-700/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">
                    {event.user_name || "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    {formatTime(event.timestamp)}
                  </p>
                </div>
                <EventBadge type={event.event_type} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
