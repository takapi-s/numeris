import type { AbilityDefinition, AbilityEffect, TraitEffect } from "./AbilityTypes";
import type { GameState } from "../domain/GameState";

export type AbilityContext = {
  actorPlayerId: string;
};

function nextPlayerId(state: GameState): string {
  const idx = state.turnOrder.indexOf(state.currentTurnPlayerId);
  const nextIdx = (idx + state.direction + state.turnOrder.length) % state.turnOrder.length;
  return state.turnOrder[nextIdx]!;
}

function drawCards(state: GameState, playerId: string, n: number) {
  const hand = state.hands[playerId] ?? (state.hands[playerId] = []);
  for (let i = 0; i < n; i++) {
    const card = state.deck.shift();
    if (!card) break;
    hand.push(card);
  }
}

export function applyEffect(state: GameState, effect: AbilityEffect, ctx: AbilityContext) {
  switch (effect.type) {
    case "skipNext": {
      // Skip means advance an extra step (current card play already ends turn)
      const skipped = nextPlayerId(state);
      state.currentTurnPlayerId = skipped;
      state.currentTurnPlayerId = nextPlayerId(state);
      return;
    }
    case "reverseTurnOrder": {
      state.direction = (state.direction * -1) as 1 | -1;
      return;
    }
    case "draw": {
      if (effect.n <= 0) return;
      if (effect.target === "self") {
        drawCards(state, ctx.actorPlayerId, effect.n);
        return;
      }
      if (effect.target === "next") {
        drawCards(state, nextPlayerId(state), effect.n);
        return;
      }
      if (effect.target === "allOpponents") {
        for (const pid of state.turnOrder) {
          if (pid === ctx.actorPlayerId) continue;
          drawCards(state, pid, effect.n);
        }
      }
    }
  }
}

export function applyOnPlay(state: GameState, ability: AbilityDefinition | null, ctx: AbilityContext) {
  const effects = ability?.onPlayEffects ?? [];
  for (const e of effects) applyEffect(state, e, ctx);
}

export function canPlayWithTraits(
  baseCanPlay: boolean,
  traitEffects: TraitEffect[] | null | undefined,
): boolean {
  if (!traitEffects?.length) return baseCanPlay;
  for (const t of traitEffects) {
    if (t.type === "canPlayOverride" && t.value === "always") return true;
  }
  return baseCanPlay;
}

export function applyTraitsOnTurnStart(
  state: GameState,
  abilitiesByName: Map<string, AbilityDefinition>,
): void {
  const pid = state.currentTurnPlayerId;
  const hand = state.hands[pid] ?? [];
  for (const card of hand) {
    const abilityName = card.abilityName ?? null;
    if (!abilityName) continue;
    const ability = abilitiesByName.get(abilityName);
    if (!ability?.traitEffects?.length) continue;
    for (const t of ability.traitEffects) {
      if (t.type !== "onTurnStart") continue;
      const traitKey = `${pid}:${card.id}:${ability.name}:onTurnStart`;
      const lastAppliedTurn = state.appliedTraits[traitKey];
      if (t.oncePerTurn && lastAppliedTurn === state.turnNumber) continue;
      applyEffect(state, t.effect, { actorPlayerId: pid });
      state.appliedTraits[traitKey] = state.turnNumber;
    }
  }
}

