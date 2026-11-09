// ============================================================================
// SneakyToS — 9-Stage Analysis Pipeline Monitor
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Loader2,
  Terminal,
  ArrowRight,
  Shield,
} from 'lucide-react';

interface Stage {
  num: number;
  id: string;
  label: string;
  detail: string;
  status: 'pending' | 'running' | 'completed';
}

const pipelineStages: Stage[] = [
  { num: 1, id: 'ingestion', label: 'Document Ingestion', detail: 'Validating PDF bitstreams and in-memory ephemeral RAM sandbox', status: 'completed' },
  { num: 2, id: 'cleaning', label: 'Text Extraction & Cleaning', detail: 'Running OCR normalization and stripping redundant running headers', status: 'completed' },
  { num: 3, id: 'segmentation', label: 'Clause Segmentation', detail: 'Decomposing legal instruments into discrete verifiable clauses', status: 'running' },
  { num: 4, id: 'alignment', label: 'Semantic Clause Alignment', detail: 'Cosine similarity matching across 2,740 total clause vectors', status: 'pending' },
  { num: 5, id: 'event_detection', label: 'Change Event Detection', detail: 'Detecting ADDED, MODIFIED, and DELETED structural deltas', status: 'pending' },
  { num: 6, id: 'validity', label: 'Event Validity Verification', detail: 'Filtering fragments, contaminated clauses, and heading-only edits', status: 'pending' },
  { num: 7, id: 'impact', label: 'Privacy Impact Classification', detail: 'Fine-tuned NLI classifying PRIVACY_WORSE vs PRIVACY_BETTER', status: 'pending' },
  { num: 8, id: 'explanation', label: 'Explanation Generation', detail: 'Synthesizing plain-English forensic findings and AI summaries', status: 'pending' },
  { num: 9, id: 'report', label: 'Report Preparation', detail: 'Compiling redline visualizer and discrepancy ledger', status: 'pending' },
];

const mockTerminalLogs = [
  '[00:00.08] PIPELINE_START: Target "OmniCloud Global Ltd." (v3.2 baseline vs v4.0 revision)',
  '[00:00.22] INGEST: Allocated 3.5 MB in-memory volatile sandbox (Zero-Store active)',
  '[00:00.54] CLEAN: Stripped running headers, footers, and pagination artifacts',
  '[00:00.91] SEGMENT: Extracted 1,328 clauses from v3.2 and 1,412 clauses from v4.0',
  '[00:01.35] ALIGN: Bi-encoder cosine matrix computed. 99.4% syntactic baseline alignment',
  '[00:01.80] DELTA: Detected 14 discrepancies: 4 ADDED, 7 MODIFIED, 3 DELETED',
  '[00:02.15] VALIDITY: Audited event boundaries: 13 VALID events, 1 HEADING_ONLY format edit',
  '[00:02.60] NLI_CLASSIFY: Section 4.2 evaluated -> PRIVACY_WORSE (Ad Syndicate Expansion)',
  '[00:02.95] NLI_CLASSIFY: Section 9.1 evaluated -> PRIVACY_WORSE (Perpetual AI Weight Retention)',
  '[00:03.20] NLI_CLASSIFY: Section 12.4 evaluated -> PRIVACY_BETTER (Biometric Immunity Disclaimed)',
  '[00:03.50] NLI_CLASSIFY: Section 7.3 evaluated -> UNCLEAR (Subjective 90-day retention dilution)',
  '[00:03.85] EXPLAIN: Generated legal findings and strategic mitigation briefs',
  '[00:04.10] SYNTHESIS_COMPLETE: Redline diff and discrepancy ledger ready for workspace view',
];

