import { runeById, runes, spiritById, spirits, standardRunes, starterDeck, type ElementId } from '@duel/game-data'

export type Phase = 'main' | 'battle' | 'end'
export type Position = 'attack' | 'defense-up' | 'defense-down'
export type CombatRelation = 'effective' | 'neutral' | 'disadvantaged' | 'direct'

export interface BoardRune {
  instanceId: string
  runeId: string
  position: Position
  effectUsed: boolean
  attackUsed: boolean
  summonedOnTurn: number
  changedPositionTurn?: number
  disabledTurns: number
  attackShield: boolean
  neutralized: boolean
  grantedAdvantageTurn?: number
  lockedElement?: ElementId
}

export interface PlayerState {
  id: string
  name: string
  hp: number
  maxHp: number
  deck: string[]
  hand: string[]
  board: BoardRune[]
  discard: string[]
  banished: string[]
  charges: number
  skipNextDraw: boolean
  chainEnabled: boolean
  spiritId: string
  spiritProgress: Partial<Record<ElementId, number>>
  spiritUsed: boolean
  activeSpiritId?: string
  spiritExpiresOnTurn?: number
}

export interface EffectTarget {
  owner?: 'self' | 'opponent'
  boardIndex?: number
  runeId?: string
  element?: ElementId
  position?: Position
}

export interface ResponseOption {
  boardIndex: number
  runeId: string
  alterName: string
  targetBoardIndex?: number
  responseKind?: 'negate' | 'guard-attack' | 'lock-summon' | 'capture-summon' | 'activate-effect'
  target?: EffectTarget
  targetLabel?: string
}

export interface ChainLink {
  kind: 'effect' | 'alter' | 'attack' | 'summon' | 'phase' | 'spirit'
  playerId: string
  boardIndex: number
  runeId: string
  label: string
  target?: EffectTarget
  responseKind?: ResponseOption['responseKind']
  defenderIndex?: number
  summonedInstanceId?: string
  instanceId?: string
  targetInstanceId?: string
  defenderInstanceId?: string
  targetLabel?: string
  concealed?: boolean
}

export interface ChainState {
  actorPlayerId: string
  responderPlayerId: string
  sourceBoardIndex: number
  sourceRuneId: string
  target?: EffectTarget
  options: ResponseOption[]
  links: ChainLink[]
  passCount: number
}

export interface DuelState {
  revision: number
  turn: number
  activePlayer: 0 | 1
  phase: Phase
  summonsRemaining: number
  rngSeed: number
  players: [PlayerState, PlayerState]
  winnerId?: string
  activeChain?: ChainState
  pendingDiscard?: {
    playerId: string
    amount: number
    reason: 'draw-overflow'
  }
}

export type DuelCommand =
  | { type: 'SUMMON_RUNE'; playerId: string; handIndex: number; position: Position }
  | { type: 'ACTIVATE_EFFECT'; playerId: string; boardIndex: number; target?: EffectTarget }
  | { type: 'ATTACK'; playerId: string; attackerIndex: number; defenderIndex?: number }
  | { type: 'CHANGE_POSITION'; playerId: string; boardIndex: number; position: Position }
  | { type: 'ADVANCE_PHASE'; playerId: string }
  | { type: 'RESPOND_ALTER'; playerId: string; boardIndex: number; optionIndex?: number }
  | { type: 'PASS_RESPONSE'; playerId: string }
  | { type: 'SET_CHAIN_ENABLED'; playerId: string; enabled: boolean }
  | { type: 'DISCARD_FROM_HAND'; playerId: string; handIndex: number }
  | { type: 'AWAKEN_SPIRIT'; playerId: string }

export type DuelEvent =
  | { type: 'RUNE_SUMMONED'; playerId: string; instanceId: string; runeId: string; position: Position }
  | { type: 'EFFECT_ACTIVATED'; playerId: string; instanceId: string; runeId: string; effectId: string }
  | { type: 'DAMAGE_DEALT'; playerId: string; amount: number; remainingHp: number }
  | { type: 'HEALTH_RESTORED'; playerId: string; amount: number; totalHp: number }
  | { type: 'ATTACK_DECLARED'; playerId: string; attackerId: string; attackerRuneId: string; defenderId?: string; defenderRuneId?: string }
  | { type: 'COMBAT_RESOLVED'; playerId: string; attackerId: string; attackerRuneId: string; defenderId?: string; defenderRuneId?: string; relation: CombatRelation; defenderWasConcealed: boolean }
  | { type: 'RUNE_DESTROYED'; playerId: string; instanceId: string; runeId: string }
  | { type: 'PHASE_CHANGED'; phase: Phase; turn: number; activePlayer: 0 | 1 }
  | { type: 'DUEL_ENDED'; winnerId: string }
  | { type: 'EFFECT_RESOLVED'; playerId: string; runeId: string; message: string }
  | { type: 'POSITION_CHANGED'; playerId: string; instanceId: string; runeId: string; position: Position }
  | { type: 'CHAIN_OPENED'; playerId: string; runeId: string; responderId: string; label: string }
  | { type: 'RESPONSE_AVAILABLE'; playerId: string; optionCount: number }
  | { type: 'ALTER_ACTIVATED'; playerId: string; runeId: string; alterName: string }
  | { type: 'EFFECT_NEGATED'; playerId: string; runeId: string }
  | { type: 'CHAIN_RESOLVED'; linkCount: number }
  | { type: 'PRIORITY_PASSED'; playerId: string }
  | { type: 'CHAIN_LINK_ADDED'; playerId: string; runeId: string; label: string; linkCount: number }
  | { type: 'CHAIN_PREFERENCE_CHANGED'; playerId: string; enabled: boolean }
  | { type: 'RUNE_DISCARDED'; playerId: string; runeId: string; reason: 'hand-limit' }
  | { type: 'RUNE_DRAWN'; playerId: string; runeId: string }
  | { type: 'CHAIN_RESOLUTION_STARTED'; links: Array<{ playerId: string; runeId: string; label: string }> }
  | { type: 'SPIRIT_PROGRESS'; playerId: string; spiritId: string; element: ElementId; progress: number; required: number }
  | { type: 'SPIRIT_AWAKENED'; playerId: string; spiritId: string; effectName: string }
  | { type: 'SPIRIT_DEPARTED'; playerId: string; spiritId: string }

export type DispatchResult =
  | { ok: true; state: DuelState; events: DuelEvent[] }
  | { ok: false; state: DuelState; events: []; error: string }

export const MIN_DECK_SIZE = 5
export const MAX_DECK_SIZE = 20
const MAX_HAND = 5
const MAX_BOARD = 6

export const elementalRelation = (attackerRuneId: string, defenderRuneId: string, forcedAdvantage = false): Exclude<CombatRelation, 'direct'> => {
  if (forcedAdvantage) return 'effective'
  const attackerHasAdvantage = runeById[attackerRuneId].strengths.includes(runeById[defenderRuneId].element)
  const defenderHasAdvantage = runeById[defenderRuneId].strengths.includes(runeById[attackerRuneId].element)
  if (attackerHasAdvantage && !defenderHasAdvantage) return 'effective'
  if (defenderHasAdvantage && !attackerHasAdvantage) return 'disadvantaged'
  return 'neutral'
}

const clone = (state: DuelState): DuelState => structuredClone(state)
const opponentOf = (index: 0 | 1): 0 | 1 => index === 0 ? 1 : 0
const activeIndexFor = (state: DuelState, playerId: string) => state.players.findIndex((player) => player.id === playerId)
const instanceId = (state: DuelState, playerIndex: number, slot: number) => `r${state.revision + 1}-p${playerIndex}-s${slot}`

const fail = (state: DuelState, error: string): DispatchResult => ({ ok: false, state, events: [], error })
const registerSpiritProgress = (state: DuelState, playerIndex: 0 | 1, runeId: string): DuelEvent[] => {
  const player = state.players[playerIndex]
  const spirit = spiritById[player.spiritId]
  const element = runeById[runeId].element
  const requirement = spirit?.requirements.find((entry) => entry.element === element)
  if (!spirit || !requirement || player.spiritUsed) return []
  const progress = Math.min(requirement.count, (player.spiritProgress[element] ?? 0) + 1)
  player.spiritProgress[element] = progress
  return [{ type: 'SPIRIT_PROGRESS', playerId: player.id, spiritId: spirit.id, element, progress, required: requirement.count }]
}

const spiritIsReady = (player: PlayerState) => {
  const spirit = spiritById[player.spiritId]
  return !!spirit && spirit.requirements.every((requirement) => (player.spiritProgress[requirement.element] ?? 0) >= requirement.count)
}
const registerDrawOverflow = (state: DuelState, playerIndex: 0 | 1) => {
  const player = state.players[playerIndex]
  const amount = Math.max(0, player.hand.length - MAX_HAND)
  if (amount > 0) state.pendingDiscard = { playerId: player.id, amount, reason: 'draw-overflow' }
}
const canRespond = (rune: BoardRune) => !rune.effectUsed && rune.disabledTurns === 0 && (!rune.neutralized || rune.position === 'defense-down')

const responseOptionsFor = (state: DuelState, actorIndex: 0 | 1, target?: EffectTarget, links: ChainLink[] = []): ResponseOption[] => {
  const responderIndex = opponentOf(actorIndex)
  const responder = state.players[responderIndex]
  if (!responder.chainEnabled) return []
  const options: ResponseOption[] = []
  responder.board.forEach((rune, boardIndex) => {
    if (links.some((link) => link.playerId === responder.id && link.boardIndex === boardIndex)) return
    if (!canRespond(rune)) return
    const definition = runeById[rune.runeId]
    if (definition.effectId === 'frost-negation') options.push({ boardIndex, runeId: rune.runeId, alterName: definition.effectName, responseKind: 'negate' })
    if (definition.effectId === 'stone-sanctuary' && target?.owner === 'opponent' && target.boardIndex !== undefined) {
      options.push({ boardIndex, runeId: rune.runeId, alterName: 'Sanctuaire lithique', targetBoardIndex: target.boardIndex, responseKind: 'negate' })
    }
  })
  return options
}

