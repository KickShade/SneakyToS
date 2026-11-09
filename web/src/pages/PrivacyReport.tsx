// ============================================================================
// SneakyToS — Forensic Privacy Impact Audit Report
// Aligned with Google Stitch Design & Real Backend Analysis Pipeline
// ============================================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Share2,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Shield,
  Printer,
  FileDown,
  UploadCloud,
  CheckCircle2,
  Brain,
  ShieldCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useComparison } from '@/context/ComparisonContext';
import {
  ChangeTypeBadge,
  PrivacyImpactBadge,
} from '@/components/common/Badge';
import {
  createDocumentSectionContext,
  resolveChangeCardHeading,
} from '@/utils/sectionUtils';

export function PrivacyReport() {
  const navigate = useNavigate();
  const { comparisonData } = useComparison();
  const [copied, setCopied] = useState(false);

  const changes = useMemo(() => comparisonData?.changes || [], [comparisonData]);

  // Document-level section resolution context for Baseline and Revised policies
  const oldSectionContext = useMemo(
    () => createDocumentSectionContext(changes, 'old'),
    [changes]
  );
  const newSectionContext = useMemo(
    () => createDocumentSectionContext(changes, 'new'),
    [changes]
  );

  // Aggregate facet impact distribution from real data
  const facetChartData = useMemo(() => {
    if (!comparisonData) return [];

    const facetMap: Record<
      string,
      { name: string; Worse: number; Better: number; Unclear: number; Neutral: number }
    > = {};

    changes.forEach((c) => {
      // Gather facets from classification or privacy features
      const facets: string[] = [];
      if (c.classification?.facets && c.classification.facets.length > 0) {
        facets.push(...c.classification.facets);
      } else if (c.privacy_features?.comparisons) {
        facets.push(...Object.keys(c.privacy_features.comparisons));
      } else {
        facets.push('general');
      }

      facets.forEach((f) => {
        const key = f.toLowerCase();
        if (!facetMap[key]) {
          facetMap[key] = {
            name: key.charAt(0).toUpperCase() + key.slice(1),
            Worse: 0,
            Better: 0,
            Unclear: 0,
            Neutral: 0,
          };
        }

        if (c.privacy_impact === 'PRIVACY_WORSE') facetMap[key].Worse += 1;
        else if (c.privacy_impact === 'PRIVACY_BETTER') facetMap[key].Better += 1;
        else if (c.privacy_impact === 'UNCLEAR') facetMap[key].Unclear += 1;
        else facetMap[key].Neutral += 1;
      });
    });

    return Object.values(facetMap);
  }, [comparisonData, changes]);

  // Adverse changes (Privacy Worse)
  const adverseChanges = useMemo(() => {
    return changes.filter((c) => c.privacy_impact === 'PRIVACY_WORSE');
  }, [changes]);

  // Protective changes (Privacy Better)
  const protectiveChanges = useMemo(() => {
    return changes.filter((c) => c.privacy_impact === 'PRIVACY_BETTER');
  }, [changes]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    if (!comparisonData) return;
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(comparisonData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `sneakytos-audit-report-${comparisonData.old_policy.filename}-vs-${comparisonData.new_policy.filename}.json`
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
            <span>SneakyToS Forensic Audit Report</span>
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
            Upload baseline and revised policies on the homepage to generate a comprehensive forensic privacy impact audit report.
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
  const counts = summary.privacy_impact_counts;

  const isNetWorse = counts.PRIVACY_WORSE > counts.PRIVACY_BETTER;
  const isNetBetter = counts.PRIVACY_BETTER > counts.PRIVACY_WORSE;

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased flex flex-col selection:bg-primary-container selection:text-on-primary-container print:bg-white print:text-black">
      {/* ─────────────────────────────────────────────────────────────
          1. Stitch Minimalist Top Bar Header (Hidden in Print)
         ───────────────────────────────────────────────────────────── */}
      <header className="h-14 w-full z-20 bg-surface-container-lowest border-b border-outline-variant px-5 flex items-center justify-between shrink-0 sticky top-0 backdrop-blur-md bg-opacity-95 print:hidden">
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
              Forensic Impact Report
            </span>
          </div>

          <div className="h-4 w-px bg-outline-variant/60 mx-1 hidden lg:block" />

          {/* Quick Counter Badge */}
          <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 shadow-sm font-mono-badge text-[10px]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
            </span>
            <span className="text-red-400 font-semibold">
              {counts.PRIVACY_WORSE} PRIVACY WORSE
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
              onClick={() => navigate('/changes')}
              className="px-2.5 py-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs transition-colors cursor-pointer"
            >
              Ledger ({changes.length})
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded bg-primary/20 text-primary border border-primary/40 text-xs font-semibold"
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
            onClick={handleCopyLink}
            className="p-1.5 px-2 rounded-lg border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
            title="Copy Report Link"
          >
            <Share2 className="size-3.5" />
            <span>{copied ? 'Copied!' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="p-1.5 rounded-lg border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
            title="Print / Save PDF"
          >
            <Printer className="size-4" />
          </button>

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
          2. Executive Audit Report Body
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* Document Comparison Executive Summary Card */}
        <section className="rounded-2xl bg-surface-container-low border border-outline-variant p-6 shadow-sm print:border-gray-300 print:bg-gray-50">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 font-mono-badge text-xs text-primary mb-2">
                <Brain className="size-4" />
                <span>EPHEMERAL FORENSIC AUDIT RECORD</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-on-surface print:text-black">
                Privacy Impact Audit: {old_policy.filename} vs {new_policy.filename}
              </h1>
              <p className="text-xs text-on-surface-variant print:text-gray-600 mt-1.5 leading-relaxed max-w-2xl">
                Generated via deep semantic clause alignment and bi-directional natural language inference. Evaluates changes to user rights, data collection permissions, and disclosure scopes.
              </p>
            </div>

            {/* Overall Verdict Badge */}
            <div className="p-4 rounded-xl border text-center shrink-0 min-w-[220px] bg-surface-container print:bg-white print:border-gray-300">
              <span className="block text-[10px] font-mono-badge uppercase text-outline mb-1">
                Forensic Privacy Drift
              </span>
              {isNetWorse ? (
                <div className="flex items-center justify-center gap-1.5 text-red-400 font-bold text-sm">
                  <TrendingDown className="size-4" />
                  <span>Adverse Rights Expansion</span>
                </div>
              ) : isNetBetter ? (
                <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-sm">
                  <TrendingUp className="size-4" />
                  <span>Protections Strengthened</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 text-amber-300 font-bold text-sm">
                  <CheckCircle2 className="size-4" />
                  <span>Neutral / Mixed Shift</span>
                </div>
              )}
              <span className="block text-[11px] font-mono-code text-outline mt-1">
                {counts.PRIVACY_WORSE} Worse vs {counts.PRIVACY_BETTER} Better
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-outline-variant print:border-gray-300">
            <div className="p-3 rounded-xl bg-surface-container border border-outline-variant print:bg-white print:border-gray-200">
              <span className="text-[10px] font-mono-badge uppercase text-outline block">Total Discrepancies</span>
              <span className="text-2xl font-mono font-bold text-on-surface print:text-black">{summary.total_changes}</span>
              <span className="text-[10px] text-outline block mt-0.5">{summary.valid_changes} valid · {summary.invalid_changes} filtered defects</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-container border border-outline-variant print:bg-white print:border-gray-200">
              <span className="text-[10px] font-mono-badge uppercase text-red-400 block">Privacy Worse</span>
              <span className="text-2xl font-mono font-bold text-red-400">{counts.PRIVACY_WORSE}</span>
              <span className="text-[10px] text-outline block mt-0.5">Expansive collection or sharing</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-container border border-outline-variant print:bg-white print:border-gray-200">
              <span className="text-[10px] font-mono-badge uppercase text-emerald-400 block">Privacy Better</span>
              <span className="text-2xl font-mono font-bold text-emerald-400">{counts.PRIVACY_BETTER}</span>
              <span className="text-[10px] text-outline block mt-0.5">Strengthened user safeguards</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-container border border-outline-variant print:bg-white print:border-gray-200">
              <span className="text-[10px] font-mono-badge uppercase text-amber-400 block">Unclear / Ambiguous</span>
              <span className="text-2xl font-mono font-bold text-amber-400">{counts.UNCLEAR}</span>
              <span className="text-[10px] text-outline block mt-0.5">Vague or mixed legal impact</span>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3. Privacy Facet Distribution (Recharts)
           ───────────────────────────────────────────────────────────── */}
        {facetChartData.length > 0 && (
          <section className="rounded-2xl bg-surface-container border border-outline-variant p-6 shadow-sm print:border-gray-300 print:bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-display font-semibold text-on-surface print:text-black">
                  Privacy Facet Impact Distribution
                </h2>
                <p className="text-xs text-on-surface-variant print:text-gray-600 mt-0.5">
                  Breakdown of detected modifications across privacy and data governance dimensions.
                </p>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facetChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Worse" fill="#f87171" name="Privacy Worse" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Better" fill="#34d399" name="Privacy Better" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Unclear" fill="#fbbf24" name="Unclear" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────
            4. Key Adverse Changes (High Priority / Privacy Worse)
           ───────────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-on-surface print:text-black flex items-center gap-2">
              <ShieldAlert className="size-5 text-red-400" />
              <span>Critical Adverse Modifications ({adverseChanges.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => navigate('/changes')}
              className="text-xs text-primary hover:underline font-semibold print:hidden"
            >
              View all in ledger →
            </button>
          </div>

          {adverseChanges.length > 0 ? (
            <div className="space-y-3">
              {adverseChanges.map((change, idx) => (
                <div
                  key={change.change_id}
                  className="rounded-xl bg-surface-container border border-red-500/30 p-4 space-y-2.5 print:border-gray-300 print:bg-white"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-badge text-[10px] text-outline bg-surface-container-lowest px-1.5 py-0.5 rounded border border-outline-variant">
                        #{idx + 1} ({change.change_id})
                      </span>
                      <h4 className="font-semibold text-on-surface print:text-black">
                        {resolveChangeCardHeading(change, oldSectionContext, newSectionContext)}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ChangeTypeBadge type={change.change_type} size="sm" />
                      <PrivacyImpactBadge impact={change.privacy_impact} size="sm" />
                    </div>
                  </div>

                  <p className="text-xs text-on-surface print:text-black leading-relaxed">
                    {change.classification?.rationale || 'Expansive privacy modifications identified in this clause.'}
                  </p>

                  {change.classification?.evidence && change.classification.evidence.length > 0 && (
                    <div className="p-2 rounded bg-surface-container-lowest border border-outline-variant font-mono-code text-[11px] text-red-300 print:text-red-700">
                      <strong>Matched Evidence:</strong> "{change.classification.evidence[0]}"
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                    {change.before?.old_clause?.text && (
                      <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant">
                        <span className="text-[10px] font-mono-badge uppercase text-outline block mb-1">Baseline</span>
                        <p className="font-clause-diff text-[11.5px] text-on-surface-variant line-through">{change.before.old_clause.text}</p>
                      </div>
                    )}
                    {change.before?.new_clause?.text && (
                      <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant">
                        <span className="text-[10px] font-mono-badge uppercase text-primary block mb-1">Revised</span>
                        <p className="font-clause-diff text-[11.5px] text-on-surface">{change.before.new_clause.text}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-surface-container border border-outline-variant text-center text-xs text-outline">
              No adverse privacy modifications detected between these policy versions.
            </div>
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────────
            Protective Safeguards Strengthened
           ───────────────────────────────────────────────────────────── */}
        {protectiveChanges.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-display font-semibold text-on-surface print:text-black flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-400" />
              <span>Protective Safeguards Strengthened ({protectiveChanges.length})</span>
            </h2>

            <div className="space-y-3">
              {protectiveChanges.map((change, idx) => (
                <div
                  key={change.change_id}
                  className="rounded-xl bg-surface-container border border-emerald-500/30 p-4 space-y-2.5 print:border-gray-300 print:bg-white"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-badge text-[10px] text-outline bg-surface-container-lowest px-1.5 py-0.5 rounded border border-outline-variant">
                        #{idx + 1} ({change.change_id})
                      </span>
                      <h4 className="font-semibold text-on-surface print:text-black">
                        {resolveChangeCardHeading(change, oldSectionContext, newSectionContext)}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ChangeTypeBadge type={change.change_type} size="sm" />
                      <PrivacyImpactBadge impact={change.privacy_impact} size="sm" />
                    </div>
                  </div>

                  <p className="text-xs text-on-surface print:text-black leading-relaxed">
                    {change.classification?.rationale || 'Strengthened privacy rights and protection safeguards.'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────
            5. Document Technical Details & Metrics
           ───────────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-surface-container border border-outline-variant p-6 space-y-4 print:border-gray-300 print:bg-white">
          <h2 className="text-base font-display font-semibold text-on-surface print:text-black">
            Document Ingestion & Alignment Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono-code">
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-2">
              <span className="text-red-400 font-bold block">BASELINE: {old_policy.filename}</span>
              <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                <span className="text-outline">File Format:</span>
                <span className="text-on-surface uppercase">{old_policy.file_type}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                <span className="text-outline">Total Clauses:</span>
                <span className="text-on-surface">{old_policy.clause_count}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                <span className="text-outline">Word Count:</span>
                <span className="text-on-surface">{old_policy.word_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Character Count:</span>
                <span className="text-on-surface">{old_policy.character_count.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-2">
              <span className="text-blue-400 font-bold block">REVISED: {new_policy.filename}</span>
              <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                <span className="text-outline">File Format:</span>
                <span className="text-on-surface uppercase">{new_policy.file_type}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                <span className="text-outline">Total Clauses:</span>
                <span className="text-on-surface">{new_policy.clause_count}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/40 pb-1">
                <span className="text-outline">Word Count:</span>
                <span className="text-on-surface">{new_policy.word_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Character Count:</span>
                <span className="text-on-surface">{new_policy.character_count.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-lowest border-t border-outline-variant py-4 text-center text-xs text-outline print:hidden">
        SneakyToS · Privacy Policy Forensic Audit Engine
      </footer>
    </div>
  );
}

export default PrivacyReport;
