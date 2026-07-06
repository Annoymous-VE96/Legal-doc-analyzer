import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const quoteRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,168,76,${p.alpha})`;
        ctx.fill();
      });

      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach((b) => {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(201,168,76,${0.07 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const features = [
    {
      icon: '📄',
      title: 'PDF Upload & Parsing',
      desc: 'Drop in any contract or filing — text is extracted and chunked automatically.',
    },
    {
      icon: '🔍',
      title: 'Corrective RAG Pipeline',
      desc: 'Retrieved passages are graded for relevance before being used, so answers stay grounded in your document.',
    },
    {
      icon: '💬',
      title: 'Streaming AI Answers',
      desc: 'Responses stream in as they\u2019re generated, so you see the answer take shape in real time.',
    },
    {
      icon: '🌐',
      title: 'Web Search Fallback',
      desc: 'If your document doesn\u2019t have the answer, a live web search fills the gap.',
    },
  ];

  return (
    <div className="lp-wrapper">
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="lp-canvas" />

      {/* Vertical rule lines */}
      <div className="lp-vline lp-vline--left" />
      <div className="lp-vline lp-vline--right" />

      {/* Navbar */}
      <nav className="lp-navbar">
        <span className="lp-logo">⚖️ &nbsp;LexAI</span>
        <div className="lp-nav-actions">
          <button className="nav-login" onClick={() => navigate('/auth?mode=login')}>
            Login
          </button>
          <button className="cta-btn" onClick={() => navigate('/auth?mode=signup')}>
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="lp-hero">
        <p className="hero-badge lp-badge">Powered by CRAG · RAG + AI</p>

        <h1 className="hero-h1 lp-heading">
          Analyze Legal Docs
          <br />
          <em className="lp-accent">Instantly.</em>
        </h1>

        <p className="hero-sub lp-subtext">
          Upload any legal document and chat with it.
          <br />
          Summaries, clause breakdowns, instant answers —
          <br />
          no law degree needed.
        </p>

        <div className="hero-cta lp-cta">
          <button className="cta-btn" onClick={() => navigate('/auth?mode=signup')}>
            Get Started Free →
          </button>
        </div>

        {/* Divider line */}
        <div className="hero-divider lp-divider" />

        {/* Feature cards */}
        <div className="hero-features lp-features">
          {features.map((f) => (
            <div className="feature-card" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <div className="feature-text-block">
                <span className="lp-feature-title">{f.title}</span>
                <span className="lp-feature-desc">{f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Scroll hint */}
        <div
          className="scroll-hint"
          onClick={() => quoteRef.current?.scrollIntoView({ behavior: 'smooth' })}
          style={{ cursor: 'pointer' }}
        >
          <span className="scroll-label">Scroll</span>
          <span className="scroll-arrow">▾</span>
        </div>
      </div>

      {/* Bottom quote strip */}
      <div className="lp-quote-strip" ref={quoteRef}>
        <span className="lp-quote-text">
          "The law is reason, free from passion." &nbsp;—&nbsp; Aristotle
        </span>
      </div>

      {/* Footer */}
      <footer className="lp-footer">
        <span className="lp-footer-text">⚖️ LexAI &nbsp;·&nbsp; © 2026 All rights reserved.</span>
      </footer>
    </div>
  );
}

export default LandingPage;