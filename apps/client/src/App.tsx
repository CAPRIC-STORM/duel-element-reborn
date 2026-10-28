import { useEffect, useRef, useState } from 'react'
import { Client, type Room } from '@colyseus/sdk'
import { MAX_DECK_SIZE, MIN_DECK_SIZE, chooseAiCommand, chooseAiResponse, createDuel, dispatch, runeById, spiritById, spirits, standardRunes, starterDeck, type ChainLink, type CombatRelation, type DuelEvent, type DuelState, type EffectTarget, type ElementId, type Position } from '@duel/game-core'
import { DuelStage } from './DuelStage'
import { gameAudio, type SfxCue } from './gameAudio'
import { runeSpriteUrl } from './runeAssets'

type Screen = 'menu' | 'duel' | 'decks'
type Toast = { id: number; label: string; message: string; tone: string; accent?: string }
type VisualCue = { id: number; event: DuelEvent; boardIndex?: number }
type AttackAnimation = { id: number; playerId: string; attackerIndex: number; attackerRuneId: string; defenderIndex?: number; relation: CombatRelation; defenderWasConcealed: boolean }
type TargetChoice = { label: string; target: EffectTarget }
type Targeting = { kind: 'effect'; owner: 'self' | 'opponent' } | { kind: 'attack'; owner: 'opponent' }
type CodexPage = 'elements' | 'rules'
type DuelMode = 'solo' | 'online'
type OnlineStatus = 'idle' | 'connecting' | 'waiting' | 'playing'

const orientOnlineState = (state: DuelState, playerId: string): DuelState => {
  if (playerId === 'p1') return state
  const oriented = structuredClone(state)
  oriented.players = [oriented.players[1], oriented.players[0]]
  oriented.activePlayer = oriented.activePlayer === 0 ? 1 : 0
  return oriented
}

const spiritMotionUrl = (spiritId: string) => `/video/spirits/${spiritId}.mp4?v=watercolor-2`
const spiritMotionPosterUrl = (spiritId: string) => `/video/spirits/posters/${spiritId}.webp?v=watercolor-2`

