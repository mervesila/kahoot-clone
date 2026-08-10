import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { Avatar } from '@/components/Avatar'
import { AvatarPicker } from '@/components/AvatarPicker'
import { KahootButton } from '@/components/KahootButton'
import { KahootInput } from '@/components/KahootInput'
import { Logo } from '@/components/Logo'
import { api, ApiError } from '@/lib/api'
import { DEFAULT_AVATAR } from '@/lib/avatars'
import type { Avatar as AvatarSelection } from '@/lib/avatars'
import { getClientId, playerSession } from '@/lib/playerSession'
import { signalRManager } from '@/lib/signalr'

export function PlayerEntry() {
  const navigate = useNavigate()
  const [pinCode, setPinCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [teamName, setTeamName] = useState('')
  const [avatar, setAvatar] = useState<AvatarSelection>(DEFAULT_AVATAR)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!/^\d{6}$/.test(pinCode.trim())) {
      setError('PIN kodu 6 haneli olmalıdır.')
      return
    }
    if (!nickname.trim()) {
      setError('Takma adını girmelisin.')
      return
    }

    setLoading(true)
    try {
      const result = await api.joinGame({
        pinCode: pinCode.trim(),
        registrationNumber: getClientId(),
        firstName: nickname.trim(),
        lastName: '',
        department: 'Oyuncu',
        teamName: teamName.trim() || null,
      })

      playerSession.save({
        sessionId: result.sessionId,
        pinCode: result.pinCode,
        quizTitle: result.quizTitle,
        playerId: result.playerId,
        playerName: result.playerName,
        isTeamMode: false,
        teamName: teamName.trim() || null,
        avatar,
      })

      await signalRManager.getConnection()
      await signalRManager.joinGameGroup(result.sessionId)
      await signalRManager
        .getConnection()
        .then((connection) =>
          connection.invoke('UpdatePlayerAvatar', result.sessionId, result.playerId, avatar.emoji, avatar.color),
        )

      navigate('/player/lobby')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 404
            ? 'Bu PIN ile aktif bir oyun bulunamadı. PIN kodu kontrol et.'
            : err.message,
        )
      } else {
        setError('Sunucuya bağlanılamadı. Lütfen tekrar dene.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-kahoot-purple px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <form
          onSubmit={handleJoin}
          className="animate-float-up space-y-5 rounded-3xl bg-white/10 p-6"
        >
          <div className="text-center">
            <Avatar emoji={avatar.emoji} color={avatar.color} size="xl" className="mx-auto" />
          </div>

          <KahootInput
            label="PIN Kodu"
            inputMode="numeric"
            maxLength={6}
            placeholder="6 haneli PIN"
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
          />

          <KahootInput
            label="Takma Adın (Nickname)"
            maxLength={40}
            placeholder="Örn: Kahraman"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />

          <KahootInput
            label="Takım Adı (isteğe bağlı)"
            maxLength={40}
            placeholder="Takım modunda doldurulur"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />

          <AvatarPicker value={avatar} onChange={setAvatar} />

          <Alert>{error}</Alert>

          <KahootButton type="submit" variant="red" size="lg" full loading={loading}>
            Oyuna Katıl 🚀
          </KahootButton>
        </form>
      </div>
    </div>
  )
}
