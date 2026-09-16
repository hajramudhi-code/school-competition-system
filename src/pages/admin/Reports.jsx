import React, { useEffect, useState } from "react";
import { competitionsApi, reportsApi } from "../../api/competitionsApi";
import { LoadingState, ErrorState, useToast } from "../../components/common/index.jsx";

export default function Reports() {
  const [competitions, setCompetitions] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    competitionsApi
      .list({})
      .then((res) => {
        setCompetitions(res.data);
        if (res.data[0]) setSelectedId(res.data[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!report || report.status !== "PROCESSING") return;
    const id = setInterval(async () => {
      try {
        const updated = await reportsApi.getStatus(report.reportId);
        setReport(updated);
        if (updated.status === "READY") clearInterval(id);
      } catch (e) {
        showToast(e.message, "error");
        clearInterval(id);
      }
    }, 700);
    return () => clearInterval(id);
  }, [report]);

  async function generate() {
    setReport(null);
    try {
      const res = await competitionsApi.requestReport(selectedId);
      setReport(res);
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function download() {
    try {
      const blob = await reportsApi.downloadFile(report.reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const competitionName = competitions.find((competition) => competition.id === selectedId)?.name || "competition-report";
      a.download = `${sanitizeFilename(competitionName)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!competitions) return <LoadingState label="Loading reports..." />;

  return (
    <div>
      <p style={{ marginBottom: 20 }}>
        Reports are generated server-side as a PDF from the live database — the frontend only requests and downloads.
      </p>
      <div className="card" style={{ maxWidth: 480 }}>
        <label className="field-label">Competition</label>
        <select className="input" style={{ marginBottom: 16 }} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={generate} disabled={report?.status === "PROCESSING"}>
          Generate Report
        </button>

        {report && (
          <div style={{ marginTop: 20 }}>
            {report.status === "PROCESSING" && <LoadingState label="Generating PDF..." />}
            {report.status === "READY" && (
              <button className="btn btn-success" onClick={download}>
                Preview / Download PDF
              </button>
            )}
            {report.status === "FAILED" && <p style={{ color: "var(--danger)" }}>Report generation failed.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function sanitizeFilename(value) {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "competition-report";
}
