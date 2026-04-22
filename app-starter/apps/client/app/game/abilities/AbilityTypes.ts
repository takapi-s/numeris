export type AbilityName = string;

export type AbilityCanPlayRule =
  | { type: "always" }
  | { type: "matchColorOrNumber" }
  | { type: "never" };

export type AbilityEffect =
  | { type: "skipNext" }
  | { type: "reverseTurnOrder" }
  | { type: "draw"; target: "self" | "next" | "allOpponents"; n: number };

export type TraitEffect =
  | { type: "canPlayOverride"; value: "always" }
  | { type: "onTurnStart"; effect: AbilityEffect; oncePerTurn?: boolean };

export type AbilityDefinition = {
  name: AbilityName;
  title: string;
  canPlayRule?: AbilityCanPlayRule | null;
  onPlayEffects?: AbilityEffect[] | null;
  traitEffects?: TraitEffect[] | null;
};

