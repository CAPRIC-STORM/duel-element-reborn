export type MusicScene = 'intro' | 'menu' | 'duel'
export type SfxCue = 'ui' | 'select' | 'draw' | 'summon' | 'discard' | 'damage' | 'destroy' | 'effect' | 'chain' | 'heal' | 'phase' | 'spirit'
export type AudioFlavor = { element?: string }

const cacheVersion = 'reborn-20261026-6'
const audioPath = (path: string) => `${path}?v=${cacheVersion}`

const music: Record<MusicScene, string> = {
  intro: audioPath('/audio/music/intro-duel-monsters.mp3'),
  menu: audioPath('/audio/music/luminescence.mp3'),
  duel: audioPath('/audio/music/battle-gym-leader.mp3'),
}

const musicGain: Record<MusicScene, number> = {
  intro: 1,
  menu: 1,
  duel: 0.84,
}

const sfx: Record<SfxCue, string[]> = {
  ui: ['/audio/olex/UI/UI_Click_1.wav', '/audio/olex/UI/UI_Click_2.wav'],
  select: ['/audio/olex/Cards/Select/GP_Select_1.wav', '/audio/olex/Cards/Select/GP_Select_2.wav', '/audio/olex/Cards/Select/GP_Select_3.wav'],
  draw: ['/audio/olex/Cards/Draw/GP_Draw_1.wav', '/audio/olex/Cards/Draw/GP_Draw_2.wav', '/audio/olex/Cards/Draw/GP_Draw_3.wav', '/audio/olex/Cards/Draw/GP_Draw_4.wav'],
  summon: ['/audio/olex/Cards/Play/GP_PutDown_1.wav', '/audio/olex/Cards/Play/GP_PutDown_2.wav', '/audio/olex/Cards/Play/GP_PutDown_3.wav', '/audio/olex/Cards/Play/GP_PutDown_4.wav'],
  discard: ['/audio/olex/Cards/Discard/GP_Discard_1.wav', '/audio/olex/Cards/Discard/GP_Discard_2.wav', '/audio/olex/Cards/Discard/GP_Discard_3.wav'],
  damage: ['/audio/olex/Damage/GP_Damage_2.wav', '/audio/olex/Damage/GP_Damage_5.wav', '/audio/olex/Damage/GP_Damage_8.wav'],
  destroy: ['/audio/olex/Damage/GP_Damage_11.wav'],
  effect: ['/audio/olex/Buff/GP_Attack_Up_2.wav', '/audio/olex/Buff/GP_Armor_Up_1.wav'],
  chain: ['/audio/olex/UI/UI_Select_1.wav', '/audio/olex/UI/UI_Select_3.wav'],
  heal: ['/audio/olex/Buff/GP_Heal_1.wav'],
  phase: ['/audio/sfx/phase-soft.wav'],
  spirit: ['/audio/sfx/spirit-awakening.wav'],
}

const cueGain: Record<SfxCue, number> = {
  ui: 0.42,
  select: 0.42,
  draw: 0.55,
  summon: 0.64,
  discard: 0.55,
  damage: 0.72,
  destroy: 0.82,
  effect: 0.58,
  chain: 0.54,
  heal: 0.58,
  phase: 0.28,
  spirit: 0.78,
}

const elementPitch: Record<string, number> = {
  fire: 1.08,
  water: 0.92,
  nature: 0.96,
  storm: 1.16,
  earth: 0.82,
  air: 1.12,
  telekinesis: 1.06,
  darkness: 0.76,
  light: 1.2,
  ice: 1.26,
  cosmic: 0.88,
  time: 0.84,
  'space-time': 0.9,
  creation: 1.04,
}

