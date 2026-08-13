import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { HubConnection } from '@microsoft/signalr'
import { Alert } from '@/components/Alert'
import { CountdownBar } from '@/components/CountdownBar'
import { KahootButton } from '@/components/KahootButton'
import { Logo } from '@/components/Logo'
import { Modal } from '@/components/Modal'
import { OptionShape } from '@/components/OptionShape'
import { ScoreTable } from '@/components/ScoreTable'
import { SoundToggle } from '@/components/SoundToggle'
import { Spinner } from '@/components/Spinner'
import { api, ApiError } from '@/lib/api'
import { audioManager } from '@/lib/audioManager'
import { hostSession, type HostSession } from '@/lib/hostSession'
import { sortOptionsById } from '@/lib/options'
import { signalRManager } from '@/lib/signalr'
import type {
  AnswerSubmittedEvent,
  GameFinishedEvent,
  JokerUsedEvent,
  QuestionStartedEvent,
  ScoreboardDto,
  SessionQuestionDto,
} from '@/lib/types'

interface LiveAnswer {
  playerName: string
  isCorrect: boolean
  scoreEarned: number
}

const JOKER_LABELS: Record<string, string> = {
  FiftyFifty: '50/50',
  DoublePoints: 'Çift Puan',
  ExtraTime: '+15 sn',
}

