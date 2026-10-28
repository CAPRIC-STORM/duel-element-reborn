import { describe, expect, it } from 'vitest'
import { chooseAiCommand, createDuel, dispatch, elementalRelation, runeById, spirits, standardRunes } from './index'

const boardRune = (runeId: string, instanceId = runeId) => ({
  instanceId,
  runeId,
  position: 'attack' as const,
  effectUsed: false,
  attackUsed: false,
  summonedOnTurn: 0,
  disabledTurns: 0,
  attackShield: false,
  neutralized: false,
})

describe('elemental combat relation', () => {
  it('distinguishes advantage, neutrality and disadvantage', () => {
    expect(elementalRelation('water-current', 'fire-ember')).toBe('effective')
    expect(elementalRelation('nature-root', 'earth-bulwark')).toBe('neutral')
    expect(elementalRelation('fire-ember', 'water-current')).toBe('disadvantaged')
  })

  it('honors a temporary forced advantage', () => {
    expect(elementalRelation('fire-ember', 'water-current', true)).toBe('effective')
  })
})

describe('deterministic duel core', () => {
  it('preserves a custom player deck and its exact draw order', () => {
    const customDeck = Array.from({ length: 15 }, (_, index) => index < 3 ? 'time-surge' : index < 7 ? 'nature-root' : 'fire-ember')
    const state = createDuel('Alpha', 'Omega', 'spirit-flamberge', 'spirit-shaka', customDeck)

    expect(state.players[0].hand).toEqual(customDeck.slice(0, 5))
    expect(state.players[0].deck).toEqual(customDeck.slice(5))
  })

  it('charges the linked Spirit only with runes of its element', () => {
    const state = createDuel('Alpha', 'Omega', 'spirit-flamberge', 'spirit-shaka')
    state.players[0].hand = ['fire-ember', 'water-current']
    const fire = dispatch(state, { type: 'SUMMON_RUNE', playerId: 'p1', handIndex: 0, position: 'attack' })
    expect(fire.ok).toBe(true)
    if (!fire.ok) return
    expect(fire.state.players[0].spiritProgress.fire).toBe(1)
    fire.state.summonsRemaining = 1
    const water = dispatch(fire.state, { type: 'SUMMON_RUNE', playerId: 'p1', handIndex: 0, position: 'attack' })
    expect(water.ok).toBe(true)
    if (!water.ok) return
    expect(water.state.players[0].spiritProgress.fire).toBe(1)
  })

  it('awakens a ready Spirit once and resolves its signature power', () => {
    const state = createDuel('Alpha', 'Omega', 'spirit-flamberge', 'spirit-shaka')
    state.players[0].spiritProgress = { fire: 3 }
    state.players[1].chainEnabled = false
    const awakened = dispatch(state, { type: 'AWAKEN_SPIRIT', playerId: 'p1' })
    expect(awakened.ok).toBe(true)
    if (!awakened.ok) return
    expect(awakened.state.players[0].activeSpiritId).toBe('spirit-flamberge')
    expect(awakened.state.players[0].spiritUsed).toBe(true)
    expect(awakened.state.players[1].hp).toBe(3)
    expect(awakened.events.some((event) => event.type === 'SPIRIT_AWAKENED')).toBe(true)
    expect(dispatch(awakened.state, { type: 'AWAKEN_SPIRIT', playerId: 'p1' }).ok).toBe(false)
  })

  it('requires every elemental seal of a duo Spirit', () => {
    const state = createDuel('Alpha', 'Omega', 'spirit-twin-stars', 'spirit-shaka')
    state.players[0].spiritProgress = { telekinesis: 2 }
    expect(dispatch(state, { type: 'AWAKEN_SPIRIT', playerId: 'p1' }).ok).toBe(false)
    state.players[0].spiritProgress.storm = 1
    state.players[1].chainEnabled = false
    const awakened = dispatch(state, { type: 'AWAKEN_SPIRIT', playerId: 'p1' })
    expect(awakened.ok).toBe(true)
    if (!awakened.ok) return
    expect(awakened.state.summonsRemaining).toBe(2)
    expect(awakened.state.players[0].hand.length).toBe(7)
  })

  it('summons a rune through a validated command', () => {
    const state = createDuel()
    const result = dispatch(state, { type: 'SUMMON_RUNE', playerId: 'p1', handIndex: 0, position: 'attack' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[0].board).toHaveLength(1)
    expect(result.state.summonsRemaining).toBe(0)
    expect(result.events[0].type).toBe('RUNE_SUMMONED')
  })

  it('summons a rune face down only in defense with the power still available', () => {
    const state = createDuel()
    const result = dispatch(state, { type: 'SUMMON_RUNE', playerId: 'p1', handIndex: 0, position: 'defense-down' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[0].board[0]).toMatchObject({ position: 'defense-down', neutralized: true, effectUsed: false })
  })

  it('refuses a face-up defense summon', () => {
    const state = createDuel()
    const result = dispatch(state, { type: 'SUMMON_RUNE', playerId: 'p1', handIndex: 0, position: 'defense-up' })
    expect(result.ok).toBe(false)
    expect(result.state).toBe(state)
  })

  it('reveals a face-down rune when its owner activates its power', () => {
    const state = createDuel()
    state.players[1].chainEnabled = false
    state.players[0].board = [{ ...boardRune('fire-ember', 'hidden-fire'), position: 'defense-down', neutralized: true }]
    const result = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[0].board[0]).toMatchObject({ position: 'defense-up', neutralized: false, effectUsed: true })
    expect(result.state.players[1].hp).toBe(4)
    expect(result.events[0]).toMatchObject({ type: 'POSITION_CHANGED', runeId: 'fire-ember', position: 'defense-up' })
  })

  it('lets Time immediately summon a chosen rune without consuming another summon', () => {
    const state = createDuel()
    state.players[0].hand = ['time-surge', 'fire-ember']
    const summoned = dispatch(state, { type: 'SUMMON_RUNE', playerId: 'p1', handIndex: 0, position: 'attack' })
    expect(summoned.ok).toBe(true)
    if (!summoned.ok) return
    const resolved = dispatch(summoned.state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { runeId: 'fire-ember' } })
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.state.summonsRemaining).toBe(0)
    expect(resolved.state.players[0].board.map((rune) => rune.runeId)).toEqual(['time-surge', 'fire-ember'])
    expect(resolved.state.players[0].hand).toHaveLength(0)
    expect(resolved.events.some((event) => event.type === 'RUNE_SUMMONED' && event.runeId === 'fire-ember')).toBe(true)
  })

  it('rejects an effect during the final phase without mutating state', () => {
    const state = createDuel()
    state.players[0].board.push(boardRune('time-surge', 'time-1'))
    state.phase = 'end'
    const result = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(result.ok).toBe(false)
    expect(result.state).toBe(state)
  })

  it('requires a legal target without mutating the duel', () => {
    const state = createDuel()
    state.players[0].board = [boardRune('air-gale')]
    const result = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(result.ok).toBe(false)
    expect(result.state).toBe(state)
    expect(state.players[0].board[0].effectUsed).toBe(false)
  })

  it('allows a rune power during the battle phase', () => {
    const state = createDuel()
    state.turn = 2
    state.phase = 'battle'
    state.players[0].board = [boardRune('fire-ember')]
    state.players[1].chainEnabled = false
    const result = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[1].hp).toBe(4)
    expect(result.state.players[0].board[0].effectUsed).toBe(true)
  })

  it('never refreshes a used power while the same rune remains on the field', () => {
    let state = createDuel()
    state.players[0].deck = []
    state.players[1].deck = []
    state.players[1].chainEnabled = false
    state.players[0].board = [boardRune('fire-ember', 'persistent-fire')]
    const activated = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(activated.ok).toBe(true)
    if (!activated.ok) return
    state = activated.state

    for (const playerId of ['p1', 'p2'] as const) {
      for (let step = 0; step < 3; step += 1) {
        const advanced = dispatch(state, { type: 'ADVANCE_PHASE', playerId })
        expect(advanced.ok).toBe(true)
        if (!advanced.ok) return
        state = advanced.state
      }
    }

    expect(state.activePlayer).toBe(0)
    expect(state.players[0].board[0].effectUsed).toBe(true)
    const reused = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(reused.ok).toBe(false)
  })

  it('gives a newly invoked copy its own unused power', () => {
    const state = createDuel()
    state.players[1].chainEnabled = false
    state.players[0].board = [{ ...boardRune('fire-ember', 'spent-fire'), effectUsed: true }, boardRune('fire-ember', 'fresh-fire')]
    const result = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 1 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[0].board[0].effectUsed).toBe(true)
    expect(result.state.players[0].board[1].effectUsed).toBe(true)
    expect(result.state.players[1].hp).toBe(4)
  })

  it('lets Nature sacrifice itself and take control of an enemy rune', () => {
    const state = createDuel()
    state.players[1].chainEnabled = false
    state.players[0].board = [boardRune('nature-root')]
    state.players[1].board = [boardRune('fire-ember', 'enemy-fire')]
    const result = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { owner: 'opponent', boardIndex: 0 } })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[0].discard).toContain('nature-root')
    expect(result.state.players[0].board[0].runeId).toBe('fire-ember')
    expect(result.state.players[0].board[0].attackUsed).toBe(false)
    expect(result.state.players[1].board).toHaveLength(0)
  })

  it('refreshes the attack of a rune stolen by Nature on its new controller turn', () => {
    const state = createDuel()
    state.turn = 3
    state.phase = 'main'
    state.players[1].chainEnabled = false
    state.players[0].board = [boardRune('nature-root')]
    state.players[1].board = [{ ...boardRune('fire-ember', 'spent-last-turn'), attackUsed: true }]

    const stolen = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { owner: 'opponent', boardIndex: 0 } })
    expect(stolen.ok).toBe(true)
    if (!stolen.ok) return
    expect(stolen.state.players[0].board[0]).toMatchObject({ runeId: 'fire-ember', attackUsed: false })

    const battle = structuredClone(stolen.state)
    battle.phase = 'battle'
    const attack = dispatch(battle, { type: 'ATTACK', playerId: 'p1', attackerIndex: 0 })
    expect(attack.ok).toBe(true)
  })

  it('lets a rune activate its power before Nature steals it', () => {
    const state = createDuel()
    state.players[0].board = [boardRune('nature-root', 'stealing-nature')]
    state.players[1].board = [boardRune('fire-ember', 'targeted-fire')]

    const opened = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { owner: 'opponent', boardIndex: 0 } })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const optionIndex = opened.state.activeChain?.options.findIndex((option) => option.runeId === 'fire-ember') ?? -1
    expect(optionIndex).toBeGreaterThanOrEqual(0)

    const answered = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p2', boardIndex: 0, optionIndex })
    expect(answered.ok).toBe(true)
    if (!answered.ok) return
    expect(answered.state.activeChain).toBeUndefined()
    expect(answered.state.players[0].hp).toBe(4)
    expect(answered.state.players[0].discard).toContain('nature-root')
    expect(answered.state.players[0].board[0].runeId).toBe('fire-ember')
    expect(answered.state.players[0].board[0].effectUsed).toBe(true)
    expect(answered.state.players[1].board).toHaveLength(0)
    const eventTypes = answered.events.map((event) => event.type)
    expect(eventTypes.indexOf('EFFECT_ACTIVATED')).toBeLessThan(eventTypes.lastIndexOf('EFFECT_RESOLVED'))
  })

  it('resolves ordinary effect chains from the last link to the first', () => {
    const state = createDuel()
    state.players[0].board = [boardRune('fire-ember', 'chain-fire'), boardRune('space-time-rift', 'chain-space')]
    state.players[0].hand = []
    state.players[0].deck = ['nature-root']
    state.players[1].board = [boardRune('water-current', 'chain-water')]
    state.players[1].hp = 4

    const opened = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const waterOption = opened.state.activeChain?.options.findIndex((option) => option.runeId === 'water-current') ?? -1
    const waterResponse = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p2', boardIndex: 0, optionIndex: waterOption })
    expect(waterResponse.ok).toBe(true)
    if (!waterResponse.ok) return
    expect(waterResponse.state.activeChain?.links).toHaveLength(2)

    const spaceOption = waterResponse.state.activeChain?.options.findIndex((option) => option.runeId === 'space-time-rift') ?? -1
    const resolved = dispatch(waterResponse.state, { type: 'RESPOND_ALTER', playerId: 'p1', boardIndex: 1, optionIndex: spaceOption })
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.state.activeChain).toBeUndefined()
    expect(resolved.state.players[0].charges).toBe(1)
    expect(resolved.state.players[0].hand).toEqual(['nature-root'])
    expect(resolved.state.players[1].hp).toBe(4)
    expect(resolved.events.at(-1)).toEqual({ type: 'CHAIN_RESOLVED', linkCount: 3 })
  })

  it('allows an effect responding to a summon to be chained and negated', () => {
    const state = createDuel()
    state.activePlayer = 1
    state.turn = 2
    state.players[0].board = [boardRune('fire-ember', 'response-fire')]
    state.players[1].board = [boardRune('ice-lock', 'counter-ice')]
    state.players[1].hand = ['water-current']

    const opened = dispatch(state, { type: 'SUMMON_RUNE', playerId: 'p2', handIndex: 0, position: 'attack' })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const fireOption = opened.state.activeChain?.options.findIndex((option) => option.runeId === 'fire-ember') ?? -1
    const fireResponse = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p1', boardIndex: 0, optionIndex: fireOption })
    expect(fireResponse.ok).toBe(true)
    if (!fireResponse.ok) return
    expect(fireResponse.state.activeChain?.responderPlayerId).toBe('p2')

    const iceOption = fireResponse.state.activeChain?.options.findIndex((option) => option.runeId === 'ice-lock') ?? -1
    const negated = dispatch(fireResponse.state, { type: 'RESPOND_ALTER', playerId: 'p2', boardIndex: 0, optionIndex: iceOption })
    expect(negated.ok).toBe(true)
    if (!negated.ok) return
    expect(negated.state.activeChain).toBeUndefined()
    expect(negated.state.players[1].hp).toBe(5)
    expect(negated.state.players[1].board.some((rune) => rune.runeId === 'water-current')).toBe(true)
    expect(negated.state.players[0].board[0].effectUsed).toBe(true)
  })

  it('waits for both players to pass before resolving a chain', () => {
    const state = createDuel()
    state.players[0].board = [boardRune('fire-ember', 'pass-fire'), boardRune('space-time-rift', 'pass-space')]
    state.players[1].board = [boardRune('water-current', 'pass-water')]

    const opened = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const firstPass = dispatch(opened.state, { type: 'PASS_RESPONSE', playerId: 'p2' })
    expect(firstPass.ok).toBe(true)
    if (!firstPass.ok) return
    expect(firstPass.state.activeChain?.responderPlayerId).toBe('p1')
    expect(firstPass.state.activeChain?.passCount).toBe(1)
    expect(firstPass.state.activeChain?.options.some((option) => option.runeId === 'space-time-rift')).toBe(true)

    const secondPass = dispatch(firstPass.state, { type: 'PASS_RESPONSE', playerId: 'p1' })
    expect(secondPass.ok).toBe(true)
    if (!secondPass.ok) return
    expect(secondPass.state.activeChain).toBeUndefined()
    expect(secondPass.state.players[1].hp).toBe(4)
  })

  it('consumes an Earth shield instead of destroying its protected rune', () => {
    const state = createDuel()
    state.players[0].board = [boardRune('earth-bulwark'), boardRune('water-current')]
    const shielded = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { owner: 'self', boardIndex: 1 } })
    expect(shielded.ok).toBe(true)
    if (!shielded.ok) return
    const combat = structuredClone(shielded.state)
    combat.activePlayer = 1
    combat.turn = 2
    combat.phase = 'battle'
    combat.players[1].board = [boardRune('fire-ember', 'attacker')]
    combat.players[0].chainEnabled = false
    const attacked = dispatch(combat, { type: 'ATTACK', playerId: 'p2', attackerIndex: 0, defenderIndex: 1 })
    expect(attacked.ok).toBe(true)
    if (!attacked.ok) return
    expect(attacked.state.players[0].board[1].runeId).toBe('water-current')
    expect(attacked.state.players[0].board[1].attackShield).toBe(false)
    expect(attacked.state.players[0].hp).toBe(4)
    expect(attacked.state.players[1].board).toHaveLength(0)
    expect(attacked.state.players[1].hp).toBe(4)
  })

  it('lets an Earth-shielded attacker survive neutral combat while its controller takes damage', () => {
    const state = createDuel()
    state.turn = 2
    state.phase = 'battle'
    state.players[0].board = [{ ...boardRune('water-current', 'shielded-attacker'), attackShield: true }]
    state.players[1].board = [boardRune('nature-root', 'neutral-defender')]
    state.players[1].chainEnabled = false

    const result = dispatch(state, { type: 'ATTACK', playerId: 'p1', attackerIndex: 0, defenderIndex: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[0].board).toHaveLength(1)
    expect(result.state.players[0].board[0]).toMatchObject({ runeId: 'water-current', attackShield: false })
    expect(result.state.players[0].hp).toBe(4)
    expect(result.state.players[1].board).toHaveLength(0)
  })

  it('searches the grimoire and recovers a rune from the vestiges', () => {
    const search = createDuel()
    search.players[0].board = [boardRune('telekinesis-orbit')]
    search.players[0].hand = []
    search.players[0].deck = ['light-reveal', 'ice-lock']
    const searched = dispatch(search, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { runeId: 'ice-lock' } })
    expect(searched.ok && searched.state.players[0].hand).toEqual(['ice-lock'])

    const recovery = createDuel()
    recovery.players[0].board = [boardRune('cosmic-return')]
    recovery.players[0].hand = []
    recovery.players[0].discard = ['fire-ember']
    const recovered = dispatch(recovery, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { runeId: 'fire-ember' } })
    expect(recovered.ok && recovered.state.players[0].hand).toEqual(['fire-ember'])
  })

  it('keeps Ice element locks active while the locking rune remains', () => {
    const state = createDuel()
    state.players[1].chainEnabled = false
    state.players[0].board = [boardRune('ice-lock')]
    state.players[1].board = [boardRune('fire-ember')]
    const locked = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { element: 'fire' } })
    expect(locked.ok).toBe(true)
    if (!locked.ok) return
    const enemyTurn = structuredClone(locked.state)
    enemyTurn.activePlayer = 1
    enemyTurn.phase = 'main'
    const blocked = dispatch(enemyTurn, { type: 'ACTIVATE_EFFECT', playerId: 'p2', boardIndex: 0 })
    expect(blocked.ok).toBe(false)
    if (blocked.ok) return
    expect(blocked.error).toContain('scellés par Ice')
  })

  it('prevents a posture change on the summoning turn', () => {
    const state = createDuel()
    state.players[0].board = [{ ...boardRune('fire-ember'), summonedOnTurn: state.turn }]
    const blocked = dispatch(state, { type: 'CHANGE_POSITION', playerId: 'p1', boardIndex: 0, position: 'defense-up' })
    expect(blocked.ok).toBe(false)
    expect(state.players[0].board[0].position).toBe('attack')

    state.players[0].board[0].summonedOnTurn = 0
    const changed = dispatch(state, { type: 'CHANGE_POSITION', playerId: 'p1', boardIndex: 0, position: 'defense-up' })
    expect(changed.ok && changed.state.players[0].board[0].position).toBe('defense-up')
  })

  it('flip-summons a previously set rune into attack on a later turn', () => {
    const state = createDuel()
    state.turn = 2
    state.players[0].board = [{ ...boardRune('fire-ember', 'set-fire'), position: 'defense-down', neutralized: true, summonedOnTurn: 1 }]
    const result = dispatch(state, { type: 'CHANGE_POSITION', playerId: 'p1', boardIndex: 0, position: 'attack' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[0].board[0]).toMatchObject({ position: 'attack', neutralized: false, changedPositionTurn: 2 })
  })

  it('never lets a revealed rune become face down without an effect', () => {
    const state = createDuel()
    state.turn = 2
    state.players[0].board = [{ ...boardRune('fire-ember'), summonedOnTurn: 1 }]
    const result = dispatch(state, { type: 'CHANGE_POSITION', playerId: 'p1', boardIndex: 0, position: 'defense-down' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('effet')
  })

  it('reveals a face-down defender at resolution without dealing defense damage', () => {
    const state = createDuel()
    state.turn = 2
    state.phase = 'battle'
    state.players[0].board = [boardRune('water-current', 'attacker')]
    state.players[1].board = [{ ...boardRune('fire-ember', 'set-defender'), position: 'defense-down', neutralized: true }]
    state.players[1].chainEnabled = false
    const result = dispatch(state, { type: 'ATTACK', playerId: 'p1', attackerIndex: 0, defenderIndex: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.events.map((event) => event.type)).toEqual(['ATTACK_DECLARED', 'POSITION_CHANGED', 'COMBAT_RESOLVED', 'RUNE_DESTROYED'])
    expect(result.events.find((event) => event.type === 'COMBAT_RESOLVED')).toMatchObject({ relation: 'effective', defenderWasConcealed: true })
    expect(result.state.players[1].hp).toBe(5)
  })

  it('destroys a face-up defense rune without dealing damage to its controller', () => {
    const state = createDuel()
    state.turn = 2
    state.phase = 'battle'
    state.players[0].board = [boardRune('water-current', 'attacker')]
    state.players[1].board = [{ ...boardRune('fire-ember', 'defender'), position: 'defense-up' }]
    state.players[1].chainEnabled = false
    const result = dispatch(state, { type: 'ATTACK', playerId: 'p1', attackerIndex: 0, defenderIndex: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[1].board).toHaveLength(0)
    expect(result.state.players[1].hp).toBe(5)
    expect(result.events.some((event) => event.type === 'DAMAGE_DEALT' && event.playerId === 'p2')).toBe(false)
  })

  it('lets elemental advantage destroy only the defender and deal attack-position damage', () => {
    const state = createDuel()
    state.turn = 2
    state.phase = 'battle'
    state.players[0].board = [boardRune('water-current')]
    state.players[1].board = [boardRune('fire-ember')]
    state.players[1].chainEnabled = false
    const result = dispatch(state, { type: 'ATTACK', playerId: 'p1', attackerIndex: 0, defenderIndex: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[0].board).toHaveLength(1)
    expect(result.state.players[1].board).toHaveLength(0)
    expect(result.state.players[1].hp).toBe(4)
  })

  it('opens an attack response and lets Earth guard the chosen ally', () => {
    const state = createDuel()
    state.turn = 2
    state.phase = 'battle'
    state.players[0].board = [boardRune('fire-ember', 'attacker')]
    state.players[1].board = [boardRune('earth-bulwark', 'guardian'), boardRune('water-current', 'target')]

    const opened = dispatch(state, { type: 'ATTACK', playerId: 'p1', attackerIndex: 0, defenderIndex: 1 })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.state.activeChain?.links[0].kind).toBe('attack')
    expect(opened.state.players[0].board[0].attackUsed).toBe(false)

    const guarded = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p2', boardIndex: 0 })
    expect(guarded.ok).toBe(true)
    if (!guarded.ok) return
    expect(guarded.state.activeChain).toBeUndefined()
    expect(guarded.state.players[1].board.some((rune) => rune.instanceId === 'target')).toBe(true)
    expect(guarded.state.players[1].board.find((rune) => rune.instanceId === 'target')?.attackShield).toBe(false)
    expect(guarded.state.players[0].board).toHaveLength(0)
    expect(guarded.state.players[0].hp).toBe(4)
    expect(guarded.state.players[1].hp).toBe(4)
  })

  it('lets an advantaged attacker survive an Earth shield while the defender also survives', () => {
    const state = createDuel()
    state.turn = 2
    state.phase = 'battle'
    state.players[0].board = [boardRune('water-current', 'advantaged-attacker')]
    state.players[1].board = [{ ...boardRune('fire-ember', 'shielded-target'), attackShield: true }]
    state.players[1].chainEnabled = false

    const result = dispatch(state, { type: 'ATTACK', playerId: 'p1', attackerIndex: 0, defenderIndex: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[0].board).toHaveLength(1)
    expect(result.state.players[1].board).toHaveLength(1)
    expect(result.state.players[1].board[0].attackShield).toBe(false)
    expect(result.state.players[0].hp).toBe(5)
    expect(result.state.players[1].hp).toBe(4)
  })

  it('prevents both destruction and damage when Earth shields a rune in defense', () => {
    const state = createDuel()
    state.turn = 2
    state.phase = 'battle'
    state.players[0].board = [boardRune('fire-ember', 'attacker')]
    state.players[1].board = [{ ...boardRune('water-current', 'defender'), position: 'defense-up', attackShield: true }]
    state.players[1].chainEnabled = false

    const result = dispatch(state, { type: 'ATTACK', playerId: 'p1', attackerIndex: 0, defenderIndex: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[1].board).toHaveLength(1)
    expect(result.state.players[1].hp).toBe(5)
    expect(result.state.players[0].board).toHaveLength(0)
    expect(result.state.players[0].hp).toBe(4)
  })

  it('resolves a Storm immediate assault with the complete combat rules', () => {
    const state = createDuel()
    state.turn = 2
    state.players[0].board = [boardRune('storm-fracture', 'storm-source'), boardRune('water-current', 'storm-attacker')]
    state.players[1].board = [boardRune('fire-ember', 'storm-target')]
    state.players[1].chainEnabled = false

    const result = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { owner: 'self', boardIndex: 1 } })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.phase).toBe('main')
    expect(result.state.players[0].board).toHaveLength(2)
    expect(result.state.players[0].board[1].attackUsed).toBe(true)
    expect(result.state.players[1].board).toHaveLength(0)
    expect(result.state.players[1].hp).toBe(4)
  })

  it('resolves an attack normally when Earth passes priority', () => {
    const state = createDuel()
    state.turn = 2
    state.phase = 'battle'
    state.players[0].board = [boardRune('water-current', 'attacker')]
    state.players[1].board = [boardRune('earth-bulwark', 'guardian'), boardRune('fire-ember', 'target')]

    const opened = dispatch(state, { type: 'ATTACK', playerId: 'p1', attackerIndex: 0, defenderIndex: 1 })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const passed = dispatch(opened.state, { type: 'PASS_RESPONSE', playerId: 'p2' })
    expect(passed.ok).toBe(true)
    if (!passed.ok) return
    expect(passed.state.players[1].board.some((rune) => rune.instanceId === 'target')).toBe(false)
    expect(passed.state.players[1].hp).toBe(4)
  })

  it('lets Static Lash answer an invocation and lock the new rune', () => {
    const state = createDuel()
    state.activePlayer = 1
    state.turn = 2
    state.players[0].board = [boardRune('electricity-lash', 'static-response')]
    state.players[1].hand = ['fire-ember']

    const opened = dispatch(state, { type: 'SUMMON_RUNE', playerId: 'p2', handIndex: 0, position: 'attack' })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.state.activeChain?.links[0].kind).toBe('summon')
    expect(opened.state.players[1].board[0].runeId).toBe('fire-ember')

    const locked = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p1', boardIndex: 0 })
    expect(locked.ok).toBe(true)
    if (!locked.ok) return
    expect(locked.state.activeChain).toBeUndefined()
    expect(locked.state.players[1].board[0].disabledTurns).toBe(1)
    expect(locked.state.players[0].board[0].effectUsed).toBe(true)
  })

  it('lets Nature sacrifice itself to capture a newly summoned enemy rune', () => {
    const state = createDuel()
    state.activePlayer = 1
    state.turn = 2
    state.players[0].board = [boardRune('nature-root', 'nature-response')]
    state.players[1].hand = ['fire-ember']

    const opened = dispatch(state, { type: 'SUMMON_RUNE', playerId: 'p2', handIndex: 0, position: 'attack' })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.state.activeChain?.options).toEqual([{
      boardIndex: 0,
      runeId: 'nature-root',
      alterName: 'Échange sauvage',
      targetBoardIndex: 0,
      responseKind: 'capture-summon',
    }])

    const captured = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p1', boardIndex: 0 })
    expect(captured.ok).toBe(true)
    if (!captured.ok) return
    expect(captured.state.activeChain).toBeUndefined()
    expect(captured.state.players[0].discard).toContain('nature-root')
    expect(captured.state.players[0].board[0].runeId).toBe('fire-ember')
    expect(captured.state.players[0].board[0].attackUsed).toBe(true)
    expect(captured.state.players[1].board).toHaveLength(0)
    expect(captured.events.some((event) => event.type === 'EFFECT_RESOLVED')).toBe(true)
  })

  it('offers every legal active power as a response to an enemy invocation', () => {
    const state = createDuel()
    state.activePlayer = 1
    state.turn = 2
    state.players[0].board = [boardRune('fire-ember', 'fire-response')]
    state.players[1].hand = ['water-current']

    const opened = dispatch(state, { type: 'SUMMON_RUNE', playerId: 'p2', handIndex: 0, position: 'attack' })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const optionIndex = opened.state.activeChain?.options.findIndex((option) => option.runeId === 'fire-ember') ?? -1
    expect(optionIndex).toBeGreaterThanOrEqual(0)

    const answered = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p1', boardIndex: 0, optionIndex })
    expect(answered.ok).toBe(true)
    if (!answered.ok) return
    expect(answered.state.players[1].hp).toBe(4)
    expect(answered.state.players[0].board[0].effectUsed).toBe(true)
  })

  it('reveals a veiled rune when its power is activated in response', () => {
    const state = createDuel()
    state.activePlayer = 1
    state.turn = 2
    state.players[0].board = [{ ...boardRune('fire-ember', 'veiled-fire'), position: 'defense-down', neutralized: true }]
    state.players[1].hand = ['water-current']

    const opened = dispatch(state, { type: 'SUMMON_RUNE', playerId: 'p2', handIndex: 0, position: 'attack' })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const optionIndex = opened.state.activeChain?.options.findIndex((option) => option.runeId === 'fire-ember') ?? -1
    expect(optionIndex).toBeGreaterThanOrEqual(0)
    const answered = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p1', boardIndex: 0, optionIndex })
    expect(answered.ok).toBe(true)
    if (!answered.ok) return
    expect(answered.state.players[0].board[0].position).toBe('defense-up')
    expect(answered.state.players[0].board[0].neutralized).toBe(false)
    expect(answered.state.players[1].hp).toBe(4)
  })

  it('lets Nature steal an attacker before its declared assault resolves', () => {
    const state = createDuel()
    state.activePlayer = 1
    state.turn = 2
    state.phase = 'battle'
    state.players[0].board = [boardRune('nature-root', 'nature-defender')]
    state.players[1].board = [boardRune('fire-ember', 'enemy-attacker')]

    const opened = dispatch(state, { type: 'ATTACK', playerId: 'p2', attackerIndex: 0, defenderIndex: 0 })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const optionIndex = opened.state.activeChain?.options.findIndex((option) => option.runeId === 'nature-root') ?? -1
    expect(optionIndex).toBeGreaterThanOrEqual(0)
    const answered = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p1', boardIndex: 0, optionIndex })
    expect(answered.ok).toBe(true)
    if (!answered.ok) return
    expect(answered.state.players[0].board[0].runeId).toBe('fire-ember')
    expect(answered.state.players[0].board[0].attackUsed).toBe(true)
    expect(answered.state.players[1].board).toHaveLength(0)
    expect(answered.state.players[0].hp).toBe(5)
  })

  it('skips optional response windows when chains are disabled', () => {
    const state = createDuel()
    state.activePlayer = 1
    state.turn = 2
    state.players[0].board = [boardRune('fire-ember', 'fire-response')]
    state.players[1].hand = ['water-current']
    const disabled = dispatch(state, { type: 'SET_CHAIN_ENABLED', playerId: 'p1', enabled: false })
    expect(disabled.ok).toBe(true)
    if (!disabled.ok) return

    const summoned = dispatch(disabled.state, { type: 'SUMMON_RUNE', playerId: 'p2', handIndex: 0, position: 'attack' })
    expect(summoned.ok).toBe(true)
    if (!summoned.ok) return
    expect(summoned.state.activeChain).toBeUndefined()
    expect(summoned.state.players[1].board).toHaveLength(1)
  })

  it('lets Time immediately summon from hand during an opponent action', () => {
    const state = createDuel()
    state.activePlayer = 1
    state.turn = 2
    state.players[0].board = [boardRune('time-surge', 'time-response')]
    state.players[0].hand = ['fire-ember']
    state.players[1].hand = ['water-current']
    const opened = dispatch(state, { type: 'SUMMON_RUNE', playerId: 'p2', handIndex: 0, position: 'attack' })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const optionIndex = opened.state.activeChain?.options.findIndex((option) => option.runeId === 'time-surge') ?? -1
    const answered = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p1', boardIndex: 0, optionIndex })
    expect(answered.ok).toBe(true)
    if (!answered.ok) return
    expect(answered.state.players[0].board.map((rune) => rune.runeId)).toEqual(['time-surge', 'fire-ember'])
    expect(answered.state.players[0].hand).toHaveLength(0)
    expect(answered.state.summonsRemaining).toBe(0)
  })

  it('cedes priority before an opponent changes phase', () => {
    const state = createDuel()
    state.activePlayer = 1
    state.turn = 2
    state.players[0].board = [boardRune('fire-ember', 'phase-response')]

    const opened = dispatch(state, { type: 'ADVANCE_PHASE', playerId: 'p2' })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.state.phase).toBe('main')
    expect(opened.state.activeChain?.links[0].kind).toBe('phase')

    const passed = dispatch(opened.state, { type: 'PASS_RESPONSE', playerId: 'p1' })
    expect(passed.ok).toBe(true)
    if (!passed.ok) return
    expect(passed.state.activeChain).toBeUndefined()
    expect(passed.state.phase).toBe('battle')
  })

  it('resolves Space immediately during the opponent turn', () => {
    const state = createDuel()
    state.activePlayer = 1
    state.turn = 2
    state.players[0].board = [boardRune('space-time-rift', 'space-response')]
    state.players[0].hand = []
    state.players[0].deck = ['fire-ember']
    state.players[1].hand = ['water-current']

    const opened = dispatch(state, { type: 'SUMMON_RUNE', playerId: 'p2', handIndex: 0, position: 'attack' })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const optionIndex = opened.state.activeChain?.options.findIndex((option) => option.runeId === 'space-time-rift') ?? -1
    const answered = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p1', boardIndex: 0, optionIndex })
    expect(answered.ok).toBe(true)
    if (!answered.ok) return
    expect(answered.state.players[0].hand).toEqual(['fire-ember'])
    expect(answered.state.players[0].charges).toBe(1)
    expect(answered.state.players[0].board[0].effectUsed).toBe(true)
  })

  it('lets an immediate Static response interrupt an attack cleanly', () => {
    const state = createDuel()
    state.activePlayer = 1
    state.turn = 2
    state.phase = 'battle'
    state.players[0].board = [boardRune('electricity-lash', 'static-defender')]
    state.players[1].board = [boardRune('fire-ember', 'enemy-attacker')]

    const opened = dispatch(state, { type: 'ATTACK', playerId: 'p2', attackerIndex: 0, defenderIndex: 0 })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const optionIndex = opened.state.activeChain?.options.findIndex((option) => option.runeId === 'electricity-lash') ?? -1
    const answered = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p1', boardIndex: 0, optionIndex })
    expect(answered.ok).toBe(true)
    if (!answered.ok) return
    expect(answered.state.activeChain).toBeUndefined()
    expect(answered.state.players[0].board[0].runeId).toBe('electricity-lash')
    expect(answered.state.players[1].board[0].disabledTurns).toBe(1)
    expect(answered.state.players[0].hp).toBe(5)
    expect(answered.events.some((event) => event.type === 'EFFECT_RESOLVED' && event.message.includes('interrompu'))).toBe(true)
  })

  it('destroys both runes without hurting a defender in defense posture', () => {
    const state = createDuel()
    state.turn = 2
    state.phase = 'battle'
    state.players[1].chainEnabled = false
    state.players[0].board = [boardRune('fire-ember')]
    state.players[1].board = [{ ...boardRune('telekinesis-orbit'), position: 'defense-up' }]
    const result = dispatch(state, { type: 'ATTACK', playerId: 'p1', attackerIndex: 0, defenderIndex: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[0].board).toHaveLength(0)
    expect(result.state.players[1].board).toHaveLength(0)
    expect(result.state.players[0].hp).toBe(4)
    expect(result.state.players[1].hp).toBe(5)
  })

  it('lets Light temporary advantage overcome an ordinary elemental weakness', () => {
    const state = createDuel()
    state.turn = 2
    state.phase = 'battle'
    state.players[0].board = [{ ...boardRune('fire-ember'), grantedAdvantageTurn: 2 }]
    state.players[1].board = [boardRune('water-current')]
    state.players[1].chainEnabled = false
    const result = dispatch(state, { type: 'ATTACK', playerId: 'p1', attackerIndex: 0, defenderIndex: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[0].board).toHaveLength(1)
    expect(result.state.players[1].board).toHaveLength(0)
  })

  it('plays a complete deterministic opponent turn and returns priority', () => {
    let state = createDuel()
    for (let step = 0; step < 3; step += 1) {
      const advanced = dispatch(state, { type: 'ADVANCE_PHASE', playerId: 'p1' })
      expect(advanced.ok).toBe(true)
      if (!advanced.ok) return
      state = advanced.state
    }
    expect(state.activePlayer).toBe(1)

    for (let step = 0; step < 20 && state.activePlayer === 1; step += 1) {
      const command = chooseAiCommand(state, 'p2')
      expect(command).toBeDefined()
      if (!command) return
      const result = dispatch(state, command)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      state = result.state
    }

    expect(state.activePlayer).toBe(0)
    expect(state.turn).toBe(3)
    expect(state.players[1].board.length).toBeGreaterThan(0)
    expect(state.players[0].hp).toBe(4)
  })

  it('opens an Ice response window and resolves a pass normally', () => {
    const state = createDuel()
    state.players[0].board = [boardRune('fire-ember')]
    state.players[1].board = [boardRune('ice-lock-alter')]
    const opened = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.state.activeChain?.responderPlayerId).toBe('p2')
    expect(opened.events.map((event) => event.type)).toEqual(['CHAIN_OPENED', 'RESPONSE_AVAILABLE'])

    const passed = dispatch(opened.state, { type: 'PASS_RESPONSE', playerId: 'p2' })
    expect(passed.ok).toBe(true)
    if (!passed.ok) return
    expect(passed.state.activeChain).toBeUndefined()
    expect(passed.state.players[1].hp).toBe(4)
  })

  it('lets Ice negate the original effect and consumes both powers', () => {
    const state = createDuel()
    state.players[0].board = [boardRune('fire-ember')]
    state.players[1].board = [boardRune('ice-lock-alter')]
    const opened = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const answered = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p2', boardIndex: 0 })
    expect(answered.ok).toBe(true)
    if (!answered.ok) return
    expect(answered.state.players[1].hp).toBe(5)
    expect(answered.state.players[0].board[0].effectUsed).toBe(true)
    expect(answered.state.players[1].board[0].effectUsed).toBe(true)
    expect(answered.events.map((event) => event.type)).toEqual(['ALTER_ACTIVATED', 'CHAIN_LINK_ADDED', 'CHAIN_RESOLUTION_STARTED', 'EFFECT_NEGATED', 'CHAIN_RESOLVED'])
  })

  it('offers Earth only when an allied rune is explicitly targeted', () => {
    const state = createDuel()
    state.players[0].board = [boardRune('darkness-veil')]
    state.players[1].board = [boardRune('earth-bulwark-alter'), boardRune('water-current')]
    const opened = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { owner: 'opponent', boardIndex: 1 } })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.state.activeChain?.options).toContainEqual({ boardIndex: 0, runeId: 'earth-bulwark-alter', alterName: 'Sanctuaire lithique', targetBoardIndex: 1, responseKind: 'negate' })
  })

  it('resolves a three-link Ice chain from the last response to the first', () => {
    const state = createDuel()
    state.players[0].board = [boardRune('fire-ember'), boardRune('ice-lock-alter', 'player-ice')]
    state.players[1].board = [boardRune('ice-lock-alter', 'enemy-ice')]
    const opened = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const firstResponse = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p2', boardIndex: 0 })
    expect(firstResponse.ok).toBe(true)
    if (!firstResponse.ok) return
    expect(firstResponse.state.activeChain?.links).toHaveLength(2)
    expect(firstResponse.state.activeChain?.responderPlayerId).toBe('p1')

    const counterResponse = dispatch(firstResponse.state, { type: 'RESPOND_ALTER', playerId: 'p1', boardIndex: 1 })
    expect(counterResponse.ok).toBe(true)
    if (!counterResponse.ok) return
    expect(counterResponse.state.activeChain).toBeUndefined()
    expect(counterResponse.state.players[1].hp).toBe(4)
    expect(counterResponse.events.at(-1)).toEqual({ type: 'CHAIN_RESOLVED', linkCount: 3 })
  })

  it('does not let one rune occupy two links in the same chain', () => {
    const state = createDuel()
    state.players[0].board = [boardRune('ice-lock', 'source-ice')]
    state.players[1].board = [boardRune('ice-lock-alter', 'response-ice')]
    const opened = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { element: 'fire' } })
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const answered = dispatch(opened.state, { type: 'RESPOND_ALTER', playerId: 'p2', boardIndex: 0 })
    expect(answered.ok).toBe(true)
    if (!answered.ok) return
    expect(answered.state.activeChain).toBeUndefined()
    expect(answered.state.players[0].board[0].lockedElement).toBeUndefined()
  })

  it('lets Air overflow a full enemy hand, then forces discards on the next draw', () => {
    let state = createDuel()
    state.players[1].chainEnabled = false
    state.players[0].board = [boardRune('air-gale')]
    state.players[1].board = [boardRune('fire-ember', 'enemy-fire')]
    state.players[1].hand = ['water-current', 'nature-root', 'earth-bulwark', 'ice-lock', 'light-reveal']
    state.players[1].deck = ['cosmic-return']

    const returned = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { owner: 'opponent', boardIndex: 0 } })
    expect(returned.ok).toBe(true)
    if (!returned.ok) return
    expect(returned.state.players[1].hand).toHaveLength(6)
    expect(returned.state.pendingDiscard).toBeUndefined()
    state = returned.state

    for (let step = 0; step < 3; step += 1) {
      const advanced = dispatch(state, { type: 'ADVANCE_PHASE', playerId: 'p1' })
      expect(advanced.ok).toBe(true)
      if (!advanced.ok) return
      state = advanced.state
    }

    expect(state.players[1].hand).toHaveLength(7)
    expect(state.pendingDiscard).toEqual({ playerId: 'p2', amount: 2, reason: 'draw-overflow' })

    const firstDiscard = dispatch(state, { type: 'DISCARD_FROM_HAND', playerId: 'p2', handIndex: 0 })
    expect(firstDiscard.ok).toBe(true)
    if (!firstDiscard.ok) return
    expect(firstDiscard.state.pendingDiscard?.amount).toBe(1)
    const secondDiscard = dispatch(firstDiscard.state, { type: 'DISCARD_FROM_HAND', playerId: 'p2', handIndex: 0 })
    expect(secondDiscard.ok).toBe(true)
    if (!secondDiscard.ok) return
    expect(secondDiscard.state.players[1].hand).toHaveLength(5)
    expect(secondDiscard.state.players[1].discard).toHaveLength(2)
    expect(secondDiscard.state.pendingDiscard).toBeUndefined()
  })

  it('draws through a full hand with Space-Time and asks its owner to stabilize it', () => {
    const state = createDuel()
    state.players[1].chainEnabled = false
    state.players[0].board = [boardRune('space-time-rift')]
    state.players[0].hand = ['fire-ember', 'water-current', 'nature-root', 'earth-bulwark', 'air-gale']
    state.players[0].deck = ['cosmic-return']

    const result = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players[0].hand).toHaveLength(6)
    expect(result.state.pendingDiscard).toEqual({ playerId: 'p1', amount: 1, reason: 'draw-overflow' })
    expect(result.state.players[0].charges).toBe(1)
  })

  it('allows searches and recovery effects to exceed the normal hand size', () => {
    const search = createDuel()
    search.players[1].chainEnabled = false
    search.players[0].board = [boardRune('telekinesis-orbit')]
    search.players[0].hand = ['fire-ember', 'water-current', 'nature-root', 'earth-bulwark', 'air-gale']
    search.players[0].deck = ['cosmic-return']
    const searched = dispatch(search, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { runeId: 'cosmic-return' } })
    expect(searched.ok).toBe(true)
    if (!searched.ok) return
    expect(searched.state.players[0].hand).toHaveLength(6)
    expect(searched.state.pendingDiscard).toBeUndefined()

    const recovery = createDuel()
    recovery.players[1].chainEnabled = false
    recovery.players[0].board = [boardRune('cosmic-return')]
    recovery.players[0].hand = ['fire-ember', 'water-current', 'nature-root', 'earth-bulwark', 'air-gale']
    recovery.players[0].discard = ['ice-lock']
    const recovered = dispatch(recovery, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: { runeId: 'ice-lock' } })
    expect(recovered.ok).toBe(true)
    if (!recovered.ok) return
    expect(recovered.state.players[0].hand).toHaveLength(6)
    expect(recovered.state.players[0].discard).toHaveLength(0)
  })

  it('turns a Space-Time rift into an extra summon on its owner next turn', () => {
    let state = createDuel()
    state.players[0].chainEnabled = false
    state.players[1].chainEnabled = false
    state.players[0].board = [boardRune('space-time-rift')]
    state.players[0].hand = []
    state.players[0].deck = ['fire-ember', 'water-current']
    state.players[1].hand = []
    state.players[1].deck = []

    const charged = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(charged.ok).toBe(true)
    if (!charged.ok) return
    state = charged.state
    expect(state.players[0].charges).toBe(1)

    for (const playerId of ['p1', 'p1', 'p1', 'p2', 'p2', 'p2']) {
      const advanced = dispatch(state, { type: 'ADVANCE_PHASE', playerId })
      expect(advanced.ok).toBe(true)
      if (!advanced.ok) return
      state = advanced.state
    }

    expect(state.activePlayer).toBe(0)
    expect(state.players[0].charges).toBe(0)
    expect(state.summonsRemaining).toBe(2)
  })

  it('turns Water overheal into a combat shield', () => {
    const state = createDuel()
    state.players[1].chainEnabled = false
    state.players[0].board = [boardRune('water-current')]
    state.players[0].hp = state.players[0].maxHp

    const protectedRune = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(protectedRune.ok).toBe(true)
    if (!protectedRune.ok) return
    expect(protectedRune.state.players[0].hp).toBe(state.players[0].maxHp)
    expect(protectedRune.state.players[0].board[0].attackShield).toBe(true)
  })

  it('lets Cosmic draw when its graveyard is empty', () => {
    const state = createDuel()
    state.players[1].chainEnabled = false
    state.players[0].board = [boardRune('cosmic-return')]
    state.players[0].hand = []
    state.players[0].discard = []
    state.players[0].deck = ['ice-lock']

    const drawn = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0, target: {} })
    expect(drawn.ok).toBe(true)
    if (!drawn.ok) return
    expect(drawn.state.players[0].hand).toEqual(['ice-lock'])
    expect(drawn.state.players[0].deck).toHaveLength(0)
  })

  it('accepts grimoires from 5 to 20 runes and rejects shorter lists', () => {
    const minimum = Array.from({ length: 5 }, () => 'fire-ember')
    const maximum = Array.from({ length: 20 }, () => 'water-current-alter')
    expect(createDuel('A', 'B', undefined, undefined, minimum).players[0].deck).toHaveLength(0)
    expect(createDuel('A', 'B', undefined, undefined, maximum).players[0].deck).toHaveLength(15)
    expect(createDuel('A', 'B', undefined, undefined, minimum.slice(0, 4)).players[0].deck).toHaveLength(10)
  })

  it('keeps Standard and Alter in the same element with distinct powers', () => {
    expect(runeById['water-current'].element).toBe('water')
    expect(runeById['water-current-alter'].element).toBe('water')
    expect(runeById['water-current-alter'].baseRuneId).toBe('water-current')
    expect(runeById['water-current'].effectId).not.toBe(runeById['water-current-alter'].effectId)
  })

  it('resolves Water Alter as a one-point life drain', () => {
    const state = createDuel()
    state.players[1].chainEnabled = false
    state.players[0].hp = 4
    state.players[0].board = [boardRune('water-current-alter')]
    const drained = dispatch(state, { type: 'ACTIVATE_EFFECT', playerId: 'p1', boardIndex: 0 })
    expect(drained.ok).toBe(true)
    if (!drained.ok) return
    expect(drained.state.players[0].hp).toBe(5)
    expect(drained.state.players[1].hp).toBe(4)
  })

  it('gives every rune element a place in at least one Spirit awakening', () => {
    const represented = new Set(spirits.flatMap((spirit) => spirit.requirements.map((requirement) => requirement.element)))
    const elements = new Set(standardRunes.map((rune) => rune.element))
    expect([...elements].filter((element) => !represented.has(element))).toEqual([])
  })
})
