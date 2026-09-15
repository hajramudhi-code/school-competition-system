import React, { useEffect, useState } from "react";
import { subjectsApi } from "../../api/subjectsApi";
import { LoadingState, ErrorState, EmptyState, StatusBadge, Modal, useToast } from "../../components/common/index.jsx";

export default function Subjects() {
  const [subjects, setSubjects] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(null);
  const { showToast } = useToast();

  function load() {
    setError(null);
    subjectsApi
      .list({})
      .then((res) => setSubjects(res.data))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function toggleStatus(subject) {
    const next = subject.status === "ENABLED" ? "DISABLED" : "ENABLED";
    try {
      await subjectsApi.setStatus(subject.id, next);
      showToast(`${subject.name} ${next.toLowerCase()}`, "success");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!subjects) return <LoadingState label="Loading subjects..." />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <p>Subjects are reused across seasons — disable one instead of deleting it when it's not in play.</p>
        <button className="btn btn-primary" onClick={() => setShowForm({})}>
          + Add Subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState title="No subjects yet" description="Add a subject to start building your question bank." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--bg-card-elevated)" }}>
                <th style={th}>Subject</th>
                <th style={th}>Code</th>
                <th style={th}>Status</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--border-color)" }}>
                  <td style={{ ...td, opacity: s.status === "DISABLED" ? 0.5 : 1 }}>{s.name}</td>
                  <td style={{ ...td, opacity: s.status === "DISABLED" ? 0.5 : 1, fontWeight: 700 }}>{s.code || "—"}</td>
                  <td style={td}>
                    <StatusBadge status={s.status} />
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button className="btn btn-ghost" onClick={() => setShowForm(s)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost" onClick={() => toggleStatus(s)}>
                      {s.status === "ENABLED" ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <SubjectFormModal
          subject={showForm}
          onClose={() => setShowForm(null)}
          onSaved={() => {
            setShowForm(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function SubjectFormModal({ subject, onClose, onSaved }) {
  const isEdit = !!subject.id;
  const [name, setName] = useState(subject.name || "");
  const [code, setCode] = useState(subject.code || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return setError("Subject name and code are required.");
    setBusy(true);
    setError("");
    try {
      if (isEdit) await subjectsApi.update(subject.id, { name, code });
      else await subjectsApi.create({ name, code });
      showToast(isEdit ? "Subject updated" : "Subject added", "success");
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Subject" : "Add Subject"} onClose={onClose}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="field-label">Subject Name</label>
          <input className={`input ${error ? "has-error" : ""}`} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="field-label">Subject Code</label>
          <input className={`input ${error ? "has-error" : ""}`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. math" maxLength={12} />
        </div>
        {error && <span className="field-error">{error}</span>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </button>
      </form>
    </Modal>
  );
}

const th = { padding: "12px 16px", fontSize: 12, color: "var(--text-muted)", fontWeight: 600 };
const td = { padding: "12px 16px" };
