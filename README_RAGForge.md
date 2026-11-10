# RAGForge — From-Scratch Hybrid RAG Engine & Benchmark

RAGForge is an educational, full-stack Retrieval-Augmented Generation (RAG) project. It demonstrates how a hybrid retrieval pipeline can combine lexical search, vector search, rank fusion, reranking, query understanding, and grounded-answer safeguards.

> **Project status:** Experimental / educational implementation. Read the implementation notes below before interpreting benchmark figures or describing the system as production-ready.

## Overview

The project includes a React + TypeScript interface and an Express server. Its retrieval engine is implemented in TypeScript and includes:

- **BM25 lexical retrieval** for term-based matching.
- **HNSW-style vector indexing and search**, plus an exact brute-force search baseline.
- **Reciprocal Rank Fusion (RRF)** to combine lexical and vector retrieval rankings.
- **Candidate reranking** using the project's lexical/structural scoring implementation.
- **Query-understanding utilities**, including query expansion / HyDE-style workflow support.
- **Parent/child chunking utilities** to separate retrieval granularity from the context returned to the answer stage.
- **Guardrails and groundedness-related checks** in the query pipeline.
- **Evaluation utilities** for Recall@k, MRR, nDCG, abstention behavior, and latency.
- A UI for exploring the pipeline, corpus, architecture, vector benchmarks, and ablation results.

## Architecture

```text
User question
     |
     v
Query understanding
     |
     +-----------------------+
     |                       |
     v                       v
BM25 lexical search     Vector search (HNSW / brute force)
     |                       |
     +-----------+-----------+
                 |
                 v
        Reciprocal Rank Fusion
                 |
                 v
        Candidate reranking
                 |
                 v
       Context / parent chunks
                 |
                 v
       Grounding and guardrails
                 |
                 v
          Answer + citations
```

The exact stages and optional integrations depend on the selected query configuration and whether a Gemini API key is configured.

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript (`tsx` for local development)
- **AI integration:** Google GenAI SDK (optional; requires a Gemini API key)
- **UI / animation:** Lucide React and Motion

## Repository structure

```text
RAGForge/
├── public/
│   └── assets/
│       └── aistudio/
│           └── RAGForge_Project_Report_*.pdf
├── src/
│   ├── components/       # UI views and reusable components
│   ├── engine/           # Retrieval, indexing, fusion and evaluation logic
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json     # Generate with npm install and commit it
├── server.ts
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Getting started

### Prerequisites

- Node.js compatible with the Vite version in `package.json` (use a current supported Node.js LTS release).
- npm.
- A Gemini API key only if you want to test the optional Gemini integration.

Check your versions:

```bash
node --version
npm --version
```

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/RAGForge.git
cd RAGForge
```

Replace `YOUR-USERNAME` with your GitHub username and use your actual repository URL.

### 2. Install dependencies

```bash
npm install
```

Commit the generated `package-lock.json` so other developers can install the same dependency versions.

### 3. Configure environment variables (optional)

Copy `.env.example` to `.env`.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Open `.env` and add your own key:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Do not commit `.env`, `.env.local`, or any file containing a real API key. The `.gitignore` in this project is configured to ignore `.env*` files while allowing `.env.example`.

Without a valid key, the application can use its local educational fallback path. Gemini-backed generation / embedding features will not be available. Check the integration status in the app or through the status endpoint.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL printed in the terminal. The Express server defaults to port `3000` unless `PORT` is set.

### 5. Build and type-check

```bash
npm run build
npm run lint
```

`npm run build` creates the Vite production build. `npm run lint` runs the TypeScript compiler in no-emit mode.

## API endpoints

The Express server defines the following routes:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Server and corpus health information |
| `GET` | `/api/gemini/status` | Checks Gemini configuration / connectivity |
| `POST` | `/api/query` | Runs a RAG query |
| `POST` | `/api/ingest` | Starts document ingestion |
| `GET` | `/api/ingest/status` | Reads ingestion status |
| `GET` | `/api/benchmarks/hnsw` | Returns HNSW benchmark information |
| `GET` | `/api/eval/ablation` | Returns the configured ablation results |
| `POST` | `/api/eval/run-test` | Runs an evaluation test case |
| `POST` | `/api/eval/run-empirical` | Runs the live in-memory evaluation |
| `POST` | `/api/feedback` | Records query feedback in server memory |

Example health check:

```bash
curl http://localhost:3000/api/health
```

Example query request:

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query":"How does BM25 rank documents?","topK":5}'
```

On Windows PowerShell, use `curl.exe` if `curl` is mapped to the PowerShell web request alias.

## Implementation notes and limitations

Transparency matters when presenting this project:

1. **Vector representations:** The local fallback vector generator is handcrafted / deterministic and should not be described as a pretrained semantic embedding model.
2. **Reranking:** The local reranker is lexical/structural and heuristic-based. It is not a pretrained neural cross-encoder. The server contains an optional Gemini-backed reranking path when configured and successfully connected.
3. **Gemini integration:** External model calls require a valid API key and working model access. The app includes fallback behavior; a fallback response does not prove that Gemini was successfully used.
4. **Benchmark interpretation:** The ablation table includes reference / report target figures marked as non-empirical. Do not present those figures as measurements from your machine. Use the live empirical evaluation for measured results, and report the query count, configuration, and environment alongside them.
5. **Baseline comparisons:** Clearly label simulated or illustrative comparisons. Do not describe a simulated FAISS comparison as a benchmark run against an actual FAISS installation.
6. **Evaluation scope:** The included evaluation corpus is small and project-specific. Results are useful for demonstrating the evaluation workflow, not for making broad claims about production retrieval quality.

## Suggested demo flow

For a short project walkthrough:

1. Introduce the problem RAGForge addresses.
2. Show the architecture view.
3. Open the document corpus and explain chunking.
4. Submit a question in the pipeline playground.
5. Explain the lexical and vector retrieval results, RRF fusion, and reranking.
6. Show citations / grounding behavior.
7. Open the benchmark and evaluation views, distinguishing live measurements from reference figures.

Only show features that you have personally run and verified.

## Contributing

Contributions and suggestions are welcome. For substantial changes, open an issue first to discuss what you would like to change.

## License

No license is currently specified. Add a `LICENSE` file before inviting reuse or contributions, and choose a license that matches the rights you have to the code and included project report / assets.
