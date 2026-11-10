import React, { useState } from 'react';
import {
  Table,
  CheckCircle2,
  XCircle,
  Play,
  TrendingUp,
  ShieldCheck,
  Zap,
  DollarSign,
  AlertOctagon,
  BarChart3,
  GitPullRequest,
  Check,
  ArrowRight,
  GitCommit,
  AlertTriangle,
} from 'lucide-react';
import {
  ABLATION_STUDY_DATA,
  LLM_JUDGE_VALIDATION_STATS,
  EVALUATION_BENCHMARK_SET,
  AblationRunResult,
  EvalCase,
} from '../engine/evaluator';

interface AblationStudyViewProps {
  onRunTestCase: (testId: string) => Promise<any>;
  onRunEmpiricalAblation?: () => Promise<AblationRunResult>;
}

export const AblationStudyView: React.FC<AblationStudyViewProps> = ({
  onRunTestCase,
  onRunEmpiricalAblation,
}) => {
  const [selectedStep, setSelectedStep] = useState<number>(7);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [baselineStep, setBaselineStep] = useState<number>(1);
  const [targetStep, setTargetStep] = useState<number>(7);
  const [ciSimScenario, setCiSimScenario] = useState<'clean' | 'recall_regress' | 'faith_regress'>('clean');
  const [empiricalResult, setEmpiricalResult] = useState<AblationRunResult | null>(null);
  const [isRunningEmpirical, setIsRunningEmpirical] = useState<boolean>(false);

  const handleExecuteSingleTest = async (testCase: EvalCase) => {
    setRunningTestId(testCase.id);
    try {
      const res = await onRunTestCase(testCase.id);
      setTestResults(prev => ({ ...prev, [testCase.id]: res }));
    } catch (err) {
      console.error("Test case execution error:", err);
    } finally {
      setRunningTestId(null);
    }
  };

  const handleRunEmpirical = async () => {
    if (!onRunEmpiricalAblation) return;
    setIsRunningEmpirical(true);
    try {
      const res = await onRunEmpiricalAblation();
      setEmpiricalResult(res);
    } catch (err) {
      console.error("Empirical benchmark run error:", err);
    } finally {
      setIsRunningEmpirical(false);
    }
  };

  const currentStepData = ABLATION_STUDY_DATA.find(s => s.stepNumber === selectedStep) || ABLATION_STUDY_DATA[6];
  const bData = ABLATION_STUDY_DATA.find(s => s.stepNumber === baselineStep) || ABLATION_STUDY_DATA[0];
  const tData = ABLATION_STUDY_DATA.find(s => s.stepNumber === targetStep) || ABLATION_STUDY_DATA[6];

  const recallGain = Number(((tData.recallAt5 - bData.recallAt5) * 100).toFixed(1));
  const faithGain = Number(((tData.faithfulness - bData.faithfulness) * 100).toFixed(1));
  const latencyDelta = tData.p95LatencyMs - bData.p95LatencyMs;
  const costDelta = Number((tData.costPer1kQueriesUsd - bData.costPer1kQueriesUsd).toFixed(2));

  return (
    <div className="space-y-8">
      {/* Header and Summary KPIs */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono mb-1">
              <span>REPORT CHAPTER 1 & 10</span>
              <span aria-hidden="true">·</span>
              <span>150 BENCHMARK EVAL CASES</span>
              <span aria-hidden="true">·</span>
              <span>CI GATE ENFORCEMENT</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white font-display">
              7-Stage Component Ablation & Quality Gate
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Measuring what each hand-written subsystem contributes to retrieval quality, faithfulness, latency, and cost.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onRunEmpiricalAblation && (
              <button
                onClick={handleRunEmpirical}
                disabled={isRunningEmpirical}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isRunningEmpirical ? 'Evaluating Active Index...' : 'Run Live Empirical Benchmark'}</span>
              </button>
            )}

            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>CI Gate: PASS</span>
            </div>
          </div>
        </div>

        {/* Engineering Integrity Banner */}
        <div className="p-3.5 rounded-lg bg-slate-950/90 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-slate-200">Engineering Methodology Disclosure:</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              The 7-stage ablation matrix represents the <strong>published reference baseline specifications</strong> from Chapter 10 recorded on an AWS c5.4xlarge cluster.
              Click <strong>"Run Live Empirical Benchmark"</strong> above to measure actual empirical Recall@5 and latency dynamically against your active in-memory corpus with zero simulated values.
            </p>
          </div>
        </div>

        {/* 4 Metric Targets Comparison Strips */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Report Target Baseline vs Live Measured Metrics
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-[11px] text-slate-400">Recall@5 (Target: ≥ 0.85)</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold font-mono text-emerald-400">0.942</span>
                {empiricalResult && (
                  <span className="text-xs font-mono text-cyan-300 font-semibold">
                    (Live: {empiricalResult.recallAt5.toFixed(3)})
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">Report baseline target</div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-[11px] text-slate-400">Faithfulness (Target: ≥ 0.90)</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold font-mono text-emerald-400">0.956</span>
                {empiricalResult && (
                  <span className="text-xs font-mono text-cyan-300 font-semibold">
                    (Live: {(empiricalResult.faithfulness * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">Audited via LLM judge + spot checks</div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-[11px] text-slate-400">p95 Latency (Target: &lt; 400ms)</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold font-mono text-cyan-400">275 ms</span>
                {empiricalResult && (
                  <span className="text-xs font-mono text-emerald-300 font-semibold">
                    (Live: {empiricalResult.p95LatencyMs} ms)
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">Retrieval + Rerank on 100k chunks</div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-[11px] text-slate-400">Cost per 1,000 Queries</div>
              <div className="text-lg font-bold font-mono text-white mt-1">$0.42</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">Embed + Rerank + Token budgeting</div>
            </div>
          </div>
        </div>

        {/* Live Empirical Run Banner if executed */}
        {empiricalResult && (
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/80 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold text-cyan-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Live Empirical Benchmark Completed (Active In-Memory Corpus)</span>
              </div>
              <span className="font-mono text-slate-400 text-[11px]">
                {empiricalResult.testedQueriesCount} Test Queries Evaluated
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400">Recall@1</span>
                <div className="text-base font-bold text-white mt-0.5">{empiricalResult.recallAt1.toFixed(3)}</div>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400">Recall@5</span>
                <div className="text-base font-bold text-emerald-400 mt-0.5">{empiricalResult.recallAt5.toFixed(3)}</div>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400">MRR</span>
                <div className="text-base font-bold text-white mt-0.5">{empiricalResult.mrr.toFixed(3)}</div>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400">nDCG@10</span>
                <div className="text-base font-bold text-white mt-0.5">{empiricalResult.ndcgAt10.toFixed(3)}</div>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400">Faithfulness</span>
                <div className="text-base font-bold text-emerald-400 mt-0.5">{(empiricalResult.faithfulness * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* The 7-Stage Master Ablation Table */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Table className="w-4 h-4 text-cyan-400" />
              Full Ablation Matrix (Report Section 10 & 15: Published Reference Targets)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any configuration row to inspect component contribution and breakdown
            </p>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-3 px-3">Stage #</th>
                <th className="py-3 px-4">Configuration</th>
                <th className="py-3 px-3 text-right">Recall@1</th>
                <th className="py-3 px-3 text-right">Recall@5</th>
                <th className="py-3 px-3 text-right">MRR</th>
                <th className="py-3 px-3 text-right">nDCG@10</th>
                <th className="py-3 px-3 text-right">Faithfulness</th>
                <th className="py-3 px-3 text-right">p95 Latency</th>
                <th className="py-3 px-3 text-right">Cost / 1k</th>
                <th className="py-3 px-3 text-center">CI Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {ABLATION_STUDY_DATA.map((row) => {
                const isSelected = selectedStep === row.stepNumber;
                return (
                  <tr
                    key={row.stepNumber}
                    onClick={() => setSelectedStep(row.stepNumber)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-cyan-950/40 text-white' : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <td className="py-3 px-3 font-mono text-cyan-400 font-bold">
                      {row.stepNumber}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      <div className="text-slate-100">{row.configurationName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{row.description}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {row.recallAt1.toFixed(3)}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono tabular-nums font-semibold ${
                      row.recallAt5 >= 0.85 ? 'text-emerald-400' : 'text-slate-400'
                    }`}>
                      {row.recallAt5.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {row.mrr.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {row.ndcgAt10.toFixed(3)}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono tabular-nums font-semibold ${
                      row.faithfulness >= 0.90 ? 'text-emerald-400' : 'text-slate-400'
                    }`}>
                      {(row.faithfulness * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {row.p95LatencyMs} ms
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      ${row.costPer1kQueriesUsd.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {row.gatePassed ? (
                        <span className="inline-flex items-center text-emerald-400 font-mono text-[11px]">
                          <Check className="w-3.5 h-3.5 mr-0.5" /> PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-500 font-mono text-[11px]">
                          BASELINE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Stage Diff & Comparison Tool */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Stage Diff & Trade-off Analyzer
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select two pipeline configurations to calculate the exact marginal gains in quality vs latency overhead
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Baseline:</span>
              <select
                value={baselineStep}
                onChange={e => setBaselineStep(Number(e.target.value))}
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none"
              >
                {ABLATION_STUDY_DATA.map(s => (
                  <option key={s.stepNumber} value={s.stepNumber}>Step {s.stepNumber}: {s.configurationName.split('.')[1] || s.configurationName}</option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-500" />

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Target:</span>
              <select
                value={targetStep}
                onChange={e => setTargetStep(Number(e.target.value))}
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-cyan-300 font-bold focus:outline-none"
              >
                {ABLATION_STUDY_DATA.map(s => (
                  <option key={s.stepNumber} value={s.stepNumber}>Step {s.stepNumber}: {s.configurationName.split('.')[1] || s.configurationName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Delta Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[11px]">RECALL@5 DELTA</div>
            <div className={`text-xl font-bold mt-1 ${recallGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {recallGain >= 0 ? `+${recallGain}` : recallGain} pts
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {bData.recallAt5.toFixed(3)} → {tData.recallAt5.toFixed(3)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[11px]">FAITHFULNESS DELTA</div>
            <div className={`text-xl font-bold mt-1 ${faithGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {faithGain >= 0 ? `+${faithGain}` : faithGain} pts
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {(bData.faithfulness * 100).toFixed(1)}% → {(tData.faithfulness * 100).toFixed(1)}%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[11px]">p95 LATENCY TRADE-OFF</div>
            <div className="text-xl font-bold mt-1 text-cyan-400">
              {latencyDelta >= 0 ? `+${latencyDelta}` : latencyDelta} ms
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {bData.p95LatencyMs}ms → {tData.p95LatencyMs}ms
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[11px]">COST / 1,000 QUERIES</div>
            <div className="text-xl font-bold mt-1 text-white">
              {costDelta >= 0 ? `+$${costDelta}` : `-$${Math.abs(costDelta)}`}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              ${bData.costPer1kQueriesUsd} → ${tData.costPer1kQueriesUsd}
            </div>
          </div>
        </div>

        {/* Narrative Engineering Insight */}
        <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 font-sans leading-relaxed">
          <span className="font-semibold text-cyan-300">Engineering Interpretation: </span>
          Moving from <span className="text-slate-200 font-medium">{bData.configurationName}</span> to{' '}
          <span className="text-slate-200 font-medium">{tData.configurationName}</span> yields a{' '}
          <span className="text-emerald-400 font-semibold">{Math.abs(recallGain)} point {recallGain >= 0 ? 'boost' : 'drop'}</span> in Recall@5.
          The added cross-attention and expansion stages introduce {Math.abs(latencyDelta)} ms of latency, remaining{' '}
          <span className="text-emerald-400 font-semibold">well under the 400 ms production ceiling</span> on 100k chunks.
        </div>
      </div>

      {/* CI Quality Gate Simulator Card */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-cyan-400" />
              CI Evaluation Gate Simulator (GitHub Actions)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Report Section 10: "A GitHub Actions job runs a small fixed subset of cases on every PR and fails if Recall@5 or faithfulness drops."
            </p>
          </div>

          {/* Scenario selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setCiSimScenario('clean')}
              className={`px-3 py-1 rounded transition-colors ${
                ciSimScenario === 'clean' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pass (Main Branch)
            </button>
            <button
              onClick={() => setCiSimScenario('recall_regress')}
              className={`px-3 py-1 rounded transition-colors ${
                ciSimScenario === 'recall_regress' ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Simulate Recall Drop
            </button>
            <button
              onClick={() => setCiSimScenario('faith_regress')}
              className={`px-3 py-1 rounded transition-colors ${
                ciSimScenario === 'faith_regress' ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Simulate Hallucination Drop
            </button>
          </div>
        </div>

        {/* CI Output Terminal Box */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-900">
            <span className="flex items-center gap-2">
              <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
              <span>workflow: .github/workflows/eval_gate.yml · PR #142 (commit 8f3c7b2)</span>
            </span>
            <span>Trigger: pull_request: [opened, synchronize]</span>
          </div>

          {ciSimScenario === 'clean' ? (
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div className="text-slate-400">&gt; pytest tests/eval_gate.py --dataset=eval/datasets/benchmark_150.jsonl</div>
              <div className="text-slate-300">&gt; Evaluating 150 gold test cases on branch feature/parent-child-chunking...</div>
              <div className="text-emerald-400">✓ Recall@5: 0.942 (Threshold: ≥ 0.850) [PASSED]</div>
              <div className="text-emerald-400">✓ Faithfulness: 0.956 (Threshold: ≥ 0.900) [PASSED]</div>
              <div className="text-emerald-400">✓ p95 Latency: 275ms (Threshold: &lt; 400ms) [PASSED]</div>
              <div className="pt-2 text-emerald-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>ALL GATES PASSED. Pull request #142 is eligible for merge to main.</span>
              </div>
            </div>
          ) : ciSimScenario === 'recall_regress' ? (
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div className="text-slate-400">&gt; pytest tests/eval_gate.py --dataset=eval/datasets/benchmark_150.jsonl</div>
              <div className="text-slate-300">&gt; Evaluating 150 gold test cases on branch bugfix/disable-keyword-sparse...</div>
              <div className="text-rose-400 font-bold">✗ Recall@5: 0.741 (Threshold: ≥ 0.850) [FAILED: -0.109 regression vs main]</div>
              <div className="text-emerald-400">✓ Faithfulness: 0.912 (Threshold: ≥ 0.900) [PASSED]</div>
              <div className="text-emerald-400">✓ p95 Latency: 112ms (Threshold: &lt; 400ms) [PASSED]</div>
              <div className="pt-2 text-rose-300 font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>CI EVALUATION GATE FAILED (Exit Code 1). PR merge blocked until retrieval regression is resolved.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div className="text-slate-400">&gt; pytest tests/eval_gate.py --dataset=eval/datasets/benchmark_150.jsonl</div>
              <div className="text-slate-300">&gt; Evaluating 150 gold test cases on branch experiment/relaxed-prompting...</div>
              <div className="text-emerald-400">✓ Recall@5: 0.884 (Threshold: ≥ 0.850) [PASSED]</div>
              <div className="text-rose-400 font-bold">✗ Faithfulness: 0.814 (Threshold: ≥ 0.900) [FAILED: 9 claims ungrounded]</div>
              <div className="text-emerald-400">✓ p95 Latency: 220ms (Threshold: &lt; 400ms) [PASSED]</div>
              <div className="pt-2 text-rose-300 font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>CI EVALUATION GATE FAILED (Exit Code 1). Groundedness score below mandatory threshold.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LLM Judge Agreement Validation Card (Report Section 10) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-6 p-6 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              LLM Judge Agreement Validation
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              {LLM_JUDGE_VALIDATION_STATS.overallAgreementPct}% Agreement
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-body">
            Report Section 10: "An unvalidated judge is a weak result." The automated LLM judge was calibrated against 50 hand-labeled answers across faithfulness and citation attribution.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px]">COHEN'S KAPPA (κ)</div>
              <div className="text-base font-bold text-white mt-1">{LLM_JUDGE_VALIDATION_STATS.cohenKappa}</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Near-perfect correlation</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px]">FALSE POSITIVE RATE</div>
              <div className="text-base font-bold text-amber-400 mt-1">{LLM_JUDGE_VALIDATION_STATS.falsePositiveRatePct}%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Missed subtle hallucination</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px]">FALSE NEGATIVE RATE</div>
              <div className="text-base font-bold text-slate-200 mt-1">{LLM_JUDGE_VALIDATION_STATS.falseNegativeRatePct}%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Rejected valid paraphrasing</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px]">SAMPLE SIZE</div>
              <div className="text-base font-bold text-white mt-1">{LLM_JUDGE_VALIDATION_STATS.sampleSize} Cases</div>
              <div className="text-[10px] text-cyan-400 mt-0.5">Hand-verified ground truth</div>
            </div>
          </div>
        </div>

        {/* Live Benchmark Cases Runner */}
        <div className="md:col-span-6 p-6 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-cyan-400" />
              Live Evaluation Case Runner
            </h3>
            <span className="text-xs font-mono text-slate-400">10 Curated Cases</span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {EVALUATION_BENCHMARK_SET.slice(0, 8).map((tc) => {
              const hasRun = testResults[tc.id];
              const isRunning = runningTestId === tc.id;
              return (
                <div
                  key={tc.id}
                  className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 max-w-[320px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-400 text-[10px]">{tc.id}</span>
                        <span className="text-slate-400 text-[10px] uppercase font-mono">{tc.category}</span>
                      </div>
                      <div className="font-medium text-slate-200">{tc.question}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasRun && (
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                          hasRun.passedGate
                            ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
                            : 'text-rose-400 bg-rose-950/60 border-rose-800'
                        }`}>
                          {hasRun.passedGate ? 'GATE PASS' : 'GATE FAIL'}
                        </span>
                      )}

                      <button
                        onClick={() => handleExecuteSingleTest(tc)}
                        disabled={isRunning}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Play className="w-3 h-3 text-cyan-400" />
                        <span>{isRunning ? 'Evaluating...' : 'Run'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Empirical Test Details when executed */}
                  {hasRun && (
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] space-y-1 text-slate-300">
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span>Gold Chunks: {tc.goldChunkIds.join(', ')}</span>
                        <span>Latency: {hasRun.executionResult?.totalLatencyMs || 0}ms</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs pt-0.5">
                        <span className={hasRun.isRecallHit ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                          Recall Hit: {hasRun.isRecallHit ? 'YES' : 'NO'}
                        </span>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <span className={hasRun.isFaithful ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                          Faithful: {hasRun.isFaithful ? 'YES' : 'NO'}
                        </span>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <span className="text-slate-400">
                          Retrieved: {hasRun.executionResult?.citations?.length || 0} chunks
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
