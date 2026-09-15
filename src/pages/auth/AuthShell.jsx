import React from "react";
import { Link } from "react-router-dom";

export default function AuthShell({ title, subtitle, children, side = "left", icon = "fas fa-chess-rook", accent = "cyan" }) {
  return (
    <div className={`auth-page auth-page-${side}`}>
      <header className="auth-topbar">
        <Link to="/" className="auth-back" aria-label="Back to landing page"><i className="fas fa-reply" aria-hidden="true" /></Link>
        <span>QUIZ COMPETITION</span>
      </header>
      <main className="auth-main">
        <div className={`auth-card auth-card-${accent}`}>
          <section className={`auth-panel auth-panel-${side}`}>
            <div className="auth-icon" aria-hidden="true"><i className={icon} /></div>
            <h1>{title}</h1>
            <div className="auth-divider"><span /></div>
            <p className="auth-subtitle">{subtitle}</p>
            {children}
          </section>
        </div>
      </main>
      <footer className="auth-footer">© 2026 | SUZA</footer>
    </div>
  );
}
