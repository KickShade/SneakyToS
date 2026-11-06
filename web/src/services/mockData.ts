// ============================================================================
// SneakyToS — Realistic Mock Data Layer (Obsidian Sentinel / Stitch Blueprint)
// ============================================================================

import type {
  Comparison,
  Change,
  PrivacyReport,
  DocumentVersion,
  ComparisonSummary,
  UserSettings,
} from '@/types';

export const mockOmniCloudChanges: Change[] = [
  {
    id: 'change-001',
    changeType: 'MODIFIED',
    eventValidity: 'VALID',
    privacyImpact: 'PRIVACY_WORSE',
    riskLevel: 'high',
    sectionOld: 'Section 4.2',
    sectionNew: 'Section 4.2 · Third-Party Data Disclosures & Behavioral Syndication',
    oldText:
      'We will not sell, rent, or distribute your personal usage data to third-party marketing entities without explicit opt-in user consent and verified corporate cryptographic key approval.',
    newText:
      'We may share pseudonymized behavioral telemetry and device fingerprints with authorized advertising partners to optimize targeted brand delivery, unless prohibited by applicable local jurisdiction.',
    explanation:
      'Switches explicit user opt-in approval to passive silent telemetry delivery shared with 3rd-party ad networks.',
    aiSummary:
      'Ad Syndicate Expansion: Severe reduction in consent rights. Telemetry and fingerprints are now syndicable without prior affirmative opt-in.',
    lineOld: { start: 248, end: 261 },
    lineNew: { start: 248, end: 266 },
  },
  {
    id: 'change-002',
    changeType: 'MODIFIED',
    eventValidity: 'VALID',
    privacyImpact: 'PRIVACY_WORSE',
    riskLevel: 'high',
    sectionOld: 'Section 9.1',
    sectionNew: 'Section 9.1 · User Rights, Subject Access, and System Erasure',
    oldText:
      'Upon verified receipt of an erasure demand, OmniCloud executes complete algorithmic purging across both primary persistent stores and derived analytical indices without persistent residual trace.',
    newText:
      'Erasure workflows target user identifiers within relational tables; however, aggregate analytical embeddings and model training weights derived from prior historical sessions remain perpetually retained to safeguard foundational neural baseline integrity.',
    explanation:
      'Carves out an exception to GDPR erasure: retains perpetual analytical embeddings and AI model training weights.',
    aiSummary:
      'Perpetual AI Weight Retention: Creates irrevocable carve-out preventing complete deletion of derived training artifacts.',
    lineOld: { start: 402, end: 418 },
    lineNew: { start: 408, end: 430 },
  },
  {
    id: 'change-003',
    changeType: 'ADDED',
    eventValidity: 'VALID',
    privacyImpact: 'PRIVACY_BETTER',
    riskLevel: 'low',
    sectionOld: '',
    sectionNew: 'Section 12.4 · Hardware Identifiers and Perceptual Metrics',
    oldText: '',
    newText:
      'OmniCloud explicitly disclaims the harvesting, extraction, storage, or algorithmic derivation of any human facial geometry, retinal scans, acoustic voiceprints, or biometric signatures under any circumstance.',
    explanation:
      'Explicitly guarantees biometric immunity: disclaims any harvesting of voiceprints, facial geometry, or retina scans.',
    aiSummary:
      'Pro-Privacy Safeguard: Positive constraint forbidding biometric harvesting.',
    lineOld: { start: 0, end: 0 },
    lineNew: { start: 595, end: 612 },
  },
  {
    id: 'change-004',
    changeType: 'MODIFIED',
    eventValidity: 'VALID',
    privacyImpact: 'UNCLEAR',
    riskLevel: 'medium',
    sectionOld: 'Section 7.3',
    sectionNew: 'Section 7.3 · Data Retention & Log Maintenance Protocols',
    oldText:
      'All customer operational raw telemetry and authentication breadcrumbs shall be definitively expunged within an immutable ninety (90) calendar day rollover cycle.',
    newText:
      'Customer operational telemetry and access records are maintained for as long as deemed commercially reasonable and necessary to sustain analytical diagnostic pipelines.',
    explanation:
      'Replaces guaranteed 90-day concrete log purge with undefined subjective commercially reasonable timeframe.',
    aiSummary:
      'Subjective Retention Window: Dilutes clear temporal boundary into indefinite storage.',
    lineOld: { start: 312, end: 329 },
    lineNew: { start: 318, end: 334 },
  },
  {
    id: 'change-005',
    changeType: 'MODIFIED',
    eventValidity: 'HEADING_ONLY',
    privacyImpact: 'NO_PRIVACY_EFFECT',
    riskLevel: 'info',
    sectionOld: 'Section 15.1',
    sectionNew: 'Section 15.1 · Dispute Resolution Framework',
    oldText: '15.1. Arbitration and Governing Jurisdictions.',
    newText: '15.1. Dispute Resolution and Governing Jurisdictions.',
    explanation:
      'Standardization of sub-bullet indentation without semantic legal modification.',
    aiSummary:
      'Cosmetic formatting change with no impact on user data rights.',
    lineOld: { start: 710, end: 718 },
    lineNew: { start: 720, end: 728 },
  },
];

