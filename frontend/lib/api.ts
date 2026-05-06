const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `API error: ${res.status}`);
  }
  return res.json();
}

/** Upload a document — PDF, DOCX, TXT, JPG, PNG */
export async function uploadPDF(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return fetchAPI("/upload-pdf", { method: "POST", body: formData });
}

/** Return a pre-loaded demo judgment */
export async function getDemoJudgment() {
  return fetchAPI("/demo-judgment");
}

/**
 * Summarise a judgment.
 * Returns: { case_summary, court_directions, case_type, summary_confidence }
 */
export async function summarizeJudgment(fullText: string, filename?: string) {
  return fetchAPI("/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_text: fullText, filename }),
  });
}

/** Extract structured legal data from text */
export async function extractData(fullText: string, filename?: string) {
  return fetchAPI("/extract-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_text: fullText, filename }),
  });
}

/** Generate AI action plan from extracted data */
export async function generateActionPlan(extractedData: Record<string, unknown>) {
  return fetchAPI("/generate-action-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(extractedData),
  });
}

/** Submit verification decision (approved / edited / rejected) */
export async function verifyRecord(payload: {
  case_data: Record<string, unknown>;
  action_plan: Record<string, unknown>;
  status: string;
  reviewer_notes?: string;
}) {
  return fetchAPI("/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Get all approved dashboard records with statistics */
export async function getDashboard() {
  return fetchAPI("/dashboard");
}

/** Update completion status of a record */
export async function updateRecordStatus(id: number, status: string) {
  return fetchAPI(`/records/${id}/status?completion_status=${status}`, {
    method: "PUT",
  });
}

/** Delete a record from the dashboard */
export async function deleteRecord(id: number) {
  return fetchAPI(`/records/${id}`, { method: "DELETE" });
}
