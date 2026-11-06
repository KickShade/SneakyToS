// ============================================================================
// SneakyToS — Application Routing & Direct-Use Workflow
// Source of Truth: Google Stitch Design & Obsidian Sentinel Architecture
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { AnalysisProgress } from '@/pages/AnalysisProgress';
import { ComparisonWorkspace } from '@/pages/ComparisonWorkspace';
import { ChangeAnalysis } from '@/pages/ChangeAnalysis';
import { PrivacyReport } from '@/pages/PrivacyReport';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Direct-Use Workflow Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/new-comparison" element={<HomePage />} />
        <Route path="/compare" element={<HomePage />} />

        {/* 9-Stage Forensic Analysis Pipeline */}
        <Route path="/analysis-progress/:id" element={<AnalysisProgress />} />
        <Route path="/analysis-progress" element={<AnalysisProgress />} />

        {/* Document Comparison Workspace (Split Redline Diff) */}
        <Route path="/comparison/:id" element={<ComparisonWorkspace />} />
        <Route path="/comparison" element={<ComparisonWorkspace />} />
        <Route path="/workspace" element={<ComparisonWorkspace />} />

        {/* Detailed Forensic Discrepancy Ledger */}
        <Route path="/comparison/:id/changes" element={<ChangeAnalysis />} />
        <Route path="/changes" element={<ChangeAnalysis />} />

        {/* Privacy Impact Audit Report */}
        <Route path="/comparison/:id/privacy-report" element={<PrivacyReport />} />
        <Route path="/privacy-report" element={<PrivacyReport />} />
        <Route path="/report" element={<PrivacyReport />} />

        {/* Fallback to Direct-Use Homepage */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
