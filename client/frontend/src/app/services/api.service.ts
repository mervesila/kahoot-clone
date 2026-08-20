import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  AuthResult,
  CategoryDto,
  CreateCategoryRequest,
  CreateQuizRequest,
  CurrentQuestionDto,
  ExamReportDto,
  ExamResultDto,
  ExamStartResult,
  ExamQuestionResult,
  GameSessionDto,
  GameSessionStateDto,
  JoinGameSessionResult,
  QuizDetailDto,
  QuizDto,
  ScoreboardDto,
  SessionParticipantDto,
  SessionQuestionDto,
  SubmitAnswerResult,
  SubmitExamAnswerRequest,
  SubmitExamAnswerResult,
  UpdateQuizRequest,
  QuestionPoolDto,
} from '../models/types';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export const TOKEN_KEY = 'token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export interface CreateGameSessionRequest {
  quizId: string;
}

export interface JoinGameSessionRequest {
  pinCode: string;
  registrationNumber: string;
  firstName: string;
  lastName?: string;
  department: string;
  teamName?: string | null;
  avatarEmoji?: string | null;
  avatarColor?: string | null;
  playerId?: string;
}

export interface LoginRequest {
  registrationNumber: string;
  password: string;
}

export interface RegisterRequest {
  registrationNumber: string;
  password: string;
  firstName: string;
  lastName: string;
  department: string;
}

export interface ImportQuestionPoolRequest {
  title: string;
  description?: string;
  categoryName: string;
  questionCount?: number;
}

export interface CreateQuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface CreateQuestionRequest {
  categoryId: number;
  text: string;
  targetRole?: string;
  timeLimitInSeconds: number;
  points: number;
  options: CreateQuestionOption[];
}

export interface SubmitAnswerRequest {
  playerId: string;
  questionId: string;
  selectedOptionId: string;
  responseTimeInSeconds: number;
}

@Injectable()
export class ApiService {
  private readonly base = environment.apiUrl.replace(/\/$/, '');

  constructor(private http: HttpClient) {}

