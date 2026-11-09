// ============================================================================
// SneakyToS — Document Comparison Workspace
// Source of Truth: Google Stitch Screen 47865f28f8c94ee49603b4deaebea2e1
// Dynamic rendering connected to FastAPI backend output (CompareResponse)
// ============================================================================

import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  X,
  Link as LinkIcon,
  Unlink,
  CheckCircle2,
  ArrowRight,
  FileDown,
  ExternalLink,
  UploadCloud,
  SlidersHorizontal,
} from 'lucide-react';
import { useComparison } from '@/context/ComparisonContext';
import {
  ChangeTypeBadge,
  EventValidityBadge,
  PrivacyImpactBadge,
} from '@/components/common/Badge';
import {
  createDocumentSectionContext,
  resolveChangeCardHeading,
} from '@/utils/sectionUtils';

export function ComparisonWorkspace() {
  const navigate = useNavigate();
  const { comparisonData } = useComparison();

  const [selectedChangeId, setSelectedChangeId] = useState<string>('');
  const [syncScroll, setSyncScroll] = useState<boolean>(true);
  const [filterImpact, setFilterImpact] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dual scroll container refs
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<'left' | 'right' | null>(null);

  const changes = useMemo(() => comparisonData?.changes || [], [comparisonData]);

  // Set default selected change id once data is loaded
  useEffect(() => {
    if (changes.length > 0 && (!selectedChangeId || !changes.some((c) => c.change_id === selectedChangeId))) {
      setSelectedChangeId(changes[0].change_id);
    }
  }, [changes, selectedChangeId]);

  // Synchronized scrolling
  const handleLeftScroll = () => {
    if (!syncScroll || isScrollingRef.current === 'right') return;
    isScrollingRef.current = 'left';
    if (leftScrollRef.current && rightScrollRef.current) {
      const maxScrollLeft = leftScrollRef.current.scrollHeight - leftScrollRef.current.clientHeight;
      const maxScrollRight = rightScrollRef.current.scrollHeight - rightScrollRef.current.clientHeight;
      if (maxScrollLeft > 0 && maxScrollRight > 0) {
        const percentage = leftScrollRef.current.scrollTop / maxScrollLeft;
        rightScrollRef.current.scrollTop = percentage * maxScrollRight;
      }
    }
    setTimeout(() => {
      isScrollingRef.current = null;
    }, 40);
  };

  const handleRightScroll = () => {
    if (!syncScroll || isScrollingRef.current === 'left') return;
    isScrollingRef.current = 'right';
    if (leftScrollRef.current && rightScrollRef.current) {
      const maxScrollLeft = leftScrollRef.current.scrollHeight - leftScrollRef.current.clientHeight;
      const maxScrollRight = rightScrollRef.current.scrollHeight - rightScrollRef.current.clientHeight;
      if (maxScrollLeft > 0 && maxScrollRight > 0) {
        const percentage = rightScrollRef.current.scrollTop / maxScrollRight;
        leftScrollRef.current.scrollTop = percentage * maxScrollLeft;
      }
    }
    setTimeout(() => {
      isScrollingRef.current = null;
    }, 40);
  };

  // Scroll to selected change automatically
  useEffect(() => {
    if (!selectedChangeId) return;

    const leftTarget = document.getElementById(`diff-left-${selectedChangeId}`);
    const rightTarget = document.getElementById(`diff-right-${selectedChangeId}`);

    if (leftTarget && leftScrollRef.current) {
      leftTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (rightTarget && rightScrollRef.current) {
      rightTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedChangeId]);

  // Document section contexts (separate for baseline and revised documents)
  const oldSectionContext = useMemo(
    () => createDocumentSectionContext(changes, 'old'),
    [changes]
  );
  const newSectionContext = useMemo(
    () => createDocumentSectionContext(changes, 'new'),
    [changes]
  );

  // Filtered change list for sidebar
  const filteredChanges = useMemo(() => {
    return changes.filter((c) => {
      if (filterImpact === 'worse' && c.privacy_impact !== 'PRIVACY_WORSE') return false;
      if (filterImpact === 'better' && c.privacy_impact !== 'PRIVACY_BETTER') return false;
      if (filterImpact === 'no_effect' && c.privacy_impact !== 'NO_PRIVACY_EFFECT') return false;
      if (filterImpact === 'unclear' && c.privacy_impact !== 'UNCLEAR') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const oldT = c.before?.old_clause?.text || '';
        const newT = c.before?.new_clause?.text || '';
        const rationale = c.classification?.rationale || '';
        const sectionHeading = resolveChangeCardHeading(c, oldSectionContext, newSectionContext);
        const inText = `${oldT} ${newT} ${rationale} ${sectionHeading}`.toLowerCase();
        if (!inText.includes(q)) return false;
      }
      return true;
    });
  }, [changes, filterImpact, searchQuery, oldSectionContext, newSectionContext]);

  const selectedChange = useMemo(
    () => changes.find((c) => c.change_id === selectedChangeId),
    [changes, selectedChangeId]
  );

  const handleExportJson = () => {
    if (!comparisonData) return;
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(comparisonData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `sneakytos-comparison-${comparisonData.old_policy.filename}-vs-${comparisonData.new_policy.filename}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // If no comparison data is available, show empty state
  if (!comparisonData) {
    return (
      <div className="bg-background text-on-surface antialiased min-h-screen flex flex-col justify-between selection:bg-primary-container selection:text-on-primary-container">
        <header className="h-14 w-full z-20 bg-surface-container-lowest border-b border-outline-variant px-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-on-surface font-semibold text-sm">
            <Shield className="size-4 text-primary" />
            <span>SneakyToS Workspace</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:brightness-110 cursor-pointer"
          >
            + Upload Policies
          </button>
        </header>

        <div className="max-w-xl mx-auto my-auto p-8 rounded-2xl bg-surface-container border border-outline-variant text-center space-y-4 shadow-xl">
          <div className="size-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mx-auto">
            <UploadCloud className="size-8" />
          </div>
          <h2 className="text-xl font-display font-semibold text-on-surface">
            No Comparison Loaded
          </h2>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
            Upload baseline and revised policy files on the homepage to perform neural clause alignment, event validity auditing, and privacy impact classification.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
            >
              <span>Go to Document Upload</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        <footer className="w-full bg-surface-container-lowest border-t border-outline-variant py-4 text-center text-xs text-outline">
          SneakyToS · Privacy Policy Neural Diff Engine
        </footer>
      </div>
    );
  }

  const { old_policy, new_policy, summary } = comparisonData;

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
            <span className="hover:text-on-surface transition-colors truncate max-w-[140px] md:max-w-[200px]" title={old_policy.filename}>
              {old_policy.filename}
            </span>
            <span className="text-outline-variant/80">vs</span>
            <span className="hover:text-on-surface transition-colors truncate max-w-[140px] md:max-w-[200px]" title={new_policy.filename}>
              {new_policy.filename}
            </span>
            <span className="text-outline-variant/80">/</span>
            <span className="text-primary font-semibold truncate flex items-center gap-1.5">
              Redline Diff
            </span>
          </div>

          <div className="h-4 w-px bg-outline-variant/60 mx-1 hidden lg:block" />

          {/* Impact Quick Pills */}
          <div className="hidden xl:flex items-center gap-2">
            <span className="font-mono-badge text-[10.5px] px-2 py-0.5 rounded bg-surface-container border border-outline-variant text-outline">
              Total: {summary.total_changes}
            </span>
            <span className="font-mono-badge text-[10.5px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
              Worse: {summary.privacy_impact_counts.PRIVACY_WORSE}
            </span>
            <span className="font-mono-badge text-[10.5px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Better: {summary.privacy_impact_counts.PRIVACY_BETTER}
            </span>
            <span className="font-mono-badge text-[10.5px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Unclear: {summary.privacy_impact_counts.UNCLEAR}
            </span>
          </div>
        </div>

        {/* Right: Workspace Navigation & Export Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          <nav className="flex items-center gap-1.5">
            <button
              type="button"
              className="px-2.5 py-1 rounded bg-primary/20 text-primary border border-primary/40 text-xs font-semibold"
            >
              Workspace
            </button>
            <button
              type="button"
              onClick={() => navigate('/changes')}
              className="px-2.5 py-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs transition-colors cursor-pointer"
            >
              Ledger ({changes.length})
            </button>
            <button
              type="button"
              onClick={() => navigate('/report')}
              className="px-2.5 py-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs transition-colors cursor-pointer"
            >
              Report
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-2.5 py-1 rounded text-outline hover:text-on-surface hover:bg-surface-container text-xs transition-colors cursor-pointer"
            >
              + Upload
            </button>
          </nav>

          <button
            type="button"
            onClick={handleExportJson}
            className="p-1.5 rounded-lg border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
            title="Export Comparison JSON"
          >
            <FileDown className="size-4" />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. Main Comparison Split View (Left: Old, Center: New, Right: Ledger)
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">
        {/* Document Comparison Section (80% on desktop, 100% on mobile) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden border-r border-outline-variant">
          {/* ── LEFT PANE: BASELINE POLICY (OLD) ── */}
          <section className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-outline-variant bg-surface-container-lowest relative overflow-hidden">
            {/* Sub-Header */}
            <div className="h-10 px-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2 min-w-0">
                <span className="size-2 rounded-full bg-red-400 ring-2 ring-red-400/20 shrink-0" />
                <span className="font-mono-badge text-[10px] uppercase tracking-wider text-red-400 font-bold px-1 py-0.2 rounded bg-red-500/10 border border-red-500/20 shrink-0">
                  BASELINE (OLD)
                </span>
                <span className="text-outline-variant/60">|</span>
                <span className="font-body text-on-surface font-semibold text-xs truncate max-w-[200px]" title={old_policy.filename}>
                  {old_policy.filename}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs shrink-0">
                <span className="font-mono-badge text-[10.5px] text-outline px-1.5 py-0.2 rounded bg-surface-container">
                  {old_policy.clause_count} Clauses · {old_policy.word_count} Words
                </span>
                <button
                  type="button"
                  onClick={() => setSyncScroll(!syncScroll)}
                  className={`px-1.5 py-0.5 rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                    syncScroll
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-surface-container border-outline-variant text-outline'
                  }`}
                  title={syncScroll ? 'Lock Synchronized Scrolling' : 'Unlock Scrolling'}
                >
                  {syncScroll ? <LinkIcon className="size-3" /> : <Unlink className="size-3" />}
                  <span className="font-mono-badge text-[9.5px] font-semibold">
                    {syncScroll ? 'SYNC ON' : 'SYNC OFF'}
                  </span>
                </button>
              </div>
            </div>

            {/* Left Content Pane */}
            <div
              ref={leftScrollRef}
              onScroll={handleLeftScroll}
              className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4 text-on-surface bg-background/50"
            >
              {changes.map((change, index) => {
                const isSelected = change.change_id === selectedChangeId;
                const oldClause = change.before?.old_clause;
                const oldClauses = change.before?.old_clauses || (oldClause ? [oldClause] : []);
                const oldSectionTitle = oldSectionContext.getEnclosingSection(oldClause, oldClauses);

                return (
                  <article
                    key={`left-${change.change_id}`}
                    id={`diff-left-${change.change_id}`}
                    onClick={() => setSelectedChangeId(change.change_id)}
                    className={`relative rounded-xl p-3.5 transition-all border cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/40 shadow-md'
                        : 'border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-badge text-[10px] text-outline bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant">
                          #{index + 1} ({change.change_id})
                        </span>
                        <h4
                          className="text-xs font-semibold text-on-surface truncate max-w-[220px]"
                          title={oldSectionTitle}
                        >
                          {oldSectionTitle}
                        </h4>
                      </div>
                      <span className="font-mono-badge text-[10px] text-outline">
                        Pos #{oldClause?.position ?? 'N/A'}
                      </span>
                    </div>

                    {oldClauses.length > 0 ? (
                      <div className="space-y-2">
                        {oldClauses.map((c, i) => (
                          <div
                            key={i}
                            className={`p-2.5 rounded-lg text-xs leading-relaxed font-clause-diff ${
                              change.change_type === 'DELETED'
                                ? 'bg-red-950/20 border-l-[3px] border-red-500 text-red-200'
                                : change.change_type === 'MODIFIED'
                                ? 'bg-amber-950/15 border-l-[3px] border-amber-500 text-amber-200'
                                : 'bg-surface-container text-on-surface-variant'
                            }`}
                          >
                            <p className={change.change_type === 'DELETED' ? 'line-through opacity-90' : ''}>
                              {c.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-surface-container/40 border border-dashed border-outline-variant text-outline font-mono-code text-[11px] italic">
                        [No clause counterpart in baseline document — newly added in revision]
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          {/* ── RIGHT PANE: REVISED POLICY (NEW) ── */}
          <section className="flex-1 flex flex-col bg-surface-container-lowest/60 relative overflow-hidden">
            {/* Sub-Header */}
            <div className="h-10 px-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2 min-w-0">
                <span className="size-2 rounded-full bg-blue-400 ring-2 ring-blue-400/20 shrink-0" />
                <span className="font-mono-badge text-[10px] uppercase tracking-wider text-blue-400 font-bold px-1 py-0.2 rounded bg-blue-500/10 border border-blue-500/20 shrink-0">
                  REVISED (NEW)
                </span>
                <span className="text-outline-variant/60">|</span>
                <span className="font-body text-on-surface font-semibold text-xs truncate max-w-[200px]" title={new_policy.filename}>
                  {new_policy.filename}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs shrink-0">
                <span className="font-mono-badge text-[10.5px] text-outline px-1.5 py-0.2 rounded bg-surface-container">
                  {new_policy.clause_count} Clauses · {new_policy.word_count} Words
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-mono-badge font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  <span>Aligned</span>
                </span>
              </div>
            </div>

            {/* Right Content Pane */}
            <div
              ref={rightScrollRef}
              onScroll={handleRightScroll}
              className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4 text-on-surface bg-background/50"
            >
              {changes.map((change, index) => {
                const isSelected = change.change_id === selectedChangeId;
                const newClause = change.before?.new_clause;
                const newClauses = change.before?.new_clauses || (newClause ? [newClause] : []);
                const newSectionTitle = newSectionContext.getEnclosingSection(newClause, newClauses);

                return (
                  <article
                    key={`right-${change.change_id}`}
                    id={`diff-right-${change.change_id}`}
                    onClick={() => setSelectedChangeId(change.change_id)}
                    className={`relative rounded-xl p-3.5 transition-all border cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/40 shadow-md'
                        : 'border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-badge text-[10px] text-outline bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant">
                          #{index + 1} ({change.change_id})
                        </span>
                        <h4
                          className="text-xs font-semibold text-on-surface truncate max-w-[220px]"
                          title={newSectionTitle}
                        >
                          {newSectionTitle}
                        </h4>
                      </div>
                      <span className="font-mono-badge text-[10px] text-outline">
                        Pos #{newClause?.position ?? 'N/A'}
                      </span>
                    </div>

                    {newClauses.length > 0 ? (
                      <div className="space-y-2">
                        {newClauses.map((c, i) => (
                          <div
                            key={i}
                            className={`p-2.5 rounded-lg text-xs leading-relaxed font-clause-diff ${
                              change.change_type === 'ADDED'
                                ? 'bg-emerald-950/20 border-l-[3px] border-emerald-500 text-emerald-200'
                                : change.change_type === 'MODIFIED'
                                ? 'bg-blue-950/20 border-l-[3px] border-blue-500 text-blue-200'
                                : 'bg-surface-container text-on-surface-variant'
                            }`}
                          >
                            <p>{c.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-surface-container/40 border border-dashed border-outline-variant text-outline font-mono-code text-[11px] italic">
                        [Clause completely removed in revision]
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── RIGHTMOST COLUMN: DISCREPANCY LEDGER SIDEBAR ── */}
        <aside className="w-80 md:w-96 flex flex-col bg-surface-container border-l border-outline-variant shrink-0 overflow-hidden">
          {/* Sidebar Top Filter Header */}
          <div className="p-3.5 border-b border-outline-variant space-y-2.5 bg-surface-container-low">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-display font-semibold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                <SlidersHorizontal className="size-3.5 text-primary" />
                <span>Discrepancy Ledger</span>
              </h3>
              <span className="font-mono-badge text-[10.5px] text-outline">
                {filteredChanges.length} / {changes.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="size-3.5 text-outline absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search clause text, rationale..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-8 pr-3 py-1.5 text-xs text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-outline hover:text-on-surface"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'worse', label: 'Worse' },
                { id: 'better', label: 'Better' },
                { id: 'unclear', label: 'Unclear' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterImpact(tab.id)}
                  className={`px-2 py-0.5 rounded font-mono-badge font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                    filterImpact === tab.id
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-outline hover:text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Change List */}
          <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-2.5">
            {filteredChanges.map((change, idx) => {
              const isSelected = change.change_id === selectedChangeId;
              const sim = change.before?.semantic_similarity;

              return (
                <div
                  key={change.change_id}
                  onClick={() => setSelectedChangeId(change.change_id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-surface-container-lowest border-primary ring-1 ring-primary/40 shadow-md'
                      : 'bg-surface-container-lowest/60 border-outline-variant hover:border-outline hover:bg-surface-container-lowest'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono-badge text-[10px] text-outline font-semibold">
                      #{idx + 1} · {change.change_id}
                    </span>
                    {typeof sim === 'number' && (
                      <span className="font-mono-code text-[10px] text-primary" title="Semantic Similarity">
                        Sim: {(sim * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>

                  {/* 3 Separate Badges: Change Type, Event Validity, Privacy Impact */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <ChangeTypeBadge type={change.change_type} size="sm" />
                    <EventValidityBadge validity={change.event_validity} size="sm" />
                    <PrivacyImpactBadge impact={change.privacy_impact} size="sm" />
                  </div>

                  {/* Section Label */}
                  <p
                    className="font-semibold text-on-surface truncate mb-1"
                    title={resolveChangeCardHeading(change, oldSectionContext, newSectionContext)}
                  >
                    {resolveChangeCardHeading(change, oldSectionContext, newSectionContext)}
                  </p>

                  {/* Rationale or Preview */}
                  <p className="text-[11.5px] text-on-surface-variant line-clamp-2 leading-relaxed">
                    {change.classification?.rationale ||
                      change.validation_reason ||
                      change.before?.new_clause?.text ||
                      change.before?.old_clause?.text}
                  </p>
                </div>
              );
            })}

            {filteredChanges.length === 0 && (
              <div className="p-6 text-center text-xs text-outline space-y-1">
                <p>No changes matching your filter.</p>
              </div>
            )}
          </div>

          {/* Selected Change Detail Footer in Sidebar */}
          {selectedChange && (
            <div className="p-3 border-t border-outline-variant bg-surface-container-low text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono-badge text-[10px] text-outline uppercase">
                  Selected Detail
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/changes')}
                  className="text-primary hover:underline text-[11px] flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <span>Open Full Ledger</span>
                  <ExternalLink className="size-3" />
                </button>
              </div>

              {selectedChange.classification?.evidence && selectedChange.classification.evidence.length > 0 && (
                <div className="p-2 rounded bg-surface-container-lowest border border-outline-variant font-mono-code text-[11px] text-on-surface-variant">
                  <span className="text-outline block mb-0.5 font-bold">Matched Evidence:</span>
                  <span className="text-primary">
                    "{selectedChange.classification.evidence[0]}"
                  </span>
                </div>
              )}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default ComparisonWorkspace;
