import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { HubConnection } from '@microsoft/signalr'
import { Avatar } from '@/components/Avatar'
import { Logo } from '@/components/Logo'
import { SoundToggle } from '@/components/SoundToggle'
import { api } from '@/lib/api'
import { audioManager } from '@/lib/audioManager'
import { playerSession, type PlayerSession } from '@/lib/playerSession'
import { signalRManager } from '@/lib/signalr'
import type { GameFinishedEvent, GameStartedEvent, QuestionStartedEvent } from '@/lib/types'

export function PlayerLobby() {
  const navigate = useNavigate()
  const [session, setSession] = useState<PlayerSession | null>(null)

  useEffect(() => {
    const stored = playerSession.load()
    if (!stored) {
      navigate('/player', { replace: true })
      return
    }
    setSession(stored)
  }, [navigate])

  useEffect(() => {
    if (!session) {
      return
    }
    audioManager.playMusic('lobby')
    return () => audioManager.stopMusic()
  }, [session])

  useEffect(() => {
    let connection: HubConnection | null = null
    let mounted = true
    let pollId: ReturnType<typeof setInterval> | undefined

    const goToGame = () => {
      if (mounted) {
        navigate('/player/game')
      }
    }

    const checkState = async () => {
      const current = playerSession.load()
      if (!current) {
        return
      }
      try {
        const state = await api.getSessionState(current.sessionId)
        if (state.status === 'InGame' || state.status === 'Finished') {
          goToGame()
        }
      } catch {
        // durum alınamazsa beklemeye devam edilir
      }
    }

    signalRManager
      .getConnection()
      .then(async (conn) => {
        if (!mounted) {
          return
        }
        connection = conn

        conn.on('GameStarted', (_event: GameStartedEvent) => goToGame())
        conn.on('QuestionStarted', (_event: QuestionStartedEvent) => goToGame())
        conn.on('GameFinished', (event: GameFinishedEvent) => {
          if (mounted && playerSession.load()?.sessionId === event.sessionId) {
            goToGame()
          }
        })
      })
      .catch(() => {
        // Bağlantı kurulamazsa kullanıcı lobide kalır
      })

    void checkState()
    pollId = setInterval(() => void checkState(), 3000)

    return () => {
      mounted = false
      if (pollId) {
        clearInterval(pollId)
      }
      if (connection) {
        connection.off('GameStarted')
        connection.off('QuestionStarted')
        connection.off('GameFinished')
      }
    }
  }, [navigate])

  if (!session) {
    return null
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center gap-8 bg-kahoot-purple px-6">
      <SoundToggle className="absolute right-4 top-4" />
      <Logo />

      <div className="animate-pop-in text-center">
        <Avatar emoji={session.avatar.emoji} color={session.avatar.color} size="xl" className="mx-auto" />
        <h1 className="mt-4 text-3xl font-black">{session.playerName}</h1>
        {session.teamName ? (
          <p className="mt-1 font-bold uppercase tracking-wide text-kahoot-yellow">
            Takım: {session.teamName}
          </p>
        ) : null}
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black uppercase tracking-wide">
          Diğer oyuncular bekleniyor...
        </h2>
        <p className="mt-2 text-white/75">
          “{session.quizTitle}” oyunu için {session.pinCode} PIN kodunu kullandın.
        </p>
      </div>

      <div className="flex gap-2 text-4xl">
        <span className="animate-bounce delay-0">🎈</span>
        <span className="animate-bounce [animation-delay:150ms]">🎈</span>
        <span className="animate-bounce [animation-delay:300ms]">🎈</span>
      </div>
    </div>
  )
}
