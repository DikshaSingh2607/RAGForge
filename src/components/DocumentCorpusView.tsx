import React, { useState } from 'react';
import {
  FileText,
  Plus,
  FolderOpen,
  Hash,
  Layers,
  CheckCircle2,
  Calendar,
  User,
  Search,
  BookOpen,
} from 'lucide-react';
import { TECHNICAL_CORPUS, DocumentSource } from '../engine/corpus';
import { Chunk } from '../engine/chunker';

interface DocumentCorpusViewProps {
  onIngestDocument: (doc: { title: string; content: string; category: string; author: string }) => Promise<any>;
  corpusChunks: Chunk[];
}

export const DocumentCorpusView: React.FC<DocumentCorpusViewProps> = ({
  onIngestDocument,
  corpusChunks,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(TECHNICAL_CORPUS[0].id);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('cloud');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedDoc = TECHNICAL_CORPUS.find(d => d.id === selectedDocId) || TECHNICAL_CORPUS[0];
  const docChunks = corpusChunks.filter(c => c.doc_id === selectedDocId);
  const parentChunks = docChunks.filter(c => c.is_parent);
  const childChunks = docChunks.filter(c => !c.is_parent);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await onIngestDocument({
        title: newTitle,
        content: newContent,
        category: newCategory,
        author: 'User Engineer',
      });
      setSuccessMessage(`Document "${newTitle}" indexed! (${res.stats?.childChunksCount || 0} child chunks)`);
      setShowIngestModal(false);
      setNewTitle('');
      setNewContent('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-slate-800 bg-slate-900/60">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono mb-1">
            <span>REPORT SECTION 2 & 4.1</span>
            <span aria-hidden="true">·</span>
            <span>PUBLIC TECHNICAL CORPUS</span>
            <span aria-hidden="true">·</span>
            <span>HEADING-AWARE CHUNKING</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white font-display">
            Indexed Technical Corpus & Chunks
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Suggested corpus: openly published cloud documentation plus systems research papers so answers can be checked by anyone.
          </p>
        </div>

        <button
          onClick={() => setShowIngestModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Ingest Custom Markdown</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main 2-Column Split: Document Browser on Left, Chunk Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Document List */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Indexed Documents ({TECHNICAL_CORPUS.length})
          </h3>

          <div className="space-y-2">
            {TECHNICAL_CORPUS.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              const chunksCount = corpusChunks.filter(c => c.doc_id === doc.id && !c.is_parent).length;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                    <span className="uppercase text-cyan-400">{doc.category}</span>
                    <span>{doc.version}</span>
                  </div>

                  <div className="text-xs font-semibold text-slate-200 line-clamp-1 font-display">
                    {doc.title}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                    <span>{doc.metadata.author}</span>
                    <span>{chunksCount} chunks</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (8 cols): Document Details & Chunks Explorer */}
        <div className="lg:col-span-8 space-y-4">
          {/* Document Metadata Card */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-mono text-cyan-400 uppercase">
                  {selectedDoc.metadata.docType} · {selectedDoc.metadata.publishedDate}
                </span>
                <h3 className="text-base font-bold text-white font-display mt-0.5">
                  {selectedDoc.title}
                </h3>
              </div>

              <div className="text-xs font-mono text-slate-400 text-right">
                <div>URI: {selectedDoc.uri.split('/').pop()}</div>
                <div className="text-slate-500">~{selectedDoc.metadata.pageCount} Pages</div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <span>Parent Chunks: {parentChunks.length}</span>
              <span aria-hidden="true">·</span>
              <span>Child Chunks: {childChunks.length}</span>
              <span aria-hidden="true">·</span>
              <span>Avg Length: ~{childChunks.length > 0 ? Math.round(childChunks.reduce((a, c) => a + c.token_count, 0) / childChunks.length) : 0} tokens</span>
            </div>
          </div>

          {/* Chunks List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Generated Chunks with Parent Pointers ({childChunks.length})
            </h4>

            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {childChunks.map((chunk) => (
                <div
                  key={chunk.chunk_id}
                  className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/70 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">{chunk.chunk_id}</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-amber-400">Parent: {chunk.parent_chunk_id}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500">
                      <span>Hash: {chunk.content_hash}</span>
                      <span>·</span>
                      <span>p.{chunk.page}</span>
                    </div>
                  </div>

                  <div className="text-slate-300 font-medium">
                    Section: {chunk.section_path}
                  </div>

                  <p className="text-slate-400 font-body leading-relaxed text-[11px] bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                    {chunk.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ingestion Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-xl border border-slate-700 bg-slate-900 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-display">
              <Plus className="w-4 h-4 text-cyan-400" />
              Ingest Document into Custom Index
            </h3>

            <form onSubmit={handleIngest} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Raft Consensus Algorithm Specification"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="cloud">Cloud Architecture</option>
                  <option value="vector-search">Vector Search & Algorithms</option>
                  <option value="distributed-systems">Distributed Systems</option>
                  <option value="evaluation">Evaluation & Security</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Markdown Content (with # Headings)</label>
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  rows={8}
                  placeholder="# Section 1: Overview&#10;Write technical details here..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim() || !newContent.trim()}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Chunking & Indexing...' : 'Index Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