const attackResponseOptions = (state: DuelState, attackerIndex: 0 | 1, defenderIndex?: number): ResponseOption[] => {
  if (defenderIndex === undefined) return []
  const defender = state.players[opponentOf(attackerIndex)]
  if (!defender.chainEnabled) return []
  return defender.board.flatMap((rune, boardIndex) => runeById[rune.runeId].effectId === 'stone-guard' && canRespond(rune)
    ? [{ boardIndex, runeId: rune.runeId, alterName: 'Garde de pierre', targetBoardIndex: defenderIndex, responseKind: 'guard-attack' as const }]
    : [])
}

const summonResponseOptions = (state: DuelState, summonerIndex: 0 | 1, summonedBoardIndex: number): ResponseOption[] => {
  const responder = state.players[opponentOf(summonerIndex)]
  if (!responder.chainEnabled) return []
  return responder.board.flatMap((rune, boardIndex): ResponseOption[] => {
    if (!canRespond(rune)) return []
    if (runeById[rune.runeId].effectId === 'static-lock') return [{ boardIndex, runeId: rune.runeId, alterName: 'Verrou statique', targetBoardIndex: summonedBoardIndex, responseKind: 'lock-summon' }]
    if (runeById[rune.runeId].effectId === 'wild-exchange') return [{ boardIndex, runeId: rune.runeId, alterName: 'Échange sauvage', targetBoardIndex: summonedBoardIndex, responseKind: 'capture-summon' }]
    return []
  })
}

const deckForSpirit = (spiritId: string, reverse: boolean) => {
  const spirit = spiritById[spiritId] ?? spirits[0]
  const required = spirit.requirements.flatMap((requirement) => {
    const runeId = runes.find((rune) => rune.element === requirement.element)?.id ?? starterDeck[0]
    return Array.from({ length: requirement.count }, () => runeId)
  })
  const requiredIds = new Set(required)
  const remaining = starterDeck.filter((runeId) => !requiredIds.has(runeId))
  return [...required, ...(reverse ? remaining.reverse() : remaining)].slice(0, 15)
}

export const createDuel = (playerName = 'Duelliste Alpha', opponentName = 'Duelliste Omega', playerSpiritId = 'spirit-flamberge', opponentSpiritId = 'spirit-shaka', playerDeck?: string[], opponentDeck?: string[]): DuelState => {
  const createPlayer = (id: string, name: string, reverse: boolean, spiritId: string): PlayerState => {
    const selectedDeck = id === 'p1' ? playerDeck : opponentDeck
    const customDeck = selectedDeck && selectedDeck.length >= MIN_DECK_SIZE && selectedDeck.length <= MAX_DECK_SIZE && selectedDeck.every((runeId) => runeById[runeId])
      ? [...selectedDeck]
      : undefined
    const cards = customDeck ?? deckForSpirit(spiritId, reverse)
    return {
      id,
      name,
      hp: 5,
      maxHp: 5,
      hand: cards.slice(0, 5),
      deck: cards.slice(5),
      board: [],
      discard: [],
      banished: [],
      charges: 0,
      skipNextDraw: false,
      chainEnabled: true,
      spiritId,
      spiritProgress: {},
      spiritUsed: false,
    }
  }

  return {
    revision: 0,
    turn: 1,
    activePlayer: 0,
    phase: 'main',
    summonsRemaining: 1,
    rngSeed: 0x5eed1234,
    players: [createPlayer('p1', playerName, false, playerSpiritId), createPlayer('p2', opponentName, true, opponentSpiritId)],
  }
}