function SpiritMotion({ spiritId, poster, label, className }: { spiritId: string; poster: string; label: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const motionPoster = spiritMotionPosterUrl(spiritId)
  if (failed) return <img className={className} src={motionPoster} alt={label} onError={(event) => { event.currentTarget.src = poster }} />
  return (
    <video
      className={`spirit-motion${className ? ` ${className}` : ''}`}
      src={spiritMotionUrl(spiritId)}
      poster={motionPoster}
      aria-label={label}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
    />
  )
}

const elementNames: Record<ElementId, string> = {
  fire: 'Feu', water: 'Eau', nature: 'Nature', storm: 'Foudre', earth: 'Terre', air: 'Air', telekinesis: 'Télékinésie', darkness: 'Ténèbres', light: 'Lumière', ice: 'Glace', cosmic: 'Cosmique', time: 'Temps', 'space-time': 'Espace-temps', creation: 'Création', unknown: 'Inconnu',
}

const duelRules = [
  { number: '01', title: 'Briser le rythme adverse', text: 'Réduisez les points de vie du duelliste adverse à zéro. Une attaque directe inflige 1 dégât, mais elle est impossible tant qu’une rune adverse occupe le terrain.' },
  { number: '02', title: 'Un grimoire sans hasard', text: 'Votre ordre de pioche est fixé pendant la construction. Les cinq premières runes forment votre main d’ouverture ; vous connaissez donc toujours votre prochaine pioche.' },
  { number: '03', title: 'Invoquer une rune', text: 'Vous disposez normalement d’une invocation par tour. En assaut, la rune est révélée et pourra combattre. En garde, elle arrive obligatoirement voilée et son identité reste secrète.' },
  { number: '04', title: 'Changer de posture', text: 'À partir du tour suivant son invocation, une rune peut passer de la garde à l’assaut ou inversement pendant la phase principale. Une rune révélée ne peut plus être voilée sans l’aide d’un pouvoir.' },
  { number: '05', title: 'Résoudre un combat', text: 'La rune ciblée est détruite sauf si un bouclier la protège. Une cible en assaut fait perdre 1 PV à son maître ; une cible en garde protège ses PV, même lorsqu’elle est détruite.' },
  { number: '06', title: 'Lire l’avantage élémentaire', text: 'Avec l’avantage, l’attaquant survit. Sans avantage net, l’attaquant est également détruit et son maître perd 1 PV. Une rune voilée ne révèle son affinité qu’à la résolution du combat.' },
  { number: '07', title: 'Former une chaîne', text: 'Chaque action importante ouvre une occasion de répondre avec un pouvoir disponible. Les réponses s’empilent, puis se résolvent de la dernière activation jusqu’à l’action d’origine.' },
  { number: '08', title: 'Un pouvoir, une occasion', text: 'Le pouvoir d’une rune ne s’active qu’une fois pour cette instance. Une rune voilée peut répondre : elle se révèle alors en garde avant d’ajouter son pouvoir à la chaîne.' },
  { number: '09', title: 'Éveiller un Spirit', text: 'Chaque invocation nourrit les sceaux élémentaires de votre Spirit. Lorsque toutes ses conditions sont réunies, son éveil libère son pouvoir signature pour renverser le duel.' },
]

type OpeningScene = { start: number; end: number; spiritIds: string[]; chapter: string; title: string; line: string; layout?: 'flash' | 'solo' | 'duo' | 'trio' | 'ensemble' | 'runes' | 'finale' }
const openingShotDeck: OpeningScene[] = [
  { start: 0, end: 1.3, spiritIds: ['spirit-diego'], chapter: 'SPIRITS · SAISON 1', title: 'Shao Raizan', line: '', layout: 'flash' },
  { start: 1.3, end: 2.55, spiritIds: ['spirit-flamberge'], chapter: 'SPIRITS · SAISON 1', title: 'Reika, Lame du Brasier', line: '', layout: 'flash' },
  { start: 2.55, end: 3.75, spiritIds: ['spirit-flame-god'], chapter: 'SPIRITS · SAISON 1', title: 'Alliance du Brasier et de l’Orage', line: '', layout: 'flash' },
  { start: 3.75, end: 4.9, spiritIds: ['spirit-samya'], chapter: 'SPIRITS · SAISON 1', title: 'Misora, Tisseuse d’Ondes', line: '', layout: 'flash' },
  { start: 4.9, end: 6, spiritIds: ['spirit-tiona'], chapter: 'SPIRITS · SAISON 1', title: 'Raiko, Moine de l’Orage', line: '', layout: 'flash' },
  { start: 6, end: 7.05, spiritIds: ['spirit-twin-stars'], chapter: 'SPIRITS · SAISON 1', title: 'Union des Quatre Domaines', line: '', layout: 'flash' },
  { start: 7.05, end: 8.05, spiritIds: ['spirit-isir'], chapter: 'SPIRITS · SAISON 1', title: 'Plasma Glacial', line: '', layout: 'flash' },
  { start: 8.05, end: 9, spiritIds: ['spirit-gold'], chapter: 'SPIRITS · SAISON 1', title: 'Impact Tellurique', line: '', layout: 'flash' },
  { start: 9, end: 9.9, spiritIds: ['spirit-morgane'], chapter: 'SPIRITS · SAISON 1', title: 'Duel du Masque Ardent', line: '', layout: 'flash' },
  { start: 9.9, end: 10.75, spiritIds: ['spirit-roshi'], chapter: 'SPIRITS · SAISON 1', title: 'Raz-de-marée de la Ligne', line: '', layout: 'flash' },
  { start: 10.75, end: 11.55, spiritIds: ['spirit-god-serena'], chapter: 'SPIRITS · SAISON 1', title: 'Convergence des Domaines', line: '', layout: 'flash' },
  { start: 11.55, end: 12.3, spiritIds: ['spirit-rubberband'], chapter: 'SPIRITS · SAISON 1', title: 'Alliance Imprévisible', line: '', layout: 'flash' },
  { start: 12.3, end: 13, spiritIds: ['spirit-shaka'], chapter: 'SPIRITS · SAISON 1', title: 'Momo, Esprit Blanc', line: '', layout: 'flash' },
  { start: 13, end: 13.65, spiritIds: ['spirit-shaka-cycle'], chapter: 'SPIRITS · SAISON 1', title: 'Course du Cycle Blanc', line: '', layout: 'flash' },
  { start: 13.65, end: 14.25, spiritIds: ['spirit-shaka-arayashiki'], chapter: 'SPIRITS · SAISON 1', title: 'Fracture Céleste', line: '', layout: 'flash' },
  { start: 14.25, end: 15.75, spiritIds: spirits.map((spirit) => spirit.id), chapter: 'SPIRITS · SAISON 1', title: 'Quinze destins', line: 'Une seule arène.', layout: 'ensemble' },
  { start: 15.75, end: 17.1, spiritIds: [], chapter: 'QUINZE ÉLÉMENTS', title: 'Les runes s’éveillent', line: '', layout: 'runes' },
  { start: 17.1, end: 18.55, spiritIds: ['spirit-flamberge', 'spirit-isir'], chapter: 'AFFRONTEMENT', title: 'Brasier contre silence', line: '', layout: 'duo' },
  { start: 18.55, end: 20, spiritIds: ['spirit-samya', 'spirit-tiona'], chapter: 'AFFRONTEMENT', title: 'Intention contre instinct', line: '', layout: 'duo' },
  { start: 20, end: 21.45, spiritIds: ['spirit-gold', 'spirit-god-serena'], chapter: 'AFFRONTEMENT', title: 'Forteresse contre domaine', line: '', layout: 'duo' },
  { start: 21.45, end: 22.9, spiritIds: ['spirit-roshi', 'spirit-rubberband'], chapter: 'AFFRONTEMENT', title: 'Tempête contre miracle', line: '', layout: 'duo' },
  { start: 22.9, end: 24.35, spiritIds: ['spirit-diego', 'spirit-twin-stars'], chapter: 'HÉRITAGE', title: 'Le cercle change de mains', line: '', layout: 'duo' },
  { start: 24.35, end: 25.8, spiritIds: ['spirit-shaka', 'spirit-shaka-cycle', 'spirit-shaka-arayashiki'], chapter: 'TROIS ÉVEILS', title: 'Le cycle de Shaka', line: '', layout: 'trio' },
  { start: 25.8, end: 27.25, spiritIds: ['spirit-flamberge', 'spirit-flame-god', 'spirit-morgane'], chapter: 'DOMINATION', title: 'Le brasier réclame l’arène', line: '', layout: 'trio' },
  { start: 27.25, end: 28.9, spiritIds: spirits.map((spirit) => spirit.id), chapter: 'GUERRE DES ÉLÉMENTS', title: 'Tous les pactes convergent', line: '', layout: 'ensemble' },
  { start: 28.9, end: 30.3, spiritIds: [], chapter: 'LE CERCLE ACCÉLÈRE', title: 'Enchaînez les runes', line: '', layout: 'runes' },
  { start: 30.3, end: 31.75, spiritIds: ['spirit-god-serena', 'spirit-rubberband'], chapter: 'RUPTURE', title: 'Domaine contre miracle', line: '', layout: 'duo' },
  { start: 31.75, end: 33.2, spiritIds: ['spirit-morgane', 'spirit-samya'], chapter: 'RUPTURE', title: 'Brasier contre intention', line: '', layout: 'duo' },
  { start: 33.2, end: 34.65, spiritIds: ['spirit-tiona', 'spirit-shaka'], chapter: 'RUPTURE', title: 'Instinct contre conscience', line: '', layout: 'duo' },
  { start: 34.65, end: 36.1, spiritIds: ['spirit-diego', 'spirit-flamberge'], chapter: 'RUPTURE', title: 'Le créateur contre la lame', line: '', layout: 'duo' },
  { start: 36.1, end: 37.75, spiritIds: spirits.map((spirit) => spirit.id), chapter: 'SPIRITS · SAISON 1', title: 'Quinze destins', line: 'Un seul rythme.', layout: 'ensemble' },
  { start: 37.75, end: 39.15, spiritIds: [], chapter: 'LE CERCLE EST COMPLET', title: 'Le duel commence', line: '', layout: 'runes' },
  { start: 39.15, end: 40.45, spiritIds: ['spirit-isir', 'spirit-gold'], chapter: 'CHOC ÉLÉMENTAIRE', title: 'Silence contre forteresse', line: '', layout: 'duo' },
  { start: 40.45, end: 41.75, spiritIds: ['spirit-morgane', 'spirit-roshi'], chapter: 'CHOC ÉLÉMENTAIRE', title: 'Brasier contre tempête', line: '', layout: 'duo' },
  { start: 41.75, end: 43.05, spiritIds: ['spirit-god-serena', 'spirit-shaka'], chapter: 'CHOC ÉLÉMENTAIRE', title: 'Domaine contre conscience', line: '', layout: 'duo' },
  { start: 43.05, end: 44.35, spiritIds: ['spirit-rubberband', 'spirit-flame-god'], chapter: 'CHOC ÉLÉMENTAIRE', title: 'Miracle contre souverain', line: '', layout: 'duo' },
  { start: 44.35, end: 45.65, spiritIds: ['spirit-twin-stars', 'spirit-diego'], chapter: 'CHOC ÉLÉMENTAIRE', title: 'Résonance contre créateur', line: '', layout: 'duo' },
  { start: 45.65, end: 46.95, spiritIds: ['spirit-samya', 'spirit-shaka-cycle'], chapter: 'CHOC ÉLÉMENTAIRE', title: 'Intention contre renaissance', line: '', layout: 'duo' },
  { start: 46.95, end: 48.25, spiritIds: ['spirit-tiona', 'spirit-shaka-arayashiki'], chapter: 'CHOC ÉLÉMENTAIRE', title: 'Instinct contre huitième conscience', line: '', layout: 'duo' },
  { start: 48.25, end: 49.55, spiritIds: ['spirit-flamberge', 'spirit-morgane'], chapter: 'CHOC ÉLÉMENTAIRE', title: 'Lame contre incendiaire', line: '', layout: 'duo' },
  { start: 49.55, end: 51, spiritIds: ['spirit-flamberge', 'spirit-flame-god', 'spirit-morgane'], chapter: 'DOMINATION', title: 'Le brasier se déchaîne', line: '', layout: 'trio' },
  { start: 51, end: 52.45, spiritIds: ['spirit-shaka', 'spirit-shaka-cycle', 'spirit-shaka-arayashiki'], chapter: 'TROIS ÉVEILS', title: 'Le cycle transcende', line: '', layout: 'trio' },
  { start: 52.45, end: 54.2, spiritIds: spirits.map((spirit) => spirit.id), chapter: 'GUERRE DES ÉLÉMENTS', title: 'Tous les pactes convergent', line: '', layout: 'ensemble' },
  { start: 54.2, end: 56, spiritIds: [], chapter: 'LE CERCLE EST COMPLET', title: 'Le duel commence', line: '', layout: 'runes' },
  { start: 56, end: 58, spiritIds: spirits.map((spirit) => spirit.id), chapter: 'DUEL D’ÉLÉMENT', title: 'Imposez votre rythme', line: '', layout: 'ensemble' },
  { start: 58, end: 61, spiritIds: spirits.map((spirit) => spirit.id), chapter: 'LES RUNES S’ALIGNENT', title: 'Duel d’Élément', line: 'Imposez votre rythme.', layout: 'finale' },
]

const openingScenes: OpeningScene[] = (() => {
  const shots = openingShotDeck.filter((scene) => scene.layout !== 'finale')
  const scenes: OpeningScene[] = []
  let cursor = 0
  let index = 0

  while (cursor < 58.3) {
    const duration = Math.min(Math.max(.5, .88 - index * .006), 58.3 - cursor)
    const shot = shots[index % shots.length]
    scenes.push({ ...shot, start: cursor, end: cursor + duration })
    cursor += duration
    index += 1
  }

  scenes.push(
    { start: 58.3, end: 59.15, spiritIds: spirits.map((spirit) => spirit.id), chapter: 'GUERRE DES ÉLÉMENTS', title: 'Tous les pactes convergent', line: '', layout: 'ensemble' },
    { start: 59.15, end: 60, spiritIds: [], chapter: 'LE CERCLE EST COMPLET', title: 'Le duel commence', line: '', layout: 'runes' },
    { start: 60, end: 60.708542, spiritIds: spirits.map((spirit) => spirit.id), chapter: 'LES RUNES S’ALIGNENT', title: 'Duel d’Élément', line: 'Imposez votre rythme.', layout: 'finale' },
  )

  return scenes
})()

const effectTargetChoices = (duel: ReturnType<typeof createDuel>, boardIndex: number): TargetChoice[] => {
  const source = duel.players[0].board[boardIndex]
  if (!source) return []
  const effectId = runeById[source.runeId].effectId
  const selfBoard = () => duel.players[0].board.map((rune, index) => ({ label: runeById[rune.runeId].name, target: { owner: 'self' as const, boardIndex: index } }))
  const enemyBoard = () => duel.players[1].board.map((rune, index) => ({ label: rune.position === 'defense-down' ? `Rune voilée ${index + 1}` : runeById[rune.runeId].name, target: { owner: 'opponent' as const, boardIndex: index } }))
  if (['wild-exchange', 'gust-banish', 'veil-drop', 'ember-collapse', 'root-usurpation', 'rift-overwrite'].includes(effectId)) return enemyBoard()
  if (effectId === 'veil-banishment') return enemyBoard().filter((_, index) => duel.players[1].board[index].position !== 'defense-down')
  if (['stone-guard', 'reveal-truth', 'tempest-break', 'chrono-repeat', 'tempest-overdrive'].includes(effectId)) return selfBoard()
  if (effectId === 'future-sight') return duel.players[0].deck.map((runeId) => ({ label: runeById[runeId].name, target: { runeId } }))
  if (effectId === 'time-surge') return duel.players[0].hand.flatMap((runeId) => ([
    { label: `${runeById[runeId].name} · Assaut`, target: { runeId, position: 'attack' as const } },
    { label: `${runeById[runeId].name} · Défense voilée`, target: { runeId, position: 'defense-down' as const } },
  ]))
  if (effectId === 'astral-return') return duel.players[0].discard.length > 0
    ? duel.players[0].discard.map((runeId) => ({ label: runeById[runeId].name, target: { runeId } }))
    : duel.players[0].deck.length > 0 ? [{ label: 'Puiser 1 rune dans le cosmos', target: {} }] : []
  if (effectId === 'solar-restoration') return duel.players[0].banished.map((runeId) => ({ label: runeById[runeId].name, target: { runeId } }))
  if (effectId === 'astral-gate') return duel.players[0].discard.flatMap((runeId) => ([
    { label: `${runeById[runeId].name} · Assaut`, target: { runeId, position: 'attack' as const } },
    { label: `${runeById[runeId].name} · Défense voilée`, target: { runeId, position: 'defense-down' as const } },
  ]))
  if (effectId === 'frost-sigil') return standardRunes.map((rune) => rune.element).filter((element, index, elements) => elements.indexOf(element) === index).map((element) => ({ label: element, target: { element } }))
  return []
}

const requiresTarget = (effectId: string) => ['wild-exchange', 'stone-guard', 'gust-banish', 'future-sight', 'veil-drop', 'reveal-truth', 'frost-sigil', 'astral-return', 'tempest-break', 'time-surge', 'ember-collapse', 'root-usurpation', 'veil-banishment', 'solar-restoration', 'astral-gate', 'chrono-repeat', 'rift-overwrite', 'tempest-overdrive'].includes(effectId)
const boardTargetOwner = (effectId: string): 'self' | 'opponent' | null => {
  if (['wild-exchange', 'gust-banish', 'veil-drop', 'ember-collapse', 'root-usurpation', 'veil-banishment', 'rift-overwrite'].includes(effectId)) return 'opponent'
  if (['stone-guard', 'reveal-truth', 'tempest-break', 'chrono-repeat', 'tempest-overdrive'].includes(effectId)) return 'self'
  return null
}

const describeChainLink = (duel: ReturnType<typeof createDuel>, link: ChainLink) => {
  const actorIndex = duel.players.findIndex((player) => player.id === link.playerId) as 0 | 1
  const actor = duel.players[actorIndex]
  const opponent = duel.players[actorIndex === 0 ? 1 : 0]
  const rune = runeById[link.runeId]
  const spirit = spiritById[link.runeId]
  const sourceName = link.concealed ? 'une rune voilée' : rune?.name ?? spirit?.name ?? 'Rythme du duel'
  const boardTarget = link.targetInstanceId
    ? [...actor.board, ...opponent.board].find((candidate) => candidate.instanceId === link.targetInstanceId)
    : link.target?.boardIndex === undefined
      ? undefined
      : (link.target.owner === 'opponent' ? opponent : actor).board[link.target.boardIndex]
  const targetName = link.targetLabel
    ?? (boardTarget ? (boardTarget.position === 'defense-down' ? 'une rune voilée' : runeById[boardTarget.runeId].name) : undefined)
    ?? (link.target?.runeId ? runeById[link.target.runeId]?.name : undefined)
    ?? link.target?.element

  if (link.kind === 'attack') {
    const defender = link.defenderInstanceId
      ? opponent.board.find((candidate) => candidate.instanceId === link.defenderInstanceId)
      : link.defenderIndex === undefined ? undefined : opponent.board[link.defenderIndex]
    const defenderName = defender ? (defender.position === 'defense-down' ? 'une rune voilée' : runeById[defender.runeId].name) : 'les points de vie'
    return { type: 'ATTAQUE', title: `${sourceName} attaque ${defenderName}`, detail: `${actor.name} déclare un assaut.` }
  }
  if (link.kind === 'summon') return { type: 'INVOCATION', title: `${actor.name} invoque ${sourceName}`, detail: 'La rune tente de rejoindre le terrain.' }
  if (link.kind === 'phase') return { type: 'CHANGEMENT DE PHASE', title: link.label, detail: `${actor.name} souhaite poursuivre le duel.` }
  if (link.kind === 'spirit') return { type: 'ÉVEIL DU SPIRIT', title: `${sourceName} · ${link.label}`, detail: `${actor.name} tente d’éveiller son Spirit.` }
  return {
    type: link.kind === 'effect' ? 'POUVOIR ACTIVÉ' : 'EFFET EN CHAÎNE',
    title: `${link.label} · ${sourceName}`,
    detail: `${actor.name}${targetName ? ` cible ${targetName}` : ' active ce pouvoir'}.`,
  }
}

const describeAttackFaceoff = (duel: ReturnType<typeof createDuel>, link: ChainLink) => {
  if (link.kind !== 'attack') return undefined
  const actorIndex = duel.players.findIndex((player) => player.id === link.playerId) as 0 | 1
  const opponent = duel.players[actorIndex === 0 ? 1 : 0]
  const defender = link.defenderInstanceId
    ? opponent.board.find((candidate) => candidate.instanceId === link.defenderInstanceId)
    : link.defenderIndex === undefined ? undefined : opponent.board[link.defenderIndex]
  return {
    attacker: runeById[link.runeId],
    defender: defender ? runeById[defender.runeId] : undefined,
    defenderConcealed: defender?.position === 'defense-down',
  }
}

const toastMeta = (event: DuelEvent) => {
  switch (event.type) {
    case 'RUNE_SUMMONED': return { label: 'Invocation', tone: 'summon' }
    case 'EFFECT_ACTIVATED': return { label: 'Pouvoir', tone: 'effect' }
    case 'DAMAGE_DEALT': return { label: 'Impact', tone: 'damage' }
    case 'HEALTH_RESTORED': return { label: 'Restauration', tone: 'heal' }
    case 'ATTACK_DECLARED': return { label: 'Combat', tone: 'damage' }
    case 'COMBAT_RESOLVED': return { label: 'Rapport élémentaire', tone: event.relation === 'effective' ? 'effect' : event.relation === 'disadvantaged' ? 'damage' : 'chain' }
    case 'RUNE_DESTROYED': return { label: 'Rune brisée', tone: 'damage' }
    case 'DUEL_ENDED': return { label: 'Duel terminé', tone: 'victory' }
    case 'EFFECT_RESOLVED': return { label: 'Résolution', tone: 'effect' }
    case 'POSITION_CHANGED': return null
    case 'CHAIN_OPENED': return { label: 'Chaîne ouverte', tone: 'chain' }
    case 'RESPONSE_AVAILABLE': return null
    case 'ALTER_ACTIVATED': return { label: 'Riposte', tone: 'chain' }
    case 'EFFECT_NEGATED': return { label: 'Pouvoir annulé', tone: 'damage' }
    case 'CHAIN_RESOLVED': return { label: 'Chaîne résolue', tone: 'chain' }
    case 'PRIORITY_PASSED': return null
    case 'CHAIN_LINK_ADDED': return { label: `Maillon ${event.linkCount}`, tone: 'chain' }
    case 'CHAIN_PREFERENCE_CHANGED': return null
    case 'RUNE_DISCARDED': return { label: 'Cimetière', tone: 'damage' }
    case 'RUNE_DRAWN': return null
    case 'CHAIN_RESOLUTION_STARTED': return null
    case 'PHASE_CHANGED': return null
    case 'SPIRIT_PROGRESS': return { label: 'Sceau du Spirit', tone: 'spirit' }
    case 'SPIRIT_AWAKENED': return { label: 'Éveil du Spirit', tone: 'spirit' }
    case 'SPIRIT_DEPARTED': return { label: 'Spirit apaisé', tone: 'spirit' }
  }
}

const eventMessage = (event: DuelEvent): string => {
  switch (event.type) {
    case 'RUNE_SUMMONED': return event.position === 'defense-down' ? 'Une rune rejoint le terrain en défense voilée.' : `${runeById[event.runeId].name} rejoint le terrain en assaut.`
    case 'EFFECT_ACTIVATED': return `${runeById[event.runeId].effectName} s’active.`
    case 'DAMAGE_DEALT': return `${event.amount} dégât infligé. ${event.remainingHp} PV restants.`
    case 'HEALTH_RESTORED': return `${event.amount} PV restauré. Total : ${event.totalHp}.`
    case 'ATTACK_DECLARED': return `${runeById[event.attackerRuneId].name} attaque ${event.defenderRuneId ? runeById[event.defenderRuneId].name : 'directement les points de vie'}.`
    case 'COMBAT_RESOLVED': return event.relation === 'direct' ? 'L’attaque atteint directement le duelliste.' : event.relation === 'effective' ? 'Avantage élémentaire : l’attaque est efficace.' : event.relation === 'disadvantaged' ? 'Désavantage élémentaire : l’attaquant est exposé.' : 'Les éléments s’affrontent à armes égales.'
    case 'RUNE_DESTROYED': return `${runeById[event.runeId].name} est détruite.`
    case 'PHASE_CHANGED': return `Phase ${event.phase}, tour ${event.turn}.`
    case 'DUEL_ENDED': return 'Le duel est terminé.'
    case 'EFFECT_RESOLVED': return event.message
    case 'POSITION_CHANGED': return `${runeById[event.runeId].name} passe en ${event.position === 'attack' ? 'attaque' : event.position === 'defense-up' ? 'défense révélée' : 'défense voilée'}.`
    case 'CHAIN_OPENED': return `${event.label} ouvre une fenêtre de réponse.`
    case 'RESPONSE_AVAILABLE': return `${event.optionCount} réponse${event.optionCount > 1 ? 's' : ''} disponible${event.optionCount > 1 ? 's' : ''}.`
    case 'ALTER_ACTIVATED': return `${event.alterName} répond à la chaîne.`
    case 'EFFECT_NEGATED': return `${runeById[event.runeId]?.effectName ?? spiritById[event.runeId]?.effectName ?? 'Le pouvoir'} est annulé.`
    case 'CHAIN_RESOLVED': return `La chaîne de ${event.linkCount} maillon${event.linkCount > 1 ? 's' : ''} est résolue.`
    case 'PRIORITY_PASSED': return 'La priorité est passée.'
    case 'CHAIN_LINK_ADDED': return `${event.label} rejoint la chaîne en maillon ${event.linkCount}.`
    case 'CHAIN_PREFERENCE_CHANGED': return event.enabled ? 'Les fenêtres de chaîne sont activées.' : 'Les fenêtres de chaîne sont désactivées.'
    case 'RUNE_DISCARDED': return `${runeById[event.runeId].name} est défaussée au cimetière.`
    case 'RUNE_DRAWN': return `${runeById[event.runeId].name} rejoint la main.`
    case 'CHAIN_RESOLUTION_STARTED': return `La résolution commence par le dernier des ${event.links.length} maillon${event.links.length > 1 ? 's' : ''}.`
    case 'SPIRIT_PROGRESS': return `${event.element} : sceau ${event.progress}/${event.required} pour ${spiritById[event.spiritId].name}.`
    case 'SPIRIT_AWAKENED': return `${spiritById[event.spiritId].name} s’éveille : ${event.effectName}.`
    case 'SPIRIT_DEPARTED': return `${spiritById[event.spiritId].name} quitte l’arène.`
  }
}

const eventRuneId = (event: DuelEvent): string | undefined => {
  if ('runeId' in event) return event.runeId
  if ('spiritId' in event) return event.spiritId
  if (event.type === 'ATTACK_DECLARED' || event.type === 'COMBAT_RESOLVED') return event.attackerRuneId
  if (event.type === 'CHAIN_RESOLUTION_STARTED') return event.links.at(-1)?.runeId
  return undefined
}

const MAX_RUNE_COPIES = 3
const deckIsValid = (deck: string[]) => deck.length >= MIN_DECK_SIZE && deck.length <= MAX_DECK_SIZE
const readDeckDraft = (): string[] | null => {
  try {
    const stored = JSON.parse(localStorage.getItem('duel-reborn-deck') ?? 'null')
    if (!Array.isArray(stored)) return null
    const valid = stored.filter((runeId): runeId is string => typeof runeId === 'string' && !!runeById[runeId]).slice(0, MAX_DECK_SIZE)
    return valid.length === stored.length ? valid : null
  } catch {
    return null
  }
}
const defaultDeckForSpirit = (spiritId: string) => {
  const player = createDuel('Duelliste Alpha', 'Duelliste Omega', spiritId).players[0]
  return [...player.hand, ...player.deck]
}

export function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [introVisible, setIntroVisible] = useState(true)
  const [introAwake, setIntroAwake] = useState(false)
  const [introFinale, setIntroFinale] = useState(false)
  const [selectedSpiritId, setSelectedSpiritId] = useState(() => localStorage.getItem('duel-reborn-spirit') ?? 'spirit-flamberge')
  const [previewSpiritId, setPreviewSpiritId] = useState<string | null>(null)
  const [preparedDeck, setPreparedDeck] = useState<string[]>(() => readDeckDraft() ?? defaultDeckForSpirit(localStorage.getItem('duel-reborn-spirit') ?? 'spirit-flamberge'))
  const [duel, setDuel] = useState(() => {
    const spiritId = localStorage.getItem('duel-reborn-spirit') ?? 'spirit-flamberge'
    const savedDeck = readDeckDraft()
    return createDuel('Duelliste Alpha', 'Duelliste Omega', spiritId, 'spirit-shaka', savedDeck && deckIsValid(savedDeck) ? savedDeck : undefined)
  })
  const [selectedBoardIndex, setSelectedBoardIndex] = useState<number | null>(null)
  const [notices, setNotices] = useState<string[]>(['Le cercle est ouvert. Invoquez une rune depuis votre main.'])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [visualCue, setVisualCue] = useState<VisualCue | null>(null)
  const [attackAnimation, setAttackAnimation] = useState<AttackAnimation | null>(null)
  const [effectTarget, setEffectTarget] = useState<EffectTarget | null>(null)
  const [targeting, setTargeting] = useState<Targeting | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [graveyardOwner, setGraveyardOwner] = useState<0 | 1 | null>(null)
  const [deckOpen, setDeckOpen] = useState(false)
  const [codexPage, setCodexPage] = useState<CodexPage | null>(null)
  const [pendingSummonIndex, setPendingSummonIndex] = useState<number | null>(null)
  const [sfxVolume, setSfxVolume] = useState(() => Number(localStorage.getItem('duel-reborn-sfx') ?? 0.42))
  const [musicVolume, setMusicVolume] = useState(() => Number(localStorage.getItem('duel-reborn-music') ?? 0.26))
  const [duelMode, setDuelMode] = useState<DuelMode>('solo')
  const [onlineLobbyOpen, setOnlineLobbyOpen] = useState(false)
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>('idle')
  const [roomCode, setRoomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [duelistName, setDuellistName] = useState(() => localStorage.getItem('duel-reborn-name') ?? 'Duelliste Alpha')
  const [onlinePlayerId, setOnlinePlayerId] = useState('p1')
  const eventId = useRef(0)
  const visualSequenceId = useRef(0)
  const introAudioRef = useRef<HTMLVideoElement>(null)
  const onlineRoomRef = useRef<Room | null>(null)
  const onlinePlayerIdRef = useRef('p1')
  const duelRef = useRef(duel)

  const humanPlayerId = duelMode === 'online' ? onlinePlayerId : 'p1'

  useEffect(() => {
    duelRef.current = duel
  }, [duel])

  useEffect(() => {
    gameAudio.setSfxVolume(sfxVolume)
  }, [sfxVolume])

  useEffect(() => {
    gameAudio.setMusicVolume(musicVolume)
    if (introAudioRef.current) introAudioRef.current.volume = musicVolume
  }, [musicVolume])

  useEffect(() => {
    if (introVisible) return
    gameAudio.playMusic(screen === 'duel' ? 'duel' : 'menu')
  }, [introVisible, screen])

  useEffect(() => {
    if (!codexPage && !previewSpiritId) return
    const closeOverlay = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCodexPage(null)
        setPreviewSpiritId(null)
      }
    }
    window.addEventListener('keydown', closeOverlay)
    return () => window.removeEventListener('keydown', closeOverlay)
  }, [codexPage, previewSpiritId])

  const navigate = (destination: Screen) => {
    if (duelMode === 'online' && destination !== 'duel') {
      void onlineRoomRef.current?.leave()
      onlineRoomRef.current = null
      setDuelMode('solo')
      setOnlineStatus('idle')
      setRoomCode('')
    }
    if (destination === 'duel' && screen !== 'duel') {
      if (!deckIsValid(preparedDeck)) {
        setScreen('decks')
        return
      }
      visualSequenceId.current += 1
      setDuelMode('solo')
      setDuel(createDuel('Duelliste Alpha', 'Duelliste Omega', selectedSpiritId, 'spirit-shaka', preparedDeck))
      setSelectedBoardIndex(null)
      setNotices(['Le cercle est ouvert. Invoquez une rune depuis votre main.'])
      setVisualCue(null)
      setAttackAnimation(null)
      setError(null)
    }
    setScreen(destination)
  }

  const run = (command: Parameters<typeof dispatch>[1]) => {
    if (duelMode === 'online' && onlineRoomRef.current) {
      setError(null)
      onlineRoomRef.current.send('command', { ...command, playerId: humanPlayerId })
      return true
    }
    const result = dispatch(duel, command)
    if (!result.ok) {
      setError(result.error)
      return false
    }
    setError(null)
    setDuel(result.state)
    setTargeting(null)
    setNotices((current) => [...result.events.map(eventMessage).reverse(), ...current].slice(0, 8))
    const eventTypes = new Set(result.events.map((event) => event.type))
    let soundCue: SfxCue | undefined
    if (eventTypes.has('SPIRIT_AWAKENED')) soundCue = 'spirit'
    else if (eventTypes.has('RUNE_DESTROYED')) soundCue = 'destroy'
    else if (eventTypes.has('COMBAT_RESOLVED') || eventTypes.has('DAMAGE_DEALT')) soundCue = 'damage'
    else if (eventTypes.has('HEALTH_RESTORED')) soundCue = 'heal'
    else if (eventTypes.has('CHAIN_RESOLUTION_STARTED') || eventTypes.has('CHAIN_LINK_ADDED') || eventTypes.has('ALTER_ACTIVATED')) soundCue = 'chain'
    else if (eventTypes.has('EFFECT_ACTIVATED') || eventTypes.has('EFFECT_RESOLVED')) soundCue = 'effect'
    else if (eventTypes.has('RUNE_SUMMONED')) soundCue = 'summon'
    else if (eventTypes.has('RUNE_DRAWN')) soundCue = 'draw'
    else if (eventTypes.has('RUNE_DISCARDED')) soundCue = 'discard'
    else if (eventTypes.has('PHASE_CHANGED') || eventTypes.has('POSITION_CHANGED')) soundCue = 'phase'
    if (soundCue) {
      const runeId = [...result.events].reverse().map(eventRuneId).find(Boolean)
      gameAudio.play(soundCue, { element: runeId ? runeById[runeId]?.element ?? spiritById[runeId]?.element : undefined })
    }
    const combat = result.events.find((event) => event.type === 'COMBAT_RESOLVED')
    if (combat?.type === 'COMBAT_RESOLVED') {
      const actorIndex = duel.players.findIndex((player) => player.id === combat.playerId) as 0 | 1
      const defenderOwner = actorIndex === 0 ? 1 : 0
      const animationId = ++eventId.current
      setAttackAnimation({
        id: animationId,
        playerId: combat.playerId,
        attackerIndex: Math.max(0, duel.players[actorIndex].board.findIndex((rune) => rune.instanceId === combat.attackerId)),
        attackerRuneId: combat.attackerRuneId,
        defenderIndex: combat.defenderId === undefined ? undefined : Math.max(0, duel.players[defenderOwner].board.findIndex((rune) => rune.instanceId === combat.defenderId)),
        relation: combat.relation,
        defenderWasConcealed: combat.defenderWasConcealed,
      })
      window.setTimeout(() => setAttackAnimation((current) => current?.id === animationId ? null : current), 720)
    }
    const importantEvents = result.events.filter((event) => toastMeta(event) !== null).slice(-2)
    importantEvents.forEach((event) => {
      const id = ++eventId.current
      const meta = toastMeta(event)!
      const runeId = eventRuneId(event)
      const source = runeId ? runeById[runeId] ?? spiritById[runeId] : undefined
      const accent = source ? `#${source.color.toString(16).padStart(6, '0')}` : undefined
      setToasts((current) => [...current.slice(-1), { id, ...meta, accent, message: eventMessage(event) }])
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4600)
    })
    const animationPriority: DuelEvent['type'][] = ['SPIRIT_AWAKENED', 'CHAIN_RESOLUTION_STARTED', 'EFFECT_ACTIVATED', 'ALTER_ACTIVATED', 'RUNE_SUMMONED', 'POSITION_CHANGED', 'RUNE_DESTROYED', 'DAMAGE_DEALT', 'HEALTH_RESTORED', 'PHASE_CHANGED', 'RUNE_DRAWN']
    const animatedEvents = animationPriority.flatMap((type) => result.events.filter((event) => event.type === type)).slice(0, 2)
    const sequenceId = ++visualSequenceId.current
    const visualCueDuration = (event: DuelEvent) => event.type === 'SPIRIT_AWAKENED'
      ? 3100
      : event.type === 'CHAIN_RESOLUTION_STARTED'
        ? Math.max(1000, event.links.length * 380)
        : 590
    const firstCueDuration = animatedEvents[0] ? visualCueDuration(animatedEvents[0]) : 620
    animatedEvents.forEach((animatedEvent, sequenceIndex) => {
      const playerId = 'playerId' in animatedEvent ? animatedEvent.playerId : undefined
      const playerIndex = playerId ? duel.players.findIndex((player) => player.id === playerId) : -1
      const nextPlayerIndex = playerId ? result.state.players.findIndex((player) => player.id === playerId) : -1
      const instanceId = 'instanceId' in animatedEvent ? animatedEvent.instanceId : undefined
      const previousBoardIndex = instanceId && playerIndex >= 0 ? duel.players[playerIndex].board.findIndex((rune) => rune.instanceId === instanceId) : -1
      const nextBoardIndex = instanceId && nextPlayerIndex >= 0 ? result.state.players[nextPlayerIndex].board.findIndex((rune) => rune.instanceId === instanceId) : -1
      const cue = { id: ++eventId.current, event: animatedEvent, boardIndex: previousBoardIndex >= 0 ? previousBoardIndex : nextBoardIndex >= 0 ? nextBoardIndex : undefined }
      const presentCue = () => {
        if (visualSequenceId.current !== sequenceId) return
        setVisualCue(cue)
        const cueDuration = visualCueDuration(animatedEvent)
        window.setTimeout(() => setVisualCue((current) => current?.id === cue.id ? null : current), cueDuration + 70)
      }
      if (sequenceIndex === 0) presentCue()
      else window.setTimeout(presentCue, firstCueDuration)
    })
    if (result.events.some((event) => event.type === 'RUNE_SUMMONED' && event.playerId === humanPlayerId)) {
      const summonedIndex = result.state.players[0].board.length - 1
      window.setTimeout(() => setSelectedBoardIndex(summonedIndex), 560)
      setEffectTarget(null)
    }
    return true
  }

  const applyOnlineUpdate = (state: DuelState, events: DuelEvent[], playerId: string) => {
    const oriented = orientOnlineState(state, playerId)
    const previous = duelRef.current
    duelRef.current = oriented
    setDuel(oriented)
    setError(null)
    setTargeting(null)
    setNotices((current) => [...events.map(eventMessage).reverse(), ...current].slice(0, 8))
    const combat = events.find((event) => event.type === 'COMBAT_RESOLVED')
    if (combat?.type === 'COMBAT_RESOLVED') {
      const actorIndex = previous.players.findIndex((player) => player.id === combat.playerId) as 0 | 1
      const defenderOwner = actorIndex === 0 ? 1 : 0
      const id = ++eventId.current
      setAttackAnimation({
        id,
        playerId: combat.playerId,
        attackerIndex: Math.max(0, previous.players[actorIndex].board.findIndex((rune) => rune.instanceId === combat.attackerId)),
        attackerRuneId: combat.attackerRuneId,
        defenderIndex: combat.defenderId === undefined ? undefined : Math.max(0, previous.players[defenderOwner].board.findIndex((rune) => rune.instanceId === combat.defenderId)),
        relation: combat.relation,
        defenderWasConcealed: combat.defenderWasConcealed,
      })
      window.setTimeout(() => setAttackAnimation((current) => current?.id === id ? null : current), 720)
    }
    const important = events.filter((event) => toastMeta(event) !== null).slice(-2)
    important.forEach((event) => {
      const id = ++eventId.current
      const meta = toastMeta(event)!
      const runeId = eventRuneId(event)
      const source = runeId ? runeById[runeId] ?? spiritById[runeId] : undefined
      setToasts((current) => [...current.slice(-1), { id, ...meta, accent: source ? `#${source.color.toString(16).padStart(6, '0')}` : undefined, message: eventMessage(event) }])
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4600)
    })
    const cueEvent = events.find((event) => ['SPIRIT_AWAKENED', 'EFFECT_ACTIVATED', 'ALTER_ACTIVATED', 'RUNE_SUMMONED', 'RUNE_DESTROYED'].includes(event.type))
    if (cueEvent) {
      const id = ++eventId.current
      setVisualCue({ id, event: cueEvent })
      window.setTimeout(() => setVisualCue((current) => current?.id === id ? null : current), cueEvent.type === 'SPIRIT_AWAKENED' ? 3170 : 660)
    }
  }

  const bindOnlineRoom = (room: Room) => {
    onlineRoomRef.current = room
    setRoomCode(room.roomId)
    room.onMessage('room-created', (message: { playerId: string; roomId: string }) => {
      onlinePlayerIdRef.current = message.playerId
      setOnlinePlayerId(message.playerId)
      setRoomCode(message.roomId)
      setOnlineStatus('waiting')
    })
    room.onMessage('duel-ready', (message: { playerId: string; roomId: string; state: DuelState }) => {
      onlinePlayerIdRef.current = message.playerId
      setOnlinePlayerId(message.playerId)
      setRoomCode(message.roomId)
      setDuelMode('online')
      setOnlineStatus('playing')
      setOnlineLobbyOpen(false)
      setScreen('duel')
      applyOnlineUpdate(message.state, [], message.playerId)
      setNotices(['Les deux grimoires sont scellés. Le duel en ligne commence.'])
    })
    room.onMessage('duel-update', (message: { state: DuelState; events: DuelEvent[] }) => applyOnlineUpdate(message.state, message.events, onlinePlayerIdRef.current))
    room.onMessage('command-rejected', (message: { message: string }) => setError(message.message))
    room.onMessage('player-left', () => {
      setError('Votre adversaire a quitté le salon.')
      setOnlineStatus('idle')
    })
    room.onLeave(() => {
      onlineRoomRef.current = null
      setOnlineStatus('idle')
    })
    room.send('sync')
  }

  const onlineLoadout = () => ({ name: duelistName.trim() || 'Duelliste', deck: preparedDeck, spiritId: selectedSpiritId })
  const createOnlineRoom = async () => {
    if (!deckIsValid(preparedDeck)) { setOnlineLobbyOpen(false); setScreen('decks'); return }
    setOnlineStatus('connecting')
    setError(null)
    localStorage.setItem('duel-reborn-name', duelistName)
    try {
      const client = new Client(import.meta.env.VITE_DUEL_SERVER_URL ?? 'ws://127.0.0.1:2567')
      bindOnlineRoom(await client.create('duel', onlineLoadout()))
    } catch {
      setOnlineStatus('idle')
      setError('Impossible de créer le salon. Vérifiez que le serveur de duel est lancé.')
    }
  }
  const joinOnlineRoom = async () => {
    if (!deckIsValid(preparedDeck)) { setOnlineLobbyOpen(false); setScreen('decks'); return }
    const code = joinCode.trim()
    if (!code) return
    setOnlineStatus('connecting')
    setError(null)
    localStorage.setItem('duel-reborn-name', duelistName)
    try {
      const client = new Client(import.meta.env.VITE_DUEL_SERVER_URL ?? 'ws://127.0.0.1:2567')
      bindOnlineRoom(await client.joinById(code, onlineLoadout()))
    } catch {
      setOnlineStatus('idle')
      setError('Salon introuvable, complet ou déjà fermé.')
    }
  }
  const closeOnlineLobby = () => {
    if (onlineStatus === 'waiting') void onlineRoomRef.current?.leave()
    if (onlineStatus !== 'connecting') {
      onlineRoomRef.current = null
      setOnlineStatus('idle')
      setRoomCode('')
      setOnlineLobbyOpen(false)
    }
  }

  const selectedRune = selectedBoardIndex === null ? undefined : duel.players[0].board[selectedBoardIndex]
  const previewSpirit = previewSpiritId ? spiritById[previewSpiritId] : undefined
  const humanSpirit = spiritById[duel.players[0].spiritId]
  const spiritReady = humanSpirit.requirements.every((requirement) => (duel.players[0].spiritProgress[requirement.element] ?? 0) >= requirement.count)
  const isHumanTurn = duel.activePlayer === 0 && !duel.winnerId && !duel.activeChain && !duel.pendingDiscard && !visualCue && !attackAnimation
  const humanResponse = duel.activeChain?.responderPlayerId === humanPlayerId ? duel.activeChain : undefined
  const chainOrigin = humanResponse ? describeChainLink(duel, humanResponse.links[0]) : undefined
  const chainLatest = humanResponse ? describeChainLink(duel, humanResponse.links.at(-1)!) : undefined
  const attackFaceoff = humanResponse ? describeAttackFaceoff(duel, humanResponse.links[0]) : undefined
  const selectedDefinition = selectedRune ? runeById[selectedRune.runeId] : undefined
  const pendingSummon = pendingSummonIndex === null ? undefined : runeById[duel.players[0].hand[pendingSummonIndex]]
  const targetChoices = selectedBoardIndex === null ? [] : effectTargetChoices(duel, selectedBoardIndex)
  const selectedTarget = effectTarget ?? targetChoices[0]?.target
  const selectBoardRune = (index: number) => {
    if (targeting?.kind === 'effect' && targeting.owner === 'self' && selectedBoardIndex !== null) {
      if (run({ type: 'ACTIVATE_EFFECT', playerId: humanPlayerId, boardIndex: selectedBoardIndex, target: { owner: 'self', boardIndex: index } })) setSelectedBoardIndex(null)
      return
    }
    setSelectedBoardIndex((current) => current === index ? null : index)
    setEffectTarget(null)
    setTargeting(null)
  }
  const selectOpponentRune = (index: number) => {
    if (selectedBoardIndex === null) return
    if (targeting?.kind === 'effect' && run({ type: 'ACTIVATE_EFFECT', playerId: humanPlayerId, boardIndex: selectedBoardIndex, target: { owner: 'opponent', boardIndex: index } })) setSelectedBoardIndex(null)
    if (targeting?.kind === 'attack' && run({ type: 'ATTACK', playerId: humanPlayerId, attackerIndex: selectedBoardIndex, defenderIndex: index })) setSelectedBoardIndex(null)
  }
  const activateSelectedEffect = () => {
    if (selectedBoardIndex === null || !selectedDefinition) return
    const owner = boardTargetOwner(selectedDefinition.effectId)
    if (owner) {
      setTargeting({ kind: 'effect', owner })
      setError(null)
      return
    }
    if (run({ type: 'ACTIVATE_EFFECT', playerId: humanPlayerId, boardIndex: selectedBoardIndex, target: selectedTarget })) setSelectedBoardIndex(null)
  }
  const attackWithSelectedRune = () => {
    if (selectedBoardIndex === null) return
    if (duel.players[1].board.length > 0) {
      setTargeting({ kind: 'attack', owner: 'opponent' })
      setError(null)
      return
    }
    if (run({ type: 'ATTACK', playerId: humanPlayerId, attackerIndex: selectedBoardIndex })) setSelectedBoardIndex(null)
  }
  const summonFromHand = (position: Position) => {
    if (pendingSummonIndex === null) return
    if (run({ type: 'SUMMON_RUNE', playerId: humanPlayerId, handIndex: pendingSummonIndex, position })) setPendingSummonIndex(null)
  }
  const changeSelectedPosition = (position: Position) => {
    if (selectedBoardIndex === null) return
    if (run({ type: 'CHANGE_POSITION', playerId: humanPlayerId, boardIndex: selectedBoardIndex, position })) setSelectedBoardIndex(null)
  }
  const restartDuel = () => {
    visualSequenceId.current += 1
    if (duelMode === 'online') void onlineRoomRef.current?.leave()
    setDuelMode('solo')
    setDuel(createDuel('Duelliste Alpha', 'Duelliste Omega', selectedSpiritId, 'spirit-shaka', deckIsValid(preparedDeck) ? preparedDeck : undefined))
    setSelectedBoardIndex(null)
    setNotices(['Un nouveau duel commence. Invoquez une rune depuis votre main.'])
    setToasts([])
    setVisualCue(null)
    setAttackAnimation(null)
    setEffectTarget(null)
    setTargeting(null)
    setError(null)
    setGraveyardOwner(null)
    setDeckOpen(false)
    setPendingSummonIndex(null)
  }
  const chooseSpirit = (spiritId: string) => {
    localStorage.setItem('duel-reborn-spirit', spiritId)
    setSelectedSpiritId(spiritId)
    setPreviewSpiritId(spiritId)
    setNotices([`${spiritById[spiritId].name} est désormais lié à votre grimoire.`])
  }
  const saveDeck = (nextDeck: string[]) => {
    setPreparedDeck(nextDeck)
    localStorage.setItem('duel-reborn-deck', JSON.stringify(nextDeck))
  }
  const addRuneToDeck = (runeId: string) => {
    const baseRuneId = runeById[runeId].baseRuneId
    const familyCopies = preparedDeck.filter((candidate) => runeById[candidate].baseRuneId === baseRuneId).length
    if (preparedDeck.length >= MAX_DECK_SIZE || familyCopies >= MAX_RUNE_COPIES) return
    saveDeck([...preparedDeck, runeId])
  }
  const removeRuneFromDeck = (index: number) => saveDeck(preparedDeck.filter((_, candidateIndex) => candidateIndex !== index))
  const moveRuneInDeck = (index: number, direction: -1 | 1) => {
    const destination = index + direction
    if (destination < 0 || destination >= preparedDeck.length) return
    const nextDeck = [...preparedDeck]
    ;[nextDeck[index], nextDeck[destination]] = [nextDeck[destination], nextDeck[index]]
    saveDeck(nextDeck)
  }
  const resetDeck = () => saveDeck(defaultDeckForSpirit(selectedSpiritId))

  useEffect(() => {
    if (duelMode !== 'solo' || screen !== 'duel' || codexPage || duel.activePlayer !== 1 || duel.winnerId || duel.pendingDiscard || visualCue || attackAnimation) return
    const timer = window.setTimeout(() => {
      const command = chooseAiCommand(duel, 'p2')
      if (command) run(command)
    }, 560)
    return () => window.clearTimeout(timer)
  }, [duel, visualCue, attackAnimation, screen, codexPage, duelMode])

  useEffect(() => {
    if (duelMode !== 'solo' || screen !== 'duel' || codexPage || duel.pendingDiscard?.playerId !== 'p2' || duel.winnerId || duel.activeChain || visualCue) return
    const timer = window.setTimeout(() => {
      const command = chooseAiCommand(duel, 'p2')
      if (command) run(command)
    }, 620)
    return () => window.clearTimeout(timer)
  }, [duel, visualCue, screen, codexPage, duelMode])

  useEffect(() => {
    if (duelMode !== 'solo' || screen !== 'duel' || codexPage || duel.activeChain?.responderPlayerId !== 'p2' || duel.winnerId || visualCue) return
    const timer = window.setTimeout(() => {
      const command = chooseAiResponse(duel, 'p2')
      if (command) run(command)
    }, 920)
    return () => window.clearTimeout(timer)
  }, [duel.activeChain, duel.winnerId, visualCue, screen, codexPage, duelMode])

  if (introVisible) {
    const awakenIntro = () => {
      setIntroAwake(true)
      setIntroFinale(false)
      const audio = introAudioRef.current
      if (!audio) return
      audio.currentTime = 0
      audio.volume = musicVolume
      void audio.play().catch(() => undefined)
    }
    const enterSanctuary = () => {
      introAudioRef.current?.pause()
      setIntroVisible(false)
      navigate('menu')
    }
    return (
      <main className={`title-screen ${introAwake ? 'title-screen--awake' : ''}`}>
        <video
          ref={introAudioRef}
          className="title-video title-video--azuki"
          src="/video/azuki-elementals-the-line.mp4?v=azuki-season-1"
          preload="metadata"
          playsInline
          onTimeUpdate={(event) => {
            const video = event.currentTarget
            const finale = video.currentTime >= 62
            setIntroFinale((current) => current === finale ? current : finale)
          }}
          onEnded={() => setIntroFinale(true)}
        />
        <div className="title-video-treatment" aria-hidden="true" />
        {introAwake ? <section
          className={`azuki-opening ${introFinale ? 'azuki-opening--finale' : ''}`}
          style={{ '--scene': '#e6c66d' } as React.CSSProperties}
          aria-live="polite"
        >
          <div className="azuki-opening-runes" aria-hidden="true">
            {standardRunes.slice(0, 12).map((rune, index) => <img key={rune.id} src={runeSpriteUrl(rune.element)} alt="" style={{ '--azuki-rune-index': index, '--azuki-rune-color': `#${rune.color.toString(16).padStart(6, '0')}` } as React.CSSProperties} />)}
          </div>
          <div className="azuki-opening-finale" aria-hidden={!introFinale}>
            <div className="azuki-elementals-seal">
              <div className="azuki-elementals-halo" aria-hidden="true"><i /><i /><i /></div>
              <div className="azuki-elementals-rune-ring" aria-hidden="true">
                {standardRunes.map((rune, index) => <img key={rune.id} src={runeSpriteUrl(rune.element)} alt="" style={{ '--elementals-rune-index': index, '--elementals-rune-count': standardRunes.length, '--elementals-rune-color': `#${rune.color.toString(16).padStart(6, '0')}` } as React.CSSProperties} />)}
              </div>
              <div className="azuki-elementals-title">
                <small>DUEL D’ÉLÉMENT · SAISON 1</small>
                <strong>ELEMENTALS</strong>
                <span>Les quatre domaines entrent en résonance</span>
              </div>
            </div>
            <aside className="azuki-opening-credit">
              <small>LA PASSE DÉCISIVE DE</small>
              <strong>AZUKI ELEMENTALS</strong>
              <span>Film original animé par THE LINE</span>
              <a href="https://www.youtube.com/watch?v=CxcflpdsYPQ" target="_blank" rel="noreferrer">Découvrir le film original</a>
            </aside>
          </div>
        </section> : null}
        <div className="title-stars" aria-hidden="true"><i /><i /><i /></div>
        <div className="title-sigil" aria-hidden="true"><i /><i /><i /><b>DE</b></div>
        {!introAwake ? (
          <section className="title-content">
            <small>AZUKI · SAISON 1 · QUATRE DOMAINES · QUINZE SPIRITS</small>
            <h1>Duel d’Élément</h1>
            <p>Les runes s’éveillent. Le grimoire attend son duelliste.</p>
            <button onClick={awakenIntro}>Entrer dans Duel d’Élément</button>
          </section>
        ) : (
          <section className={`intro-player-ui ${introFinale ? 'intro-player-ui--finale' : ''}`}>
            {!introFinale ? <button className="intro-skip" onClick={enterSanctuary}>Passer l’introduction</button> : null}
            {introFinale ? <button className="title-start" onClick={enterSanctuary}><span>ENTRER</span><small>Rejoindre le sanctuaire</small></button> : null}
          </section>
        )}
        {!introAwake ? <label className="title-volume">
          <span>MUSIQUE {Math.round(musicVolume * 100)} %</span>
          <input aria-label="Volume de la musique d’introduction" type="range" min="0" max="1" step="0.01" value={musicVolume} onChange={(event) => { const volume = Number(event.target.value); setMusicVolume(volume); gameAudio.setMusicVolume(volume); localStorage.setItem('duel-reborn-music', String(volume)) }} />
        </label> : null}
        <footer>CASQUE RECOMMANDÉ · VOLUME RÉGLABLE DANS LE MENU</footer>
      </main>
    )
  }

  return (
    <main className="app-shell" onPointerDownCapture={(event) => { if ((event.target as Element).closest('button')) gameAudio.play('ui') }}>
      <video
        className="project-background"
        src="/video/background-duel.mp4?v=watercolor-1"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <div className="project-background-veil" aria-hidden="true" />
      <header className="topbar">
        <button className="brand" onClick={() => navigate('menu')}><span>DE</span><div><strong>Duel d’Élément</strong><small>Azuki · Saison 1</small></div></button>
        <div className="topbar-actions">
          <div className="audio-controls">
          <label className="sfx-control" title="Volume de la musique">
            <span>MUSIQUE {Math.round(musicVolume * 100)}%</span>
            <input
              aria-label="Volume de la musique"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={musicVolume}
              onChange={(event) => {
                const volume = Number(event.target.value)
                setMusicVolume(volume)
                gameAudio.setMusicVolume(volume)
                localStorage.setItem('duel-reborn-music', String(volume))
              }}
            />
          </label>
          <label className="sfx-control" title="Volume des effets sonores">
            <span>EFFETS {Math.round(sfxVolume * 100)}%</span>
            <input aria-label="Volume des effets sonores" type="range" min="0" max="1" step="0.01" value={sfxVolume} onChange={(event) => { const volume = Number(event.target.value); setSfxVolume(volume); gameAudio.setSfxVolume(volume); localStorage.setItem('duel-reborn-sfx', String(volume)) }} onPointerUp={() => gameAudio.play('select')} />
          </label>
          </div>
          <nav>
            <button className={screen === 'menu' ? 'active' : ''} onClick={() => navigate('menu')}>Accueil</button>
            <button className={screen === 'decks' ? 'active' : ''} onClick={() => navigate('decks')}>Grimoires</button>
            <button className={screen === 'duel' ? 'active' : ''} onClick={() => navigate('duel')}>Duel</button>
            <button className={codexPage ? 'active codex-nav' : 'codex-nav'} onClick={() => setCodexPage(codexPage ?? 'elements')}>Codex</button>
          </nav>
        </div>
      </header>

      {screen === 'menu' ? (
        <section className="main-menu">
          <div className="menu-aura" aria-hidden="true"><i /><i /><i /></div>
          <header><small>SANCTUAIRE DES DUELLISTES</small><h1>Quel rythme allez-vous imposer ?</h1><p>Préparez l’ordre de votre grimoire, puis entrez dans une arène où chaque invocation peut ouvrir une chaîne.</p></header>
          <div className="menu-choices">
            <button className="menu-choice menu-choice--duel" onClick={() => navigate('duel')}><img className="menu-choice-rune" src={runeSpriteUrl('fire')} alt="" /><small>MODE PRINCIPAL</small><strong>Lancer un duel</strong><span>Affrontez le Duelliste Omega et éprouvez vos enchaînements.</span><b>ENTRER DANS L’ARÈNE</b></button>
            <button className="menu-choice menu-choice--online" onClick={() => { setError(null); setOnlineLobbyOpen(true) }}><img className="menu-choice-rune" src={runeSpriteUrl('space-time')} alt="" /><small>DUEL ENTRE AMIS</small><strong>Ouvrir un salon</strong><span>Créez un code privé ou rejoignez le cercle d’un autre duelliste.</span><b>JOUER EN LIGNE</b></button>
            <button className="menu-choice menu-choice--deck" onClick={() => navigate('decks')}><img className="menu-choice-rune" src={runeSpriteUrl('creation')} alt="" /><small>PRÉPARATION</small><strong>Ouvrir les grimoires</strong><span>Étudiez les runes et leur ordre de pioche immuable.</span><b>PRÉPARER LE DECK</b></button>
          </div>
          <footer><span>15 éléments</span><i /> <span>Chaînes tactiques</span><i /> <span>Ordre de pioche maîtrisé</span></footer>
        </section>
      ) : screen === 'duel' ? (
        <section className="duel-screen">
          <div className="phase-bar">
            <div><small>Tour actif</small><strong>{duel.players[duel.activePlayer].name}</strong></div>
            <div className={`turn-status ${error ? 'turn-status--error' : ''}`} aria-live="polite">
              <div className="phases">{(['main', 'battle', 'end'] as const).map((phase, index) => <span key={phase} className={duel.phase === phase ? 'active' : ''}><b>{index + 1}</b>{phase === 'main' ? 'Principale' : phase === 'battle' ? 'Combat' : 'Fin'}</span>)}</div>
              <span>{error ?? notices[0]}</span>
            </div>
            <div className="phase-actions">
              {duel.players[0].charges > 0 ? <span className="rift-reserve" title="Chaque faille accorde une invocation supplémentaire au début d’un prochain tour.">Faille en réserve · {duel.players[0].charges}</span> : null}
              <button
                className={`chain-toggle ${duel.players[0].chainEnabled ? 'active' : ''}`}
                aria-pressed={duel.players[0].chainEnabled}
                onClick={() => run({ type: 'SET_CHAIN_ENABLED', playerId: humanPlayerId, enabled: !duel.players[0].chainEnabled })}
              >
                <i /> Chaînes {duel.players[0].chainEnabled ? 'activées' : 'désactivées'}
              </button>
              <span className="phase-center-guide">Phase suivante via le sceau central</span>
            </div>
          </div>

          <section className={`spirit-strip ${spiritReady ? 'spirit-strip--ready' : ''} ${duel.players[0].activeSpiritId ? 'spirit-strip--active' : ''}`} style={{ '--spirit': `#${humanSpirit.color.toString(16).padStart(6, '0')}` } as React.CSSProperties}>
            <SpiritMotion spiritId={humanSpirit.id} poster={humanSpirit.imageUrl} label={humanSpirit.name} />
            <div className="spirit-strip-copy"><small>SPIRIT LIÉ</small><strong>{humanSpirit.name}</strong><span>{duel.players[0].activeSpiritId ? `${humanSpirit.effectName} veille sur ce tour.` : humanSpirit.effectText}</span></div>
            <div className="spirit-seals">
              {humanSpirit.requirements.map((requirement) => {
                const progress = duel.players[0].spiritProgress[requirement.element] ?? 0
                return <span key={requirement.element} className={progress >= requirement.count ? 'complete' : ''}><b>{progress}/{requirement.count}</b>{requirement.element}</span>
              })}
            </div>
            <button disabled={!isHumanTurn || !spiritReady || duel.players[0].spiritUsed} onClick={() => run({ type: 'AWAKEN_SPIRIT', playerId: humanPlayerId })}>
              {duel.players[0].activeSpiritId ? 'Spirit éveillé' : duel.players[0].spiritUsed ? 'Éveil consommé' : spiritReady ? 'Éveiller le Spirit' : 'Sceaux incomplets'}
            </button>
          </section>

          <DuelStage
            duel={duel}
            visualCue={visualCue}
            attackAnimation={attackAnimation}
            attackPreviewRuneId={targeting?.kind === 'attack' ? selectedRune?.runeId : undefined}
            attackPreviewForced={targeting?.kind === 'attack' && selectedRune?.grantedAdvantageTurn === duel.turn}
            selectedBoardIndex={selectedBoardIndex}
            targetableOwner={targeting?.owner ?? null}
            selectedActions={selectedRune && isHumanTurn ? {
              effectLabel: selectedRune.effectUsed ? 'Épuisé' : selectedDefinition!.effectName,
              effectDisabled: selectedRune.effectUsed || selectedRune.disabledTurns > 0 || selectedRune.neutralized || selectedDefinition!.timing === 'response' || (requiresTarget(selectedDefinition!.effectId) && !boardTargetOwner(selectedDefinition!.effectId) && !selectedTarget),
              attackVisible: duel.phase === 'battle',
              attackDisabled: selectedRune.attackUsed || selectedRune.position !== 'attack',
              postureVisible: duel.phase === 'main',
              postureDisabled: selectedRune.summonedOnTurn === duel.turn,
              postureLabel: selectedRune.position === 'attack' ? 'Garde' : selectedRune.position === 'defense-down' ? 'Révéler' : 'Assaut',
            } : null}
            phaseAdvanceLabel={duel.phase === 'main' ? 'Combat' : duel.phase === 'battle' ? 'Fin du tour' : 'Continuer'}
            phaseAdvanceDisabled={!isHumanTurn}
            onSelectBoard={selectBoardRune}
            onSelectOpponent={selectOpponentRune}
            onActivateSelected={activateSelectedEffect}
            onAttackSelected={attackWithSelectedRune}
            onChangeSelectedPosture={() => changeSelectedPosition(selectedRune?.position === 'attack' ? 'defense-up' : 'attack')}
            onClearSelected={() => { setSelectedBoardIndex(null); setTargeting(null) }}
            onAdvancePhase={() => run({ type: 'ADVANCE_PHASE', playerId: humanPlayerId })}
            onSummon={(handIndex) => { if (isHumanTurn && duel.phase === 'main' && duel.summonsRemaining > 0) setPendingSummonIndex(handIndex) }}
            onOpenGraveyard={setGraveyardOwner}
            onOpenDeck={() => setDeckOpen(true)}
          />

          {visualCue?.event.type === 'SPIRIT_AWAKENED' ? (() => {
            const spirit = spiritById[visualCue.event.spiritId]
            return <div className="spirit-awakening" style={{ '--spirit': `#${spirit.color.toString(16).padStart(6, '0')}` } as React.CSSProperties} aria-hidden="true">
              <div className="spirit-awakening-vignette" />
              <div className="spirit-awakening-beam" />
              <div className="spirit-awakening-rings"><i /><i /><i /><i /></div>
              <div className="spirit-awakening-sparks">{Array.from({ length: 14 }, (_, index) => <i key={index} style={{ '--spark-index': index } as React.CSSProperties} />)}</div>
              <b className="spirit-awakening-ghost">SPIRIT</b>
              <SpiritMotion className="spirit-awakening-portrait" spiritId={spirit.id} poster={spirit.imageUrl} label={spirit.name} />
              <div className="spirit-awakening-title"><small>ÉVEIL DU SPIRIT</small><strong>{spirit.name}</strong><span>{spirit.effectName}</span></div>
              <div className="spirit-awakening-flash" />
            </div>
          })() : null}

          {pendingSummon ? (
            <section className="summon-window context-window" aria-modal="true" role="dialog">
              <header><small>INVOCATION</small><strong>Choisissez le mode de {pendingSummon.name}</strong><span>Comme dans un TCG classique : l’assaut est révélé, la garde est automatiquement voilée.</span></header>
              <div className="summon-rune-preview"><img src={runeSpriteUrl(pendingSummon.element)} alt="" /><div><strong>{pendingSummon.name}</strong><span>{pendingSummon.effectName}</span><p>{pendingSummon.effectText}</p></div></div>
              <div className="summon-positions">
                <button onClick={() => summonFromHand('attack')}><img src={runeSpriteUrl(pendingSummon.element)} alt="" /><span><strong>Assaut</strong><small>Révélée · peut attaquer</small></span></button>
                <button className="summon-position--veiled" onClick={() => summonFromHand('defense-down')}><img src={runeSpriteUrl('unknown')} alt="" /><span><strong>Défense voilée</strong><small>Identité cachée · pouvoir révélateur</small></span></button>
              </div>
              <button className="summon-cancel" onClick={() => setPendingSummonIndex(null)}>Annuler</button>
            </section>
          ) : null}

          {targeting ? <div className="target-prompt context-window"><strong>{targeting.kind === 'attack' ? `${selectedDefinition?.name ?? 'Votre rune'} attaque : choisissez sa cible` : `Choisissez une rune ${targeting.owner === 'self' ? 'alliée' : 'adverse'}`}</strong><span>Les cibles valides brillent sur le terrain.</span><button onClick={() => setTargeting(null)}>Annuler</button></div> : null}

          {humanResponse ? (
            <section className="chain-window context-window" aria-modal="true" role="dialog">
              <header><small>FENÊTRE DE RÉPONSE · {humanResponse.links.length} MAILLON{humanResponse.links.length > 1 ? 'S' : ''}</small><strong>À quoi répondez-vous ?</strong><span>Les pouvoirs se résoudront du dernier maillon vers l’action d’origine.</span></header>
              {attackFaceoff ? (
                <div className="attack-faceoff">
                  <article><img src={runeSpriteUrl(attackFaceoff.attacker.element)} alt="" /><span><small>ATTAQUANT</small><strong>{attackFaceoff.attacker.name}</strong></span></article>
                  <b aria-hidden="true">VS</b>
                  <article>{attackFaceoff.defender ? <img src={runeSpriteUrl(attackFaceoff.defender.element, attackFaceoff.defenderConcealed)} alt="" /> : <i>PV</i>}<span><small>CIBLE</small><strong>{attackFaceoff.defender ? attackFaceoff.defenderConcealed ? 'Rune voilée' : attackFaceoff.defender.name : 'Attaque directe'}</strong></span></article>
                </div>
              ) : null}
              <div className="chain-context">
                <article>
                  <small>ACTION D’ORIGINE · {chainOrigin!.type}</small>
                  <strong>{chainOrigin!.title}</strong>
                  <span>{chainOrigin!.detail}</span>
                </article>
                {humanResponse.links.length > 1 ? (
                  <article className="chain-context--latest">
                    <small>VOUS RÉPONDEZ AU DERNIER MAILLON · {chainLatest!.type}</small>
                    <strong>{chainLatest!.title}</strong>
                    <span>{chainLatest!.detail}</span>
                  </article>
                ) : null}
              </div>
              <div className="chain-links">
                <div className="chain-stack-heading"><span>ORDRE DE LA CHAÎNE</span><small>Résolution ↑</small></div>
                {humanResponse.links.map((link, index) => { const described = describeChainLink(duel, link); const rune = runeById[link.runeId]; const spirit = spiritById[link.runeId]; return <div className={`chain-source ${link.playerId === humanPlayerId ? 'chain-source--ally' : 'chain-source--enemy'}`} key={`${link.playerId}-${link.boardIndex}-${index}`}><i>{index + 1}</i>{spirit ? <SpiritMotion spiritId={spirit.id} poster={spirit.imageUrl} label={spirit.name} /> : <img src={runeSpriteUrl(rune?.element ?? 'unknown', link.concealed)} alt="" />}<div><small>{index === 0 ? 'ACTION D’ORIGINE' : `MAILLON ${index + 1}`} · {link.playerId === humanPlayerId ? 'VOUS' : 'ADVERSAIRE'}</small><strong>{described.title}</strong><span>{described.detail}</span></div></div> })}
              </div>
              <div className="chain-options">
                {humanResponse.options.map((option, optionIndex) => <button key={`${option.boardIndex}-${optionIndex}`} onClick={() => run({ type: 'RESPOND_ALTER', playerId: humanPlayerId, boardIndex: option.boardIndex, optionIndex })}><img src={runeSpriteUrl(runeById[option.runeId].element, duel.players[0].board[option.boardIndex]?.position === 'defense-down')} alt="" /><small>{duel.players[0].board[option.boardIndex]?.position === 'defense-down' ? 'RÉVÉLER ET RÉPONDRE' : 'RÉPONDRE AVEC'}</small><strong>{option.alterName}</strong><span>{runeById[option.runeId].name}{option.targetLabel ? ` → ${option.targetLabel}` : ''}</span></button>)}
              </div>
              <button className="chain-pass" onClick={() => run({ type: 'PASS_RESPONSE', playerId: humanPlayerId })}>Passer la priorité</button>
            </section>
          ) : duel.activeChain ? <div className="chain-wait"><i /><span>L’adversaire examine une réponse…</span></div> : null}

          {duel.pendingDiscard?.playerId === humanPlayerId && !duel.activeChain && visualCue?.event.type !== 'RUNE_DRAWN' ? (
            <section className="discard-window context-window" aria-modal="true" role="dialog">
              <header><small>MAIN EN SURCHARGE</small><strong>Choisissez {duel.pendingDiscard.amount} rune{duel.pendingDiscard.amount > 1 ? 's' : ''} à défausser</strong><span>Un effet peut dépasser la limite. Après une pioche, votre main doit revenir à cinq runes.</span></header>
              <div className="discard-choices">
                {duel.players[0].hand.map((runeId, handIndex) => {
                  const rune = runeById[runeId]
                  return <button key={`${runeId}-${handIndex}`} onClick={() => run({ type: 'DISCARD_FROM_HAND', playerId: humanPlayerId, handIndex })}>
                    <img src={runeSpriteUrl(rune.element)} alt="" />
                    <span><strong>{rune.name}</strong><small>{rune.effectName}</small></span>
                  </button>
                })}
              </div>
            </section>
          ) : null}

          {graveyardOwner !== null ? (
            <section className="graveyard-window context-window" aria-modal="true" role="dialog">
              <header><div><small>CIMETIÈRE</small><strong>{duel.players[graveyardOwner].name}</strong></div><button onClick={() => setGraveyardOwner(null)}>Fermer</button></header>
              {duel.players[graveyardOwner].discard.length ? <div className="graveyard-list">{duel.players[graveyardOwner].discard.map((runeId, index) => { const rune = runeById[runeId]; return <article key={`${runeId}-${index}`}><img src={runeSpriteUrl(rune.element)} alt="" /><div><strong>{rune.name}</strong><span>{rune.effectName}</span><p>{rune.effectText}</p></div></article> })}</div> : <p className="graveyard-empty">Aucune rune n’a encore rejoint ce cimetière.</p>}
            </section>
          ) : null}

          {deckOpen ? (
            <section className="deck-order-window context-window" aria-modal="true" role="dialog">
              <header>
                <div><small>GRIMOIRE DU DUELLISTE</small><strong>Ordre de pioche</strong><span>Ton grimoire suit l’ordre défini pendant la construction du deck.</span></div>
                <button onClick={() => setDeckOpen(false)}>Fermer</button>
              </header>
              {duel.players[0].deck.length ? (
                <div className="deck-order-list">
                  {duel.players[0].deck.map((runeId, index) => {
                    const rune = runeById[runeId]
                    return <article className={index === 0 ? 'next-draw' : ''} key={`${runeId}-${index}`}>
                      <b>{index + 1}</b>
                      <img src={runeSpriteUrl(rune.element)} alt="" />
                      <div><small>{index === 0 ? 'PROCHAINE PIOCHE' : `PIOCHE ${index + 1}`}</small><strong>{rune.name}</strong><span>{rune.effectName}</span></div>
                    </article>
                  })}
                </div>
              ) : <p className="deck-order-empty">Ton grimoire est vide.</p>}
              <footer>La pile adverse reste secrète. Seul son nombre de runes est visible.</footer>
            </section>
          ) : null}

          {duel.winnerId ? (
            <section className={`duel-result ${duel.winnerId === humanPlayerId ? 'duel-result--victory' : 'duel-result--defeat'}`} aria-modal="true" role="dialog">
              <div className="duel-result-seal"><i /><b>{duel.winnerId === humanPlayerId ? 'V' : 'D'}</b><i /></div>
              <header><small>DUEL TERMINÉ</small><strong>{duel.winnerId === humanPlayerId ? 'Victoire du duelliste' : 'Le grimoire s’incline'}</strong><span>{duel.winnerId === humanPlayerId ? 'Votre rythme élémentaire a brisé la dernière défense adverse.' : `${duel.players[1].name} remporte cet affrontement. Ajustez votre ordre et revenez dans l’arène.`}</span></header>
              <div className="duel-result-stats">
                <article><small>TOURS</small><strong>{duel.turn}</strong></article>
                <article><small>VOS PV</small><strong>{duel.players[0].hp}/{duel.players[0].maxHp}</strong></article>
                <article><small>RUNES PERDUES</small><strong>{duel.players[0].discard.length}</strong></article>
              </div>
              <div className="duel-result-actions"><button className="result-primary" onClick={restartDuel}>Nouveau duel</button><button onClick={() => navigate('decks')}>Voir le grimoire</button></div>
            </section>
          ) : null}

          <div className="duel-toasts" aria-live="polite" aria-atomic="false">
            {toasts.map((toast) => (
              <div className={`duel-toast duel-toast--${toast.tone}`} key={toast.id} style={toast.accent ? { '--tone': toast.accent } as React.CSSProperties : undefined}>
                <i />
                <div><small>{toast.label}</small><span>{toast.message}</span></div>
              </div>
            ))}
          </div>

          {selectedRune && isHumanTurn ? (
            <aside className="action-panel context-window">
                <div className="action-rune-header">
                  <img src={runeSpriteUrl(selectedDefinition!.element, selectedRune.position === 'defense-down')} alt="" />
                  <div><small>RUNE SÉLECTIONNÉE</small><strong>{selectedDefinition!.name}</strong><span>{selectedDefinition!.element} · {selectedRune.position === 'attack' ? 'Assaut' : selectedRune.position === 'defense-up' ? 'Garde' : 'Voilée'}</span></div>
                </div>
                <div className="action-effect"><small>{selectedDefinition!.effectName}</small><p>{selectedDefinition!.effectText}</p></div>
                <div className="action-statuses">
                  <span className={selectedRune.effectUsed ? 'spent' : 'ready'}>{selectedRune.effectUsed ? 'Pouvoir épuisé' : 'Pouvoir disponible'}</span>
                  {selectedRune.attackShield ? <span className="shielded">Bouclier actif</span> : null}
                  {selectedRune.disabledTurns > 0 || selectedRune.neutralized ? <span className="disabled">Neutralisée</span> : null}
                </div>
                {requiresTarget(selectedDefinition!.effectId) && !boardTargetOwner(selectedDefinition!.effectId) ? (
                  <label className="target-picker">
                    <span>Cible du pouvoir</span>
                    <select
                      value={JSON.stringify(selectedTarget ?? {})}
                      onChange={(event) => setEffectTarget(JSON.parse(event.target.value) as EffectTarget)}
                      disabled={targetChoices.length === 0}
                    >
                      {targetChoices.length === 0 ? <option value="{}">Aucune cible disponible</option> : targetChoices.map((choice, index) => <option key={`${choice.label}-${index}`} value={JSON.stringify(choice.target)}>{choice.label}</option>)}
                    </select>
                  </label>
                ) : null}
                {selectedRune.effectUsed ? <p className="power-spent-note">Ce pouvoir est utilisé pour cette instance de la rune.</p> : null}
                <p className="action-wheel-hint">Les actions entourent maintenant la rune sélectionnée sur le terrain.</p>
            </aside>
          ) : null}
        </section>
      ) : (
        <section className="deck-screen">
          <header><small>ATELIER DES GRIMOIRES</small><h1>Composer le rythme du duel</h1><p>Chez nous, le grimoire n’est pas mélangé : les cinq premières runes forment votre main d’ouverture, puis chaque pioche suit exactement l’ordre préparé.</p></header>
          <section className="spirit-roster">
            <div className="deck-section-title"><div><small>SPIRITS · SAISON 1</small><strong>Choisissez l’âme du grimoire</strong></div><span>{spirits.length} Spirits</span></div>
            <p>Les Spirits mono-élément réclament trois sceaux identiques. Les duos combinent deux affinités et ouvrent des plans de jeu plus hybrides.</p>
            <div className="spirit-roster-grid">
              {spirits.map((spirit) => <button key={spirit.id} className={selectedSpiritId === spirit.id ? 'selected' : ''} onClick={() => chooseSpirit(spirit.id)} style={{ '--spirit': `#${spirit.color.toString(16).padStart(6, '0')}` } as React.CSSProperties}>
                <SpiritMotion spiritId={spirit.id} poster={spirit.imageUrl} label={spirit.name} />
                <span><small>{spirit.requirements.length === 1 ? 'MONO-ÉLÉMENT' : 'DUO-ÉLÉMENT'}</small><strong>{spirit.name}</strong><em>{spirit.requirements.map((requirement) => `${requirement.count} ${requirement.element}`).join(' + ')}</em></span>
                <p><b>{spirit.effectName}</b>{spirit.effectText}</p>
              </button>)}
            </div>
          </section>
          <div className="deck-workspace">
            <section className="deck-library">
              <div className="deck-section-title"><div><small>RUNES DISPONIBLES</small><strong>Bibliothèque élémentaire</strong></div><span>{standardRunes.length} runes · 30 pouvoirs</span></div>
              <p>Chaque rune existe en version Standard ou Alter. Les deux versions nourrissent le même élément et partagent une limite de trois exemplaires.</p>
              <div className="deck-grid">
                {starterDeck.map((runeId) => {
                  const rune = runeById[runeId]
                  const alter = runeById[`${runeId}-alter`]
                  const familyCopies = preparedDeck.filter((candidate) => runeById[candidate].baseRuneId === rune.baseRuneId).length
                  const cannotAdd = preparedDeck.length >= MAX_DECK_SIZE || familyCopies >= MAX_RUNE_COPIES
                  return <article key={runeId} style={{ '--rune': `#${rune.color.toString(16).padStart(6, '0')}` } as React.CSSProperties}>
                    <img className="deck-rune-sprite" src={runeSpriteUrl(rune.element)} alt="" />
                    <small>{elementNames[rune.element]}</small><strong>{rune.name}</strong>
                    {[rune, alter].map((variant) => <section className={`rune-variant rune-variant--${variant.variant}`} key={variant.id}>
                      <header><b>{variant.variant === 'alter' ? 'ALTER' : 'STANDARD'}</b><span>{variant.effectName}</span></header>
                      <p>{variant.effectText}</p>
                      <details className="mini-ruling"><summary>Mini-ruling</summary><p>{variant.rulingText}</p></details>
                      <button className="deck-add-rune" disabled={cannotAdd} onClick={() => addRuneToDeck(variant.id)}><span>{familyCopies}/{MAX_RUNE_COPIES}</span>{familyCopies >= MAX_RUNE_COPIES ? 'Limite commune atteinte' : preparedDeck.length >= MAX_DECK_SIZE ? 'Grimoire complet' : `Ajouter ${variant.variant === 'alter' ? 'l’Alter' : 'la Standard'}`}</button>
                    </section>)}
                  </article>
                })}
              </div>
            </section>
            <aside className="deck-sequence">
              <div className="deck-section-title"><div><small>ORDRE DU GRIMOIRE</small><strong>{spiritById[selectedSpiritId].name}</strong></div><span className={deckIsValid(preparedDeck) ? 'deck-ready' : 'deck-incomplete'}>{preparedDeck.length}/{MAX_DECK_SIZE}</span></div>
              <p>Lecture de haut en bas. Les cinq premières runes forment votre main. Utilisez les flèches pour maîtriser chaque future pioche.</p>
              <div className={`deck-validity ${deckIsValid(preparedDeck) ? 'ready' : ''}`}><i />{deckIsValid(preparedDeck) ? `Grimoire prêt · ${MAX_DECK_SIZE - preparedDeck.length} emplacement${MAX_DECK_SIZE - preparedDeck.length > 1 ? 's' : ''} libre${MAX_DECK_SIZE - preparedDeck.length > 1 ? 's' : ''}` : `Ajoutez encore ${MIN_DECK_SIZE - preparedDeck.length} rune${MIN_DECK_SIZE - preparedDeck.length > 1 ? 's' : ''}`}</div>
              <div className="deck-sequence-list">
                {preparedDeck.map((runeId, index) => {
                  const rune = runeById[runeId]
                  return <article className={index < 5 ? 'opening-rune' : index === 5 ? 'first-draw' : ''} key={`${runeId}-${index}`}>
                    <b>{index + 1}</b><img src={runeSpriteUrl(rune.element)} alt="" /><div><small>{index < 5 ? 'MAIN D’OUVERTURE' : index === 5 ? 'PREMIÈRE PIOCHE' : `PIOCHE ${index - 4}`}</small><strong>{rune.name}</strong><span>{elementNames[rune.element]} · {rune.variant === 'alter' ? 'ALTER' : 'STANDARD'} · {rune.effectName}</span></div>
                    <div className="deck-order-actions"><button disabled={index === 0} onClick={() => moveRuneInDeck(index, -1)} aria-label={`Monter ${rune.name}`}>↑</button><button disabled={index === preparedDeck.length - 1} onClick={() => moveRuneInDeck(index, 1)} aria-label={`Descendre ${rune.name}`}>↓</button><button className="remove" onClick={() => removeRuneFromDeck(index)} aria-label={`Retirer ${rune.name}`}>×</button></div>
                  </article>
                })}
              </div>
              <footer className="deck-builder-actions"><button onClick={resetDeck}>Deck conseillé</button><button disabled={!deckIsValid(preparedDeck)} onClick={() => navigate('duel')}>Lancer ce deck</button></footer>
            </aside>
          </div>
        </section>
      )}

      {onlineLobbyOpen ? (
        <div className="online-lobby-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeOnlineLobby() }}>
          <section className="online-lobby" role="dialog" aria-modal="true" aria-labelledby="online-title">
            <button className="online-lobby-close" disabled={onlineStatus === 'connecting'} onClick={closeOnlineLobby} aria-label="Fermer le salon">×</button>
            <header><small>DUEL ENTRE AMIS</small><h2 id="online-title">Sceller deux grimoires</h2><p>Chaque joueur conserve son deck, son ordre de pioche et son Spirit. Le serveur arbitre toutes les actions et masque les runes adverses.</p></header>
            <label><span>Nom du duelliste</span><input maxLength={24} value={duelistName} onChange={(event) => setDuellistName(event.target.value)} /></label>
            <div className="online-loadout"><span>Grimoire <b>{preparedDeck.length}/{MAX_DECK_SIZE}</b></span><span>Spirit <b>{spiritById[selectedSpiritId].name}</b></span></div>
            {onlineStatus === 'waiting' ? <div className="online-room-code"><small>CODE DU SALON</small><strong>{roomCode}</strong><button onClick={() => void navigator.clipboard.writeText(roomCode)}>Copier le code</button><p>En attente du second duelliste…</p></div> : <>
              <button className="online-create" disabled={onlineStatus === 'connecting'} onClick={() => void createOnlineRoom()}>{onlineStatus === 'connecting' ? 'Connexion au cercle…' : 'Créer un salon privé'}</button>
              <div className="online-divider"><i />OU<i /></div>
              <div className="online-join"><input aria-label="Code du salon" placeholder="Code du salon" value={joinCode} onChange={(event) => setJoinCode(event.target.value)} /><button disabled={onlineStatus === 'connecting' || !joinCode.trim()} onClick={() => void joinOnlineRoom()}>Rejoindre</button></div>
            </>}
            {error ? <p className="online-error">{error}</p> : null}
          </section>
        </div>
      ) : null}

      {previewSpirit ? (
        <div className="spirit-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewSpiritId(null) }}>
          <section className="spirit-preview" role="dialog" aria-modal="true" aria-labelledby="spirit-preview-title" style={{ '--spirit': `#${previewSpirit.color.toString(16).padStart(6, '0')}` } as React.CSSProperties}>
            <button className="spirit-preview-close" onClick={() => setPreviewSpiritId(null)} aria-label="Fermer la fiche du Spirit">×</button>
            <figure><SpiritMotion spiritId={previewSpirit.id} poster={previewSpirit.imageUrl} label={`Séquence de ${previewSpirit.name}`} /></figure>
            <div className="spirit-preview-copy">
              <small>SPIRIT · SAISON 1</small>
              <h2 id="spirit-preview-title">{previewSpirit.name}</h2>
              <p className="spirit-preview-lore">{previewSpirit.lore}</p>
              <div className="spirit-preview-affinities">
                {previewSpirit.requirements.map((requirement) => <span key={requirement.element}><b>{requirement.count}</b>{elementNames[requirement.element]}</span>)}
              </div>
              <article><small>POUVOIR D’ÉVEIL</small><strong>{previewSpirit.effectName}</strong><p>{previewSpirit.effectText}</p></article>
              <button className="spirit-preview-confirm" onClick={() => setPreviewSpiritId(null)}>Spirit lié au grimoire</button>
            </div>
          </section>
        </div>
      ) : null}

      {codexPage ? (
        <div className="codex-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCodexPage(null) }}>
          <section className="codex-window" role="dialog" aria-modal="true" aria-labelledby="codex-title">
            <header className="codex-header">
              <div><small>ARCHIVES DU DUEL</small><h2 id="codex-title">Codex du duelliste</h2><p>Les lois de l’arène, disponibles sans interrompre votre réflexion.</p></div>
              <button className="codex-close" onClick={() => setCodexPage(null)} aria-label="Fermer le Codex">Fermer <span>×</span></button>
            </header>
            <nav className="codex-tabs" aria-label="Sections du Codex">
              <button className={codexPage === 'elements' ? 'active' : ''} onClick={() => setCodexPage('elements')}><span>Ⅰ</span><div><small>AFFINITÉS</small><strong>Table élémentaire</strong></div></button>
              <button className={codexPage === 'rules' ? 'active' : ''} onClick={() => setCodexPage('rules')}><span>Ⅱ</span><div><small>FONDAMENTAUX</small><strong>Règles du duel</strong></div></button>
            </nav>
            <div className="codex-content">
              {codexPage === 'elements' ? (
                <section className="elemental-reference">
                  <div className="codex-intro"><small>PRINCIPE DE L’AFFRONTEMENT</small><strong>L’élément de l’attaquant dicte sa survie.</strong><p>Chaque rune domine deux affinités. Survolez une ligne pour suivre son avantage ; une rune voilée reste inconnue jusqu’à sa révélation.</p></div>
                  <div className="elemental-legend"><span className="effective">Avantage : l’attaquant survit</span><span className="neutral">Sans avantage : les deux runes chutent</span><span className="guard">Garde : aucun dégât au défenseur</span></div>
                  <div className="elemental-grid">
                    {standardRunes.map((rune) => <article key={rune.id} style={{ '--rune': `#${rune.color.toString(16).padStart(6, '0')}` } as React.CSSProperties}>
                      <div className="element-source"><img src={runeSpriteUrl(rune.element)} alt="" /><span><small>ÉLÉMENT</small><strong>{elementNames[rune.element]}</strong></span></div>
                      <i aria-hidden="true">›</i>
                      <div className="element-targets">{rune.strengths.map((element) => <span key={element}><img src={runeSpriteUrl(element)} alt="" /><b>{elementNames[element]}</b></span>)}</div>
                    </article>)}
                  </div>
                </section>
              ) : (
                <section className="rules-reference">
                  <div className="codex-intro"><small>RÈGLES ESSENTIELLES</small><strong>Neuf lois pour maîtriser l’arène.</strong><p>Le détail propre à chaque pouvoir demeure inscrit dans le mini-ruling de sa rune, au sein des Grimoires.</p></div>
                  <div className="rules-grid">{duelRules.map((rule) => <article key={rule.number}><span>{rule.number}</span><div><strong>{rule.title}</strong><p>{rule.text}</p></div></article>)}</div>
                  <footer className="rules-footnote"><b>À retenir</b><span>En cas de doute pendant une chaîne, l’action d’origine reste visible et la résolution s’effectue toujours du dernier maillon vers le premier.</span></footer>
                </section>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
