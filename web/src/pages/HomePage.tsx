// ============================================================================
// SneakyToS — Direct-Use Homepage & Policy Upload Interface
// Source of Truth: Google Stitch Screen 7888dd4f46db4d638e092ee17cdd26a5
// ============================================================================

import { useState, useRef, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  Lock,
  FileText,
  UploadCloud,
  ArrowRight,
  ArrowDown,
  PlayCircle,
  RefreshCw,
  Trash2,
  HelpCircle,
  X,
  Eye,
  Brain,
  LockKeyhole,
  AlertTriangle,
} from 'lucide-react';

interface StagedFile {
  name: string;
  size: string;
  clauses: string;
  date: string;
  rawFile?: File;
}

export function HomePage() {
  const navigate = useNavigate();

  // Baseline (OLD) Document
  const [oldFile, setOldFile] = useState<StagedFile | null>({
    name: 'tos_v3.2_baseline.pdf',
    size: '1.4 MB',
    clauses: '1,328 parsed clauses',
    date: 'Nov 14, 2023',
  });

  // Revised (NEW) Document
  const [newFile, setNewFile] = useState<StagedFile | null>({
    name: 'tos_v4.0_2025_update.pdf',
    size: '2.1 MB',
    clauses: '1,412 clauses',
    date: 'Jan 15, 2025',
  });

  // Metadata inputs
  const [companyName, setCompanyName] = useState('OmniCloud Global Ltd.');
  const [policyTitle, setPolicyTitle] = useState('Enterprise Terms of Service & Privacy Addendum');
  const [baselineDate, setBaselineDate] = useState('Nov 14, 2023');
  const [revisedDate, setRevisedDate] = useState('Jan 15, 2025');

  // Modal and drag states
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isDraggingOld, setIsDraggingOld] = useState(false);
  const [isDraggingNew, setIsDraggingNew] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fileInputOldRef = useRef<HTMLInputElement>(null);
  const fileInputNewRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, target: 'old' | 'new') => {
    e.preventDefault();
    if (target === 'old') setIsDraggingOld(false);
    else setIsDraggingNew(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const staged: StagedFile = {
        name: file.name,
        size: formatFileSize(file.size),
        clauses: '~1,200 parsed clauses',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        rawFile: file,
      };
      if (target === 'old') setOldFile(staged);
      else setNewFile(staged);
    }
  };

  const handleSelectFile = (file: File, target: 'old' | 'new') => {
    const staged: StagedFile = {
      name: file.name,
      size: formatFileSize(file.size),
      clauses: '~1,200 parsed clauses',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      rawFile: file,
    };
    if (target === 'old') setOldFile(staged);
    else setNewFile(staged);
  };

  const bothFilesReady = !!oldFile && !!newFile;

  const handleAnalyze = () => {
    if (!bothFilesReady) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      navigate('/analysis-progress/comp-omnicloud-v3-v4');
    }, 400);
  };

  const scrollToWorkspace = () => {
    const el = document.getElementById('workspace');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface antialiased min-h-screen flex flex-col justify-between tactical-mesh selection:bg-primary selection:text-on-primary">
      {/* ─────────────────────────────────────────────────────────────
          1. Top App Header (Stitch Blueprint)
         ───────────────────────────────────────────────────────────── */}
      <header className="w-full bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-50">
        <div className="w-full h-14 px-6 max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-lg font-display font-semibold tracking-tight text-on-surface flex items-center gap-2 text-left"
            >
              <div className="w-7 h-7 rounded bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary-container">
                <Shield className="size-4 text-primary fill-primary/20" />
              </div>
              <span>SneakyToS</span>
            </button>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-4 ml-2">
              <button
                type="button"
                onClick={() => setShowHowItWorks(true)}
                className="text-xs font-body text-on-surface-variant hover:text-on-surface transition-colors py-1 cursor-pointer"
              >
                How It Works
              </button>
              <a
                href="#about"
                className="text-xs font-body text-on-surface-variant hover:text-on-surface transition-colors py-1"
              >
                About
              </a>
            </nav>
          </div>

          {/* Trailing action cluster */}
          <div className="flex items-center gap-3">
            <div
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-on-surface-variant bg-surface-container border border-outline-variant/60"
              title="Security & Cryptographic Guarantees"
            >
              <Lock className="size-3 text-tertiary" />
              <span className="font-mono-code text-[11px] text-tertiary font-medium">Zero-Store</span>
            </div>

            <button
              type="button"
              onClick={() => setShowHowItWorks(true)}
              className="p-1.5 rounded text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
              title="Help & Documentation"
            >
              <HelpCircle className="size-4" />
            </button>

            <button
              type="button"
              onClick={scrollToWorkspace}
              className="inline-flex items-center gap-1.5 bg-primary-container text-on-primary-container px-3.5 py-1.5 rounded text-xs font-medium hover:bg-primary active:scale-[0.98] transition-all glow-primary cursor-pointer"
            >
              <span>+ New Comparison</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. Hero Section
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-grow">
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-12 text-center relative">
          {/* Ephemeral Security Beacon Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant mb-6 shadow-sm">
            <span className="size-2 rounded-full bg-tertiary animate-pulse" />
            <span className="font-mono-badge text-[10.5px] text-tertiary tracking-wider font-semibold uppercase">
              ZERO RETENTION · CLIENT-EPHEMERAL ANALYSIS
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl font-display font-semibold text-on-surface max-w-4xl mx-auto tracking-tight mb-4 leading-tight">
            Privacy policies change.<br className="hidden sm:inline" />{' '}
            <span className="text-primary">Do you know what you're agreeing to?</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base font-body text-on-surface-variant max-w-2xl mx-auto mb-8 leading-relaxed">
            Compare old and updated privacy policies to uncover hidden changes, understand their implications, and discover how your privacy rights may be affected.
          </p>

          {/* Action Cluster */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
            <button
              type="button"
              onClick={scrollToWorkspace}
              className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary active:scale-[0.98] transition-all glow-primary cursor-pointer shadow-lg"
            >
              <span>Compare Policies</span>
              <ArrowDown className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowHowItWorks(true)}
              className="inline-flex items-center gap-2 bg-surface-container-high border border-outline-variant text-on-surface px-5 py-3 rounded-lg text-sm font-medium hover:bg-surface-bright active:scale-[0.98] transition-all cursor-pointer"
            >
              <PlayCircle className="size-4 text-primary" />
              <span>How It Works</span>
            </button>
          </div>

          {/* Live Diff Teaser Graphic (Stitch Card Blueprint) */}
          <div className="max-w-4xl mx-auto rounded-xl bg-surface-container-low border border-outline-variant p-4 shadow-2xl relative overflow-hidden backdrop-blur text-left">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-error" />
                <span className="size-2.5 rounded-full bg-secondary" />
                <span className="size-2.5 rounded-full bg-tertiary" />
                <span className="ml-2 font-mono-code text-xs text-outline">
                  diff_stream_preview: Clause 14.b (Data Brokers & Cross-Border AI)
                </span>
              </div>
              <span className="font-mono-badge text-[10px] text-error bg-surface-container px-2 py-0.5 rounded border border-outline-variant">
                Risk Escalation: High
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono-code text-xs">
              {/* Left Baseline Diff Snippet */}
              <div className="p-3.5 rounded bg-surface-container border-l-2 border-outline-variant text-on-surface-variant flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-outline font-semibold mb-1 flex items-center justify-between">
                    <span>V3.2 (2023) — BASELINE</span>
                    <span className="text-error line-through">-18 words</span>
                  </div>
                  <p className="font-clause-diff text-[13px] text-on-surface-variant leading-relaxed">
                    "We do not sell, rent, or trade your personally identifiable browsing habits to third-party ad networks or unauthorized commercial data aggregators."
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-outline-variant/40 flex items-center gap-2 text-[11px] text-outline">
                  <Lock className="size-3.5" />
                  <span>Explicit affirmative consent clause</span>
                </div>
              </div>

              {/* Right Revised Diff Snippet */}
              <div className="p-3.5 rounded bg-surface-container border-l-2 border-primary text-on-surface flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-primary font-semibold mb-1 flex items-center justify-between">
                    <span>V4.0 (2025) — CURRENT REVISION</span>
                    <span className="text-tertiary">+34 words (expanded scope)</span>
                  </div>
                  <p className="font-clause-diff text-[13px] text-on-surface leading-relaxed">
                    "We may share pseudonymized telemetry, behavioral prompts, and interaction logs with{' '}
                    <span className="bg-primary/20 text-primary-fixed font-medium px-1 rounded">
                      qualified AI model development partners
                    </span>{' '}
                    and affiliates for algorithmic refinement."
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-outline-variant/40 flex items-center gap-2 text-[11px] text-error">
                  <AlertTriangle className="size-3.5 text-error" />
                  <span>Implicit biometric & interaction training grant</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3. Dual-Zone Document Upload Workspace (Centerpiece)
           ───────────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-10" id="workspace">
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-outline-variant pb-4">
            <div>
              <h2 className="text-2xl font-display font-semibold text-on-surface tracking-tight">
                Select Two Policy Versions
              </h2>
              <p className="text-sm font-body text-on-surface-variant mt-1">
                Upload or paste previous and revised documents to run deep semantic clause alignment.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono-badge text-xs text-outline">
              <ShieldCheck className="size-4 text-tertiary" />
              <span>In-Memory RAM Sandbox Active</span>
            </div>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputOldRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleSelectFile(e.target.files[0], 'old');
              }
            }}
          />
          <input
            ref={fileInputNewRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleSelectFile(e.target.files[0], 'new');
              }
            }}
          />

          {/* Side-by-Side Interactive Upload Cards with Central Connector */}
          <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-center">
            {/* ── LEFT CARD: OLD POLICY (Baseline Document) ── */}
            <div className="bg-surface-container rounded-xl border border-outline-variant p-6 relative flex flex-col justify-between shadow-lg hover:border-primary/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="font-mono-badge text-[10.5px] text-outline uppercase tracking-wider block">
                    Baseline Input
                  </span>
                  <h3 className="text-lg font-display text-on-surface font-semibold">
                    OLD POLICY
                  </h3>
                  <p className="text-xs text-on-surface-variant">Original Version (Baseline)</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-surface-container-high border border-outline-variant font-mono-code text-xs text-on-surface-variant">
                  v_base
                </span>
              </div>

              {/* Staged Document Card or Dropzone */}
              {oldFile ? (
                <div className="rounded-lg bg-surface-container-lowest border border-outline-variant p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded bg-error-container/20 border border-error-container/40 flex items-center justify-center text-error shrink-0">
                      <FileText className="size-5" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono-code text-xs text-on-surface font-medium truncate">
                          {oldFile.name}
                        </span>
                        <span className="font-mono-badge text-[10px] text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded">
                          Parsed OK
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-outline mt-1 font-mono-code text-[11px]">
                        <span>{oldFile.size}</span>
                        <span>•</span>
                        <span>{oldFile.clauses}</span>
                        <span>•</span>
                        <span>{oldFile.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-outline-variant">
                    <button
                      type="button"
                      onClick={() => fileInputOldRef.current?.click()}
                      className="px-2.5 py-1 rounded text-xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="size-3" />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOldFile(null)}
                      className="px-2.5 py-1 rounded text-xs text-error hover:bg-error-container/20 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="size-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOld(true);
                  }}
                  onDragLeave={() => setIsDraggingOld(false)}
                  onDrop={(e) => handleDrop(e, 'old')}
                  onClick={() => fileInputOldRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center mb-4 ${
                    isDraggingOld
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant hover:bg-surface-container-high'
                  }`}
                >
                  <UploadCloud className="size-8 text-outline mb-2" />
                  <span className="text-sm text-on-surface font-medium">
                    Drag & drop PDF, DOCX, or TXT
                  </span>
                  <span className="text-xs text-outline mt-1">
                    or click to Browse Files (Max 50MB)
                  </span>
                </div>
              )}

              <div className="text-[11px] font-mono-code text-outline text-right">
                OCR Searchable Supported
              </div>
            </div>

            {/* ── CENTER GLYPH: Bi-directional Purple Diff Connector ── */}
            <div className="flex lg:flex-col items-center justify-center my-2 lg:my-0 z-10">
              <div className="size-12 rounded-full bg-surface-container-high border-2 border-primary-container flex items-center justify-center text-primary glow-primary shadow-xl">
                <RefreshCw className="size-5" />
              </div>
              <span className="hidden lg:block font-mono-badge text-[11px] text-outline mt-2 tracking-widest uppercase">
                VS
              </span>
            </div>

            {/* ── RIGHT CARD: NEW POLICY (Revision Document) ── */}
            <div className="bg-surface-container rounded-xl border border-outline-variant p-6 relative flex flex-col justify-between shadow-lg hover:border-primary/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="font-mono-badge text-[10.5px] text-primary uppercase tracking-wider block">
                    Revision Target
                  </span>
                  <h3 className="text-lg font-display text-on-surface font-semibold">
                    NEW POLICY
                  </h3>
                  <p className="text-xs text-on-surface-variant">Updated Version (Revision)</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-surface-container-high border border-outline-variant font-mono-code text-xs text-primary">
                  v_revised
                </span>
              </div>

              {/* Staged Document Card or Dropzone */}
              {newFile ? (
                <div className="rounded-lg bg-surface-container-lowest border border-outline-variant p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded bg-primary-container/20 border border-primary-container/40 flex items-center justify-center text-primary shrink-0">
                      <FileText className="size-5" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono-code text-xs text-on-surface font-medium truncate">
                          {newFile.name}
                        </span>
                        <span className="font-mono-badge text-[10px] text-secondary bg-secondary-container/30 px-1.5 py-0.5 rounded">
                          Indexed Ready
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-outline mt-1 font-mono-code text-[11px]">
                        <span>{newFile.size}</span>
                        <span>•</span>
                        <span>{newFile.clauses}</span>
                        <span>•</span>
                        <span>{newFile.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-outline-variant">
                    <button
                      type="button"
                      onClick={() => fileInputNewRef.current?.click()}
                      className="px-2.5 py-1 rounded text-xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="size-3" />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewFile(null)}
                      className="px-2.5 py-1 rounded text-xs text-error hover:bg-error-container/20 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="size-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingNew(true);
                  }}
                  onDragLeave={() => setIsDraggingNew(false)}
                  onDrop={(e) => handleDrop(e, 'new')}
                  onClick={() => fileInputNewRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center mb-4 ${
                    isDraggingNew
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant hover:bg-surface-container-high'
                  }`}
                >
                  <UploadCloud className="size-8 text-primary mb-2" />
                  <span className="text-sm text-on-surface font-medium">
                    Drag & drop updated policy
                  </span>
                  <span className="text-xs text-outline mt-1">
                    or click to Browse Files (Max 50MB)
                  </span>
                </div>
              )}

              <div className="text-[11px] font-mono-code text-outline text-right">
                Instant Optical Layout Matching
              </div>
            </div>
          </div>

          {/* Additional Optional Metadata Inputs */}
          <div className="mt-6 bg-surface-container rounded-xl border border-outline-variant p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-primary text-sm font-semibold">Comparison Metadata</span>
                <span className="text-xs text-outline">(Optional)</span>
              </div>
              <span className="font-mono-badge text-[10.5px] text-outline">
                Assists in legal audit categorization
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-body text-outline mb-1.5">
                  Company / Organization
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-body text-outline mb-1.5">Policy Title</label>
                <input
                  type="text"
                  value={policyTitle}
                  onChange={(e) => setPolicyTitle(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-body text-outline mb-1.5">Baseline Date</label>
                <input
                  type="text"
                  value={baselineDate}
                  onChange={(e) => setBaselineDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-body text-outline mb-1.5">Revised Date</label>
                <input
                  type="text"
                  value={revisedDate}
                  onChange={(e) => setRevisedDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Primary Action Trigger & Security Badging */}
          <div className="mt-8 text-center flex flex-col items-center">
            <button
              type="button"
              disabled={!bothFilesReady || isAnalyzing}
              onClick={handleAnalyze}
              className={`w-full sm:w-auto min-w-[320px] inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-display font-semibold transition-all shadow-xl ${
                bothFilesReady && !isAnalyzing
                  ? 'bg-gradient-to-r from-primary-container via-primary to-inverse-primary text-on-primary-container hover:brightness-110 active:scale-[0.98] glow-primary cursor-pointer'
                  : 'bg-surface-container-high text-outline cursor-not-allowed opacity-50'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="size-5 animate-spin" />
                  <span>Aligning 2,740 Clauses...</span>
                </>
              ) : (
                <>
                  <span>Analyze Policy Changes</span>
                  <ArrowRight className="size-5" />
                </>
              )}
            </button>

            {!bothFilesReady && (
              <p className="mt-2 text-xs text-error font-mono-badge">
                * Please select or upload both baseline and revised policy files to proceed
              </p>
            )}

            <p className="mt-4 text-xs font-body text-outline flex items-center justify-center gap-2">
              <Lock className="size-3.5 text-tertiary" />
              <span>
                Supported: PDF (searchable & OCR), DOCX, TXT · Up to 50MB per file · Documents wiped immediately upon session close
              </span>
            </p>
          </div>

          {/* 6-Stage Pipeline Roadmap Preview Card */}
          <div className="mt-12 bg-surface-container-low rounded-xl border border-outline-variant p-6 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-mono-badge text-on-surface-variant font-semibold uppercase tracking-wider">
                How the SneakyToS Engine Operates
              </h4>
              <span className="font-mono-badge text-[11px] text-primary">
                6-Stage Ephemeral Pipeline
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { stage: '01', title: 'Text Ingestion', sub: 'Strip header junk', color: 'text-primary' },
                { stage: '02', title: 'Clause Segmentation', sub: 'AST breakdown', color: 'text-primary' },
                { stage: '03', title: 'Semantic Alignment', sub: 'Cosine matching', color: 'text-primary' },
                { stage: '04', title: 'Event Detection', sub: 'Add / Sub / Mod', color: 'text-tertiary' },
                { stage: '05', title: 'Privacy Impact NLI', sub: 'Rights reduction', color: 'text-tertiary' },
                { stage: '06', title: 'Evidence Report', sub: 'Interactive diff', color: 'text-primary' },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="bg-surface-container rounded-lg p-3 border border-outline-variant flex flex-col justify-between"
                >
                  <span className={`font-mono-badge text-[10px] font-semibold ${step.color}`}>
                    {step.stage} / STAGE
                  </span>
                  <div className="mt-2 text-xs font-body font-medium text-on-surface">
                    {step.title}
                  </div>
                  <div className="text-[11px] text-outline mt-1 font-mono-code">{step.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            4. Explainer Grid Section
           ───────────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-12 border-t border-outline-variant" id="about">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container p-6 rounded-xl border border-outline-variant">
              <div className="size-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                <Eye className="size-5" />
              </div>
              <h3 className="text-base font-display text-on-surface font-semibold mb-2">
                Unbiased Legal Diffing
              </h3>
              <p className="text-xs font-body text-on-surface-variant leading-relaxed">
                Standard word diffs produce unreadable clutter when paragraphs are reorganized. Our syntactic parser isolates legal predicates, identifying scope expansion and arbitration waivers independently of formatting changes.
              </p>
            </div>

            <div className="bg-surface-container p-6 rounded-xl border border-outline-variant">
              <div className="size-10 rounded bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary mb-4">
                <Brain className="size-5" />
              </div>
              <h3 className="text-base font-display text-on-surface font-semibold mb-2">
                Natural Language Inference
              </h3>
              <p className="text-xs font-body text-on-surface-variant leading-relaxed">
                We evaluate changes against rigorous privacy-preserving benchmarks: GDPR, CCPA, and CPRA rights. Changes are categorized by risk level: Privacy Gain, Ambiguous Wording, or Escalated Risk.
              </p>
            </div>

            <div className="bg-surface-container p-6 rounded-xl border border-outline-variant">
              <div className="size-10 rounded bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary mb-4">
                <LockKeyhole className="size-5" />
              </div>
              <h3 className="text-base font-display text-on-surface font-semibold mb-2">
                Cryptographic Ephemerality
              </h3>
              <p className="text-xs font-body text-on-surface-variant leading-relaxed">
                Your uploaded drafts and corporate agreements are kept entirely in encrypted volatile memory. No user account is needed, no cookies track your queries, and documents are securely discarded the instant your diff executes.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          5. "How It Works" Interactive Modal
         ───────────────────────────────────────────────────────────── */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/80 backdrop-blur-md">
          <div className="bg-surface-container border border-outline-variant rounded-xl max-w-xl w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant mb-4">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                <h3 className="text-base font-display text-on-surface font-semibold">
                  How SneakyToS Parses Clauses
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs font-body text-on-surface-variant leading-relaxed">
              <p>
                1. <strong className="text-on-surface">Dual Document Normalization:</strong> PDFs, DOCX, and raw text are parsed using layout-aware OCR. Footers, page numbers, and redundant TOCs are stripped.
              </p>
              <p>
                2. <strong className="text-on-surface">Semantic Chunking:</strong> Rather than line-by-line diffing, terms are split into discrete legal obligations and data-handling promises.
              </p>
              <p>
                3. <strong className="text-on-surface">Risk Triaging:</strong> Our fine-tuned legal NLI classifier highlights newly claimed rights (e.g., training AI models, cross-border data transfer, unilateral updates) in red, and removals in green.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-outline-variant flex justify-end">
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="bg-primary-container text-on-primary-container px-4 py-2 rounded text-xs font-medium hover:bg-primary transition-colors cursor-pointer"
              >
                Got It, Back to Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. Footer
         ───────────────────────────────────────────────────────────── */}
      <footer className="w-full bg-surface-container-lowest border-t border-outline-variant">
        <div className="w-full py-6 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-body">
          <div className="text-center md:text-left">
            <div className="text-on-surface-variant flex items-center justify-center md:justify-start gap-2 mb-1">
              <Shield className="size-4 text-primary" />
              <span className="font-semibold text-on-surface">SneakyToS</span>
              <span className="text-outline">· Tactical Policy Intelligence</span>
            </div>
            <p className="text-outline text-[11px] max-w-xl">
              © SneakyToS. Automated privacy-policy analysis for informational purposes only. Not legal advice. Zero data retention guaranteed.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-outline text-xs">
            <button
              type="button"
              onClick={() => setShowHowItWorks(true)}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Zero-Retention Policy
            </button>
            <a href="#about" className="hover:text-primary transition-colors">
              Open Diff Specs
            </a>
            <a href="#about" className="hover:text-primary transition-colors">
              Documentation
            </a>
            <a href="#about" className="hover:text-primary transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
