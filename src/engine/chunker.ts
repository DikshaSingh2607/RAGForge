/**
 * RAGForge Heading-Aware Recursive Chunker
 * Splits documents by Markdown headings, then recursively by token/char size with overlap.
 * Maintains parent-child relationships for hierarchical retrieval.
 */

export interface Chunk {
  chunk_id: string;
  doc_id: string;
  parent_chunk_id?: string;
  is_parent: boolean;
  text: string;
  section_path: string;
  page: number;
  token_count: number;
  content_hash: string;
  vector?: number[];
}

export interface ChunkerConfig {
  parentChunkSize: number; // e.g. 1000 characters (~250 tokens)
  childChunkSize: number;  // e.g. 350 characters (~85 tokens)
  overlapRatio: number;    // e.g. 0.15 (15% overlap)
}

export const DEFAULT_CHUNKER_CONFIG: ChunkerConfig = {
  parentChunkSize: 1000,
  childChunkSize: 350,
  overlapRatio: 0.15,
};

/**
 * Deterministic hash for string content (skips re-embedding unchanged chunks)
 */
export function computeContentHash(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) + content.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

/**
 * Approximate token count (~4 characters per token for English text)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.trim().split(/\s+/).length * 1.3);
}

/**
 * Parses markdown into heading sections, then chunks into parent and child chunks
 */
export function chunkDocument(
  docId: string,
  content: string,
  config: ChunkerConfig = DEFAULT_CHUNKER_CONFIG
): { parents: Chunk[]; children: Chunk[]; allChunks: Chunk[] } {
  const lines = content.split('\n');
  const sections: { heading: string; lines: string[] }[] = [];
  
  let currentHeading = "Preamble";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('#')) {
      if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, lines: [...currentLines] });
        currentLines = [];
      }
      currentHeading = line.replace(/^#+\s*/, '').trim();
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0) {
    sections.push({ heading: currentHeading, lines: [...currentLines] });
  }

  const parents: Chunk[] = [];
  const children: Chunk[] = [];
  let parentIndex = 0;
  let childIndex = 0;
  let approximatePage = 1;

  for (const section of sections) {
    const sectionText = section.lines.join('\n').trim();
    if (!sectionText) continue;

    // Estimate page increment roughly every 2500 chars
    approximatePage = Math.max(1, Math.ceil((parents.length * 900) / 2500));

    // Split section into parent chunks
    const parentTexts = splitRecursive(sectionText, config.parentChunkSize, config.overlapRatio);

    for (const pText of parentTexts) {
      parentIndex++;
      const parentId = `${docId}_p${parentIndex}`;
      const parentHash = computeContentHash(pText);

      const parentChunk: Chunk = {
        chunk_id: parentId,
        doc_id: docId,
        is_parent: true,
        text: pText,
        section_path: section.heading,
        page: approximatePage,
        token_count: estimateTokens(pText),
        content_hash: parentHash,
      };
      parents.push(parentChunk);

      // Split parent into finer child chunks
      const childTexts = splitRecursive(pText, config.childChunkSize, config.overlapRatio);
      for (const cText of childTexts) {
        childIndex++;
        const childId = `${docId}_c${childIndex}`;
        const childHash = computeContentHash(cText);

        const childChunk: Chunk = {
          chunk_id: childId,
          doc_id: docId,
          parent_chunk_id: parentId,
          is_parent: false,
          text: cText,
          section_path: section.heading,
          page: approximatePage,
          token_count: estimateTokens(cText),
          content_hash: childHash,
        };
        children.push(childChunk);
      }
    }
  }

  return {
    parents,
    children,
    allChunks: [...parents, ...children],
  };
}

function splitRecursive(text: string, maxSize: number, overlapRatio: number): string[] {
  if (text.length <= maxSize) return [text];

  const overlap = Math.floor(maxSize * overlapRatio);
  const step = Math.max(1, maxSize - overlap);
  const chunks: string[] = [];

  // Split by natural paragraph or sentence boundary if possible
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);

    // Try to break at period, newline, or whitespace if not at end
    if (end < text.length) {
      const naturalBreak = text.lastIndexOf('\n', end);
      const sentenceBreak = text.lastIndexOf('. ', end);
      const spaceBreak = text.lastIndexOf(' ', end);

      if (naturalBreak > start + maxSize * 0.5) {
        end = naturalBreak + 1;
      } else if (sentenceBreak > start + maxSize * 0.5) {
        end = sentenceBreak + 1;
      } else if (spaceBreak > start + maxSize * 0.5) {
        end = spaceBreak;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    start += step;
    if (end === text.length) break;
  }

  return chunks;
}