export const mockDetailedComparison: Comparison = {
  id: 'comp-omnicloud-v3-v4',
  companyName: 'OmniCloud Global Ltd.',
  policyType: 'Terms of Service & Privacy Addendum',
  status: 'completed',
  createdAt: '2025-01-15T10:00:00Z',
  completedAt: '2025-01-15T10:02:12Z',
  totalChanges: 14,
  riskScore: 8.6,
  oldVersion: {
    id: 'doc-omnicloud-v32',
    companyName: 'OmniCloud Global Ltd.',
    policyType: 'Terms of Service',
    version: 'OmniCloud Terms v3.2',
    capturedAt: '2023-11-14T00:00:00Z',
    sourceUrl: 'https://omnicloud.io/legal/terms-2023-11',
    clauseCount: 1328,
    content: `OMNICLOUD TERMS OF SERVICE (v3.2 - NOVEMBER 14, 2023)

Section 4.2 · Third-Party Data Disclosures & Behavioral Syndication
In the course of providing real-time infrastructure metrics and cloud analytics services, OmniCloud may collect edge diagnostic signals, machine telemetry, and authenticated workspace identifiers.
We will not sell, rent, or distribute your personal usage data to third-party marketing entities without explicit opt-in user consent and verified corporate cryptographic key approval.
Such access is strictly governed by zero-trust identity envelopes and logged under audited access records retained for standard compliance cycles.

Section 7.3 · Data Retention & Log Maintenance Protocols
Aggregated ingress payloads, cluster activity ledgers, and API transactional histories are persisted within isolated storage nodes according to deterministic retention timetables.
All customer operational raw telemetry and authentication breadcrumbs shall be definitively expunged within an immutable ninety (90) calendar day rollover cycle.

Section 9.1 · User Rights, Subject Access, and System Erasure
Authorized tenant administrators retain statutory prerogatives to trigger Article 17 GDPR erasure directives across production databases.
Upon verified receipt of an erasure demand, OmniCloud executes complete algorithmic purging across both primary persistent stores and derived analytical indices without persistent residual trace.

Section 12.4 · Hardware Identifiers and Perceptual Metrics
Workstation agents monitor CPU core thermal metrics, RAM saturation, and thread scheduling latencies to allocate dynamic edge routing shards safely.
[No biometric exclusion clause existed in v3.2.]`,
  },
  newVersion: {
    id: 'doc-omnicloud-v40',
    companyName: 'OmniCloud Global Ltd.',
    policyType: 'Terms of Service & Privacy Addendum',
    version: 'OmniCloud Terms v4.0',
    capturedAt: '2025-01-15T00:00:00Z',
    sourceUrl: 'https://omnicloud.io/legal/terms-2025-01',
    clauseCount: 1412,
    content: `OMNICLOUD TERMS OF SERVICE (v4.0 - JANUARY 15, 2025)

Section 4.2 · Third-Party Data Disclosures & Behavioral Syndication
In the course of providing real-time infrastructure metrics and cloud analytics services, OmniCloud may collect edge diagnostic signals, machine telemetry, and authenticated workspace identifiers.
We may share pseudonymized behavioral telemetry and device fingerprints with authorized advertising partners to optimize targeted brand delivery, unless prohibited by applicable local jurisdiction.
Such access is strictly governed by zero-trust identity envelopes and logged under audited access records retained for standard compliance cycles.

Section 7.3 · Data Retention & Log Maintenance Protocols
Aggregated ingress payloads, cluster activity ledgers, and API transactional histories are persisted within isolated storage nodes according to deterministic retention timetables.
Customer operational telemetry and access records are maintained for as long as deemed commercially reasonable and necessary to sustain analytical diagnostic pipelines.

Section 9.1 · User Rights, Subject Access, and System Erasure
Authorized tenant administrators retain statutory prerogatives to trigger Article 17 GDPR erasure directives across production databases.
Erasure workflows target user identifiers within relational tables; however, aggregate analytical embeddings and model training weights derived from prior historical sessions remain perpetually retained to safeguard foundational neural baseline integrity.

Section 12.4 · Hardware Identifiers and Perceptual Metrics
Workstation agents monitor CPU core thermal metrics, RAM saturation, and thread scheduling latencies to allocate dynamic edge routing shards safely.
OmniCloud explicitly disclaims the harvesting, extraction, storage, or algorithmic derivation of any human facial geometry, retinal scans, acoustic voiceprints, or biometric signatures under any circumstance.`,
  },
  changes: mockOmniCloudChanges,
};

