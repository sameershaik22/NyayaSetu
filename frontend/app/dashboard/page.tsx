"use client";
import { useState, useEffect, useCallback, Fragment } from "react";
import { getDashboard, updateRecordStatus, deleteRecord } from "@/lib/api";

interface DashRecord {
  id: number; case_title: string; date_of_order: string; parties: string;
  directions: string[]; timeline: string; action_type: string; action: string;
  department: string; deadline: string; priority: string; confidence: number;
  status: string; completion_status: string; created_at: string;
  source_text?: string; justification?: string;
}
interface DashboardData {
  records: DashRecord[];
  department_groups: Record<string, DashRecord[]>;
  statistics: { total: number; compliance_tasks: number; appeal_suggestions: number; overdue: number; departments: number; };
}

const STATUS_META: Record<string, { label: string; badge: string; row: string; icon: string }> = {
  pending:   { label: "Pending",   badge: "bg-yellow-100 text-yellow-800 border-yellow-200", row: "status-pending",   icon: "🟡" },
  overdue:   { label: "Overdue",   badge: "bg-red-100 text-red-800 border-red-200",           row: "status-overdue",   icon: "🔴" },
  completed: { label: "Completed", badge: "bg-green-100 text-green-800 border-green-200",     row: "status-completed", icon: "🟢" },
};

