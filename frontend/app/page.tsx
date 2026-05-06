"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  uploadPDF, getDemoJudgment, extractData,
  generateActionPlan, summarizeJudgment,
} from "@/lib/api";

const STEPS = ["Upload", "Summarise", "Extract", "Plan", "Verify"];

const ACCEPTED_TYPES = ".pdf,.docx,.txt,.jpg,.jpeg,.png";
const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "📄", docx: "📝", txt: "📃", jpg: "🖼", jpeg: "🖼", png: "🖼",
};
const FILE_TYPE_LABELS = ["PDF", "DOCX", "TXT", "JPG", "PNG"];

interface Summary {
  case_summary: string;
  court_directions: string[];
  case_type: "compliance" | "appeal" | "informational";
  summary_confidence: number;
}

const CASE_TYPE_META = {
  compliance:    { label: "Compliance Required", badge: "bg-blue-100 text-blue-800 border-blue-200",  icon: "✔" },
  appeal:        { label: "Consider Appeal",     badge: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "⚖" },
  informational: { label: "Informational",       badge: "bg-gray-100 text-gray-600 border-gray-200", icon: "ℹ" },
};

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep]           = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile]           = useState<File | null>(null);
  const [loading, setLoading]     = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError]         = useState("");
  const [extractedData, setExtractedData] = useState<Record<string, unknown> | null>(null);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(true);

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    const allowed = ["pdf", "docx", "txt", "jpg", "jpeg", "png"];
    if (!allowed.includes(ext)) {
      setError(`Unsupported file type. Please upload: ${FILE_TYPE_LABELS.join(", ")}`);
      return;
    }
    setFile(f); setError("");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const runPipeline = async (uploadResult: Record<string, unknown>) => {
    const text     = uploadResult.full_text as string;
    const filename = uploadResult.filename as string;
    let summaryResult: { case_type?: string } | null = null;

    // Step 2 — Summarise
    setLoadingMsg("Generating case summary…");
    try {
      const sum = await summarizeJudgment(text, filename);
      summaryResult = sum;
      setSummary(sum);
      sessionStorage.setItem("nyaya_summary", JSON.stringify(sum));
      setStep(2);
    } catch { /* non-fatal */ }

    // Step 3 — Extract
    setLoadingMsg("Extracting legal data…");
    try {
      const extracted = await extractData(text, filename);
      setExtractedData(extracted);
      setStep(3);

      // Step 4 — Action Plan (pass case_type so Informational cases are handled safely)
      setLoadingMsg("Generating action plan…");
      const plan = await generateActionPlan({
        ...extracted,
        case_type: summaryResult?.case_type ?? "",
      });
      sessionStorage.setItem("nyaya_case_data", JSON.stringify(extracted));
      sessionStorage.setItem("nyaya_action_plan", JSON.stringify(plan));
      sessionStorage.setItem("nyaya_upload_data", JSON.stringify(uploadResult));
      setStep(4);
    } catch (e) {
      setError(`Processing failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setLoading(false); setLoadingMsg("");
    }
  };

  const processUpload = async () => {
    if (!file) return;
    setLoading(true); setError("");
    setLoadingMsg("Uploading and extracting text…");
    try {
      const data = await uploadPDF(file);
      setStep(1);
      await runPipeline(data);
    } catch (e) {
      setError(`Upload failed: ${e instanceof Error ? e.message : "Unknown"}`);
      setLoading(false); setLoadingMsg("");
    }
  };

  const loadDemo = async () => {
    setLoading(true); setError("");
    setLoadingMsg("Loading demo judgment…");
    try {
      const data = await getDemoJudgment();
      setFile({ name: data.filename } as File);
      setStep(1);
      await runPipeline(data);
    } catch (e) {
      setError(`Demo failed: ${e instanceof Error ? e.message : "Unknown"}`);
      setLoading(false); setLoadingMsg("");
    }
  };

  const fileExt = file?.name.split(".").pop()?.toLowerCase() || "";
  const fileIcon = FILE_TYPE_ICONS[fileExt] || "📄";
  const ctMeta = summary ? CASE_TYPE_META[summary.case_type] : null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">

      {/* Page header — hidden once processing starts */}
      {step === 0 && (
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Upload Court Document</h1>
          <p className="text-sm text-gray-500 mt-1">
            Supports PDF, DOCX, TXT and scanned images (JPG/PNG). The system will summarise, extract, and generate a verified action plan.
          </p>
        </div>
      )}

      {/* Step progress */}
      <div className="flex items-center gap-1.5 mb-6 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 shrink-0">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              i < step ? "step-done" : i === step ? "step-active" : "step-pending"
            }`}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs border border-current font-bold">
                {i < step ? "✓" : i + 1}
              </span>
              {s}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-px ${i < step ? "bg-blue-800" : "bg-gray-300"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm flex gap-2 animate-fade-in">
          <span className="font-bold shrink-0">⚠</span> {error}
        </div>
      )}

      {/* ── Upload Card ── */}
      {step < 4 && (
        <div className="glass-card p-6 mb-4 animate-fade-in">
          <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-800 text-white text-xs flex items-center justify-center font-bold">1</span>
            Select Document
          </h2>
          <p className="text-xs text-gray-400 mb-4 ml-8">
            Accepted formats: {FILE_TYPE_LABELS.join(" · ")}
          </p>

          {/* Drop zone */}
          <div
            className={`drop-zone relative p-10 text-center ${isDragging ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input" type="file" accept={ACCEPTED_TYPES} className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {/* ✕ clear button — top-right corner, only when file selected */}
            {file && (
              <button
                id="clear-file-btn"
                title="Remove file and select another"
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 border border-gray-200 hover:bg-red-100 hover:border-red-300 hover:text-red-600 text-gray-400 text-sm font-bold flex items-center justify-center transition-colors shadow-sm z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setError("");
                  const input = document.getElementById("file-input") as HTMLInputElement;
                  if (input) input.value = "";
                }}
              >
                ✕
              </button>
            )}

            <div className="text-4xl mb-3">{file ? fileIcon : "☁"}</div>
            {file ? (
              <>
                <p className="font-semibold text-gray-800 text-sm truncate max-w-xs mx-auto">{file.name}</p>
                <p className="text-xs text-gray-400 mt-1 uppercase">{fileExt} — Ready for processing</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-700 text-sm mb-1">
                  Drag &amp; drop file here, or click to browse
                </p>
                <div className="flex justify-center gap-2 mt-2 flex-wrap">
                  {FILE_TYPE_LABELS.map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-500">
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Loading progress */}
          {loading && loadingMsg && (
            <div className="mt-3 flex items-center gap-2 text-xs text-blue-800">
              <span className="spinner" />
              <span>{loadingMsg}</span>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              id="upload-btn"
              className="btn-primary flex-1 justify-center"
              onClick={processUpload}
              disabled={!file || loading}
            >
              {loading ? <><span className="spinner" /> Processing…</> : <>📤 Process Document</>}
            </button>
            <button id="demo-btn" className="btn-primary btn-ghost" onClick={loadDemo} disabled={loading}>
              🔍 Load Demo
            </button>
          </div>
        </div>
      )}

      {/* ── DOCUMENT SUMMARY (narrative) ── */}
      {summary && (
        <div className="glass-card mb-4 animate-fade-in overflow-hidden border-l-4 border-blue-800">
          <button
            className="w-full flex items-center justify-between px-5 py-3 bg-blue-50 border-b border-blue-100 hover:bg-blue-100 transition-colors"
            onClick={() => setSummaryOpen(!summaryOpen)}
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-800 text-white text-xs flex items-center justify-center font-bold">2</span>
              <span className="text-sm font-bold text-blue-900">AI Document Summary</span>
              {ctMeta && (
                <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${ctMeta.badge}`}>
                  {ctMeta.icon} {ctMeta.label}
                </span>
              )}
            </div>
            <span className="text-blue-600 text-xs">{summaryOpen ? "▲ Collapse" : "▼ Expand"}</span>
          </button>

          {summaryOpen && (
            <div className="p-5 space-y-4">
              {/* AI disclaimer */}
              <div className="p-2.5 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs font-medium flex gap-2">
                <span>⚠</span>
                <span>AI-generated summary for quick reference only. Always verify against the original document.</span>
              </div>

              {/* Narrative */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">📄 Case Summary</h3>
                <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                  {summary.case_summary.split('. ').filter(Boolean).map((sentence, i) => (
                    <p key={i}>{sentence.endsWith('.') ? sentence : sentence + '.'}</p>
                  ))}
                  {summary.court_directions[0] !== "No direct compliance required." && (
                    <p className="text-gray-500">As a result, the court ordered the following actions:</p>
                  )}
                </div>
              </div>

              {/* Court Directions */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">📌 Court Directions</h3>
                {summary.court_directions[0] === "No direct compliance required." ? (
                  <div className="p-3 rounded border border-gray-200 bg-gray-50 text-sm text-gray-500 flex gap-2 items-center">
                    <span>⚠️</span>
                    <span>This judgment does not require administrative action.</span>
                  </div>
                ) : (
                  <ol className="space-y-2">
                    {summary.court_directions.map((d, i) => (
                      <li key={i} className="flex gap-3 p-3 rounded border border-gray-200 bg-gray-50">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-800 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-800">{d}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Extracted Data ── */}
      {extractedData && (
        <div className="glass-card p-6 mb-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-800 text-white text-xs flex items-center justify-center font-bold">3</span>
              Extracted Legal Data
            </h2>
            <span className={`text-xs font-bold ${
              (extractedData.confidence as number) >= 80 ? "text-green-700" :
              (extractedData.confidence as number) >= 50 ? "text-yellow-700" : "text-red-700"
            }`}>
              {extractedData.confidence as number}% confidence
            </span>
          </div>
          <div className="bg-gray-100 rounded-full h-1.5 mb-4">
            <div className="confidence-bar" style={{ width: `${extractedData.confidence as number}%` }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Case Title", key: "case_title", icon: "⚖" },
              { label: "Date of Order", key: "date", icon: "📅" },
              { label: "Parties", key: "parties", icon: "👥" },
              { label: "Timeline", key: "timeline", icon: "⏱" },
            ].map(({ label, key, icon }) => (
              <div key={key} className="p-3 rounded border border-gray-100 bg-gray-50">
                <div className="section-label mb-1">{icon} {label}</div>
                <div className="text-sm text-gray-800 font-medium">
                  {(extractedData[key] as string) || "—"}
                </div>
              </div>
            ))}
          </div>
          {typeof extractedData.source_text === "string" && extractedData.source_text && (
            <div className="mt-3 p-3 rounded border border-blue-100 bg-blue-50">
              <div className="section-label text-blue-700 mb-1">🔍 Source Text</div>
              <p className="text-xs text-blue-800 italic">
                &quot;{extractedData.source_text as string}&quot;</p>
            </div>
          )}
        </div>
      )}

      {/* ── Complete ── */}
      {step === 4 && (
        <div className="glass-card p-6 text-center animate-fade-in border-l-4 border-green-600">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="font-bold text-gray-900 mb-1">All Steps Complete</h3>
          <p className="text-gray-500 text-sm mb-5">
            Document summarised, data extracted, and action plan ready. Proceed to human verification.
          </p>
          <button id="go-verify-btn" className="btn-primary btn-success" onClick={() => router.push("/verify")}>
            Proceed to Verification →
          </button>
        </div>
      )}

      {/* ── Info cards (only before upload) ── */}
      {step === 0 && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 animate-fade-in">
          {[
            { icon: "📄", title: "Multi-Format", desc: "PDF, DOCX, TXT, JPG, PNG" },
            { icon: "📋", title: "AI Summary", desc: "Plain English case story" },
            { icon: "🤖", title: "AI Extraction", desc: "Metadata + directions" },
            { icon: "👤", title: "Human Verified", desc: "No record saved without approval" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="glass-card p-4 border-t-2 border-blue-800">
              <div className="text-xl mb-2">{icon}</div>
              <div className="text-sm font-semibold text-gray-800 mb-1">{title}</div>
              <div className="text-xs text-gray-500">{desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
