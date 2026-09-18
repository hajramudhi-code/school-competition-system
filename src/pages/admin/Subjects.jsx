import React, { useEffect, useState } from "react";
import { subjectsApi } from "../../api/subjectsApi";
import { LoadingState, ErrorState, EmptyState, StatusBadge, Modal, InlineConfirm, usePolling, useToast } from "../../components/common/index.jsx";

export default function Subjects() {
  const [subjects, setSubjects] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(null);
  const [viewSubject, setViewSubject] = useState(null);
  const [deleteSubject, setDeleteSubject] = useState(null);
  const { showToast } = useToast();

  function load() {
    setError(null);
    subjectsApi
      .list({ search })
      .then((res) => setSubjects(res.data))
      .catch((e) => setError(e.message));
  }
  usePolling(load, 5000, [search]);

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

  async function removeSubject(subject) {
    try {
      await subjectsApi.remove(subject.id);
      showToast("Subject deleted", "success");
      setDeleteSubject(null);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!subjects) return <LoadingState label="Loading subjects..." />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <p>Subjects are reused across seasons — disable one instead of deleting it when it's not in play.</p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subjects..." aria-label="Search subjects" />
          <button className="btn btn-primary" onClick={() => setShowForm({})}>+ Add Subject</button>
        </div>
      </div>

      {subjects.length === 0 ? (
        <EmptyState title="No subjects yet" description="Add a subject to start building your question bank." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {deleteSubject && <InlineConfirm title="Delete subject" message={`Are you sure you want to delete ${deleteSubject.name}?`} onCancel={() => setDeleteSubject(null)} onConfirm={() => removeSubject(deleteSubject)} />}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--bg-card-elevated)" }}>
                <th style={th}>#</th>
                <th style={th}>Subject</th>
                <th style={th}>Code</th>
                <th style={th}>Status</th>
                <th style={th}>Registered</th>
                <th style={th}>Updated</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--border-color)" }}>
                  <td style={td}>{subjects.indexOf(s) + 1}</td>
                  <td style={{ ...td, opacity: s.status === "DISABLED" ? 0.5 : 1 }}>{s.name}</td>
                  <td style={{ ...td, fontWeight: 700, letterSpacing: "0.04em" }}>{s.code || "-"}</td>
                  <td style={td}>
                    <StatusBadge status={s.status} />
                  </td>
                  <td style={td}>{formatDate(s.createdAt)}</td>
                  <td style={td}>{formatDate(s.updatedAt || s.createdAt)}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button className="btn btn-ghost" onClick={() => setViewSubject(s)}>
                      View
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowForm(s)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost" onClick={() => toggleStatus(s)}>
                      {s.status === "ENABLED" ? "Disable" : "Enable"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setDeleteSubject(s)}>
                      Delete
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
      {viewSubject && <SubjectViewModal subject={viewSubject} onClose={() => setViewSubject(null)} />}
    </div>
  );
}

function SubjectViewModal({ subject, onClose }) {
  return (
    <Modal title="Subject Details" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Row label="Name" value={subject.name} />
        <Row label="Code" value={subject.code || "-"} />
        <Row label="Status" value={subject.status} />
        <Row label="Registered" value={formatDate(subject.createdAt)} />
        <Row label="Updated" value={formatDate(subject.updatedAt || subject.createdAt)} />
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
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
    if (!name.trim()) return setError("Subject name is required.");
    if (!isEdit && !code.trim()) return setError("Subject code is required.");
    setBusy(true);
    setError("");
    try {
      const payload = { name: name.trim() };
      if (code.trim()) payload.code = code.trim().toUpperCase();
      if (isEdit) await subjectsApi.update(subject.id, payload);
      else await subjectsApi.create(payload);
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
          <input
            className={`input ${error ? "has-error" : ""}`}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. MATH or LUCKY"
            maxLength={20}
          />
          <small style={{ display: "block", marginTop: 6, color: "var(--text-muted)" }}>
            Use <strong>LUCKY</strong> for the Lucky Question subject.
          </small>
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
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "-";
const Row = ({ label, value }) => <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span style={{ color: "var(--text-muted)" }}>{label}</span><strong>{value}</strong></div>;
