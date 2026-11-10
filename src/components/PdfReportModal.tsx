import React, { useState } from 'react';
import { X, ExternalLink, Download, FileText, CheckCircle2, BookOpen } from 'lucide-react';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_SECTIONS = [
  { num: 1, title: "Executive summary & success metrics" },
  { num: 2, title: "Problem statement and scope" },
  { num: 3, title: "System architecture (2 pipelines, 4 stores)" },
  { num: 4, title: "Workflows (Offline ingestion & Online query)" },
  { num: 5, title: "Flowcharts (3 decisions, 1 retry loop)" },
  { num: 6, title: "Features priority matrix" },
  { num: 7, title: "Databases, vector stores & SQL schemas" },
  { num: 8, title: "Technology stack & alternatives" },
  { num: 9, title: "Component deep dives (BM25, HNSW, RRF)" },
  { num: 10, title: "Evaluation framework & 7-stage ablation" },
  { num: 11, title: "Security, guardrails & responsible AI" },
  { num: 12, title: "Scalability note (100k vs 100M chunks)" },
  { num: 13, title: "Deployment on AWS, CI/CD & cost" },
  { num: 14, title: "Observability and monitoring signals" },
  { num: 15, title: "Repository structure & REST API design" },
  { num: 16, title: "Six-week roadmap (6 measurement gates)" },
  { num: 17, title: "Risks and mitigations" },
  { num: 18, title: "Resume bullets, interview & Amazon LPs" },
];

export const PdfReportModal: React.FC<PdfReportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const pdfUrl = "/assets/aistudio/RAGForge_Project_Report_b55d85b3.pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-6xl h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-mono text-cyan-400">RAGForge: Project Report</div>
              <div className="text-sm font-bold text-white font-display">
                Nov 10, 2026 · @Gunii · 24 Pages
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open in New Tab</span>
            </a>

            <a
              href={pdfUrl}
              download="RAGForge_Project_Report.pdf"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left sidebar chapters + Right PDF iframe */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Chapter Guide (3 cols) */}
          <div className="hidden lg:block lg:col-span-3 border-r border-slate-800 bg-slate-950/80 p-4 overflow-y-auto space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Table of Contents (18 Sections)
            </div>

            <div className="space-y-1">
              {REPORT_SECTIONS.map((sec) => (
                <div
                  key={sec.num}
                  className="p-2 rounded text-xs text-slate-300 hover:bg-slate-900 transition-colors flex items-start gap-2"
                >
                  <span className="font-mono text-cyan-400 font-bold shrink-0">{sec.num}.</span>
                  <span className="line-clamp-2">{sec.title}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-200">Core Success Metrics:</div>
              <div>• Recall@5 ≥ 0.85</div>
              <div>• Faithfulness ≥ 0.90</div>
              <div>• p95 Latency &lt; 400ms</div>
              <div>• HNSW within 5 pts of FAISS</div>
              <div>• Measured Cost per 1,000 queries</div>
            </div>
          </div>

          {/* Embedded PDF Viewer (9 cols) */}
          <div className="lg:col-span-9 h-full bg-slate-950 relative">
            <iframe
              src={pdfUrl}
              title="RAGForge Project Report PDF"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
