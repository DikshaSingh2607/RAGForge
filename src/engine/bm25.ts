/**
 * RAGForge Handwritten BM25 Inverted Index
 * Implements Robertson-Spärck Jones BM25 with tunable k1 and b parameters.
 * Excels at exact keywords, code tokens, and alphanumeric identifiers.
 */

import { Chunk } from './chunker';

export interface BM25Config {
  k1: number; // Term frequency saturation parameter (typically 1.2 - 2.0, default 1.5)
  b: number;  // Document length normalization parameter (typically 0.75)
}

export const DEFAULT_BM25_CONFIG: BM25Config = {
  k1: 1.5,
  b: 0.75,
};

export interface PostingsEntry {
  chunkId: string;
  tf: number;
}

export interface BM25Result {
  chunk: Chunk;
  score: number;
  matchedTerms: string[];
  rank: number;
}

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'did', 'do', 'does', 'doing', 'don', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
  'how', 'i', 'if', 'in', 'into', 'is', 'isn', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 's', 'same', 'she', 'should', 'so', 'some', 'such',
  't', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn',
  'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'you'
]);

export class BM25Index {
  private invertedIndex: Map<string, PostingsEntry[]> = new Map();
  private docLengths: Map<string, number> = new Map();
  private chunksMap: Map<string, Chunk> = new Map();
  private avgdl: number = 0;
  private totalDocs: number = 0;
  private idfCache: Map<string, number> = new Map();
  public config: BM25Config;

  constructor(config: BM25Config = DEFAULT_BM25_CONFIG) {
    this.config = { ...config };
  }

  /**
   * Tokenizes text preserving alphanumeric codes, hyphens, and technical terms
   */
  public tokenize(text: string): string[] {
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s\-_.]/g, ' ')
      .split(/[\s,;:!?()[\]{}"'`]+/)
      .map(t => t.trim().replace(/^[-_.]+|[-_.]+$/g, ''))
      .filter(t => t.length > 1 && !STOPWORDS.has(t));
    return tokens;
  }

  /**
   * Build the index from a list of chunks
   */
  public buildIndex(chunks: Chunk[]): void {
    this.invertedIndex.clear();
    this.docLengths.clear();
    this.chunksMap.clear();
    this.idfCache.clear();

    this.totalDocs = chunks.length;
    let totalLength = 0;

    for (const chunk of chunks) {
      this.chunksMap.set(chunk.chunk_id, chunk);
      const tokens = this.tokenize(`${chunk.section_path} ${chunk.text}`);
      const docLen = tokens.length || 1;
      this.docLengths.set(chunk.chunk_id, docLen);
      totalLength += docLen;

      // Count term frequencies within this document
      const termFrequencies = new Map<string, number>();
      for (const token of tokens) {
        termFrequencies.set(token, (termFrequencies.get(token) || 0) + 1);
      }

      // Add to postings lists
      for (const [term, tf] of termFrequencies.entries()) {
        if (!this.invertedIndex.has(term)) {
          this.invertedIndex.set(term, []);
        }
        this.invertedIndex.get(term)!.push({ chunkId: chunk.chunk_id, tf });
      }
    }

    this.avgdl = this.totalDocs > 0 ? totalLength / this.totalDocs : 1;
  }

  /**
   * Calculates Robertson-Spärck Jones IDF with smoothing
   * IDF(q_i) = ln((N - n(q_i) + 0.5) / (n(q_i) + 0.5) + 1)
   */
  public getIDF(term: string): number {
    if (this.idfCache.has(term)) {
      return this.idfCache.get(term)!;
    }

    const postings = this.invertedIndex.get(term);
    const n = postings ? postings.length : 0;
    const N = this.totalDocs;

    // Smoothed BM25 IDF
    const idf = Math.log(((N - n + 0.5) / (n + 0.5)) + 1);
    this.idfCache.set(term, idf);
    return idf;
  }

  /**
   * Search query against the BM25 index
   */
  public search(query: string, topK: number = 50, filterDocId?: string): BM25Result[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0 || this.totalDocs === 0) return [];

    const scores = new Map<string, { score: number; matchedTerms: Set<string> }>();
    const { k1, b } = this.config;

    for (const token of queryTokens) {
      const postings = this.invertedIndex.get(token);
      if (!postings) continue;

      const idf = this.getIDF(token);

      for (const entry of postings) {
        const chunk = this.chunksMap.get(entry.chunkId);
        if (!chunk) continue;
        if (filterDocId && chunk.doc_id !== filterDocId) continue;

        const docLen = this.docLengths.get(entry.chunkId) || this.avgdl;
        const tf = entry.tf;

        // BM25 term weighting formula
        const numerator = tf * (k1 + 1);
        const denominator = tf + k1 * (1 - b + b * (docLen / this.avgdl));
        const termScore = idf * (numerator / denominator);

        if (!scores.has(entry.chunkId)) {
          scores.set(entry.chunkId, { score: 0, matchedTerms: new Set() });
        }
        const current = scores.get(entry.chunkId)!;
        current.score += termScore;
        current.matchedTerms.add(token);
      }
    }

    const sorted = Array.from(scores.entries())
      .map(([chunkId, data]) => ({
        chunk: this.chunksMap.get(chunkId)!,
        score: Number(data.score.toFixed(4)),
        matchedTerms: Array.from(data.matchedTerms),
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    sorted.forEach((item, index) => {
      item.rank = index + 1;
    });

    return sorted;
  }

  public getStats() {
    return {
      totalDocuments: this.totalDocs,
      uniqueTerms: this.invertedIndex.size,
      avgDocLength: Number(this.avgdl.toFixed(1)),
      k1: this.config.k1,
      b: this.config.b,
    };
  }
}
