"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyRecord } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CaseData {
  case_title: string; date: string; parties: string;
  directions: string[]; timeline: string; confidence: number;
  source_text?: string;
}
interface ActionPlan {
  type: string; action: string; department: string;
  deadline: string; priority: string; confidence: number;
  justification?: string; source_text?: string;
  sub_actions?: { step: number; task: string; responsible: string; status: string }[];
  legal_basis?: string;
}
interface Summary {
  case_summary: string;
  court_directions: string[];
  case_type: "compliance" | "appeal" | "informational";
  summary_confidence: number;
}

// ─── Config ──────────────────────────────────────────────────────────────────
const PRIORITY_BADGE: Record<string, string> = {
  High: "badge-high", Medium: "badge-medium", Low: "badge-low",
};
const CASE_TYPE_META = {
  compliance: { label: "Compliance Required", badge: "bg-blue-100 text-blue-800 border-blue-200", icon: "✔" },
  appeal: { label: "Consider Appeal", badge: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "⚖" },
  informational: { label: "Informational Only", badge: "bg-gray-100 text-gray-600 border-gray-200", icon: "ℹ" },
};
const CONFIDENCE_LABEL = (n: number) =>
  n >= 80 ? "High confidence — strong directive language found"
    : n >= 50 ? "Medium confidence — some directives inferred from context"
      : "Low confidence — manual verification strongly recommended";
const CONFIDENCE_COLOR = (n: number) =>
  n >= 80 ? "text-green-700" : n >= 50 ? "text-yellow-700" : "text-red-700";
const CONFIDENCE_STROKE = (n: number) =>
  n >= 80 ? "#16a34a" : n >= 50 ? "#d97706" : "#dc2626";

