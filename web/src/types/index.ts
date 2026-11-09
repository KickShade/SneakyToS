// ============================================================================
// SneakyToS — TypeScript Type Definitions
// Aligned with Backend API Specification & Google Stitch UI Blueprints
// ============================================================================

// === Core Classification Types ===

export type ChangeType = 'ADDED' | 'MODIFIED' | 'DELETED' | 'RESTRUCTURED';

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

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NEUTRAL';

// === Backend API Response Types (Contract: docs/api_handover.md) ===

export interface PolicyMetadata {
  filename: string;
  file_type: string;
  version: string;
  character_count: number;
  word_count: number;
  clause_count: number;
}

export interface PrivacyImpactCounts {
  PRIVACY_WORSE: number;
  PRIVACY_BETTER: number;
  NO_PRIVACY_EFFECT: number;
  UNCLEAR: number;
}

export interface CompareSummary {
  total_changes: number;
  valid_changes: number;
  invalid_changes: number;
  privacy_impact_counts: PrivacyImpactCounts;
}

export interface Clause {
  clause_id: string;
  section: string | null;
  text: string;
  position: number;
  word_count: number;
}

export interface BeforeAlignment {
  change_id: string;
  change_type: ChangeType;
  old_clause?: Clause | null;
  new_clause?: Clause | null;
  old_clauses?: Clause[];
  new_clauses?: Clause[];
  semantic_similarity?: number | null;
  lexical_similarity?: number | null;
  token_change_ratio?: number | null;
  char_change_ratio?: number | null;
}

export interface DirectionalNLIScores {
  entailment: number;
  contradiction: number;
  neutral: number;
}

export interface NLIResult {
  change_id: string;
  change_type: string;
  old_to_new?: DirectionalNLIScores | null;
  new_to_old?: DirectionalNLIScores | null;
  model_name?: string;
}

export interface EvidenceItem {
  dimension: string;
  feature: string;
  side: 'old' | 'new';
  matched_text: string;
}

export interface FeatureComparison {
  dimension: string;
  old_values: string[];
  new_values: string[];
  added: string[];
  removed: string[];
  status: string;
  evidence: EvidenceItem[];
}

export interface PrivacyFeatures {
  change_id: string;
  comparisons: Record<string, FeatureComparison>;
  modality?: { old: string[]; new: string[] };
  quantifiers?: { old: string[]; new: string[] };
}

export interface SignalEvidence {
  old: string[];
  new: string[];
}

export interface InterpretationSignal {
  old_value: string;
  new_value: string;
  direction: string;
  evidence: SignalEvidence;
  explanation: string;
}

export interface PrivacyInterpretation {
  change_id: string;
  signals: Record<string, InterpretationSignal>;
}

export interface ClassificationResult {
  privacy_impact: PrivacyImpact;
  confidence: number;
  confidence_level: ConfidenceLevel | string;
  severity: SeverityLevel | string;
  rationale: string;
  evidence: string[];
  facets: string[];
  rules_fired: string[];
  mixed: boolean;
  event_validity: EventValidity;
}

export interface AnalyzedChange {
  change_id: string;
  change_type: ChangeType;
  event_validity: EventValidity;
  is_valid: boolean;
  validation_reason?: string;
  before?: BeforeAlignment | null;
  nli?: NLIResult | null;
  privacy_features?: PrivacyFeatures | null;
  privacy_interpretation?: PrivacyInterpretation | null;
  classification?: ClassificationResult | null;
  privacy_impact?: PrivacyImpact | null;
}

export interface CompareResponse {
  old_policy: PolicyMetadata;
  new_policy: PolicyMetadata;
  summary: CompareSummary;
  changes: AnalyzedChange[];
}

export interface HealthResponse {
  status: string;
  service: string;
}

// === UI State & Utility Types ===

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface StagedFile {
  name: string;
  size: string;
  sizeBytes: number;
  type: string;
  rawFile: File;
}
