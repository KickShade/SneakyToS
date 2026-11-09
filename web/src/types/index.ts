// ============================================================================
// SneakyToS — TypeScript Type Definitions
// ============================================================================

// === Enums / Union Types ===

export type ChangeType = 'ADDED' | 'MODIFIED' | 'DELETED';

export type EventValidity =
  | 'VALID'
  | 'FRAGMENT'
  | 'HEADING_ONLY'
  | 'CONTAMINATED'
  | 'MISMATCHED_PAIR'
  | 'FALSE_ADDED_DELETED'
  | 'GARBLED'
  | 'TRUNCATED';

export type PrivacyImpact =
  | 'PRIVACY_WORSE'
  | 'PRIVACY_BETTER'
  | 'NO_PRIVACY_EFFECT'
  | 'UNCLEAR';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ComparisonStatus = 'completed' | 'in_progress' | 'failed' | 'queued';

// === Document & Policy Types ===

export interface PolicyDocument {
  id: string;
  companyName: string;
  policyType: string;
  version: string;
  capturedAt: string;
  sourceUrl?: string;
  content: string;
  clauseCount: number;
}

export interface PolicyClause {
  id: string;
  sectionNumber: string;
  sectionTitle: string;
  content: string;
  lineStart: number;
  lineEnd: number;
}

// === Comparison Types ===

export interface Comparison {
  id: string;
  companyName: string;
  policyType: string;
  oldVersion: PolicyDocument;
  newVersion: PolicyDocument;
  status: ComparisonStatus;
  createdAt: string;
  completedAt?: string;
  totalChanges: number;
  riskScore: number;
  changes: Change[];
}

export interface ComparisonSummary {
  id: string;
  companyName: string;
  policyType: string;
  oldVersionDate: string;
  newVersionDate: string;
  status: ComparisonStatus;
  createdAt: string;
  totalChanges: number;
  riskScore: number;
  privacyWorse: number;
  privacyBetter: number;
  noEffect: number;
  unclear: number;
}

export interface Change {
  id: string;
  changeType: ChangeType;
  eventValidity: EventValidity;
  privacyImpact: PrivacyImpact;
  riskLevel: RiskLevel;
  sectionOld?: string;
  sectionNew?: string;
  clauseOld?: string;
  clauseNew?: string;
  oldText?: string;
  newText?: string;
  explanation: string;
  aiSummary?: string;
  lineOld?: { start: number; end: number };
  lineNew?: { start: number; end: number };
}

// === Dashboard Types ===

export interface DashboardStats {
  activePolicies: number;
  expansionsDetected: number;
  unilateralModRate: number;
  totalComparisons: number;
  avgRiskScore: number;
}

export interface TrendDataPoint {
  month: string;
  expansions: number;
  restrictions: number;
  neutral: number;
}

// === Upload Types ===

export type UploadMode = 'file' | 'text' | 'url';

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

// === Settings Types ===

export interface UserSettings {
  emailNotifications: boolean;
  autoCompare: boolean;
  diffAlgorithm: 'semantic' | 'structural' | 'hybrid';
  theme: 'dark';
  exportFormat: 'pdf' | 'json' | 'csv';
}

// === Privacy Report Types ===

export interface PrivacyReport {
  id: string;
  comparisonId: string;
  companyName: string;
  generatedAt: string;
  overallScore: number;
  categories: PrivacyCategory[];
  timeline: PrivacyTimelineEntry[];
}

export interface PrivacyCategory {
  name: string;
  score: number;
  previousScore: number;
  changes: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface PrivacyTimelineEntry {
  date: string;
  score: number;
  event?: string;
}

// === Document History Types ===

export interface DocumentVersion {
  id: string;
  companyName: string;
  policyType: string;
  version: string;
  capturedAt: string;
  changeCount: number;
  riskLevel: RiskLevel;
}
