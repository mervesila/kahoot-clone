export type MusicTrack = 'lobby' | 'countdown' | 'victory'
export type SfxName = 'correct' | 'wrong' | 'tick'

const MUSIC_SRC: Record<MusicTrack, string> = {
  lobby: '/audio/lobby.m4a',
  countdown: '/audio/countdown.m4a',
  victory: '/audio/victory.m4a',
}

const SFX_SRC: Record<SfxName, string> = {
  correct: '/audio/correct.m4a',
  wrong: '/audio/wrong.m4a',
  tick: '/audio/tick.m4a',
}

const MUTE_KEY = 'tki_sound_muted'

class AudioManager {
  private music: HTMLAudioElement | null = null
  private desiredTrack: MusicTrack | null = null
  private unlocked = false
  private muted = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem(MUTE_KEY) === '1'
      this.registerUnlock()
    }
  }

  private registerUnlock() {
    const unlock = () => {
      this.unlocked = true
      if (this.desiredTrack && !this.muted) {
        void this.playMusic(this.desiredTrack)
      }
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('touchstart', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    window.addEventListener('touchstart', unlock)
  }

  isMuted(): boolean {
    return this.muted
  }

  setMuted(muted: boolean) {
    this.muted = muted
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    if (this.music) {
      this.music.muted = muted
      if (!muted && this.music.paused && this.desiredTrack) {
        void this.music.play().catch(() => {})
      }
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }

  playMusic(track: MusicTrack) {
    if (this.music && this.desiredTrack === track && !this.music.paused) {
      return
    }
    this.stopMusic()
    this.desiredTrack = track
    const el = new Audio(MUSIC_SRC[track])
    el.loop = true
    el.volume = track === 'countdown' ? 0.4 : 0.35
    el.muted = this.muted
    this.music = el
    if (this.unlocked || this.muted) {
      void el.play().catch(() => {})
    }
  }

  stopMusic() {
    if (this.music) {
      this.music.pause()
      this.music.src = ''
      this.music = null
    }
    this.desiredTrack = null
  }

  playSfx(name: SfxName) {
    if (this.muted || !this.unlocked) {
      return
    }
    const el = new Audio(SFX_SRC[name])
    el.volume = name === 'correct' ? 0.5 : 0.4
    void el.play().catch(() => {})
  }
}

export const audioManager = new AudioManager()