export function AnalysisProgress() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [currentStageIdx, setCurrentStageIdx] = useState(2); // starts at stage 3
  const [stages, setStages] = useState<Stage[]>(pipelineStages);
  const [logs, setLogs] = useState<string[]>([mockTerminalLogs[0], mockTerminalLogs[1], mockTerminalLogs[2], mockTerminalLogs[3]]);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStageIdx((prev) => {
        const next = prev + 1;
        if (next >= pipelineStages.length) {
          clearInterval(timer);
          setIsDone(true);
          return pipelineStages.length - 1;
        }
        return next;
      });
    }, 600);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setStages((curr) =>
      curr.map((stage, idx) => {
        if (idx < currentStageIdx || (isDone && idx === currentStageIdx)) {
          return { ...stage, status: 'completed' };
        } else if (idx === currentStageIdx && !isDone) {
          return { ...stage, status: 'running' };
        } else {
          return { ...stage, status: 'pending' };
        }
      })
    );

    const logCount = Math.min(mockTerminalLogs.length, currentStageIdx + 4);
    setLogs(mockTerminalLogs.slice(0, logCount));
  }, [currentStageIdx, isDone]);

  const targetComparisonId = id || 'comp-omnicloud-v3-v4';

  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / stages.length) * 100);

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface tactical-mesh p-6 md:p-10 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary shadow-sm">
              <Shield className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-badge text-[10px] text-tertiary font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-tertiary-container/20 border border-tertiary/30">
                  {isDone ? 'ANALYSIS FINALIZED' : 'PROCESSING PIPELINE ACTIVE'}
                </span>
                <span className="text-outline text-xs">• 9-Stage Engine</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-semibold text-on-surface mt-1">
                Forensic Clause Diff Execution
              </h1>
              <p className="text-xs text-on-surface-variant font-mono-code mt-0.5">
                Target: OmniCloud Global Ltd. (v3.2 Baseline vs v4.0 Revision)
              </p>
            </div>
          </div>

          {isDone && (
            <button
              type="button"
              onClick={() => navigate(`/comparison/${targetComparisonId}`)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-container via-primary to-inverse-primary text-on-primary-container font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all glow-primary shadow-lg cursor-pointer"
            >
              <span>Open Comparison Workspace</span>
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>

        {/* Real Progress Metrics Bar */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-xs font-mono-badge">
            <span className="text-on-surface-variant">
              Stage {Math.min(currentStageIdx + 1, 9)} of 9:{' '}
              <strong className="text-on-surface">{stages[currentStageIdx]?.label}</strong>
            </span>
            <span className="text-primary font-bold">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-surface-container-lowest rounded-full overflow-hidden border border-outline-variant/40">
            <div
              className="h-full bg-gradient-to-r from-primary-container via-primary to-tertiary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 9 Stages Grid & Terminal Monitor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 9 Stages Breakdown (7 cols) */}
          <div className="lg:col-span-7 bg-surface-container rounded-xl border border-outline-variant p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <span className="text-xs font-mono-badge text-on-surface-variant font-semibold uppercase tracking-wider">
                Pipeline Stage Progression
              </span>
              <span className="font-mono-code text-[11px] text-outline">
                {completedCount}/9 Completed
              </span>
            </div>

            <div className="space-y-2">
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                    stage.status === 'running'
                      ? 'bg-surface-container-highest border-primary/50 text-on-surface'
                      : stage.status === 'completed'
                      ? 'bg-surface-container-low border-outline-variant/60 text-on-surface-variant'
                      : 'bg-surface-container-lowest/40 border-outline-variant/30 text-outline opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-6 rounded-full flex items-center justify-center shrink-0">
                      {stage.status === 'completed' && (
                        <CheckCircle2 className="size-4 text-tertiary" />
                      )}
                      {stage.status === 'running' && (
                        <Loader2 className="size-4 text-primary animate-spin" />
                      )}
                      {stage.status === 'pending' && (
                        <span className="font-mono-badge text-[10px] text-outline">
                          0{stage.num}
                        </span>
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium truncate">
                        {stage.num}. {stage.label}
                      </div>
                      <div className="text-[11px] text-outline truncate">{stage.detail}</div>
                    </div>
                  </div>

                  <span
                    className={`font-mono-badge text-[9.5px] uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                      stage.status === 'completed'
                        ? 'text-tertiary bg-tertiary-container/20 border-tertiary/30'
                        : stage.status === 'running'
                        ? 'text-primary bg-primary/10 border-primary/30 animate-pulse'
                        : 'text-outline bg-surface-container border-outline-variant'
                    }`}
                  >
                    {stage.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal Console (5 cols) */}
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl border border-outline-variant p-5 flex flex-col justify-between font-mono-code text-xs shadow-inner">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant mb-3">
              <div className="flex items-center gap-2 text-outline">
                <Terminal className="size-4 text-primary" />
                <span>diff_engine_stdout.log</span>
              </div>
              <span className="size-2 rounded-full bg-tertiary animate-pulse" />
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-96 pr-2 text-on-surface-variant text-[11px] leading-relaxed">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={
                    log.includes('PRIVACY_WORSE')
                      ? 'text-error font-semibold'
                      : log.includes('PRIVACY_BETTER')
                      ? 'text-tertiary font-semibold'
                      : log.includes('COMPLETE')
                      ? 'text-primary font-bold'
                      : 'text-outline'
                  }
                >
                  {log}
                </div>
              ))}
              {!isDone && (
                <div className="text-primary animate-pulse flex items-center gap-1.5 pt-1">
                  <span className="inline-block w-2 h-4 bg-primary" />
                  <span>computing semantic embeddings...</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-outline-variant mt-3 text-outline text-[10.5px] flex justify-between">
              <span>RAM Sandbox: Ephemeral</span>
              <span>Tokens: 14,820</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-outline font-mono-code pt-8">
        SneakyToS Automated Policy Engine · Client-Ephemeral Processing
      </div>
    </div>
  );
}

export default AnalysisProgress;
