import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { KahootButton } from '@/components/KahootButton'
import { KahootInput } from '@/components/KahootInput'
import { Logo } from '@/components/Logo'
import { Modal } from '@/components/Modal'
import { QuizBuilderModal } from '@/components/QuizBuilderModal'
import { Spinner } from '@/components/Spinner'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/context/auth'
import { hostSession } from '@/lib/hostSession'
import type { CategoryDto, QuizDetailDto, QuizDto } from '@/lib/types'

interface AiQuizForm {
  title: string
  description: string
  topic: string
  questionCount: string
  categoryId: number
}

export function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [quizzes, setQuizzes] = useState<QuizDto[] | null>(null)
  const [categories, setCategories] = useState<CategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderMode, setBuilderMode] = useState<'create' | 'edit'>('create')
  const [editQuiz, setEditQuiz] = useState<QuizDetailDto | null>(null)
  const [busyEditId, setBusyEditId] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [teamMode, setTeamMode] = useState(false)
  const [busyQuizId, setBusyQuizId] = useState<string | null>(null)

  const [aiQuiz, setAiQuiz] = useState<AiQuizForm>({
    title: '',
    description: '',
    topic: '',
    questionCount: '5',
    categoryId: 1,
  })
  const [topicError, setTopicError] = useState(false)
  const [aiTitleError, setAiTitleError] = useState('')
  const [apiErrors, setApiErrors] = useState<Record<string, string[]> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<QuizDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadQuizzes = useCallback(async () => {
    try {
      const data = await api.getQuizzes()
      setQuizzes(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Quizler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQuizzes()
    void api
      .getCategories()
      .then((data) => {
        setCategories(data)
        if (data.length > 0) {
          setAiQuiz((prev) =>
            data.some((c) => c.id === prev.categoryId)
              ? prev
              : { ...prev, categoryId: data[0].id },
          )
        }
      })
      .catch(() => setCategories([]))
  }, [loadQuizzes])

  async function handleStartGame(quiz: QuizDto) {
    setError('')
    setBusyQuizId(quiz.id)
    try {
      const session = await api.createGameSession({
        quizId: quiz.id,
        isTeamMode: teamMode,
      })
      hostSession.save({
        sessionId: session.id,
        quizId: quiz.id,
        pinCode: session.pinCode,
        quizTitle: quiz.title,
        isTeamMode: teamMode,
      })
      navigate(`/admin/host/${session.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Oyun başlatılamadı.')
    } finally {
      setBusyQuizId(null)
    }
  }

  function openBuilder(mode: 'create' | 'edit', quiz: QuizDetailDto | null = null) {
    setError('')
    setMessage('')
    setBuilderMode(mode)
    setEditQuiz(quiz)
    setBuilderOpen(true)
  }

  async function handleEditQuiz(quiz: QuizDto) {
    setError('')
    setMessage('')
    setBusyEditId(quiz.id)
    try {
      const detail = await api.getQuiz(quiz.id)
      openBuilder('edit', detail)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Quiz soruları yüklenemedi.')
    } finally {
      setBusyEditId(null)
    }
  }

  function handleBuilderSaved(message: string) {
    setMessage(message)
    setBuilderOpen(false)
    void loadQuizzes()
  }

  async function handleGenerateAiQuiz(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    setApiErrors(null)

    if (!aiQuiz.topic.trim()) {
      setTopicError(true)
      setError('Lütfen bir quiz konusu girin.')
      return
    }
    setTopicError(false)

    try {
      await api.generateAiQuiz({
        ...aiQuiz,
        title: aiQuiz.title || `${aiQuiz.topic} AI Quiz`,
        questionCount: Math.min(
          Math.max(parseInt(aiQuiz.questionCount, 10) || 1, 1),
          50,
        ),
      })
      setAiOpen(false)
      setAiQuiz({
        title: '',
        description: '',
        topic: '',
        questionCount: '5',
        categoryId: categories[0]?.id ?? 1,
      })
      setMessage('AI quiz oluşturuldu.')
      await loadQuizzes()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'AI quiz oluşturulamadı.')
      setApiErrors(err instanceof ApiError && err.errors ? err.errors : null)
      if (err instanceof ApiError) {
        const titleError = err.errors?.Title?.[0]
        if (titleError) {
          setAiTitleError(titleError)
          setAiQuiz((prev) => ({
            ...prev,
            title: prev.title || `${prev.topic} AI Quiz`,
          }))
        }
      }
    }
  }

  async function handleDeleteQuiz() {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    setMessage('')
    try {
      await api.deleteQuiz(deleteTarget.id)
      setQuizzes((prev) =>
        prev ? prev.filter((q) => q.id !== deleteTarget.id) : prev,
      )
      setDeleteTarget(null)
      setMessage('Quiz başarıyla silindi.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Quiz silinemedi.')
    } finally {
      setDeleting(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/admin', { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col bg-kahoot-purple">
      <header className="flex items-center justify-between px-5 py-3">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <span className="hidden font-bold text-white/85 sm:block">
            {user?.firstName} {user?.lastName}
          </span>
          <KahootButton variant="ghost" size="sm" onClick={handleLogout}>
            Çıkış
          </KahootButton>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black">📚 Quiz Yönetimi</h1>
          <div className="flex gap-2">
            <KahootButton
              variant="white"
              size="md"
              onClick={() => openBuilder('create')}
            >
              + Yeni Quiz
            </KahootButton>
            <KahootButton
              variant="yellow"
              size="md"
              onClick={() => {
                setError('')
                setMessage('')
                setTopicError(false)
                setAiTitleError('')
                setApiErrors(null)
                setAiOpen(true)
              }}
            >
              🤖 AI ile Üret
            </KahootButton>
          </div>
        </div>

        <label className="mb-6 flex w-fit cursor-pointer items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5 font-bold">
          <input
            type="checkbox"
            checked={teamMode}
            onChange={(e) => setTeamMode(e.target.checked)}
            className="h-5 w-5 accent-kahoot-yellow"
          />
          Takım Modu (yeni oyunlar için)
        </label>

        <Alert variant="success" className="mb-4">
          {message}
        </Alert>
        <Alert className="mb-4">{error}</Alert>

        {loading ? (
          <Spinner label="Quizler yükleniyor..." />
        ) : quizzes && quizzes.length === 0 ? (
          <div className="rounded-3xl bg-white/10 p-10 text-center">
            <p className="text-2xl font-black">Henüz quiz yok</p>
            <p className="mt-2 text-white/75">Yeni quiz oluştur veya AI ile soru üret.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes?.map((quiz) => (
              <div
                key={quiz.id}
                className="flex flex-col gap-3 rounded-3xl bg-white/10 p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-black leading-tight">{quiz.title}</h3>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={[
                        'rounded-full px-3 py-1 text-xs font-black uppercase',
                        quiz.isActive ? 'bg-kahoot-green' : 'bg-white/20',
                      ].join(' ')}
                    >
                      {quiz.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleEditQuiz(quiz)}
                      disabled={busyEditId === quiz.id}
                      title="Soruları düzenle / soru ekle"
                      aria-label={`Soruları düzenle: ${quiz.title}`}
                      className="grid h-9 w-9 place-items-center rounded-full bg-kahoot-yellow/25 text-base transition hover:bg-kahoot-yellow hover:text-kahoot-purple disabled:opacity-50"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(quiz)}
                      title="Quizi sil"
                      aria-label={`Quizi sil: ${quiz.title}`}
                      className="grid h-9 w-9 place-items-center rounded-full bg-kahoot-red/25 text-base transition hover:bg-kahoot-red hover:text-white"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {quiz.description ? (
                  <p className="line-clamp-2 text-sm text-white/75">{quiz.description}</p>
                ) : null}
                <p className="text-sm font-bold text-kahoot-yellow">
                  {quiz.questionCount} soru
                </p>
                <KahootButton
                  variant="red"
                  size="md"
                  full
                  loading={busyQuizId === quiz.id}
                  disabled={quiz.questionCount === 0}
                  onClick={() => void handleStartGame(quiz)}
                >
                  🚀 Oyunu Başlat
                </KahootButton>
              </div>
            ))}
          </div>
        )}
      </main>

      <QuizBuilderModal
        open={builderOpen}
        mode={builderMode}
        quiz={editQuiz}
        categories={categories}
        onClose={() => setBuilderOpen(false)}
        onSaved={handleBuilderSaved}
      />

      <Modal open={aiOpen} title="🤖 AI ile Quiz Üret" onClose={() => setAiOpen(false)} wide>
        <form onSubmit={handleGenerateAiQuiz} className="flex flex-col gap-4">
          <KahootInput
            label="Konu / Başlık"
            placeholder="Örn: Yangın Güvenliği, İlk Yardım..."
            value={aiQuiz.topic}
            error={topicError ? 'Lütfen bir quiz konusu girin' : undefined}
            onChange={(e) => {
              setAiQuiz({ ...aiQuiz, topic: e.target.value })
              if (topicError) setTopicError(false)
            }}
          />

          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-white/90">
                Kategori
              </span>
              <select
                value={aiQuiz.categoryId}
                onChange={(e) => setAiQuiz({ ...aiQuiz, categoryId: Number(e.target.value) })}
                className="w-full rounded-lg border-2 border-kahoot-purple/20 bg-white px-5 py-3.5 text-lg font-bold text-kahoot-purple outline-none focus:border-kahoot-yellow"
              >
                {categories.length === 0 ? (
                  <option value={0}>Kategori bulunamadı</option>
                ) : (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-white/90">
                Soru Sayısı
              </span>
              <input
                type="number"
                min="1"
                max="50"
                value={aiQuiz.questionCount}
                onChange={(e) =>
                  setAiQuiz({ ...aiQuiz, questionCount: e.target.value })
                }
                onBlur={() => {
                  const val = parseInt(aiQuiz.questionCount, 10)
                  if (Number.isNaN(val) || val < 1) {
                    setAiQuiz({ ...aiQuiz, questionCount: '5' })
                  } else if (val > 50) {
                    setAiQuiz({ ...aiQuiz, questionCount: '50' })
                  } else {
                    setAiQuiz({ ...aiQuiz, questionCount: String(val) })
                  }
                }}
                onFocus={(e) => e.target.select()}
                className="w-full rounded-lg border-2 border-kahoot-purple/20 bg-white px-5 py-3.5 text-lg font-bold text-kahoot-purple outline-none focus:border-kahoot-yellow"
              />
            </label>
          </div>

          <KahootInput
            label="Quiz Başlığı (isteğe bağlı)"
            placeholder="Boş bırakılırsa konu adı kullanılır"
            value={aiQuiz.title}
            error={aiTitleError || undefined}
            onChange={(e) => {
              setAiQuiz({ ...aiQuiz, title: e.target.value })
              if (aiTitleError) setAiTitleError('')
            }}
          />
          <KahootInput
            label="Açıklama (isteğe bağlı)"
            value={aiQuiz.description}
            onChange={(e) => setAiQuiz({ ...aiQuiz, description: e.target.value })}
          />
          <Alert>
            {error}
            {apiErrors && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {Object.entries(apiErrors).flatMap(([field, messages]) =>
                  messages.map((msg) => (
                    <li key={`${field}-${msg}`}>
                      <span className="font-bold">{field}:</span> {msg}
                    </li>
                  )),
                )}
              </ul>
            )}
          </Alert>
          <KahootButton type="submit" variant="yellow" size="lg" full>
            ✨ Üret ve Kaydet
          </KahootButton>
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        title="Quizi Sil"
        onClose={() => !deleting && setDeleteTarget(null)}
      >
        <p className="text-lg font-bold leading-snug">
          "<span className="text-kahoot-red">{deleteTarget?.title}</span>" quizini
          silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <KahootButton
            variant="white"
            size="md"
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
          >
            Vazgeç
          </KahootButton>
          <KahootButton
            variant="red"
            size="md"
            loading={deleting}
            onClick={() => void handleDeleteQuiz()}
          >
            Evet, Sil
          </KahootButton>
        </div>
      </Modal>
    </div>
  )
}
