/**
 * RAGForge Cross-Encoder Reranker
 * 
 * ARCHITECTURE NOTE:
 * In offline/local mode, this module implements a lexical and structural interaction heuristic
 * (evaluating term coverage, term span compactness, and heading alignment) that simulates
 * the ranking behavior of a cross-encoder model like bge-reranker-base.
 * When a valid GEMINI_API_KEY is configured, the server executes genuine neural cross-attention
 * scoring via gemini-3.8-flash.
 */

import { FusedCandidate } from './fusion';
import { Chunk } from './chunker';

export interface RerankedCandidate {
  chunk: Chunk;
  originalRank: number;
  rerankedRank: number;
  crossScore: number; // [0, 1] calibrated relevance score
  scoreDelta: number; // Change in ranking position
  parentChunk?: Chunk;
  evidenceSnippet: string;
  scoringMethod?: 'neural_gemini' | 'lexical_heuristic';
}

/**
 * Heuristic lexical and structural interaction score (local simulation fallback)
 */
export function computeHeuristicCrossScore(query: string, chunk: Chunk): { score: number; snippet: string } {
  const qTerms = query.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const chunkText = `${chunk.section_path} ${chunk.text}`;
  const lowerText = chunkText.toLowerCase();

  // 1. Exact term matches and proximity
  let termMatchCount = 0;
  let firstMatchPos = -1;
  let lastMatchPos = -1;

  for (const term of qTerms) {
    const pos = lowerText.indexOf(term);
    if (pos !== -1) {
      termMatchCount++;
      if (firstMatchPos === -1 || pos < firstMatchPos) firstMatchPos = pos;
      if (pos > lastMatchPos) lastMatchPos = pos;
    }
  }

  const queryCoverage = qTerms.length > 0 ? termMatchCount / qTerms.length : 0;
  
  // Compactness bonus: if matching query terms appear clustered together
  let spanBonus = 0;
  if (termMatchCount >= 2 && lastMatchPos > firstMatchPos) {
    const spanLength = lastMatchPos - firstMatchPos;
    if (spanLength < 150) spanBonus = 0.25;
    else if (spanLength < 300) spanBonus = 0.15;
  }

  // Heading relevance bonus
  const headingBonus = qTerms.some(t => chunk.section_path.toLowerCase().includes(t)) ? 0.2 : 0;

  // Base raw score
  let rawScore = (queryCoverage * 0.55) + spanBonus + headingBonus;

  // Normalized score between 0.05 and 0.98
  const score = Math.max(0.05, Math.min(0.98, Number(rawScore.toFixed(4))));

  // Extract snippet highlighting most relevant sentence
  const sentences = chunk.text.split(/(?<=[.?!])\s+/);
  let bestSentence = sentences[0] || chunk.text.slice(0, 120);
  let maxSentenceHits = 0;

  for (const sentence of sentences) {
    const lowerS = sentence.toLowerCase();
    const hits = qTerms.filter(t => lowerS.includes(t)).length;
    if (hits > maxSentenceHits) {
      maxSentenceHits = hits;
      bestSentence = sentence;
    }
  }

  return {
    score,
    snippet: bestSentence.trim(),
  };
}

/**
 * Reranks top fused candidates and selects the top K (default 5)
 */
export function rerankCandidates(
  candidates: FusedCandidate[],
  query: string,
  topK: number = 5,
  parentChunksMap?: Map<string, Chunk>
): RerankedCandidate[] {
  const scored = candidates.map(cand => {
    const { score, snippet } = computeHeuristicCrossScore(query, cand.chunk);
    
    // Joint cross score calibrated with RRF ordinal prior
    const calibratedScore = Number(((score * 0.7) + (cand.rrfScore * 10 * 0.3)).toFixed(4));
    
    let parentChunk: Chunk | undefined;
    if (parentChunksMap && cand.chunk.parent_chunk_id) {
      parentChunk = parentChunksMap.get(cand.chunk.parent_chunk_id);
    }

    return {
      chunk: cand.chunk,
      originalRank: cand.rank,
      rerankedRank: 0,
      crossScore: calibratedScore,
      scoreDelta: 0,
      parentChunk,
      evidenceSnippet: snippet,
      scoringMethod: 'lexical_heuristic' as const,
    };
  });

  scored.sort((a, b) => b.crossScore - a.crossScore);
  const top = scored.slice(0, topK);

  top.forEach((item, idx) => {
    item.rerankedRank = idx + 1;
    item.scoreDelta = item.originalRank - item.rerankedRank;
  });

  return top;
}
