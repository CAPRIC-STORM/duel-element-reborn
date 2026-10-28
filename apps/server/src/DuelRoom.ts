import { Room, type Client } from '@colyseus/core'
import { MAX_DECK_SIZE, MIN_DECK_SIZE, createDuel, dispatch, runeById, spiritById, type DuelCommand, type DuelEvent, type DuelState } from '@duel/game-core'

interface JoinOptions {
  name?: string
  deck?: string[]
  spiritId?: string
}

interface PlayerLoadout {
  name: string
  deck?: string[]
  spiritId: string
}

const sanitizeLoadout = (options: JoinOptions, index: number): PlayerLoadout => {
  const deck = Array.isArray(options.deck)
    && options.deck.length >= MIN_DECK_SIZE
    && options.deck.length <= MAX_DECK_SIZE
    && options.deck.every((runeId) => typeof runeId === 'string' && runeById[runeId])
    ? [...options.deck]
    : undefined
  return {
    name: options.name?.trim().slice(0, 24) || `Duelliste ${index + 1}`,
    deck,
    spiritId: typeof options.spiritId === 'string' && spiritById[options.spiritId]
      ? options.spiritId
      : index === 0 ? 'spirit-flamberge' : 'spirit-shaka',
  }
}

const viewFor = (state: DuelState, playerId: string): DuelState => {
  const view = structuredClone(state)
  const opponent = view.players.find((player) => player.id !== playerId)
  if (opponent) {
    opponent.hand = Array.from({ length: opponent.hand.length }, () => 'hidden-rune')
    opponent.deck = Array.from({ length: opponent.deck.length }, () => 'hidden-rune')
  }
  return view
}

export class DuelRoom extends Room {
  maxClients = 2
  private duel: DuelState = createDuel()
  private playerBySession = new Map<string, string>()
  private loadoutByPlayer = new Map<string, PlayerLoadout>()

  onCreate() {
    this.onMessage('sync', (client) => {
      const playerId = this.playerBySession.get(client.sessionId)
      if (!playerId) return
      if (this.clients.length < 2) client.send('room-created', { playerId, roomId: this.roomId })
      else client.send('duel-ready', { playerId, roomId: this.roomId, state: viewFor(this.duel, playerId) })
    })
    this.onMessage('command', (client, command: DuelCommand) => {
      const playerId = this.playerBySession.get(client.sessionId)
      if (!playerId || this.clients.length < 2) return

      const result = dispatch(this.duel, { ...command, playerId } as DuelCommand)
      if (!result.ok) {
        client.send('command-rejected', { message: result.error, revision: this.duel.revision })
        return
      }

      this.duel = result.state
      this.sendUpdate(result.events)
    })
  }

  onJoin(client: Client, options: JoinOptions) {
    const playerIndex = this.clients.length - 1
    const playerId = playerIndex === 0 ? 'p1' : 'p2'
    this.playerBySession.set(client.sessionId, playerId)
    this.loadoutByPlayer.set(playerId, sanitizeLoadout(options, playerIndex))

    if (this.clients.length === 1) {
      client.send('room-created', { playerId, roomId: this.roomId })
      return
    }

    const first = this.loadoutByPlayer.get('p1')!
    const second = this.loadoutByPlayer.get('p2')!
    this.duel = createDuel(first.name, second.name, first.spiritId, second.spiritId, first.deck, second.deck)
    for (const roomClient of this.clients) {
      const assignedId = this.playerBySession.get(roomClient.sessionId)!
      roomClient.send('duel-ready', { playerId: assignedId, roomId: this.roomId, state: viewFor(this.duel, assignedId) })
    }
  }

  onLeave(client: Client) {
    const playerId = this.playerBySession.get(client.sessionId)
    this.playerBySession.delete(client.sessionId)
    if (playerId) {
      this.loadoutByPlayer.delete(playerId)
      this.broadcast('player-left', { playerId })
    }
  }

  private sendUpdate(events: DuelEvent[]) {
    for (const client of this.clients) {
      const playerId = this.playerBySession.get(client.sessionId)
      if (playerId) {
        const visibleEvents = events.filter((event) => event.type !== 'RUNE_DRAWN' || event.playerId === playerId)
        client.send('duel-update', { state: viewFor(this.duel, playerId), events: visibleEvents })
      }
    }
  }
}
