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
  usedJokers?: string[];
  jokersEnabled?: boolean;
}

export interface SubmitAnswerResult {
  answerId: string;
  isCorrect: boolean;
  scoreEarned: number;
  correctOptionId: string;
  responseTimeInSeconds: number;
  usedJokers: string[];
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
  defaultTimeLimitInSeconds: number;
  jokersEnabled: boolean;
}

export interface CategoryDto {
  id: number;
  name: string;
  description?: string | null;
  questionCount: number;
  isActive: boolean;
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

export interface QuizDetailDto {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  categoryId: number | null;
  level: number;
  passScore: number;
  defaultTimeLimitInSeconds: number;
  jokersEnabled: boolean;
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
  jokersEnabled: boolean;
}

export interface CreateQuizRequest {
  title: string;
  description: string;
  isActive?: boolean;
  categoryId?: number | null;
  level?: number;
  passScore?: number;
  defaultTimeLimitInSeconds?: number;
  jokersEnabled?: boolean;
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
  isTeamMode: boolean;
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

export interface QuestionStartedEvent {
  sessionId: string;
  orderNo: number;
  totalQuestions: number;
  timeLimitInSeconds: number;
  points: number;
}

export interface AnswerSubmittedEvent {
  sessionId: string;
  playerId: string;
  playerName: string;
  isCorrect: boolean;
  scoreEarned: number;
  newTotalScore: number;
}

export interface JokerUsedEvent {
  sessionId: string;
  playerId: string;
  jokerType: 'FiftyFifty' | 'DoublePoints' | 'ExtraTime';
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
