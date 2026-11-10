import React, { useState, useEffect } from 'react';
import { Layers, Play, Table, GitCommit, Shield, FileText, Sparkles, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ActiveTab = 'playground' | 'ablation' | 'vector-benchmarks' | 'architecture' | 'interview' | 'corpus';

interface TopNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenReportModal: () => void;
  totalChunks: number;
}

interface GeminiStatus {
  configured: boolean;
  verified: boolean;
  model?: string;
  embeddingModel?: string;
  message?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenReportModal,
  totalChunks,
}) => {
  const [geminiStatus, setGeminiStatus] = useState<GeminiStatus | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    fetch('/api/gemini/status')
      .then(res => res.json())
      .then(data => setGeminiStatus(data))
      .catch(() => setGeminiStatus({
        configured: false,
        verified: false,
        message: 'Operating in local simulation mode (handcrafted 64d sparse-projected feature vectors and lexical heuristic reranking).',
      }));
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Brand wordmark (single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm shadow-cyan-500/20">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white font-display">
              RAGForge
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs text-slate-400 font-normal">
              From-Scratch Hybrid RAG
            </span>
          </div>
        </div>

        {/* Zone 2: Concise navigation links (single line, no wrapping) */}
        <nav className="hidden lg:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('playground')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'playground'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Playground & Traces
          </button>

          <button
            onClick={() => setActiveTab('ablation')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'ablation'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Ablation Suite
          </button>

          <button
            onClick={() => setActiveTab('vector-benchmarks')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'vector-benchmarks'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            HNSW vs FAISS
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            System Architecture
          </button>

          <button
            onClick={() => setActiveTab('interview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'interview'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Interview & Resume
          </button>

          <button
            onClick={() => setActiveTab('corpus')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'corpus'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Corpus ({totalChunks})
          </button>
        </nav>

        {/* Zone 3: Engine status & 1 primary action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Gemini Mode Status Button */}
          <button
            onClick={() => setShowStatusModal(true)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded border transition-colors ${
              geminiStatus?.verified
                ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
            }`}
            title="Inspect neural model status and educational simulation modes"
          >
            <span className={`w-2 h-2 rounded-full ${geminiStatus?.verified ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{geminiStatus?.verified ? 'Neural: Gemini 3.8 Flash' : 'Local Simulation Mode'}</span>
          </button>

          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Project Report PDF</span>
          </button>
        </div>
      </div>

      {/* Engine Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Engine Model & Reranker Architecture</h3>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 font-mono">
                <div className="text-slate-400 text-[11px]">ACTIVE ENGINE PROFILE</div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${geminiStatus?.verified ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span>{geminiStatus?.verified ? 'Neural Mode (Gemini 3.8 Flash)' : 'Educational Local Simulation Mode'}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  {geminiStatus?.message || 'Handcrafted 64d sparse-projected feature vectors with heuristic lexical-structural candidate scoring.'}
                </p>
              </div>

              <div className="space-y-2 pt-1 font-sans">
                <div className="text-slate-200 font-semibold text-xs">Architectural Disclosures:</div>
                <ul className="space-y-1.5 text-slate-400 text-[11px]">
                  <li className="flex items-start gap-1.5">
                    <span className="text-cyan-400 font-mono">1.</span>
                    <span><strong>Reranker:</strong> Local mode uses a heuristic lexical-structural scoring function (term coverage, token proximity, header alignment). When configured with Gemini, genuine neural cross-encoder pairwise scoring via <code className="text-cyan-300">gemini-3.8-flash</code> is invoked.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-cyan-400 font-mono">2.</span>
                    <span><strong>Embeddings:</strong> Local mode projects texts onto handcrafted 64d sparse-keyword feature axes for fast educational inspection. Neural mode connects to <code className="text-cyan-300">gemini-embedding-2</code>.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-cyan-400 font-mono">3.</span>
                    <span><strong>Evaluation Suite:</strong> Ablation tables display published reference baselines from Chapter 10. Live evaluations are computed on-demand against your active corpus with zero hardcoded results.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile nav scroll strip */}
      <div className="lg:hidden flex items-center gap-1 px-4 py-2 overflow-x-auto border-t border-slate-800/60 bg-slate-950">
        {[
          { id: 'playground', label: 'Playground', icon: Play },
          { id: 'ablation', label: 'Ablation', icon: Table },
          { id: 'vector-benchmarks', label: 'HNSW vs FAISS', icon: GitCommit },
          { id: 'architecture', label: 'Architecture', icon: Layers },
          { id: 'interview', label: 'Interview Prep', icon: Shield },
          { id: 'corpus', label: 'Corpus', icon: FileText },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === item.id
                  ? 'bg-slate-800 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
