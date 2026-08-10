import { useEffect, useState, type FormEvent } from 'react'
import { Alert } from '@/components/Alert'
import { KahootButton } from '@/components/KahootButton'
import { KahootInput } from '@/components/KahootInput'
import { Modal } from '@/components/Modal'
import { api, ApiError } from '@/lib/api'
import type { CategoryDto, QuizDetailDto } from '@/lib/types'

const TIME_OPTIONS = [10, 20, 30, 60]
const OPTION_LETTERS = ['A', 'B', 'C', 'D']

interface BuilderOption {
  text: string
  isCorrect: boolean
}

interface BuilderQuestion {
  id: string
  text: string
  timeLimitInSeconds: number
  options: BuilderOption[]
  isExisting?: boolean
}

interface QuizBuilderModalProps {
  open: boolean
  mode: 'create' | 'edit'
  quiz?: QuizDetailDto | null
  categories: CategoryDto[]
  onClose: () => void
  onSaved: (message: string) => void
}

function emptyOptions(): BuilderOption[] {
  return OPTION_LETTERS.map((_, i) => ({ text: '', isCorrect: i === 0 }))
}

export function QuizBuilderModal({
  open,
  mode,
  quiz,
  categories,
  onClose,
  onSaved,
}: QuizBuilderModalProps) {
  const [step, setStep] = useState(mode === 'edit' ? 2 : 1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 0)
  const [questions, setQuestions] = useState<BuilderQuestion[]>([])
  const [questionText, setQuestionText] = useState('')
  const [timeLimit, setTimeLimit] = useState(30)
  const [options, setOptions] = useState<BuilderOption[]>(emptyOptions)
  const [titleError, setTitleError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setTitleError('')
    setSaving(false)
    setStep(mode === 'edit' ? 2 : 1)
    setTitle(mode === 'edit' ? (quiz?.title ?? '') : '')
    setDescription(mode === 'edit' ? (quiz?.description ?? '') : '')
    setCategoryId(categories[0]?.id ?? 0)
    setQuestions(
      mode === 'edit'
        ? (quiz?.questions ?? []).map((q) => ({
            id: q.questionId,
            text: q.text,
            timeLimitInSeconds: q.timeLimitInSeconds,
            options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
            isExisting: true,
          }))
        : [],
    )
    setQuestionText('')
    setTimeLimit(30)
    setOptions(emptyOptions())
  }, [open, mode, quiz, categories])

  function handleAddQuestion(event: FormEvent) {
    event.preventDefault()
    setError('')
    const trimmedText = questionText.trim()
    if (!trimmedText) {
      setError('Lütfen soru metnini girin.')
      return
    }
    if (options.some((o) => !o.text.trim())) {
      setError('Lütfen 4 seçeneğin tamamını doldurun.')
      return
    }
    if (options.filter((o) => o.isCorrect).length !== 1) {
      setError('Lütfen tam olarak 1 doğru cevabı işaretleyin.')
      return
    }
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: trimmedText,
        timeLimitInSeconds: timeLimit,
        options: options.map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
      },
    ])
    setQuestionText('')
    setOptions(emptyOptions())
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => !q.isExisting && q.id !== id))
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      const payload = {
        targetRole: 'All',
        points: 1000,
      }
      const newQuestions = questions.filter((q) => !q.isExisting)

      if (mode === 'create') {
        const { id: quizId } = await api.createQuiz({
          title: title.trim(),
          description: description.trim(),
        })
        for (const q of newQuestions) {
          const { id: questionId } = await api.createQuestion({
            categoryId,
            text: q.text,
            timeLimitInSeconds: q.timeLimitInSeconds,
            ...payload,
            options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
          })
          await api.addQuestionToQuiz(quizId, questionId)
        }
        onSaved(`"${title.trim()}" quizi ${newQuestions.length} soruyla kaydedildi.`)
      } else if (quiz) {
        for (const q of newQuestions) {
          const { id: questionId } = await api.createQuestion({
            categoryId,
            text: q.text,
            timeLimitInSeconds: q.timeLimitInSeconds,
            ...payload,
            options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
          })
          await api.addQuestionToQuiz(quiz.id, questionId)
        }
        onSaved(
          newQuestions.length > 0
            ? `"${quiz.title}" quizine ${newQuestions.length} soru eklendi.`
            : 'Değişiklik yapılmadı.',
        )
      }
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        const titleError = err.errors?.Title?.[0]
        if (titleError) {
          setTitleError(titleError)
          setError(titleError)
          if (mode === 'create') setStep(1)
        } else {
          setError(err.message)
        }
      } else {
        setError('Quiz kaydedilemedi.')
      }
    } finally {
      setSaving(false)
    }
  }

  const newCount = questions.filter((q) => !q.isExisting).length
  const existingCount = questions.length - newCount

  return (
    <Modal
      open={open}
      title={mode === 'edit' ? '✏️ Soruları Düzenle' : '➕ Yeni Quiz Oluştur'}
      onClose={onClose}
      wide
    >
      <div className="mb-4 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={[
              'rounded-full px-3 py-1 text-xs font-black uppercase',
              step >= s ? 'bg-kahoot-yellow text-kahoot-purple' : 'bg-kahoot-purple/10',
            ].join(' ')}
          >
            Adım {s}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <KahootInput
            label="Quiz Başlığı"
            placeholder="Örn: Genel Kültür Sınavı"
            value={title}
            error={titleError || undefined}
            onChange={(e) => {
              setTitle(e.target.value)
              if (titleError) setTitleError('')
            }}
          />
          <KahootInput
            label="Açıklama / Konu (isteğe bağlı)"
            placeholder="Örn: İSG Kuralları ve Güvenlik Önlemleri"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-white/90">
              Kategori
            </span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
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
          <div className="flex justify-end gap-3">
            <KahootButton variant="white" size="md" onClick={onClose}>
              Vazgeç
            </KahootButton>
            <KahootButton
              variant="green"
              size="md"
              disabled={!title.trim()}
              onClick={() => setStep(2)}
            >
              İleri ▶
            </KahootButton>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          {mode === 'edit' ? (
            <div className="rounded-2xl bg-kahoot-purple/5 p-4">
              <p className="text-lg font-black">{quiz?.title}</p>
              <p className="mt-1 text-sm text-white/80">
                {existingCount} mevcut soru · {newCount} yeni soru eklenecek
              </p>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-white/90">
                  Yeni sorular için kategori
                </span>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full rounded-lg border-2 border-kahoot-purple/20 bg-white px-4 py-2.5 font-bold text-kahoot-purple outline-none focus:border-kahoot-yellow"
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
            </div>
          ) : null}

          {questions.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-black uppercase tracking-wide text-white/90">
                Sorular ({questions.length})
              </p>
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className="flex items-start gap-3 rounded-2xl bg-white p-4 text-kahoot-purple"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-kahoot-purple text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-snug">{q.text}</p>
                    <p className="mt-1 text-xs font-bold text-white/70">
                      {q.timeLimitInSeconds} sn ·{' '}
                      {q.options.find((o) => o.isCorrect)?.text ?? '?'} ✓
                    </p>
                  </div>
                  {q.isExisting ? (
                    <span className="shrink-0 rounded-full bg-kahoot-green px-3 py-1 text-xs font-black text-white">
                      Mevcut
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      title="Soruyu kaldır"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-kahoot-red/15 transition hover:bg-kahoot-red hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={handleAddQuestion}
            className="space-y-3 rounded-2xl border-2 border-dashed border-kahoot-purple/25 p-4"
          >
            <p className="text-sm font-black uppercase tracking-wide text-white/90">
              ➕ Yeni Soru
            </p>
            <KahootInput
              label="Soru Metni"
              placeholder="Örn: Baretsiz şantiyeye girmek neden yasaktır?"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-white/90">
                Soru Süresi
              </span>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => setTimeLimit(seconds)}
                    className={[
                      'rounded-xl px-4 py-2 font-black transition',
                      timeLimit === seconds
                        ? 'bg-kahoot-yellow text-kahoot-purple'
                        : 'bg-white/10 text-white hover:bg-white/20',
                    ].join(' ')}
                  >
                    {seconds} sn
                  </button>
                ))}
              </div>
            </label>

            <div className="space-y-2">
              <p className="text-sm font-bold uppercase tracking-wide text-white/90">
                Seçenekler (doğru cevabı işaretleyin)
              </p>
              {options.map((option, i) => (
                <label
                  key={i}
                  className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2"
                >
                  <input
                    type="radio"
                    name="correct-option"
                    checked={option.isCorrect}
                    onChange={() =>
                      setOptions((prev) =>
                        prev.map((o, idx) => ({ ...o, isCorrect: idx === i })),
                      )
                    }
                    className="h-5 w-5 shrink-0 accent-kahoot-yellow"
                    aria-label={`Doğru cevap ${OPTION_LETTERS[i]}`}
                  />
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-kahoot-purple font-black text-white">
                    {OPTION_LETTERS[i]}
                  </span>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) =>
                      setOptions((prev) =>
                        prev.map((o, idx) =>
                          idx === i ? { ...o, text: e.target.value } : o,
                        ),
                      )
                    }
                    placeholder={`Seçenek ${OPTION_LETTERS[i]}`}
                    className="w-full rounded-lg border-2 border-kahoot-purple/15 px-3 py-2 font-bold text-kahoot-purple outline-none focus:border-kahoot-yellow"
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-end">
              <KahootButton type="submit" variant="purple" size="md">
                Soruyu Ekle
              </KahootButton>
            </div>
          </form>

          <div className="flex justify-between gap-3">
            {mode === 'create' ? (
              <KahootButton variant="white" size="md" onClick={() => setStep(1)}>
                ◀ Geri
              </KahootButton>
            ) : (
              <span />
            )}
            <KahootButton variant="green" size="md" onClick={() => setStep(3)}>
              Quizi Kaydet ▶
            </KahootButton>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-kahoot-purple/5 p-4">
            <p className="text-lg font-black">{mode === 'edit' ? quiz?.title : title}</p>
            <p className="mt-1 text-sm text-white/80">
              {mode === 'edit' ? quiz?.description : description || 'Açıklama yok'} · Kategori:{' '}
              {categories.find((c) => c.id === categoryId)?.name ?? '-'} ·{' '}
              {existingCount > 0 ? `${existingCount} mevcut + ` : ''}
              {newCount} soru
            </p>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className="flex items-start gap-3 rounded-2xl bg-white p-3 text-kahoot-purple"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-kahoot-purple text-xs font-black text-white">
                  {index + 1}
                </span>
                <p className="min-w-0 flex-1 text-sm font-bold leading-snug">{q.text}</p>
                {q.isExisting ? (
                  <span className="shrink-0 rounded-full bg-kahoot-green px-2 py-0.5 text-[10px] font-black text-white">
                    Mevcut
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          <Alert>{error}</Alert>
          <div className="flex justify-between gap-3">
            <KahootButton
              variant="white"
              size="md"
              onClick={() => setStep(2)}
              disabled={saving}
            >
              ◀ Geri
            </KahootButton>
            <KahootButton
              variant="red"
              size="md"
              loading={saving}
              onClick={() => void handleSave()}
            >
              💾 Quizi Kaydet
            </KahootButton>
          </div>
        </div>
      )}
    </Modal>
  )
}
