import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  Database,
  Server,
  Cpu,
  GitBranch,
  Shield,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Code2,
  HelpCircle,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [activePipeline, setActivePipeline] = useState<'online' | 'offline'>('online');
  const [selectedNode, setSelectedNode] = useState<string>('rrf');
  const [activeTable, setActiveTable] = useState<string>('chunks');

  const nodeDetails: Record<string, {
    title: string;
    stage: string;
    file: string;
    responsibility: string;
    formula?: string;
    designDecision: string;
    codeSnippet: string;
  }> = {
    cache: {
      title: "Semantic Cache & Fast-Path",
      stage: "Online Gate 1",
      file: "src/ragforge/cache/semantic_cache.py",
      responsibility: "Intercept near-identical queries and return verified answers with zero LLM generation tokens.",
      formula: "\\text{similarity}(q_{\\text{new}}, q_{\\text{cached}}) > 0.94 \\implies \\text{return } A_{\\text{cached}}",
      designDecision: "Keyed by cosine similarity over embedding vectors + content hash to prevent stale answers across index versions.",
      codeSnippet: `def check_semantic_cache(query_vec, threshold=0.94):
    best_entry = redis_client.vector_search(query_vec, top_k=1)
    if best_entry and best_entry.score >= threshold:
        stats.increment("cache.hit")
        return best_entry.cached_answer # 0ms LLM latency
    stats.increment("cache.miss")
    return None`
    },
    rewrite: {
      title: "Query Understanding & HyDE",
      stage: "Online Stage 2",
      file: "src/ragforge/query/condense_hyde.py",
      responsibility: "Condense conversation chat history into a standalone query and generate hypothetical document embeddings.",
      formula: "Q_{\\text{standalone}} = \\text{LLM}_{\\text{condense}}(H, Q_t); \\quad V_Q = \\text{Embed}(\\text{HyDE}(Q))",
      designDecision: "Paraphrase multi-query variations so both dense and sparse keyword retrieval channels capture complementary facets.",
      codeSnippet: `def condense_and_hyde(query, history):
    standalone_q = condense_chat_history(query, history)
    hyde_passage = generate_hypothetical_answer(standalone_q)
    return {
        "dense_vector": embed(hyde_passage),
        "keyword_tokens": tokenize_bm25(standalone_q)
    }`
    },
    parallel_retrieval: {
      title: "Parallel Dual Retrieval (BM25 + HNSW)",
      stage: "Online Stage 3",
      file: "src/ragforge/retrieval/hybrid.py",
      responsibility: "Concurrently query the hand-written BM25 inverted index and HNSW vector graph, retrieving top 50 candidates each.",
      formula: "R_{\\text{dense}} = \\text{HNSW.search}(V_Q, k=50, ef=64); \\quad R_{\\text{sparse}} = \\text{BM25.search}(T_Q, k=50)",
      designDecision: "Dispatched concurrently using asyncio to ensure parallel wall-clock retrieval time is bounded by max(dense, sparse).",
      codeSnippet: `async def parallel_retrieve(query_vec, query_tokens, top_k=50):
    dense_task = asyncio.create_task(hnsw_index.search(query_vec, top_k=top_k, ef=64))
    sparse_task = asyncio.create_task(bm25_index.search(query_tokens, top_k=top_k))
    dense_candidates, sparse_candidates = await asyncio.gather(dense_task, sparse_task)
    return dense_candidates, sparse_candidates`
    },
    rrf: {
      title: "Reciprocal Rank Fusion (RRF)",
      stage: "Online Stage 4",
      file: "src/ragforge/retrieval/fusion.py",
      responsibility: "Merge uncalibrated dense cosine scores and sparse BM25 scores by summing reciprocal rank positions.",
      formula: "\\text{RRF}(d) = \\sum_{r \\in R} \\frac{1}{k + \\text{rank}_r(d)}, \\quad k = 60",
      designDecision: "Fuses ranks rather than raw score magnitudes, eliminating the need for brittle empirical scaling coefficients.",
      codeSnippet: `def reciprocal_rank_fusion(dense_ranks, bm25_ranks, k=60, top_k=20):
    rrf_scores = defaultdict(float)
    for rank, doc_id in enumerate(dense_ranks, 1):
        rrf_scores[doc_id] += 1.0 / (k + rank)
    for rank, doc_id in enumerate(bm25_ranks, 1):
        rrf_scores[doc_id] += 1.0 / (k + rank)
    return sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]`
    },
    rerank: {
      title: "Cross-Encoder Reranker",
      stage: "Online Stage 5",
      file: "src/ragforge/rerank/cross_encoder.py",
      responsibility: "Score joint query-candidate cross-attention on top 20 candidates, selecting top 5 for generation.",
      formula: "S_{\\text{cross}} = \\text{Softmax}(\\text{Transformer}([CLS] + Q + [SEP] + D + [SEP]))",
      designDecision: "Restricted strictly to the top 20 fused candidates to respect the 400ms p95 latency budget on 100k chunks.",
      codeSnippet: `def rerank_top_candidates(query, candidates, top_k=5):
    pairs = [[query, c.text] for c in candidates[:20]]
    cross_scores = cross_encoder_model.predict(pairs) # batch forward pass
    ranked = sorted(zip(candidates, cross_scores), key=lambda x: x[1], reverse=True)
    return [c for c, score in ranked[:top_k]]`
    },
    parent_child: {
      title: "Parent-Child Context Assembly",
      stage: "Online Stage 6",
      file: "src/ragforge/generation/context_builder.py",
      responsibility: "Swap matched small child chunks for their corresponding larger parent chunks to supply complete narrative context.",
      formula: "D_{\\text{prompt}} = \\{ \\text{Parent}(c) \\text{ if } c.\\text{parent\\_id} \\text{ else } c \\}",
      designDecision: "Index small child chunks for sharp search matching; return larger parent chunks to avoid lost context.",
      codeSnippet: `def build_prompt_context(top_candidates):
    expanded = []
    for c in top_candidates:
        parent = document_store.get_parent_chunk(c.parent_chunk_id)
        expanded.append(parent if parent else c)
    return wrap_in_xml_delimiters(expanded)`
    },
    groundedness: {
      title: "Groundedness Audit & Abstention",
      stage: "Online Gate 2 & 3",
      file: "src/ragforge/guardrails/groundedness.py",
      responsibility: "Audit each generated claim against cited chunk IDs; retry once if ungrounded, else emit honest refusal.",
      formula: "\\text{Faithfulness} = \\frac{|\\text{Claims Supported by Context}|}{|\\text{Total Generated Claims}|} \\ge 0.90",
      designDecision: "When evidence confidence < 0.35, honest refusal is mandated to prevent fabricated technical claims.",
      codeSnippet: `def audit_groundedness(answer, citations, min_threshold=0.35):
    claims = extract_claims(answer)
    verified = [verify_claim_in_chunks(c, citations) for c in claims]
    score = sum(verified) / len(claims)
    if score < 0.85:
        # One retry loop with expanded context
        return retry_generation_with_broader_context()
    return answer if score >= 0.90 else emit_honest_abstention()`
    },
    hash_check: {
      title: "Content Hash Deduplication",
      stage: "Offline Gate 1",
      file: "src/ragforge/ingestion/dedup.py",
      responsibility: "Compute SHA-256 and MinHash of raw documents; skip parsing and embedding if content is unchanged.",
      formula: "H = \\text{SHA-256}(\\text{RawContent}); \\quad \\text{if } H = H_{\\text{db}} \\implies \\text{skip}",
      designDecision: "Cuts batch ingestion cost to zero for unchanged technical whitepapers and documentation.",
      codeSnippet: `def ingest_file(file_path):
    h = sha256(open(file_path, 'rb').read()).hexdigest()
    if document_store.has_hash(h):
        logger.info(f"Skipping {file_path}: content unchanged")
        return None
    return parse_and_chunk(file_path)`
    },
    blue_green: {
      title: "Smoke Test & Blue/Green Index Swap",
      stage: "Offline Gate 2",
      file: "src/ragforge/index/versioning.py",
      responsibility: "Run a 10-query validation smoke test against newly generated index version before promoting to live traffic.",
      formula: "\\text{if } \\text{Recall@5}_{\\text{smoke}} \\ge 0.85 \\implies \\text{Atomic Swap}; \\quad \\text{else } \\text{Rollback}",
      designDecision: "Ensures corrupted chunks or failed embeddings never reach live user query traffic.",
      codeSnippet: `def promote_index(new_version_id):
    smoke_results = run_smoke_test(new_version_id)
    if smoke_results.recall_at_5 >= 0.85 and smoke_results.failures == 0:
        redis_client.set("active_index_version", new_version_id) # atomic swap
        logger.info(f"Version {new_version_id} is now live")
    else:
        rollback_to_previous_snapshot()`
    }
  };

  const schemas: Record<string, { desc: string; columns: { name: string; type: string; desc: string }[] }> = {
    documents: {
      desc: "Source document registry with content hashing for skip re-embedding",
      columns: [
        { name: "doc_id", type: "VARCHAR(64) PRIMARY KEY", desc: "Unique document identifier (e.g. doc-dynamodb-arch)" },
        { name: "source_uri", type: "VARCHAR(512)", desc: "S3 or local URI location" },
        { name: "content_hash", type: "VARCHAR(64)", desc: "SHA-256 hash to skip unchanged documents" },
        { name: "version", type: "VARCHAR(16)", desc: "Document version (e.g. v2.1)" },
        { name: "ingested_at", type: "TIMESTAMP WITH TZ", desc: "Ingestion completion timestamp" },
      ]
    },
    chunks: {
      desc: "Granular text chunks with parent-child hierarchy pointers",
      columns: [
        { name: "chunk_id", type: "VARCHAR(64) PRIMARY KEY", desc: "Unique chunk ID (doc_c1, doc_p1)" },
        { name: "doc_id", type: "VARCHAR(64) REFERENCES documents", desc: "Foreign key to parent document" },
        { name: "parent_chunk_id", type: "VARCHAR(64) NULL", desc: "Points to larger parent chunk for context expansion" },
        { name: "text", type: "TEXT", desc: "Clean normalized chunk text body" },
        { name: "section_path", type: "VARCHAR(256)", desc: "Markdown heading path for citation context" },
        { name: "page", type: "INTEGER", desc: "Originating page number" },
        { name: "token_count", type: "INTEGER", desc: "Pre-computed token length" },
      ]
    },
    embeddings: {
      desc: "Dense vector coordinates associated with specific model versions",
      columns: [
        { name: "chunk_id", type: "VARCHAR(64) PRIMARY KEY", desc: "References chunk" },
        { name: "model_name", type: "VARCHAR(64)", desc: "Identifies model (e.g. BGE-small / gemini-embedding-2)" },
        { name: "vector", type: "VECTOR(64)", desc: "Normalized L2 unit float array" },
        { name: "created_at", type: "TIMESTAMP", desc: "Vector generation timestamp" },
      ]
    },
    traces: {
      desc: "Granular per-stage observability spans and latency accounting",
      columns: [
        { name: "query_id", type: "VARCHAR(64)", desc: "Trace UUID" },
        { name: "stage", type: "VARCHAR(64)", desc: "Pipeline span (cache, rewrite, retrieve, rrf, rerank, gen, audit)" },
        { name: "latency_ms", type: "FLOAT", desc: "Stage execution duration in milliseconds" },
        { name: "tokens_in", type: "INTEGER", desc: "Prompt tokens consumed" },
        { name: "tokens_out", type: "INTEGER", desc: "Generated tokens emitted" },
        { name: "cost_usd", type: "NUMERIC(8,6)", desc: "Micro-dollar cost computed from token tariffs" },
        { name: "retrieved_chunk_ids", type: "TEXT[]", desc: "List of chunk candidates evaluated" },
      ]
    },
    eval_runs: {
      desc: "CI regression records committed with git SHA",
      columns: [
        { name: "run_id", type: "VARCHAR(64) PRIMARY KEY", desc: "Evaluation benchmark run UUID" },
        { name: "git_sha", type: "VARCHAR(40)", desc: "GitHub commit hash tested" },
        { name: "config_json", type: "JSONB", desc: "Hyperparameters tested (k1, b, efSearch, rrf_k)" },
        { name: "recall_at_5", type: "FLOAT", desc: "Measured Recall@5 metric" },
        { name: "mrr", type: "FLOAT", desc: "Mean Reciprocal Rank" },
        { name: "faithfulness", type: "FLOAT", desc: "Faithfulness score by validated LLM judge" },
        { name: "p95_latency_ms", type: "FLOAT", desc: "Measured p95 end-to-end latency" },
      ]
    }
  };

  const selectedNodeData = nodeDetails[selectedNode] || nodeDetails['rrf'];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono mb-1">
              <span>REPORT CHAPTER 3, 4 & 5</span>
              <span aria-hidden="true">·</span>
              <span>2 PIPELINES</span>
              <span aria-hidden="true">·</span>
              <span>4 STORES</span>
              <span aria-hidden="true">·</span>
              <span>3 DECISION GATES</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white font-display">
              System Architecture & Flowcharts
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Interactive architectural blueprints showing the offline indexing loop and online query workflow with honest refusal and retry gates.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => { setActivePipeline('online'); setSelectedNode('rrf'); }}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                activePipeline === 'online' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Online Query Flow (3 Decisions)
            </button>
            <button
              onClick={() => { setActivePipeline('offline'); setSelectedNode('hash_check'); }}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                activePipeline === 'offline' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Offline Ingestion Flow (2 Decisions)
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Flowchart Diagram */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/80 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              {activePipeline === 'online' ? 'Online Query Workflow (Report Section 5.2)' : 'Offline Ingestion Workflow (Report Section 5.1)'}
            </h3>
          </div>
          <span className="text-xs font-mono text-cyan-400">
            Click any block to inspect its algorithm, formula & code implementation
          </span>
        </div>

        {activePipeline === 'online' ? (
          /* Online Query Flowchart Grid */
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
              Three gates shape every query: a cache hit returns early, weak evidence ends in an honest refusal, and an ungrounded draft gets one retry before the system abstains.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {[
                { id: 'cache', tag: 'Decision Gate 1', title: '1. Cache Check', desc: 'Cosine similarity hit returns in <2ms with 0 tokens' },
                { id: 'rewrite', tag: 'Stage 2', title: '2. Query Rewrite', desc: 'Chat condensation + HyDE hypothetical passage embedding' },
                { id: 'parallel_retrieval', tag: 'Stage 3 (Parallel)', title: '3. Dual Retrieval', desc: 'Dense Top 50 + BM25 Top 50 dispatched concurrently' },
                { id: 'rrf', tag: 'Stage 4 (Custom)', title: '4. Fusion (RRF)', desc: 'Reciprocal Rank Fusion adds 1 / (60 + rank)' },
                { id: 'rerank', tag: 'Stage 5 (Precision)', title: '5. Cross Reranker', desc: 'Transformer cross-attention on top 20 candidates only' },
                { id: 'parent_child', tag: 'Stage 6 (Context)', title: '6. Parent-Child Swap', desc: 'Replaces child chunks with rich parent context' },
                { id: 'groundedness', tag: 'Decision Gate 2 & 3', title: '7. Groundedness Gate', desc: 'Audits citations; 1 retry loop before honest abstention' },
              ].map(block => (
                <div
                  key={block.id}
                  onClick={() => setSelectedNode(block.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                    selectedNode === block.id
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] font-mono text-cyan-400 font-bold">
                    <span>{block.tag}</span>
                    {selectedNode === block.id && <span className="text-white">● ACTIVE</span>}
                  </div>
                  <div className="font-semibold text-slate-200">{block.title}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-2">{block.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Offline Ingestion Flowchart Grid */
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
              A content hash decides whether a document is touched at all, and a new index version goes live only after its smoke test passes.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {[
                { id: 'hash_check', tag: 'Decision Gate 1', title: '1. Content Hash Check', desc: 'SHA-256 match skips document; zero re-embedding cost' },
                { id: 'parent_child', tag: 'Stage 2 (Chunker)', title: '2. Heading-Aware Chunk', desc: 'Splits by markdown headings, then recurses with 15% overlap' },
                { id: 'parallel_retrieval', tag: 'Stage 3 (Indexes)', title: '3. Dual Store Writes', desc: 'Writes vectors to HNSW graph and tokens to BM25 index' },
                { id: 'blue_green', tag: 'Decision Gate 2', title: '4. Smoke Test Swap', desc: '10-case evaluation smoke test before live blue/green swap' },
              ].map(block => (
                <div
                  key={block.id}
                  onClick={() => setSelectedNode(block.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                    selectedNode === block.id
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] font-mono text-cyan-400 font-bold">
                    <span>{block.tag}</span>
                    {selectedNode === block.id && <span className="text-white">● ACTIVE</span>}
                  </div>
                  <div className="font-semibold text-slate-200">{block.title}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-2">{block.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Node Deep Dive Inspector */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                {selectedNodeData.stage} · {selectedNodeData.file}
              </span>
              <h4 className="text-base font-bold text-white font-display mt-0.5">
                {selectedNodeData.title}
              </h4>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Production Implementation</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <span className="text-slate-400 font-mono text-[11px] uppercase font-bold block mb-1">
                  Architectural Responsibility
                </span>
                <p className="text-slate-300 leading-relaxed font-body">
                  {selectedNodeData.responsibility}
                </p>
              </div>

              {selectedNodeData.formula && (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-cyan-400 font-mono text-[10px] uppercase font-bold block mb-1">
                    Mathematical Formulation
                  </span>
                  <div className="text-slate-200 font-mono text-[11px]">
                    {selectedNodeData.formula}
                  </div>
                </div>
              )}

              <div>
                <span className="text-slate-400 font-mono text-[11px] uppercase font-bold block mb-1">
                  Key Design Decision (Report Defense)
                </span>
                <p className="text-slate-300 leading-relaxed font-body">
                  {selectedNodeData.designDecision}
                </p>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-mono text-[11px] uppercase font-bold block mb-1">
                Verified Code Snippet
              </span>
              <pre className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed max-h-[220px]">
                {selectedNodeData.codeSnippet}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Relational Database Schema Inspector (Report Section 7.3) */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              Core Database Schemas (Report Section 7.3)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Production PostgreSQL / pgvector relational tables supporting ACID consistency, ACL filters, and audit traces
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
            {Object.keys(schemas).map(tName => (
              <button
                key={tName}
                onClick={() => setActiveTable(tName)}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTable === tName ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tName}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-mono">
            Table: <span className="text-cyan-300 font-bold">{activeTable}</span> · {schemas[activeTable].desc}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3">Column Name</th>
                  <th className="py-2.5 px-3">Data Type</th>
                  <th className="py-2.5 px-3">Description & Invariants</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {schemas[activeTable].columns.map((col, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">{col.name}</td>
                    <td className="py-2.5 px-3 text-amber-300/90">{col.type}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans">{col.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