const resolveEffect = (state: DuelState, playerIndex: 0 | 1, boardIndex: number, target?: EffectTarget): DispatchResult => {
  const next = clone(state)
  const player = next.players[playerIndex]
  const opponent = next.players[opponentOf(playerIndex)]
  const boardRune = player.board[boardIndex]
  if (!boardRune) return fail(state, 'Rune introuvable.')
  if (boardRune.effectUsed) return fail(state, 'Ce pouvoir a déjà été utilisé ce tour.')
  if (boardRune.disabledTurns > 0 || (boardRune.neutralized && boardRune.position !== 'defense-down')) return fail(state, 'Cette rune est neutralisée et ne peut pas activer son pouvoir.')
  const wasVeiled = boardRune.position === 'defense-down'
  if (wasVeiled) {
    boardRune.position = 'defense-up'
    boardRune.neutralized = false
  }

  const rune = runeById[boardRune.runeId]
  const lockedByIce = opponent.board.some((candidate) => candidate.lockedElement === rune.element && candidate.disabledTurns === 0)
  if (lockedByIce) return fail(state, `Les pouvoirs de l’élément ${rune.element} sont scellés par Ice.`)

  const targetPlayer = target?.owner === 'opponent' ? opponent : player
  const targetRune = target?.boardIndex === undefined ? undefined : targetPlayer.board[target.boardIndex]
  const requireBoardTarget = (owner: 'self' | 'opponent') => {
    if (target?.owner !== owner || target.boardIndex === undefined || !targetRune) return false
    return true
  }
  const resolved = (message: string) => events.push({ type: 'EFFECT_RESOLVED', playerId: player.id, runeId: rune.id, message })
  boardRune.effectUsed = true
  const events: DuelEvent[] = wasVeiled ? [{
    type: 'POSITION_CHANGED', playerId: player.id, instanceId: boardRune.instanceId,
    runeId: rune.id, position: 'defense-up',
  }, {
    type: 'EFFECT_ACTIVATED', playerId: player.id, instanceId: boardRune.instanceId,
    runeId: rune.id, effectId: rune.effectId,
  }] : [{
    type: 'EFFECT_ACTIVATED', playerId: player.id, instanceId: boardRune.instanceId,
    runeId: rune.id, effectId: rune.effectId,
  }]

  switch (rune.effectId) {
    case 'ember-pulse':
      opponent.hp = Math.max(0, opponent.hp - 1)
      events.push({ type: 'DAMAGE_DEALT', playerId: opponent.id, amount: 1, remainingHp: opponent.hp })
      break
    case 'tidal-bloom': {
      const before = player.hp
      player.hp = Math.min(player.maxHp, player.hp + 1)
      const restored = player.hp - before
      if (restored > 0) {
        events.push({ type: 'HEALTH_RESTORED', playerId: player.id, amount: restored, totalHp: player.hp })
      } else {
        boardRune.attackShield = true
        resolved(`${rune.name} condense son surplus de marée en bouclier de combat.`)
      }
      break
    }
    case 'time-surge': {
      if (!target?.runeId || !player.hand.includes(target.runeId)) return fail(state, 'Choisissez une rune de votre main à invoquer immédiatement.')
      if (player.board.length >= MAX_BOARD) return fail(state, 'Votre terrain est complet.')
      if (target.position === 'defense-up') return fail(state, 'Une invocation en garde doit être voilée.')
      const summonPosition: Position = target.position === 'defense-down' ? 'defense-down' : 'attack'
      player.hand.splice(player.hand.indexOf(target.runeId), 1)
      const summoned: BoardRune = {
        instanceId: instanceId(next, playerIndex, player.board.length),
        runeId: target.runeId,
        position: summonPosition,
        effectUsed: false,
        attackUsed: false,
        summonedOnTurn: next.turn,
        disabledTurns: 0,
        attackShield: false,
        neutralized: summonPosition === 'defense-down',
      }
      player.board.push(summoned)
      events.push({ type: 'RUNE_SUMMONED', playerId: player.id, instanceId: summoned.instanceId, runeId: summoned.runeId, position: summoned.position })
      events.push(...registerSpiritProgress(next, playerIndex, summoned.runeId))
      resolved(summonPosition === 'defense-down' ? 'Une rune traverse la faille temporelle et rejoint le terrain en défense voilée.' : `${runeById[summoned.runeId].name} traverse la faille temporelle et rejoint immédiatement le terrain.`)
      break
    }
    case 'wild-exchange': {
      if (!requireBoardTarget('opponent')) return fail(state, 'Choisissez une rune adverse à prendre sous votre contrôle.')
      const sourceIndex = player.board.findIndex((candidate) => candidate.instanceId === boardRune.instanceId)
      const captured = opponent.board[target!.boardIndex!]
      player.board.splice(sourceIndex, 1)
      player.discard.unshift(boardRune.runeId)
      opponent.board.splice(target!.boardIndex!, 1)
      player.board.push({
        ...captured,
        instanceId: instanceId(next, playerIndex, player.board.length),
        effectUsed: true,
        // A control change on your own turn grants this controller their attack.
        // A theft chained during the opponent's turn must not refresh an assault in progress.
        attackUsed: next.activePlayer !== playerIndex,
        summonedOnTurn: next.turn,
      })
      resolved(`${rune.name} se sacrifie : ${runeById[captured.runeId].name} change de camp.`)
      break
    }
    case 'static-lock': {
      const enemy = opponent.board.find((candidate) => candidate.disabledTurns === 0)
      if (!enemy) return fail(state, 'Aucune rune adverse ne peut être paralysée.')
      enemy.disabledTurns = 1
      resolved(`${runeById[enemy.runeId].name} est paralysée jusqu’au prochain tour.`)
      break
    }
    case 'stone-guard': {
      if (!requireBoardTarget('self')) return fail(state, 'Choisissez une rune alliée à protéger.')
      targetRune!.attackShield = true
      resolved(`${runeById[targetRune!.runeId].name} résistera à la prochaine destruction au combat.`)
      break
    }
    case 'gust-banish': {
      if (!requireBoardTarget('opponent')) return fail(state, 'Choisissez une rune adverse à renvoyer.')
      const [returned] = opponent.board.splice(target!.boardIndex!, 1)
      opponent.hand.push(returned.runeId)
      resolved(`${runeById[returned.runeId].name} retourne dans la main adverse, même au-delà de sa limite.`)
      break
    }
    case 'future-sight': {
      if (!target?.runeId || !player.deck.includes(target.runeId)) return fail(state, 'Choisissez une rune encore présente dans votre grimoire.')
      player.deck.splice(player.deck.indexOf(target.runeId), 1)
      player.hand.push(target.runeId)
      resolved(`${runeById[target.runeId].name} rejoint votre main depuis le grimoire.`)
      break
    }
    case 'veil-drop': {
      if (!requireBoardTarget('opponent')) return fail(state, 'Choisissez une rune adverse à voiler.')
      targetRune!.position = 'defense-down'
      targetRune!.neutralized = true
      resolved(`${runeById[targetRune!.runeId].name} passe en défense voilée et devient neutralisée.`)
      break
    }
    case 'reveal-truth': {
      if (!requireBoardTarget('self')) return fail(state, 'Choisissez une rune alliée à révéler.')
      targetRune!.position = 'attack'
      targetRune!.neutralized = false
      targetRune!.grantedAdvantageTurn = next.turn
      resolved(`${runeById[targetRune!.runeId].name} est révélée et gagne l’avantage pour ce tour.`)
      break
    }
    case 'frost-sigil': {
      if (!target?.element) return fail(state, 'Choisissez l’élément à sceller.')
      boardRune.lockedElement = target.element
      resolved(`Les pouvoirs de l’élément ${target.element} sont scellés tant que ${rune.name} reste active.`)
      break
    }
    case 'astral-return': {
      if (player.discard.length > 0) {
        if (!target?.runeId || !player.discard.includes(target.runeId)) return fail(state, 'Choisissez une rune dans votre cimetière.')
        player.discard.splice(player.discard.indexOf(target.runeId), 1)
        player.hand.push(target.runeId)
        resolved(`${runeById[target.runeId].name} revient du cimetière dans votre main.`)
      } else if (player.deck.length > 0) {
        const drawnRuneId = player.deck.shift()!
        player.hand.push(drawnRuneId)
        registerDrawOverflow(next, playerIndex)
        events.push({ type: 'RUNE_DRAWN', playerId: player.id, runeId: drawnRuneId })
        resolved(`${rune.name} puise dans le cosmos et vous fait piocher 1 rune.`)
      } else {
        return fail(state, 'Votre cimetière et votre grimoire sont vides.')
      }
      break
    }
    case 'rift-dance': {
      if (player.deck.length > 0) {
        player.hand.push(player.deck.shift()!)
        registerDrawOverflow(next, playerIndex)
      }
      player.charges += 1
      resolved(`${rune.name} vous fait piocher et ouvre une faille pour votre prochain tour.`)
      break
    }
    case 'genesis-spark': {
      next.rngSeed = (Math.imul(next.rngSeed, 1664525) + 1013904223) >>> 0
      const created = runes[next.rngSeed % runes.length]
      player.hand.push(created.id)
      resolved(`${created.name} est créée dans votre main.`)
      break
    }
    case 'tempest-break': {
      if (!requireBoardTarget('self')) return fail(state, 'Choisissez une rune alliée pour l’assaut immédiat.')
      if (targetRune!.position !== 'attack' || targetRune!.disabledTurns > 0) return fail(state, 'Cette rune alliée ne peut pas attaquer.')
      const targetIndex = player.board.findIndex((candidate) => candidate.instanceId === targetRune!.instanceId)
      const combat = resolveAttack(next, playerIndex, targetIndex, opponent.board.length ? 0 : undefined, true)
      if (!combat.ok) return fail(state, combat.error)
      return {
        ok: true,
        state: combat.state,
        events: [
          ...events,
          { type: 'EFFECT_RESOLVED', playerId: player.id, runeId: rune.id, message: `${rune.name} déclenche un assaut immédiat résolu selon les règles normales du combat.` },
          ...combat.events,
        ],
      }
    }
    case 'ember-collapse': {
      if (!requireBoardTarget('opponent')) return fail(state, 'Choisissez une rune adverse à détruire.')
      const [destroyed] = opponent.board.splice(target!.boardIndex!, 1)
      opponent.discard.unshift(destroyed.runeId)
      const sourceIndex = player.board.findIndex((candidate) => candidate.instanceId === boardRune.instanceId)
      player.board.splice(sourceIndex, 1)
      player.discard.unshift(boardRune.runeId)
      events.push({ type: 'RUNE_DESTROYED', playerId: opponent.id, instanceId: destroyed.instanceId, runeId: destroyed.runeId })
      events.push({ type: 'RUNE_DESTROYED', playerId: player.id, instanceId: boardRune.instanceId, runeId: boardRune.runeId })
      resolved(`${rune.name} s’effondre avec ${runeById[destroyed.runeId].name}.`)
      break
    }
    case 'tidal-drain': {
      opponent.hp = Math.max(0, opponent.hp - 1)
      const before = player.hp
      player.hp = Math.min(player.maxHp, player.hp + 1)
      events.push({ type: 'DAMAGE_DEALT', playerId: opponent.id, amount: 1, remainingHp: opponent.hp })
      if (player.hp > before) events.push({ type: 'HEALTH_RESTORED', playerId: player.id, amount: player.hp - before, totalHp: player.hp })
      resolved(`${rune.name} dérobe 1 PV à l’adversaire.`)
      break
    }
    case 'root-usurpation': {
      if (!requireBoardTarget('opponent')) return fail(state, 'Choisissez une rune adverse à engloutir.')
      const [destroyed] = opponent.board.splice(target!.boardIndex!, 1)
      opponent.discard.unshift(destroyed.runeId)
      const sourceIndex = player.board.findIndex((candidate) => candidate.instanceId === boardRune.instanceId)
      player.board.splice(sourceIndex, 1)
      opponent.board.push({
        ...boardRune,
        instanceId: instanceId(next, opponentOf(playerIndex), opponent.board.length),
        position: 'defense-up',
        effectUsed: true,
        attackUsed: true,
        neutralized: true,
        summonedOnTurn: next.turn,
      })
      events.push({ type: 'RUNE_DESTROYED', playerId: opponent.id, instanceId: destroyed.instanceId, runeId: destroyed.runeId })
      resolved(`${runeById[destroyed.runeId].name} est détruite ; ${rune.name} obstrue désormais le terrain adverse.`)
      break
    }
    case 'stone-sanctuary':
    case 'frost-negation':
      return fail(state, `${rune.effectName} s’active uniquement en réponse dans une chaîne.`)
    case 'gale-suspension':
      opponent.skipNextDraw = true
      resolved(`${opponent.name} sautera sa prochaine pioche normale.`)
      break
    case 'orbit-distortion': {
      if (opponent.hand.length === 0) return fail(state, 'La main adverse est vide.')
      next.rngSeed = (Math.imul(next.rngSeed, 1664525) + 1013904223) >>> 0
      const [returned] = opponent.hand.splice(next.rngSeed % opponent.hand.length, 1)
      opponent.deck.push(returned)
      resolved(`Une rune de la main adverse est replacée au fond du grimoire.`)
      break
    }
    case 'veil-banishment': {
      if (!requireBoardTarget('opponent') || targetRune!.position === 'defense-down') return fail(state, 'Choisissez une rune adverse révélée à bannir.')
      const [banished] = opponent.board.splice(target!.boardIndex!, 1)
      opponent.banished.unshift(banished.runeId)
      resolved(`${runeById[banished.runeId].name} est bannie de l’arène.`)
      break
    }
    case 'solar-restoration': {
      if (!target?.runeId || !player.banished.includes(target.runeId)) return fail(state, 'Choisissez une rune bannie à restaurer.')
      if (player.board.length >= MAX_BOARD) return fail(state, 'Votre terrain est complet.')
      player.banished.splice(player.banished.indexOf(target.runeId), 1)
      const restored: BoardRune = {
        instanceId: instanceId(next, playerIndex, player.board.length), runeId: target.runeId,
        position: 'defense-up', effectUsed: true, attackUsed: true, summonedOnTurn: next.turn,
        disabledTurns: 0, attackShield: false, neutralized: true,
      }
      player.board.push(restored)
      events.push({ type: 'RUNE_SUMMONED', playerId: player.id, instanceId: restored.instanceId, runeId: restored.runeId, position: restored.position })
      events.push(...registerSpiritProgress(next, playerIndex, restored.runeId))
      resolved(`${runeById[restored.runeId].name} revient en défense révélée.`)
      break
    }
    case 'astral-gate': {
      if (!target?.runeId || !player.discard.includes(target.runeId)) return fail(state, 'Choisissez une rune de votre cimetière.')
      if (player.board.length >= MAX_BOARD) return fail(state, 'Votre terrain est complet.')
      if (target.position === 'defense-up') return fail(state, 'Une invocation en garde doit être voilée.')
      const sourceIndex = player.board.findIndex((candidate) => candidate.instanceId === boardRune.instanceId)
      player.board.splice(sourceIndex, 1)
      player.discard.unshift(boardRune.runeId)
      player.discard.splice(player.discard.lastIndexOf(target.runeId), 1)
      const position: Position = target.position === 'attack' ? 'attack' : 'defense-down'
      const summoned: BoardRune = {
        instanceId: instanceId(next, playerIndex, player.board.length), runeId: target.runeId, position,
        effectUsed: false, attackUsed: false, summonedOnTurn: next.turn,
        disabledTurns: 0, attackShield: false, neutralized: position === 'defense-down',
      }
      player.board.push(summoned)
      events.push({ type: 'RUNE_SUMMONED', playerId: player.id, instanceId: summoned.instanceId, runeId: summoned.runeId, position })
      events.push(...registerSpiritProgress(next, playerIndex, summoned.runeId))
      resolved(`${rune.name} ouvre la porte à ${runeById[summoned.runeId].name}.`)
      break
    }
    case 'chrono-repeat': {
      if (!requireBoardTarget('self') || targetRune!.instanceId === boardRune.instanceId) return fail(state, 'Choisissez une autre rune alliée.')
      targetRune!.effectUsed = false
      const sourceIndex = player.board.findIndex((candidate) => candidate.instanceId === boardRune.instanceId)
      player.board.splice(sourceIndex, 1)
      player.discard.unshift(boardRune.runeId)
      resolved(`${runeById[targetRune!.runeId].name} peut de nouveau activer son pouvoir.`)
      break
    }
    case 'rift-overwrite': {
      if (!requireBoardTarget('opponent')) return fail(state, 'Choisissez une rune adverse à engloutir dans la faille.')
      const [returned] = opponent.board.splice(target!.boardIndex!, 1)
      opponent.deck.push(returned.runeId)
      player.charges += 1
      resolved(`${runeById[returned.runeId].name} rejoint le fond du grimoire adverse et une faille s’ouvre.`)
      break
    }
    case 'genesis-overflow': {
      const created: string[] = []
      for (let count = 0; count < 2; count += 1) {
        next.rngSeed = (Math.imul(next.rngSeed, 1664525) + 1013904223) >>> 0
        const generated = standardRunes[next.rngSeed % standardRunes.length]
        player.hand.push(generated.id)
        created.push(generated.name)
      }
      player.hp = Math.max(0, player.hp - 1)
      events.push({ type: 'DAMAGE_DEALT', playerId: player.id, amount: 1, remainingHp: player.hp })
      resolved(`${created.join(' et ')} sont créées ; la genèse exige 1 PV.`)
      break
    }
    case 'tempest-overdrive': {
      if (!requireBoardTarget('self')) return fail(state, 'Choisissez une rune alliée à relancer.')
      targetRune!.attackUsed = false
      player.hp = Math.max(0, player.hp - 1)
      events.push({ type: 'DAMAGE_DEALT', playerId: player.id, amount: 1, remainingHp: player.hp })
      resolved(`${runeById[targetRune!.runeId].name} retrouve son assaut ; la surcharge coûte 1 PV.`)
      break
    }
    default:
      boardRune.effectUsed = false
      return fail(state, `${rune.effectName} attend encore son résolveur dédié.`)
  }

  next.revision += 1
  if (opponent.hp === 0) {
    next.winnerId = player.id
    events.push({ type: 'DUEL_ENDED', winnerId: player.id })
  } else if (player.hp === 0) {
    next.winnerId = opponent.id
    events.push({ type: 'DUEL_ENDED', winnerId: opponent.id })
  }
  return { ok: true, state: next, events }
}

