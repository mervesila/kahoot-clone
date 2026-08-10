import type {
  AuthResult,
  CategoryDto,
  CurrentQuestionDto,
  GameSessionDto,
  GameSessionStateDto,
  JoinGameSessionResult,
  QuizDetailDto,
  QuizDto,
  ScoreboardDto,
  SessionParticipantDto,
  SubmitAnswerResult,
} from './types'

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export const TOKEN_KEY = 'tki_admin_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  auth?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (options.auth !== false) {
    const token = getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    let message = `İstek başarısız (${response.status})`
    let errors: Record<string, string[]> | undefined

    try {
      const payload = await response.json()
      if (typeof payload?.message === 'string') {
        message = payload.message
      }
      errors = payload?.errors
    } catch {
      // JSON değilse varsayılan mesaj kullanılır
    }

    throw new ApiError(response.status, message, errors)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export interface CreateGameSessionRequest {
  quizId: string
  isTeamMode: boolean
}

export interface JoinGameSessionRequest {
  pinCode: string
  registrationNumber: string
  firstName: string
  lastName?: string
  department: string
  teamName?: string | null
}

export interface LoginRequest {
  registrationNumber: string
  password: string
}

export interface RegisterRequest {
  registrationNumber: string
  password: string
  firstName: string
  lastName: string
  department: string
}

export interface CreateQuizRequest {
  title: string
  description: string
  isActive?: boolean
}

export interface GenerateAiQuizRequest {
  title: string
  description: string
  categoryId: number
  topic: string
  questionCount?: number
  isTeamMode?: boolean
}

export interface CreateQuestionOption {
  text: string
  isCorrect: boolean
}

export interface CreateQuestionRequest {
  categoryId: number
  text: string
  targetRole?: string
  timeLimitInSeconds: number
  points: number
  options: CreateQuestionOption[]
}

export interface SubmitAnswerRequest {
  playerId: string
  questionId: string
  selectedOptionId: string
  responseTimeInSeconds: number
}

export const api = {
  // --- Auth ---
  login: (data: LoginRequest) =>
    request<AuthResult>('/api/auth/login', { method: 'POST', body: data }),
  register: (data: RegisterRequest) =>
    request<AuthResult>('/api/auth/register', { method: 'POST', body: data }),

  // --- Categories / Quizzes ---
  getCategories: () => request<CategoryDto[]>('/api/admin/categories'),
  getQuizzes: () => request<QuizDto[]>('/api/admin/quizzes'),
  getQuiz: (id: string) => request<QuizDetailDto>(`/api/admin/quizzes/${id}`),
  createQuiz: (data: CreateQuizRequest) =>
    request<{ id: string }>('/api/admin/quizzes', { method: 'POST', body: data }),
  deleteQuiz: (id: string) =>
    request<void>(`/api/admin/quizzes/${id}`, { method: 'DELETE' }),
  generateAiQuiz: (data: GenerateAiQuizRequest) =>
    request<{ id: string }>('/api/admin/quizzes/generate-ai', {
      method: 'POST',
      body: data,
    }),
  createQuestion: (data: CreateQuestionRequest) =>
    request<{ id: string }>('/api/admin/questions', { method: 'POST', body: data }),
  addQuestionToQuiz: (quizId: string, questionId: string) =>
    request<void>(`/api/admin/quizzes/${quizId}/questions/${questionId}`, {
      method: 'POST',
    }),

  // --- Game session (oyuncu) ---
  createGameSession: (data: CreateGameSessionRequest) =>
    request<GameSessionDto>('/api/player/game-sessions', {
      method: 'POST',
      body: data,
      auth: false,
    }),
  joinGame: (data: JoinGameSessionRequest) =>
    request<JoinGameSessionResult>('/api/player/game-sessions/join', {
      method: 'POST',
      body: data,
      auth: false,
    }),
  startSession: (id: string) =>
    request<GameSessionStateDto>(`/api/player/game-sessions/${id}/start`, {
      method: 'POST',
      auth: false,
    }),
  getSessionState: (id: string) =>
    request<GameSessionStateDto>(`/api/player/game-sessions/${id}/state`, {
      auth: false,
    }),
  nextQuestion: (id: string) =>
    request<GameSessionStateDto>(`/api/player/game-sessions/${id}/next-question`, {
      method: 'POST',
      auth: false,
    }),
  finishSession: (id: string) =>
    request<GameSessionStateDto>(`/api/player/game-sessions/${id}/finish`, {
      method: 'POST',
      auth: false,
    }),
  getQuestion: (id: string, playerId: string) =>
    request<CurrentQuestionDto>(
      `/api/player/game-sessions/${id}/question?playerId=${playerId}`,
      { auth: false },
    ),
  submitAnswer: (id: string, data: SubmitAnswerRequest) =>
    request<SubmitAnswerResult>(`/api/player/game-sessions/${id}/answers`, {
      method: 'POST',
      body: data,
      auth: false,
    }),
  useJoker: (id: string, playerId: string, questionId: string, jokerType: string) =>
    request<void>(`/api/player/game-sessions/${id}/jokers`, {
      method: 'POST',
      body: { playerId, questionId, jokerType },
      auth: false,
    }),
  getScoreboard: (id: string) =>
    request<ScoreboardDto>(`/api/player/game-sessions/${id}/scoreboard`, {
      auth: false,
    }),
  getParticipants: (id: string) =>
    request<SessionParticipantDto[]>(`/api/player/game-sessions/${id}/participants`, {
      auth: false,
    }),

  // --- Rapor ---
  getReport: (sessionId: string) =>
    request<unknown>(`/api/admin/game-sessions/${sessionId}/report`),
  downloadReport: async (sessionId: string, format: 'pdf' | 'excel') => {
    const token = getToken()
    const response = await fetch(
      `${API_BASE}/api/admin/game-sessions/${sessionId}/report/export?format=${format}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    )

    if (!response.ok) {
      throw new ApiError(response.status, 'Rapor indirilemedi.')
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download =
      format === 'pdf'
        ? `oyun-raporu-${sessionId}.pdf`
        : `oyun-raporu-${sessionId}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },
}
