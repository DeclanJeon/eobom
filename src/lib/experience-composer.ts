import {
  selectCardPolicy,
  type CardCandidate,
  type CardSelection,
  type CardSurface,
} from "@/lib/select-card";

export type ExperienceLifecycle = "new" | "early" | "returning" | "continuity";

export type ExperienceInput = {
  surface: CardSurface;
  lifecycle: ExperienceLifecycle;
  dateKey: string;
  timeCapsule?: CardCandidate[];
  pastToday?: CardCandidate[];
  lastWeek?: CardCandidate[];
  reactions?: CardCandidate[];
  todayMemory?: CardCandidate[];
};

/**
 * Centralizes the first-value/continuity priority without touching persistence.
 * New users always receive scripture; returning users may receive a strong memory.
 */
export function composeExperience(input: ExperienceInput): CardSelection {
  if (input.lifecycle === "new" || input.lifecycle === "early") {
    return selectCardPolicy({ surface: "today", dateKey: input.dateKey });
  }

  // v1.3 scripture-first contract: today surface is always scripture hero.
  // Memory resurface is secondary below the hero (screen 08), not a hero replacement.
  // Do not route today through the keyring timeCapsule path unless a future
  // contentKey explicitly requests memory as hero.
  if (input.surface === "today") {
    return selectCardPolicy({ surface: "today", dateKey: input.dateKey });
  }

  return selectCardPolicy(input);
}
