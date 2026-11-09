// ============================================================================
// SneakyToS — Direct-Use Homepage & Policy Upload Interface
// Source of Truth: Google Stitch Screen 7888dd4f46db4d638e092ee17cdd26a5
// Fully integrated with FastAPI backend (POST /api/v1/compare)
// ============================================================================

import { useState, useEffect, useRef, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
  Brain,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useComparison } from '@/context/ComparisonContext';
import { validatePolicyFile } from '@/services/comparisonService';
import { checkBackendHealth } from '@/services/api';
import type { StagedFile } from '@/types';

export function HomePage() {
  const navigate = useNavigate();
  const { comparisonData, isLoading, error, executeCompare, setError, clearComparison } =
    useComparison();

  // Real-time backend status checking
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    let mounted = true;
    checkBackendHealth()
      .then(() => {
        if (mounted) setBackendStatus('online');
      })
      .catch(() => {
        if (mounted) setBackendStatus('offline');
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Baseline (OLD) Document
  const [oldFile, setOldFile] = useState<StagedFile | null>(null);

  // Revised (NEW) Document
  const [newFile, setNewFile] = useState<StagedFile | null>(null);

  // UI drag & modal states
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isDraggingOld, setIsDraggingOld] = useState(false);
  const [isDraggingNew, setIsDraggingNew] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputOldRef = useRef<HTMLInputElement>(null);
  const fileInputNewRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSelectFile = (file: File, target: 'old' | 'new') => {
    setValidationError(null);
    setError(null);

    const validation = validatePolicyFile(file);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid file format');
      return;
    }

    const staged: StagedFile = {
      name: file.name,
      size: formatFileSize(file.size),
      sizeBytes: file.size,
      type: file.name.endsWith('.pdf') ? 'PDF' : 'TXT',
      rawFile: file,
    };

    if (target === 'old') setOldFile(staged);
    else setNewFile(staged);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, target: 'old' | 'new') => {
    e.preventDefault();
    if (target === 'old') setIsDraggingOld(false);
    else setIsDraggingNew(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0], target);
    }
  };

  const bothFilesReady = !!oldFile && !!newFile;

  const handleAnalyze = async () => {
    if (!oldFile || !newFile || isLoading) return;
    setValidationError(null);
    setError(null);

    try {
      await executeCompare(oldFile.rawFile, newFile.rawFile);
      navigate('/workspace');
    } catch {
      // Error is set in context and displayed in UI
    }
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
              className="text-lg font-display font-semibold tracking-tight text-on-surface text-left cursor-pointer"
            >
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
              {comparisonData && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/workspace')}
                    className="text-xs font-body text-primary hover:text-on-surface transition-colors py-1 cursor-pointer"
                  >
                    Current Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/changes')}
                    className="text-xs font-body text-on-surface-variant hover:text-on-surface transition-colors py-1 cursor-pointer"
                  >
                    Discrepancy Ledger
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/report')}
                    className="text-xs font-body text-on-surface-variant hover:text-on-surface transition-colors py-1 cursor-pointer"
                  >
                    Impact Report
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Trailing action cluster */}
          <div className="flex items-center gap-3">
            <div
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-on-surface-variant bg-surface-container border border-outline-variant/60"
              title="Security & Ephemeral Analysis"
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

            {comparisonData ? (
              <button
                type="button"
                onClick={() => navigate('/workspace')}
                className="inline-flex items-center gap-1.5 bg-primary-container text-on-primary-container px-3.5 py-1.5 rounded text-xs font-medium hover:bg-primary active:scale-[0.98] transition-all glow-primary cursor-pointer"
              >
                <span>Open Workspace</span>
                <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={scrollToWorkspace}
                className="inline-flex items-center gap-1.5 bg-primary-container text-on-primary-container px-3.5 py-1.5 rounded text-xs font-medium hover:bg-primary active:scale-[0.98] transition-all glow-primary cursor-pointer"
              >
                <span>+ New Comparison</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. Hero Section
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-grow">
        {/* Active Comparison Banner if one is already cached */}
        {comparisonData && (
          <div className="bg-primary/10 border-b border-primary/20 px-6 py-2.5">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-primary font-mono-code">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>
                  Active Comparison Loaded:{' '}
                  <strong>{comparisonData.old_policy.filename}</strong> vs{' '}
                  <strong>{comparisonData.new_policy.filename}</strong> (
                  {comparisonData.summary.total_changes} changes detected)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/workspace')}
                  className="px-2.5 py-1 rounded bg-primary text-on-primary font-semibold hover:brightness-110 cursor-pointer"
                >
                  View Workspace
                </button>
                <button
                  type="button"
                  onClick={() => clearComparison()}
                  className="px-2.5 py-1 rounded bg-surface-container text-outline hover:text-on-surface cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="max-w-7xl mx-auto px-6 pt-12 pb-10 text-center relative">
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
            Compare baseline and revised privacy policies to uncover hidden clause changes, audit NLI entailment shifts, and classify privacy impact before agreeing.
          </p>

          {/* Action Cluster */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
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
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3. Dual-Zone Document Upload Workspace (Centerpiece)
           ───────────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-8" id="workspace">
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-outline-variant pb-4">
            <div>
              <h2 className="text-2xl font-display font-semibold text-on-surface tracking-tight">
                Select Two Policy Versions
              </h2>
              <p className="text-sm font-body text-on-surface-variant mt-1">
                Upload original and revised policy documents (.txt or .pdf, max 20 MB each) for deep neural clause alignment.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono-badge text-xs">
              {backendStatus === 'online' ? (
                <>
                  <ShieldCheck className="size-4 text-emerald-400" />
                  <span className="text-emerald-400">FastAPI Backend Connected</span>
                </>
              ) : backendStatus === 'offline' ? (
                <>
                  <AlertCircle className="size-4 text-red-400" />
                  <span className="text-red-400">Backend Offline (http://127.0.0.1:8000)</span>
                </>
              ) : (
                <>
                  <RefreshCw className="size-4 text-outline animate-spin" />
                  <span className="text-outline">Connecting Backend...</span>
                </>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {(validationError || error) && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-500/50 text-red-200 flex items-start justify-between gap-3 shadow-lg">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="size-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-300">Comparison Failed</h4>
                  <p className="text-xs text-red-200/90 mt-0.5 leading-relaxed">
                    {validationError || error}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setError(null);
                }}
                className="text-red-400 hover:text-red-200 p-1"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={fileInputOldRef}
            type="file"
            accept=".pdf,.txt"
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
            accept=".pdf,.txt"
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
            <div className="bg-surface-container rounded-xl border border-outline-variant p-6 relative flex flex-col justify-between shadow-lg hover:border-primary/50 transition-all min-h-[260px]">
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
                  old_policy
                </span>
              </div>

              {/* Staged Document Card or Dropzone */}
              {oldFile ? (
                <div className="rounded-lg bg-surface-container-lowest border border-outline-variant p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                      <FileText className="size-5" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono-code text-xs text-on-surface font-medium truncate" title={oldFile.name}>
                          {oldFile.name}
                        </span>
                        <span className="font-mono-badge text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          {oldFile.type} Ready
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-outline mt-1 font-mono-code text-[11px]">
                        <span>{oldFile.size}</span>
                        <span>•</span>
                        <span>Baseline Reference</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-outline-variant">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => fileInputOldRef.current?.click()}
                      className="px-2.5 py-1 rounded text-xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="size-3" />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => setOldFile(null)}
                      className="px-2.5 py-1 rounded text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center mb-4 flex-1 ${
                    isDraggingOld
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant hover:bg-surface-container-high'
                  }`}
                >
                  <UploadCloud className="size-8 text-outline mb-2" />
                  <span className="text-sm text-on-surface font-medium">
                    Drag & drop baseline policy
                  </span>
                  <span className="text-xs text-outline mt-1">
                    Accepts .txt or .pdf (Max 20 MB)
                  </span>
                </div>
              )}

              <div className="text-[11px] font-mono-code text-outline text-right">
                Supported: TXT, Searchable PDF
              </div>
            </div>

            {/* ── CENTER GLYPH: Bi-directional Purple Diff Connector ── */}
            <div className="flex lg:flex-col items-center justify-center my-2 lg:my-0 z-10">
              <div className="size-12 rounded-full bg-surface-container-high border-2 border-primary-container flex items-center justify-center text-primary glow-primary shadow-xl">
                <RefreshCw className={`size-5 ${isLoading ? 'animate-spin' : ''}`} />
              </div>
              <span className="hidden lg:block font-mono-badge text-[11px] text-outline mt-2 tracking-widest uppercase">
                VS
              </span>
            </div>

            {/* ── RIGHT CARD: NEW POLICY (Revision Document) ── */}
            <div className="bg-surface-container rounded-xl border border-outline-variant p-6 relative flex flex-col justify-between shadow-lg hover:border-primary/50 transition-all min-h-[260px]">
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
                  new_policy
                </span>
              </div>

              {/* Staged Document Card or Dropzone */}
              {newFile ? (
                <div className="rounded-lg bg-surface-container-lowest border border-outline-variant p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <FileText className="size-5" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono-code text-xs text-on-surface font-medium truncate" title={newFile.name}>
                          {newFile.name}
                        </span>
                        <span className="font-mono-badge text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/30">
                          {newFile.type} Ready
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-outline mt-1 font-mono-code text-[11px]">
                        <span>{newFile.size}</span>
                        <span>•</span>
                        <span>Revised Target</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-outline-variant">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => fileInputNewRef.current?.click()}
                      className="px-2.5 py-1 rounded text-xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="size-3" />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => setNewFile(null)}
                      className="px-2.5 py-1 rounded text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center mb-4 flex-1 ${
                    isDraggingNew
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant hover:bg-surface-container-high'
                  }`}
                >
                  <UploadCloud className="size-8 text-primary mb-2" />
                  <span className="text-sm text-on-surface font-medium">
                    Drag & drop revised policy
                  </span>
                  <span className="text-xs text-outline mt-1">
                    Accepts .txt or .pdf (Max 20 MB)
                  </span>
                </div>
              )}

              <div className="text-[11px] font-mono-code text-outline text-right">
                Supported: TXT, Searchable PDF
              </div>
            </div>
          </div>

          {/* Primary Action Trigger */}
          <div className="mt-8 text-center flex flex-col items-center">
            <button
              type="button"
              disabled={!bothFilesReady || isLoading}
              onClick={handleAnalyze}
              className={`w-full sm:w-auto min-w-[320px] inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-display font-semibold transition-all shadow-xl ${
                bothFilesReady && !isLoading
                  ? 'bg-gradient-to-r from-primary-container via-primary to-inverse-primary text-on-primary-container hover:brightness-110 active:scale-[0.98] glow-primary cursor-pointer'
                  : 'bg-surface-container-high text-outline cursor-not-allowed opacity-60'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="size-5 animate-spin text-primary" />
                  <span>Running Forensic Pipeline & NLI Inference...</span>
                </>
              ) : (
                <>
                  <span>Run Deep Forensic Comparison</span>
                  <ArrowRight className="size-5" />
                </>
              )}
            </button>

            {isLoading && (
              <div className="mt-4 max-w-md mx-auto text-xs text-on-surface-variant bg-surface-container p-3 rounded-lg border border-outline-variant text-center space-y-1">
                <p className="font-semibold text-primary">Inference In Progress</p>
                <p className="text-outline">
                  Parsing clauses, computing semantic vector alignments, auditing event validity, and classifying privacy impact. This may take 15–60 seconds depending on policy length.
                </p>
              </div>
            )}

            {!isLoading && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-outline font-mono-code">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-tertiary" />
                  Bi-Encoder Clause Alignment
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-tertiary" />
                  DeBERTa-v3 NLI Verification
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-tertiary" />
                  Event Validity & Quality Audit
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            4. Architecture & Safeguards Cards
           ───────────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-12 border-t border-outline-variant mt-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-xl font-display font-semibold text-on-surface">
              Built on 3 Strict Independent Dimensions
            </h3>
            <p className="text-xs text-on-surface-variant mt-1.5">
              SneakyToS never conflates structural diffs with legal validity or privacy impact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-surface-container border border-outline-variant">
              <span className="font-mono-badge text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30 uppercase">
                Dimension 1
              </span>
              <h4 className="text-base font-display font-semibold text-on-surface mt-3">
                Change Type
              </h4>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Structural difference identification: <code>ADDED</code>, <code>MODIFIED</code>, <code>DELETED</code>, or <code>RESTRUCTURED</code>.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface-container border border-outline-variant">
              <span className="font-mono-badge text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 uppercase">
                Dimension 2
              </span>
              <h4 className="text-base font-display font-semibold text-on-surface mt-3">
                Event Validity
              </h4>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Verifies genuine policy changes versus OCR artifacts, heading splits, fragments, or mismatched alignment noise.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface-container border border-outline-variant">
              <span className="font-mono-badge text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                Dimension 3
              </span>
              <h4 className="text-base font-display font-semibold text-on-surface mt-3">
                Privacy Impact
              </h4>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Classifies legal rights consequence: <code>PRIVACY_WORSE</code>, <code>PRIVACY_BETTER</code>, <code>NO_PRIVACY_EFFECT</code>, or <code>UNCLEAR</code>.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          5. Minimalist Footer
         ───────────────────────────────────────────────────────────── */}
      <footer className="w-full bg-surface-container-lowest border-t border-outline-variant py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-outline">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">SneakyToS</span>
            <span>— Advanced Privacy Policy Difference & Impact Intelligence</span>
          </div>
          <div className="font-mono-code text-[11px]">
            FastAPI Pipeline v1.0 · DeBERTa-v3 NLI
          </div>
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          6. How It Works Modal
         ───────────────────────────────────────────────────────────── */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container border border-outline-variant rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2.5">
                <Brain className="size-5 text-primary" />
                <h3 className="text-lg font-display font-semibold text-on-surface">
                  How SneakyToS Works
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-body text-on-surface-variant leading-relaxed">
              <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant">
                <h4 className="font-semibold text-on-surface mb-1 flex items-center gap-2">
                  <span className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-mono">1</span>
                  Clause Segmentation & Clean Ingestion
                </h4>
                <p>
                  Documents are extracted from text or PDF format, stripped of layout headers and pagination artifacts, and parsed into legal clauses.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant">
                <h4 className="font-semibold text-on-surface mb-1 flex items-center gap-2">
                  <span className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-mono">2</span>
                  Semantic Embedding Alignment
                </h4>
                <p>
                  A bi-encoder sentence-transformer calculates dense cosine similarities across clauses to find true counterparts, handling reordered and split sections.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant">
                <h4 className="font-semibold text-on-surface mb-1 flex items-center gap-2">
                  <span className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-mono">3</span>
                  Event Validity & NLI Impact Classification
                </h4>
                <p>
                  Cross-encoder Natural Language Inference (DeBERTa-v3) computes bidirectional entailment and contradiction scores to determine if user rights have degraded or expanded.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold hover:bg-primary transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
