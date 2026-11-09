// ============================================================================
// SneakyToS — Application Routing & Comparison Provider
// Source of Truth: Google Stitch Design & Real Backend Integration
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ComparisonProvider } from '@/context/ComparisonContext';
import { HomePage } from '@/pages/HomePage';
import { ComparisonWorkspace } from '@/pages/ComparisonWorkspace';
import { ChangeAnalysis } from '@/pages/ChangeAnalysis';
import { PrivacyReport } from '@/pages/PrivacyReport';

export function App() {
  return (
    <ComparisonProvider>
      <BrowserRouter>
        <Routes>
          {/* Direct-Use Document Ingestion / Upload */}
          <Route path="/" element={<HomePage />} />
          <Route path="/new-comparison" element={<HomePage />} />
          <Route path="/compare" element={<HomePage />} />

          {/* Document Comparison Workspace (Split Redline Diff & Discrepancy Ledger) */}
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

          {/* Fallback to Upload Page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ComparisonProvider>
  );
}

export default App;