// ─── Component ────────────────────────────────────────────────────────────────
export default function VerifyPage() {
  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [editedCase, setEditedCase] = useState<CaseData | null>(null);
  const [editedPlan, setEditedPlan] = useState<ActionPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showExtract, setShowExtract] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);

  useEffect(() => {
    const cd = sessionStorage.getItem("nyaya_case_data");
    const ap = sessionStorage.getItem("nyaya_action_plan");
    const sm = sessionStorage.getItem("nyaya_summary");
    setTimeout(() => {
      if (cd) { const p = JSON.parse(cd); setCaseData(p); setEditedCase(p); }
      if (ap) { const p = JSON.parse(ap); setActionPlan(p); setEditedPlan(p); }
      if (sm) { setSummary(JSON.parse(sm)); }
    }, 0);
  }, []);

  const handleVerify = async (status: "approved" | "rejected" | "edited") => {
    if (!caseData || !actionPlan) return;
    setLoading(true);
    try {
      const res = await verifyRecord({
        case_data: (status === "edited" ? editedCase! : caseData) as unknown as Record<string, unknown>,
        action_plan: (status === "edited" ? editedPlan! : actionPlan) as unknown as Record<string, unknown>,
        status,
        reviewer_notes: reviewerNotes,
      });
      setResult({ status, message: res.message });
      sessionStorage.removeItem("nyaya_case_data");
      sessionStorage.removeItem("nyaya_action_plan");
      sessionStorage.removeItem("nyaya_summary");
    } catch (e) {
      setResult({ status: "error", message: `Error: ${e instanceof Error ? e.message : "Unknown"}` });
    } finally {
      setLoading(false);
    }
  };

  const ctMeta = summary ? CASE_TYPE_META[summary.case_type] : null;
  const noActions = summary?.court_directions[0] === "No direct compliance required.";

  // ── No data ──────────────────────────────────────────────────────────────
  if (!caseData || !actionPlan) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="glass-card p-10 animate-fade-in">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">No Case Data Found</h2>
          <p className="text-gray-500 text-sm mb-6">Upload and process a court document first.</p>
          <button className="btn-primary" onClick={() => router.push("/")}>← Back to Upload</button>
        </div>
      </div>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (result) {
    const ok = result.status === "approved" || result.status === "edited";
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className={`glass-card p-10 animate-fade-in border-t-4 ${ok ? "border-green-500" : result.status === "rejected" ? "border-red-500" : "border-yellow-500"}`}>
          <div className="text-5xl mb-4">{ok ? "✅" : result.status === "rejected" ? "❌" : "⚠"}</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {ok ? "Record Approved & Saved to Dashboard" : result.status === "rejected" ? "Record Rejected" : "Error"}
          </h2>
          <p className="text-gray-500 text-sm mb-6">{result.message}</p>
          <div className="flex gap-3 justify-center">
            <button className="btn-primary btn-ghost" onClick={() => router.push("/")}>+ New Document</button>
            {ok && <button className="btn-primary btn-success" onClick={() => router.push("/dashboard")}>View Dashboard →</button>}
          </div>
        </div>
      </div>
    );
  }

  const sourceText = actionPlan.source_text || caseData.source_text;
  const confidence = actionPlan.confidence;
  const circumference = 2 * Math.PI * 44;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* ── Top Banner ─────────────────────────────────────────────────────── */}
      <div className="mb-5 p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 text-xs font-semibold flex items-center gap-2">
        <span className="text-base">⚠</span>
        <span>
          <strong>AI Suggested Output — Requires Human Verification.</strong>{" "}
          All fields are AI-generated. Review carefully before approving. Approved records are saved to the dashboard.
        </span>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <button onClick={() => router.push("/")} className="hover:text-gray-700">Upload</button>
        <span>/</span>
        <span className="font-semibold text-blue-800">Human Verification</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ══════════════════════════════════════
             LEFT COLUMN
            ══════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── Case Summary (narrative) ─────────────────────────────────── */}
          {summary && (
            <div className="glass-card overflow-hidden animate-fade-in border-l-4 border-blue-800">
              <button
                className="w-full flex items-center justify-between px-5 py-3 bg-blue-50 border-b border-blue-100 hover:bg-blue-100 transition-colors"
                onClick={() => setSummaryOpen(!summaryOpen)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-blue-900">📄 Case Summary</span>
                  {ctMeta && (
                    <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${ctMeta.badge}`}>
                      {ctMeta.icon} {ctMeta.label}
                    </span>
                  )}
                </div>
                <span className="text-blue-600 text-xs">{summaryOpen ? "▲ Hide" : "▼ View"}</span>
              </button>
              {summaryOpen && (
                <div className="p-5 space-y-4">
                  {/* Story paragraphs */}
                  <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                    {summary.case_summary.split('. ').filter(Boolean).map((s, i) => (
                      <p key={i}>{s.endsWith('.') ? s : s + '.'}</p>
                    ))}
                    {!noActions && (
                      <p className="text-gray-500">As a result, the court ordered the following actions:</p>
                    )}
                  </div>
                  {/* Court Directions */}
                  <div className="border-t border-gray-100 pt-3">
                    <h3 className="text-xs font-bold text-gray-800 mb-2">📌 Court Directions</h3>
                    {noActions ? (
                      <div className="p-3 rounded border border-gray-200 bg-gray-50 text-sm text-gray-500 flex gap-2">
                        <span>⚠️</span>
                        <span>This judgment does not require administrative action.</span>
                      </div>
                    ) : (
                      <ol className="space-y-1.5">
                        {summary.court_directions.map((d, i) => (
                          <li key={i} className="flex gap-2 text-xs text-gray-700">
                            <span className="font-bold text-blue-800 shrink-0 mt-0.5">{i + 1}.</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── View Original Extract toggle ───────────────────────────────── */}
          <div className="glass-card overflow-hidden animate-fade-in">
            <button
              className="w-full flex items-center justify-between px-5 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              onClick={() => setShowExtract(!showExtract)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">🔎 View Original Extract</span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                  {showExtract ? "Click to hide" : "Metadata + Directions from PDF"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
                  className={`text-xs px-3 py-1 rounded border font-medium transition-colors ${isEditing ? "bg-blue-50 text-blue-800 border-blue-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                >
                  {isEditing ? "✎ Editing ON" : "✎ Edit"}
                </button>
                <span className="text-gray-400 text-xs">{showExtract ? "▲" : "▼"}</span>
              </div>
            </button>

            {showExtract && (
              <div className="p-5 space-y-3 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Case Title", key: "case_title", icon: "📌" },
                    { label: "Date of Order", key: "date", icon: "📅" },
                    { label: "Parties Involved", key: "parties", icon: "👥" },
                    { label: "Timeline", key: "timeline", icon: "⏱" },
                  ].map(({ label, key, icon }) => (
                    <div key={key}>
                      <div className="section-label mb-1">{icon} {label}</div>
                      {isEditing ? (
                        <input
                          className="input-dark"
                          value={editedCase?.[key as keyof CaseData] as string || ""}
                          onChange={(e) => setEditedCase((p) => p ? { ...p, [key]: e.target.value } : p)}
                        />
                      ) : (
                        <div className="text-sm text-gray-800 bg-gray-50 border border-gray-100 rounded px-3 py-2">
                          {caseData[key as keyof CaseData] as string || "—"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Directions */}
                <div>
                  <div className="section-label mb-2">📜 Extracted Directions</div>
                  {(isEditing ? editedCase?.directions : caseData.directions)?.map((d, i) => (
                    <div key={i} className="flex gap-2 mb-1.5">
                      <span className="font-bold text-blue-800 text-sm shrink-0 mt-0.5">{i + 1}.</span>
                      {isEditing ? (
                        <input className="input-dark text-sm" value={d}
                          onChange={(e) => {
                            const nd = [...(editedCase?.directions || [])];
                            nd[i] = e.target.value;
                            setEditedCase((p) => p ? { ...p, directions: nd } : p);
                          }} />
                      ) : (
                        <span className="text-sm text-gray-700">{d}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Source text */}
                {sourceText && (
                  <div className="p-3 rounded border border-blue-100 bg-blue-50 border-l-4 border-l-blue-400">
                    <div className="section-label text-blue-700 mb-1">🔍 Source Text Highlight (from document)</div>
                    <p className="text-xs text-blue-800 italic">&quot;{sourceText}&quot;</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── AI Action Plan ────────────────────────────────────────────── */}
          <div className="glass-card p-5 animate-fade-in border-l-4 border-blue-800">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800">🎯 AI Action Plan</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200 font-semibold">
                Pre-Approval
              </span>
              {/* Case type badge */}
              {actionPlan.type && (
                <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${actionPlan.type === "Compliance"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : actionPlan.type.toLowerCase().includes("appeal")
                      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  }`}>
                  {actionPlan.type === "Compliance" ? "✔" : actionPlan.type.toLowerCase().includes("appeal") ? "⚖" : "ℹ"}{" "}
                  {actionPlan.type}
                </span>
              )}
            </div>

            {/* ── No-action state ─────────────────────────────────────────── */}
            {actionPlan.action === "No administrative action required" ? (
              <div className="space-y-3">
                <div className="p-4 rounded border border-gray-200 bg-gray-50 flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-1">
                      This judgment does not require administrative action.
                    </p>
                    <p className="text-xs text-gray-500">
                      AI has classified this judgment as:{" "}
                      <strong>{actionPlan.type}</strong>
                    </p>
                  </div>
                </div>
                {actionPlan.justification && (
                  <div className="p-3 rounded border border-blue-100 bg-blue-50 text-xs text-blue-900">
                    <strong>AI Reasoning:</strong> {actionPlan.justification}
                  </div>
                )}
              </div>
            ) : (
              /* ── Compliance action state ────────────────────────────────── */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  {[
                    { label: "Action Type", key: "type", icon: "🏷" },
                    { label: "Department", key: "department", icon: "🏛" },
                    { label: "Deadline", key: "deadline", icon: "📅" },
                    { label: "Priority", key: "priority", icon: "🔺" },
                  ].map(({ label, key, icon }) => (
                    <div key={key}>
                      <div className="section-label mb-1">{icon} {label}</div>
                      {isEditing && key !== "priority" ? (
                        <input className="input-dark text-sm"
                          value={editedPlan?.[key as keyof ActionPlan] as string || ""}
                          onChange={(e) => setEditedPlan((p) => p ? { ...p, [key]: e.target.value } : p)} />
                      ) : isEditing && key === "priority" ? (
                        <select className="input-dark text-sm"
                          value={editedPlan?.priority || "Medium"}
                          onChange={(e) => setEditedPlan((p) => p ? { ...p, priority: e.target.value } : p)}>
                          <option>High</option><option>Medium</option><option>Low</option>
                        </select>
                      ) : (
                        <div className="text-sm text-gray-800 bg-gray-50 border border-gray-100 rounded px-3 py-2">
                          {key === "priority"
                            ? <span className={PRIORITY_BADGE[actionPlan.priority] || PRIORITY_BADGE.Medium}>{actionPlan.priority} Priority</span>
                            : actionPlan[key as keyof ActionPlan] as string || "—"
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mb-3">
                  <div className="section-label mb-1">✅ Suggested Action</div>
                  {isEditing ? (
                    <textarea className="input-dark text-sm min-h-[72px]"
                      value={editedPlan?.action || ""}
                      onChange={(e) => setEditedPlan((p) => p ? { ...p, action: e.target.value } : p)} />
                  ) : (
                    <div className="text-sm text-gray-800 bg-gray-50 border border-gray-100 rounded px-3 py-2">
                      {actionPlan.action}
                    </div>
                  )}
                </div>

                {/* Explainable AI */}
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  <div className="section-label mb-1">🧠 Explainable AI Output</div>
                  {actionPlan.justification && (
                    <div className="p-3 rounded border border-blue-100 bg-blue-50 text-xs text-blue-900">
                      <strong>AI Reasoning:</strong> {actionPlan.justification}
                    </div>
                  )}
                  {sourceText && (
                    <div className="p-3 rounded border border-gray-200 bg-gray-50 border-l-4 border-l-gray-400 text-xs text-gray-600 italic">
                      <strong className="not-italic text-gray-500 font-semibold">Source text:</strong>{" "}
                      &quot;{sourceText}&quot;
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Reviewer Notes */}
          <div className="glass-card p-4 animate-fade-in">
            <div className="section-label mb-2">📝 Reviewer Notes (Optional)</div>
            <textarea className="input-dark text-sm min-h-[60px]"
              placeholder="Add remarks, concerns, or instructions for this record…"
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)} />
          </div>
        </div>

        {/* ══════════════════════════════════════
             RIGHT COLUMN
            ══════════════════════════════════════ */}
        <div className="space-y-4">

          {/* ── Confidence gauge ───────────────────────────────────────────── */}
          <div className="glass-card p-5 animate-fade-in text-center">
            <div className="section-label mb-3">AI Confidence Score</div>
            <div className="relative w-28 h-28 mx-auto mb-3">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="50" cy="50" r="44" fill="none"
                  stroke={CONFIDENCE_STROKE(confidence)}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - confidence / 100)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.8s ease" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-bold ${CONFIDENCE_COLOR(confidence)}`}>{confidence}%</span>
              </div>
            </div>
            {/* Confidence explanation text */}
            <p className={`text-xs font-medium ${CONFIDENCE_COLOR(confidence)}`}>
              {CONFIDENCE_LABEL(confidence)}
            </p>
          </div>

          {/* ── Decision buttons ───────────────────────────────────────────── */}
          <div className="glass-card p-5 animate-fade-in">
            <div className="section-label mb-3">Verification Decision</div>
            <div className="space-y-2">
              <button
                id="approve-btn"
                className="btn-primary btn-success w-full justify-center font-semibold text-sm"
                onClick={() => handleVerify(isEditing ? "edited" : "approved")}
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : "✓"}
                {isEditing ? "Save Edits & Approve" : "Approve Plan"}
              </button>
              <button
                id="reject-btn"
                className="btn-primary btn-danger w-full justify-center font-semibold text-sm"
                onClick={() => handleVerify("rejected")}
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : "✕"}
                Reject &amp; Discard
              </button>
            </div>
            <div className="mt-4 text-xs text-gray-400 space-y-1.5 border-t border-gray-100 pt-3">
              <div className="flex gap-1.5">
                <span className="text-green-600 font-bold">✓ Approve:</span>
                <span>Saved as a Human Verified Decision on the Dashboard.</span>
              </div>
              <div className="flex gap-1.5">
                <span className="text-red-600 font-bold">✕ Reject:</span>
                <span>Permanently discarded. Nothing is saved.</span>
              </div>
            </div>
          </div>

          {/* ── Legal basis ───────────────────────────────────────────────── */}
          {actionPlan.legal_basis && (
            <div className="glass-card p-4 animate-fade-in">
              <div className="section-label mb-1">⚖ Legal Basis</div>
              <p className="text-xs text-gray-600">{actionPlan.legal_basis}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
