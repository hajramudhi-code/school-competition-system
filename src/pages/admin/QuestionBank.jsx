import React, { useEffect, useState } from "react";
import { questionsApi, templatesApi } from "../../api/questionsApi";
import { subjectsApi } from "../../api/subjectsApi";
import { isLuckyQuestionSubject } from "../../utils/liveState";
import { LoadingState, ErrorState, EmptyState, StatusBadge, Modal, usePolling, useToast } from "../../components/common/index.jsx";

export default function QuestionBank() {
  const [subjects, setSubjects] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [hasTotal, setHasTotal] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState(null);
  const [filterSubject, setFilterSubject] = useState("");
  const [search, setSearch] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [showDownloadConfig, setShowDownloadConfig] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const { showToast } = useToast();

  function load() {
    setError(null);
    const questionParams = { page, pageSize, ...(filterSubject ? { subjectId: filterSubject } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
    Promise.all([subjectsApi.list({}), questionsApi.list(questionParams)])
      .then(([s, q]) => {
        setSubjects(s.data);
        setQuestions(q.data);
        const total = q.total ?? q.pagination?.total ?? q.meta?.total;
        setHasTotal(Number.isFinite(total));
        setTotalQuestions(total ?? q.data.length);
      })
      .catch((e) => setError(e.message));
  }
  usePolling(load, 5000, [filterSubject, page, search]);

  async function removeQuestion(id) {
    try {
      await questionsApi.remove(id);
      showToast("Question deleted", "success");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!subjects || !questions) return <LoadingState label="Loading question bank..." />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <input className="input" style={{ width: 220 }} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search questions..." aria-label="Search questions" />
        <select className="input" style={{ width: 220 }} value={filterSubject} onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }}>
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowUpload(true)}>
            Upload Template
          </button>
          <button className="btn btn-secondary" onClick={() => setShowDownloadConfig(true)}>
            Download Template
          </button>
          <button className="btn btn-primary" onClick={() => setShowManualForm(true)}>
            + Add Question
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <EmptyState title="No questions yet" description="Add manually, or download a template to bulk-prepare questions." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--bg-card-elevated)" }}>
                <th style={th}>#</th>
                <th style={th}>Question</th>
                <th style={th}>Subject</th>
                <th style={th}>Mode</th>
                <th style={th}>Marks</th>
                <th style={th}>Video</th>
                <th style={th}>Status</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, index) => (
                <tr key={q.id} style={{ borderTop: "1px solid var(--border-color)" }}>
                  <td style={td}>{(page - 1) * pageSize + index + 1}</td>
                  <td style={{ ...td, maxWidth: 320 }}>{q.text}</td>
                  <td style={td}>{subjects.find((s) => s.id === q.subjectId)?.name}</td>
                  <td style={td}>{q.mode.replace("_", " ")}</td>
                  <td style={td}>{q.marks}</td>
                  <td style={td}>{q.isVideoQuestion ? `🎬 ${q.personName}` : "—"}</td>
                  <td style={td}>
                    <StatusBadge status={q.status} />
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button className="btn btn-ghost" onClick={() => removeQuestion(q.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {questions.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 12 }}>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Showing {(page - 1) * pageSize + 1}-{(page - 1) * pageSize + questions.length} of {hasTotal ? totalQuestions : `${totalQuestions}+`} questions
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </button>
            <span style={{ display: "inline-flex", alignItems: "center", padding: "0 8px", fontSize: 13 }}>Page {page}</span>
            <button className="btn btn-secondary" disabled={questions.length < pageSize || (hasTotal && page * pageSize >= totalQuestions)} onClick={() => setPage((current) => current + 1)}>
              Next
            </button>
          </div>
        </div>
      )}

      {showManualForm && (
        <ManualQuestionModal
          subjects={subjects}
          onClose={() => setShowManualForm(false)}
          onSaved={() => {
            setShowManualForm(false);
            load();
          }}
        />
      )}
      {showDownloadConfig && <DownloadTemplateModal subjects={subjects} onClose={() => setShowDownloadConfig(false)} />}
      {showUpload && (
        <UploadTemplateModal
          subjects={subjects}
          onClose={() => setShowUpload(false)}
          onDone={() => {
            setShowUpload(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ManualQuestionModal({ subjects, onClose, onSaved }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [mode, setMode] = useState("MULTIPLE_CHOICE");
  const [text, setText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [marks, setMarks] = useState(10);
  const [isVideoQuestion, setIsVideoQuestion] = useState(false);
  const [personName, setPersonName] = useState("");
  const [personImageUrl, setPersonImageUrl] = useState("");
  const [personImageFile, setPersonImageFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  function onVideoToggle(checked) {
    setIsVideoQuestion(checked);
    if (checked && mode === "MENTION") setMode("MULTIPLE_CHOICE");
  }

  function handlePersonImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be 10 MB or smaller.");
      return;
    }
    setPersonImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setPersonImageUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!subjectId || !text || !marks) return setError("Subject, question text and marks are required.");
    if (isVideoQuestion && !isLuckyQuestionSubject(subjects.find((subject) => subject.id === subjectId))) {
      return setError("Video questions must use the Lucky Question subject.");
    }
    if (isVideoQuestion && (!personName || !personImageUrl || !youtubeUrl)) {
      return setError("Video questions need a person name, image, and YouTube URL.");
    }
    setBusy(true);
    try {
      const payload = {
        subjectId,
        mode,
        text,
        marks: Number(marks),
        optionA: mode === "MULTIPLE_CHOICE" ? optionA : undefined,
        optionB: mode === "MULTIPLE_CHOICE" ? optionB : undefined,
        optionC: mode === "MULTIPLE_CHOICE" ? optionC : undefined,
        optionD: mode === "MULTIPLE_CHOICE" ? optionD : undefined,
        correctAnswer,
        isVideoQuestion,
        personName: isVideoQuestion ? personName : undefined,
        personImageUrl: isVideoQuestion && !personImageFile ? personImageUrl : undefined,
        youtubeUrl: isVideoQuestion ? youtubeUrl : undefined,
      };
      if (isVideoQuestion && personImageFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined) formData.append(key, String(value));
        });
        formData.append("personImage", personImageFile);
        await questionsApi.createWithImage(formData);
      } else {
        await questionsApi.create(payload);
      }
      showToast("Question added", "success");
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add Question" onClose={onClose} width={560}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="field-label">Subject</label>
            <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id} disabled={s.status === "DISABLED"}>
                  {s.name} {s.status === "DISABLED" ? "(disabled)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Marks</label>
            <input className="input" type="number" min={1} value={marks} onChange={(e) => setMarks(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="field-label">Question Mode</label>
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="MENTION" disabled={isVideoQuestion}>
              Mention {isVideoQuestion ? "(not available for video questions)" : ""}
            </option>
          </select>
        </div>

        <div>
          <label className="field-label">Question</label>
          <textarea className="input" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
        </div>

        {mode === "MULTIPLE_CHOICE" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input className="input" placeholder="Option A" value={optionA} onChange={(e) => setOptionA(e.target.value)} />
            <input className="input" placeholder="Option B" value={optionB} onChange={(e) => setOptionB(e.target.value)} />
            <input className="input" placeholder="Option C" value={optionC} onChange={(e) => setOptionC(e.target.value)} />
            <input className="input" placeholder="Option D" value={optionD} onChange={(e) => setOptionD(e.target.value)} />
          </div>
        )}

        <div>
          <label className="field-label">Correct Answer</label>
          {mode === "MULTIPLE_CHOICE" && (
            <select className="input" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}>
              {["A", "B", "C", "D"].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          )}
          {mode === "TRUE_FALSE" && (
            <select className="input" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}>
              <option value="TRUE">True</option>
              <option value="FALSE">False</option>
            </select>
          )}
          {mode === "MENTION" && (
            <input className="input" placeholder="Expected answer" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} />
          )}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={isVideoQuestion} onChange={(e) => onVideoToggle(e.target.checked)} />
          This is a special Video Question
        </label>

        {isVideoQuestion && (
          <div className="card" style={{ background: "var(--bg-secondary)", display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="input" placeholder="Person Name" value={personName} onChange={(e) => setPersonName(e.target.value)} />

            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, alignItems: "stretch" }}>
              <label
                htmlFor="person-image-upload"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  borderRadius: 12,
                  border: "1px dashed rgba(59, 130, 246, 0.7)",
                  background: "rgba(15, 23, 42, 0.7)",
                  color: "var(--text-main)",
                  cursor: "pointer",
                  textAlign: "center",
                  padding: 10,
                  minHeight: 90,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <input id="person-image-upload" type="file" accept="image/*" hidden onChange={handlePersonImageUpload} />
                {personImageUrl ? (
                  <img
                    src={personImageUrl}
                    alt="Person preview"
                    style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(59, 130, 246, 0.6)" }}
                  />
                ) : (
                  <>
                    <i className="fas fa-upload" style={{ fontSize: 22, color: "#8ad8ff" }} aria-hidden="true" />
                    <span style={{ fontSize: 11, lineHeight: 1.2, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>Upload</span>
                  </>
                )}
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  className="input"
                  placeholder="Person Image URL or paste a local image URL"
                  value={personImageUrl}
                  onChange={(e) => setPersonImageUrl(e.target.value)}
                />
                <small style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.4 }}>
                  Accepts a direct image URL or a local image upload.
                </small>
              </div>
            </div>

            <input className="input" placeholder="YouTube Video URL" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
          </div>
        )}

        {error && <span className="field-error">{error}</span>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving..." : "Save Question"}
        </button>
      </form>
    </Modal>
  );
}

function DownloadTemplateModal({ subjects, onClose }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [mode, setMode] = useState("MULTIPLE_CHOICE");
  const [questionCount, setQuestionCount] = useState(20);
  const [marksPerQuestion, setMarksPerQuestion] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const blob = await templatesApi.requestDownload({ subjectId, mode, questionCount: Number(questionCount), marksPerQuestion: Number(marksPerQuestion) });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template_${mode.toLowerCase()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Template downloaded", "success");
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Download Question Template" onClose={onClose}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="field-label">Subject</label>
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Question Mode</label>
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="MENTION">Mention</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="field-label">Number of Questions</label>
            <input className="input" type="number" min={1} value={questionCount} onChange={(e) => setQuestionCount(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Marks per Question</label>
            <input className="input" type="number" min={1} value={marksPerQuestion} onChange={(e) => setMarksPerQuestion(e.target.value)} />
          </div>
        </div>
        {error && <span className="field-error">{error}</span>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Generating..." : "Generate & Download"}
        </button>
      </form>
    </Modal>
  );
}

function UploadTemplateModal({ subjects, onClose, onDone }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [mode, setMode] = useState("MULTIPLE_CHOICE");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!file) return setError("Choose a file to upload.");
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subjectId", subjectId);
      formData.append("mode", mode);
      const res = await templatesApi.upload(formData);
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Upload Question Template" onClose={onClose}>
      {!result ? (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="field-label">Subject</label>
            <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Question Mode</label>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="MENTION">Mention</option>
            </select>
          </div>
          <div>
            <label className="field-label">Template File</label>
            <input className="input" type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
          </div>
          {error && <span className="field-error">{error}</span>}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Uploading..." : "Upload & Validate"}
          </button>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row label="Total rows" value={result.totalRows} />
          <Row label="Valid questions" value={result.validQuestions} />
          <Row label="Invalid questions" value={result.invalidQuestions} />
          <Row label="Duplicate questions" value={result.duplicateQuestions} />
          <Row label="Imported" value={result.importedQuestionIds.length} />
          <button className="btn btn-primary" onClick={onDone} style={{ marginTop: 8 }}>
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderBottom: "1px solid var(--border-color)" }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const th = { padding: "12px 16px", fontSize: 12, color: "var(--text-muted)", fontWeight: 600 };
const td = { padding: "12px 16px" };
