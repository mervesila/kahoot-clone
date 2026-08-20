export interface GameSessionDto {
  id: string;
  quizId: string;
  pinCode: string;
  status: 'Waiting' | 'InGame' | 'Finished';
}

export interface JoinGameSessionResult {
  sessionId: string;
  pinCode: string;
  quizTitle: string;
  playerId: string;
  playerName: string;
  viaRelay?: boolean;
}

export interface GameSessionStateDto {
  id: string;
  status: 'Waiting' | 'InGame' | 'Finished';
  currentQuestionOrderNo: number;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface PlayerOptionDto {
  optionId: string;
  text: string;
}

export interface CurrentQuestionDto {
  answered: boolean;
  finished: boolean;
  questionId?: string | null;
  text: string;
  orderNo: number;
  totalQuestions: number;
  timeLimitInSeconds: number;
  points: number;
  options: PlayerOptionDto[];
  isCorrect?: boolean | null;
  scoreEarned?: number | null;
  correctOptionId?: string | null;
}

export interface SubmitAnswerResult {
  answerId: string;
  isCorrect: boolean;
  scoreEarned: number;
  correctOptionId: string;
  responseTimeInSeconds: number;
}

export interface AuthResult {
  userId: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  department: string;
  role: string;
  token: string;
  expiresAt: string;
}

export interface QuizDto {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  questionCount: number;
  categoryId: number | null;
  level: number;
  passScore: number;
  isDynamic: boolean;
  defaultTimeLimitInSeconds: number;
}

export interface CategoryDto {
  id: number;
  name: string;
  description?: string | null;
  questionCount: number;
  isActive: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string | null;
}

export interface QuestionOptionDto {
  optionId: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestionDto {
  questionId: string;
  text: string;
  orderNo: number;
  timeLimitInSeconds: number;
  points: number;
  categoryId: number;
  options: QuestionOptionDto[];
}

export interface SessionQuestionOptionDto {
  optionId: string;
  text: string;
  isCorrect: boolean;
}

export interface SessionQuestionDto {
  questionId: string;
  text: string;
  categoryName: string;
  orderNo: number;
  timeLimitInSeconds: number;
  points: number;
  options: SessionQuestionOptionDto[];
}

export interface QuizDetailDto {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  categoryId: number | null;
  level: number;
  passScore: number;
  isDynamic: boolean;
  defaultTimeLimitInSeconds: number;
  questions: QuizQuestionDto[];
}

export interface UpdateQuizRequest {
  title: string;
  description: string;
  isActive: boolean;
  categoryId: number | null;
  level: number;
  passScore: number;
  defaultTimeLimitInSeconds: number;
}

export interface CreateQuizRequest {
  title: string;
  description: string;
  isActive?: boolean;
  categoryId?: number | null;
  level?: number;
  passScore?: number;
  defaultTimeLimitInSeconds?: number;
}

export interface ScoreboardPlayerDto {
  playerId: string;
  playerName: string;
  teamName?: string | null;
  score: number;
  correctCount: number;
  totalAnswers: number;
}

export interface ScoreboardTeamDto {
  teamName: string;
  averageScore: number;
  totalScore: number;
  playerCount: number;
}

export interface ScoreboardDto {
  sessionId: string;
  quizTitle: string;
  individual: ScoreboardPlayerDto[];
  teams: ScoreboardTeamDto[];
}

export interface PlayerJoinedEvent {
  sessionId: string;
  playerId: string;
  playerName: string;
  teamName: string | null;
}

export interface RoomPlayersUpdatedEvent {
  sessionId: string;
  players: SessionParticipantDto[];
}

export interface GameStartedEvent {
  sessionId: string;
  firstQuestionOrderNo: number;
}

export interface QuestionStartedOption {
  optionId: string;
  text: string;
}

export interface QuestionStartedEvent {
  sessionId: string;
  orderNo: number;
  totalQuestions: number;
  timeLimitInSeconds: number;
  points: number;
  questionId?: string;
  text?: string;
  options?: QuestionStartedOption[];
}

export interface AnswerSubmittedEvent {
  sessionId: string;
  playerId: string;
  playerName: string;
  isCorrect: boolean;
  scoreEarned: number;
  newTotalScore: number;
}

export interface GameFinishedEvent {
  sessionId: string;
}

export interface PlayerAvatarUpdatedEvent {
  sessionId: string;
  playerId: string;
  emoji: string;
  color: string;
}

export interface SessionParticipantDto {
  playerId: string;
  playerName: string;
  teamName: string | null;
  avatarEmoji: string;
  avatarColor: string;
}

export interface QuestionPoolDto {
  categories: QuestionPoolCategoryDto[];
}

export interface QuestionPoolCategoryDto {
  name: string;
  questions: QuestionPoolQuestionDto[];
}

export interface QuestionPoolQuestionDto {
  text: string;
  options: string[];
  correctIndex: number;
}

// === Exam Types ===
export interface ExamStartResult {
  attemptId: string;
  totalQuestions: number;
  timeLimitPerQuestion: number;
  level: number;
  question: ExamQuestionDto;
}

export interface ExamQuestionDto {
  questionId: string;
  text: string;
  index: number;
  totalQuestions: number;
  timeLimitInSeconds: number;
  points: number;
  options: ExamOptionDto[];
}

export interface ExamOptionDto {
  optionId: string;
  text: string;
}

export interface SubmitExamAnswerRequest {
  questionIndex: number;
  selectedOptionId: string | null;
  timeSpentMs: number;
}

export interface SubmitExamAnswerResult {
  isCorrect: boolean;
  scoreEarned: number;
  correctOptionId: string;
  nextQuestionIndex: number; // -1 = finished
}

export interface ExamResultDto {
  attemptId: string;
  quizTitle: string;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  isPassed: boolean;
  passScore: number;
  totalQuestions: number;
  correctCount: number;
  status: string;
  startedAt: string;
  finishedAt: string | null;
}

export interface ExamQuestionResult {
  question: ExamQuestionDto;
  alreadyAnswered: boolean;
  selectedOptionId: string | null;
}

export interface ExamReportDto {
  quizId: string;
  quizTitle: string;
  totalParticipants: number;
  passedCount: number;
  failedCount: number;
  averageScore: number;
  passScore: number;
  leaderboard: LeaderboardEntryDto[];
  questionStats: QuestionStatDto[];
}

export interface LeaderboardEntryDto {
  userId: string;
  studentName: string;
  registrationNumber: string;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  isPassed: boolean;
  attemptCount: number;
  bestAttemptId: string;
}

export interface QuestionStatDto {
  questionId: string;
  questionText: string;
  totalAnswers: number;
  wrongCount: number;
  wrongPercentage: number;
}
