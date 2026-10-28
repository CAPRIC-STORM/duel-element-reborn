import { Application, extend } from '@pixi/react'
import { Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js'
import { useEffect, useRef, useState } from 'react'
import type { BoardRune, CombatRelation, DuelEvent, DuelState } from '@duel/game-core'
import { elementalRelation, runeById } from '@duel/game-core'
import { runeSpriteUrl } from './runeAssets'

extend({ Container, Graphics, Sprite, Text })

const labelStyle = new TextStyle({ fill: 0xdcecff, fontFamily: 'Trebuchet MS', fontSize: 15, fontWeight: '600' })
const smallStyle = new TextStyle({ fill: 0x86a6c2, fontFamily: 'Trebuchet MS', fontSize: 11, letterSpacing: 1.5 })
const handLabelStyle = new TextStyle({ fill: 0xdcecff, fontFamily: 'Trebuchet MS', fontSize: 11, fontWeight: '600' })
const handSmallStyle = new TextStyle({ fill: 0x86a6c2, fontFamily: 'Trebuchet MS', fontSize: 8, letterSpacing: 1 })
const positionStyle = new TextStyle({ fill: 0xd7bd7d, fontFamily: 'Trebuchet MS', fontSize: 8, fontWeight: '700', letterSpacing: 1 })
const hpStyle = new TextStyle({ fill: 0xffe1a1, fontFamily: 'Georgia', fontSize: 22, fontWeight: '700' })
const graveyardStyle = new TextStyle({ fill: 0xc9af78, fontFamily: 'Trebuchet MS', fontSize: 8, fontWeight: '700', letterSpacing: 1 })
const graveyardCountStyle = new TextStyle({ fill: 0x07111b, fontFamily: 'Trebuchet MS', fontSize: 10, fontWeight: '700' })
const deckLabelStyle = new TextStyle({ fill: 0x82c9e9, fontFamily: 'Trebuchet MS', fontSize: 8, fontWeight: '700', letterSpacing: 1.2 })
const plateNameStyle = new TextStyle({ fill: 0xf4f7f8, fontFamily: 'Georgia', fontSize: 14, fontWeight: '700' })
const plateMetaStyle = new TextStyle({ fill: 0x7393aa, fontFamily: 'Trebuchet MS', fontSize: 8, fontWeight: '700', letterSpacing: 1.3 })
const relationStyle = new TextStyle({ fill: 0xffffff, fontFamily: 'Trebuchet MS', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 })
const impactStyle = new TextStyle({ fill: 0xffffff, fontFamily: 'Georgia', fontSize: 24, fontWeight: '700', letterSpacing: 2.5, dropShadow: { color: 0x000000, blur: 5, distance: 2, alpha: 0.8 } })
const statusStyle = new TextStyle({ fill: 0xffffff, fontFamily: 'Trebuchet MS', fontSize: 7, fontWeight: '700', letterSpacing: 0.8 })
const tooltipTitleStyle = new TextStyle({ fill: 0xffe5a1, fontFamily: 'Georgia', fontSize: 12, fontWeight: '700' })
const tooltipEffectStyle = new TextStyle({ fill: 0x8cd9f3, fontFamily: 'Trebuchet MS', fontSize: 8, fontWeight: '700', letterSpacing: 0.7 })
const tooltipBodyStyle = new TextStyle({ fill: 0xc0d0da, fontFamily: 'Trebuchet MS', fontSize: 9, lineHeight: 13, wordWrap: true, wordWrapWidth: 176 })
const territoryStyle = new TextStyle({ fill: 0x789aae, fontFamily: 'Trebuchet MS', fontSize: 8, fontWeight: '700', letterSpacing: 2.2 })
const zoneIndexStyle = new TextStyle({ fill: 0x7692a3, fontFamily: 'Georgia', fontSize: 9, fontWeight: '700' })
const resourceStyle = new TextStyle({ fill: 0x9bb1bf, fontFamily: 'Trebuchet MS', fontSize: 8, fontWeight: '700', letterSpacing: 0.8 })
const activeDuelistStyle = new TextStyle({ fill: 0x07131a, fontFamily: 'Trebuchet MS', fontSize: 7, fontWeight: '700', letterSpacing: 1 })
const sequenceTitleStyle = new TextStyle({ fill: 0xffedbd, fontFamily: 'Georgia', fontSize: 22, fontWeight: '700', letterSpacing: 2, dropShadow: { color: 0x000000, blur: 7, distance: 2, alpha: 0.9 } })
const sequenceLabelStyle = new TextStyle({ fill: 0xb8d8e8, fontFamily: 'Trebuchet MS', fontSize: 9, fontWeight: '700', letterSpacing: 2 })
const lifeChangeStyle = new TextStyle({ fill: 0xffffff, fontFamily: 'Georgia', fontSize: 30, fontWeight: '700', dropShadow: { color: 0x000000, blur: 8, distance: 2, alpha: 0.9 } })
const chainNumberStyle = new TextStyle({ fill: 0x071018, fontFamily: 'Georgia', fontSize: 12, fontWeight: '700' })

type TargetRelation = Exclude<CombatRelation, 'direct'> | 'unknown'

const relationVisual = (relation: CombatRelation | 'unknown') => {
  if (relation === 'effective') return { color: 0x62e7ff, label: 'EFFICACE' }
  if (relation === 'disadvantaged') return { color: 0xff6b62, label: 'DÉSAVANTAGE' }
  if (relation === 'direct') return { color: 0xf2c96d, label: 'ATTAQUE DIRECTE' }
  if (relation === 'unknown') return { color: 0x8d9baa, label: 'RAPPORT INCONNU' }
  return { color: 0xf0eadb, label: 'NEUTRE' }
}

function useRuneTexture(runeId?: string, concealed = false) {
  const [texture, setTexture] = useState(Texture.EMPTY)
  const element = runeId ? runeById[runeId]?.element : undefined
  const url = runeSpriteUrl(element ?? 'unknown', concealed)

  useEffect(() => {
    let active = true
    setTexture(Texture.EMPTY)
    void Assets.load<Texture>(url).then((loaded) => {
      if (active) setTexture(loaded)
    })
    return () => { active = false }
  }, [url])

  return texture
}

interface RuneStoneProps {
  rune: BoardRune
  x: number
  y: number
  scale?: number
  selected?: boolean
  targetable?: boolean
  targetRelation?: TargetRelation
  concealed?: boolean
  showDetails?: boolean
  hidden?: boolean
  onSelect?: () => void
}

function RuneStone({ rune, x, y, scale = 1, selected, targetable, targetRelation, concealed, showDetails, hidden, onSelect }: RuneStoneProps) {
  const definition = runeById[rune.runeId]
  const [hovered, setHovered] = useState(false)
  const [arrival, setArrival] = useState(0)
  const radius = 34 * scale
  const compact = scale < 0.7
  const stoneColor = concealed ? 0x607080 : definition.color
  const texture = useRuneTexture(rune.runeId, concealed)
  const targetVisual = targetRelation ? relationVisual(targetRelation) : { color: 0xf4d37d, label: '' }
  const postureColor = showDetails ? stoneColor : concealed ? 0x8999a7 : rune.position === 'attack' ? 0xff755d : 0x7fcdf0

  useEffect(() => {
    const startedAt = performance.now()
    let frame = 0
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 220)
      setArrival(1 - Math.pow(1 - progress, 3))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <pixiContainer
      x={x}
      y={y + (1 - arrival) * 24 - (hovered || selected || targetable ? 7 : 0)}
      alpha={hidden ? 0 : arrival}
      scale={0.82 + arrival * 0.18}
      eventMode="static"
      cursor="pointer"
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerTap={onSelect}
    >
      <pixiGraphics
        draw={(graphics) => {
          graphics.clear()
          const plateRadius = radius + 11
          const platePoints = Array.from({ length: 16 }, (_, index) => {
            const angle = -Math.PI / 2 + index * Math.PI / 8
            const pointRadius = index % 2 === 0 ? plateRadius : plateRadius - 5 * scale
            return [Math.cos(angle) * pointRadius, Math.sin(angle) * pointRadius]
          }).flat()
          graphics.poly(platePoints).fill({ color: 0x02070c, alpha: 0.92 }).stroke({ color: postureColor, width: selected ? 3 : 1.5, alpha: selected ? 0.95 : 0.5 })
          if (!showDetails && rune.position === 'attack') {
            graphics.poly([-9 * scale, -plateRadius - 7, 0, -plateRadius - 17, 9 * scale, -plateRadius - 7]).fill({ color: postureColor, alpha: 0.9 })
            graphics.moveTo(-18 * scale, plateRadius + 3).lineTo(0, plateRadius + 11).lineTo(18 * scale, plateRadius + 3).stroke({ color: postureColor, width: 2, alpha: 0.72 })
          } else if (!showDetails) {
            graphics.moveTo(-20 * scale, -plateRadius + 3).lineTo(-20 * scale, plateRadius - 4).quadraticCurveTo(0, plateRadius + 17, 20 * scale, plateRadius - 4).lineTo(20 * scale, -plateRadius + 3).stroke({ color: postureColor, width: 2, alpha: 0.72 })
          }
          graphics.circle(0, 0, radius + (selected || targetable ? 8 : 5)).fill({ color: targetable ? targetVisual.color : stoneColor, alpha: selected || targetable ? 0.24 : 0.1 })
          if (targetable) graphics.circle(0, 0, radius + 13).stroke({ color: targetVisual.color, width: 2, alpha: 0.9 })
          if (rune.attackShield) graphics.circle(0, 0, radius + 10).stroke({ color: 0xf6d17a, width: 3, alpha: 0.92 })
          graphics.circle(0, 0, radius).fill({ color: 0x06101a, alpha: 0.8 }).stroke({ color: stoneColor, width: selected ? 4 : 2, alpha: 0.82 })
          if (rune.disabledTurns > 0 || rune.neutralized) {
            graphics.moveTo(-radius * 0.55, -radius * 0.55).lineTo(radius * 0.55, radius * 0.55).stroke({ color: 0xff765f, width: 3, alpha: 0.85 })
            graphics.moveTo(radius * 0.55, -radius * 0.55).lineTo(-radius * 0.55, radius * 0.55).stroke({ color: 0xff765f, width: 3, alpha: 0.85 })
          }
        }}
      />
      <pixiSprite texture={texture} anchor={0.5} width={radius * 1.78} height={radius * 1.78} alpha={rune.effectUsed ? 0.5 : 1} />
      <pixiText text={concealed ? 'Rune voilée' : definition.name} anchor={{ x: 0.5, y: 0 }} y={radius + 8} style={compact ? handLabelStyle : labelStyle} />
      <pixiText text={concealed ? 'INCONNU' : definition.element.toUpperCase()} anchor={{ x: 0.5, y: 0 }} y={radius + (compact ? 24 : 29)} style={compact ? handSmallStyle : smallStyle} />
      {!compact ? <pixiText text={rune.position === 'attack' ? 'ASSAUT' : rune.position === 'defense-up' ? 'GARDE' : 'VOILÉE'} anchor={{ x: 0.5, y: 0 }} y={radius + 46} style={positionStyle} /> : null}
      {!compact && (rune.effectUsed || rune.attackUsed || rune.attackShield) ? (
        <pixiContainer y={-radius - 18}>
          <pixiGraphics draw={(g) => { g.clear(); g.roundRect(-44, -9, 88, 18, 9).fill({ color: rune.attackShield ? 0x8c6b27 : 0x17232c, alpha: 0.95 }).stroke({ color: rune.attackShield ? 0xf0ca69 : 0x718796, width: 1, alpha: 0.75 }) }} />
          <pixiText text={rune.attackShield ? 'BOUCLIER' : rune.attackUsed ? 'ASSAUT ÉPUISÉ' : 'POUVOIR ÉPUISÉ'} anchor={0.5} style={statusStyle} />
        </pixiContainer>
      ) : null}
      {targetable && targetRelation ? (
        <pixiContainer y={-radius - 28}>
          <pixiGraphics draw={(g) => { g.clear(); g.roundRect(-58, -10, 116, 21, 10).fill({ color: 0x03090f, alpha: 0.9 }).stroke({ color: targetVisual.color, width: 1, alpha: 0.85 }) }} />
          <pixiText text={targetVisual.label} anchor={0.5} style={relationStyle} />
        </pixiContainer>
      ) : null}
      {compact && showDetails && hovered ? (
        <pixiContainer y={-148}>
          <pixiGraphics draw={(g) => { g.clear(); g.roundRect(-103, -16, 206, 112, 15).fill({ color: 0x030a11, alpha: 0.97 }).stroke({ color: stoneColor, width: 1.5, alpha: 0.75 }); g.moveTo(-86, 34).lineTo(86, 34).stroke({ color: stoneColor, width: 1, alpha: 0.25 }) }} />
          <pixiText text={definition.name} x={-86} y={-7} style={tooltipTitleStyle} />
          <pixiText text={definition.effectName.toUpperCase()} x={-86} y={17} style={tooltipEffectStyle} />
          <pixiText text={definition.effectText} x={-86} y={43} style={tooltipBodyStyle} />
        </pixiContainer>
      ) : null}
    </pixiContainer>
  )
}

interface GraveyardPileProps {
  runeIds: string[]
  x: number
  y: number
  onOpen: () => void
}

function GraveyardPile({ runeIds, x, y, onOpen }: GraveyardPileProps) {
  const texture = useRuneTexture(runeIds[0])
  const [hovered, setHovered] = useState(false)
  const layers = Math.min(3, runeIds.length)
  return (
    <pixiContainer
      x={x}
      y={y - (hovered ? 3 : 0)}
      scale={hovered ? 1.04 : 1}
      eventMode="static"
      cursor="pointer"
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerTap={onOpen}
    >
      <pixiGraphics draw={(g) => {
        g.clear()
        g.circle(0, -3, 43).fill({ color: 0xc29b55, alpha: hovered ? 0.12 : 0.06 })
        for (let layer = layers - 1; layer >= 0; layer -= 1) {
          const offset = layer * 4
          g.roundRect(-31 + offset, -34 - offset, 62, 64, 13)
            .fill({ color: layer === 0 ? 0x091521 : 0x111821, alpha: 0.97 })
            .stroke({ color: 0xc7a65e, width: 1, alpha: 0.28 + (layers - layer) * 0.13 })
        }
        if (runeIds.length === 0) {
          g.circle(0, -4, 29).fill({ color: 0x02070c, alpha: 0.92 }).stroke({ color: 0x9c8355, width: 1.5, alpha: hovered ? 0.7 : 0.38 })
          g.circle(0, -4, 19).stroke({ color: 0x9c8355, width: 1, alpha: 0.24 })
          g.poly([-11, -4, 0, -15, 11, -4, 0, 7]).stroke({ color: 0xc6a45d, width: 1.5, alpha: hovered ? 0.72 : 0.38 })
        }
        g.circle(29, -29, 12).fill({ color: 0xe2bd70, alpha: 0.96 }).stroke({ color: 0xfff0c6, width: 1, alpha: 0.72 })
      }} />
      {runeIds.length ? <pixiSprite texture={texture} anchor={0.5} y={-5} width={60} height={60} alpha={hovered ? 1 : 0.88} /> : null}
      <pixiText text={`${runeIds.length}`} anchor={0.5} x={29} y={-29} style={graveyardCountStyle} />
      <pixiText text={hovered ? 'OUVRIR' : 'CIMETIÈRE'} anchor={{ x: 0.5, y: 0 }} y={40} style={graveyardStyle} />
    </pixiContainer>
  )
}

interface DeckPileProps {
  count: number
  x: number
  y: number
  inspectable?: boolean
  onOpen?: () => void
}

function DeckPile({ count, x, y, inspectable, onOpen }: DeckPileProps) {
  const texture = useRuneTexture(undefined, true)
  const [hovered, setHovered] = useState(false)
  return (
    <pixiContainer
      x={x}
      y={y - (hovered ? 4 : 0)}
      scale={hovered ? 1.04 : 1}
      eventMode={inspectable ? 'static' : 'none'}
      cursor={inspectable ? 'pointer' : 'default'}
      onPointerOver={() => inspectable && setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerTap={inspectable ? onOpen : undefined}
    >
      <pixiGraphics draw={(g) => {
        g.clear()
        for (let layer = Math.min(4, Math.max(1, count)) - 1; layer >= 0; layer -= 1) {
          const offset = layer * 3
          g.roundRect(-34 + offset, -37 - offset, 68, 74, 10)
            .fill({ color: layer === 0 ? 0x07141f : 0x172a36, alpha: 0.98 })
            .stroke({ color: hovered ? 0x74d9ff : 0x4d91b4, width: 1.2, alpha: 0.48 + layer * 0.08 })
        }
        if (hovered) g.roundRect(-41, -46, 86, 92, 15).stroke({ color: 0x70dcff, width: 2, alpha: 0.7 })
        g.circle(31, -34, 12).fill({ color: 0x7edcff, alpha: 0.95 }).stroke({ color: 0xe6f9ff, width: 1, alpha: 0.8 })
      }} />
      <pixiSprite texture={texture} anchor={0.5} width={64} height={64} alpha={0.95} />
      <pixiText text={`${count}`} anchor={0.5} x={31} y={-34} style={graveyardCountStyle} />
      <pixiText text={inspectable && hovered ? 'CONSULTER' : 'GRIMOIRE'} anchor={{ x: 0.5, y: 0 }} y={45} style={deckLabelStyle} />
    </pixiContainer>
  )
}

interface AttackAnimationState {
  id: number
  playerId: string
  attackerIndex: number
  attackerRuneId: string
  defenderIndex?: number
  relation: CombatRelation
  defenderWasConcealed: boolean
}

interface AttackSequenceProps {
  animation: AttackAnimationState
  startX: number
  slotGap: number
  topY: number
  bottomY: number
  width: number
}

function AttackSequence({ animation, startX, slotGap, topY, bottomY, width }: AttackSequenceProps) {
  const [progress, setProgress] = useState(0)
  const attackerTexture = useRuneTexture(animation.attackerRuneId)
  const humanAttack = animation.playerId === 'p1'
  const from = { x: startX + animation.attackerIndex * slotGap, y: humanAttack ? bottomY : topY }
  const to = animation.defenderIndex === undefined
    ? { x: 110, y: humanAttack ? topY : bottomY }
    : { x: startX + animation.defenderIndex * slotGap, y: humanAttack ? topY : bottomY }
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.max(1, Math.hypot(dx, dy))
  const nx = dx / length
  const ny = dy / length
  const px = -ny
  const py = nx
  const windup = Math.min(1, progress / 0.18)
  const charge = Math.max(0, Math.min(1, (progress - 0.18) / 0.42))
  const returnTravel = Math.max(0, Math.min(1, (progress - 0.72) / 0.28))
  const strikeX = to.x - nx * (animation.defenderIndex === undefined ? 38 : 45)
  const strikeY = to.y - ny * (animation.defenderIndex === undefined ? 38 : 45)
  const launchX = from.x - nx * 22 * Math.sin(windup * Math.PI / 2)
  const launchY = from.y - ny * 22 * Math.sin(windup * Math.PI / 2)
  const chargeEase = 1 - Math.pow(1 - charge, 4)
  const returnEase = returnTravel * returnTravel * (3 - 2 * returnTravel)
  const attackX = launchX + (strikeX - launchX) * chargeEase
  const attackY = launchY + (strikeY - launchY) * chargeEase
  const runeX = returnTravel > 0 ? strikeX + (from.x - strikeX) * returnEase : attackX
  const runeY = returnTravel > 0 ? strikeY + (from.y - strikeY) * returnEase : attackY
  const impact = Math.max(0, Math.min(1, (progress - 0.56) / 0.3))
  const visual = relationVisual(animation.relation)
  const revealPhase = animation.defenderWasConcealed && progress < 0.78
  const label = revealPhase ? 'RUNE RÉVÉLÉE' : visual.label

  useEffect(() => {
    const startedAt = performance.now()
    let frame = 0
    const animate = (now: number) => {
      const next = Math.min(1, (now - startedAt) / 650)
      setProgress(next)
      if (next < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [animation.id])

  return (
    <pixiContainer>
      <pixiGraphics draw={(g) => {
        g.clear()
        const trailAlpha = charge > 0 && returnTravel === 0 ? Math.sin(charge * Math.PI) : 0
        const trailLength = 72 + charge * 45
        for (let streak = -2; streak <= 2; streak += 1) {
          const spread = streak * 5
          g.moveTo(runeX - nx * trailLength + px * spread, runeY - ny * trailLength + py * spread)
            .lineTo(runeX - nx * 24 + px * spread, runeY - ny * 24 + py * spread)
            .stroke({ color: streak === 0 ? 0xffffff : visual.color, width: streak === 0 ? 2.5 : 5 - Math.abs(streak), alpha: trailAlpha * (streak === 0 ? 0.7 : 0.2) })
        }
        g.circle(from.x, from.y, 43 + Math.sin(progress * Math.PI * 5) * 5).stroke({ color: visual.color, width: 2, alpha: returnTravel > 0 ? returnTravel * 0.55 : (1 - charge) * 0.45 })
        if (impact > 0) {
          const blast = Math.min(1, impact * 1.7)
          const fade = 1 - Math.max(0, (impact - 0.38) / 0.62)
          g.circle(to.x, to.y, 18 + blast * 82).stroke({ color: visual.color, width: 7 - blast * 4, alpha: fade })
          g.circle(to.x, to.y, 10 + blast * 48).fill({ color: visual.color, alpha: fade * 0.34 })
          for (let ray = 0; ray < 12; ray += 1) {
            const angle = (Math.PI * 2 * ray) / 12 + progress
            const inner = 18 + blast * 24
            const outer = 44 + blast * 78
            g.moveTo(to.x + Math.cos(angle) * inner, to.y + Math.sin(angle) * inner)
              .lineTo(to.x + Math.cos(angle) * outer, to.y + Math.sin(angle) * outer)
              .stroke({ color: ray % 2 ? visual.color : 0xffffff, width: ray % 2 ? 2 : 1, alpha: fade * 0.86 })
          }
        }
      }} />
      <pixiContainer x={runeX} y={runeY} rotation={Math.sin(progress * Math.PI * 7) * (charge > 0 && returnTravel === 0 ? 0.08 : 0)}>
        <pixiGraphics draw={(g) => { g.clear(); g.circle(0, 0, 47).fill({ color: visual.color, alpha: 0.12 }).stroke({ color: visual.color, width: 2.5, alpha: 0.8 }); g.circle(0, 0, 37).stroke({ color: 0xffffff, width: 1, alpha: 0.38 }) }} />
        <pixiSprite texture={attackerTexture} anchor={0.5} width={76} height={76} />
      </pixiContainer>
      {progress > 0.58 && progress < 0.94 ? (
        <pixiContainer x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 12} alpha={Math.max(0, Math.min(1, (progress - 0.63) * 9))}>
          <pixiGraphics draw={(g) => { g.clear(); g.roundRect(-128, -24, 256, 48, 15).fill({ color: 0x02070d, alpha: 0.9 }).stroke({ color: revealPhase ? 0xaeb9c4 : visual.color, width: 2, alpha: 0.9 }) }} />
          <pixiText text={label} anchor={0.5} style={impactStyle} />
        </pixiContainer>
      ) : null}
    </pixiContainer>
  )
}

interface EventSequenceProps {
  cue: { id: number; event: DuelEvent; boardIndex?: number }
  duel: DuelState
  startX: number
  slotGap: number
  topY: number
  bottomY: number
  handPanelY: number
  centerX: number
  width: number
  graveyardX: number
  deckX: number
}

function ChainResolutionIcon({ runeId, x, y, active, resolved, number }: { runeId: string; x: number; y: number; active: boolean; resolved: boolean; number: number }) {
  const texture = useRuneTexture(runeId)
  return (
    <pixiContainer x={x} y={y} scale={active ? 1.16 : resolved ? 0.82 : 1} alpha={resolved ? 0.35 : 1}>
      <pixiGraphics draw={(g) => {
        g.clear()
        g.circle(0, 0, active ? 47 : 39).fill({ color: active ? 0xe4c36b : 0x07131d, alpha: active ? 0.22 : 0.92 }).stroke({ color: active ? 0xffe396 : 0x6ebfdc, width: active ? 3 : 1.5, alpha: active ? 0.95 : 0.45 })
        if (active) g.circle(0, 0, 57).stroke({ color: 0xe4c36b, width: 2, alpha: 0.5 })
        g.circle(30, -30, 12).fill({ color: active ? 0xf0cd75 : 0x79bfd8, alpha: 0.98 })
      }} />
      <pixiSprite texture={texture} anchor={0.5} width={active ? 78 : 66} height={active ? 78 : 66} />
      <pixiText text={`${number}`} anchor={0.5} x={30} y={-30} style={chainNumberStyle} />
    </pixiContainer>
  )
}

function EventSequence({ cue, duel, startX, slotGap, topY, bottomY, handPanelY, centerX, width, graveyardX, deckX }: EventSequenceProps) {
  const [progress, setProgress] = useState(0)
  const event = cue.event
  const playerId = 'playerId' in event ? event.playerId : undefined
  const playerIndex = playerId ? duel.players.findIndex((player) => player.id === playerId) : -1
  const ownerY = playerIndex === 1 ? topY : bottomY
  const runeId = 'runeId' in event ? event.runeId : undefined
  const definition = runeId ? runeById[runeId] : undefined
  const concealed = (event.type === 'RUNE_SUMMONED' && event.position === 'defense-down') || (event.type === 'RUNE_DRAWN' && playerIndex === 1)
  const texture = useRuneTexture(runeId, concealed)
  const fallbackIndex = playerIndex >= 0 && runeId ? duel.players[playerIndex].board.findIndex((rune) => rune.runeId === runeId) : -1
  const boardIndex = cue.boardIndex ?? (fallbackIndex >= 0 ? fallbackIndex : 2)
  const sourceX = startX + boardIndex * slotGap
  const smooth = progress * progress * (3 - 2 * progress)
  const fade = 1 - Math.max(0, (progress - 0.72) / 0.28)
  const sequenceDuration = event.type === 'CHAIN_RESOLUTION_STARTED' ? Math.max(720, event.links.length * 260) : 560

  useEffect(() => {
    const startedAt = performance.now()
    let frame = 0
    const animate = (now: number) => {
      const next = Math.min(1, (now - startedAt) / sequenceDuration)
      setProgress(next)
      if (next < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [cue.id, sequenceDuration])

  if (progress >= 1) return null

  if (event.type === 'CHAIN_RESOLUTION_STARTED') {
    const links = [...event.links].reverse()
    const currentStep = Math.min(links.length - 1, Math.floor(progress * links.length))
    const gap = Math.min(112, (width - 260) / Math.max(1, links.length - 1))
    const firstX = centerX - gap * (links.length - 1) / 2
    const chainY = (topY + bottomY) / 2
    const phaseAlpha = Math.min(1, progress * 8) * (1 - Math.max(0, (progress - 0.88) / 0.12))
    return (
      <pixiContainer alpha={phaseAlpha}>
        <pixiGraphics draw={(g) => {
          g.clear()
          g.rect(0, chainY - 92, width, 184).fill({ color: 0x02070d, alpha: 0.74 })
          g.moveTo(0, chainY - 93).lineTo(width, chainY - 93).stroke({ color: 0xe6c56f, width: 1.5, alpha: 0.62 })
          g.moveTo(0, chainY + 93).lineTo(width, chainY + 93).stroke({ color: 0x6ac9e8, width: 1.5, alpha: 0.5 })
          if (links.length > 1) g.moveTo(firstX, chainY).lineTo(firstX + gap * (links.length - 1), chainY).stroke({ color: 0xd9b95f, width: 4, alpha: 0.22 })
        }} />
        <pixiText text="RÉSOLUTION DE LA CHAÎNE" anchor={0.5} x={centerX} y={chainY - 72} style={sequenceLabelStyle} />
        {links.map((link, index) => <ChainResolutionIcon key={`${link.playerId}-${link.runeId}-${index}`} runeId={link.runeId} x={firstX + index * gap} y={chainY + 6} active={index === currentStep} resolved={index < currentStep} number={links.length - index} />)}
        <pixiText text={links[currentStep]?.label?.toUpperCase() ?? 'RÉSOLUTION'} anchor={0.5} x={centerX} y={chainY + 68} style={sequenceLabelStyle} />
      </pixiContainer>
    )
  }

  if (event.type === 'PHASE_CHANGED') {
    const title = event.phase === 'main' ? 'PHASE PRINCIPALE' : event.phase === 'battle' ? 'PHASE DE COMBAT' : 'FIN DU TOUR'
    const phaseAlpha = Math.sin(progress * Math.PI)
    return (
      <pixiContainer alpha={phaseAlpha}>
        <pixiGraphics draw={(g) => {
          g.clear()
          g.rect(0, (topY + bottomY) / 2 - 47, width, 94).fill({ color: 0x02070d, alpha: 0.76 * phaseAlpha })
          g.moveTo(0, (topY + bottomY) / 2 - 48).lineTo(width, (topY + bottomY) / 2 - 48).stroke({ color: 0xe3c36c, width: 1.5, alpha: phaseAlpha })
          g.moveTo(0, (topY + bottomY) / 2 + 48).lineTo(width, (topY + bottomY) / 2 + 48).stroke({ color: 0x6ac8e6, width: 1.5, alpha: phaseAlpha })
          g.circle(centerX, (topY + bottomY) / 2, 30 + progress * 35).stroke({ color: 0xe3c36c, width: 2, alpha: phaseAlpha * 0.45 })
        }} />
        <pixiText text={title} anchor={0.5} x={centerX} y={(topY + bottomY) / 2 - 9} style={sequenceTitleStyle} />
        <pixiText text={`TOUR ${event.turn} · ${duel.players[event.activePlayer].name.toUpperCase()}`} anchor={0.5} x={centerX} y={(topY + bottomY) / 2 + 20} style={sequenceLabelStyle} />
      </pixiContainer>
    )
  }

  if (event.type === 'RUNE_SUMMONED') {
    const start = playerIndex === 1 ? topY - 108 : handPanelY + 78
    const travel = Math.min(1, progress / 0.68)
    const eased = 1 - Math.pow(1 - travel, 4)
    const y = start + (ownerY - start) * eased
    const x = centerX + (sourceX - centerX) * eased
    const arrival = Math.max(0, (progress - 0.5) / 0.5)
    return (
      <pixiContainer>
        <pixiGraphics draw={(g) => {
          g.clear()
          g.circle(sourceX, ownerY, 24 + arrival * 72).stroke({ color: definition?.color ?? 0x73cbea, width: 4 - arrival * 2, alpha: (1 - arrival) * 0.9 })
          g.circle(sourceX, ownerY, 12 + arrival * 45).fill({ color: definition?.color ?? 0x73cbea, alpha: (1 - arrival) * 0.22 })
          g.moveTo(x, y + 44).lineTo(x, start).stroke({ color: definition?.color ?? 0x73cbea, width: 8, alpha: 0.1 * fade })
        }} />
        <pixiContainer x={x} y={y} scale={0.72 + Math.sin(Math.min(1, progress / 0.7) * Math.PI) * 0.3} alpha={fade}>
          <pixiGraphics draw={(g) => { g.clear(); g.circle(0, 0, 44).fill({ color: definition?.color ?? 0x73cbea, alpha: 0.14 }).stroke({ color: definition?.color ?? 0x73cbea, width: 2.5, alpha: 0.85 }) }} />
          <pixiSprite texture={texture} anchor={0.5} width={74} height={74} />
        </pixiContainer>
        <pixiContainer x={sourceX} y={ownerY - 70} alpha={Math.sin(progress * Math.PI)}>
          <pixiText text={event.position === 'defense-down' ? 'INVOCATION VOILÉE' : 'INVOCATION EN ASSAUT'} anchor={0.5} style={sequenceLabelStyle} />
        </pixiContainer>
      </pixiContainer>
    )
  }

  if (event.type === 'RUNE_DRAWN') {
    const endX = playerIndex === 1 ? 220 : centerX
    const endY = playerIndex === 1 ? topY : handPanelY + 78
    const travel = Math.min(1, progress / 0.8)
    const eased = travel * travel * (3 - 2 * travel)
    const arc = Math.sin(travel * Math.PI) * 76
    const x = deckX + (endX - deckX) * eased
    const y = ownerY + (endY - ownerY) * eased - arc
    return (
      <pixiContainer>
        <pixiGraphics draw={(g) => {
          g.clear()
          g.moveTo(deckX, ownerY).quadraticCurveTo((deckX + endX) / 2, Math.min(ownerY, endY) - 92, x, y).stroke({ color: 0x75d5f1, width: 3, alpha: fade * 0.35 })
          g.circle(deckX, ownerY, 32 + progress * 28).stroke({ color: 0x75d5f1, width: 2, alpha: fade * 0.42 })
        }} />
        <pixiContainer x={x} y={y} scale={0.72 + Math.sin(travel * Math.PI) * 0.18} alpha={fade} rotation={(1 - travel) * 0.18}>
          <pixiGraphics draw={(g) => { g.clear(); g.roundRect(-43, -43, 86, 86, 18).fill({ color: 0x07131d, alpha: 0.88 }).stroke({ color: 0x78d4ef, width: 2, alpha: 0.72 }) }} />
          <pixiSprite texture={texture} anchor={0.5} width={76} height={76} />
        </pixiContainer>
        <pixiText text={playerIndex === 1 ? 'PIOCHE ADVERSE' : 'PIOCHE'} anchor={0.5} x={(deckX + endX) / 2} y={Math.min(ownerY, endY) - 74} alpha={Math.sin(progress * Math.PI)} style={sequenceLabelStyle} />
      </pixiContainer>
    )
  }

  if (event.type === 'EFFECT_ACTIVATED' || event.type === 'ALTER_ACTIVATED' || event.type === 'POSITION_CHANGED') {
    const pulse = Math.sin(progress * Math.PI)
    const title = event.type === 'POSITION_CHANGED' ? (event.position === 'attack' ? 'ASSAUT' : 'GARDE') : event.type === 'ALTER_ACTIVATED' ? event.alterName : definition?.effectName ?? 'POUVOIR'
    return (
      <pixiContainer>
        <pixiGraphics draw={(g) => {
          g.clear()
          g.rect(0, 0, width, handPanelY).fill({ color: 0x02070d, alpha: pulse * 0.18 })
          for (let ring = 0; ring < 3; ring += 1) {
            const radius = 38 + ((progress + ring * 0.19) % 1) * 82
            g.circle(sourceX, ownerY, radius).stroke({ color: definition?.color ?? 0xe4c46d, width: 3 - ring * 0.55, alpha: pulse * (0.5 - ring * 0.09) })
          }
          for (let ray = 0; ray < 8; ray += 1) {
            const angle = ray * Math.PI / 4 + progress * Math.PI
            g.moveTo(sourceX + Math.cos(angle) * 42, ownerY + Math.sin(angle) * 42)
              .lineTo(sourceX + Math.cos(angle) * (70 + pulse * 24), ownerY + Math.sin(angle) * (70 + pulse * 24))
              .stroke({ color: definition?.color ?? 0xe4c46d, width: 2, alpha: pulse * 0.48 })
          }
          for (let mote = 0; mote < 10; mote += 1) {
            const angle = mote * Math.PI / 5 + progress * Math.PI * 1.6
            const distance = 52 + ((progress * 95 + mote * 17) % 58)
            const moteX = sourceX + Math.cos(angle) * distance
            const moteY = ownerY + Math.sin(angle) * distance
            const element = definition?.element ?? 'unknown'
            const color = definition?.color ?? 0xa98cff
            if (element === 'fire') {
              g.poly([moteX, moteY - 7, moteX + 5, moteY + 5, moteX, moteY + 2, moteX - 5, moteY + 5]).fill({ color: definition?.color ?? 0xe4c46d, alpha: pulse * 0.68 })
            } else if (element === 'water') {
              g.circle(moteX, moteY, 3 + (mote % 3)).fill({ color, alpha: pulse * 0.5 }).stroke({ color: 0xdff8ff, width: 1, alpha: pulse * 0.4 })
            } else if (element === 'ice') {
              g.poly([moteX, moteY - 7, moteX + 5, moteY, moteX, moteY + 7, moteX - 5, moteY]).stroke({ color, width: 2, alpha: pulse * 0.7 })
              g.moveTo(moteX - 7, moteY).lineTo(moteX + 7, moteY).stroke({ color: 0xffffff, width: 1, alpha: pulse * 0.45 })
            } else if (element === 'earth') {
              g.rect(moteX - 5, moteY - 5, 10, 10).fill({ color, alpha: pulse * 0.58 }).stroke({ color: 0xffe3a0, width: 1, alpha: pulse * 0.3 })
            } else if (element === 'nature') {
              g.circle(moteX, moteY, 5).fill({ color, alpha: pulse * 0.48 })
              g.moveTo(moteX, moteY + 8).lineTo(moteX + Math.cos(angle) * 12, moteY + Math.sin(angle) * 12).stroke({ color: 0xc8ffc8, width: 1.5, alpha: pulse * 0.55 })
            } else if (element === 'storm') {
              g.poly([moteX - 4, moteY - 8, moteX + 1, moteY - 2, moteX - 2, moteY + 1, moteX + 5, moteY + 8]).stroke({ color, width: 2.5, alpha: pulse * 0.75 })
            } else if (element === 'light') {
              g.moveTo(moteX - 8, moteY).lineTo(moteX + 8, moteY).stroke({ color, width: 2, alpha: pulse * 0.72 })
              g.moveTo(moteX, moteY - 8).lineTo(moteX, moteY + 8).stroke({ color: 0xffffff, width: 1.5, alpha: pulse * 0.62 })
            } else if (element === 'darkness') {
              g.circle(moteX, moteY, 6).fill({ color: 0x13091c, alpha: pulse * 0.72 }).stroke({ color, width: 2, alpha: pulse * 0.68 })
            } else if (element === 'air') {
              g.circle(moteX, moteY, 6 + mote % 2).stroke({ color, width: 1.5, alpha: pulse * 0.5 })
              g.moveTo(moteX - 11, moteY + 3).lineTo(moteX + 4, moteY + 3).stroke({ color: 0xffffff, width: 1, alpha: pulse * 0.38 })
            } else if (element === 'time') {
              g.circle(moteX, moteY, 7).stroke({ color, width: 1.5, alpha: pulse * 0.62 })
              g.moveTo(moteX, moteY).lineTo(moteX + Math.cos(progress * 8) * 5, moteY + Math.sin(progress * 8) * 5).stroke({ color: 0xffffff, width: 1, alpha: pulse * 0.58 })
            } else if (['cosmic', 'space-time', 'telekinesis'].includes(element)) {
              g.circle(moteX, moteY, 6).stroke({ color, width: 2, alpha: pulse * 0.55 })
              g.moveTo(moteX - 9, moteY + Math.sin(angle) * 3).lineTo(moteX + 9, moteY - Math.sin(angle) * 3).stroke({ color: 0xffffff, width: 1, alpha: pulse * 0.32 })
            } else if (element === 'creation') {
              g.poly([moteX, moteY - 8, moteX + 3, moteY - 3, moteX + 8, moteY, moteX + 3, moteY + 3, moteX, moteY + 8, moteX - 3, moteY + 3, moteX - 8, moteY, moteX - 3, moteY - 3]).fill({ color, alpha: pulse * 0.58 })
            } else {
              g.circle(moteX, moteY, 6).stroke({ color, width: 2, alpha: pulse * 0.55 })
              g.moveTo(moteX - 8, moteY).lineTo(moteX + 8, moteY).stroke({ color: 0xffffff, width: 1, alpha: pulse * 0.3 })
            }
          }
        }} />
        <pixiContainer
          x={sourceX}
          y={ownerY}
          scale={event.type === 'POSITION_CHANGED' ? { x: Math.max(0.05, Math.abs(Math.cos(progress * Math.PI))) * (1 + pulse * 0.12), y: 1 + pulse * 0.18 } : 1 + pulse * 0.22}
          alpha={fade}
        >
          <pixiSprite texture={texture} anchor={0.5} width={78} height={78} />
        </pixiContainer>
        <pixiContainer x={sourceX} y={ownerY - 82} alpha={pulse}>
          <pixiGraphics draw={(g) => { g.clear(); g.roundRect(-145, -23, 290, 46, 12).fill({ color: 0x02070d, alpha: 0.9 }).stroke({ color: definition?.color ?? 0xe4c46d, width: 1.5, alpha: 0.8 }) }} />
          <pixiText text={title.toUpperCase()} anchor={0.5} y={-7} style={sequenceLabelStyle} />
          <pixiText text={(definition?.element ?? 'rune').toUpperCase()} anchor={0.5} y={10} style={handSmallStyle} />
        </pixiContainer>
      </pixiContainer>
    )
  }

  if (event.type === 'DAMAGE_DEALT' || event.type === 'HEALTH_RESTORED') {
    const color = event.type === 'DAMAGE_DEALT' ? 0xff654f : 0x65e2a0
    const plateY = playerIndex === 1 ? topY : bottomY
    const pulse = Math.sin(progress * Math.PI)
    const amount = event.amount
    return (
      <pixiContainer>
        <pixiGraphics draw={(g) => {
          g.clear()
          g.circle(108, plateY, 32 + progress * 86).stroke({ color, width: 6 - progress * 4, alpha: fade })
          g.roundRect(34, plateY - 54, 150, 108, 18).fill({ color, alpha: pulse * 0.16 }).stroke({ color, width: 3, alpha: pulse * 0.75 })
        }} />
        <pixiText text={`${event.type === 'DAMAGE_DEALT' ? '-' : '+'}${amount} PV`} anchor={0.5} x={108 + Math.sin(progress * 30) * (1 - progress) * 5} y={plateY - 8 - progress * 35} alpha={fade} style={lifeChangeStyle} />
      </pixiContainer>
    )
  }

  if (event.type === 'RUNE_DESTROYED') {
    const travel = Math.max(0, (progress - 0.28) / 0.72)
    const x = sourceX + (graveyardX - sourceX) * travel
    const y = ownerY - Math.sin(travel * Math.PI) * 75
    return (
      <pixiContainer>
        <pixiGraphics draw={(g) => {
          g.clear()
          for (let shard = 0; shard < 12; shard += 1) {
            const angle = shard * Math.PI / 6
            const distance = Math.min(progress / 0.45, 1) * 72
            g.poly([sourceX + Math.cos(angle) * distance, ownerY + Math.sin(angle) * distance, sourceX + Math.cos(angle + 0.08) * (distance + 15), ownerY + Math.sin(angle + 0.08) * (distance + 15), sourceX + Math.cos(angle - 0.08) * (distance + 8), ownerY + Math.sin(angle - 0.08) * (distance + 8)]).fill({ color: definition?.color ?? 0xff705c, alpha: fade * 0.75 })
          }
        }} />
        <pixiContainer x={x} y={y} scale={1 - travel * 0.58} alpha={fade} rotation={travel * Math.PI * 1.4}>
          <pixiSprite texture={texture} anchor={0.5} width={76} height={76} />
        </pixiContainer>
      </pixiContainer>
    )
  }

  return null
}

interface DuelStageProps {
  duel: DuelState
  visualCue: { id: number; event: DuelEvent; boardIndex?: number } | null
  attackAnimation: AttackAnimationState | null
  attackPreviewRuneId?: string
  attackPreviewForced?: boolean
  selectedBoardIndex: number | null
  targetableOwner: 'self' | 'opponent' | null
  selectedActions: {
    effectLabel: string
    effectDisabled: boolean
    attackVisible: boolean
    attackDisabled: boolean
    postureVisible: boolean
    postureDisabled: boolean
    postureLabel: string
  } | null
  phaseAdvanceLabel: string
  phaseAdvanceDisabled: boolean
  onSelectBoard: (index: number) => void
  onSelectOpponent: (index: number) => void
  onActivateSelected: () => void
  onAttackSelected: () => void
  onChangeSelectedPosture: () => void
  onClearSelected: () => void
  onAdvancePhase: () => void
  onSummon: (handIndex: number) => void
  onOpenGraveyard: (owner: 0 | 1) => void
  onOpenDeck: () => void
}

export function DuelStage({ duel, visualCue, attackAnimation, attackPreviewRuneId, attackPreviewForced, selectedBoardIndex, targetableOwner, selectedActions, phaseAdvanceLabel, phaseAdvanceDisabled, onSelectBoard, onSelectOpponent, onActivateSelected, onAttackSelected, onChangeSelectedPosture, onClearSelected, onAdvancePhase, onSummon, onOpenGraveyard, onOpenDeck }: DuelStageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(() => ({
    width: Math.max(760, Math.min(1480, window.innerWidth - 32)),
    height: Math.max(560, window.innerHeight - 150),
  }))

  useEffect(() => {
    const resize = () => {
      const hostWidth = hostRef.current?.clientWidth ?? window.innerWidth - 32
      setSize({
        width: Math.max(760, Math.min(1480, hostWidth)),
        height: Math.max(560, window.innerHeight - 150),
      })
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const human = duel.players[0]
  const opponent = duel.players[1]
  const centerX = size.width / 2
  const slotGap = Math.min(145, (size.width - 420) / 5)
  const startX = centerX - slotGap * 2.5
  const handPanelY = size.height - 166
  const fieldAvailable = handPanelY - 54
  const boardPanelHeight = Math.min(154, (fieldAvailable - 18) / 2)
  const topPanelY = 54 + Math.max(0, (fieldAvailable - boardPanelHeight * 2 - 18) / 2)
  const bottomPanelY = topPanelY + boardPanelHeight + 18
  const topY = topPanelY + boardPanelHeight / 2
  const bottomY = bottomPanelY + boardPanelHeight / 2
  const boardMiddleY = (topY + bottomY) / 2
  const handY = handPanelY + 74
  const handGap = Math.min(128, (size.width - 260) / Math.max(5, human.hand.length))
  const handStart = centerX - handGap * (human.hand.length - 1) / 2
  const utilityDeckX = size.width - 70
  const utilityGraveyardX = size.width - 154
  const humanActive = duel.activePlayer === 0
  const opponentActive = duel.activePlayer === 1
  const attackTargetRelation = (rune: BoardRune): TargetRelation | undefined => {
    if (targetableOwner !== 'opponent' || !attackPreviewRuneId) return undefined
    if (rune.position === 'defense-down') return 'unknown'
    return elementalRelation(attackPreviewRuneId, rune.runeId, attackPreviewForced)
  }

  return (
    <div className={`duel-canvas ${humanActive ? 'duel-canvas--human-active' : 'duel-canvas--opponent-active'}`} ref={hostRef}>
      <div className="duel-ambient" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => <i key={index} style={{
          '--ambient-x': `${7 + (index * 37) % 88}%`,
          '--ambient-delay': `${-(index * 0.73) % 8}s`,
          '--ambient-duration': `${6.5 + (index % 5) * 1.1}s`,
          '--ambient-size': `${2 + index % 3}px`,
        } as React.CSSProperties} />)}
      </div>
      <Application width={size.width} height={size.height} antialias backgroundAlpha={0} resolution={window.devicePixelRatio || 1} autoDensity>
        <pixiGraphics draw={(g) => {
          g.clear()
          g.roundRect(12, 10, size.width - 24, size.height - 20, 30).fill({ color: 0x02070c, alpha: 0.9 }).stroke({ color: 0x75c9ed, width: 1.5, alpha: 0.38 })
          g.roundRect(19, 17, size.width - 38, size.height - 34, 25).fill({ color: 0x07131c, alpha: 0.86 }).stroke({ color: 0xd8b862, width: 1, alpha: 0.2 })
          g.poly([20, 115, centerX - 170, 18, centerX + 170, 18, size.width - 20, 115, size.width - 20, size.height - 120, centerX + 190, size.height - 18, centerX - 190, size.height - 18, 20, size.height - 120])
            .fill({ color: 0x0a1e2a, alpha: 0.62 }).stroke({ color: 0x4b91ad, width: 1, alpha: 0.22 })
          for (let x = 54; x < size.width - 40; x += 52) g.moveTo(x, 28).lineTo(x - 130, size.height - 24).stroke({ color: 0x6ac5dd, width: 1, alpha: 0.035 })
          for (let y = 48; y < handPanelY; y += 42) g.moveTo(28, y).lineTo(size.width - 28, y).stroke({ color: 0x83d4ea, width: 1, alpha: 0.035 })

          g.roundRect(30, topPanelY, size.width - 60, boardPanelHeight, 20).fill({ color: 0x0d2635, alpha: 0.68 }).stroke({ color: opponentActive ? 0x72dcff : 0x5fbddd, width: opponentActive ? 2.5 : 1.5, alpha: opponentActive ? 0.78 : 0.35 })
          g.roundRect(34, topPanelY + 4, size.width - 68, boardPanelHeight - 8, 17).stroke({ color: 0x91e4ff, width: 1, alpha: opponentActive ? 0.22 : 0.07 })
          g.roundRect(30, bottomPanelY, size.width - 60, boardPanelHeight, 20).fill({ color: 0x18251f, alpha: 0.58 }).stroke({ color: humanActive ? 0xf0cb72 : 0xd8b45f, width: humanActive ? 2.5 : 1.5, alpha: humanActive ? 0.82 : 0.34 })
          g.roundRect(34, bottomPanelY + 4, size.width - 68, boardPanelHeight - 8, 17).stroke({ color: 0xffdf86, width: 1, alpha: humanActive ? 0.24 : 0.07 })
          g.poly([30, topPanelY + 20, 180, topPanelY, 180, topPanelY + boardPanelHeight, 30, topPanelY + boardPanelHeight - 20]).fill({ color: 0x07131c, alpha: 0.82 })
          g.poly([30, bottomPanelY + 20, 180, bottomPanelY, 180, bottomPanelY + boardPanelHeight, 30, bottomPanelY + boardPanelHeight - 20]).fill({ color: 0x07131c, alpha: 0.82 })
          g.roundRect(42, topY - 48, 130, 96, 15).fill({ color: 0x03090f, alpha: 0.72 }).stroke({ color: opponentActive ? 0x72dfff : 0x5bb9dc, width: opponentActive ? 1.7 : 1, alpha: opponentActive ? 0.72 : 0.22 })
          g.roundRect(42, bottomY - 48, 130, 96, 15).fill({ color: 0x03090f, alpha: 0.72 }).stroke({ color: humanActive ? 0xf0ca70 : 0xd8b45f, width: humanActive ? 1.7 : 1, alpha: humanActive ? 0.72 : 0.22 })
          g.rect(42, topY - 48, 4, 96).fill({ color: 0x65c9ed, alpha: opponentActive ? 0.95 : 0.28 })
          g.rect(42, bottomY - 48, 4, 96).fill({ color: 0xe3bd62, alpha: humanActive ? 0.95 : 0.28 })

          const middleY = (topY + bottomY) / 2
          g.moveTo(42, middleY).lineTo(centerX - 58, middleY).stroke({ color: 0xe5ca7c, width: 1.5, alpha: 0.34 })
          g.moveTo(centerX + 58, middleY).lineTo(size.width - 42, middleY).stroke({ color: 0xe5ca7c, width: 1.5, alpha: 0.34 })

          for (let index = 0; index < 6; index += 1) {
            const x = startX + index * slotGap
            const halfW = Math.min(51, slotGap / 2 - 6)
            const slot = (y: number) => [x - halfW + 10, y - 51, x + halfW - 10, y - 51, x + halfW, y - 41, x + halfW, y + 50, x + halfW - 10, y + 60, x - halfW + 10, y + 60, x - halfW, y + 50, x - halfW, y - 41]
            g.poly(slot(topY)).fill({ color: 0x02080d, alpha: 0.52 }).stroke({ color: 0x63b9d7, width: 1.2, alpha: 0.24 })
            g.poly(slot(bottomY)).fill({ color: 0x02080d, alpha: 0.52 }).stroke({ color: 0xd4ae58, width: 1.2, alpha: 0.24 })
            g.circle(x, topY + 4, 28).stroke({ color: 0x5bb4d3, width: 1, alpha: 0.1 })
            g.circle(x, bottomY + 4, 28).stroke({ color: 0xdbb65f, width: 1, alpha: 0.1 })
            g.poly([x, topY - 9, x + 13, topY + 4, x, topY + 17, x - 13, topY + 4]).stroke({ color: 0x69bad6, width: 1, alpha: 0.1 })
            g.poly([x, bottomY - 9, x + 13, bottomY + 4, x, bottomY + 17, x - 13, bottomY + 4]).stroke({ color: 0xd5b15c, width: 1, alpha: 0.1 })
          }

          g.poly([88, handPanelY, size.width - 88, handPanelY, size.width - 118, size.height - 24, 118, size.height - 24])
            .fill({ color: 0x030a10, alpha: 0.95 }).stroke({ color: 0x71c7e7, width: 1.2, alpha: 0.4 })
          g.moveTo(128, handPanelY + 16).lineTo(size.width - 128, handPanelY + 16).stroke({ color: 0xdab963, width: 1, alpha: 0.22 })
          g.moveTo(170, size.height - 39).lineTo(size.width - 170, size.height - 39).stroke({ color: 0x5fc5e6, width: 1, alpha: 0.1 })
          g.poly([88, handPanelY, 108, handPanelY, 138, size.height - 24, 118, size.height - 24]).fill({ color: 0xd8b65e, alpha: 0.18 })
          g.poly([size.width - 88, handPanelY, size.width - 108, handPanelY, size.width - 138, size.height - 24, size.width - 118, size.height - 24]).fill({ color: 0x6bc9e8, alpha: 0.14 })

        }} />

        <pixiText text="TERRITOIRE ADVERSE" x={194} y={topPanelY + 11} style={territoryStyle} />
        <pixiText text="VOTRE TERRITOIRE" x={194} y={bottomPanelY + 11} style={territoryStyle} />
        <pixiText text={opponent.name} x={54} y={topY - 35} style={plateNameStyle} />
        <pixiText text="ADVERSAIRE" x={54} y={topY - 12} style={plateMetaStyle} />
        <pixiText text={`${opponent.hp}`} x={54} y={topY + 7} style={hpStyle} />
        <pixiText text={`/ ${opponent.maxHp} PV`} x={84} y={topY + 16} style={plateMetaStyle} />
        <pixiText text={`MAIN ${opponent.hand.length}  ·  TERRAIN ${opponent.board.length}/6`} x={54} y={topY + 35} style={resourceStyle} />
        {opponentActive ? <pixiContainer x={133} y={topY - 36}><pixiGraphics draw={(g) => { g.clear(); g.roundRect(-25, -7, 50, 14, 7).fill({ color: 0x72d8f1, alpha: 0.9 }) }} /><pixiText text="ACTIF" anchor={0.5} style={activeDuelistStyle} /></pixiContainer> : null}
        <pixiText text={`TOUR ${duel.turn}  ·  ${duel.phase.toUpperCase()}`} anchor={{ x: 0.5, y: 0 }} x={centerX} y={27} style={smallStyle} />
        <pixiText text={human.name} x={54} y={bottomY - 35} style={plateNameStyle} />
        <pixiText text="DUELLISTE" x={54} y={bottomY - 12} style={plateMetaStyle} />
        <pixiText text={`${human.hp}`} x={54} y={bottomY + 7} style={hpStyle} />
        <pixiText text={`/ ${human.maxHp} PV`} x={84} y={bottomY + 16} style={plateMetaStyle} />
        <pixiText text={`TERRAIN ${human.board.length}/6`} x={54} y={bottomY + 35} style={resourceStyle} />
        {humanActive ? <pixiContainer x={133} y={bottomY - 36}><pixiGraphics draw={(g) => { g.clear(); g.roundRect(-25, -7, 50, 14, 7).fill({ color: 0xe7c46c, alpha: 0.94 }) }} /><pixiText text="ACTIF" anchor={0.5} style={activeDuelistStyle} /></pixiContainer> : null}

        {Array.from({ length: 6 }, (_, index) => (
          <pixiContainer key={`zone-label-${index}`}>
            <pixiText text={`${index + 1}`} anchor={0.5} x={startX + index * slotGap} y={topY + 43} alpha={opponent.board[index] ? 0.16 : 0.48} style={zoneIndexStyle} />
            <pixiText text={`${index + 1}`} anchor={0.5} x={startX + index * slotGap} y={bottomY + 43} alpha={human.board[index] ? 0.16 : 0.48} style={zoneIndexStyle} />
          </pixiContainer>
        ))}

        <pixiContainer>
          {opponent.board.map((rune, index) => <RuneStone key={rune.instanceId} rune={rune} x={startX + index * slotGap} y={topY} scale={0.82} concealed={rune.position === 'defense-down'} hidden={(attackAnimation?.playerId === 'p2' && attackAnimation.attackerIndex === index) || (visualCue?.event.type === 'RUNE_SUMMONED' && visualCue.event.playerId === 'p2' && visualCue.boardIndex === index) || (visualCue?.event.type === 'POSITION_CHANGED' && visualCue.event.playerId === 'p2' && visualCue.boardIndex === index)} targetable={targetableOwner === 'opponent'} targetRelation={attackTargetRelation(rune)} onSelect={() => onSelectOpponent(index)} />)}
        </pixiContainer>
        <pixiContainer>
          {human.board.map((rune, index) => (
            <RuneStone key={rune.instanceId} rune={rune} x={startX + index * slotGap} y={bottomY} scale={0.82} concealed={rune.position === 'defense-down'} hidden={(attackAnimation?.playerId === 'p1' && attackAnimation.attackerIndex === index) || (visualCue?.event.type === 'RUNE_SUMMONED' && visualCue.event.playerId === 'p1' && visualCue.boardIndex === index) || (visualCue?.event.type === 'POSITION_CHANGED' && visualCue.event.playerId === 'p1' && visualCue.boardIndex === index)} selected={selectedBoardIndex === index} targetable={targetableOwner === 'self'} onSelect={() => onSelectBoard(index)} />
          ))}
        </pixiContainer>
        <GraveyardPile runeIds={opponent.discard} x={utilityGraveyardX} y={topY} onOpen={() => onOpenGraveyard(1)} />
        <DeckPile count={opponent.deck.length} x={utilityDeckX} y={topY} />
        <GraveyardPile runeIds={human.discard} x={utilityGraveyardX} y={bottomY} onOpen={() => onOpenGraveyard(0)} />
        <DeckPile count={human.deck.length} x={utilityDeckX} y={bottomY} inspectable onOpen={onOpenDeck} />

        {visualCue ? <EventSequence key={visualCue.id} cue={visualCue} duel={duel} startX={startX} slotGap={slotGap} topY={topY} bottomY={bottomY} handPanelY={handPanelY} centerX={centerX} width={size.width} graveyardX={utilityGraveyardX} deckX={utilityDeckX} /> : null}
        {attackAnimation ? <AttackSequence key={attackAnimation.id} animation={attackAnimation} startX={startX} slotGap={slotGap} topY={topY} bottomY={bottomY} width={size.width} /> : null}

        <pixiText text={`MAIN DU DUELLISTE · ${human.hand.length}${human.hand.length > 5 ? ' · SURCHARGE' : '/5'}`} x={128} y={handPanelY + 23} style={smallStyle} />
        <pixiText text="CLIQUER POUR INVOQUER  ·  SURVOLER POUR LIRE" anchor={{ x: 1, y: 0 }} x={size.width - 128} y={handPanelY + 23} style={handSmallStyle} />
        <pixiContainer>
          {human.hand.map((runeId, index) => (
            <RuneStone
              key={`${runeId}-${index}`}
              rune={{ instanceId: `hand-${index}`, runeId, position: 'attack', effectUsed: false, attackUsed: false, summonedOnTurn: 0, disabledTurns: 0, attackShield: false, neutralized: false }}
              x={handStart + index * handGap}
              y={handY + Math.abs(index - (human.hand.length - 1) / 2) * 3}
              scale={0.62}
              showDetails
              hidden={visualCue?.event.type === 'RUNE_DRAWN' && visualCue.event.playerId === 'p1' && visualCue.event.runeId === runeId && index === human.hand.length - 1}
              onSelect={() => onSummon(index)}
            />
          ))}
        </pixiContainer>
      </Application>
      {visualCue ? (
        <div
          key={visualCue.id}
          className={`duel-visual-cue duel-visual-cue--${visualCue.event.type.toLowerCase().replaceAll('_', '-')}`}
          data-player={'playerId' in visualCue.event ? visualCue.event.playerId : undefined}
          aria-hidden="true"
        />
      ) : null}
      {selectedBoardIndex !== null && selectedActions && !targetableOwner ? (
        <div
          className="rune-action-wheel"
          style={{
            '--wheel-x': `${((startX + selectedBoardIndex * slotGap) / size.width) * 100}%`,
            '--wheel-y': `${(bottomY / size.height) * 100}%`,
          } as React.CSSProperties}
          aria-label="Actions de la rune sélectionnée"
        >
          <button className="rune-action rune-action--effect" disabled={selectedActions.effectDisabled} onClick={onActivateSelected} title={selectedActions.effectLabel}>
            <i aria-hidden="true">✦</i><span>Effet</span>
          </button>
          {selectedActions.attackVisible ? (
            <button className="rune-action rune-action--attack" disabled={selectedActions.attackDisabled} onClick={onAttackSelected}>
              <i aria-hidden="true">⚔</i><span>Attaquer</span>
            </button>
          ) : null}
          {selectedActions.postureVisible ? (
            <button className="rune-action rune-action--posture" disabled={selectedActions.postureDisabled} onClick={onChangeSelectedPosture}>
              <i aria-hidden="true">◈</i><span>{selectedActions.postureLabel}</span>
            </button>
          ) : null}
          <button className="rune-action-close" onClick={onClearSelected} aria-label="Fermer les actions">×</button>
        </div>
      ) : null}
      <button
        className="phase-seal-button"
        style={{ '--phase-seal-y': `${(boardMiddleY / size.height) * 100}%` } as React.CSSProperties}
        disabled={phaseAdvanceDisabled}
        onClick={onAdvancePhase}
        aria-label={phaseAdvanceDisabled ? 'Le sceau attend votre tour' : `Passer à l’étape suivante : ${phaseAdvanceLabel}`}
      >
        <small>{phaseAdvanceDisabled ? 'ATTENTE' : 'PHASE'}</small>
        <strong>{phaseAdvanceDisabled ? 'Adverse' : phaseAdvanceLabel}</strong>
      </button>
    </div>
  )
}
