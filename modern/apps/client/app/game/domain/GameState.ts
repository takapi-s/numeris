import type { AbilityName } from "../abilities/AbilityTypes";

export type CardColor = "red" | "green" | "blue" | "yellow";

export type GameCard = {
  id: string;
  color: CardColor;
  number: number;
  abilityName?: AbilityName | null;
};

export type TurnDirection = 1 | -1;

export type GameState = {
  version: 1;
  startedAt: string;
  players: Array<{ playerId: string; displayName: string }>;
  turnOrder: string[]; // playerId[]
  currentTurnPlayerId: string;
  direction: TurnDirection;
  deck: GameCard[];
  discardPile: GameCard[];
  hands: Record<string, GameCard[]>; // playerId -> cards
  appliedTraits: Record<string, number>; // key -> lastAppliedTurnNumber
  turnNumber: number;
};

