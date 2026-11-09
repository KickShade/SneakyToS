interface BadgeProps {
  label: string;
  variant: 'danger' | 'safe' | 'warn' | 'neutral' | 'primary' | 'info';
  size?: 'sm' | 'md';
  mono?: boolean;
}

const variantClasses: Record<BadgeProps['variant'], string> = {
  danger: 'bg-danger-fill text-danger border-danger-border',
  safe: 'bg-safe-fill text-safe border-safe-border',
  warn: 'bg-warn-fill text-warn border-warn-border',
  neutral: 'bg-neutral-fill text-neutral-badge border-neutral-border',
  primary: 'bg-primary/10 text-primary border-primary/30',
  info: 'bg-primary/10 text-primary border-primary/30',
};

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5',
  md: 'px-2.5 py-1',
};

export function Badge({ label, variant, size = 'sm', mono = false }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border text-[10.5px] font-semibold tracking-wider uppercase',
        variantClasses[variant],
        sizeClasses[size],
        mono ? 'font-mono' : 'font-mono',
      ].join(' ')}
    >
      {label}
    </span>
  );
}
