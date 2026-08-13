import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Scale, FileText, ShieldCheck, Sparkles, Globe, ArrowRight, 
  UploadCloud, CheckCircle2, Activity, Search, ChevronDown, 
  Zap, AlertTriangle, Check, RefreshCw, Database, FileCheck, Layers
} from 'lucide-react';
import './LandingPage.css';

const HERO_DOCS = [
  {
    filename: 'employment_agreement_draft.pdf',
    highlightTitle: 'Section 4. INDEMNIFICATION',
    highlightText: 'Under no circumstances shall the Company be held liable for any indirect, incidental, or consequential damages resulting from performance of services hereunder...',
    userQuestion: 'Any concerns about Section 4?',
    aiResponse: 'Section 4 establishes a **one-way indemnification** clause that exclusively protects the Employer. Recommend requesting mutual indemnity balance.',
    cragScore: '99% Relevance',
    citation: 'Source: Page 4, Clause 4.2'
  },
  {
    filename: 'mutual_nda_standard_2026.pdf',
    highlightTitle: 'Section 8. GOVERNING LAW & VENUE',
    highlightText: 'This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law rules.',
    userQuestion: 'What jurisdiction governs disputes?',
    aiResponse: 'Governed by **State of Delaware** law. Standard for corporate agreements; no unusual venue restrictions detected.',
    cragScore: '100% Relevance',
    citation: 'Source: Page 3, Clause 8.1'
  },
  {
    filename: 'vendor_msa_enterprise.pdf',
    highlightTitle: 'Section 12. TERMINATION FOR CONVENIENCE',
    highlightText: 'Either party may terminate this Agreement upon thirty (30) days prior written notice to the other party without incurring early termination fees or penalties.',
    userQuestion: 'Can we terminate early without penalty?',
    aiResponse: 'Yes. Clause 12 explicitly permits termination for convenience with **30 days notice** and zero penalty fees.',
    cragScore: '98% Relevance',
    citation: 'Source: Page 7, Clause 12.3'
  }
];

const SANDBOX_CLAUSES = [
  {
    id: 'non-compete',
    title: 'Broad Non-Compete Covenant',
    type: 'Employment Law',
    riskLevel: 'HIGH RISK',
    riskColor: 'danger',
    text: 'Employee agrees not to engage directly or indirectly in any software development activity globally for a period of 24 months post-termination.',
    cragScore: '97.8%',
    verdict: 'Overly broad geographic scope (global) and excessive 24-month duration are likely unenforceable under standard state labor laws.',
    recommendation: 'Limit restrictive covenant to 6 months post-employment and constrain geographic scope strictly to active sales territories.'
  },
  {
    id: 'unlimited-liability',
    title: 'Uncapped Indemnity Clause',
    type: 'Commercial Terms',
    riskLevel: 'CRITICAL RISK',
    riskColor: 'danger',
    text: 'Vendor agrees to defend, indemnify, and hold harmless Client against any and all claims, losses, or damages without dollar limitation.',
    cragScore: '99.4%',
    verdict: 'Exposes Vendor to uncapped financial liability. Standard commercial practice requires liability caps tied to contract value.',
    recommendation: 'Cap total aggregate liability to 12 months of actual fees paid under this Agreement.'
  },
  {
    id: 'ip-assignment',
    title: 'Balanced IP Rights Assignment',
    type: 'Intellectual Property',
    riskLevel: 'LOW RISK',
    riskColor: 'success',
    text: 'All Work Product created exclusively during company working hours utilizing company resources shall belong solely to Employer.',
    cragScore: '99.9%',
    verdict: 'Standard work-for-hire provisions with proper scope limitations protecting employee pre-existing IP.',
    recommendation: 'Clause is balanced and complies with statutory IP assignment guidelines. No change needed.'
  }
];