export function HostControl() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [host, setHost] = useState<HostSession | null>(null)
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestionDto[]>([])
  const [status, setStatus] = useState<'Waiting' | 'InGame' | 'Finished'>('Waiting')
  const [questionOrderNo, setQuestionOrderNo] = useState(0)
  const [timeLimit, setTimeLimit] = useState(30)
  const [liveAnswers, setLiveAnswers] = useState<LiveAnswer[]>([])
  const [jokers, setJokers] = useState<string[]>([])
  const [scoreboard, setScoreboard] = useState<ScoreboardDto | null>(null)
  const [showScoreboard, setShowScoreboard] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const statusRef = useRef(status)
  statusRef.current = status
  const hostRef = useRef<HostSession | null>(null)
  hostRef.current = host

  const loadScoreboard = useCallback(async (sessionId: string) => {
    try {
      setScoreboard(await api.getScoreboard(sessionId))
    } catch {
      // yoksay
    }
  }, [])

  useEffect(() => {
    const stored = hostSession.load()
    if (!stored || stored.sessionId !== sessionId) {
      navigate('/admin/dashboard', { replace: true })
      return
    }
    setHost(stored)
    void api
      .getSessionQuestions(stored.sessionId)
      .then(setSessionQuestions)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : 'Oturum soruları yüklenemedi.',
        ),
      )
    void api
      .getSessionState(stored.sessionId)
      .then((state) => {
        setStatus(state.status)
        setQuestionOrderNo(state.currentQuestionOrderNo)
      })
      .catch(() => undefined)
    void loadScoreboard(stored.sessionId)
  }, [sessionId, navigate, loadScoreboard])

  useEffect(() => {
    if (status === 'InGame') {
      audioManager.playMusic('countdown')
    } else if (status === 'Finished') {
      audioManager.playMusic('victory')
    } else {
      audioManager.playMusic('lobby')
    }
    return () => audioManager.stopMusic()
  }, [status, questionOrderNo])

  useEffect(() => {
    if (status === 'InGame') {
      const question = sessionQuestions.find(
        (q) => q.orderNo === questionOrderNo,
      )
      if (question) {
        setTimeLimit(question.timeLimitInSeconds)
      }
    }
  }, [status, questionOrderNo, sessionQuestions])

  useEffect(() => {
    if (!host) {
      return
    }

    let connection: HubConnection | null = null
    let mounted = true

    signalRManager
      .getConnection()
      .then(async (conn) => {
        if (!mounted) {
          return
        }
        connection = conn
        await signalRManager.joinGameGroup(host.sessionId)

        conn.on('QuestionStarted', (event: QuestionStartedEvent) => {
          if (event.sessionId !== host.sessionId) {
            return
          }
          setStatus('InGame')
          setQuestionOrderNo(event.orderNo)
          setTimeLimit(event.timeLimitInSeconds)
          setLiveAnswers([])
          setJokers([])
        })

        conn.on('AnswerSubmitted', (event: AnswerSubmittedEvent) => {
          if (event.sessionId !== host.sessionId) {
            return
          }
          setLiveAnswers((prev) => [
            ...prev,
            {
              playerName: event.playerName,
              isCorrect: event.isCorrect,
              scoreEarned: event.scoreEarned,
            },
          ])
          void loadScoreboard(host.sessionId)
        })

        conn.on('JokerUsed', (event: JokerUsedEvent) => {
          if (event.sessionId === host.sessionId) {
            setJokers((prev) => [...prev, event.jokerType])
          }
        })

        conn.on('GameFinished', (event: GameFinishedEvent) => {
          if (event.sessionId === host.sessionId) {
            setStatus('Finished')
            void loadScoreboard(host.sessionId)
          }
        })
      })
      .catch(() => setError('Canlı sunucuya bağlanılamadı.'))

    return () => {
      mounted = false
      if (connection) {
        connection.off('QuestionStarted')
        connection.off('AnswerSubmitted')
        connection.off('JokerUsed')
        connection.off('GameFinished')
      }
    }
  }, [host, loadScoreboard])

  async function handleAdvance() {
    if (!host) {
      return
    }
    setError('')
    setMessage('')
    setBusy(true)
    try {
      if (statusRef.current === 'Waiting') {
        const state = await api.startSession(host.sessionId)
        setStatus('InGame')
        setQuestionOrderNo(state.currentQuestionOrderNo)
        setMessage('Oyun başladı!')
      } else {
        await api.nextQuestion(host.sessionId)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('İşlem başarısız.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleFinish() {
    if (!host) {
      return
    }
    setError('')
    setBusy(true)
    try {
      await api.finishSession(host.sessionId)
      setStatus('Finished')
      await loadScoreboard(host.sessionId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Oyun bitirilemedi.')
    } finally {
      setBusy(false)
    }
  }

  async function handleScoreboard() {
    if (!host) {
      return
    }
    setShowScoreboard((prev) => !prev)
    if (!showScoreboard) {
      await loadScoreboard(host.sessionId)
    }
  }

  if (!host) {
    return null
  }

  const currentQuestion =
    sessionQuestions.find((q) => q.orderNo === questionOrderNo) ?? null
  const currentQuestionOptions = currentQuestion
    ? sortOptionsById(currentQuestion.options)
    : []
  const correctOption = currentQuestion?.options.find((o) => o.isCorrect)
  const isLastQuestion =
    sessionQuestions.length > 0 &&
    questionOrderNo >= sessionQuestions.length

  return (
    <div className="flex min-h-full flex-col bg-kahoot-purple">
      <header className="flex items-center justify-between gap-3 px-5 py-3">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <SoundToggle />
          <Link
            to={`/admin/host/${host.sessionId}`}
            className="rounded-2xl bg-white/10 px-4 py-2 font-bold uppercase tracking-wide text-white hover:bg-white/20"
          >
            ← Lobi
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">{host.quizTitle}</h1>
            <p className="text-sm font-bold uppercase tracking-wide text-kahoot-yellow">
              PIN: {host.pinCode} ·{' '}
              {status === 'Waiting'
                ? 'Beklemede'
                : status === 'InGame'
                  ? 'Oynanıyor'
                  : 'Bitti'}
            </p>
          </div>
          <div className="flex gap-2">
            <KahootButton
              variant="green"
              size="sm"
              loading={busy}
              disabled={status === 'Finished'}
              onClick={handleAdvance}
            >
              {status === 'Waiting' ? '▶️ Oyunu Başlat' : '⏭️ Sonraki Soru'}
            </KahootButton>
            <KahootButton
              variant="red"
              size="sm"
              loading={busy}
              disabled={status === 'Finished'}
              onClick={handleFinish}
            >
              🏁 Oyunu Bitir
            </KahootButton>
            <KahootButton variant="white" size="sm" onClick={handleScoreboard}>
              🏆 Skor
            </KahootButton>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <KahootButton
            variant="ghost"
            size="sm"
            onClick={() => void api.downloadReport(host.sessionId, 'pdf')}
          >
            📄 Rapor (PDF)
          </KahootButton>
          <KahootButton
            variant="ghost"
            size="sm"
            onClick={() => void api.downloadReport(host.sessionId, 'excel')}
          >
            📊 Rapor (Excel)
          </KahootButton>
        </div>

        <Alert className="mb-4">{error}</Alert>
        <Alert variant="success" className="mb-4">
          {message}
        </Alert>

        {status === 'Finished' ? (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white/10 p-8 text-center">
              <h2 className="text-4xl font-black uppercase tracking-wide">
                🎉 Oyun Bitti!
              </h2>
              <p className="mt-2 text-white/75">
                Skorları görmek için “Skor” butonuna bas veya raporu indir.
              </p>
            </div>
            {scoreboard ? <ScoreTable scoreboard={scoreboard} /> : null}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl bg-white/10 p-5">
              {currentQuestion ? (
                <>
                  <div className="mb-3 flex items-center justify-between text-sm font-black uppercase tracking-wide text-white/80">
                    <span>
                      Soru {currentQuestion.orderNo}/{sessionQuestions.length}
                    </span>
                    <span className="text-kahoot-yellow">{currentQuestion.points} puan</span>
                  </div>
                  <div className="rounded-2xl bg-white p-5 text-center">
                    <p className="text-lg font-black leading-snug text-kahoot-purple md:text-2xl">
                      {currentQuestion.text}
                    </p>
                  </div>
                  <div className="mt-4">
                    <CountdownBar
                      duration={timeLimit}
                      running={status === 'InGame'}
                      onExpire={() => audioManager.stopMusic()}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                    {currentQuestionOptions.map((option, index) => (
                      <HostOptionCard
                        key={option.optionId}
                        index={index}
                        text={option.text}
                        isCorrect={option.isCorrect}
                      />
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-kahoot-green/20 p-4">
                    <p className="text-sm font-black uppercase tracking-wide text-kahoot-green">
                      ✅ Doğru Cevap
                    </p>
                    <p className="mt-1 font-bold text-white">
                      {correctOption?.text ?? 'Bilinmiyor'}
                    </p>
                  </div>
                  {isLastQuestion ? (
                    <p className="mt-3 font-bold text-kahoot-yellow">
                      Bu son soruydu — “Oyunu Bitir” ile skorları açıkla.
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="py-10 text-center">
                  {status === 'Waiting' ? (
                    <>
                      <Spinner label="Oyun başlamadı..." />
                      <p className="mt-2 text-white/70">
                        “Oyunu Başlat” butonuna basınca ilk soru burada görünecek.
                      </p>
                    </>
                  ) : (
                    <p className="text-white/70">Soru bilgisi yüklenemedi.</p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white/10 p-5">
              <h3 className="mb-3 text-lg font-black uppercase tracking-wide">
                📡 Canlı Cevaplar ({liveAnswers.length})
              </h3>
              {liveAnswers.length === 0 ? (
                <p className="text-white/70">Henüz cevap gelmedi.</p>
              ) : (
                <ul className="space-y-2">
                  {liveAnswers.map((answer, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-2.5"
                    >
                      <span className="flex items-center gap-2 font-bold">
                        <span>{answer.isCorrect ? '✅' : '❌'}</span>
                        {answer.playerName}
                      </span>
                      <span className="font-black text-kahoot-yellow">
                        {answer.isCorrect ? `+${answer.scoreEarned}` : '0'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="mb-3 mt-6 text-lg font-black uppercase tracking-wide">
                🪄 Kullanılan Jokerler ({jokers.length})
              </h3>
              {jokers.length === 0 ? (
                <p className="text-white/70">Henüz joker kullanılmadı.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {jokers.map((joker, index) => (
                    <span
                      key={index}
                      className="rounded-xl bg-kahoot-blue/30 px-3 py-1.5 font-bold"
                    >
                      {JOKER_LABELS[joker] ?? joker}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <Modal
        open={showScoreboard}
        title="Skor Tablosu"
        onClose={() => setShowScoreboard(false)}
        wide
      >
        {scoreboard ? (
          <ScoreTable scoreboard={scoreboard} variant="light" />
        ) : (
          <Spinner label="Skorlar yükleniyor..." />
        )}
      </Modal>
    </div>
  )
}

const HOST_OPTION_COLORS = [
  { bg: 'bg-kahoot-red', border: 'border-[#9a0f28]' },
  { bg: 'bg-kahoot-blue', border: 'border-[#0b3f85]' },
  { bg: 'bg-kahoot-yellow', border: 'border-[#8f6900]' },
  { bg: 'bg-kahoot-green', border: 'border-[#155506]' },
]

function HostOptionCard({
  index,
  text,
  isCorrect,
}: {
  index: number
  text: string
  isCorrect: boolean
}) {
  const color = HOST_OPTION_COLORS[index]

  return (
    <div
      className={[
        'relative flex min-h-24 items-center gap-3 rounded-3xl border-b-8 px-4 py-3 md:min-h-32',
        color.bg,
        color.border,
      ].join(' ')}
    >
      <OptionShape
        index={index}
        className="shrink-0 text-3xl text-white/90 drop-shadow-sm sm:text-4xl md:text-5xl"
      />
      <span className="flex-1 text-sm font-black leading-tight text-white drop-shadow sm:text-lg md:text-xl">
        {text}
      </span>
      {isCorrect ? (
        <span className="absolute right-3 top-2 text-2xl drop-shadow">✅</span>
      ) : null}
    </div>
  )
}
