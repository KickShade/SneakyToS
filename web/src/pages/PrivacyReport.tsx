// ============================================================================
// SneakyToS — Forensic Privacy Impact Audit Report
// Aligned with Google Stitch Design & Analysis Architecture
// ============================================================================

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Download,
  Share2,
  FileText,
  TrendingDown,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  Shield,
  PlusCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Badge } from '@/components/common/Badge';
import { mockPrivacyReport, mockDetailedComparison } from '@/services/mockData';

export function PrivacyReport() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const report = mockPrivacyReport;
  const comparison = mockDetailedComparison;
  const [copied, setCopied] = useState(false);

  // Prepare chart data comparing previous vs current category scores
  const chartData = report.categories.map((cat) => ({
    name: cat.name.split(' ')[0], // short name
    fullName: cat.name,
    Previous: cat.previousScore,
    Current: cat.score,
  }));

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ report, comparison }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `sneakytos-audit-${report.companyName.toLowerCase().replace(/\s+/g, '-')}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

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
            <span className="hover:text-on-surface transition-colors">{report.companyName}</span>
            <span className="text-outline-variant/80">/</span>
            <span className="text-primary font-semibold truncate max-w-xs md:max-w-sm flex items-center gap-1.5">
              Forensic Impact Report
            </span>
          </div>

          <div className="h-4 w-px bg-outline-variant/60 mx-1 hidden lg:block" />

          {/* Quick Counter Badge */}
          <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-error-container/20 border border-error/40 shadow-sm font-mono-badge text-[10px]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-error" />
            </span>
            <span className="text-error font-bold uppercase tracking-wider">
              High Risk Legal Regression
            </span>
          </div>
        </div>

        {/* Right Navigation & Actions */}
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
            onClick={() => navigate(`/comparison/${id || comparison.id}/changes`)}
            className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-xs font-body flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Discrepancy Ledger</span>
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
          2. Main Audit Report Container
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-5 md:p-8 space-y-6">
        {/* Top Header with Back & Export Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-outline-variant">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded font-mono-badge text-mono-badge bg-error-container/20 text-error border border-error/40 font-bold uppercase tracking-wider">
                COMPOSITE AUDIT VERDICT
              </span>
              <span className="text-outline text-xs font-mono-code">
                Evaluated on {new Date(report.generatedAt).toLocaleDateString()}
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface tracking-tight print:text-black">
              Executive Privacy Impact Report
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant mt-1 max-w-3xl print:text-gray-700">
              Automated legal risk quantification evaluating {report.companyName} across data collection, retention sovereignty, subprocessor syndication, and algorithmic training rights.
            </p>
          </div>

          {/* Action Buttons (Screen Only) */}
          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handleCopyLink}
              className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs text-on-surface font-body flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="size-3.5 text-primary" />
              {copied ? 'Copied URL!' : 'Share Audit'}
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs text-on-surface font-body flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="size-3.5 text-primary" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-8 px-4 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container text-xs font-mono-badge font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Download className="size-3.5" />
              Download PDF Report
            </button>
          </div>
        </div>

        {/* Executive Scorecard Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-surface-container-low rounded-xl border border-outline-variant p-6 shadow-sm print:border-gray-300 print:bg-gray-50">
          {/* Overall Health Score */}
          <div className="flex flex-col justify-center items-center md:border-r border-outline-variant p-4 text-center print:border-gray-300">
            <div className="text-[11px] font-mono-code text-outline uppercase tracking-wider mb-2 print:text-gray-600">
              Composite Privacy Health Score
            </div>
            <div className="text-6xl md:text-7xl font-display font-bold text-error">
              {report.overallScore}
              <span className="text-2xl text-outline font-normal">/100</span>
            </div>
            <div className="flex items-center gap-1.5 text-error text-xs font-mono-badge font-bold mt-3">
              <TrendingDown className="size-4" />
              <span>Dropped 41 points since v3.2 baseline</span>
            </div>
          </div>

          {/* Executive Summary Narrative */}
          <div className="md:col-span-2 flex flex-col justify-between p-2 space-y-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono-code text-primary font-semibold uppercase mb-1">
                <Sparkles className="size-3.5" />
                Executive Audit Summary
              </div>
              <h3 className="font-headline-sm font-semibold text-lg text-on-surface print:text-black">
                Significant Legal Regression: Secondary Use Rights &amp; Retention Expansion
              </h3>
              <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed mt-2 font-body print:text-gray-700">
                The updated Terms of Service introduce aggressive data expropriation rights, notably Section 4.2 asserting permission to train internal artificial intelligence and machine learning models on customer audio, video, transcripts, and telemetry without opt-out. Furthermore, data retention windows in Section 7.3 have transitioned from deterministic 90-day limits to unbounded discretionary durations.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 rounded bg-error-container/25 text-error text-xs font-mono-code border border-error-container/50 font-semibold">
                3 High-Risk Expansions
              </span>
              <span className="px-2.5 py-1 rounded bg-amber-950/30 text-amber-400 text-xs font-mono-code border border-amber-500/40 font-semibold">
                1 Unclear Discretionary Shift
              </span>
              <span className="px-2.5 py-1 rounded bg-surface-container text-on-surface-variant text-xs font-mono-code border border-outline-variant">
                1 Biometric Safeguard Added
              </span>
            </div>
          </div>
        </div>

        {/* Category Performance & Recharts Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Comparison Chart */}
          <div className="bg-surface-container-low rounded-xl border border-outline-variant p-5 flex flex-col justify-between shadow-sm print:border-gray-300">
            <div className="mb-4">
              <h3 className="font-headline-sm font-semibold text-on-surface text-base print:text-black">
                Privacy Pillar Comparison
              </h3>
              <p className="text-xs text-on-surface-variant font-body print:text-gray-600">
                Comparing Baseline (v3.2) vs Candidate (v4.0) across 5 core compliance domains
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#958e9e" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#958e9e" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#17202e',
                      borderColor: '#4a4453',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#dae3f6',
                    }}
                  />
                  <Bar dataKey="Previous" fill="#958e9e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Current" fill="#ffb4ab" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-6 text-xs font-mono-code pt-3 border-t border-outline-variant/60 print:border-gray-200">
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="size-3 rounded bg-[#958e9e]" /> Baseline v3.2
              </span>
              <span className="flex items-center gap-1.5 text-error font-semibold">
                <span className="size-3 rounded bg-[#ffb4ab]" /> Candidate v4.0
              </span>
            </div>
          </div>

          {/* Historical Score Progression */}
          <div className="bg-surface-container-low rounded-xl border border-outline-variant p-5 flex flex-col justify-between shadow-sm print:border-gray-300">
            <div className="mb-4">
              <h3 className="font-headline-sm font-semibold text-on-surface text-base print:text-black">
                Historical Autonomy Trajectory
              </h3>
              <p className="text-xs text-on-surface-variant font-body print:text-gray-600">
                Temporal track record of policy revisions and resulting user autonomy scores
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.timeline} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                  <XAxis dataKey="date" stroke="#958e9e" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#958e9e" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#17202e',
                      borderColor: '#4a4453',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#dae3f6',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#ffb4ab"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#ffb4ab' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="text-xs font-mono-code text-outline pt-3 border-t border-outline-variant/60 print:border-gray-200">
              Steepest decline recorded during Jan 2025 revision (-41 pts)
            </div>
          </div>
        </div>

        {/* Detailed Category Table */}
        <div className="bg-surface-container-low rounded-xl border border-outline-variant overflow-hidden shadow-sm print:border-gray-300">
          <div className="p-4 border-b border-outline-variant bg-surface-container-lowest print:border-gray-200 print:bg-gray-100">
            <h3 className="font-headline-sm font-semibold text-on-surface text-base print:text-black">
              Detailed Pillar Health Breakdown
            </h3>
          </div>

          <div className="divide-y divide-outline-variant/60 print:divide-gray-200">
            {report.categories.map((cat, idx) => (
              <div
                key={idx}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-high/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="font-medium text-sm text-on-surface font-body print:text-black">
                    {cat.name}
                  </div>
                  <div className="text-xs text-on-surface-variant font-mono-code">
                    {cat.changes} clause modification(s) audited
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-mono-code text-base font-bold text-on-surface print:text-black">
                      {cat.score}{' '}
                      <span className="text-xs text-outline font-normal">
                        (was {cat.previousScore})
                      </span>
                    </div>
                    <div
                      className={`text-xs font-mono-code ${
                        cat.score < cat.previousScore
                          ? 'text-error font-semibold'
                          : cat.score > cat.previousScore
                          ? 'text-tertiary font-semibold'
                          : 'text-outline'
                      }`}
                    >
                      {cat.score < cat.previousScore ? (
                        <span>▼ {cat.previousScore - cat.score} pts</span>
                      ) : cat.score > cat.previousScore ? (
                        <span>▲ {cat.score - cat.previousScore} pts</span>
                      ) : (
                        <span>— unchanged</span>
                      )}
                    </div>
                  </div>

                  <Badge
                    label={cat.trend.toUpperCase()}
                    variant={cat.trend === 'declining' ? 'danger' : 'safe'}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Forensic Mitigation & Recommendations */}
        <div className="bg-surface-container-low rounded-xl border border-primary/40 p-6 space-y-4 shadow-sm print:border-gray-300">
          <div className="flex items-center gap-2 text-primary font-headline-sm font-semibold text-base print:text-black">
            <ShieldAlert className="size-5" />
            Recommended Legal &amp; Technical Safeguards
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed font-body">
            <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant space-y-2 print:border-gray-300">
              <div className="font-semibold text-on-surface print:text-black">
                1. Enterprise DPA Override
              </div>
              <p className="text-on-surface-variant print:text-gray-700">
                Execute a custom Data Processing Addendum explicitly forbidding secondary AI/ML model training on corporate communication pipelines.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant space-y-2 print:border-gray-300">
              <div className="font-semibold text-on-surface print:text-black">
                2. Hard Retention Enforcement
              </div>
              <p className="text-on-surface-variant print:text-gray-700">
                Contractually mandate verifiable 90-day cryptographic purge certificates rather than consenting to discretionary business retention clauses.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant space-y-2 print:border-gray-300">
              <div className="font-semibold text-on-surface print:text-black">
                3. Subprocessor Notice Covenant
              </div>
              <p className="text-on-surface-variant print:text-gray-700">
                Require 30-day advance electronic notification and opt-out rights prior to customer telemetry exposure to advertising syndication partners.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PrivacyReport;