function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const quoteRef = useRef(null);
  
  const [activeHeroDocIndex, setActiveHeroDocIndex] = useState(0);
  const [activeSandboxIndex, setActiveSandboxIndex] = useState(0);
  const [simulatedParsing, setSimulatedParsing] = useState(false);
  const [secTickerIndex, setSecTickerIndex] = useState(0);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Canvas ambient light particle field
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

    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.3 + 0.3,
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
        ctx.fillStyle = `rgba(201, 168, 76, ${p.alpha})`;
        ctx.fill();
      });

      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach((b) => {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(201, 168, 76, ${0.08 * (1 - dist / 130)})`;
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

  // SEC EDGAR Ticker Cycling effect
  useEffect(() => {
    const secQueries = [
      'SEC EDGAR Registry (10-K Filings)',
      'Delaware Corp Law (DGCL §141)',
      'GDPR Regulatory Framework Art. 6',
      'USPTO Patent & Trademark Database'
    ];
    const interval = setInterval(() => {
      setSecTickerIndex((prev) => (prev + 1) % secQueries.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateParsing = () => {
    setSimulatedParsing(true);
    setTimeout(() => setSimulatedParsing(false), 2400);
  };

  const currentHeroDoc = HERO_DOCS[activeHeroDocIndex];
  const currentSandbox = SANDBOX_CLAUSES[activeSandboxIndex];

  return (
    <div className="lp-wrapper">
      {/* Dynamic Particle Canvas */}
      <canvas ref={canvasRef} className="lp-canvas" />

      {/* Navbar */}
      <nav className="lp-navbar">
        <span className="lp-logo">
          <Scale size={22} className="lp-logo-icon" />
          &nbsp;LexAI
        </span>
        
        <div className="lp-nav-center">
          <a href="#features" className="lp-nav-link">Features</a>
          <a href="#sandbox" className="lp-nav-link">Live Sandbox</a>
          <a href="#metrics" className="lp-nav-link">Trust & Performance</a>
        </div>

        <div className="lp-nav-actions">
          <button className="nav-login" onClick={() => navigate('/auth?mode=login')}>
            Login
          </button>
          <button className="cta-btn cta-btn--primary" onClick={() => navigate('/auth?mode=signup')}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="lp-hero-container">
        <div className="lp-hero-grid">
          {/* Left Column */}
          <div className="lp-hero-left">
            <div className="hero-badge lp-badge">
              <Sparkles size={12} style={{ marginRight: '6px' }} />
              NEW: Corrective RAG v2 Engine
            </div>

            <h1 className="hero-h1 lp-heading">
              Analyze Legal Docs <br />
              <span className="lp-accent">With Absolute Grounding.</span>
            </h1>

            <p className="hero-sub lp-subtext">
              An enterprise legal workspace powered by real-time Corrective RAG. Automatically verify retrieved text, detect high-risk covenants, and grade clause compliance with zero hallucinations.
            </p>

            <div className="hero-cta lp-cta">
              <button className="cta-btn cta-btn--primary" onClick={() => navigate('/auth?mode=signup')}>
                Get Started Free <ArrowRight size={16} />
              </button>
              <a href="#sandbox" className="cta-btn cta-btn--outline">
                <Zap size={15} /> Try Interactive Demo
              </a>
            </div>

            {/* Quick Proof Badges */}
            <div className="lp-hero-proof">
              <div className="proof-item">
                <CheckCircle2 size={14} className="proof-icon" />
                <span>Zero Hallucination Guarantee</span>
              </div>
              <div className="proof-item">
                <CheckCircle2 size={14} className="proof-icon" />
                <span>Verifiable Page Citations</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive App Workspace Mockup */}
          <div className="lp-hero-right">
            <div className="lp-app-mockup">
              {/* Window Header */}
              <div className="mock-window-header">
                <div className="mock-window-dots">
                  <span className="dot dot--red"></span>
                  <span className="dot dot--yellow"></span>
                  <span className="dot dot--green"></span>
                </div>
                
                {/* Document Selector Tabs inside Mockup */}
                <div className="mock-doc-tabs">
                  {HERO_DOCS.map((doc, idx) => (
                    <button
                      key={idx}
                      className={`mock-tab ${activeHeroDocIndex === idx ? 'mock-tab--active' : ''}`}
                      onClick={() => setActiveHeroDocIndex(idx)}
                    >
                      <FileText size={11} />
                      <span>{doc.filename.split('_')[0]}.pdf</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Application Window Body */}
              <div className="mock-window-body">
                {/* Left Panel: Document Viewer */}
                <div className="mock-doc-panel">
                  <div className="mock-panel-title">
                    <FileText size={12} />
                    <span>{currentHeroDoc.filename}</span>
                  </div>
                  <div className="mock-doc-content">
                    <div className="mock-doc-line"></div>
                    <div className="mock-doc-line"></div>
                    <div className="mock-doc-line mock-doc-line--highlighted">
                      <strong>{currentHeroDoc.highlightTitle}:</strong> {currentHeroDoc.highlightText}
                    </div>
                    <div className="mock-doc-line"></div>
                    <div className="mock-doc-line"></div>
                  </div>
                </div>

                {/* Right Panel: AI Analysis & Chat */}
                <div className="mock-chat-panel">
                  <div className="mock-panel-title">
                    <Activity size={12} />
                    <span>AI Verification Panel</span>
                  </div>
                  
                  <div className="mock-chat-messages">
                    <div className="mock-msg mock-msg--user">
                      {currentHeroDoc.userQuestion}
                    </div>
                    
                    <div className="mock-msg mock-msg--ai">
                      <div className="mock-badge">
                        <CheckCircle2 size={10} />
                        <span>{currentHeroDoc.cragScore}</span>
                      </div>
                      <p className="typing-text">
                        {currentHeroDoc.aiResponse}
                      </p>
                      <span className="mock-citation">{currentHeroDoc.citation}</span>
                    </div>
                  </div>

                  <div className="mock-input-row">
                    <div className="mock-input-field">Ask follow-up clause query...</div>
                    <button className="mock-send-btn">➔</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lp-scroll-indicator" onClick={scrollToFeatures}>
          <span>Scroll to explore features</span>
          <ChevronDown size={14} className="bouncing-arrow" />
        </div>
      </header>

      {/* Enterprise Metrics Bar */}
      <section className="lp-metrics-strip" id="metrics">
        <div className="metrics-container">
          <div className="metric-card">
            <span className="metric-val">10x</span>
            <span className="metric-lbl">Faster Contract Diligence</span>
          </div>
          <div className="metric-divider"></div>
          <div className="metric-card">
            <span className="metric-val">0%</span>
            <span className="metric-lbl">Hallucination Rate (CRAG)</span>
          </div>
          <div className="metric-divider"></div>
          <div className="metric-card">
            <span className="metric-val">50,000+</span>
            <span className="metric-lbl">Legal Clauses Graded</span>
          </div>
          <div className="metric-divider"></div>
          <div className="metric-card">
            <span className="metric-val">&lt; 1.2s</span>
            <span className="metric-lbl">Average Citation Latency</span>
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section (Image 2 Inspired & Enhanced) */}
      <section className="lp-bento-section" id="features">
        <div className="section-header">
          <div className="section-eyebrow">Enterprise Core Architecture</div>
          <h2 className="section-title">Designed for Enterprise Diligence</h2>
          <p className="section-subtext">Advanced cognitive architectures engineered for legal precision, context verification, and zero hallucination risk.</p>
        </div>

        <div className="lp-bento-grid">
          {/* Bento Card 1: Double-wide (Hybrid PDF Parsing) */}
          <div className="bento-card bento-card--large bento-card--gold-edge">
            <div className="bento-content">
              <div className="bento-icon-box">
                <FileText size={20} />
              </div>
              <h3 className="bento-title">Hybrid PDF Parsing</h3>
              <p className="bento-desc">In-memory parsing splits legal texts into clean semantic nodes while preserving tables, complex headings, and signature pages intact.</p>
            </div>
            
            <div className="bento-visual bento-visual--parsing">
              <div className="mock-upload-box" onClick={handleSimulateParsing}>
                <UploadCloud size={30} className={simulatedParsing ? 'pulse-icon' : ''} />
                <span>{simulatedParsing ? 'Parsing Legal Tree...' : 'Drag & drop contracts here'}</span>
                
                <div className="upload-file-pill">
                  {simulatedParsing ? (
                    <span className="parsing-status">
                      <RefreshCw size={10} className="spinning-icon" /> Extracting Semantic Nodes...
                    </span>
                  ) : (
                    'nda_standard_mutual_2026.pdf'
                  )}
                </div>

                <div className="bento-node-preview">
                  <span className="node-tag"><Layers size={9} /> [Heading] Sec. 4</span>
                  <span className="node-tag"><FileCheck size={9} /> [Table] Financials</span>
                  <span className="node-tag node-tag--success"><Check size={9} /> [Signature] Valid</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Card 2: Single-wide (Corrective RAG) */}
          <div className="bento-card bento-card--gold-edge">
            <div className="bento-content">
              <div className="bento-icon-box">
                <ShieldCheck size={20} />
              </div>
              <h3 className="bento-title">Corrective RAG</h3>
              <p className="bento-desc">Evaluates all retrieved context blocks. Irrelevant passages are discarded before generating responses to guarantee zero hallucinations.</p>
            </div>
            
            <div className="bento-visual bento-visual--center">
              <div className="mock-rag-score">
                <div className="score-ring">
                  <svg className="score-ring-svg" viewBox="0 0 80 80">
                    <circle className="score-ring-bg" cx="40" cy="40" r="35" />
                    <circle className="score-ring-fill" cx="40" cy="40" r="35" />
                  </svg>
                  <span className="score-text">98.4%</span>
                </div>
                <div className="score-info">
                  <span className="score-label">Average Context Grounding Score</span>
                  <div className="score-pills">
                    <span className="pill pill--green">3 Contexts Verified</span>
                    <span className="pill pill--red">1 Discarded</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Card 3: Single-wide (Extended Knowledge) */}
          <div className="bento-card">
            <div className="bento-content">
              <div className="bento-icon-box">
                <Globe size={20} />
              </div>
              <h3 className="bento-title">Extended Knowledge</h3>
              <p className="bento-desc">When answers aren't in the uploaded file, the pipeline queries live regulatory indexes, SEC EDGAR databases, and statutory law codes.</p>
            </div>
            
            <div className="bento-visual bento-visual--center">
              <div className="mock-search-status">
                <Search size={14} className="spinning-icon" />
                <div className="search-ticker-wrap">
                  <span className="search-query-text">{
                    ['Querying SEC EDGAR (10-K Filings)...', 'Cross-referencing Delaware DGCL §141...', 'Analyzing GDPR Article 6 Requirements...'][secTickerIndex % 3]
                  }</span>
                </div>
                <span className="live-dot"></span>
              </div>
            </div>
          </div>

          {/* Bento Card 4: Double-wide (Streaming AI Insights) */}
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
                <span className="mock-word mock-word--highlight">one-way</span>
                <span className="mock-word">for</span>
                <span className="mock-word">Employer</span>
                <span className="mock-citation-pill">[Doc §4.2]</span>
                <span className="mock-cursor">▋</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Clause Analysis Sandbox Section */}
      <section className="lp-sandbox-section" id="sandbox">
        <div className="section-header">
          <div className="section-eyebrow">Interactive Verification Demo</div>
          <h2 className="section-title">Try LexAI On Sample Legal Clauses</h2>
          <p className="section-subtext">Click any standard contract clause below to see how LexAI evaluates grounding, flags hidden risk, and proposes redlines.</p>
        </div>

        <div className="sandbox-container">
          {/* Clause Selector Tabs */}
          <div className="sandbox-tabs">
            {SANDBOX_CLAUSES.map((item, idx) => (
              <button
                key={item.id}
                className={`sandbox-tab ${activeSandboxIndex === idx ? 'sandbox-tab--active' : ''}`}
                onClick={() => setActiveSandboxIndex(idx)}
              >
                <span className="tab-type">{item.type}</span>
                <span className="tab-title">{item.title}</span>
                <span className={`tab-risk-badge badge--${item.riskColor}`}>{item.riskLevel}</span>
              </button>
            ))}
          </div>

          {/* Interactive Clause View Workspace */}
          <div className="sandbox-workspace">
            <div className="sandbox-left">
              <div className="sandbox-panel-title">
                <FileText size={14} />
                <span>Uploaded Clause Text</span>
              </div>
              <div className="clause-text-box">
                "{currentSandbox.text}"
              </div>
            </div>

            <div className="sandbox-right">
              <div className="sandbox-panel-title">
                <Activity size={14} />
                <span>LexAI CRAG Analysis</span>
              </div>

              <div className="sandbox-results">
                <div className="sandbox-metric-row">
                  <div className="metric-tag">
                    <span>Risk Severity:</span>
                    <strong className={`risk-text risk-text--${currentSandbox.riskColor}`}>
                      {currentSandbox.riskLevel}
                    </strong>
                  </div>
                  <div className="metric-tag">
                    <span>Grounding Score:</span>
                    <strong className="score-text--green">{currentSandbox.cragScore} Verified</strong>
                  </div>
                </div>

                <div className="analysis-card">
                  <h4><AlertTriangle size={14} /> AI Finding & Risk Assessment</h4>
                  <p>{currentSandbox.verdict}</p>
                </div>

                <div className="analysis-card analysis-card--recommendation">
                  <h4><CheckCircle2 size={14} stroke="#52c97a" /> Recommended Revision / Redline</h4>
                  <p>{currentSandbox.recommendation}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Security & Trust Band */}
      <section className="lp-trust-section">
        <div className="trust-container">
          <div className="trust-item">
            <Sparkles size={20} className="trust-icon" />
            <div className="trust-info">
              <h4>Real-Time Context Verification</h4>
              <p>Uses Corrective RAG (CRAG) to evaluate retrieved facts in real time, delivering up-to-date, accurate, and reliable legal insights.</p>
            </div>
          </div>

          <div className="trust-item">
            <Database size={20} className="trust-icon" />
            <div className="trust-info">
              <h4>Zero Data Retention</h4>
              <p>Uploaded documents are parsed in ephemeral memory and never used for LLM training.</p>
            </div>
          </div>

          <div className="trust-item">
            <FileText size={20} className="trust-icon" />
            <div className="trust-info">
              <h4>Verifiable Page Citations</h4>
              <p>Every response maps directly back to exact page numbers and clauses for instant auditing.</p>
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
          &nbsp;LexAI &nbsp;·&nbsp; Enterprise Legal Intelligence © 2026 All rights reserved.
        </span>
      </footer>
    </div>
  );
}

export default LandingPage;