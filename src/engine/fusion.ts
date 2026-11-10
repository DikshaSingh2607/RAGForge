/**
 * RAGForge Reciprocal Rank Fusion (RRF)
 * Fuses rank positions from Dense Vector and BM25 Keyword retrieval channels.
 * Formula: RRF(d) = \sum_{r \in R} \frac{1}{k + rank_r(d)}
 */

import { Chunk } from './chunker';
import { BM25Result } from './bm25';
import { VectorResult } from './hnsw';

export interface FusedCandidate {
  chunk: Chunk;
  rrfScore: number;
  rank: number;
  denseRank: number | null;
  bm25Rank: number | null;
  denseScore: number | null;
  bm25Score: number | null;
  matchedTerms?: string[];
}

export interface FusionConfig {
  k: number; // Smoothing parameter, default 60
  topK: number; // Final fused candidates count, default 20
}

export const DEFAULT_FUSION_CONFIG: FusionConfig = {
  k: 60,
  topK: 20,
};

/**
 * Executes Reciprocal Rank Fusion on dense vector and BM25 results
 */
export function reciprocalRankFusion(
  denseResults: VectorResult[],
  bm25Results: BM25Result[],
  config: FusionConfig = DEFAULT_FUSION_CONFIG
): FusedCandidate[] {
  const { k, topK } = config;
  const candidateMap = new Map<string, {
    chunk: Chunk;
    rrfScore: number;
    denseRank: number | null;
    bm25Rank: number | null;
    denseScore: number | null;
    bm25Score: number | null;
    matchedTerms?: string[];
  }>();

  // Process Dense candidates
  for (const item of denseResults) {
    const chunkId = item.chunk.chunk_id;
    const rank = item.rank;
    const rrfContrib = 1 / (k + rank);

    if (!candidateMap.has(chunkId)) {
      candidateMap.set(chunkId, {
        chunk: item.chunk,
        rrfScore: 0,
        denseRank: rank,
        bm25Rank: null,
        denseScore: item.score,
        bm25Score: null,
      });
    } else {
      const existing = candidateMap.get(chunkId)!;
      existing.denseRank = rank;
      existing.denseScore = item.score;
    }
    candidateMap.get(chunkId)!.rrfScore += rrfContrib;
  }

  // Process BM25 candidates
  for (const item of bm25Results) {
    const chunkId = item.chunk.chunk_id;
    const rank = item.rank;
    const rrfContrib = 1 / (k + rank);

    if (!candidateMap.has(chunkId)) {
      candidateMap.set(chunkId, {
        chunk: item.chunk,
        rrfScore: 0,
        denseRank: null,
        bm25Rank: rank,
        denseScore: null,
        bm25Score: item.score,
        matchedTerms: item.matchedTerms,
      });
    } else {
      const existing = candidateMap.get(chunkId)!;
      existing.bm25Rank = rank;
      existing.bm25Score = item.score;
      existing.matchedTerms = item.matchedTerms;
    }
    candidateMap.get(chunkId)!.rrfScore += rrfContrib;
  }

  const sorted = Array.from(candidateMap.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, topK)
    .map((item, index) => ({
      ...item,
      rrfScore: Number(item.rrfScore.toFixed(5)),
      rank: index + 1,
    }));

  return sorted;
}
