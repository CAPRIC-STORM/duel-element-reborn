import type { ElementId } from '@duel/game-core'

const runeSpriteNames: Record<ElementId, string> = {
  fire: 'Fire.webp',
  water: 'Water.webp',
  nature: 'Nature.webp',
  earth: 'Earth.webp',
  air: 'Wind.webp',
  telekinesis: 'Telekinesis.webp',
  darkness: 'Darkness.webp',
  light: 'Light.webp',
  ice: 'Ice.webp',
  cosmic: 'Cosmic.webp',
  time: 'Time.webp',
  'space-time': 'Space-time.webp',
  creation: 'Creation.webp',
  storm: 'Storm.webp',
  unknown: 'Unknown.webp',
}

export const runeSpriteUrl = (element: ElementId, concealed = false) => `/assets/runes/${concealed ? runeSpriteNames.unknown : runeSpriteNames[element]}`