const resolveSummon = (state: DuelState, activeIndex: 0 | 1, handIndex: number, position: Position): DispatchResult => {
  const next = clone(state)
  const player = next.players[activeIndex]
  if (next.phase !== 'main') return fail(state, 'Invocation impossible hors de la phase principale.')
  if (next.summonsRemaining < 1) return fail(state, 'Aucune invocation disponible.')
  if (player.board.length >= MAX_BOARD) return fail(state, 'Votre terrain est complet.')
  if (position === 'defense-up') return fail(state, 'Une rune invoquée en garde doit être placée en défense voilée.')
  const runeId = player.hand[handIndex]
  if (!runeId) return fail(state, 'Rune absente de la main.')
  player.hand.splice(handIndex, 1)
  const summoned: BoardRune = {
    instanceId: instanceId(state, activeIndex, player.board.length), runeId, position,
    effectUsed: false, attackUsed: false, summonedOnTurn: next.turn,
    disabledTurns: 0, attackShield: false, neutralized: position === 'defense-down',
  }
  player.board.push(summoned)
  next.summonsRemaining -= 1
  const progressEvents = registerSpiritProgress(next, activeIndex, runeId)
  next.revision += 1
  return { ok: true, state: next, events: [{ type: 'RUNE_SUMMONED', playerId: player.id, instanceId: summoned.instanceId, runeId, position }, ...progressEvents] }
}

function resolveAttack(state: DuelState, activeIndex: 0 | 1, attackerIndex: number, defenderIndex?: number, immediate = false): DispatchResult {
  const next = clone(state)
  const player = next.players[activeIndex]
  const opponent = next.players[opponentOf(activeIndex)]
  const events: DuelEvent[] = []
  if (!immediate && next.phase !== 'battle') return fail(state, 'Une attaque se déclare pendant la phase de combat.')
  if (next.turn === 1 && next.activePlayer === 0) return fail(state, 'Le premier joueur ne peut pas attaquer au premier tour.')
  const attacker = player.board[attackerIndex]
  if (!attacker || attacker.position !== 'attack' || attacker.attackUsed || attacker.disabledTurns > 0 || attacker.neutralized) return fail(state, 'Cette rune ne peut pas attaquer.')
  const defender = defenderIndex === undefined ? undefined : opponent.board[defenderIndex]
  if (opponent.board.length > 0 && !defender) return fail(state, 'Choisissez une rune adverse.')
  attacker.attackUsed = true
  events.push({ type: 'ATTACK_DECLARED', playerId: player.id, attackerId: attacker.instanceId, attackerRuneId: attacker.runeId, defenderId: defender?.instanceId, defenderRuneId: defender?.runeId })
  if (!defender) {
    events.push({ type: 'COMBAT_RESOLVED', playerId: player.id, attackerId: attacker.instanceId, attackerRuneId: attacker.runeId, relation: 'direct', defenderWasConcealed: false })
    opponent.hp = Math.max(0, opponent.hp - 1)
    events.push({ type: 'DAMAGE_DEALT', playerId: opponent.id, amount: 1, remainingHp: opponent.hp })
  } else {
    const defenderWasConcealed = defender.position === 'defense-down'
    if (defender.position === 'defense-down') {
      defender.position = 'defense-up'
      defender.neutralized = false
      events.push({ type: 'POSITION_CHANGED', playerId: opponent.id, instanceId: defender.instanceId, runeId: defender.runeId, position: 'defense-up' })
    }
    const targetIndex = opponent.board.indexOf(defender)
    const forcedAdvantage = attacker.grantedAdvantageTurn === next.turn
    const attackerHasAdvantage = runeById[attacker.runeId].strengths.includes(runeById[defender.runeId].element)
    const defenderHasAdvantage = runeById[defender.runeId].strengths.includes(runeById[attacker.runeId].element)
    const mutualAdvantage = attackerHasAdvantage && defenderHasAdvantage
    const relation = elementalRelation(attacker.runeId, defender.runeId, forcedAdvantage)
    events.push({ type: 'COMBAT_RESOLVED', playerId: player.id, attackerId: attacker.instanceId, attackerRuneId: attacker.runeId, defenderId: defender.instanceId, defenderRuneId: defender.runeId, relation, defenderWasConcealed })
    const shielded = defender.attackShield
    if (shielded) {
      defender.attackShield = false
      events.push({ type: 'EFFECT_RESOLVED', playerId: opponent.id, runeId: defender.runeId, message: `${runeById[defender.runeId].name} résiste à sa destruction grâce au bouclier de pierre.` })
    } else {
      opponent.board.splice(targetIndex, 1)
      opponent.discard.unshift(defender.runeId)
      events.push({ type: 'RUNE_DESTROYED', playerId: opponent.id, instanceId: defender.instanceId, runeId: defender.runeId })
    }
    if (defender.position === 'attack') {
      opponent.hp = Math.max(0, opponent.hp - 1)
      events.push({ type: 'DAMAGE_DEALT', playerId: opponent.id, amount: 1, remainingHp: opponent.hp })
    }
    if (mutualAdvantage || (!forcedAdvantage && !attackerHasAdvantage)) {
      const sourceIndex = player.board.findIndex((candidate) => candidate.instanceId === attacker.instanceId)
      if (sourceIndex >= 0) {
        if (attacker.attackShield) {
          attacker.attackShield = false
          events.push({ type: 'EFFECT_RESOLVED', playerId: player.id, runeId: attacker.runeId, message: `${runeById[attacker.runeId].name} résiste à sa destruction grâce au bouclier de pierre.` })
        } else {
          player.board.splice(sourceIndex, 1)
          player.discard.unshift(attacker.runeId)
          events.push({ type: 'RUNE_DESTROYED', playerId: player.id, instanceId: attacker.instanceId, runeId: attacker.runeId })
        }
        player.hp = Math.max(0, player.hp - 1)
        events.push({ type: 'DAMAGE_DEALT', playerId: player.id, amount: 1, remainingHp: player.hp })
      }
    }
  }
  next.revision += 1
  if (opponent.hp === 0 || player.hp === 0) {
    next.winnerId = opponent.hp === 0 ? player.id : opponent.id
    events.push({ type: 'DUEL_ENDED', winnerId: next.winnerId })
  }
  return { ok: true, state: next, events }
}

