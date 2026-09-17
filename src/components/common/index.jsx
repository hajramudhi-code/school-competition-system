import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export function usePolling(callback, intervalMs = 5000, dependencies = []) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    callbackRef.current();
    const intervalId = setInterval(() => callbackRef.current(), intervalMs);
    return () => clearInterval(intervalId);
  }, [intervalMs, ...dependencies]);
}

export function LoadingState({ label = "Loading..." }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "32px 0", color: "var(--text-muted)" }}>
      <span className="spinner" aria-hidden style={spinnerStyle} />
      <span>{label}</span>
    </div>
  );
}

const spinnerStyle = {
  width: 18,
  height: 18,
  borderRadius: "50%",
  border: "2px solid var(--border-color)",
  borderTopColor: "var(--blue-highlight)",
  animation: "spin 0.7s linear infinite",
};

// inject keyframes once
if (typeof document !== "undefined" && !document.getElementById("spinner-keyframes")) {
  const style = document.createElement("style");
  style.id = "spinner-keyframes";
  style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}

export function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="card" style={{ borderColor: "var(--danger)", textAlign: "center" }}>
      <p style={{ color: "var(--text-main)", marginBottom: 12 }}>{message}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", description, action }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      {description && <p style={{ marginBottom: action ? 16 : 0 }}>{description}</p>}
      {action}
    </div>
  );
}

export function LogoUpload({ value, onChange, onFileChange, label = "Logo (optional)", maxBytes = 2 * 1024 * 1024, minDimension = 128, maxDimension = 2048, aspectRatio = 1, aspectTolerance = 0.15 }) {
  const [error, setError] = useState("");

  function handleChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Choose an image file.");
    if (file.size > maxBytes) return setError("Image must be 2 MB or smaller.");

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const ratio = image.width / image.height;
        if (image.width < minDimension || image.height < minDimension || image.width > maxDimension || image.height > maxDimension) {
          return setError(`Image dimensions must be between ${minDimension} and ${maxDimension} px.`);
        }
        if (Math.abs(ratio - aspectRatio) > aspectTolerance) return setError("Logo must use a square 1:1 aspect ratio.");
        onFileChange?.(file);
        onChange(reader.result);
      };
      image.onerror = () => setError("The selected image could not be read.");
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label className="field-label">{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {value && <img src={value} alt="Logo preview" width={52} height={52} style={{ objectFit: "contain", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-secondary)" }} />}
        <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
          {value ? "Change image" : "Upload image"}
          <input type="file" accept="image/*" onChange={handleChange} style={{ display: "none" }} />
        </label>
      </div>
      <p style={{ fontSize: 12, marginTop: 6 }}>PNG, JPG or WebP, up to 2 MB.</p>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export function PasswordInput({ value, onChange, placeholder, autoFocus, className = "input" }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <input
        className={className}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{ paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        style={{ position: "absolute", top: 0, right: 0, height: "100%", width: 42, border: 0, background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}
      >
        <i className={visible ? "fas fa-eye-slash" : "fas fa-eye"} aria-hidden="true" />
      </button>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    ENABLED: "badge-enabled",
    DISABLED: "badge-disabled",
    UPCOMING: "badge-upcoming",
    ACTIVE: "badge-active",
    IN_PROGRESS: "badge-active",
    COMPLETED: "badge-completed",
  };
  return <span className={`badge ${map[status] || "badge-disabled"}`}>{status?.replace("_", " ")}</span>;
}

export function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4, 8, 16, 0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-elevated"
        style={{ width, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto", padding: 24 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3>{title}</h3>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function InlineConfirm({ title, message, onConfirm, onCancel }) {
  return (
    <div className="card-elevated" style={{ marginBottom: 14, padding: 14, borderLeft: "3px solid var(--danger)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div>
        <strong>{title}</strong>
        <p style={{ marginTop: 4, fontSize: 13 }}>{message}</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  );
}

// ---- Toast system ----
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, tone = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((current) => current.some((toast) => toast.message === message && toast.tone === tone) ? current : [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 5000);
  }, []);

  useEffect(() => {
    const handleApiError = (event) => showToast(event.detail || "Request failed", "error");
    window.addEventListener("api-error", handleApiError);
    return () => window.removeEventListener("api-error", handleApiError);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: "fixed", top: 20, right: 20, display: "flex", flexDirection: "column", gap: 8, zIndex: 200 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className="card-elevated"
            style={{
              padding: "12px 16px",
              borderLeft: `3px solid ${t.tone === "error" ? "var(--danger)" : t.tone === "success" ? "var(--success)" : "var(--blue-highlight)"}`,
              minWidth: 240,
              fontSize: 14,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
