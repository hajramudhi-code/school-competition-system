import React, { useEffect, useState } from "react";
import { competitionsApi, sponsorsApi } from "../../api/competitionsApi";
import { schoolsApi } from "../../api/schoolsApi";
import { subjectsApi } from "../../api/subjectsApi";
import { usersApi } from "../../api/authApi";
import { LoadingState, ErrorState, StatusBadge, Modal, LogoUpload, PasswordInput, InlineConfirm, usePolling, useToast } from "../../components/common/index.jsx";

export default function CompetitionSetup() {
  const [competitions, setCompetitions] = useState(null);
  const [schools, setSchools] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [sponsors, setSponsors] = useState(null);
  const [activeTab, setActiveTab] = useState("competitions");
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editFor, setEditFor] = useState(null);
  const [assignFor, setAssignFor] = useState(null);
  const [staffNames, setStaffNames] = useState({});
  const { showToast } = useToast();

  function load() {
    setError(null);
    Promise.all([competitionsApi.list({}), schoolsApi.list({}), subjectsApi.list({}), sponsorsApi.list()])
      .then(async ([c, s, sub, sponsorResponse]) => {
        const competitionDetails = await Promise.all(c.data.map((competition) => competitionsApi.get(competition.id)));
        setCompetitions(competitionDetails);
        setStaffNames((current) => competitionDetails.reduce((names, competition) => ({
          ...names,
          ...(getStaffName(competition, "host") ? { [competition.hostId]: getStaffName(competition, "host") } : {}),
          ...(getStaffName(competition, "controller") ? { [competition.controllerId]: getStaffName(competition, "controller") } : {}),
        }), current));
        setSchools(s.data);
        setSubjects(sub.data);
        setSponsors(sponsorResponse.data);
      })
      .catch((e) => setError(e.message));
  }
  usePolling(load);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!competitions || !schools || !subjects || !sponsors) return <LoadingState label="Loading competition setup..." />;

  const selectedCompetition = competitions[0];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border-color)", marginBottom: 20 }}>
        <button className={activeTab === "competitions" ? "btn btn-secondary" : "btn btn-ghost"} onClick={() => setActiveTab("competitions")}>Competitions</button>
        <button className={activeTab === "sponsor" ? "btn btn-secondary" : "btn btn-ghost"} onClick={() => setActiveTab("sponsor")}>Sponsor</button>
      </div>

      {activeTab === "sponsor" ? (
        <SponsorPanel
          sponsors={sponsors}
          onSaved={load}
          showToast={showToast}
        />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <p>Create a competition, pick its registered schools and subjects, then assign Host and Controller accounts.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + New Competition
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {competitions.map((c) => (
              <div key={c.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <h3 style={{ marginBottom: 6 }}>{c.name}</h3>
                    <p style={{ fontSize: 13, margin: 0 }}>
                      {c.startDate} – {c.endDate}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <StatusBadge status={c.status} />
                    <button className="btn btn-secondary" onClick={() => setEditFor(c)}>
                      Edit
                    </button>
                    <button className="btn btn-secondary" onClick={() => setAssignFor(c)}>
                      Assign Host/Controller
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 13 }}>
                  <div>
                    <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Host</div>
                    <div>{c.hostId ? staffNames[c.hostId] || getStaffName(c, "host") || c.hostId : "Unassigned"}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Controller</div>
                    <div>{c.controllerId ? staffNames[c.controllerId] || getStaffName(c, "controller") || c.controllerId : "Unassigned"}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Schools</div>
                    <div>{c.schoolIds.length}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Subjects</div>
                    <div>{c.subjectIds.length}</div>
                  </div>
                </div>

                <div style={{ paddingTop: 4 }}>
                  <SummaryPanel competition={c} schools={schools} subjects={subjects} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showCreate && (
        <CompetitionFormModal
          schools={schools}
          subjects={subjects}
          onClose={() => setShowCreate(false)}
          title="New Competition"
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {editFor && (
        <CompetitionFormModal
          competition={editFor}
          schools={schools}
          subjects={subjects}
          onClose={() => setEditFor(null)}
          title="Edit Competition"
          onSaved={() => {
            setEditFor(null);
            load();
            showToast("Competition updated", "success");
          }}
        />
      )}
      {assignFor && (
        <AssignStaffModal
          competition={assignFor}
          onClose={() => setAssignFor(null)}
          onSaved={({ host, controller } = {}) => {
            setAssignFor(null);
            setStaffNames((current) => ({
              ...current,
              ...(getStaffResponseName(host) ? { [getStaffResponseId(host, "host")]: getStaffResponseName(host) } : {}),
              ...(getStaffResponseName(controller) ? { [getStaffResponseId(controller, "controller")]: getStaffResponseName(controller) } : {}),
            }));
            load();
            showToast("Host/Controller assigned", "success");
          }}
        />
      )}
    </div>
  );
}

function getStaffName(competition, role) {
  const prefix = role === "host" ? "host" : "controller";
  const staff = competition[prefix] || competition[`${prefix}Staff`] || competition[`${prefix}User`];
  if (typeof staff === "string") return staff;
  return competition[`${prefix}Name`] || staff?.name || staff?.fullName || staff?.displayName || "";
}

function getStaffResponseName(staff) {
  return staff?.name || staff?.fullName || staff?.displayName || staff?.user?.name || "";
}

function getStaffResponseId(staff, role) {
  return staff?.id || staff?.staffId || staff?.user?.id || `${role}-assigned`;
}

function SummaryPanel({ competition, schools, subjects }) {
  const schoolIds = new Set(competition?.schoolIds || []);
  const subjectIds = new Set(competition?.subjectIds || []);
  const participatingSchools = schools.filter((school) => schoolIds.has(school.id)).map((school) => school.name);
  const competitionSubjects = subjects.filter((subject) => subjectIds.has(subject.id)).map((subject) => subject.name);

  return (
    <div className="card" style={{ padding: "14px 18px 18px", background: "var(--bg-card)" }}>
      <h4 style={{ margin: "0 0 14px", color: "var(--text-muted)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Summary
      </h4>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <div>
          <h5 style={{ margin: "0 0 8px", fontSize: 14 }}>Participating Schools</h5>
          {participatingSchools.length === 0 ? (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>No schools assigned to this competition.</p>
          ) : (
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {participatingSchools.map((name, index) => (
                <li key={`${name}-${index}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                  <span style={{ minWidth: 28, color: "var(--text-muted)", fontWeight: 700 }}>{index + 1}.</span>
                  <span>{name}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div>
          <h5 style={{ margin: "0 0 8px", fontSize: 14 }}>Subjects in Use</h5>
          {competitionSubjects.length === 0 ? (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>No subjects assigned to this competition.</p>
          ) : (
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {competitionSubjects.map((name, index) => (
                <li key={`${name}-${index}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                  <span style={{ minWidth: 28, color: "var(--text-muted)", fontWeight: 700 }}>{index + 1}.</span>
                  <span>{name}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function SponsorPanel({ sponsors, onSaved, showToast }) {
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteSponsor, setDeleteSponsor] = useState(null);
  const [busy, setBusy] = useState(false);

  async function removeSponsor(sponsor) {
    setBusy(true);
    try {
      await sponsorsApi.remove(sponsor.id);
      showToast("Sponsor deleted", "success");
      setDeleteSponsor(null);
      onSaved();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div>
          <h3>Sponsors</h3>
          <p style={{ marginTop: 6 }}>Manage the sponsors available to competitions.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingSponsor(null); setShowForm(true); }}>
          <i className="fas fa-plus" aria-hidden="true" /> Add Sponsor
        </button>
      </div>
      {sponsors.length === 0 ? (
        <EmptyState title="No sponsors yet" description="Add a sponsor to make it available for competition reports." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {sponsors.map((sponsor) => (
              <div key={sponsor.id} className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", minWidth: 180 }}>
                {sponsor.logoUrl ? <img src={sponsor.logoUrl} alt="" width={32} height={32} style={{ objectFit: "contain", borderRadius: 6 }} /> : <span style={{ width: 32, height: 32, display: "grid", placeItems: "center", borderRadius: 6, background: "var(--bg-card-elevated)", color: "var(--text-muted)" }}><i className="fas fa-building" aria-hidden="true" /></span>}
                <strong style={{ flex: 1, fontSize: 13 }}>{sponsor.name}</strong>
                <button className="btn btn-ghost" onClick={() => { setEditingSponsor(sponsor); setShowForm(true); }} aria-label={`Edit ${sponsor.name}`} title="Edit sponsor"><i className="fas fa-pen" aria-hidden="true" /></button>
                <button className="btn btn-ghost" onClick={() => setDeleteSponsor(sponsor)} aria-label={`Delete ${sponsor.name}`} title="Delete sponsor"><i className="fas fa-trash" aria-hidden="true" /></button>
              </div>
            ))}
          </div>
          {deleteSponsor && <InlineConfirm title="Delete sponsor" message={`Delete ${deleteSponsor.name}?`} onCancel={() => setDeleteSponsor(null)} onConfirm={() => removeSponsor(deleteSponsor)} />}
        </div>
      )}
      {showForm && <SponsorFormModal sponsor={editingSponsor} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); onSaved(); }} showToast={showToast} />}
    </div>
  );
}

function SponsorFormModal({ sponsor, onClose, onSaved, showToast }) {
  const [name, setName] = useState(sponsor?.name || "");
  const [logoUrl, setLogoUrl] = useState(sponsor?.logoUrl || "");
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Sponsor name is required.");
    setBusy(true);
    setError("");
    try {
      if (logoFile) {
        const formData = new FormData();
        formData.append("name", name.trim());
        formData.append("logo", logoFile);
        sponsor ? await sponsorsApi.updateWithLogo(sponsor.id, formData) : await sponsorsApi.createWithLogo(formData);
      } else {
        const payload = { name: name.trim() };
        if (logoUrl && !logoUrl.startsWith("data:")) payload.logoUrl = logoUrl;
        sponsor ? await sponsorsApi.update(sponsor.id, payload) : await sponsorsApi.create(payload);
      }
      showToast("Sponsor saved", "success");
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={sponsor ? "Edit Sponsor" : "Add Sponsor"} onClose={onClose}>
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label className="field-label">Sponsor Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zanzibar Telecom" autoFocus />
        </div>
        <LogoUpload value={logoUrl} onChange={setLogoUrl} onFileChange={setLogoFile} label="Sponsor logo" aspectRatio={null} />
        {error && <span className="field-error">{error}</span>}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving..." : "Save Sponsor"}</button>
      </form>
    </Modal>
  );
}

function CompetitionFormModal({ competition, schools, subjects, onClose, onSaved, title }) {
  const isEdit = Boolean(competition);
  const [name, setName] = useState(competition?.name || "");
  const [logoUrl, setLogoUrl] = useState(competition?.logoUrl || "");
  const [questionDurationSeconds, setQuestionDurationSeconds] = useState(competition?.questionDurationSeconds || 30);
  const [startDate, setStartDate] = useState(competition?.startDate || "");
  const [endDate, setEndDate] = useState(competition?.endDate || "");
  const [schoolIds, setSchoolIds] = useState(competition?.schoolIds || []);
  const [subjectIds, setSubjectIds] = useState(competition?.subjectIds || []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function toggleSchool(id, disabled) {
    if (disabled) return;
    setSchoolIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  function toggleSubject(id, disabled) {
    if (disabled) return;
    setSubjectIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!name || !startDate || !endDate) return setError("Name and dates are required.");
    if (schoolIds.length < 2) return setError("Select at least 2 schools.");
    if (subjectIds.length < 1) return setError("Select at least 1 subject.");
    if (new Date(endDate) < new Date(startDate)) return setError("End date must be after start date.");
    if (!Number.isInteger(Number(questionDurationSeconds)) || Number(questionDurationSeconds) < 5 || Number(questionDurationSeconds) > 300)
      return setError("Question time must be between 5 and 300 seconds.");
    setBusy(true);
    try {
      const payload = {
        name,
        logoUrl,
        questionDurationSeconds: Number(questionDurationSeconds),
        startDate,
        endDate,
        schoolIds,
        subjectIds,
      };
      if (isEdit) await competitionsApi.update(competition.id, payload);
      else await competitionsApi.create(payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose} width={640}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label className="field-label">Competition Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <LogoUpload value={logoUrl} onChange={setLogoUrl} label="Competition logo (optional)" />
        <div>
          <label className="field-label">Time per question (seconds)</label>
          <input className="input" type="number" min="5" max="300" step="1" value={questionDurationSeconds} onChange={(e) => setQuestionDurationSeconds(e.target.value)} />
          <p style={{ fontSize: 12, marginTop: 6 }}>Duration for each question.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="field-label">Start Date</label>
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">End Date</label>
            <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="field-label">Subjects</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {subjects.map((s) => {
              const disabled = s.status === "DISABLED";
              const checked = subjectIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={disabled ? "disabled-row" : ""}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--border-color)",
                    background: checked ? "var(--bg-card-elevated)" : "transparent",
                    fontSize: 13,
                  }}
                >
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleSubject(s.id, disabled)} />
                  {s.name} {disabled && "DISABLED"}
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="field-label">Registered Schools</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 220, overflowY: "auto", padding: 4 }}>
            {schools.map((s) => {
              const disabled = s.status === "DISABLED";
              const checked = schoolIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={disabled ? "disabled-row" : ""}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--border-color)",
                    background: checked ? "var(--bg-card-elevated)" : "transparent",
                    fontSize: 13,
                  }}
                >
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleSchool(s.id, disabled)} />
                  {s.name} {disabled && <span style={{ color: "var(--text-muted)" }}>DISABLED</span>}
                </label>
              );
            })}
          </div>
        </div>

        {error && <span className="field-error">{error}</span>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving..." : isEdit ? "Save Changes" : "Create Competition"}
        </button>
      </form>
    </Modal>
  );
}

function AssignStaffModal({ competition, onClose, onSaved }) {
  const host = getAssignedStaff(competition, "host");
  const controller = getAssignedStaff(competition, "controller");
  const [hostName, setHostName] = useState(host.name);
  const [hostUsername, setHostUsername] = useState(host.username);
  const [hostPassword, setHostPassword] = useState("");
  const [controllerName, setControllerName] = useState(controller.name);
  const [controllerUsername, setControllerUsername] = useState(controller.username);
  const [controllerPassword, setControllerPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      let host;
      let controller;
      if (host.id) {
        if (hostName.trim() || hostUsername.trim() || hostPassword.trim()) {
          host = await usersApi.updateStaff(host.id, buildStaffPayload(hostName, hostUsername, hostPassword));
        }
      } else if (hostName && hostUsername && hostPassword) {
        host = await usersApi.assignHost(competition.id, { name: hostName.trim(), username: hostUsername.trim(), password: hostPassword });
      }
      if (controller.id) {
        if (controllerName.trim() || controllerUsername.trim() || controllerPassword.trim()) {
          controller = await usersApi.updateStaff(controller.id, buildStaffPayload(controllerName, controllerUsername, controllerPassword));
        }
      } else if (controllerName && controllerUsername && controllerPassword) {
        controller = await usersApi.assignController(competition.id, { name: controllerName.trim(), username: controllerUsername.trim(), password: controllerPassword });
      }
      onSaved({ host, controller });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Assign Staff — ${competition.name}`} onClose={onClose} width={560}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h4 style={{ marginBottom: 10 }}>Host</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input className="input" placeholder="Host Name" value={hostName} onChange={(e) => setHostName(e.target.value)} />
            <input className="input" placeholder="Host Username" value={hostUsername} onChange={(e) => setHostUsername(e.target.value)} />
            <PasswordInput placeholder="Host Password" value={hostPassword} onChange={(e) => setHostPassword(e.target.value)} />
          </div>
          {host.id && <button type="button" className="btn btn-danger" style={{ marginTop: 10 }} disabled title="Remove endpoint is not available yet">Remove Host</button>}
        </div>
        <div>
          <h4 style={{ marginBottom: 10 }}>Controller</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input className="input" placeholder="Controller Name" value={controllerName} onChange={(e) => setControllerName(e.target.value)} />
            <input className="input" placeholder="Controller Username" value={controllerUsername} onChange={(e) => setControllerUsername(e.target.value)} />
            <PasswordInput placeholder="Controller Password" value={controllerPassword} onChange={(e) => setControllerPassword(e.target.value)} />
          </div>
          {controller.id && <button type="button" className="btn btn-danger" style={{ marginTop: 10 }} disabled title="Remove endpoint is not available yet">Remove Controller</button>}
        </div>
        {error && <span className="field-error">{error}</span>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving..." : "Save Assignments"}
        </button>
      </form>
    </Modal>
  );
}

function getAssignedStaff(competition, role) {
  const staff = competition[role] || competition[`${role}Staff`] || competition[`${role}User`] || {};
  return {
    id: competition[`${role}Id`] || staff.id || staff.staffId || staff.user?.id || "",
    name: getStaffName(competition, role),
    username: staff.username || staff.user?.username || "",
  };
}

function buildStaffPayload(name, username, password) {
  return Object.fromEntries(Object.entries({ name: name.trim(), username: username.trim(), password: password.trim() }).filter(([, value]) => value));
}
