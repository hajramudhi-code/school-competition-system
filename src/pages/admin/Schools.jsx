import React, { useEffect, useState } from "react";
import { schoolsApi } from "../../api/schoolsApi";
import { LoadingState, ErrorState, EmptyState, StatusBadge, Modal, LogoUpload, useToast } from "../../components/common/index.jsx";

export default function Schools() {
  const [schools, setSchools] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(null); // null | {} | school
  const [viewSchool, setViewSchool] = useState(null);
  const { showToast } = useToast();

  function load() {
    setError(null);
    schoolsApi
      .list({})
      .then((res) => setSchools(res.data))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function toggleStatus(school) {
    const next = school.status === "ENABLED" ? "DISABLED" : "ENABLED";
    try {
      await schoolsApi.setStatus(school.id, next);
      showToast(`${school.name} ${next.toLowerCase()}`, "success");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function removeSchool(school) {
    if (!window.confirm(`Delete ${school.name}?`)) return;
    try {
      await schoolsApi.remove(school.id);
      showToast("School deleted", "success");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!schools) return <LoadingState label="Loading schools..." />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <p>Schools are reusable across competitions — disable rather than delete when a school sits out a season.</p>
        <button className="btn btn-primary" onClick={() => setShowForm({})}>
          + Add School
        </button>
      </div>

      {schools.length === 0 ? (
        <EmptyState title="No schools yet" description="Add your first school to start building competitions." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--bg-card-elevated)" }}>
                <th style={th}>#</th>
                <th style={th}>School</th>
                <th style={th}>Status</th>
                <th style={th}>Registered</th>
                <th style={th}>Updated</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--border-color)" }} className={s.status === "DISABLED" ? "" : ""}>
                  <td style={td}>{schools.indexOf(s) + 1}</td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: s.status === "DISABLED" ? 0.5 : 1 }}>
                      {s.logoUrl && <img src={s.logoUrl} alt="" width={28} height={28} style={{ borderRadius: 6 }} />}
                      {s.name}
                    </div>
                  </td>
                  <td style={td}>
                    <StatusBadge status={s.status} />
                  </td>
                  <td style={td}>{formatDate(s.createdAt)}</td>
                  <td style={td}>{formatDate(s.updatedAt)}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button className="btn btn-ghost" onClick={() => setViewSchool(s)}>
                      View
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowForm(s)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost" onClick={() => toggleStatus(s)}>
                      {s.status === "ENABLED" ? "Disable" : "Enable"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => removeSchool(s)}>
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
        <SchoolFormModal
          school={showForm}
          onClose={() => setShowForm(null)}
          onSaved={() => {
            setShowForm(null);
            load();
          }}
        />
      )}
      {viewSchool && <SchoolViewModal school={viewSchool} onClose={() => setViewSchool(null)} />}
    </div>
  );
}

function SchoolViewModal({ school, onClose }) {
  return (
    <Modal title="School Details" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {school.logoUrl && <img src={school.logoUrl} alt={`${school.name} logo`} width={80} height={80} style={{ objectFit: "contain", borderRadius: 8 }} />}
        <Row label="Name" value={school.name} />
        <Row label="Status" value={school.status} />
        <Row label="Registered" value={formatDate(school.createdAt)} />
        <Row label="Updated" value={formatDate(school.updatedAt)} />
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function SchoolFormModal({ school, onClose, onSaved }) {
  const isEdit = !!school.id;
  const [name, setName] = useState(school.name || "");
  const [logoUrl, setLogoUrl] = useState(school.logoUrl || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setError("School name is required.");
    setBusy(true);
    setError("");
    try {
      if (isEdit) await schoolsApi.update(school.id, { name, logoUrl });
      else await schoolsApi.create({ name, logoUrl });
      showToast(isEdit ? "School updated" : "School added", "success");
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit School" : "Add School"} onClose={onClose}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="field-label">School Name</label>
          <input className={`input ${error ? "has-error" : ""}`} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <LogoUpload value={logoUrl} onChange={setLogoUrl} label="School logo (optional)" />
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
