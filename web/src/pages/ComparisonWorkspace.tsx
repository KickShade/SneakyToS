// ============================================================================
// SneakyToS — Document Comparison Workspace
// Source of Truth: Google Stitch Screen 47865f28f8c94ee49603b4deaebea2e1
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  X,
  Link as LinkIcon,
  Unlink,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  FileDown,
} from 'lucide-react';
import { mockDetailedComparison } from '@/services/mockData';

export function ComparisonWorkspace() {
  const navigate = useNavigate();
  const comparison = mockDetailedComparison;
  const changes = comparison.changes;

  const [selectedChangeId, setSelectedChangeId] = useState<string>('change-001');
  const [syncScroll, setSyncScroll] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [filterImpact, setFilterImpact] = useState<'all' | 'worse' | 'better' | 'unclear'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dual scroll container refs
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<'left' | 'right' | null>(null);

  // Synchronized scrolling
  const handleLeftScroll = () => {
    if (!syncScroll || isScrollingRef.current === 'right') return;
    isScrollingRef.current = 'left';
    if (leftScrollRef.current && rightScrollRef.current) {
      const percentage =
        leftScrollRef.current.scrollTop /
        (leftScrollRef.current.scrollHeight - leftScrollRef.current.clientHeight || 1);
      rightScrollRef.current.scrollTop =
        percentage * (rightScrollRef.current.scrollHeight - rightScrollRef.current.clientHeight);
    }
    setTimeout(() => {
      isScrollingRef.current = null;
    }, 40);
  };

  const handleRightScroll = () => {
    if (!syncScroll || isScrollingRef.current === 'left') return;
    isScrollingRef.current = 'right';
    if (leftScrollRef.current && rightScrollRef.current) {
      const percentage =
        rightScrollRef.current.scrollTop /
        (rightScrollRef.current.scrollHeight - rightScrollRef.current.clientHeight || 1);
      leftScrollRef.current.scrollTop =
        percentage * (leftScrollRef.current.scrollHeight - leftScrollRef.current.clientHeight);
    }
    setTimeout(() => {
      isScrollingRef.current = null;
    }, 40);
  };

  // Scroll to selected change automatically
  useEffect(() => {
    const leftTarget = document.getElementById(`diff-left-${selectedChangeId}`);
    const rightTarget = document.getElementById(`diff-right-${selectedChangeId}`);

    if (leftTarget && leftScrollRef.current) {
      leftTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (rightTarget && rightScrollRef.current) {
      rightTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedChangeId]);

  // Filtered change list
  const filteredChanges = changes.filter((c) => {
    if (filterImpact === 'worse' && c.privacyImpact !== 'PRIVACY_WORSE') return false;
    if (filterImpact === 'better' && c.privacyImpact !== 'PRIVACY_BETTER') return false;
    if (filterImpact === 'unclear' && c.privacyImpact !== 'UNCLEAR') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inText = (c.oldText + ' ' + c.newText + ' ' + c.explanation + ' ' + (c.sectionNew || '')).toLowerCase();
      if (!inText.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="bg-background text-on-surface antialiased overflow-hidden h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      {/* ─────────────────────────────────────────────────────────────
          1. Minimalist Top App Bar & Audit Context (Stitch Header)
         ───────────────────────────────────────────────────────────── */}
      <header className="h-14 w-full z-20 bg-surface-container-lowest border-b border-outline-variant px-5 flex items-center justify-between shrink-0">
        {/* Left: Breadcrumbs & Status Capsule */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 text-on-surface-variant font-body text-xs min-w-0 select-none">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Shield className="size-4 text-primary" />
              <span>Audits</span>
            </button>
            <span className="text-outline-variant/80">/</span>
            <span className="hover:text-on-surface transition-colors">{comparison.companyName}</span>
            <span className="text-outline-variant/80">/</span>
            <span className="text-on-surface font-semibold truncate max-w-xs md:max-w-sm flex items-center gap-1.5 text-primary">
              v3.2 vs v4.0 Redline
            </span>
          </div>

          <div className="h-4 w-px bg-outline-variant/60 mx-1 hidden lg:block" />

          {/* Live Status Capsule */}
          <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container-high/90 border border-outline-variant shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
            </span>
            <span className="font-mono-badge text-[10px] text-tertiary font-medium tracking-wide uppercase">
              Audit Ready
            </span>
            <span className="text-outline-variant text-[10px]">•</span>
            <span className="font-mono-badge text-[10px] text-on-surface-variant">
              {comparison.totalChanges} Discrepancies
            </span>
          </div>
        </div>

        {/* Right: Search, Split View Toggle, Export, Close */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search box */}
          <div className="relative hidden xl:block">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clause text (⌘K)..."
              className="h-8 pl-8 pr-3 w-56 rounded-lg bg-surface-container border border-outline-variant text-on-surface placeholder:text-outline font-body text-xs focus:border-primary focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* View Mode Segmented */}
          <div className="hidden lg:flex items-center p-0.5 rounded-lg bg-surface-container border border-outline-variant text-xs">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 text-[11px] transition-colors ${
                viewMode === 'split'
                  ? 'bg-surface-container-highest text-primary font-medium shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Split View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 text-[11px] transition-colors ${
                viewMode === 'unified'
                  ? 'bg-surface-container-highest text-primary font-medium shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Unified</span>
            </button>
          </div>

          <div className="h-4 w-px bg-outline-variant/60 mx-0.5 hidden sm:block" />

          {/* Export Button */}
          <button
            type="button"
            onClick={() => navigate(`/comparison/${comparison.id}/privacy-report`)}
            className="h-8 px-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-body text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <FileDown className="size-3.5 text-primary" />
            <span>Export Audit</span>
            <span className="font-mono-badge text-[9.5px] text-primary px-1 py-0.2 rounded bg-primary/10 border border-primary/25 font-semibold">
              PDF
            </span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-8 w-8 rounded-lg border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all cursor-pointer"
            title="Return to Homepage"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. Three-Part Centerpiece Workspace (Stitch Columns)
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden w-full relative">
        {viewMode === 'split' ? (
          <>
            {/* ── COLUMN 1 (40% width): ORIGINAL POLICY (OLD) ── */}
            <section className="w-[40%] flex flex-col border-r border-outline-variant bg-surface-container-lowest/60 relative">
              {/* Sub-Header */}
              <div className="h-10 px-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-2 rounded-full bg-error ring-2 ring-error/20 shrink-0" />
                  <span className="font-mono-badge text-[10px] uppercase tracking-wider text-error font-bold px-1 py-0.2 rounded bg-error-container/20 border border-error/30 shrink-0">
                    ORIGINAL (OLD)
                  </span>
                  <span className="text-outline-variant/60">|</span>
                  <div className="flex items-center gap-1.5 truncate text-xs">
                    <span className="font-body text-on-surface font-semibold truncate">
                      OmniCloud Terms v3.2
                    </span>
                    <span className="text-on-surface-variant font-mono-badge text-[10.5px] px-1.5 py-0.2 rounded bg-surface-container-highest border border-outline-variant/60">
                      14 Nov 2023
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs shrink-0">
                  <div className="flex items-center gap-1 bg-surface-container-highest/80 rounded px-1.5 py-0.5 border border-outline-variant shadow-sm text-outline">
                    <span className="font-mono-code text-[10.5px]">P. 04 / 18</span>
                  </div>
                  {/* Synchronized Scroll Lock Button */}
                  <button
                    type="button"
                    onClick={() => setSyncScroll(!syncScroll)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] border transition-all shadow-sm cursor-pointer ${
                      syncScroll
                        ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                        : 'bg-surface-container border-outline-variant text-outline'
                    }`}
                    title={syncScroll ? 'Synchronized Scrolling Locked' : 'Synchronized Scrolling Off'}
                  >
                    {syncScroll ? <LinkIcon className="size-3" /> : <Unlink className="size-3" />}
                    <span className="font-mono-badge text-[9.5px] font-semibold tracking-wide">
                      {syncScroll ? 'LOCKED' : 'OFF'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Original Document Content Pane */}
              <div
                ref={leftScrollRef}
                onScroll={handleLeftScroll}
                className="flex-1 overflow-y-auto custom-scroll p-4 space-y-5 text-on-surface bg-background/50"
              >
                {/* Clause Item: Section 4.2 */}
                <article
                  id="diff-left-change-001"
                  onClick={() => setSelectedChangeId('change-001')}
                  className={`relative pl-8 pt-1 rounded-lg p-2.5 transition-all border cursor-pointer ${
                    selectedChangeId === 'change-001'
                      ? 'border-error/80 bg-error-container/10 ring-1 ring-error/40'
                      : 'border-transparent hover:border-outline-variant/40 hover:bg-surface-container/30'
                  }`}
                >
                  <span className="absolute left-1.5 top-2.5 font-mono-badge text-[10px] text-error bg-error-container/30 font-semibold px-1.5 py-0.5 rounded border border-error/50 shadow-sm">
                    #001
                  </span>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <span>Section 4.2</span>
                      <span className="text-outline-variant">·</span>
                      <span className="text-on-surface-variant font-normal">
                        Third-Party Data Disclosures & Behavioral Syndication
                      </span>
                    </h3>
                    <span className="font-mono-gutter text-[10.5px] text-outline bg-surface-container px-1 py-0.2 rounded border border-outline-variant/60">
                      LN 248–261
                    </span>
                  </div>
                  <p className="font-clause-diff text-[13px] text-on-surface-variant leading-relaxed">
                    In the course of providing real-time infrastructure metrics and cloud analytics services, OmniCloud may collect edge diagnostic signals, machine telemetry, and authenticated workspace identifiers.
                  </p>
                  {/* Deleted Clause Highlight */}
                  <div className="mt-2.5 p-3 rounded-md bg-error-container/15 border-l-[3px] border-error text-error font-clause-diff text-[13px] leading-relaxed relative border border-error/25 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-badge text-[9px] uppercase tracking-wider text-error bg-error-container/40 px-1.5 py-0.5 rounded font-bold border border-error/40">
                        REMOVED IN V4.0
                      </span>
                      <span className="font-mono-badge text-[9px] text-error/70 font-mono-code">
                        Strict Opt-In Safeguard
                      </span>
                    </div>
                    <del className="line-through decoration-error text-error/95 block font-normal">
                      "We will not sell, rent, or distribute your personal usage data to third-party marketing entities without explicit opt-in user consent and verified corporate cryptographic key approval."
                    </del>
                  </div>
                  <p className="mt-2.5 font-clause-diff text-[13px] text-on-surface-variant leading-relaxed">
                    Such access is strictly governed by zero-trust identity envelopes and logged under audited access records retained for standard compliance cycles.
                  </p>
                </article>

                <hr className="border-outline-variant/40 my-3" />

                {/* Clause Item: Section 7.3 */}
                <article
                  id="diff-left-change-004"
                  onClick={() => setSelectedChangeId('change-004')}
                  className={`relative pl-8 pt-1 rounded-lg p-2.5 transition-all border cursor-pointer ${
                    selectedChangeId === 'change-004'
                      ? 'border-amber-400/80 bg-amber-950/20 ring-1 ring-amber-400/40'
                      : 'border-transparent hover:border-outline-variant/40 hover:bg-surface-container/30'
                  }`}
                >
                  <span className="absolute left-1.5 top-2.5 font-mono-badge text-[10px] text-amber-400 bg-amber-950/40 font-semibold px-1.5 py-0.5 rounded border border-amber-500/50 shadow-sm">
                    #004
                  </span>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <span>Section 7.3</span>
                      <span className="text-outline-variant">·</span>
                      <span className="text-on-surface-variant font-normal">
                        Data Retention & Log Maintenance Protocols
                      </span>
                    </h3>
                    <span className="font-mono-gutter text-[10.5px] text-outline bg-surface-container px-1 py-0.2 rounded border border-outline-variant/60">
                      LN 312–329
                    </span>
                  </div>
                  <p className="font-clause-diff text-[13px] text-on-surface-variant leading-relaxed">
                    Aggregated ingress payloads, cluster activity ledgers, and API transactional histories are persisted within isolated storage nodes according to deterministic retention timetables.
                  </p>
                  {/* Superseded Phrasing */}
                  <div className="mt-2.5 p-3 rounded-md bg-amber-950/20 border-l-[3px] border-amber-400 text-amber-200 font-clause-diff text-[13px] leading-relaxed border border-amber-500/30 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-badge text-[9px] uppercase tracking-wider text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded font-bold border border-amber-400/40">
                        SUPERSEDED PHRASING
                      </span>
                      <span className="font-mono-badge text-[9px] text-amber-300/70 font-mono-code">
                        90-Day Fixed Window
                      </span>
                    </div>
                    <span className="line-through decoration-amber-400/80 text-amber-200/90 block">
                      "All customer operational raw telemetry and authentication breadcrumbs shall be definitively expunged within an immutable ninety (90) calendar day rollover cycle."
                    </span>
                  </div>
                </article>

                <hr className="border-outline-variant/40 my-3" />

                {/* Clause Item: Section 9.1 */}
                <article
                  id="diff-left-change-002"
                  onClick={() => setSelectedChangeId('change-002')}
                  className={`relative pl-8 pt-1 rounded-lg p-2.5 transition-all border cursor-pointer ${
                    selectedChangeId === 'change-002'
                      ? 'border-error/80 bg-error-container/10 ring-1 ring-error/40'
                      : 'border-transparent hover:border-outline-variant/40 hover:bg-surface-container/30'
                  }`}
                >
                  <span className="absolute left-1.5 top-2.5 font-mono-badge text-[10px] text-error bg-error-container/30 font-semibold px-1.5 py-0.5 rounded border border-error/50 shadow-sm">
                    #002
                  </span>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <span>Section 9.1</span>
                      <span className="text-outline-variant">·</span>
                      <span className="text-on-surface-variant font-normal">
                        User Rights, Subject Access, and System Erasure
                      </span>
                    </h3>
                    <span className="font-mono-gutter text-[10.5px] text-outline bg-surface-container px-1 py-0.2 rounded border border-outline-variant/60">
                      LN 402–418
                    </span>
                  </div>
                  <p className="font-clause-diff text-[13px] text-on-surface-variant leading-relaxed">
                    Authorized tenant administrators retain statutory prerogatives to trigger Article 17 GDPR erasure directives across production databases.
                  </p>
                  <div className="mt-2.5 p-3 rounded-md bg-error-container/15 border-l-[3px] border-error text-error/95 font-clause-diff text-[13px] leading-relaxed border border-error/25 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-badge text-[9px] uppercase tracking-wider text-error bg-error-container/40 px-1.5 py-0.5 rounded font-bold border border-error/40">
                        FORMER UNCONDITIONAL PURGE
                      </span>
                      <span className="font-mono-badge text-[9px] text-error/70 font-mono-code">
                        GDPR Full Compliance
                      </span>
                    </div>
                    <span className="line-through decoration-error/70 text-error/90 block">
                      "Upon verified receipt of an erasure demand, OmniCloud executes complete algorithmic purging across both primary persistent stores and derived analytical indices without persistent residual trace."
                    </span>
                  </div>
                </article>

                <hr className="border-outline-variant/40 my-3" />

                {/* Clause Item: Section 12.4 */}
                <article
                  id="diff-left-change-003"
                  onClick={() => setSelectedChangeId('change-003')}
                  className="relative pl-8 pt-1 rounded-lg p-2.5 transition-all border border-transparent hover:border-outline-variant/40"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <span>Section 12.4</span>
                      <span className="text-outline-variant">·</span>
                      <span className="text-on-surface-variant font-normal">
                        Hardware Identifiers and Perceptual Metrics
                      </span>
                    </h3>
                    <span className="font-mono-gutter text-[10.5px] text-outline bg-surface-container px-1 py-0.2 rounded border border-outline-variant/60">
                      LN 580–592
                    </span>
                  </div>
                  <p className="font-clause-diff text-[13px] text-on-surface-variant leading-relaxed">
                    Workstation agents monitor CPU core thermal metrics, RAM saturation, and thread scheduling latencies to allocate dynamic edge routing shards safely.
                  </p>
                  <div className="mt-2.5 p-2.5 rounded-md bg-surface-container-highest/40 border border-dashed border-outline-variant text-on-surface-variant/80 font-mono-code text-[11px]">
                    No biometric exclusion clause existed in v3.2. Explicit clause introduced in v4.0 (Ref #003).
                  </div>
                </article>
              </div>
            </section>

            {/* ── COLUMN 2 (40% width): REVISED POLICY (NEW) ── */}
            <section className="w-[40%] flex flex-col border-r border-outline-variant bg-surface-container-lowest/60 relative">
              {/* Sub-Header */}
              <div className="h-10 px-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-2 rounded-full bg-tertiary ring-2 ring-tertiary/20 shrink-0" />
                  <span className="font-mono-badge text-[10px] uppercase tracking-wider text-tertiary font-bold px-1 py-0.2 rounded bg-tertiary-container/20 border border-tertiary/30 shrink-0">
                    REVISED (NEW)
                  </span>
                  <span className="text-outline-variant/60">|</span>
                  <div className="flex items-center gap-1.5 truncate text-xs">
                    <span className="font-body text-on-surface font-semibold truncate">
                      OmniCloud Terms v4.0
                    </span>
                    <span className="text-on-surface-variant font-mono-badge text-[10.5px] px-1.5 py-0.2 rounded bg-surface-container-highest border border-outline-variant/60">
                      15 Jan 2025
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs shrink-0">
                  <div className="flex items-center gap-1 bg-surface-container-highest/80 rounded px-1.5 py-0.5 border border-outline-variant shadow-sm text-outline">
                    <span className="font-mono-code text-[10.5px]">P. 04 / 18</span>
                  </div>
                  {/* Accuracy Badge */}
                  <span className="px-2 py-0.5 rounded text-[10px] bg-tertiary-container/15 text-tertiary font-mono-badge font-semibold border border-tertiary/30 flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="size-3" />
                    <span>Aligned: 99.4%</span>
                  </span>
                </div>
              </div>

              {/* Revised Document Content Pane */}
              <div
                ref={rightScrollRef}
                onScroll={handleRightScroll}
                className="flex-1 overflow-y-auto custom-scroll p-4 space-y-5 text-on-surface bg-background/50"
              >
                {/* Clause Item: Section 4.2 */}
                <article
                  id="diff-right-change-001"
                  onClick={() => setSelectedChangeId('change-001')}
                  className={`relative pl-8 pt-1 rounded-lg p-2.5 transition-all border cursor-pointer ${
                    selectedChangeId === 'change-001'
                      ? 'border-error/80 bg-error-container/10 ring-1 ring-error/40'
                      : 'border-transparent hover:border-outline-variant/40 hover:bg-surface-container/30'
                  }`}
                >
                  <span className="absolute left-1.5 top-2.5 font-mono-badge text-[10px] text-error bg-error-container/30 font-semibold px-1.5 py-0.5 rounded border border-error/50 shadow-sm">
                    #001
                  </span>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <span>Section 4.2</span>
                      <span className="text-outline-variant">·</span>
                      <span className="text-on-surface-variant font-normal">
                        Third-Party Data Disclosures & Behavioral Syndication
                      </span>
                    </h3>
                    <span className="font-mono-gutter text-[10.5px] text-outline bg-surface-container px-1 py-0.2 rounded border border-outline-variant/60">
                      LN 248–266
                    </span>
                  </div>
                  <p className="font-clause-diff text-[13px] text-on-surface-variant leading-relaxed">
                    In the course of providing real-time infrastructure metrics and cloud analytics services, OmniCloud may collect edge diagnostic signals, machine telemetry, and authenticated workspace identifiers.
                  </p>
                  {/* Added Weakened Clause Highlight */}
                  <div className="mt-2.5 p-3 rounded-md bg-tertiary-container/15 border-l-[3px] border-tertiary text-on-surface font-clause-diff text-[13px] leading-relaxed relative border border-tertiary/25 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-badge text-[9px] uppercase tracking-wider text-tertiary bg-tertiary-container/30 px-1.5 py-0.5 rounded font-bold border border-tertiary/30">
                        NEW PROVISION IN V4.0
                      </span>
                      <span className="font-mono-badge text-[9px] text-error font-mono-code font-semibold">
                        Ad Syndicate Expansion
                      </span>
                    </div>
                    <span className="bg-tertiary/15 text-white font-medium underline decoration-tertiary/60 block px-1 py-0.5 rounded">
                      "We may share pseudonymized behavioral telemetry and device fingerprints with authorized advertising partners to optimize targeted brand delivery, unless prohibited by applicable local jurisdiction."
                    </span>
                  </div>
                  <p className="mt-2.5 font-clause-diff text-[13px] text-on-surface-variant leading-relaxed">
                    Such access is strictly governed by zero-trust identity envelopes and logged under audited access records retained for standard compliance cycles.
                  </p>
                </article>

                <hr className="border-outline-variant/40 my-3" />

                {/* Clause Item: Section 7.3 */}
                <article
                  id="diff-right-change-004"
                  onClick={() => setSelectedChangeId('change-004')}
                  className={`relative pl-8 pt-1 rounded-lg p-2.5 transition-all border cursor-pointer ${
                    selectedChangeId === 'change-004'
                      ? 'border-amber-400/80 bg-amber-950/20 ring-1 ring-amber-400/40'
                      : 'border-transparent hover:border-outline-variant/40 hover:bg-surface-container/30'
                  }`}
                >
                  <span className="absolute left-1.5 top-2.5 font-mono-badge text-[10px] text-amber-400 bg-amber-950/40 font-semibold px-1.5 py-0.5 rounded border border-amber-500/50 shadow-sm">
                    #004
                  </span>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <span>Section 7.3</span>
                      <span className="text-outline-variant">·</span>
                      <span className="text-on-surface-variant font-normal">
                        Data Retention & Log Maintenance Protocols
                      </span>
                    </h3>
                    <span className="font-mono-gutter text-[10.5px] text-outline bg-surface-container px-1 py-0.2 rounded border border-outline-variant/60">
                      LN 318–334
                    </span>
                  </div>
                  <p className="font-clause-diff text-[13px] text-on-surface-variant leading-relaxed">
                    Aggregated ingress payloads, cluster activity ledgers, and API transactional histories are persisted within isolated storage nodes according to deterministic retention timetables.
                  </p>
                  {/* Revised Ambiguous Phrasing */}
                  <div className="mt-2.5 p-3 rounded-md bg-amber-950/20 border-l-[3px] border-amber-400 text-amber-200 font-clause-diff text-[13px] leading-relaxed border border-amber-500/30 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-badge text-[9px] uppercase tracking-wider text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded font-bold border border-amber-400/40">
                        REWORDED CLAUSE
                      </span>
                      <span className="font-mono-badge text-[9px] text-amber-300 font-mono-code">
                        Subjective Retention
                      </span>
                    </div>
                    <span className="bg-amber-500/10 px-1 py-0.5 rounded text-amber-200 font-medium block">
                      "Customer operational telemetry and access records are maintained for as long as deemed commercially reasonable and necessary to sustain analytical diagnostic pipelines."
                    </span>
                  </div>
                </article>

                <hr className="border-outline-variant/40 my-3" />

                {/* Clause Item: Section 9.1 */}
                <article
                  id="diff-right-change-002"
                  onClick={() => setSelectedChangeId('change-002')}
                  className={`relative pl-8 pt-1 rounded-lg p-2.5 transition-all border cursor-pointer ${
                    selectedChangeId === 'change-002'
                      ? 'border-error/80 bg-error-container/10 ring-1 ring-error/40'
                      : 'border-transparent hover:border-outline-variant/40 hover:bg-surface-container/30'
                  }`}
                >
                  <span className="absolute left-1.5 top-2.5 font-mono-badge text-[10px] text-error bg-error-container/30 font-semibold px-1.5 py-0.5 rounded border border-error/50 shadow-sm">
                    #002
                  </span>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <span>Section 9.1</span>
                      <span className="text-outline-variant">·</span>
                      <span className="text-on-surface-variant font-normal">
                        User Rights, Subject Access, and System Erasure
                      </span>
                    </h3>
                    <span className="font-mono-gutter text-[10.5px] text-outline bg-surface-container px-1 py-0.2 rounded border border-outline-variant/60">
                      LN 408–430
                    </span>
                  </div>
                  <p className="font-clause-diff text-[13px] text-on-surface-variant leading-relaxed">
                    Authorized tenant administrators retain statutory prerogatives to trigger Article 17 GDPR erasure directives across production databases.
                  </p>
                  <div className="mt-2.5 p-3 rounded-md bg-error-container/20 border-l-[3px] border-error text-error/95 font-clause-diff text-[13px] leading-relaxed border border-error/30 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-badge text-[9px] uppercase tracking-wider text-error bg-error-container/40 px-1.5 py-0.5 rounded font-bold border border-error/40">
                        RETENTION CARVE-OUT
                      </span>
                      <span className="font-mono-badge text-[9px] text-error font-mono-code font-bold">
                        Perpetual AI Weight Retention
                      </span>
                    </div>
                    <span className="block">
                      "Erasure workflows target user identifiers within relational tables; however,{' '}
                      <span className="bg-error/25 text-white font-medium underline decoration-error px-1 py-0.2 rounded">
                        aggregate analytical embeddings and model training weights derived from prior historical sessions remain perpetually retained
                      </span>{' '}
                      to safeguard foundational neural baseline integrity."
                    </span>
                  </div>
                </article>

                <hr className="border-outline-variant/40 my-3" />

                {/* Clause Item: Section 12.4 */}
                <article
                  id="diff-right-change-003"
                  onClick={() => setSelectedChangeId('change-003')}
                  className={`relative pl-8 pt-1 rounded-lg p-2.5 transition-all border cursor-pointer ${
                    selectedChangeId === 'change-003'
                      ? 'border-tertiary/80 bg-tertiary-container/10 ring-1 ring-tertiary/40'
                      : 'border-transparent hover:border-outline-variant/40 hover:bg-surface-container/30'
                  }`}
                >
                  <span className="absolute left-1.5 top-2.5 font-mono-badge text-[10px] text-tertiary bg-tertiary-container/30 font-semibold px-1.5 py-0.5 rounded border border-tertiary/50 shadow-sm">
                    #003
                  </span>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <span>Section 12.4</span>
                      <span className="text-outline-variant">·</span>
                      <span className="text-on-surface-variant font-normal">
                        Hardware Identifiers and Perceptual Metrics
                      </span>
                    </h3>
                    <span className="font-mono-gutter text-[10.5px] text-outline bg-surface-container px-1 py-0.2 rounded border border-outline-variant/60">
                      LN 595–612
                    </span>
                  </div>
                  <p className="font-clause-diff text-[13px] text-on-surface-variant leading-relaxed">
                    Workstation agents monitor CPU core thermal metrics, RAM saturation, and thread scheduling latencies to allocate dynamic edge routing shards safely.
                  </p>
                  <div className="mt-2.5 p-3 rounded-md bg-tertiary-container/20 border-l-[3px] border-tertiary text-tertiary font-clause-diff text-[13px] leading-relaxed border border-tertiary/30 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-badge text-[9px] uppercase tracking-wider text-tertiary bg-tertiary-container/40 px-1.5 py-0.5 rounded font-bold border border-tertiary/40">
                        PRO-PRIVACY CLAUSE
                      </span>
                      <span className="font-mono-badge text-[9px] text-tertiary font-mono-code font-bold">
                        Biometrics Explicitly Disclaimed
                      </span>
                    </div>
                    <span className="text-on-surface font-medium block">
                      "OmniCloud explicitly disclaims the harvesting, extraction, storage, or algorithmic derivation of any human facial geometry, retinal scans, acoustic voiceprints, or biometric signatures under any circumstance."
                    </span>
                  </div>
                </article>
              </div>
            </section>
          </>
        ) : (
          /* Unified Stream View */
          <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-4 max-w-4xl mx-auto">
            <div className="text-xs font-mono-badge text-outline flex items-center justify-between pb-2 border-b border-outline-variant">
              <span>Unified Redline Sequence</span>
              <span className="text-primary">{changes.length} Discrepancies</span>
            </div>
            {changes.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedChangeId(c.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedChangeId === c.id
                    ? 'bg-surface-container border-primary ring-1 ring-primary/40'
                    : 'bg-surface-container-low border-outline-variant hover:border-outline'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-on-surface">
                    #{c.id.toUpperCase()} · {c.sectionNew || c.sectionOld}
                  </span>
                  <span
                    className={`font-mono-badge text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                      c.privacyImpact === 'PRIVACY_WORSE'
                        ? 'text-error bg-error-container/20 border-error/40'
                        : c.privacyImpact === 'PRIVACY_BETTER'
                        ? 'text-tertiary bg-tertiary-container/20 border-tertiary/40'
                        : 'text-amber-400 bg-amber-950/30 border-amber-500/40'
                    }`}
                  >
                    {c.privacyImpact}
                  </span>
                </div>
                {c.oldText && (
                  <del className="block text-xs font-mono-code bg-error-container/15 text-error p-2.5 rounded border border-error/30 mb-2 line-through">
                    - {c.oldText}
                  </del>
                )}
                {c.newText && (
                  <ins className="block text-xs font-mono-code bg-tertiary-container/15 text-tertiary p-2.5 rounded border border-tertiary/30 no-underline font-medium">
                    + {c.newText}
                  </ins>
                )}
                <p className="text-xs text-on-surface-variant mt-2">{c.explanation}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── COLUMN 3 (20% width): DIFFERENCE SUMMARY SIDEBAR (Stitch Ledger) ── */}
        <aside className="w-[20%] flex flex-col bg-surface-container-low border-l border-outline-variant h-full overflow-hidden select-none">
          {/* Header & Metrics Badges */}
          <div className="p-3 border-b border-outline-variant bg-surface-container-lowest/90 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-body font-semibold text-on-surface">
                  Discrepancy Ledger
                </span>
              </div>
              <span className="font-mono-badge text-[10px] text-primary bg-primary/10 border border-primary/25 px-1.5 py-0.5 rounded font-bold">
                14 Events
              </span>
            </div>

            {/* Metric Breakdown Pill Grid */}
            <div className="grid grid-cols-2 gap-1.5 font-mono-badge text-[10px]">
              <div className="flex items-center justify-between px-2 py-1 rounded bg-surface-container border border-outline-variant hover:border-tertiary/40 transition-colors">
                <span className="text-tertiary flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-tertiary" /> Added
                </span>
                <span className="text-on-surface font-bold">4</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-surface-container border border-outline-variant hover:border-secondary/40 transition-colors">
                <span className="text-secondary flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-secondary" /> Modified
                </span>
                <span className="text-on-surface font-bold">7</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-surface-container border border-outline-variant hover:border-error/40 transition-colors">
                <span className="text-error flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-error" /> Removed
                </span>
                <span className="text-on-surface font-bold">3</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-surface-container border border-outline-variant hover:border-outline transition-colors">
                <span className="text-outline flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-outline" /> Noise
                </span>
                <span className="text-on-surface-variant font-bold">1</span>
              </div>
            </div>

            {/* Filter Navigation Tabs */}
            <div className="flex items-center gap-1 mt-2.5 p-0.5 bg-surface-container-lowest rounded-md border border-outline-variant overflow-x-auto text-[10.5px] font-mono-badge">
              <button
                type="button"
                onClick={() => setFilterImpact('all')}
                className={`px-2 py-1 rounded shrink-0 transition-colors ${
                  filterImpact === 'all'
                    ? 'bg-surface-container-high text-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All (14)
              </button>
              <button
                type="button"
                onClick={() => setFilterImpact('worse')}
                className={`px-2 py-1 rounded shrink-0 transition-colors ${
                  filterImpact === 'worse'
                    ? 'bg-surface-container-high text-error font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Worse (6)
              </button>
              <button
                type="button"
                onClick={() => setFilterImpact('better')}
                className={`px-2 py-1 rounded shrink-0 transition-colors ${
                  filterImpact === 'better'
                    ? 'bg-surface-container-high text-tertiary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Better (3)
              </button>
              <button
                type="button"
                onClick={() => setFilterImpact('unclear')}
                className={`px-2 py-1 rounded shrink-0 transition-colors ${
                  filterImpact === 'unclear'
                    ? 'bg-surface-container-high text-amber-400 font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Unclear (5)
              </button>
            </div>
          </div>

          {/* Scrollable List of Change Cards */}
          <div className="flex-1 overflow-y-auto custom-scroll p-2.5 space-y-2.5">
            {filteredChanges.map((change) => {
              const isSelected = selectedChangeId === change.id;
              const isWorse = change.privacyImpact === 'PRIVACY_WORSE';
              const isBetter = change.privacyImpact === 'PRIVACY_BETTER';
              const isUnclear = change.privacyImpact === 'UNCLEAR';

              return (
                <div
                  key={change.id}
                  onClick={() => setSelectedChangeId(change.id)}
                  className={`p-2.5 rounded-lg bg-surface-container border transition-all cursor-pointer relative group shadow-sm ${
                    isSelected
                      ? 'border-primary ring-1 ring-primary/40 bg-surface-container-high'
                      : 'border-outline-variant hover:border-outline'
                  }`}
                >
                  {/* Left edge colored strip */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${
                      isWorse ? 'bg-error' : isBetter ? 'bg-tertiary' : isUnclear ? 'bg-amber-400' : 'bg-outline'
                    }`}
                  />

                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-1.5 pl-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono-badge text-[10.5px] font-bold ${
                          isWorse ? 'text-error' : isBetter ? 'text-tertiary' : 'text-amber-400'
                        }`}
                      >
                        #{change.id}
                      </span>
                      <span className="font-mono-badge text-[9.5px] px-1 py-0.2 rounded bg-surface-container-highest text-on-surface">
                        {change.sectionNew ? change.sectionNew.split(' ')[1] || 'Sec' : 'Sec'}
                      </span>
                    </div>
                    <span className="font-mono-badge text-[9px] px-1.5 py-0.2 rounded bg-secondary-container/30 text-secondary-fixed border border-secondary/20 font-medium">
                      {change.changeType}
                    </span>
                  </div>

                  {/* Impact Pill */}
                  <div className="mb-2 pl-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-mono-badge text-[9.5px] font-bold border ${
                        isWorse
                          ? 'bg-error-container/30 border-error/50 text-error'
                          : isBetter
                          ? 'bg-tertiary-container/20 border-tertiary/40 text-tertiary'
                          : 'bg-amber-950/30 border-amber-500/40 text-amber-400'
                      }`}
                    >
                      {change.privacyImpact}
                    </span>
                  </div>

                  {/* Explanation */}
                  <p className="font-body text-[11.5px] text-on-surface-variant leading-snug pl-1.5 group-hover:text-on-surface transition-colors">
                    {change.explanation}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Quick AI Forensic Insight Bottom Card */}
          <div className="p-3 bg-surface-container-lowest border-t border-outline-variant shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-primary">
                <Sparkles className="size-3.5" />
                <span className="font-mono-badge text-[10.5px] font-bold tracking-tight uppercase">
                  Forensic Summary
                </span>
              </div>
              <span className="font-mono-badge text-[9.5px] text-error font-bold px-1.5 py-0.2 rounded bg-error-container/30 border border-error/40">
                HIGH RISK
              </span>
            </div>
            <p className="font-body text-[11px] text-on-surface-variant leading-relaxed">
              50% of analyzed modifications quietly broaden secondary telemetry usage rights despite cosmetic phrasing changes. High liability score in <strong className="text-on-surface">Section 4.2</strong>.
            </p>
            <div className="pt-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate(`/comparison/${comparison.id}/changes`)}
                className="flex-1 h-7 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant text-[10.5px] font-body text-on-surface flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>Full Ledger</span>
                <ArrowRight className="size-3 text-primary" />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/comparison/${comparison.id}/privacy-report`)}
                className="h-7 px-2.5 rounded bg-primary-container text-on-primary-container text-[10.5px] font-mono-badge font-bold flex items-center justify-center hover:bg-primary transition-colors cursor-pointer"
                title="View Privacy Report"
              >
                Audit Report
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default ComparisonWorkspace;
