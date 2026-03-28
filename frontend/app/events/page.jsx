"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  AlertTriangle,
} from "lucide-react";
import EventBadge from "../../components/EventBadge";
import { getEvents, getEventTypes } from "../../lib/api";

const PAGE_SIZE = 15;

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    event_type: "",
    user_name: "",
    start_date: "",
    end_date: "",
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, skip: page * PAGE_SIZE, limit: PAGE_SIZE };
      Object.keys(params).forEach((k) => {
        if (!params[k] && params[k] !== 0) delete params[k];
      });
      const data = await getEvents(params);
      if (Array.isArray(data)) {
        setEvents(data);
        setTotalCount(
          data.length >= PAGE_SIZE
            ? (page + 2) * PAGE_SIZE
            : page * PAGE_SIZE + data.length
        );
      } else if (data.events) {
        setEvents(data.events);
        setTotalCount(data.total || data.events.length);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    getEventTypes()
      .then((data) => {
        if (Array.isArray(data)) setEventTypes(data);
      })
      .catch(() => {});
  }, []);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }

  function clearFilters() {
    setFilters({
      event_type: "",
      user_name: "",
      start_date: "",
      end_date: "",
    });
    setPage(0);
  }

  function formatTimestamp(ts) {
    if (!ts) return "--";
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  const hasFilters = Object.values(filters).some((v) => v);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Event Log</h1>
        <p className="text-sm text-slate-400 mt-1">
          Browse and filter all recorded surveillance events
        </p>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-white">Filters</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Event Type
            </label>
            <select
              value={filters.event_type}
              onChange={(e) =>
                handleFilterChange("event_type", e.target.value)
              }
              className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">All Types</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
              {eventTypes.length === 0 && (
                <>
                  <option value="normal_writing">Normal Writing</option>
                  <option value="looking_around">Looking Around</option>
                  <option value="mass_copying">Mass Copying</option>
                  <option value="phone_usage">Phone Usage</option>
                  <option value="talking">Talking</option>
                  <option value="absent_from_seat">Absent from Seat</option>
                  <option value="unknown_person">Unknown Person</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Student Name
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={filters.user_name}
                onChange={(e) =>
                  handleFilterChange("user_name", e.target.value)
                }
                placeholder="Search name..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900/70 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) =>
                handleFilterChange("start_date", e.target.value)
              }
              className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) =>
                handleFilterChange("end_date", e.target.value)
              }
              className="w-full px-3 py-2 bg-slate-900/70 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
                  Timestamp
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
                  Student
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
                  Event Type
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
                  Confidence
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-slate-500 text-sm"
                  >
                    Loading events...
                  </td>
                </tr>
              )}
              {!loading && events.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                    <p className="text-sm text-slate-500">No events found</p>
                  </td>
                </tr>
              )}
              {!loading &&
                events.map((event, i) => (
                  <tr
                    key={event.id || i}
                    onClick={() => setSelectedEvent(event)}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-sm text-slate-300 font-mono">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-white">
                        {event.user_name || "Unknown"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <EventBadge type={event.event_type} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-700 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-emerald-500"
                            style={{
                              width: `${(event.confidence || 0) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {((event.confidence || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-slate-500 truncate max-w-[200px] block">
                        {event.details || "--"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700/50">
          <span className="text-xs text-slate-500 font-mono">
            Page {page + 1} {totalPages > 0 && `of ${totalPages}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={events.length < PAGE_SIZE}
              className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Event Details
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">Student</p>
                  <p className="text-sm text-white font-medium">
                    {selectedEvent.user_name || "Unknown"}
                  </p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="text-sm text-white font-mono">
                    {formatTimestamp(selectedEvent.timestamp)}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/50 p-3 rounded-lg">
                <p className="text-xs text-slate-500 mb-1.5">Event Type</p>
                <EventBadge type={selectedEvent.event_type} />
              </div>

              <div className="bg-slate-900/50 p-3 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Confidence</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{
                        width: `${(selectedEvent.confidence || 0) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-white font-mono">
                    {((selectedEvent.confidence || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {selectedEvent.details && (
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Details</p>
                  <p className="text-sm text-slate-300">
                    {selectedEvent.details}
                  </p>
                </div>
              )}

              {selectedEvent.id && (
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500">Event ID</p>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedEvent.id}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
