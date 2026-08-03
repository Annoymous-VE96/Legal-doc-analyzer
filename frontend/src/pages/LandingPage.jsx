import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, FileText, ShieldCheck, Sparkles, Globe, ArrowRight, UploadCloud, CheckCircle2, Activity, Search, ChevronDown } from 'lucide-react';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const quoteRef = useRef(null);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

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

  return (
    <div className="lp-wrapper">
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="lp-canvas" />

      {/* Navbar */}
      <nav className="lp-navbar">
        <span className="lp-logo">
          <Scale size={20} className="lp-logo-icon" />
          &nbsp;LexAI
        </span>
        <div className="lp-nav-actions">
          <button className="nav-login" onClick={() => navigate('/auth?mode=login')}>
            Login
          </button>
          <button className="cta-btn" onClick={() => navigate('/auth?mode=signup')}>
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section - Split View */}
      <header className="lp-hero-container">
        <div className="lp-hero-grid">
          {/* Left Column: Sales & Call-to-action */}
          <div className="lp-hero-left">
            <div className="hero-badge lp-badge">
              <Sparkles size={12} style={{ marginRight: '6px' }} />
              NEW: Corrective RAG v2
            </div>

            <h1 className="hero-h1 lp-heading">
              Analyze Legal Docs <br />
              <span className="lp-accent">With Absolute Grounding.</span>
            </h1>

            <p className="hero-sub lp-subtext">
              An intelligent workspace for legal analysis. Automatically verify retrieved text, detect hidden risks, and grade clauses for compliance in real-time.
            </p>

            <div className="hero-cta lp-cta">
              <button className="cta-btn cta-btn--primary" onClick={() => navigate('/auth?mode=signup')}>
                Get Started Free<ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Right Column: Interactive App Workspace Mockup */}
          <div className="lp-hero-right">
            <div className="lp-app-mockup">
              {/* Mockup Header Bar */}
              <div className="mock-window-header">
                <div className="mock-window-dots">
                  <span className="dot dot--red"></span>
                  <span className="dot dot--yellow"></span>
                  <span className="dot dot--green"></span>
                </div>
                <div className="mock-window-title">LexAI Workspace v1.4</div>
              </div>

              {/* Mockup Application Window */}
              <div className="mock-window-body">
                {/* Left panel (Document Viewer) */}
                <div className="mock-doc-panel">
                  <div className="mock-panel-title">
                    <FileText size={12} />
                    <span>employment_agreement_draft.pdf</span>
                  </div>
                  <div className="mock-doc-content">
                    <div className="mock-doc-line"></div>
                    <div className="mock-doc-line"></div>
                    <div className="mock-doc-line mock-doc-line--highlighted">Section 4. INDEMNIFICATION. Under no circumstances shall the Company be held liable for any indirect, incidental, or consequential damages resulting from...</div>
                    <div className="mock-doc-line"></div>
                    <div className="mock-doc-line"></div>
                  </div>
                </div>

                {/* Right panel (Chat & Analytics) */}
                <div className="mock-chat-panel">
                  <div className="mock-panel-title">
                    <Activity size={12} />
                    <span>AI Analysis</span>
                  </div>
                  <div className="mock-chat-messages">
                    <div className="mock-msg mock-msg--user">
                      Any concerns about Section 4?
                    </div>
                    <div className="mock-msg mock-msg--ai">
                      <div className="mock-badge">
                        <CheckCircle2 size={10} />
                        <span>CRAG Verified · 99% Relevance</span>
                      </div>
                      <p>
                        Section 4 establishes a **one-way indemnification** clause that exclusively protects the Employer. 
                      </p>
                      <span className="mock-citation">Source: Page 4, Clause 4.2</span>
                    </div>
                  </div>
                  <div className="mock-input-row">
                    <div className="mock-input-field">Ask a follow-up question...</div>
                    <button className="mock-send-btn">➔</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="lp-scroll-indicator" onClick={scrollToFeatures}>
          <span>Scroll to explore</span>
          <ChevronDown size={14} className="bouncing-arrow" />
        </div>
      </header>

      {/* Bento Grid Features Section */}
      <section className="lp-bento-section" id="features">
        <div className="section-header">
          <h2 className="section-title">Designed for Enterprise Diligence</h2>
          <p className="section-subtext">Advanced cognitive architectures optimized for accuracy and verification speed.</p>
        </div>

        <div className="lp-bento-grid">
          {/* Bento Card 1: Double-wide (PDF Parsing) */}
          <div className="bento-card bento-card--large">
            <div className="bento-content">
              <div className="bento-icon-box">
                <FileText size={20} />
              </div>
              <h3 className="bento-title">Hybrid PDF Parsing</h3>
              <p className="bento-desc">In-memory parsing splits legal texts into clean semantic nodes while preserving tables, headings, and signature pages intact.</p>
            </div>
            <div className="bento-visual bento-visual--parsing">
              <div className="mock-upload-box">
                <UploadCloud size={32} />
                <span>Drag & drop contracts here</span>
                <span className="upload-file-pill">nda_standard_mutual_2026.pdf</span>
              </div>
            </div>
          </div>

          {/* Bento Card 2: Single-wide (Corrective RAG) */}
          <div className="bento-card">
            <div className="bento-content">
              <div className="bento-icon-box">
                <ShieldCheck size={20} />
              </div>
              <h3 className="bento-title">Corrective RAG</h3>
              <p className="bento-desc">Evaluates all retrieved context blocks. Irrelevant passages are discarded before generating responses to guarantee zero hallucinations.</p>
            </div>
            <div className="bento-visual bento-visual--center">
              <div className="mock-rag-score">
                <div className="score-ring">98.4%</div>
                <span>Average Context Grounding Score</span>
              </div>
            </div>
          </div>

          {/* Bento Card 3: Single-wide (Web Search Fallback) */}
          <div className="bento-card">
            <div className="bento-content">
              <div className="bento-icon-box">
                <Globe size={20} />
              </div>
              <h3 className="bento-title">Extended Knowledge</h3>
              <p className="bento-desc">When answers aren't in the uploaded file, the pipeline queries live regulatory indexes and SEC EDGAR databases.</p>
            </div>
            <div className="bento-visual bento-visual--center">
              <div className="mock-search-status">
                <Search size={14} className="spinning-icon" />
                <span>Searching EDGAR registry...</span>
              </div>
            </div>
          </div>

          {/* Bento Card 4: Double-wide (Streaming Answers) */}
          <div className="bento-card bento-card--large">
            <div className="bento-content">
              <div className="bento-icon-box">
                <Sparkles size={20} />
              </div>
              <h3 className="bento-title">Streaming AI Insights</h3>
              <p className="bento-desc">Watch legal explanations compile syllable-by-syllable. Fully cite-linked responses mapping directly back to page highlights.</p>
            </div>
            <div className="bento-visual bento-visual--streaming">
              <div className="mock-streaming-preview">
                <span className="mock-word">The</span>
                <span className="mock-word">indemnification</span>
                <span className="mock-word">clause</span>
                <span className="mock-word mock-word--active">is</span>
                <span className="mock-cursor">▋</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Aristotle Quote strip */}
      <div className="lp-quote-strip" ref={quoteRef}>
        <span className="lp-quote-text">
          "The law is reason, free from passion." &nbsp;—&nbsp; Aristotle
        </span>
      </div>

      {/* Footer */}
      <footer className="lp-footer">
        <span className="lp-footer-text">
          <Scale size={13} className="lp-footer-icon" />
          &nbsp;LexAI &nbsp;·&nbsp; © 2026 All rights reserved.
        </span>
      </footer>
    </div>
  );
}

export default LandingPage;