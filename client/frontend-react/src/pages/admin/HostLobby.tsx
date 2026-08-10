import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { HubConnection } from '@microsoft/signalr'
import { Alert } from '@/components/Alert'
import { Avatar } from '@/components/Avatar'
import { KahootButton } from '@/components/KahootButton'
import { Logo } from '@/components/Logo'
import { SoundToggle } from '@/components/SoundToggle'
import { Spinner } from '@/components/Spinner'
import { api, ApiError } from '@/lib/api'
import { audioManager } from '@/lib/audioManager'
import { hostSession, type HostSession } from '@/lib/hostSession'
import { signalRManager } from '@/lib/signalr'
import type { PlayerJoinedEvent, PlayerAvatarUpdatedEvent } from '@/lib/types'

interface LobbyPlayer {
  playerId: string
  name: string
  teamName: string | null
  emoji: string
  color: string
}

const PENDING_AVATAR = { emoji: '❓', color: '#866ecb' }

export function HostLobby() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [host, setHost] = useState<HostSession | null>(null)
  const [players, setPlayers] = useState<LobbyPlayer[]>([])
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const playersRef = useRef<LobbyPlayer[]>([])
  playersRef.current = players

  const upsertPlayer = useCallback((player: LobbyPlayer) => {
    setPlayers((prev) => {
      const index = prev.findIndex((p) => p.playerId === player.playerId)
      if (index === -1) {
        return [...prev, player]
      }
      const next = [...prev]
      next[index] = { ...next[index], ...player }
      return next
    })
  }, [])

  useEffect(() => {
    const stored = hostSession.load()
    if (!stored || stored.sessionId !== sessionId) {
      navigate('/admin/dashboard', { replace: true })
      return
    }
    setHost(stored)
  }, [sessionId, navigate])

  useEffect(() => {
    if (!host) {
      return
    }
    audioManager.playMusic('lobby')
    return () => audioManager.stopMusic()
  }, [host])

  useEffect(() => {
    if (!host) {
      return
    }

    let connection: HubConnection | null = null
    let mounted = true

    void api
      .getParticipants(host.sessionId)
      .then((list) => {
        if (!mounted) {
          return
        }
        const initial = list.map((p) => ({
          playerId: p.playerId,
          name: p.playerName,
          teamName: p.teamName,
          ...PENDING_AVATAR,
        }))
        setPlayers(initial)
        playersRef.current = initial
      })
      .catch(() => undefined)

    signalRManager
      .getConnection()
      .then(async (conn) => {
        if (!mounted) {
          return
        }
        connection = conn
        await signalRManager.joinGameGroup(host.sessionId)

        conn.on('PlayerJoined', (event: PlayerJoinedEvent) => {
          if (event.sessionId === host.sessionId) {
            upsertPlayer({
              playerId: event.playerId,
              name: event.playerName,
              teamName: event.teamName,
              ...PENDING_AVATAR,
            })
          }
        })

        conn.on('PlayerAvatarUpdated', (event: PlayerAvatarUpdatedEvent) => {
          if (event.sessionId === host.sessionId) {
            upsertPlayer({
              playerId: event.playerId,
              name:
                playersRef.current.find((p) => p.playerId === event.playerId)?.name ?? 'Oyuncu',
              teamName:
                playersRef.current.find((p) => p.playerId === event.playerId)?.teamName ?? null,
              emoji: event.emoji,
              color: event.color,
            })
          }
        })
      })
      .catch(() => setError('Canlı sunucuya bağlanılamadı.'))

    return () => {
      mounted = false
      if (connection) {
        connection.off('PlayerJoined')
        connection.off('PlayerAvatarUpdated')
        void signalRManager.leaveGameGroup(host.sessionId)
      }
    }
  }, [host, upsertPlayer])

  async function handleStart() {
    if (!host) {
      return
    }
    setError('')
    setStarting(true)
    try {
      await api.startSession(host.sessionId)
      navigate(`/admin/host/${host.sessionId}/control`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        navigate(`/admin/host/${host.sessionId}/control`)
        return
      }
      setError(err instanceof ApiError ? err.message : 'Oyun başlatılamadı.')
    } finally {
      setStarting(false)
    }
  }

  if (!host) {
    return null
  }

  return (
    <div className="flex min-h-full flex-col bg-kahoot-purple">
      <header className="flex items-center justify-between gap-3 px-5 py-3">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <SoundToggle />
          <Link
            to="/admin/dashboard"
            className="rounded-2xl bg-white/10 px-4 py-2 font-bold uppercase tracking-wide text-white hover:bg-white/20"
          >
            ← Yönetim Paneli
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-8 px-4 pb-10 text-center">
        <Alert className="max-w-md">{error}</Alert>

        <div>
          <h2 className="text-2xl font-black uppercase tracking-wide text-white/85">
            {host.quizTitle}
          </h2>
          <p className="mt-1 text-white/70">Oyuncuların telefona girsin 👇</p>
        </div>

        <div className="rounded-[2.5rem] border-8 border-white/20 bg-white px-12 py-8 text-kahoot-purple shadow-2xl">
          <p className="text-2xl font-black uppercase tracking-[0.3em]">PIN</p>
          <p className="mt-2 text-7xl font-black tracking-[0.15em] sm:text-8xl">
            {host.pinCode}
          </p>
        </div>

        <div className="w-full">
          <p className="mb-4 text-lg font-black uppercase tracking-wide text-white/85">
            Katılan Oyuncular ({players.length})
          </p>
          {players.length === 0 ? (
            <div className="rounded-3xl bg-white/10 px-6 py-8">
              <p className="text-xl font-bold text-white/75">Henüz kimse katılmadı...</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
              {players.map((player) => (
                <div
                  key={player.playerId}
                  className="animate-pop-in flex flex-col items-center gap-1.5"
                >
                  <Avatar emoji={player.emoji} color={player.color} size="lg" />
                  <p className="max-w-full truncate text-sm font-bold">{player.name}</p>
                  {player.teamName ? (
                    <p className="text-xs font-bold text-kahoot-yellow">{player.teamName}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <KahootButton variant="green" size="lg" loading={starting} onClick={handleStart}>
          ▶️ Oyuna Başla
        </KahootButton>

        {players.length === 0 ? (
          <p className="flex items-center gap-2 text-white/70">
            <Spinner /> Oyuncular bekleniyor...
          </p>
        ) : null}
      </main>
    </div>
  )
}
