"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Grid3X3,
  List,
  CheckCircle2,
  XCircle,
  Trash2,
  BarChart3,
  Clock,
  AlertTriangle,
  User,
} from "lucide-react";
import { getUsers, deleteUser } from "../../lib/api";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function fetchStudents() {
    setLoading(true);
    try {
      const data = await getUsers();
      const list = Array.isArray(data) ? data : data.users || [];
      setStudents(list);
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudents();
  }, []);

  async function handleDelete(id) {
    setDeleting(true);
    try {
      await deleteUser(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Failed to delete student:", err);
    } finally {
      setDeleting(false);
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.student_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  function formatLastSeen(ts) {
    if (!ts) return "Never";
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage registered students and face data
          </p>
        </div>
        <button
          onClick={() => router.push("/register")}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <User className="w-4 h-4" />
          Register New
        </button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, or email..."
            className="w-full pl-10 pr-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="flex items-center bg-slate-800/60 border border-slate-700/50 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 transition-colors ${
              viewMode === "grid"
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 transition-colors ${
              viewMode === "list"
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {filteredStudents.length} student
          {filteredStudents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-slate-500 text-sm">
          Loading students...
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredStudents.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-700" />
          <p className="text-sm text-slate-500">
            {searchQuery
              ? "No students matching your search"
              : "No students registered yet"}
          </p>
        </div>
      )}

      {/* Grid View */}
      {!loading && viewMode === "grid" && filteredStudents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 card-hover group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 bg-emerald-500/15 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-emerald-400">
                    {(student.name || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push("/analytics");
                    }}
                    className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                    title="View Analytics"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(student);
                    }}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Delete Student"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-white truncate">
                {student.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {student.student_id || "--"}
              </p>
              {student.email && (
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {student.email}
                </p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/30">
                {student.face_registered ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Face Registered
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-700/30 px-2 py-0.5 rounded-full">
                    <XCircle className="w-3 h-3" />
                    No Face Data
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                  <Clock className="w-3 h-3" />
                  {formatLastSeen(student.last_seen)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === "list" && filteredStudents.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
                  Student
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
                  Student ID
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
                  Email
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
                  Face Status
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
                  Last Seen
                </th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500/15 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-emerald-400">
                          {(student.name || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-white font-medium">
                        {student.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-slate-300 font-mono">
                      {student.student_id || "--"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-slate-400">
                      {student.email || "--"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {student.face_registered ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Registered
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <XCircle className="w-3.5 h-3.5" />
                        Not registered
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-slate-500 font-mono">
                      {formatLastSeen(student.last_seen)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push("/analytics")}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                        title="View Analytics"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(student)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/15 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Delete Student
                </h3>
                <p className="text-xs text-slate-400">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-5">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">
                {deleteConfirm.name}
              </span>
              ? All associated face data and events will be permanently removed.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
