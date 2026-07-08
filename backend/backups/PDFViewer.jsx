import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import './PDFViewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const COLORS = ['#FACC15', '#86EFAC', '#93C5FD', '#F9A8D4', '#FCA5A5'];

export default function PDFViewer({ pdfUrl, chatName, onChangePdf, onAutoSend, onPrefillInput }) {
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.2);
  const [toolbar, setToolbar] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const containerRef = useRef();

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || text.length < 3) { setToolbar(null); return; }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    const scrollTop = containerRef.current?.querySelector('.pdf-scroll-area')?.scrollTop || 0;

    setToolbar({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + scrollTop - 12,
      text,
    });
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => document.removeEventListener('mouseup', handleTextSelection);
  }, [handleTextSelection]);

  // Apply highlights to text layer spans
  useEffect(() => {
    if (!highlights.length) return;
    const timer = setTimeout(() => {
      const textLayers = containerRef.current?.querySelectorAll('.react-pdf__Page__textContent');
      textLayers?.forEach((textLayer) => {
        const spans = textLayer.querySelectorAll('span');
        spans.forEach((span) => {
          const spanText = span.textContent.trim();
          if (!spanText) return;
          const match = highlights.find(
            (h) => spanText.includes(h.text) || h.text.includes(spanText)
          );
          if (match) {
            span.style.backgroundColor = match.color;
            span.style.borderRadius = '2px';
          }
        });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [highlights, numPages]);

  const closeToolbar = () => {
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleHighlight = (color) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) { closeToolbar(); return; }

    const range = selection.getRangeAt(0);

    try {
      const span = document.createElement('span');
      span.style.backgroundColor = color;
      span.style.borderRadius = '2px';
      range.surroundContents(span); // wraps only the exact selected text
    } catch (err) {
      // surroundContents fails if selection spans multiple text nodes/elements —
      // fall back to per-node wrapping
      const nodes = range.cloneContents().childNodes;
      console.warn('Could not highlight cleanly (multi-node selection):', err);
    }

    closeToolbar();
  };

  return (
    <div className="pdf-panel" ref={containerRef}>
      {/* Header */}
      <div className="pdf-header">
        <span className="pdf-name">📄 {chatName}</span>
        <button className="change-doc-btn" onClick={onChangePdf}>Change</button>
      </div>

      {/* PDF Scroll Area — all pages rendered for natural scrolling */}
      <div className="pdf-scroll-area">
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(err) => console.error('PDF load error:', err)}
        >
          {Array.from({ length: numPages || 0 }, (_, i) => (
            <div key={i + 1} className="pdf-page-wrapper">
              <Page
                pageNumber={i + 1}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={false}
              />
            </div>
          ))}
        </Document>

        {/* Floating Toolbar */}
        {toolbar && (
          <div
            className="selection-toolbar"
            style={{ left: toolbar.x, top: toolbar.y }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="toolbar-actions">
              <button onClick={() => { onAutoSend(`Explain in detail: ${toolbar.text}`); closeToolbar(); }}>Explain</button>
              <button onClick={() => { onAutoSend(`Summarize: ${toolbar.text}`); closeToolbar(); }}>Summarize</button>
              <button onClick={() => { onPrefillInput(`"${toolbar.text}" — `); closeToolbar(); }}>Ask</button>
            </div>
            <div className="toolbar-colors">
              {COLORS.map((c) => (
                <button key={c} className="color-dot" style={{ background: c }} onClick={() => handleHighlight(c)} />
              ))}
              <button className="color-dot clear-dot" onClick={closeToolbar} title="Cancel">✕</button>
            </div>
          </div>
        )}
      </div>

      {/* Footer — only zoom controls now */}
      <div className="pdf-footer">
        <button onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}>−</button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}>+</button>
        <span className="pdf-page-count">{numPages ? `${numPages} pages` : ''}</span>
      </div>
    </div>
  );
}