const elementAccent: Record<string, { source: string; gain: number; rate: number }> = {
  fire: { source: '/audio/olex/Damage/GP_Damage_5.wav', gain: 0.22, rate: 1.08 },
  water: { source: '/audio/olex/Buff/GP_Heal_1.wav', gain: 0.2, rate: 0.9 },
  nature: { source: '/audio/olex/Buff/GP_Armor_Up_1.wav', gain: 0.18, rate: 0.96 },
  storm: { source: '/audio/olex/Buff/GP_Attack_Up_2.wav', gain: 0.2, rate: 1.24 },
  earth: { source: '/audio/olex/Buff/GP_Armor_Up_1.wav', gain: 0.23, rate: 0.78 },
  air: { source: '/audio/olex/UI/UI_Select_3.wav', gain: 0.18, rate: 1.2 },
  telekinesis: { source: '/audio/olex/UI/UI_Select_1.wav', gain: 0.18, rate: 1.08 },
  darkness: { source: '/audio/olex/Debuff/GP_Attack_Down_2.wav', gain: 0.23, rate: 0.78 },
  light: { source: '/audio/olex/Buff/GP_Heal_1.wav', gain: 0.2, rate: 1.2 },
  ice: { source: '/audio/olex/UI/UI_Select_1.wav', gain: 0.2, rate: 1.34 },
  cosmic: { source: '/audio/olex/UI/UI_Select_3.wav', gain: 0.2, rate: 0.86 },
  time: { source: '/audio/olex/UI/UI_Select_1.wav', gain: 0.2, rate: 0.82 },
  'space-time': { source: '/audio/olex/UI/UI_Select_3.wav', gain: 0.2, rate: 0.9 },
  creation: { source: '/audio/olex/Buff/GP_Attack_Up_2.wav', gain: 0.19, rate: 1.02 },
}

class GameAudio {
  private currentMusic?: HTMLAudioElement
  private currentScene?: MusicScene
  private musicVolume = 0.26
  private sfxVolume = 0.42
  private fadeToken = 0
  private retiringMusic = new Set<HTMLAudioElement>()
  private lastVariant = new Map<SfxCue, number>()

  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    if (this.currentMusic && this.currentScene) this.currentMusic.volume = this.musicVolume * musicGain[this.currentScene]
  }

  setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
  }

  playMusic(scene: MusicScene) {
    if (this.currentScene === scene && this.currentMusic) {
      this.currentMusic.volume = this.musicVolume * musicGain[scene]
      void this.currentMusic.play().catch(() => undefined)
      return
    }

    for (const track of this.retiringMusic) {
      track.pause()
      track.currentTime = 0
    }
    this.retiringMusic.clear()

    const previous = this.currentMusic
    const previousScene = this.currentScene
    const next = new Audio(music[scene])
    next.loop = true
    next.preload = 'auto'
    next.volume = previous ? 0 : this.musicVolume * musicGain[scene]
    this.currentMusic = next
    this.currentScene = scene
    const token = ++this.fadeToken
    if (previous) this.retiringMusic.add(previous)

    void next.play().then(() => {
      const startedAt = performance.now()
      const duration = previous ? 760 : 420
      const fade = (now: number) => {
        if (token !== this.fadeToken) return
        const progress = Math.max(0, Math.min(1, (now - startedAt) / duration))
        next.volume = this.musicVolume * musicGain[scene] * progress
        if (previous) previous.volume = this.musicVolume * musicGain[previousScene ?? scene] * (1 - progress)
        if (progress < 1) requestAnimationFrame(fade)
        else if (previous) {
          previous.pause()
          previous.currentTime = 0
          this.retiringMusic.delete(previous)
        }
      }
      requestAnimationFrame(fade)
    }).catch(() => undefined)
  }

  stopMusic() {
    this.fadeToken += 1
    this.currentMusic?.pause()
    for (const track of this.retiringMusic) track.pause()
    this.retiringMusic.clear()
    this.currentMusic = undefined
    this.currentScene = undefined
  }

  play(cue: SfxCue, flavor: AudioFlavor = {}) {
    if (this.sfxVolume <= 0) return
    const variants = sfx[cue]
    const previous = this.lastVariant.get(cue) ?? -1
    let index = Math.floor(Math.random() * variants.length)
    if (variants.length > 1 && index === previous) index = (index + 1) % variants.length
    this.lastVariant.set(cue, index)
    const sound = new Audio(audioPath(variants[index]))
    sound.volume = Math.min(1, this.sfxVolume * cueGain[cue])
    const pitch = flavor.element ? elementPitch[flavor.element] ?? 1 : 1
    sound.playbackRate = pitch * (0.98 + Math.random() * 0.04)
    void sound.play().catch(() => undefined)

    const accent = flavor.element ? elementAccent[flavor.element] : undefined
    if (accent && ['summon', 'effect', 'chain', 'destroy'].includes(cue)) {
      window.setTimeout(() => {
        const layer = new Audio(audioPath(accent.source))
        layer.volume = Math.min(1, this.sfxVolume * accent.gain)
        layer.playbackRate = accent.rate
        void layer.play().catch(() => undefined)
      }, cue === 'summon' ? 90 : 35)
    }
  }
}

export const gameAudio = new GameAudio()
