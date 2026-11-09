// ============================================================================
// SneakyToS — Forensic Clause Discrepancy Ledger (Detailed Change Analysis)
// Aligned with Google Stitch Design & Real Backend Integration
// ============================================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  AlertTriangle,
  RotateCcw,
  FileDown,
  Brain,
  UploadCloud,
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

export function ChangeAnalysis() {
  const navigate = useNavigate();
  const { comparisonData } = useComparison();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChangeType, setSelectedChangeType] = useState<string>('ALL');
  const [selectedValidity, setSelectedValidity] = useState<string>('ALL');
  const [selectedImpact, setSelectedImpact] = useState<string>('ALL');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const changes = useMemo(() => comparisonData?.changes || [], [comparisonData]);

  // Set initial expanded states
  const toggleExpand = (changeId: string) => {
    setExpandedCards((prev) => ({ ...prev, [changeId]: !prev[changeId] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    changes.forEach((c) => {
      allExpanded[c.change_id] = true;
    });
    setExpandedCards(allExpanded);
  };

  const collapseAll = () => {
    setExpandedCards({});
  };

  // Document section contexts
  const oldSectionContext = useMemo(
    () => createDocumentSectionContext(changes, 'old'),
    [changes]
  );
  const newSectionContext = useMemo(
    () => createDocumentSectionContext(changes, 'new'),
    [changes]
  );

  // Filter logic
  const filteredChanges = useMemo(() => {
    return changes.filter((c) => {
      // 1. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const oldT = c.before?.old_clause?.text || '';
        const newT = c.before?.new_clause?.text || '';
        const rationale = c.classification?.rationale || '';
        const sectionHeading = resolveChangeCardHeading(c, oldSectionContext, newSectionContext);
        const evidence = c.classification?.evidence?.join(' ') || '';
        const combined = `${oldT} ${newT} ${rationale} ${sectionHeading} ${evidence} ${c.change_id}`.toLowerCase();
        if (!combined.includes(term)) return false;
      }

      // 2. Change Type
      if (selectedChangeType !== 'ALL' && c.change_type !== selectedChangeType) {
        return false;
      }

      // 3. Event Validity
      if (selectedValidity === 'VALID' && c.event_validity !== 'VALID') {
        return false;
      }
      if (selectedValidity === 'DEFECTS' && c.event_validity === 'VALID') {
        return false;
      }
      if (selectedValidity !== 'ALL' && selectedValidity !== 'VALID' && selectedValidity !== 'DEFECTS') {
        if (c.event_validity !== selectedValidity) return false;
      }

      // 4. Privacy Impact
      if (selectedImpact !== 'ALL') {
        if (c.privacy_impact !== selectedImpact) return false;
      }

      return true;
    });
  }, [changes, searchTerm, selectedChangeType, selectedValidity, selectedImpact]);

  const handleExportJson = () => {
    if (!comparisonData) return;
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(comparisonData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `sneakytos-ledger-${comparisonData.old_policy.filename}-vs-${comparisonData.new_policy.filename}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // If no comparison is loaded, show empty state
  if (!comparisonData) {
    return (
      <div className="min-h-screen bg-background text-on-surface antialiased flex flex-col justify-between selection:bg-primary-container selection:text-on-primary-container">
        <header className="h-14 w-full z-20 bg-surface-container-lowest border-b border-outline-variant px-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-on-surface font-semibold text-sm">
            <Shield className="size-4 text-primary" />
            <span>SneakyToS Discrepancy Ledger</span>
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
            Upload baseline and revised policies on the homepage to inspect the forensic discrepancy ledger.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
            >
              <span>Go to Document Upload</span>
              <Shield className="size-4" />
            </button>
          </div>
        </div>

        <footer className="w-full bg-surface-container-lowest border-t border-outline-variant py-4 text-center text-xs text-outline">
          SneakyToS · Privacy Policy Forensic Audit Engine
        </footer>
      </div>
    );
  }

  const { old_policy, new_policy, summary } = comparisonData;

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
            <span className="hover:text-on-surface transition-colors truncate max-w-[140px] md:max-w-[180px]" title={old_policy.filename}>
              {old_policy.filename}
            </span>
            <span className="text-outline-variant/80">vs</span>
            <span className="hover:text-on-surface transition-colors truncate max-w-[140px] md:max-w-[180px]" title={new_policy.filename}>
              {new_policy.filename}
            </span>
            <span className="text-outline-variant/80">/</span>
            <span className="text-primary font-semibold truncate flex items-center gap-1.5">
              Forensic Discrepancy Ledger
            </span>
          </div>

          <div className="h-4 w-px bg-outline-variant/60 mx-1 hidden lg:block" />

          {/* Quick Counter Badge */}
          <div className="hidden md:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 shadow-sm font-mono-badge text-[10px]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
            </span>
            <span className="text-red-400 font-semibold">
              {summary.privacy_impact_counts.PRIVACY_WORSE} PRIVACY WORSE
            </span>
          </div>
        </div>

        {/* Right: Workspace Navigation & Export Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          <nav className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/workspace')}
              className="px-2.5 py-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs transition-colors cursor-pointer"
            >
              Workspace
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded bg-primary/20 text-primary border border-primary/40 text-xs font-semibold"
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
          2. Ledger Overview & Metric Ribbons
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Banner with Document Pair Context */}
        <div className="rounded-2xl bg-surface-container-low border border-outline-variant p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-mono-badge text-xs text-primary mb-1">
                <Brain className="size-4" />
                <span>FORENSIC CLAUSE DISCREPANCY AUDIT</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-display font-semibold text-on-surface">
                {old_policy.filename} vs {new_policy.filename}
              </h1>
              <p className="text-xs text-on-surface-variant mt-1 font-mono-code">
                Baseline: {old_policy.clause_count} clauses ({old_policy.word_count.toLocaleString()} words) · Revised: {new_policy.clause_count} clauses ({new_policy.word_count.toLocaleString()} words)
              </p>
            </div>

            {/* Quick Metrics Cluster */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-center min-w-[80px]">
                <span className="block text-lg font-mono font-bold text-on-surface">{summary.total_changes}</span>
                <span className="block text-[10px] font-mono-badge uppercase text-outline">Total</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-center min-w-[80px]">
                <span className="block text-lg font-mono font-bold text-emerald-400">{summary.valid_changes}</span>
                <span className="block text-[10px] font-mono-badge uppercase text-outline">Valid</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-center min-w-[80px]">
                <span className="block text-lg font-mono font-bold text-red-400">{summary.privacy_impact_counts.PRIVACY_WORSE}</span>
                <span className="block text-[10px] font-mono-badge uppercase text-outline">Worse</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-center min-w-[80px]">
                <span className="block text-lg font-mono font-bold text-emerald-400">{summary.privacy_impact_counts.PRIVACY_BETTER}</span>
                <span className="block text-[10px] font-mono-badge uppercase text-outline">Better</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-center min-w-[80px]">
                <span className="block text-lg font-mono font-bold text-amber-400">{summary.privacy_impact_counts.UNCLEAR}</span>
                <span className="block text-[10px] font-mono-badge uppercase text-outline">Unclear</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. Multi-Dimensional Filter Bar
           ───────────────────────────────────────────────────────────── */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant p-4 space-y-3 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="size-4 text-outline absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search clause text, legal section, rationale, or matched evidence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-9 pr-8 py-2 text-xs text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-outline hover:text-on-surface"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              )}
            </div>

            {/* Expand / Collapse All */}
            <div className="flex items-center gap-2 text-xs shrink-0">
              <button
                type="button"
                onClick={expandAll}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Filter Dropdowns: Change Type, Event Validity, Privacy Impact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-outline-variant text-xs">
            {/* 1. Change Type */}
            <div>
              <label className="block text-[10.5px] font-mono-badge uppercase text-outline mb-1">
                Change Type
              </label>
              <select
                value={selectedChangeType}
                onChange={(e) => setSelectedChangeType(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="ADDED">Added</option>
                <option value="MODIFIED">Modified</option>
                <option value="DELETED">Deleted</option>
                <option value="RESTRUCTURED">Restructured</option>
              </select>
            </div>

            {/* 2. Event Validity */}
            <div>
              <label className="block text-[10.5px] font-mono-badge uppercase text-outline mb-1">
                Event Validity
              </label>
              <select
                value={selectedValidity}
                onChange={(e) => setSelectedValidity(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="ALL">All Events</option>
                <option value="VALID">Valid Events Only</option>
                <option value="DEFECTS">Quality Defects Only</option>
                <option value="FRAGMENT">Fragment</option>
                <option value="HEADING_ONLY">Heading Only</option>
                <option value="CONTAMINATED">Contaminated</option>
                <option value="MISMATCHED_PAIR">Mismatched Pair</option>
                <option value="FALSE_ADDED_DELETED">False Added/Deleted</option>
                <option value="GARBLED">Garbled</option>
                <option value="TRUNCATED">Truncated</option>
              </select>
            </div>

            {/* 3. Privacy Impact */}
            <div>
              <label className="block text-[10.5px] font-mono-badge uppercase text-outline mb-1">
                Privacy Impact
              </label>
              <select
                value={selectedImpact}
                onChange={(e) => setSelectedImpact(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="ALL">All Impacts</option>
                <option value="PRIVACY_WORSE">Privacy Worse</option>
                <option value="PRIVACY_BETTER">Privacy Better</option>
                <option value="NO_PRIVACY_EFFECT">No Privacy Effect</option>
                <option value="UNCLEAR">Unclear / Ambiguous</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. Discrepancy Cards List
           ───────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-outline px-1">
            <span>Showing {filteredChanges.length} of {changes.length} change discrepancies</span>
          </div>

          {filteredChanges.map((change, index) => {
            const isExpanded = expandedCards[change.change_id] ?? (index === 0);
            const oldClause = change.before?.old_clause;
            const newClause = change.before?.new_clause;
            const classification = change.classification;
            const nli = change.nli;
            const sim = change.before?.semantic_similarity;
            const lexSim = change.before?.lexical_similarity;
            const features = change.privacy_features;
            const interpretation = change.privacy_interpretation;
            const cardHeading = resolveChangeCardHeading(change, oldSectionContext, newSectionContext);
            const oldSectionTitle = oldSectionContext.getEnclosingSection(oldClause, change.before?.old_clauses);
            const newSectionTitle = newSectionContext.getEnclosingSection(newClause, change.before?.new_clauses);

            return (
              <div
                key={change.change_id}
                className={`rounded-2xl border transition-all ${
                  change.privacy_impact === 'PRIVACY_WORSE'
                    ? 'border-red-500/30 bg-surface-container-lowest hover:border-red-500/50'
                    : change.privacy_impact === 'PRIVACY_BETTER'
                    ? 'border-emerald-500/30 bg-surface-container-lowest hover:border-emerald-500/50'
                    : 'border-outline-variant bg-surface-container-lowest hover:border-outline'
                }`}
              >
                {/* Card Header */}
                <div
                  onClick={() => toggleExpand(change.change_id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="font-mono-badge text-xs font-bold text-outline px-2 py-1 rounded bg-surface-container border border-outline-variant shrink-0">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <ChangeTypeBadge type={change.change_type} size="sm" />
                        <EventValidityBadge validity={change.event_validity} size="sm" />
                        <PrivacyImpactBadge impact={change.privacy_impact} size="sm" />
                      </div>
                      <h3 className="text-sm font-semibold text-on-surface" title={cardHeading}>
                        {cardHeading}
                        <span className="text-xs font-normal text-outline ml-2 font-mono-code">
                          ({change.change_id})
                        </span>
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {typeof sim === 'number' && (
                      <span className="font-mono-code text-xs text-primary font-semibold" title="Dense Cosine Semantic Similarity">
                        Sim: {(sim * 100).toFixed(1)}%
                      </span>
                    )}
                    <button
                      type="button"
                      className="p-1 rounded text-outline hover:text-on-surface"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Card Expanded Content */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-outline-variant/60 space-y-4 text-xs">
                    {/* Invalid Event Defect Alert (if event is not valid) */}
                    {!change.is_valid && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2.5">
                        <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-mono-badge text-[10.5px] uppercase font-bold block text-amber-400">
                            Event Quality Defect Flagged: {change.event_validity}
                          </span>
                          <p className="mt-0.5 text-xs text-amber-200/90 leading-relaxed">
                            {change.validation_reason || 'This event was flagged by event-boundary verification. Downstream impact classification is withheld to maintain audit accuracy.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Side-by-Side Clause Comparison Diff */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Old Clause */}
                      <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-outline font-mono-badge">
                          <span className="text-red-400 font-semibold truncate max-w-[200px]" title={oldSectionTitle}>
                            BASELINE: {oldSectionTitle}
                          </span>
                          <span>Pos #{oldClause?.position ?? 'N/A'} · {oldClause?.word_count ?? 0} words</span>
                        </div>
                        {oldClause?.text ? (
                          <p className={`font-clause-diff leading-relaxed text-xs ${
                            change.change_type === 'DELETED' ? 'text-red-300 line-through' : 'text-on-surface-variant'
                          }`}>
                            {oldClause.text}
                          </p>
                        ) : (
                          <p className="font-mono-code text-[11px] text-outline italic">
                            [Provision did not exist in baseline document]
                          </p>
                        )}
                      </div>

                      {/* New Clause */}
                      <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-outline font-mono-badge">
                          <span className="text-blue-400 font-semibold truncate max-w-[200px]" title={newSectionTitle}>
                            REVISED: {newSectionTitle}
                          </span>
                          <span>Pos #{newClause?.position ?? 'N/A'} · {newClause?.word_count ?? 0} words</span>
                        </div>
                        {newClause?.text ? (
                          <p className={`font-clause-diff leading-relaxed text-xs ${
                            change.change_type === 'ADDED' ? 'text-emerald-300 font-medium' : 'text-on-surface'
                          }`}>
                            {newClause.text}
                          </p>
                        ) : (
                          <p className="font-mono-code text-[11px] text-outline italic">
                            [Clause removed from revised policy]
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Similarity Metrics Strip */}
                    <div className="flex flex-wrap items-center gap-4 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant font-mono-code text-[11px] text-outline">
                      {typeof sim === 'number' && (
                        <span>Semantic Similarity: <strong className="text-on-surface">{(sim * 100).toFixed(1)}%</strong></span>
                      )}
                      {typeof lexSim === 'number' && (
                        <span>Lexical Similarity: <strong className="text-on-surface">{(lexSim * 100).toFixed(1)}%</strong></span>
                      )}
                      {typeof change.before?.token_change_ratio === 'number' && (
                        <span>Token Change: <strong className="text-on-surface">{(change.before.token_change_ratio * 100).toFixed(1)}%</strong></span>
                      )}
                    </div>

                    {/* Classification Rationale & Deep Forensics */}
                    {classification && (
                      <div className="p-4 rounded-xl bg-surface-container border border-outline-variant space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                            <Sparkles className="size-3.5" />
                            <span>Privacy Classification Rationale</span>
                          </span>
                          <div className="flex items-center gap-2 font-mono-badge text-[10px]">
                            <span className="px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant text-outline">
                              Confidence: {classification.confidence_level} ({Math.round(classification.confidence * 100)}%)
                            </span>
                            <span className="px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant text-outline">
                              Severity: {classification.severity}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-on-surface leading-relaxed">
                          {classification.rationale}
                        </p>

                        {/* Evidence & Facets */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-outline-variant">
                          {classification.facets && classification.facets.length > 0 && (
                            <div>
                              <span className="block text-[10.5px] font-mono-badge uppercase text-outline mb-1">
                                Affected Privacy Facets
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {classification.facets.map((facet, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono-badge"
                                  >
                                    {facet}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {classification.rules_fired && classification.rules_fired.length > 0 && (
                            <div>
                              <span className="block text-[10.5px] font-mono-badge uppercase text-outline mb-1">
                                Deterministic Rules Fired
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {classification.rules_fired.map((rule, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant text-[10px] font-mono-code"
                                  >
                                    {rule}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {classification.evidence && classification.evidence.length > 0 && (
                          <div className="pt-2 border-t border-outline-variant">
                            <span className="block text-[10.5px] font-mono-badge uppercase text-outline mb-1">
                              Matched Text Evidence
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 text-on-surface-variant font-mono-code text-[11px]">
                              {classification.evidence.map((ev, i) => (
                                <li key={i} className="text-primary-fixed">"{ev}"</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* NLI Bi-Directional Entailment Analysis */}
                    {nli && (nli.old_to_new || nli.new_to_old) && (
                      <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant space-y-2 font-mono-code text-[11px]">
                        <div className="flex items-center justify-between text-outline text-[10.5px] font-mono-badge">
                          <span>Cross-Encoder NLI Probabilities</span>
                          <span>Model: {nli.model_name || 'DeBERTa-v3'}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {nli.old_to_new && (
                            <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant space-y-1">
                              <span className="text-outline font-semibold block text-[10px]">
                                DIRECTION: BASELINE → REVISION
                              </span>
                              <div className="flex justify-between">
                                <span>Entailment:</span>
                                <strong className="text-emerald-400">{(nli.old_to_new.entailment * 100).toFixed(1)}%</strong>
                              </div>
                              <div className="flex justify-between">
                                <span>Contradiction:</span>
                                <strong className="text-red-400">{(nli.old_to_new.contradiction * 100).toFixed(1)}%</strong>
                              </div>
                              <div className="flex justify-between">
                                <span>Neutral:</span>
                                <strong className="text-outline">{(nli.old_to_new.neutral * 100).toFixed(1)}%</strong>
                              </div>
                            </div>
                          )}

                          {nli.new_to_old && (
                            <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant space-y-1">
                              <span className="text-outline font-semibold block text-[10px]">
                                DIRECTION: REVISION → BASELINE
                              </span>
                              <div className="flex justify-between">
                                <span>Entailment:</span>
                                <strong className="text-emerald-400">{(nli.new_to_old.entailment * 100).toFixed(1)}%</strong>
                              </div>
                              <div className="flex justify-between">
                                <span>Contradiction:</span>
                                <strong className="text-red-400">{(nli.new_to_old.contradiction * 100).toFixed(1)}%</strong>
                              </div>
                              <div className="flex justify-between">
                                <span>Neutral:</span>
                                <strong className="text-outline">{(nli.new_to_old.neutral * 100).toFixed(1)}%</strong>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Privacy Features & Feature Comparisons */}
                    {features?.comparisons && Object.keys(features.comparisons).length > 0 && (
                      <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant space-y-2">
                        <span className="text-[10.5px] font-mono-badge uppercase text-outline block">
                          Feature Dimension Deltas
                        </span>
                        <div className="space-y-1.5 font-mono-code text-[11px]">
                          {Object.entries(features.comparisons).map(([dim, comp]) => (
                            <div key={dim} className="p-2 rounded bg-surface-container-lowest border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="font-bold text-on-surface uppercase text-[10px] mr-2">
                                  {dim}:
                                </span>
                                {comp.added && comp.added.length > 0 && (
                                  <span className="text-emerald-400 mr-2">
                                    +{comp.added.join(', ')}
                                  </span>
                                )}
                                {comp.removed && comp.removed.length > 0 && (
                                  <span className="text-red-400 line-through mr-2">
                                    -{comp.removed.join(', ')}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-outline font-mono-badge">
                                Status: {comp.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Privacy Interpretation Signals */}
                    {interpretation?.signals && Object.keys(interpretation.signals).length > 0 && (
                      <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant space-y-2">
                        <span className="text-[10.5px] font-mono-badge uppercase text-outline block">
                          Interpretation Signals
                        </span>
                        <div className="space-y-1.5 font-mono-code text-[11px]">
                          {Object.entries(interpretation.signals).map(([sigKey, sig]) => (
                            <div key={sigKey} className="p-2 rounded bg-surface-container-lowest border border-outline-variant space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-on-surface uppercase text-[10px]">
                                  {sigKey}
                                </span>
                                <span className="text-primary font-mono-badge text-[10px]">
                                  {sig.direction}
                                </span>
                              </div>
                              <p className="text-xs text-on-surface-variant font-sans">
                                {sig.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredChanges.length === 0 && (
            <div className="p-12 text-center rounded-2xl bg-surface-container border border-outline-variant space-y-2">
              <p className="text-sm font-semibold text-on-surface">No discrepancies found</p>
              <p className="text-xs text-outline">
                Try adjusting your search query or loosening your filter criteria.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-lowest border-t border-outline-variant py-4 text-center text-xs text-outline">
        SneakyToS · Privacy Policy Forensic Audit Engine
      </footer>
    </div>
  );
}

export default ChangeAnalysis;
