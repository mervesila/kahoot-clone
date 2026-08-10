import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { HubConnection } from '@microsoft/signalr'
import { Alert } from '@/components/Alert'
import { AnswerButton } from '@/components/AnswerButton'
import { CountdownBar } from '@/components/CountdownBar'
import { KahootButton } from '@/components/KahootButton'
import { Logo } from '@/components/Logo'
import { ScoreTable } from '@/components/ScoreTable'
import { SoundToggle } from '@/components/SoundToggle'
import { api, ApiError } from '@/lib/api'
import { audioManager } from '@/lib/audioManager'
import { sortOptionsById } from '@/lib/options'
import { playerSession, type PlayerSession } from '@/lib/playerSession'
import { signalRManager } from '@/lib/signalr'
import type {
  AnswerSubmittedEvent,
  CurrentQuestionDto,
  GameFinishedEvent,
  QuestionStartedEvent,
  ScoreboardDto,
  SubmitAnswerResult,
} from '@/lib/types'

type Phase = 'connecting' | 'waiting' | 'question' | 'answered' | 'finished'

const EXTRA_TIME_SECONDS = 15

export function PlayerGame() {
  const navigate = useNavigate()
  const [session, setSession] = useState<PlayerSession | null>(null)
  const [phase, setPhase] = useState<Phase>('connecting')
  const [question, setQuestion] = useState<CurrentQuestionDto | null>(null)
  const [result, setResult] = useState<SubmitAnswerResult | null>(null)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [usedJokers, setUsedJokers] = useState<string[]>([])
  const [duration, setDuration] = useState(30)
  const [questionStartedAt, setQuestionStartedAt] = useState(0)
  const [scoreboard, setScoreboard] = useState<ScoreboardDto | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState('')

  const phaseRef = useRef<Phase>('connecting')
  phaseRef.current = phase
  const sessionRef = useRef<PlayerSession | null>(null)
  sessionRef.current = session
  const questionStartedAtRef = useRef(0)
  questionStartedAtRef.current = questionStartedAt
  const durationRef = useRef(30)
  durationRef.current = duration
  const questionRef = useRef<CurrentQuestionDto | null>(null)
  questionRef.current = question
  const answeredRef = useRef(false)

  const loadScoreboard = useCallback(async (sessionId: string) => {
    try {
      const board = await api.getScoreboard(sessionId)
      setScoreboard(board)
    } catch {
      // skor tablosu alınamazsa sessizce geç
    }
  }, [])

  const restoreFromServer = useCallback(
    async (currentSession: PlayerSession) => {
      if (
        phaseRef.current === 'question' ||
        phaseRef.current === 'answered' ||
        phaseRef.current === 'finished'
      ) {
        return
      }
      try {
        const current = await api.getQuestion(currentSession.sessionId, currentSession.playerId)
        if (current.finished) {
          setPhase('finished')
          await loadScoreboard(currentSession.sessionId)
          return
        }
        if (current.questionId) {
          answeredRef.current = current.answered
          setQuestion(current)
          setDuration(current.timeLimitInSeconds)
          setQuestionStartedAt(Date.now())
          if (current.answered) {
            setResult({
              answerId: '',
              isCorrect: current.isCorrect ?? false,
              scoreEarned: current.scoreEarned ?? 0,
              correctOptionId: current.correctOptionId ?? '',
              responseTimeInSeconds: 0,
              usedJokers: [],
            })
            setPhase('answered')
          } else {
            setPhase('question')
          }
          await loadScoreboard(currentSession.sessionId)
        }
      } catch {
        if (phaseRef.current === 'connecting') {
          setPhase('waiting')
        }
      }
    },
    [loadScoreboard],
  )

  const startQuestion = useCallback(
    async (event: QuestionStartedEvent, currentSession: PlayerSession) => {
      answeredRef.current = false
      setResult(null)
      setSelectedOptionId(null)
      setTimedOut(false)
      setUsedJokers([])
      setDuration(event.timeLimitInSeconds)
      setQuestionStartedAt(Date.now())

      try {
        const fetched = await api.getQuestion(currentSession.sessionId, currentSession.playerId)
        if (fetched.finished) {
          setPhase('finished')
          await loadScoreboard(currentSession.sessionId)
          return
        }
        setQuestion(fetched)
        if (fetched.answered) {
          answeredRef.current = true
          setPhase('answered')
          setResult({
            answerId: '',
            isCorrect: fetched.isCorrect ?? false,
            scoreEarned: fetched.scoreEarned ?? 0,
            correctOptionId: fetched.correctOptionId ?? '',
            responseTimeInSeconds: 0,
            usedJokers: [],
          })
        } else {
          setPhase('question')
        }
        await loadScoreboard(currentSession.sessionId)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Soru alınamadı.')
      }
    },
    [loadScoreboard],
  )

  useEffect(() => {
    const stored = playerSession.load()
    if (!stored) {
      navigate('/player', { replace: true })
      return
    }
    setSession(stored)
  }, [navigate])

  useEffect(() => {
    if (phase === 'question') {
      audioManager.playMusic('countdown')
    } else if (phase === 'answered') {
      audioManager.stopMusic()
    } else if (phase === 'finished') {
      audioManager.playMusic('victory')
    } else {
      audioManager.playMusic('lobby')
    }
    return () => audioManager.stopMusic()
  }, [phase])

  useEffect(() => {
    if (!session) {
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
        await signalRManager.joinGameGroup(session.sessionId)

        conn.on('QuestionStarted', (event: QuestionStartedEvent) => {
          if (mounted && event.sessionId === session.sessionId) {
            void startQuestion(event, session)
          }
        })

        conn.on('GameStarted', () => {
          if (mounted) {
            void restoreFromServer(session)
          }
        })

        conn.on('AnswerSubmitted', (event: AnswerSubmittedEvent) => {
          if (mounted && event.sessionId === session.sessionId) {
            void loadScoreboard(session.sessionId)
          }
        })

        conn.on('GameFinished', (event: GameFinishedEvent) => {
          if (mounted && event.sessionId === session.sessionId) {
            setPhase('finished')
            void loadScoreboard(session.sessionId)
          }
        })

        await restoreFromServer(session)
      })
      .catch(() => setError('Canlı sunucuya bağlanılamadı.'))

    return () => {
      mounted = false
      if (connection) {
        connection.off('QuestionStarted')
        connection.off('GameStarted')
        connection.off('AnswerSubmitted')
        connection.off('GameFinished')
      }
    }
  }, [session, startQuestion, restoreFromServer, loadScoreboard, navigate])

  async function handleAnswer(optionId: string) {
    if (!session || phaseRef.current !== 'question' || answeredRef.current) {
      return
    }
    answeredRef.current = true
    setSelectedOptionId(optionId)

    const responseTime = Math.min(
      Math.round((Date.now() - questionStartedAtRef.current) / 1000),
      durationRef.current,
    )

    try {
      const answer = await api.submitAnswer(session.sessionId, {
        playerId: session.playerId,
        questionId: questionRef.current?.questionId ?? '',
        selectedOptionId: optionId,
        responseTimeInSeconds: responseTime,
      })
      setResult(answer)
      audioManager.playSfx(answer.isCorrect ? 'correct' : 'wrong')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cevap gönderilemedi.')
    } finally {
      setPhase('answered')
      await loadScoreboard(session.sessionId)
    }
  }

  async function handleJoker(jokerType: string) {
    if (!session || !questionRef.current || phaseRef.current !== 'question' || answeredRef.current) {
      return
    }
    if (usedJokers.includes(jokerType)) {
      return
    }

    try {
      await api.useJoker(session.sessionId, session.playerId, questionRef.current.questionId ?? '', jokerType)
      setUsedJokers((prev) => [...prev, jokerType])

      if (jokerType === 'ExtraTime') {
        setDuration((prev) => prev + EXTRA_TIME_SECONDS)
      }

      if (jokerType === 'FiftyFifty') {
        const refreshed = await api.getQuestion(session.sessionId, session.playerId)
        setQuestion(refreshed)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Joker kullanılamadı.')
    }
  }

  function handleTimeout() {
    if (phaseRef.current !== 'question' || answeredRef.current) {
      return
    }
    answeredRef.current = true
    setTimedOut(true)
    setPhase('answered')
  }

  function exit() {
    playerSession.clear()
    navigate('/', { replace: true })
  }

  if (!session) {
    return null
  }

  const myRank =
    scoreboard?.individual.findIndex((p) => p.playerId === session.playerId) ?? -1
  const myScore = scoreboard?.individual.find((p) => p.playerId === session.playerId)?.score ?? 0
  const questionOptions = question ? sortOptionsById(question.options) : []

  return (
    <div className="flex min-h-full flex-col bg-kahoot-purple">
      <header className="flex items-center justify-between gap-3 px-5 py-3">
        <Logo size="sm" />
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="font-black">{session.playerName}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-kahoot-yellow">
              Toplam: {myScore} puan
            </p>
          </div>
          <SoundToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 pb-8">
        {error ? <Alert className="mb-4">{error}</Alert> : null}

        {phase === 'connecting' || phase === 'waiting' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <span className="animate-bounce text-7xl">⏳</span>
            <h1 className="text-3xl font-black uppercase tracking-wide">
              Soru bekleniyor...
            </h1>
            <p className="text-white/75">
              Oyun sunucusu bir sonraki soruyu başlattığında burada görünecek.
            </p>
          </div>
        ) : null}

        {phase === 'question' && question ? (
          <div className="flex flex-1 flex-col gap-5">
            <div className="flex items-center justify-between text-sm font-black uppercase tracking-wide text-white/80">
              <span>
                Soru {question.orderNo}/{question.totalQuestions}
              </span>
              <span className="text-kahoot-yellow">{question.points} puan</span>
            </div>

            <div className="rounded-3xl bg-white p-6 text-center shadow-lg">
              <p className="text-xl font-black leading-snug text-kahoot-purple md:text-3xl">
                {question.text}
              </p>
            </div>

            <CountdownBar
              duration={duration}
              running
              onExpire={handleTimeout}
            />

            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
              {questionOptions.map((option, index) => (
                <AnswerButton
                  key={option.optionId}
                  index={index}
                  text={option.text}
                  onClick={() => void handleAnswer(option.optionId)}
                />
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <JokerButton
                label="50/50"
                emoji="🧨"
                used={usedJokers.includes('FiftyFifty')}
                onClick={() => void handleJoker('FiftyFifty')}
              />
              <JokerButton
                label="Çift Puan"
                emoji="✖️2"
                used={usedJokers.includes('DoublePoints')}
                onClick={() => void handleJoker('DoublePoints')}
              />
              <JokerButton
                label={`+${EXTRA_TIME_SECONDS} sn`}
                emoji="⏱️"
                used={usedJokers.includes('ExtraTime')}
                onClick={() => void handleJoker('ExtraTime')}
              />
            </div>
          </div>
        ) : null}

        {phase === 'answered' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            {timedOut || (!result?.isCorrect && selectedOptionId === null) ? (
              <div className="animate-pop-in rounded-3xl bg-kahoot-red px-10 py-8 shadow-lg">
                <p className="text-5xl font-black">⏰ Süre Doldu</p>
                <p className="mt-2 font-bold text-white/85">Bu soru için puan yok.</p>
              </div>
            ) : result?.isCorrect ? (
              <div className="animate-pop-in rounded-3xl bg-kahoot-green px-10 py-8 shadow-lg">
                <p className="text-5xl font-black">✅ Doğru!</p>
                <p className="mt-2 text-3xl font-black text-kahoot-yellow">+{result.scoreEarned}</p>
              </div>
            ) : (
              <div className="animate-pop-in rounded-3xl bg-kahoot-red px-10 py-8 shadow-lg">
                <p className="text-5xl font-black">❌ Yanlış!</p>
                <p className="mt-2 font-bold text-white/85">Bir sonraki soruda şansını dene!</p>
              </div>
            )}

            <div className="w-full max-w-md space-y-3">
              {question && selectedOptionId ? (
                <div className="grid grid-cols-2 gap-3">
                  {questionOptions.map((option, index) => (
                    <AnswerButton
                      key={option.optionId}
                      index={index}
                      text={option.text}
                      state={
                        option.optionId === question.correctOptionId
                          ? 'correct'
                          : option.optionId === selectedOptionId
                            ? 'wrong'
                            : 'muted'
                      }
                      disabled
                    />
                  ))}
                </div>
              ) : null}

              {scoreboard ? (
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="font-bold uppercase tracking-wide text-white/80">Sıralaman</p>
                  {myRank >= 0 ? (
                    <p className="mt-1 text-2xl font-black text-kahoot-yellow">
                      #{myRank + 1}
                      <span className="ml-2 text-base text-white/70">
                        ({scoreboard.individual.length} oyuncu arasında)
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-white/70">Henüz sıralamada değilsin.</p>
                  )}
                </div>
              ) : null}
            </div>

            <p className="animate-pulse font-bold text-white/70">
              Sonraki soru bekleniyor...
            </p>
          </div>
        ) : null}

        {phase === 'finished' ? (
          <div className="flex flex-1 flex-col items-center gap-6">
            <h1 className="animate-pop-in text-4xl font-black uppercase tracking-wide">
              🎉 Oyun Bitti!
            </h1>
            <div className="w-full max-w-2xl">
              {scoreboard ? (
                <ScoreTable scoreboard={scoreboard} highlightPlayerId={session.playerId} />
              ) : null}
            </div>
            <KahootButton variant="white" size="lg" onClick={exit}>
              Ana Menüye Dön
            </KahootButton>
          </div>
        ) : null}
      </main>
    </div>
  )
}

function JokerButton({
  label,
  emoji,
  used,
  onClick,
}: {
  label: string
  emoji: string
  used: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={used}
      className={[
        'flex items-center gap-2 rounded-2xl border-b-4 px-5 py-2.5 font-black uppercase tracking-wide transition-transform',
        used
          ? 'border-[#0b3f85] bg-kahoot-blue/40 text-white/50'
          : 'border-[#0b3f85] bg-kahoot-blue hover:-translate-y-0.5 text-white',
      ].join(' ')}
    >
      <span className="text-xl">{emoji}</span>
      {label}
    </button>
  )
}