const resolveSpirit = (state: DuelState, playerIndex: 0 | 1): DispatchResult => {
  const next = clone(state)
  const player = next.players[playerIndex]
  const opponent = next.players[opponentOf(playerIndex)]
  const spirit = spiritById[player.spiritId]
  if (!spirit) return fail(state, 'Ce Spirit est introuvable.')
  if (next.phase === 'end') return fail(state, 'Un Spirit ne peut pas s’éveiller pendant la phase finale.')
  if (player.spiritUsed) return fail(state, 'Ce Spirit a déjà été éveillé pendant ce duel.')
  if (!spiritIsReady(player)) return fail(state, `Les sceaux élémentaires de ${spirit.name} ne sont pas encore réunis.`)

  player.spiritUsed = true
  player.activeSpiritId = spirit.id
  player.spiritExpiresOnTurn = next.turn
  const events: DuelEvent[] = [{ type: 'SPIRIT_AWAKENED', playerId: player.id, spiritId: spirit.id, effectName: spirit.effectName }]
  const damage = (amount: number) => {
    opponent.hp = Math.max(0, opponent.hp - amount)
    events.push({ type: 'DAMAGE_DEALT', playerId: opponent.id, amount, remainingHp: opponent.hp })
  }
  const heal = (amount: number) => {
    const before = player.hp
    player.hp = Math.min(player.maxHp, player.hp + amount)
    events.push({ type: 'HEALTH_RESTORED', playerId: player.id, amount: player.hp - before, totalHp: player.hp })
  }
  const draw = (amount: number) => {
    for (let index = 0; index < amount && player.deck.length > 0; index += 1) {
      const runeId = player.deck.shift()!
      player.hand.push(runeId)
      events.push({ type: 'RUNE_DRAWN', playerId: player.id, runeId })
    }
    registerDrawOverflow(next, playerIndex)
  }
  const destroyOpponentRune = (revealedOnly = false, banish = false) => {
    const targetIndex = opponent.board.findIndex((rune) => !revealedOnly || rune.position !== 'defense-down')
    if (targetIndex < 0) return
    const [target] = opponent.board.splice(targetIndex, 1)
    if (banish) opponent.banished.unshift(target.runeId)
    else opponent.discard.unshift(target.runeId)
    events.push({ type: 'RUNE_DESTROYED', playerId: opponent.id, instanceId: target.instanceId, runeId: target.runeId })
  }

  switch (spirit.effectId) {
    case 'diego-blueprint': {
      next.rngSeed = (next.rngSeed * 1664525 + 1013904223) >>> 0
      const runeId = runes[next.rngSeed % runes.length].id
      player.hand.push(runeId)
      events.push({ type: 'RUNE_DRAWN', playerId: player.id, runeId })
      next.summonsRemaining += 1
      const spent = player.board.find((rune) => rune.effectUsed)
      if (spent) spent.effectUsed = false
      break
    }
    case 'flamberge-oath':
      damage(2)
      { const exhausted = player.board.find((rune) => rune.attackUsed); if (exhausted) exhausted.attackUsed = false }
      break
    case 'flame-god-reign':
      destroyOpponentRune(true)
      damage(1)
      break
    case 'samya-thread':
      draw(1)
      { const spent = player.board.find((rune) => rune.effectUsed); if (spent) spent.effectUsed = false }
      break
    case 'tiona-rush':
      player.board.forEach((rune) => { if (rune.position === 'attack') rune.attackUsed = false })
      break
    case 'twin-resonance':
      for (let index = 0; index < 2; index += 1) {
        next.rngSeed = (next.rngSeed * 1664525 + 1013904223) >>> 0
        const runeId = runes[next.rngSeed % runes.length].id
        player.hand.push(runeId)
        events.push({ type: 'RUNE_DRAWN', playerId: player.id, runeId })
      }
      next.summonsRemaining += 1
      break
    case 'isir-winter':
      opponent.board.forEach((rune) => { if (rune.position !== 'defense-down') rune.disabledTurns = Math.max(rune.disabledTurns, 2) })
      break
    case 'shaka-sanctuary':
      heal(2)
      player.board.forEach((rune) => { rune.attackShield = true })
      break
    case 'shaka-cycle':
      player.hand.push(...player.discard.splice(0, 2))
      next.summonsRemaining += 1
      break
    case 'shaka-arayashiki':
      draw(2)
      player.board.forEach((rune) => { rune.grantedAdvantageTurn = next.turn })
      break
    case 'gold-aegis':
      heal(1)
      player.board.forEach((rune) => { rune.attackShield = true })
      break
    case 'morgane-pyre':
      destroyOpponentRune()
      if (opponent.discard.length > 0) opponent.banished.unshift(opponent.discard.shift()!)
      break
    case 'roshi-tempest':
      opponent.hand.push(...opponent.board.splice(0, 2).map((rune) => rune.runeId))
      break
    case 'serena-dominion':
      destroyOpponentRune(false, true)
      draw(1)
      break
    case 'rubberband-miracle':
      if (player.hp < opponent.hp) [player.hp, opponent.hp] = [opponent.hp, player.hp]
      else { damage(1); heal(1) }
      break
  }

  events.push({ type: 'EFFECT_RESOLVED', playerId: player.id, runeId: spirit.id, message: `${spirit.name} impose « ${spirit.effectName} » sur l’arène.` })
  if (opponent.hp === 0) {
    next.winnerId = player.id
    events.push({ type: 'DUEL_ENDED', winnerId: player.id })
  }
  next.revision += 1
  return { ok: true, state: next, events }
}

const resolveAdvancePhase = (state: DuelState, activeIndex: 0 | 1): DispatchResult => {
  const next = clone(state)
  const opponentIndex = opponentOf(activeIndex)
  const phaseOrder: Phase[] = ['main', 'battle', 'end']
  let drawnRuneId: string | undefined
  const events: DuelEvent[] = []
  if (next.phase !== 'end') {
    next.phase = phaseOrder[phaseOrder.indexOf(next.phase) + 1]
  } else {
    const outgoing = next.players[activeIndex]
    if (outgoing.activeSpiritId && outgoing.spiritExpiresOnTurn === next.turn) {
      events.push({ type: 'SPIRIT_DEPARTED', playerId: outgoing.id, spiritId: outgoing.activeSpiritId })
      delete outgoing.activeSpiritId
      delete outgoing.spiritExpiresOnTurn
    }
    next.activePlayer = opponentIndex
    next.turn += 1
    next.phase = 'main'
    const nextPlayer = next.players[next.activePlayer]
    next.summonsRemaining = 1
    if (nextPlayer.charges > 0) {
      nextPlayer.charges -= 1
      next.summonsRemaining += 1
      events.push({ type: 'EFFECT_RESOLVED', playerId: nextPlayer.id, runeId: 'space-time-rift', message: 'Une faille temporelle s’ouvre : vous gagnez 1 invocation supplémentaire ce tour.' })
    }
    nextPlayer.board.forEach((rune) => {
      rune.attackUsed = false
      rune.disabledTurns = Math.max(0, rune.disabledTurns - 1)
      if (rune.grantedAdvantageTurn !== next.turn) rune.grantedAdvantageTurn = undefined
    })
    if (nextPlayer.skipNextDraw) {
      nextPlayer.skipNextDraw = false
      events.push({ type: 'EFFECT_RESOLVED', playerId: nextPlayer.id, runeId: 'air-gale-alter', message: 'La suspension du vent dissipe la pioche normale de ce tour.' })
    } else if (nextPlayer.deck.length > 0) {
      drawnRuneId = nextPlayer.deck.shift()!
      nextPlayer.hand.push(drawnRuneId)
      registerDrawOverflow(next, next.activePlayer)
    }
  }
  next.revision += 1
  events.push({ type: 'PHASE_CHANGED', phase: next.phase, turn: next.turn, activePlayer: next.activePlayer })
  if (drawnRuneId) events.push({ type: 'RUNE_DRAWN', playerId: next.players[next.activePlayer].id, runeId: drawnRuneId })
  return { ok: true, state: next, events }
}

const effectTargetsFor = (state: DuelState, playerIndex: 0 | 1, boardIndex: number): Array<{ target?: EffectTarget; label?: string }> => {
  const player = state.players[playerIndex]
  const opponent = state.players[opponentOf(playerIndex)]
  const source = player.board[boardIndex]
  if (!source) return []
  const namedBoard = (owner: 'self' | 'opponent') => {
    const board = owner === 'self' ? player.board : opponent.board
    return board.map((rune, index) => ({
      target: { owner, boardIndex: index },
      label: rune.position === 'defense-down' ? `Rune voilée ${index + 1}` : runeById[rune.runeId].name,
    }))
  }
  switch (runeById[source.runeId].effectId) {
    case 'wild-exchange':
    case 'gust-banish':
    case 'veil-drop':
    case 'ember-collapse':
    case 'root-usurpation':
    case 'rift-overwrite':
      return namedBoard('opponent')
    case 'veil-banishment':
      return namedBoard('opponent').filter((_, index) => opponent.board[index].position !== 'defense-down')
    case 'stone-guard':
    case 'reveal-truth':
    case 'tempest-break':
    case 'chrono-repeat':
    case 'tempest-overdrive':
      return namedBoard('self')
    case 'future-sight':
      return player.deck.map((runeId) => ({ target: { runeId }, label: runeById[runeId].name }))
    case 'time-surge':
      return player.hand.flatMap((runeId) => ([
        { target: { runeId, position: 'attack' as const }, label: `${runeById[runeId].name} · Assaut` },
        { target: { runeId, position: 'defense-down' as const }, label: `${runeById[runeId].name} · Défense voilée` },
      ]))
    case 'astral-return':
      return player.discard.length > 0
        ? player.discard.map((runeId) => ({ target: { runeId }, label: runeById[runeId].name }))
        : player.deck.length > 0 ? [{ target: {}, label: 'Puiser 1 rune dans le cosmos' }] : []
    case 'solar-restoration':
      return player.banished.map((runeId) => ({ target: { runeId }, label: runeById[runeId].name }))
    case 'astral-gate':
      return player.discard.flatMap((runeId) => ([
        { target: { runeId, position: 'attack' as const }, label: `${runeById[runeId].name} · Assaut` },
        { target: { runeId, position: 'defense-down' as const }, label: `${runeById[runeId].name} · Défense voilée` },
      ]))
    case 'frost-sigil':
      return runes.map((rune) => rune.element)
        .filter((element, index, elements) => elements.indexOf(element) === index)
        .map((element) => ({ target: { element }, label: element }))
    default:
      return [{ target: undefined, label: undefined }]
  }
}

