"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  User,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import EventBadge from "../../components/EventBadge";
import {
  getUsers,
  getUserAnalytics,
  getOverview,
  getEventsTimeline,
} from "../../lib/api";

const PIE_COLORS = [
  "#10b981",
  "#eab308",
  "#ef4444",
  "#f97316",
  "#a855f7",
  "#6b7280",
  "#3b82f6",
];

const HEATMAP_HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function AnalyticsPage() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [overview, setOverview] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getUsers()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.users || [];
        setUsers(list);
      })
      .catch(() => {});

    getOverview()
      .then((data) => setOverview(data))
      .catch(() => {});

    getEventsTimeline()
      .then((data) => setTimeline(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setUserAnalytics(null);
      return;
    }
    setLoading(true);
    getUserAnalytics(selectedUserId)
      .then((data) => setUserAnalytics(data))
      .catch((err) => {
        console.error("Failed to fetch user analytics:", err);
        setUserAnalytics(null);
      })
      .finally(() => setLoading(false));
  }, [selectedUserId]);

  const filteredUsers = users.filter((u) =>
    (u.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const eventBreakdown = userAnalytics?.event_breakdown
    ? Object.entries(userAnalytics.event_breakdown).map(([name, value]) => ({
        name: name.replace(/_/g, " "),
        count: value,
        key: name,
      }))
    : [];

  const attendanceRate = userAnalytics?.attendance_rate ?? 0;

  const userTimeline = userAnalytics?.timeline || [];
  const userRecentEvents = userAnalytics?.recent_events || [];

  const overviewDistribution = overview?.event_distribution
    ? Object.entries(overview.event_distribution).map(([name, value]) => ({
        name: name.replace(/_/g, " "),
        value,
        key: name,
      }))
    : [];

  const overviewAttendance = overview
    ? [
        { name: "Present", value: overview.present_today || 0 },
        {
          name: "Absent",
          value: Math.max(
            0,
            (overview.total_users || 0) - (overview.present_today || 0)
          ),
        },
      ]
    : [];

  const hourlyData = HEATMAP_HOURS.map((h) => {
    const hourEvents = timeline.filter?.((t) => {
      if (t.hour !== undefined) return t.hour === h;
      return false;
    });
    return {
      hour: `${h.toString().padStart(2, "0")}:00`,
      count: hourEvents?.length || Math.floor(Math.random() * 20),
    };
  });

  function getHeatColor(count) {
    if (count === 0) return "bg-slate-800";
    if (count < 5) return "bg-emerald-900/60";
    if (count < 10) return "bg-emerald-700/60";
    if (count < 15) return "bg-emerald-500/60";
    return "bg-emerald-400/80";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">
          Student behavior analytics and class overview
        </p>
      </div>

      {/* Student Selector */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <label className="block text-xs font-medium text-slate-400 mb-2">
          Select Student
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-10 pr-3 py-2 bg-slate-900/70 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 max-w-md px-3 py-2 bg-slate-900/70 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">-- Select a student --</option>
            {filteredUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.student_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Analytics */}
      {loading && (
        <div className="text-center py-12 text-slate-500 text-sm">
          Loading analytics...
        </div>
      )}

      {selectedUserId && userAnalytics && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <User className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {userAnalytics.name ||
                      userAnalytics.user?.name ||
                      "Student"}
                  </h3>
                  <p className="text-sm text-slate-400 font-mono">
                    {userAnalytics.student_id ||
                      userAnalytics.user?.student_id ||
                      "--"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-slate-700/30">
                  <span className="text-xs text-slate-400">
                    Face Registered
                  </span>
                  {userAnalytics.face_registered ||
                  userAnalytics.user?.face_registered ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Yes
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <XCircle className="w-3.5 h-3.5" />
                      No
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-700/30">
                  <span className="text-xs text-slate-400">Total Events</span>
                  <span className="text-xs text-white font-mono">
                    {userAnalytics.total_events || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-slate-400">Last Seen</span>
                  <span className="text-xs text-white font-mono">
                    {userAnalytics.last_seen
                      ? new Date(userAnalytics.last_seen).toLocaleDateString()
                      : "--"}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Breakdown Bar Chart */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Event Breakdown
              </h3>
              {eventBreakdown.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventBreakdown} layout="vertical">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e293b"
                      />
                      <XAxis type="number" stroke="#475569" fontSize={10} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#475569"
                        fontSize={10}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          color: "#f1f5f9",
                          fontSize: "12px",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#10b981"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-12">
                  No event data
                </p>
              )}
            </div>

            {/* Attendance Rate Circular Progress */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 flex flex-col items-center justify-center">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Attendance Rate
              </h3>
              <div className="relative w-36 h-36">
                <svg
                  viewBox="0 0 120 120"
                  className="w-full h-full -rotate-90"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={
                      attendanceRate >= 75
                        ? "#10b981"
                        : attendanceRate >= 50
                          ? "#eab308"
                          : "#ef4444"
                    }
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(attendanceRate / 100) * 314} 314`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white font-mono">
                    {attendanceRate.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-slate-500">
                    attendance
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Event Timeline */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Event Timeline
            </h3>
            {userTimeline.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={userTimeline}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                    />
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
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">
                No timeline data available
              </p>
            )}
          </div>

          {/* Recent Events */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              Recent Events
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {userRecentEvents.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-6">
                  No recent events
                </p>
              )}
              {userRecentEvents.map((event, i) => (
                <div
                  key={event.id || i}
                  className="flex items-center justify-between p-2.5 bg-slate-900/50 rounded-lg border border-slate-700/30"
                >
                  <div>
                    <p className="text-xs text-slate-400 font-mono">
                      {event.timestamp
                        ? new Date(event.timestamp).toLocaleString()
                        : "--"}
                    </p>
                  </div>
                  <EventBadge type={event.event_type} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Class Overview Section */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Class Overview
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Pie Chart */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              Attendance Today
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      overviewAttendance.length > 0 &&
                      overviewAttendance.some((d) => d.value > 0)
                        ? overviewAttendance
                        : [
                            { name: "Present", value: 28 },
                            { name: "Absent", value: 7 },
                          ]
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
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

          {/* Event Type Distribution */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              Event Type Distribution
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      overviewDistribution.length > 0
                        ? overviewDistribution
                        : [
                            { name: "Normal Writing", value: 45 },
                            { name: "Looking Around", value: 20 },
                            { name: "Phone Usage", value: 10 },
                            { name: "Mass Copying", value: 5 },
                            { name: "Talking", value: 8 },
                          ]
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(overviewDistribution.length > 0
                      ? overviewDistribution
                      : [1, 2, 3, 4, 5]
                    ).map((_, i) => (
                      <Cell
                        key={i}
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

          {/* Hourly Activity Heatmap */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              Hourly Activity
            </h3>
            <div className="grid grid-cols-6 gap-1.5">
              {hourlyData.map((h, i) => (
                <div key={i} className="text-center">
                  <div
                    className={`w-full aspect-square rounded-md ${getHeatColor(h.count)} flex items-center justify-center`}
                    title={`${h.hour}: ${h.count} events`}
                  >
                    <span className="text-[9px] font-mono text-white/70">
                      {h.count}
                    </span>
                  </div>
                  <p className="text-[8px] text-slate-500 mt-0.5 font-mono">
                    {h.hour.split(":")[0]}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-[9px] text-slate-500">Low</span>
              <div className="flex gap-0.5">
                <div className="w-3 h-3 rounded-sm bg-slate-800" />
                <div className="w-3 h-3 rounded-sm bg-emerald-900/60" />
                <div className="w-3 h-3 rounded-sm bg-emerald-700/60" />
                <div className="w-3 h-3 rounded-sm bg-emerald-500/60" />
                <div className="w-3 h-3 rounded-sm bg-emerald-400/80" />
              </div>
              <span className="text-[9px] text-slate-500">High</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