export const mockPrivacyReport: PrivacyReport = {
  id: 'rep-omnicloud-001',
  comparisonId: 'comp-omnicloud-v3-v4',
  companyName: 'OmniCloud Global Ltd.',
  generatedAt: '2025-01-15T10:05:00Z',
  overallScore: 42,
  categories: [
    {
      name: 'Third-Party Behavioral Syndication',
      score: 28,
      previousScore: 84,
      changes: 1,
      trend: 'declining',
    },
    {
      name: 'Right to Erasure & AI Weights',
      score: 30,
      previousScore: 92,
      changes: 1,
      trend: 'declining',
    },
    {
      name: 'Biometric Immunity Guarantees',
      score: 95,
      previousScore: 60,
      changes: 1,
      trend: 'improving',
    },
    {
      name: 'Data Retention Timetables',
      score: 45,
      previousScore: 85,
      changes: 1,
      trend: 'declining',
    },
    {
      name: 'Dispute & Notice Transparency',
      score: 70,
      previousScore: 70,
      changes: 1,
      trend: 'stable',
    },
  ],
  timeline: [
    { date: 'Nov 2022', score: 88, event: 'v2.8 Zero-Trust Launch' },
    { date: 'May 2023', score: 85, event: 'v3.0 GDPR Re-certification' },
    { date: 'Nov 2023', score: 84, event: 'v3.2 Baseline Audit' },
    { date: 'Jan 2025', score: 42, event: 'v4.0 Ad Syndication & AI Weight Retention' },
  ],
};

export const mockDocumentVersions: DocumentVersion[] = [
  {
    id: 'ver-001',
    companyName: 'OmniCloud Global Ltd.',
    policyType: 'Terms of Service & Privacy Addendum',
    version: 'OmniCloud Terms v4.0 (Jan 15, 2025)',
    capturedAt: '2025-01-15T10:00:00Z',
    changeCount: 14,
    riskLevel: 'critical',
  },
  {
    id: 'ver-002',
    companyName: 'OmniCloud Global Ltd.',
    policyType: 'Terms of Service',
    version: 'OmniCloud Terms v3.2 (Nov 14, 2023)',
    capturedAt: '2023-11-14T00:00:00Z',
    changeCount: 4,
    riskLevel: 'low',
  },
  {
    id: 'ver-003',
    companyName: 'Zoom Video Communications',
    policyType: 'Terms of Service',
    version: 'v6.0 — August 2023',
    capturedAt: '2023-08-11T14:20:00Z',
    changeCount: 5,
    riskLevel: 'critical',
  },
  {
    id: 'ver-004',
    companyName: 'OpenAI',
    policyType: 'Privacy Policy',
    version: 'v4.1 — January 2024',
    capturedAt: '2024-01-10T12:00:00Z',
    changeCount: 8,
    riskLevel: 'high',
  },
  {
    id: 'ver-005',
    companyName: 'Meta Platforms',
    policyType: 'Consumer Privacy Policy',
    version: 'v7.0 — October 2023',
    capturedAt: '2023-10-25T16:00:00Z',
    changeCount: 12,
    riskLevel: 'critical',
  },
];

export const mockDashboardStats: {
  activePolicies: number;
  expansionsDetected: number;
  unilateralModRate: number;
  totalComparisons: number;
  avgRiskScore: number;
} = {
  activePolicies: 48,
  expansionsDetected: 142,
  unilateralModRate: 64.2,
  totalComparisons: 318,
  avgRiskScore: 7.4,
};

export const mockRecentComparisons: ComparisonSummary[] = [
  {
    id: 'comp-omnicloud-v3-v4',
    companyName: 'OmniCloud Global Ltd.',
    policyType: 'Terms of Service & Privacy Addendum',
    oldVersionDate: 'Nov 14, 2023',
    newVersionDate: 'Jan 15, 2025',
    status: 'completed' as const,
    createdAt: '2025-01-15T10:00:00Z',
    totalChanges: 14,
    riskScore: 8.6,
    privacyWorse: 6,
    privacyBetter: 3,
    noEffect: 1,
    unclear: 4,
  },
  {
    id: 'comp-zoom-2023',
    companyName: 'Zoom Communications',
    policyType: 'Terms of Service',
    oldVersionDate: 'Mar 1, 2023',
    newVersionDate: 'Aug 11, 2023',
    status: 'completed' as const,
    createdAt: '2023-08-11T14:20:00Z',
    totalChanges: 5,
    riskScore: 9.2,
    privacyWorse: 4,
    privacyBetter: 0,
    noEffect: 0,
    unclear: 1,
  },
];

export const mockTrendData = [
  { month: 'Sep', expansions: 18, restrictions: 4, neutral: 12 },
  { month: 'Oct', expansions: 24, restrictions: 2, neutral: 15 },
  { month: 'Nov', expansions: 31, restrictions: 5, neutral: 18 },
  { month: 'Dec', expansions: 22, restrictions: 3, neutral: 14 },
  { month: 'Jan', expansions: 47, restrictions: 6, neutral: 21 },
];

export const mockUserSettings: UserSettings = {
  emailNotifications: true,
  autoCompare: true,
  diffAlgorithm: 'semantic' as const,
  theme: 'dark' as const,
  exportFormat: 'pdf' as const,
};