  private headers(auth: boolean): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private toApiError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as { message?: string; errors?: Record<string, string[]> } | null;
      const message =
        typeof payload?.message === 'string' && payload.message
          ? payload.message
          : `İstek başarısız (${error.status})`;
      return new ApiError(error.status, message, payload?.errors);
    }
    return new ApiError(0, 'Sunucuya bağlanılamadı.');
  }

  private async get<T>(path: string, auth = true): Promise<T> {
    try {
      return await lastValueFrom(
        this.http.get<T>(`${this.base}${path}`, { headers: this.headers(auth) }),
      );
    } catch (e) {
      throw this.toApiError(e);
    }
  }

  private async post<T>(path: string, body?: unknown, auth = true): Promise<T> {
    try {
      return await lastValueFrom(
        this.http.post<T>(`${this.base}${path}`, body, {
          headers: this.headers(auth),
        }),
      );
    } catch (e) {
      throw this.toApiError(e);
    }
  }

  private async put<T>(path: string, body?: unknown, auth = true): Promise<T> {
    try {
      return await lastValueFrom(
        this.http.put<T>(`${this.base}${path}`, body, {
          headers: this.headers(auth),
        }),
      );
    } catch (e) {
      throw this.toApiError(e);
    }
  }

  private async delete<T>(path: string, auth = true): Promise<T> {
    try {
      return await lastValueFrom(
        this.http.delete<T>(`${this.base}${path}`, { headers: this.headers(auth) }),
      );
    } catch (e) {
      throw this.toApiError(e);
    }
  }

  // --- Auth ---
  login(data: LoginRequest): Promise<AuthResult> {
    return this.post<AuthResult>('/api/auth/login', data, false);
  }

  register(data: RegisterRequest): Promise<AuthResult> {
    return this.post<AuthResult>('/api/auth/register', data, false);
  }

  // --- Categories / Quizzes ---
  getCategories(): Promise<CategoryDto[]> {
    return this.get<CategoryDto[]>('/api/admin/categories');
  }

  createCategory(data: CreateCategoryRequest): Promise<{ id: number }> {
    return this.post<{ id: number }>('/api/admin/categories', data);
  }

  getQuizzes(): Promise<QuizDto[]> {
    return this.get<QuizDto[]>('/api/admin/quizzes');
  }

  getQuiz(id: string): Promise<QuizDetailDto> {
    return this.get<QuizDetailDto>(`/api/admin/quizzes/${id}`);
  }

  createQuiz(data: CreateQuizRequest): Promise<{ id: string }> {
    return this.post<{ id: string }>('/api/admin/quizzes', data);
  }

  updateQuiz(id: string, data: UpdateQuizRequest): Promise<void> {
    return this.put<void>(`/api/admin/quizzes/${id}`, data);
  }

  deleteQuiz(id: string): Promise<void> {
    return this.delete<void>(`/api/admin/quizzes/${id}`);
  }

  getQuestionPool(): Promise<QuestionPoolDto> {
    return this.get<QuestionPoolDto>('/api/admin/question-pool');
  }

  importQuestionPool(data: ImportQuestionPoolRequest): Promise<{ id: string }> {
    return this.post<{ id: string }>('/api/admin/question-pool/import', data);
  }

  createQuestion(data: CreateQuestionRequest): Promise<{ id: string }> {
    return this.post<{ id: string }>('/api/admin/questions', data);
  }

  updateQuestion(id: string, data: CreateQuestionRequest): Promise<void> {
    return this.put<void>(`/api/admin/questions/${id}`, data);
  }

  removeQuestionFromQuiz(quizId: string, questionId: string): Promise<void> {
    return this.delete<void>(`/api/admin/quizzes/${quizId}/questions/${questionId}`);
  }

  addQuestionToQuiz(quizId: string, questionId: string): Promise<void> {
    return this.post<void>(`/api/admin/quizzes/${quizId}/questions/${questionId}`);
  }

  // --- Exam (Bireysel Sınav) ---
  startExam(data: { studentName: string; registrationNumber: string; quizId: string }): Promise<ExamStartResult> {
    return this.post<ExamStartResult>('/api/exam/start', data, false);
  }

  startByLevel(data: { studentName: string; registrationNumber: string }): Promise<ExamStartResult> {
    return this.post<ExamStartResult>('/api/exam/start-by-level', data, false);
  }

  getExamQuestion(attemptId: string, index: number): Promise<ExamQuestionResult> {
    return this.get<ExamQuestionResult>(
      `/api/exam/${attemptId}/question?index=${index}`,
      false,
    );
  }

  submitExamAnswer(attemptId: string, data: SubmitExamAnswerRequest): Promise<SubmitExamAnswerResult> {
    return this.post<SubmitExamAnswerResult>(
      `/api/exam/${attemptId}/answer`,
      data,
      false,
    );
  }

  getExamResult(attemptId: string): Promise<ExamResultDto> {
    return this.get<ExamResultDto>(`/api/exam/${attemptId}/result`, false);
  }

  getExamReport(quizId: string): Promise<ExamReportDto> {
    return this.get<ExamReportDto>(`/api/admin/exam/${quizId}/report`);
  }

  toggleExamStatus(quizId: string): Promise<{ quizId: string; isActive: boolean }> {
    return this.post<{ quizId: string; isActive: boolean }>(`/api/exam/toggle-status/${quizId}`, undefined, false);
  }

  cleanupOldData(): Promise<{ deleted: number; answersDeleted: number }> {
    return this.post<{ deleted: number; answersDeleted: number }>('/api/admin/exam/cleanup-old-data', undefined);
  }

  // --- Rapor ---
  getSessionQuestions(sessionId: string): Promise<SessionQuestionDto[]> {
    return this.get<SessionQuestionDto[]>(
      `/api/admin/game-sessions/${sessionId}/questions`,
    );
  }

  getReport(sessionId: string): Promise<unknown> {
    return this.get<unknown>(`/api/admin/game-sessions/${sessionId}/report`);
  }

  async downloadReport(sessionId: string, format: 'pdf' | 'excel'): Promise<void> {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    try {
      const blob = await lastValueFrom(
        this.http.get(
          `${this.base}/api/admin/game-sessions/${sessionId}/report/export?format=${format}`,
          { responseType: 'blob', headers },
        ),
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        format === 'pdf' ? `oyun-raporu-${sessionId}.pdf` : `oyun-raporu-${sessionId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      throw new ApiError(e instanceof HttpErrorResponse ? e.status : 0, 'Rapor indirilemedi.');
    }
  }
}
