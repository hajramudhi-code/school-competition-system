import React from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-topbar">
        <div className="landing-topbar-spacer" />
        <div className="landing-topbar-title">QUIZ COMPETITION</div>
        <div className="landing-topbar-spacer" />
      </header>

      <main className="landing-main">
        <div className="landing-orbit landing-orbit-left" />
        <div className="landing-orbit landing-orbit-right" />
        <section className="landing-roles" aria-label="Competition access">
          <Link to="/admin/login" className="landing-role landing-role-admin">
            <span className="role-emblem" aria-hidden="true"><i className="fas fa-chess-rook" /></span>
            <span className="role-label">STATE</span>
            <span className="role-subtitle">ADMIN</span>
          </Link>
          <div className="landing-trophy" aria-hidden="true">
            <span className="trophy-cup"><i className="fas fa-trophy" /></span>
          </div>
          <Link to="/staff/login" className="landing-role landing-role-host">
            <span className="role-emblem" aria-hidden="true"><i className="fas fa-gem" /></span>
            <span className="role-label">SCHOOL</span>
            <span className="role-subtitle">HOST</span>
          </Link>
        </section>

        <section className="landing-heading">
          <p className="landing-kicker">INTER SECONDARY SCHOOLS</p>
          <h1><span>QUIZ</span> <strong>COMPETITION</strong></h1>
          <div className="landing-divider"><span /></div>
        </section>

        <Link to="/staff/login" className="landing-start">
          <span className="start-icon" aria-hidden="true"><i className="fas fa-circle-play" /></span>
          <span><strong>GET STARTED</strong><small>CONTROLLER</small></span>
        </Link>

        <section className="landing-brand" aria-label="Center for Digital Learning">
          <div className="brand-mark" aria-hidden="true"><span><i className="fas fa-diamond" /></span><span><i className="fas fa-diamond" /></span></div>
          <strong>CDL</strong>
          <span>Center for Digital Learning</span>
        </section>

      </main>
      <footer className="landing-footer">© 2026 | SUZA</footer>
    </div>
  );
}