const activeEffectResponseOptions = (state: DuelState, actorIndex: 0 | 1, links: ChainLink[] = []): ResponseOption[] => {
  const responderIndex = opponentOf(actorIndex)
  const responder = state.players[responderIndex]
  if (!responder.chainEnabled) return []
  const options: ResponseOption[] = []
  responder.board.forEach((boardRune, boardIndex) => {
    if (!canRespond(boardRune)) return
    if (links.some((link) => link.playerId === responder.id && link.boardIndex === boardIndex)) return
    effectTargetsFor(state, responderIndex, boardIndex).forEach(({ target, label }) => {
      const preview = resolveEffect(state, responderIndex, boardIndex, target)
      if (!preview.ok) return
      options.push({
        boardIndex,
        runeId: boardRune.runeId,
        alterName: runeById[boardRune.runeId].effectName,
        responseKind: 'activate-effect',
        target,
        targetLabel: label,
      })
    })
  })
  return options
}

const mergeResponseOptions = (preferred: ResponseOption[], generic: ResponseOption[]) => {
  const preferredBoards = new Set(preferred.map((option) => option.boardIndex))
  return [...preferred, ...generic.filter((option) => !preferredBoards.has(option.boardIndex))]
}

const targetInstanceFor = (state: DuelState, playerIndex: 0 | 1, target?: EffectTarget) => {
  if (target?.boardIndex === undefined) return undefined
  const ownerIndex = target.owner === 'opponent' ? opponentOf(playerIndex) : playerIndex
  return state.players[ownerIndex].board[target.boardIndex]?.instanceId
}

const remapTarget = (state: DuelState, playerIndex: 0 | 1, link: ChainLink): { valid: boolean; target?: EffectTarget } => {
  if (link.target?.boardIndex === undefined || !link.targetInstanceId) return { valid: true, target: link.target }
  const ownerIndex = link.target.owner === 'opponent' ? opponentOf(playerIndex) : playerIndex
  const boardIndex = state.players[ownerIndex].board.findIndex((rune) => rune.instanceId === link.targetInstanceId)
  if (boardIndex < 0) return { valid: false }
  return { valid: true, target: { ...link.target, boardIndex } }
}

const resolveActiveChain = (state: DuelState, leadingEvents: DuelEvent[] = []): DispatchResult => {
  const chain = state.activeChain
  if (!chain) return fail(state, 'Aucune chaîne à résoudre.')
  const negatedLinks = new Set<number>()
  for (let index = chain.links.length - 1; index > 0; index -= 1) {
    if (!negatedLinks.has(index) && chain.links[index].kind === 'alter' && chain.links[index].responseKind === 'negate') negatedLinks.add(index - 1)
  }

  let next = clone(state)
  delete next.activeChain
  const original = chain.links[0]
  const responseEvents: DuelEvent[] = [{
    type: 'CHAIN_RESOLUTION_STARTED',
    links: chain.links.map((link) => ({ playerId: link.playerId, runeId: link.runeId, label: link.label })),
  }]

  for (let index = chain.links.length - 1; index > 0; index -= 1) {
    const link = chain.links[index]
    if (link.responseKind !== 'activate-effect') continue
    const playerIndex = activeIndexFor(next, link.playerId) as 0 | 1
    const boardIndex = link.instanceId
      ? next.players[playerIndex].board.findIndex((rune) => rune.instanceId === link.instanceId)
      : link.boardIndex
    if (boardIndex < 0) continue
    if (negatedLinks.has(index)) {
      next.players[playerIndex].board[boardIndex].effectUsed = true
      responseEvents.push({ type: 'EFFECT_NEGATED', playerId: link.playerId, runeId: link.runeId })
      continue
    }
    const remapped = remapTarget(next, playerIndex, link)
    if (!remapped.valid) {
      next.players[playerIndex].board[boardIndex].effectUsed = true
      responseEvents.push({ type: 'EFFECT_NEGATED', playerId: link.playerId, runeId: link.runeId })
      continue
    }
    const resolvedResponse = resolveEffect(next, playerIndex, boardIndex, remapped.target)
    if (!resolvedResponse.ok) {
      next.players[playerIndex].board[boardIndex].effectUsed = true
      responseEvents.push({ type: 'EFFECT_NEGATED', playerId: link.playerId, runeId: link.runeId })
      continue
    }
    next = resolvedResponse.state
    responseEvents.push(...resolvedResponse.events)
  }

  const actorIndex = activeIndexFor(next, original.playerId) as 0 | 1
  if (next.winnerId) {
    return { ok: true, state: next, events: [...leadingEvents, ...responseEvents, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }] }
  }

  if (original.kind === 'phase') {
    const resolved = resolveAdvancePhase(next, actorIndex)
    if (!resolved.ok) return resolved
    return { ok: true, state: resolved.state, events: [...leadingEvents, ...responseEvents, ...resolved.events, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }] }
  }

  if (original.kind === 'attack') {
    const guard = chain.links.find((link) => link.responseKind === 'guard-attack')
    if (guard?.target?.boardIndex !== undefined) {
      const defender = next.players[opponentOf(actorIndex)].board[guard.target.boardIndex]
      if (defender) defender.attackShield = true
    }
    const attackerIndex = original.instanceId
      ? next.players[actorIndex].board.findIndex((rune) => rune.instanceId === original.instanceId)
      : original.boardIndex
    if (attackerIndex < 0) {
      next.revision += 1
      return {
        ok: true,
        state: next,
        events: [...leadingEvents, ...responseEvents, { type: 'EFFECT_RESOLVED', playerId: original.playerId, runeId: original.runeId, message: 'L’assaut est interrompu : la rune attaquante a quitté le terrain.' }, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }],
      }
    }
    let defenderIndex = original.defenderIndex
    if (original.defenderInstanceId) {
      defenderIndex = next.players[opponentOf(actorIndex)].board.findIndex((rune) => rune.instanceId === original.defenderInstanceId)
      if (defenderIndex < 0) {
        next.revision += 1
        return {
          ok: true,
          state: next,
          events: [...leadingEvents, ...responseEvents, { type: 'EFFECT_RESOLVED', playerId: original.playerId, runeId: original.runeId, message: 'L’assaut est interrompu : sa cible a quitté le terrain.' }, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }],
        }
      }
    }
    const resolved = resolveAttack(next, actorIndex, attackerIndex, defenderIndex)
    if (!resolved.ok) {
      next.revision += 1
      return {
        ok: true,
        state: next,
        events: [...leadingEvents, ...responseEvents, { type: 'EFFECT_RESOLVED', playerId: original.playerId, runeId: original.runeId, message: `L’assaut est interrompu : ${resolved.error}` }, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }],
      }
    }
    return { ok: true, state: resolved.state, events: [...leadingEvents, ...responseEvents, ...resolved.events, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }] }
  }

  if (original.kind === 'summon') {
    const lock = chain.links.find((link) => link.responseKind === 'lock-summon')
    if (lock && original.summonedInstanceId) {
      const summoned = next.players[actorIndex].board.find((rune) => rune.instanceId === original.summonedInstanceId)
      if (summoned) summoned.disabledTurns = Math.max(summoned.disabledTurns, 1)
    }
    const capture = chain.links.find((link) => link.responseKind === 'capture-summon')
    const captureEvents: DuelEvent[] = []
    if (capture && original.summonedInstanceId) {
      const responderIndex = activeIndexFor(next, capture.playerId) as 0 | 1
      const responder = next.players[responderIndex]
      const summoner = next.players[actorIndex]
      const natureIndex = responder.board.findIndex((rune) => rune.instanceId === next.players[responderIndex].board[capture.boardIndex]?.instanceId)
      const summonedIndex = summoner.board.findIndex((rune) => rune.instanceId === original.summonedInstanceId)
      if (natureIndex >= 0 && summonedIndex >= 0) {
        const [nature] = responder.board.splice(natureIndex, 1)
        const [captured] = summoner.board.splice(summonedIndex, 1)
        responder.discard.unshift(nature.runeId)
        responder.board.push({
          ...captured,
          instanceId: instanceId(next, responderIndex, responder.board.length),
          effectUsed: true,
          attackUsed: true,
          summonedOnTurn: next.turn,
        })
        captureEvents.push({
          type: 'EFFECT_RESOLVED',
          playerId: responder.id,
          runeId: nature.runeId,
          message: `${runeById[nature.runeId].name} se sacrifie : ${runeById[captured.runeId].name} change de camp avant de pouvoir agir.`,
        })
      }
    }
    next.revision += 1
    return { ok: true, state: next, events: [...leadingEvents, ...responseEvents, ...captureEvents, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }] }
  }

  if (original.kind === 'spirit') {
    if (negatedLinks.has(0)) {
      next.players[actorIndex].spiritUsed = true
      next.revision += 1
      return { ok: true, state: next, events: [...leadingEvents, ...responseEvents, { type: 'EFFECT_NEGATED', playerId: original.playerId, runeId: original.runeId }, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }] }
    }
    const resolved = resolveSpirit(next, actorIndex)
    if (!resolved.ok) return resolved
    return { ok: true, state: resolved.state, events: [...leadingEvents, ...responseEvents, ...resolved.events, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }] }
  }

  if (!negatedLinks.has(0)) {
    const sourceIndex = original.instanceId
      ? next.players[actorIndex].board.findIndex((rune) => rune.instanceId === original.instanceId)
      : original.boardIndex
    if (sourceIndex >= 0) {
      const remapped = remapTarget(next, actorIndex, original)
      if (!remapped.valid) {
        next.players[actorIndex].board[sourceIndex].effectUsed = true
        next.revision += 1
        return { ok: true, state: next, events: [...leadingEvents, ...responseEvents, { type: 'EFFECT_NEGATED', playerId: original.playerId, runeId: original.runeId }, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }] }
      }
      const resolved = resolveEffect(next, actorIndex, sourceIndex, remapped.target)
      if (!resolved.ok) {
        next.players[actorIndex].board[sourceIndex].effectUsed = true
        next.revision += 1
        return { ok: true, state: next, events: [...leadingEvents, ...responseEvents, { type: 'EFFECT_NEGATED', playerId: original.playerId, runeId: original.runeId }, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }] }
      }
      return { ok: true, state: resolved.state, events: [...leadingEvents, ...responseEvents, ...resolved.events, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }] }
    }
    next.revision += 1
    return { ok: true, state: next, events: [...leadingEvents, ...responseEvents, { type: 'EFFECT_NEGATED', playerId: original.playerId, runeId: original.runeId }, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }] }
  }

  const source = original.instanceId
    ? next.players[actorIndex].board.find((rune) => rune.instanceId === original.instanceId)
    : next.players[actorIndex].board[original.boardIndex]
  if (source) source.effectUsed = true
  next.revision += 1
  return {
    ok: true,
    state: next,
    events: [...leadingEvents, ...responseEvents, { type: 'EFFECT_NEGATED', playerId: original.playerId, runeId: original.runeId }, { type: 'CHAIN_RESOLVED', linkCount: chain.links.length }],
  }
}

