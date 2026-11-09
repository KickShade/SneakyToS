// ============================================================================
// SneakyToS — Badge Components & Distinct Classification Indicators
// Preserves: Change Type, Event Validity, and Privacy Impact as 3 distinct concepts
// ============================================================================

import type { ChangeType, EventValidity, PrivacyImpact } from '@/types';

interface BadgeProps {
  label: string;
  variant: 'danger' | 'safe' | 'warn' | 'neutral' | 'primary' | 'info';
  size?: 'sm' | 'md';
  mono?: boolean;
}

const variantClasses: Record<BadgeProps['variant'], string> = {
  danger: 'bg-red-500/10 text-red-400 border-red-500/30',
  safe: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  warn: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  neutral: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  primary: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
};

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ label, variant, size = 'sm', mono = true }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded border font-semibold tracking-wider uppercase shadow-sm select-none',
        variantClasses[variant],
        sizeClasses[size],
        mono ? 'font-mono' : 'font-sans',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

/**
 * 1. Change Type Badge: ADDED, MODIFIED, DELETED, RESTRUCTURED
 */
export function ChangeTypeBadge({ type, size = 'sm' }: { type: ChangeType; size?: 'sm' | 'md' }) {
  switch (type) {
    case 'ADDED':
      return <Badge label="Added" variant="safe" size={size} />;
    case 'DELETED':
      return <Badge label="Deleted" variant="danger" size={size} />;
    case 'MODIFIED':
      return <Badge label="Modified" variant="primary" size={size} />;
    case 'RESTRUCTURED':
      return <Badge label="Restructured" variant="info" size={size} />;
    default:
      return <Badge label={type} variant="neutral" size={size} />;
  }
}

/**
 * 2. Event Validity Badge: VALID or Quality Defect (FRAGMENT, HEADING_ONLY, etc.)
 */
export function EventValidityBadge({
  validity,
  size = 'sm',
}: {
  validity: EventValidity;
  size?: 'sm' | 'md';
}) {
  if (validity === 'VALID') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border font-mono font-semibold uppercase select-none bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ${sizeClasses[size]}`}
      >
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Valid
      </span>
    );
  }

  // Formatting display name for defects
  const formatted = validity.replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-mono font-semibold uppercase select-none bg-amber-500/10 text-amber-400 border-amber-500/30 ${sizeClasses[size]}`}
      title={`Validity Defect: ${validity}`}
    >
      <span className="size-1.5 rounded-full bg-amber-400" />
      {formatted}
    </span>
  );
}

/**
 * 3. Privacy Impact Badge: PRIVACY_WORSE, PRIVACY_BETTER, NO_PRIVACY_EFFECT, UNCLEAR
 */
export function PrivacyImpactBadge({
  impact,
  size = 'sm',
}: {
  impact?: PrivacyImpact | null;
  size?: 'sm' | 'md';
}) {
  if (!impact) {
    return (
      <span
        className={`inline-flex items-center rounded border font-mono font-semibold uppercase select-none bg-slate-800 text-slate-400 border-slate-700 ${sizeClasses[size]}`}
        title="Event is invalid or unclassified"
      >
        Unclassified
      </span>
    );
  }

  switch (impact) {
    case 'PRIVACY_WORSE':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded border font-mono font-semibold uppercase select-none bg-red-500/15 text-red-400 border-red-500/40 ${sizeClasses[size]}`}
        >
          <span className="size-1.5 rounded-full bg-red-400" />
          Privacy Worse
        </span>
      );
    case 'PRIVACY_BETTER':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded border font-mono font-semibold uppercase select-none bg-emerald-500/15 text-emerald-400 border-emerald-500/40 ${sizeClasses[size]}`}
        >
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Privacy Better
        </span>
      );
    case 'NO_PRIVACY_EFFECT':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded border font-mono font-semibold uppercase select-none bg-slate-500/15 text-slate-300 border-slate-500/30 ${sizeClasses[size]}`}
        >
          <span className="size-1.5 rounded-full bg-slate-400" />
          No Effect
        </span>
      );
    case 'UNCLEAR':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded border font-mono font-semibold uppercase select-none bg-amber-500/15 text-amber-300 border-amber-500/40 ${sizeClasses[size]}`}
          title="Analysis indicates ambiguous or mixed impact"
        >
          <span className="size-1.5 rounded-full bg-amber-400" />
          Unclear
        </span>
      );
    default:
      return <Badge label={impact} variant="neutral" size={size} />;
  }
}
