// ============================================================================
// SneakyToS — Forensic Clause Discrepancy Ledger (Detailed Change Analysis)
// Aligned with Google Stitch Design & Classification Architecture
// ============================================================================

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowLeft,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  PlusCircle,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { mockDetailedComparison } from '@/services/mockData';

export function ChangeAnalysis() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const comparison = mockDetailedComparison;
  const changes = comparison.changes;

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChangeType, setSelectedChangeType] = useState<string>('ALL');
  const [selectedValidity, setSelectedValidity] = useState<string>('ALL');
  const [selectedImpact, setSelectedImpact] = useState<string>('ALL');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    'change-001': true,
    'change-002': true,
  });

  const toggleExpand = (changeId: string) => {
    setExpandedCards((prev) => ({ ...prev, [changeId]: !prev[changeId] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    changes.forEach((c) => {
      allExpanded[c.id] = true;
    });
    setExpandedCards(allExpanded);
  };

  const collapseAll = () => {
    setExpandedCards({});
  };

  // Filter logic
  const filteredChanges = changes.filter((c) => {
    const matchesSearch =
      (c.sectionNew && c.sectionNew.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.sectionOld && c.sectionOld.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.explanation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.aiSummary && c.aiSummary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.newText && c.newText.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.oldText && c.oldText.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedChangeType !== 'ALL' && c.changeType !== selectedChangeType) return false;
    if (selectedValidity !== 'ALL' && c.eventValidity !== selectedValidity) return false;
    if (selectedImpact !== 'ALL' && c.privacyImpact !== selectedImpact) return false;

    return true;
  });

  // Calculate dynamic stats
  const worseCount = changes.filter((c) => c.privacyImpact === 'PRIVACY_WORSE').length;
  const betterCount = changes.filter((c) => c.privacyImpact === 'PRIVACY_BETTER').length;
  const unclearCount = changes.filter((c) => c.privacyImpact === 'UNCLEAR').length;

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      {/* ─────────────────────────────────────────────────────────────
          1. Stitch Minimalist Top Bar Header
         ───────────────────────────────────────────────────────────── */}
      <header className="h-14 w-full z-20 bg-surface-container-lowest border-b border-outline-variant px-5 flex items-center justify-between shrink-0 sticky top-0 backdrop-blur-md bg-opacity-95">
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
            <span className="text-primary font-semibold truncate max-w-xs md:max-w-sm flex items-center gap-1.5">
              Forensic Clause Ledger
            </span>
          </div>

          <div className="h-4 w-px bg-outline-variant/60 mx-1 hidden lg:block" />

          {/* Quick Counter Badge */}
          <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container-high/90 border border-outline-variant shadow-sm font-mono-badge text-[10px]">
            <span className="text-error font-bold">{worseCount} Worse</span>
            <span className="text-outline-variant">•</span>
            <span className="text-tertiary font-bold">{betterCount} Better</span>
            <span className="text-outline-variant">•</span>
            <span className="text-amber-400 font-bold">{unclearCount} Unclear</span>
          </div>
        </div>

        {/* Right Action Nav Bar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate(`/comparison/${id || comparison.id}`)}
            className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-xs font-body flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Split Redline</span> Workspace
          </button>

          <button
            type="button"
            onClick={() => navigate(`/comparison/${id || comparison.id}/privacy-report`)}
            className="h-8 px-3 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container text-xs font-mono-badge font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="size-3.5" />
            <span>Privacy Report</span>
          </button>

          <div className="h-4 w-px bg-outline-variant/60 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-xs font-body flex items-center gap-1.5 transition-all cursor-pointer"
            title="Start New Comparison"
          >
            <PlusCircle className="size-3.5 text-tertiary" />
            <span className="hidden md:inline">+ New Comparison</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. Main Container
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-5 md:p-8 space-y-6">
        {/* Banner Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-outline-variant">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded font-mono-badge text-mono-badge bg-primary/10 text-primary border border-primary/20">
                AUDIT DISCREPANCY LEDGER
              </span>
              <span className="text-outline text-xs font-mono-code">
                {comparison.oldVersion.version} → {comparison.newVersion.version}
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
              Detailed Clause Modifications
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant mt-1 max-w-3xl">
              Forensic clause-by-clause decomposition showing detected change type, boundary verification validity, and fine-tuned NLI privacy impact classification.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-mono-badge text-on-surface transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-mono-badge text-on-surface transition-colors cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-surface-container-low rounded-xl border border-outline-variant p-4 space-y-3 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="size-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search clause text, explanation, summary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Change Type Filter (Strict 3 categories) */}
            <div>
              <select
                value={selectedChangeType}
                onChange={(e) => setSelectedChangeType(e.target.value)}
                aria-label="Filter by Change Type"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL">All Change Types (3)</option>
                <option value="ADDED">ADDED</option>
                <option value="MODIFIED">MODIFIED</option>
                <option value="DELETED">DELETED</option>
              </select>
            </div>

            {/* Event Validity Filter (Strict 8 categories) */}
            <div>
              <select
                value={selectedValidity}
                onChange={(e) => setSelectedValidity(e.target.value)}
                aria-label="Filter by Event Validity"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL">All Event Validity (8)</option>
                <option value="VALID">VALID</option>
                <option value="FRAGMENT">FRAGMENT</option>
                <option value="HEADING_ONLY">HEADING_ONLY</option>
                <option value="CONTAMINATED">CONTAMINATED</option>
                <option value="MISMATCHED_PAIR">MISMATCHED_PAIR</option>
                <option value="FALSE_ADDED_DELETED">FALSE_ADDED_DELETED</option>
                <option value="GARBLED">GARBLED</option>
                <option value="TRUNCATED">TRUNCATED</option>
              </select>
            </div>

            {/* Privacy Impact Filter (Strict 4 categories) */}
            <div>
              <select
                value={selectedImpact}
                onChange={(e) => setSelectedImpact(e.target.value)}
                aria-label="Filter by Privacy Impact"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL">All Privacy Impacts (4)</option>
                <option value="PRIVACY_WORSE">PRIVACY_WORSE (Danger)</option>
                <option value="PRIVACY_BETTER">PRIVACY_BETTER (Safe)</option>
                <option value="NO_PRIVACY_EFFECT">NO_PRIVACY_EFFECT</option>
                <option value="UNCLEAR">UNCLEAR (Ambiguity)</option>
              </select>
            </div>
          </div>

          {/* Filter Status Bar */}
          <div className="flex items-center justify-between text-xs text-on-surface-variant pt-2 border-t border-outline-variant/60 font-mono-code">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-3.5 text-primary" />
              <span>
                Displaying <strong className="text-on-surface font-bold">{filteredChanges.length}</strong> of{' '}
                {changes.length} recorded discrepancy events
              </span>
            </div>
            {(searchTerm || selectedChangeType !== 'ALL' || selectedValidity !== 'ALL' || selectedImpact !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedChangeType('ALL');
                  setSelectedValidity('ALL');
                  setSelectedImpact('ALL');
                }}
                className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="size-3" />
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Discrepancy Cards List */}
        <div className="space-y-4">
          {filteredChanges.length === 0 ? (
            <div className="p-12 text-center bg-surface-container-low rounded-xl border border-outline-variant space-y-3">
              <AlertTriangle className="size-8 text-outline mx-auto" />
              <p className="font-headline-sm text-base text-on-surface">No matching modifications found</p>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Try loosening your search term or reset the classification filters.
              </p>
            </div>
          ) : (
            filteredChanges.map((change) => {
              const isExpanded = !!expandedCards[change.id];
              const isWorse = change.privacyImpact === 'PRIVACY_WORSE';
              const isBetter = change.privacyImpact === 'PRIVACY_BETTER';
              const isUnclear = change.privacyImpact === 'UNCLEAR';

              return (
                <div
                  key={change.id}
                  className={`bg-surface-container-low rounded-xl border transition-all overflow-hidden shadow-sm ${
                    isExpanded ? 'border-primary/50' : 'border-outline-variant hover:border-outline'
                  }`}
                >
                  {/* Card Header (Clickable Accordion) */}
                  <div
                    onClick={() => toggleExpand(change.id)}
                    className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-surface-container-high/40 transition-colors select-none"
                  >
                    <div className="flex items-start md:items-center gap-3">
                      <span className="font-mono-code text-sm font-bold text-primary px-2 py-0.5 rounded bg-surface-container border border-outline-variant shrink-0">
                        #{change.id.toUpperCase()}
                      </span>
                      <div>
                        <h3 className="font-headline-sm font-semibold text-base text-on-surface">
                          {change.sectionNew || change.sectionOld}
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1 font-body">
                          {change.explanation}
                        </p>
                      </div>
                    </div>

                    {/* 3 Explicit Separate Categorization Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* 1. Change Type Badge */}
                      <Badge
                        label={change.changeType}
                        variant={
                          change.changeType === 'ADDED'
                            ? 'safe'
                            : change.changeType === 'DELETED'
                            ? 'danger'
                            : 'warn'
                        }
                      />

                      {/* 2. Event Validity Badge */}
                      <Badge
                        label={change.eventValidity}
                        variant={change.eventValidity === 'VALID' ? 'primary' : 'neutral'}
                      />

                      {/* 3. Privacy Impact Badge */}
                      <Badge
                        label={change.privacyImpact}
                        variant={
                          isWorse
                            ? 'danger'
                            : isBetter
                            ? 'safe'
                            : isUnclear
                            ? 'warn'
                            : 'neutral'
                        }
                      />

                      <button
                        type="button"
                        className="p-1 text-on-surface-variant hover:text-on-surface ml-1"
                        aria-label="Toggle details"
                      >
                        {isExpanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Evidence & AI Summary */}
                  {isExpanded && (
                    <div className="p-4 md:p-6 border-t border-outline-variant bg-surface-container-lowest/50 space-y-4">
                      {/* Plain Language Legal Explanation */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-mono-code uppercase tracking-wider text-outline flex items-center gap-1.5">
                          <CheckCircle2 className="size-3 text-primary" />
                          Forensic Analytical Finding
                        </div>
                        <p className="text-sm text-on-surface font-body leading-relaxed pl-4 border-l-2 border-primary/40">
                          {change.explanation}
                        </p>
                      </div>

                      {/* AI Strategic Assessment */}
                      {change.aiSummary && (
                        <div className="p-3.5 rounded-lg bg-surface-container border border-primary/25 space-y-1.5 shadow-sm">
                          <div className="flex items-center gap-2 text-primary font-mono-code text-xs font-semibold">
                            <Sparkles className="size-3.5" />
                            AI Strategic Assessment & Privacy Implication
                          </div>
                          <p className="text-xs text-on-surface-variant font-body leading-relaxed">
                            {change.aiSummary}
                          </p>
                        </div>
                      )}

                      {/* Verifiable Diff Evidence */}
                      <div className="space-y-2 pt-2">
                        <div className="text-[11px] font-mono-code uppercase tracking-wider text-outline">
                          Verifiable Clause Diff Comparison
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono-code">
                          {/* Baseline Old Clause */}
                          <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant space-y-1.5">
                            <div className="text-outline text-[10.5px] uppercase flex justify-between">
                              <span className="font-semibold text-on-surface-variant">
                                {comparison.oldVersion.version}
                              </span>
                              {change.lineOld && (
                                <span>Lines {change.lineOld.start}–{change.lineOld.end}</span>
                              )}
                            </div>
                            {change.oldText ? (
                              <div className="bg-error-container/20 text-error p-2.5 rounded line-through border border-error-container/40 leading-relaxed font-body text-xs">
                                {change.oldText}
                              </div>
                            ) : (
                              <div className="text-outline italic p-2.5 bg-surface-container/40 rounded border border-outline-variant/40">
                                [No prior clause existed in baseline version]
                              </div>
                            )}
                          </div>

                          {/* Candidate New Clause */}
                          <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant space-y-1.5">
                            <div className="text-outline text-[10.5px] uppercase flex justify-between">
                              <span className="font-semibold text-primary">
                                {comparison.newVersion.version}
                              </span>
                              {change.lineNew && (
                                <span>Lines {change.lineNew.start}–{change.lineNew.end}</span>
                              )}
                            </div>
                            {change.newText ? (
                              <div
                                className={`p-2.5 rounded border leading-relaxed font-body text-xs ${
                                  isWorse
                                    ? 'bg-error-container/25 text-error border-error-container/50 font-medium'
                                    : isBetter
                                    ? 'bg-tertiary-container/20 text-tertiary border-tertiary/40'
                                    : 'bg-surface-container text-on-surface border-outline-variant'
                                }`}
                              >
                                {change.newText}
                              </div>
                            ) : (
                              <div className="text-outline italic p-2.5 bg-surface-container/40 rounded border border-outline-variant/40">
                                [Clause definitively removed in revised version]
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Direct Jump to Split Workspace */}
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => navigate(`/comparison/${id || comparison.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs text-primary font-mono-badge border border-outline-variant transition-colors cursor-pointer"
                        >
                          Audit in Split Redline Workspace
                          <ExternalLink className="size-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

export default ChangeAnalysis;