export const dispatch = (state: DuelState, command: DuelCommand): DispatchResult => {
  if (state.winnerId) return fail(state, 'Le duel est terminé.')

  if (command.type === 'SET_CHAIN_ENABLED') {
    const playerIndex = activeIndexFor(state, command.playerId)
    if (playerIndex < 0) return fail(state, 'Duelliste introuvable.')
    const next = clone(state)
    next.players[playerIndex].chainEnabled = command.enabled
    next.revision += 1
    return { ok: true, state: next, events: [{ type: 'CHAIN_PREFERENCE_CHANGED', playerId: command.playerId, enabled: command.enabled }] }
  }

  if (state.activeChain) {
    const chain = state.activeChain
    if (command.type !== 'PASS_RESPONSE' && command.type !== 'RESPOND_ALTER') return fail(state, 'Une réponse est attendue avant de poursuivre le duel.')
    if (command.playerId !== chain.responderPlayerId) return fail(state, 'Ce joueur ne possède pas la priorité de réponse.')

    if (command.type === 'PASS_RESPONSE') {
      if (chain.passCount >= 1) return resolveActiveChain(state, [{ type: 'PRIORITY_PASSED', playerId: command.playerId }])
      const next = clone(state)
      const passerIndex = activeIndexFor(next, command.playerId) as 0 | 1
      const nextResponderIndex = opponentOf(passerIndex)
      const nextResponderId = next.players[nextResponderIndex].id
      const latestLink = next.activeChain!.links.at(-1)!
      const nextOptions = mergeResponseOptions(
        responseOptionsFor(next, passerIndex, latestLink.target, next.activeChain!.links),
        activeEffectResponseOptions(next, passerIndex, next.activeChain!.links),
      )
      if (nextOptions.length === 0) return resolveActiveChain(state, [{ type: 'PRIORITY_PASSED', playerId: command.playerId }])
      next.activeChain!.responderPlayerId = nextResponderId
      next.activeChain!.options = nextOptions
      next.activeChain!.passCount = 1
      next.revision += 1
      return {
        ok: true,
        state: next,
        events: [{ type: 'PRIORITY_PASSED', playerId: command.playerId }, { type: 'RESPONSE_AVAILABLE', playerId: nextResponderId, optionCount: nextOptions.length }],
      }
    }

    const option = command.optionIndex === undefined
      ? chain.options.find((candidate) => candidate.boardIndex === command.boardIndex)
      : chain.options[command.optionIndex]
    if (option && option.boardIndex !== command.boardIndex) return fail(state, 'Cette réponse n’est plus disponible.')
    if (!option) return fail(state, 'Cet Alter ne peut pas répondre à cette chaîne.')
    const next = clone(state)
    const responderIndex = activeIndexFor(next, chain.responderPlayerId) as 0 | 1
    const responseRune = next.players[responderIndex].board[option.boardIndex]
    if (!responseRune) return fail(state, 'La chaîne ne peut plus être résolue.')
    const responseWasVeiled = responseRune.position === 'defense-down'
    if (responseWasVeiled) {
      responseRune.position = 'defense-up'
      responseRune.neutralized = false
    }
    if (option.responseKind !== 'activate-effect') responseRune.effectUsed = true
    const responseTarget = option.target ?? (option.targetBoardIndex === undefined ? undefined : { owner: 'self' as const, boardIndex: option.targetBoardIndex })
    const responseLink: ChainLink = {
      kind: 'alter',
      playerId: chain.responderPlayerId,
      boardIndex: option.boardIndex,
      runeId: responseRune.runeId,
      label: option.alterName,
      target: responseTarget,
      responseKind: option.responseKind,
      instanceId: responseRune.instanceId,
      targetInstanceId: targetInstanceFor(next, responderIndex, responseTarget),
      targetLabel: option.targetLabel,
    }
    next.activeChain!.links.push(responseLink)
    const nextResponderIndex = opponentOf(responderIndex)
    const nextResponderId = next.players[nextResponderIndex].id
    const nextOptions = mergeResponseOptions(
      responseOptionsFor(next, responderIndex, responseLink.target, next.activeChain!.links),
      activeEffectResponseOptions(next, responderIndex, next.activeChain!.links),
    )
    next.activeChain!.responderPlayerId = nextResponderId
    next.activeChain!.options = nextOptions
    next.activeChain!.passCount = 0
    next.revision += 1
    const addedEvents: DuelEvent[] = [
      ...(responseWasVeiled ? [{ type: 'POSITION_CHANGED' as const, playerId: chain.responderPlayerId, instanceId: responseRune.instanceId, runeId: responseRune.runeId, position: 'defense-up' as const }] : []),
      { type: 'ALTER_ACTIVATED', playerId: chain.responderPlayerId, runeId: responseRune.runeId, alterName: option.alterName },
      { type: 'CHAIN_LINK_ADDED', playerId: chain.responderPlayerId, runeId: responseRune.runeId, label: option.alterName, linkCount: next.activeChain!.links.length },
    ]
    if (nextOptions.length === 0) return resolveActiveChain(next, addedEvents)
    return { ok: true, state: next, events: [...addedEvents, { type: 'RESPONSE_AVAILABLE', playerId: nextResponderId, optionCount: nextOptions.length }] }
  }

  if (state.pendingDiscard) {
    if (command.type !== 'DISCARD_FROM_HAND') return fail(state, `${state.players.find((player) => player.id === state.pendingDiscard!.playerId)?.name ?? 'Un duelliste'} doit d’abord défausser ${state.pendingDiscard.amount} rune${state.pendingDiscard.amount > 1 ? 's' : ''}.`)
    if (command.playerId !== state.pendingDiscard.playerId) return fail(state, 'Cette défausse appartient à l’autre duelliste.')
    const playerIndex = activeIndexFor(state, command.playerId)
    if (playerIndex < 0) return fail(state, 'Duelliste introuvable.')
    const next = clone(state)
    const player = next.players[playerIndex]
    const runeId = player.hand[command.handIndex]
    if (!runeId) return fail(state, 'Choisissez une rune valide à défausser.')
    player.hand.splice(command.handIndex, 1)
    player.discard.unshift(runeId)
    const amount = Math.max(0, player.hand.length - MAX_HAND)
    if (amount === 0) delete next.pendingDiscard
    else next.pendingDiscard = { playerId: player.id, amount, reason: 'draw-overflow' }
    next.revision += 1
    return { ok: true, state: next, events: [{ type: 'RUNE_DISCARDED', playerId: player.id, runeId, reason: 'hand-limit' }] }
  }

  if (command.type === 'DISCARD_FROM_HAND') return fail(state, 'Aucune défausse n’est requise.')

  if (command.type === 'PASS_RESPONSE' || command.type === 'RESPOND_ALTER') return fail(state, 'Aucune chaîne n’attend de réponse.')

  const playerIndex = activeIndexFor(state, command.playerId)
  if (playerIndex !== state.activePlayer) return fail(state, 'Ce n’est pas votre tour.')
  const activeIndex = playerIndex as 0 | 1

  if (command.type === 'AWAKEN_SPIRIT') {
    const validated = resolveSpirit(state, activeIndex)
    if (!validated.ok) return validated
    const options = mergeResponseOptions(responseOptionsFor(state, activeIndex), activeEffectResponseOptions(state, activeIndex))
    if (options.length === 0) return validated
    const next = clone(state)
    const player = next.players[activeIndex]
    const spirit = spiritById[player.spiritId]
    const responderId = next.players[opponentOf(activeIndex)].id
    next.activeChain = {
      actorPlayerId: command.playerId,
      responderPlayerId: responderId,
      sourceBoardIndex: -1,
      sourceRuneId: spirit.id,
      options,
      passCount: 0,
      links: [{ kind: 'spirit', playerId: command.playerId, boardIndex: -1, runeId: spirit.id, label: spirit.effectName }],
    }
    next.revision += 1
    return { ok: true, state: next, events: [{ type: 'CHAIN_OPENED', playerId: command.playerId, runeId: spirit.id, responderId, label: `Éveil de ${spirit.name}` }, { type: 'RESPONSE_AVAILABLE', playerId: responderId, optionCount: options.length }] }
  }

  if (command.type === 'ACTIVATE_EFFECT') {
    if (state.phase === 'end') return fail(state, 'Les pouvoirs ne peuvent plus être activés pendant la phase finale.')
    const validated = resolveEffect(state, activeIndex, command.boardIndex, command.target)
    if (!validated.ok) return validated
    const options = mergeResponseOptions(
      responseOptionsFor(state, activeIndex, command.target),
      activeEffectResponseOptions(state, activeIndex),
    )
    if (options.length === 0) return validated
    const next = clone(state)
    const source = next.players[activeIndex].board[command.boardIndex]
    const revealEvents: DuelEvent[] = []
    if (source.position === 'defense-down') {
      source.position = 'defense-up'
      source.neutralized = false
      revealEvents.push({ type: 'POSITION_CHANGED', playerId: command.playerId, instanceId: source.instanceId, runeId: source.runeId, position: 'defense-up' })
    }
    const responderId = next.players[opponentOf(activeIndex)].id
    next.activeChain = {
      actorPlayerId: command.playerId,
      responderPlayerId: responderId,
      sourceBoardIndex: command.boardIndex,
      sourceRuneId: source.runeId,
      target: command.target,
      options,
      passCount: 0,
      links: [{ kind: 'effect', playerId: command.playerId, boardIndex: command.boardIndex, runeId: source.runeId, label: runeById[source.runeId].effectName, target: command.target, instanceId: source.instanceId, targetInstanceId: targetInstanceFor(next, activeIndex, command.target) }],
    }
    next.revision += 1
    return {
      ok: true,
      state: next,
      events: [
        ...revealEvents,
        { type: 'CHAIN_OPENED', playerId: command.playerId, runeId: source.runeId, responderId, label: runeById[source.runeId].effectName },
        { type: 'RESPONSE_AVAILABLE', playerId: responderId, optionCount: options.length },
      ],
    }
  }

  if (command.type === 'CHANGE_POSITION') {
    if (state.phase !== 'main') return fail(state, 'La posture se change pendant la phase principale.')
    const next = clone(state)
    const rune = next.players[activeIndex].board[command.boardIndex]
    if (!rune) return fail(state, 'Rune introuvable.')
    if (rune.summonedOnTurn === next.turn) return fail(state, 'Une rune invoquée ce tour ne peut pas encore changer de posture.')
    if (rune.changedPositionTurn === next.turn) return fail(state, 'Cette rune a déjà changé de posture ce tour.')
    if (rune.position === command.position) return fail(state, 'Cette rune occupe déjà cette posture.')
    if (command.position === 'defense-down') return fail(state, 'Une rune révélée ne peut être voilée que par un effet.')
    if (rune.position === 'defense-down' && command.position !== 'attack') return fail(state, 'Une rune voilée se révèle manuellement en passant en assaut.')
    rune.position = command.position
    rune.changedPositionTurn = next.turn
    rune.neutralized = false
    next.revision += 1
    return { ok: true, state: next, events: [{ type: 'POSITION_CHANGED', playerId: next.players[activeIndex].id, instanceId: rune.instanceId, runeId: rune.runeId, position: rune.position }] }
  }

  if (command.type === 'SUMMON_RUNE') {
    const summoned = resolveSummon(state, activeIndex, command.handIndex, command.position)
    if (!summoned.ok) return summoned
    const summonedBoardIndex = summoned.state.players[activeIndex].board.length - 1
    const summonedRune = summoned.state.players[activeIndex].board[summonedBoardIndex]
    const options = mergeResponseOptions(
      summonResponseOptions(summoned.state, activeIndex, summonedBoardIndex),
      activeEffectResponseOptions(summoned.state, activeIndex),
    )
    if (options.length === 0) return summoned
    const waiting = clone(summoned.state)
    const responderId = waiting.players[opponentOf(activeIndex)].id
    const concealed = summonedRune.position === 'defense-down'
    const label = concealed ? 'Invocation en défense voilée' : `Invocation de ${runeById[summonedRune.runeId].name}`
    waiting.activeChain = {
      actorPlayerId: command.playerId,
      responderPlayerId: responderId,
      sourceBoardIndex: summonedBoardIndex,
      sourceRuneId: summonedRune.runeId,
      options,
      passCount: 0,
      links: [{ kind: 'summon', playerId: command.playerId, boardIndex: summonedBoardIndex, runeId: summonedRune.runeId, label, summonedInstanceId: summonedRune.instanceId, instanceId: summonedRune.instanceId, concealed }],
    }
    waiting.revision += 1
    return { ok: true, state: waiting, events: [...summoned.events, { type: 'CHAIN_OPENED', playerId: command.playerId, runeId: summonedRune.runeId, responderId, label }, { type: 'RESPONSE_AVAILABLE', playerId: responderId, optionCount: options.length }] }
  }

  if (command.type === 'ATTACK') {
    const validated = resolveAttack(state, activeIndex, command.attackerIndex, command.defenderIndex)
    if (!validated.ok) return validated
    const options = mergeResponseOptions(
      attackResponseOptions(state, activeIndex, command.defenderIndex),
      activeEffectResponseOptions(state, activeIndex),
    )
    if (options.length === 0) return validated
    const waiting = clone(state)
    const attacker = waiting.players[activeIndex].board[command.attackerIndex]
    const responderId = waiting.players[opponentOf(activeIndex)].id
    const label = `Assaut de ${runeById[attacker.runeId].name}`
    waiting.activeChain = {
      actorPlayerId: command.playerId,
      responderPlayerId: responderId,
      sourceBoardIndex: command.attackerIndex,
      sourceRuneId: attacker.runeId,
      options,
      passCount: 0,
      links: [{ kind: 'attack', playerId: command.playerId, boardIndex: command.attackerIndex, runeId: attacker.runeId, label, defenderIndex: command.defenderIndex, instanceId: attacker.instanceId, defenderInstanceId: command.defenderIndex === undefined ? undefined : waiting.players[opponentOf(activeIndex)].board[command.defenderIndex]?.instanceId }],
    }
    waiting.revision += 1
    return { ok: true, state: waiting, events: [{ type: 'CHAIN_OPENED', playerId: command.playerId, runeId: attacker.runeId, responderId, label }, { type: 'RESPONSE_AVAILABLE', playerId: responderId, optionCount: options.length }] }
  }

  const advanced = resolveAdvancePhase(state, activeIndex)
  const options = activeEffectResponseOptions(state, activeIndex)
  if (options.length === 0) return advanced
  const waiting = clone(state)
  const responderId = waiting.players[opponentOf(activeIndex)].id
  const label = state.phase === 'main'
    ? 'Passage à la phase de combat'
    : state.phase === 'battle'
      ? 'Passage à la phase finale'
      : 'Fin du tour'
  waiting.activeChain = {
    actorPlayerId: command.playerId,
    responderPlayerId: responderId,
    sourceBoardIndex: -1,
    sourceRuneId: 'duel-flow',
    options,
    passCount: 0,
    links: [{ kind: 'phase', playerId: command.playerId, boardIndex: -1, runeId: 'duel-flow', label }],
  }
  waiting.revision += 1
  return { ok: true, state: waiting, events: [{ type: 'CHAIN_OPENED', playerId: command.playerId, runeId: 'duel-flow', responderId, label }, { type: 'RESPONSE_AVAILABLE', playerId: responderId, optionCount: options.length }] }
}