const PRIORITY_BADGE: Record<string, string> = {
  High: "badge-high", Medium: "badge-medium", Low: "badge-low",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "department">("table");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try { const d = await getDashboard(); setData(d); }
    catch (e) { setError(`Failed to load: ${e instanceof Error ? e.message : "Unknown error"}`); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try { await updateRecordStatus(id, newStatus); await fetchDashboard(); }
    finally { setUpdatingId(null); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this record from the dashboard?")) return;
    await deleteRecord(id); await fetchDashboard();
  };

  const filteredRecords = data?.records.filter((r) => {
    return (filterPriority === "all" || r.priority === filterPriority) &&
           (filterStatus === "all" || r.completion_status === filterStatus) &&
           (filterDept === "all" || r.department === filterDept);
  }) || [];

  const allDepartments = Object.keys(data?.department_groups || {}).sort();
  const stats = data?.statistics;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="spinner mx-auto mb-3" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="glass-card p-8 border-t-4 border-red-500">
          <p className="text-red-700 text-sm mb-4">{error}</p>
          <button className="btn-primary" onClick={fetchDashboard}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* Page Header */}
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Decision Support Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Displaying only <strong>human-verified, approved</strong> action plans and court directives.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            className={`px-3 py-1.5 rounded border text-xs font-semibold transition-colors ${viewMode === "table" ? "bg-blue-800 text-white border-blue-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
            onClick={() => setViewMode("table")}
          >📋 Table</button>
          <button
            className={`px-3 py-1.5 rounded border text-xs font-semibold transition-colors ${viewMode === "department" ? "bg-blue-800 text-white border-blue-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
            onClick={() => setViewMode("department")}
          >🏛 Department</button>
          <button className="btn-primary btn-ghost text-xs px-3 py-1.5" onClick={fetchDashboard}>↻ Refresh</button>
        </div>
      </div>

      {/* Impact Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Cases", value: stats?.total || 0, color: "border-blue-800", text: "text-blue-800" },
          { label: "Compliance Tasks", value: stats?.compliance_tasks || 0, color: "border-green-600", text: "text-green-700" },
          { label: "Appeal Suggestions", value: stats?.appeal_suggestions || 0, color: "border-yellow-600", text: "text-yellow-700" },
          { label: "Overdue Cases", value: stats?.overdue || 0, color: "border-red-600", text: "text-red-700" },
        ].map(({ label, value, color, text }) => (
          <div key={label} className={`glass-card p-4 border-t-4 ${color} animate-fade-in`}>
            <div className="section-label mb-1">{label}</div>
            <div className={`text-3xl font-bold ${text}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 mb-4 flex flex-wrap gap-3 items-center animate-fade-in">
        <span className="section-label">Filter by:</span>
        <select className="input-dark text-xs" style={{ width: "auto", minWidth: 160 }} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="all">All Departments</option>
          {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input-dark text-xs" style={{ width: "auto" }} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="all">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select className="input-dark text-xs" style={{ width: "auto" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="completed">Completed</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""} shown</span>
      </div>

      {/* Empty State */}
      {filteredRecords.length === 0 && (
        <div className="glass-card p-14 text-center animate-fade-in">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">No Records Found</h3>
          <p className="text-gray-500 text-sm mb-5">
            {data?.records.length === 0
              ? "No approved records yet. Upload and verify a court judgment to begin."
              : "No records match the selected filters. Try adjusting the filter criteria."}
          </p>
          {data?.records.length === 0 && (
            <a href="/" className="btn-primary inline-flex items-center gap-2">📄 Upload Judgment</a>
          )}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === "table" && filteredRecords.length > 0 && (
        <div className="glass-card overflow-hidden animate-fade-in">
          <table className="table-dark w-full">
            <thead>
              <tr>
                <th>Case Title</th>
                <th>Department</th>
                <th className="hidden md:table-cell">Human Verified Decision</th>
                <th className="hidden lg:table-cell">Deadline</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const sm = STATUS_META[record.completion_status] || STATUS_META.pending;
                const isExpanded = expandedId === record.id;
                return (
                  <Fragment key={record.id}>
                    <tr
                      className={`cursor-pointer ${sm.row}`}
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    >
                      <td>
                        <div className="font-semibold text-gray-900 text-sm max-w-[180px] truncate">{record.case_title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{record.date_of_order}</div>
                      </td>
                      <td>
                        <div className="text-sm text-gray-700 max-w-[140px] truncate">🏛 {record.department}</div>
                      </td>
                      <td className="hidden md:table-cell">
                        <div className="text-xs text-gray-500 max-w-[220px] line-clamp-2">
                          <span className="font-semibold text-blue-800 mr-1">[{record.action_type}]</span>
                          {record.action}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell">
                        <div className="text-xs text-gray-600 whitespace-nowrap">📅 {record.deadline}</div>
                      </td>
                      <td>
                        <span className={`${PRIORITY_BADGE[record.priority] || PRIORITY_BADGE.Medium}`}>
                          {record.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`px-2 py-1 rounded border text-xs font-semibold ${sm.badge}`}>
                          {sm.icon} {sm.label}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <select
                            className="text-xs rounded border border-gray-200 px-2 py-1 bg-white text-gray-700 cursor-pointer"
                            value={record.completion_status}
                            disabled={updatingId === record.id}
                            onChange={(e) => handleStatusUpdate(record.id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                          </select>
                          <button
                            className="text-gray-300 hover:text-red-600 text-sm transition-colors px-1"
                            onClick={() => handleDelete(record.id)}
                            title="Delete record"
                          >🗑</button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="p-0 bg-blue-50 border-b border-blue-100">
                          <div className="p-5 space-y-4 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="section-label mb-1.5">🧠 AI Reasoning</div>
                                <div className="text-xs text-blue-900 bg-blue-50 border border-blue-200 rounded p-3">
                                  {record.justification || "Reasoning not recorded."}
                                </div>
                              </div>
                              <div>
                                <div className="section-label mb-1.5">🔍 Source Text (from PDF)</div>
                                <div className="text-xs text-gray-600 italic bg-white border border-gray-200 border-l-4 border-l-gray-400 rounded p-3">
                                  &quot;{record.source_text || "Source text not pinpointed."}&quot;
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-blue-100">
                              <div>
                                <div className="section-label mb-1">Parties</div>
                                <div className="text-sm text-gray-700">{record.parties || "—"}</div>
                              </div>
                              <div>
                                <div className="section-label mb-1">AI Confidence</div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                    <div className="confidence-bar" style={{ width: `${record.confidence}%` }} />
                                  </div>
                                  <span className="text-xs font-bold text-blue-800">{record.confidence}%</span>
                                </div>
                              </div>
                              <div>
                                <div className="section-label mb-1">Approved On</div>
                                <div className="text-sm text-gray-700">{new Date(record.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                            {record.directions?.length > 0 && (
                              <div className="pt-2 border-t border-blue-100">
                                <div className="section-label mb-2">📜 Key Court Directions</div>
                                <ol className="space-y-1">
                                  {record.directions.map((d, i) => (
                                    <li key={i} className="flex gap-2 text-xs text-gray-700">
                                      <span className="font-bold text-blue-800 shrink-0">{i + 1}.</span>
                                      <span>{d}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DEPARTMENT VIEW */}
      {viewMode === "department" && filteredRecords.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          {allDepartments.map((dept) => {
            const deptRecords = data?.department_groups[dept].filter((r) =>
              (filterPriority === "all" || r.priority === filterPriority) &&
              (filterStatus === "all" || r.completion_status === filterStatus)
            );
            if (!deptRecords?.length) return null;
            if (filterDept !== "all" && filterDept !== dept) return null;

            return (
              <div key={dept} className="glass-card overflow-hidden border-t-4 border-blue-800">
                {/* Dept header */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏛</span>
                    <span className="font-semibold text-gray-900 text-sm">{dept}</span>
                    <span className="ml-1 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 font-semibold">
                      {deptRecords.length} case{deptRecords.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {["High", "Medium", "Low"].map((p) => {
                      const count = deptRecords.filter((r) => r.priority === p).length;
                      return count > 0 ? (
                        <span key={p} className={`${PRIORITY_BADGE[p]}`}>{count} {p}</span>
                      ) : null;
                    })}
                  </div>
                </div>
                {/* Dept records */}
                <div className="divide-y divide-gray-100">
                  {deptRecords.map((record) => {
                    const sm = STATUS_META[record.completion_status] || STATUS_META.pending;
                    return (
                      <div key={record.id} className={`p-4 ${sm.row} hover:bg-gray-50 transition-colors`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-1.5 mb-1">
                              <span className="font-semibold text-gray-900 text-sm">{record.case_title}</span>
                              <span className={`${PRIORITY_BADGE[record.priority] || PRIORITY_BADGE.Medium}`}>{record.priority}</span>
                              <span className="text-xs px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-800 font-medium">
                                {record.action_type}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mb-1.5">
                              <span className="font-semibold text-gray-500">Human Verified Decision:</span>{" "}
                              {record.action}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                              <span>📅 Deadline: <strong className="text-gray-700">{record.deadline}</strong></span>
                              <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${sm.badge}`}>{sm.icon} {sm.label}</span>
                              <span>AI Confidence: <strong className="text-blue-800">{record.confidence}%</strong></span>
                            </div>
                          </div>
                          <select
                            className="text-xs rounded border border-gray-200 px-2 py-1 bg-white text-gray-600 shrink-0 cursor-pointer"
                            value={record.completion_status}
                            onChange={(e) => handleStatusUpdate(record.id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
