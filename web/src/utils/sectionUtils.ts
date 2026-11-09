// ============================================================================
// SneakyToS — Section Heading Resolution Utilities
// Normalizes and sanitizes document section headings while filtering out
// internal backend parser sentinels (e.g. ROOT, ROOT_FALLBACK, Section Unlabeled).
// ============================================================================

import type { AnalyzedChange, Clause } from '@/types';

export const NEUTRAL_SECTION_FALLBACK = 'Unclassified Section';

// Blocklist of internal sentinels, parser artifacts, and non-meaningful labels
const INTERNAL_SECTION_PATTERNS = [
  /^root(?:_fallback)?$/i,
  /^section\s+unlabeled$/i,
  /^section_unlabeled$/i,
  /^unlabeled$/i,
  /^unknown$/i,
  /^none$/i,
  /^null$/i,
  /^undefined$/i,
  /^n\/?a$/i,
  /^default$/i,
  /^general(?:\s+clause|\s+policy)?\s+provision$/i,
];

/**
 * Checks if a section string represents a meaningful, user-facing section heading.
 */
export function isMeaningfulHeading(section: string | null | undefined): boolean {
  if (!section || typeof section !== 'string') {
    return false;
  }

  const cleaned = cleanSectionHeading(section);
  if (!cleaned) {
    return false;
  }

  // Reject internal sentinels and parser tokens
  return !INTERNAL_SECTION_PATTERNS.some((pattern) => pattern.test(cleaned));
}

/**
 * Cleans markdown artifacts, hash symbols, bullet markers, and excessive whitespace.
 */
export function cleanSectionHeading(section: string): string {
  if (!section) return '';

  return section
    .replace(/^#{1,6}\s+/, '') // strip leading Markdown hashes (e.g. "# Heading")
    .replace(/^[-*•]\s+/, '') // strip leading bullet markers
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .replace(/:\s*$/, '') // strip trailing colons
    .trim();
}

export interface DocumentSectionContext {
  /**
   * Resolves the enclosing section heading for a clause on this document side.
   * Checks direct heading -> group headings -> preceding parent section -> neutral fallback.
   */
  getEnclosingSection(
    clause: Clause | null | undefined,
    clausesGroup?: Clause[] | null
  ): string;
}

/**
 * Constructs a document section context for either the 'old' or 'new' policy.
 * Preserves the distinction between OLD and NEW document hierarchies.
 * Maps sequential clause positions to their enclosing parent section heading.
 */
export function createDocumentSectionContext(
  changes: AnalyzedChange[],
  side: 'old' | 'new'
): DocumentSectionContext {
  // 1. Gather all clauses for this specific side
  const clausesMap = new Map<number, Clause>();

  changes.forEach((change) => {
    const primaryClause =
      side === 'old' ? change.before?.old_clause : change.before?.new_clause;
    const groupClauses =
      side === 'old'
        ? change.before?.old_clauses
        : change.before?.new_clauses;

    if (primaryClause && typeof primaryClause.position === 'number') {
      clausesMap.set(primaryClause.position, primaryClause);
    }

    if (Array.isArray(groupClauses)) {
      groupClauses.forEach((c) => {
        if (c && typeof c.position === 'number') {
          clausesMap.set(c.position, c);
        }
      });
    }
  });

  // 2. Sort clauses by sequential document position
  const sortedClauses = Array.from(clausesMap.values()).sort(
    (a, b) => a.position - b.position
  );

  // 3. Map positions and clause IDs to their enclosing parent section
  const positionToParent = new Map<number, string>();
  const idToParent = new Map<string, string>();
  let currentParent: string | null = null;

  for (const c of sortedClauses) {
    if (isMeaningfulHeading(c.section)) {
      currentParent = cleanSectionHeading(c.section!);
    }

    if (currentParent) {
      positionToParent.set(c.position, currentParent);
      idToParent.set(c.clause_id, currentParent);
    }
  }

  return {
    getEnclosingSection(
      clause: Clause | null | undefined,
      clausesGroup?: Clause[] | null
    ): string {
      // Step A: Check direct clause section
      if (clause && isMeaningfulHeading(clause.section)) {
        return cleanSectionHeading(clause.section!);
      }

      // Step B: Check sibling clauses in the multi-clause group
      if (Array.isArray(clausesGroup)) {
        for (const sibling of clausesGroup) {
          if (sibling && isMeaningfulHeading(sibling.section)) {
            return cleanSectionHeading(sibling.section!);
          }
        }
      }

      // Step C: Check document-level parent section by position or clause ID
      if (clause) {
        if (typeof clause.position === 'number' && positionToParent.has(clause.position)) {
          return positionToParent.get(clause.position)!;
        }
        if (clause.clause_id && idToParent.has(clause.clause_id)) {
          return idToParent.get(clause.clause_id)!;
        }
      }

      // Step D: Neutral fallback if no heading or parent context exists
      return NEUTRAL_SECTION_FALLBACK;
    },
  };
}

/**
 * Resolves the primary section heading for a comparison change card.
 * Prioritizes revision (new) heading, then baseline (old) heading,
 * and falls back to NEUTRAL_SECTION_FALLBACK. Never returns internal labels.
 */
export function resolveChangeCardHeading(
  change: AnalyzedChange,
  oldContext: DocumentSectionContext,
  newContext: DocumentSectionContext
): string {
  const newHeading = newContext.getEnclosingSection(
    change.before?.new_clause,
    change.before?.new_clauses
  );

  if (newHeading !== NEUTRAL_SECTION_FALLBACK) {
    return newHeading;
  }

  const oldHeading = oldContext.getEnclosingSection(
    change.before?.old_clause,
    change.before?.old_clauses
  );

  if (oldHeading !== NEUTRAL_SECTION_FALLBACK) {
    return oldHeading;
  }

  return NEUTRAL_SECTION_FALLBACK;
}