const aiTargetsFor = (state: DuelState, playerIndex: 0 | 1, boardIndex: number): Array<EffectTarget | undefined> => {
  return effectTargetsFor(state, playerIndex, boardIndex).map(({ target }) => target)
}

export const chooseAiCommand = (state: DuelState, playerId = 'p2'): DuelCommand | undefined => {
  if (state.winnerId || state.activeChain) return undefined
  if (state.pendingDiscard) {
    if (state.pendingDiscard.playerId !== playerId) return undefined
    const player = state.players.find((candidate) => candidate.id === playerId)
    return player?.hand.length ? { type: 'DISCARD_FROM_HAND', playerId, handIndex: player.hand.length - 1 } : undefined
  }
  const foundIndex = state.players.findIndex((player) => player.id === playerId)
  if (foundIndex !== state.activePlayer) return undefined
  const playerIndex = foundIndex as 0 | 1
  const player = state.players[playerIndex]
  const opponent = state.players[opponentOf(playerIndex)]

  if (!player.spiritUsed && spiritIsReady(player) && state.phase !== 'end') return { type: 'AWAKEN_SPIRIT', playerId }

  if (state.phase === 'main') {
    if (state.summonsRemaining > 0 && player.hand.length > 0 && player.board.length < MAX_BOARD) {
      const summon: DuelCommand = { type: 'SUMMON_RUNE', playerId, handIndex: 0, position: 'attack' }
      if (dispatch(state, summon).ok) return summon
    }
    for (let boardIndex = 0; boardIndex < player.board.length; boardIndex += 1) {
      if (player.board[boardIndex].effectUsed) continue
      for (const target of aiTargetsFor(state, playerIndex, boardIndex)) {
        const effect: DuelCommand = { type: 'ACTIVATE_EFFECT', playerId, boardIndex, target }
        if (dispatch(state, effect).ok) return effect
      }
    }
    return { type: 'ADVANCE_PHASE', playerId }
  }

  if (state.phase === 'battle') {
    for (let boardIndex = 0; boardIndex < player.board.length; boardIndex += 1) {
      if (player.board[boardIndex].effectUsed) continue
      for (const target of aiTargetsFor(state, playerIndex, boardIndex)) {
        const effect: DuelCommand = { type: 'ACTIVATE_EFFECT', playerId, boardIndex, target }
        if (dispatch(state, effect).ok) return effect
      }
    }
    const attackerIndex = player.board.findIndex((rune) => rune.position === 'attack' && !rune.attackUsed && rune.disabledTurns === 0 && !rune.neutralized)
    if (attackerIndex >= 0) {
      const attack: DuelCommand = { type: 'ATTACK', playerId, attackerIndex, defenderIndex: opponent.board.length > 0 ? 0 : undefined }
      if (dispatch(state, attack).ok) return attack
    }
    return { type: 'ADVANCE_PHASE', playerId }
  }

  return { type: 'ADVANCE_PHASE', playerId }
}

export const chooseAiResponse = (state: DuelState, playerId = 'p2'): DuelCommand | undefined => {
  const chain = state.activeChain
  if (!chain || chain.responderPlayerId !== playerId) return undefined
  const option = chain.options[0]
  return option ? { type: 'RESPOND_ALTER', playerId, boardIndex: option.boardIndex } : { type: 'PASS_RESPONSE', playerId }
}

export { alterRunes, runeById, runes, spiritById, spirits, standardRunes, starterDeck } from '@duel/game-data'
export type { ElementId } from '@duel/game-data'
