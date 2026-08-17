import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  ApiError,
  ApiService,
  type JoinGameSessionRequest,
  type LoginRequest,
  type RegisterRequest,
  type SubmitAnswerRequest,
} from './api.service';
import type {
  AuthResult,
  CategoryDto,
  CreateCategoryRequest,
  CreateQuizRequest,
  CurrentQuestionDto,
  GameSessionDto,
  GameSessionStateDto,
  JoinGameSessionResult,
  QuestionPoolDto,
  QuizDetailDto,
  QuizDto,
  QuizQuestionDto,
  ScoreboardDto,
  SessionParticipantDto,
  SessionQuestionDto,
  SubmitAnswerResult,
  UpdateQuizRequest,
} from '../models/types';
import { DEFAULT_AVATAR } from '../data/avatars';
import { GameHubService } from './game-hub.service';
import { RelayService, type RelayMessage } from './relay.service';

const uid = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const demoCategories: CategoryDto[] = [
  { id: 1, name: 'İSG', description: 'İş sağlığı ve güvenliği soru havuzu: İSG kuralları, riskler ve koruyucu önlemler', questionCount: 50, isActive: true },
];

interface DemoQuiz extends QuizDto {}

interface DemoQuestionSpec {
  text: string;
  options: { text: string; isCorrect: boolean }[];
}

interface AnswerRecord {
  sessionId: string;
  playerId: string;
  playerName: string;
  questionId: string;
  selectedOptionId: string;
  responseTimeInSeconds: number;
  isCorrect: boolean;
  scoreEarned: number;
  correctOptionId: string;
  usedJokers: string[];
}

const questionPool: Record<string, DemoQuestionSpec[]> = {
  'İSG': [
    {
      text: 'Aşağıdakilerden hangisi iş sağlığı ve güvenliği kapsamında alınması gereken temel önlemlerden biridir?',
      options: [
        { text: 'Kişisel koruyucu donanım kullanmak', isCorrect: true },
        { text: 'Çalışma süresini uzatmak', isCorrect: false },
        { text: 'Riskleri raporlamadan çalışmak', isCorrect: false },
        { text: 'Temizlik kurallarını göz ardı etmek', isCorrect: false },
      ],
    },
    {
      text: 'Yüksekte güvenli çalışma eşiği olarak kabul edilen yükseklik kaç metredir?',
      options: [
        { text: '1 metre', isCorrect: false },
        { text: '2 metre', isCorrect: true },
        { text: '3 metre', isCorrect: false },
        { text: '5 metre', isCorrect: false },
      ],
    },
    {
      text: 'Yangın anında ilk yapılması gereken doğru davranış hangisidir?',
      options: [
        { text: 'Yangını izleyip beklemek', isCorrect: false },
        { text: 'Eşyaları toplamaya çalışmak', isCorrect: false },
        { text: 'Alarm vererek binayı tahliye etmek', isCorrect: true },
        { text: 'Asansörle çıkmak', isCorrect: false },
      ],
    },
    {
      text: 'Makine ve ekipmanlarda bulunan güvenlik kilitlerinin amacı nedir?',
      options: [
        { text: 'Kazara çalışmayı önlemek', isCorrect: true },
        { text: 'Üretimi hızlandırmak', isCorrect: false },
        { text: 'Enerji tüketimini artırmak', isCorrect: false },
        { text: 'Bakım süresini kısaltmak', isCorrect: false },
      ],
    },
    {
      text: 'Acil durum toplanma alanlarının temel amacı nedir?',
      options: [
        { text: 'Güvenli alanda personeli toplamak ve sayım yapmak', isCorrect: true },
        { text: 'Malzemeleri depolamak', isCorrect: false },
        { text: 'Araçları park etmek', isCorrect: false },
        { text: 'Yemek molası vermek', isCorrect: false },
      ],
    },
    {
      text: 'Elektrikli ekipmanlarda periyodik kontrolün amacı nedir?',
      options: [
        { text: 'Güvenli çalışmayı sürdürmek', isCorrect: true },
        { text: 'Enerji faturasını artırmak', isCorrect: false },
        { text: 'Cihazların görünümünü yenilemek', isCorrect: false },
        { text: 'Dokümantasyonu kısaltmak', isCorrect: false },
      ],
    },
    {
      text: 'Kimyasal madde depolarken uyulması gereken temel kural nedir?',
      options: [
        { text: 'Uyumsuz kimyasalları ayrı depolamak', isCorrect: true },
        { text: 'Tüm kimyasalları tek rafta tutmak', isCorrect: false },
        { text: 'Etiketleri çıkarmak', isCorrect: false },
        { text: 'Gıda ile birlikte depolamak', isCorrect: false },
      ],
    },
    {
      text: 'İş kazası bildiriminde ilk yapılması gereken nedir?',
      options: [
        { text: 'İlk yardım ve güvenlik önlemlerini uygulamak', isCorrect: true },
        { text: 'Kazanın fotoğrafını sosyal medyada paylaşmak', isCorrect: false },
        { text: 'Olay yerini terk etmek', isCorrect: false },
        { text: 'Raporu bir hafta sonra yazmak', isCorrect: false },
      ],
    },
    {
      text: 'Çalışanlara verilen İSG eğitimlerinin temel amacı nedir?',
      options: [
        { text: 'Tehlikeleri tanımalarını ve önlem almalarını sağlamak', isCorrect: true },
        { text: 'Yalnızca yasal zorunluluğu yerine getirmek', isCorrect: false },
        { text: 'Mesai saatlerini doldurmak', isCorrect: false },
        { text: 'Kurum kârlılığını artırmak', isCorrect: false },
      ],
    },
    {
      text: 'İş ekipmanlarının periyodik bakımının yapılmaması neye yol açabilir?',
      options: [
        { text: 'Kazalara ve arızalara', isCorrect: true },
        { text: 'Üretim hızının artmasına', isCorrect: false },
        { text: 'Enerji tasarrufuna', isCorrect: false },
        { text: 'Çalışma süresinin kısalmasına', isCorrect: false },
      ],
    },
  ],
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function poolForCategory(categoryId: number | null): DemoQuestionSpec[] {
  const name = demoCategories.find((c) => c.id === categoryId)?.name ?? '';
  return questionPool[name] ?? questionPool['İSG'];
}

function drawQuestions(categoryId: number | null, count: number): DemoQuestionSpec[] {
  const pool = poolForCategory(categoryId);
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

function toQuizQuestion(spec: DemoQuestionSpec, orderNo: number): QuizQuestionDto {
  return {
    questionId: uid(`soru`),
    text: spec.text,
    orderNo,
    timeLimitInSeconds: 30,
    points: 1000,
    categoryId: 1,
    options: spec.options.map((opt) => ({
      optionId: uid(`secenek`),
      text: opt.text,
      isCorrect: opt.isCorrect,
    })),
  };
}

function toSessionQuestion(spec: DemoQuestionSpec, orderNo: number, categoryName: string): SessionQuestionDto {
  return {
    questionId: uid(`soru`),
    text: spec.text,
    categoryName,
    orderNo,
    timeLimitInSeconds: 30,
    points: 1000,
    options: spec.options.map((opt) => ({
      optionId: uid(`secenek`),
      text: opt.text,
      isCorrect: opt.isCorrect,
    })),
  };
}

const demoQuizzes: DemoQuiz[] = [
  {
    id: 'q-isg-1',
    title: 'İSG Seviye 1',
    description: '50 soruluk İSG havuzundan her oturumda rastgele 10 soru ile dinamik olarak uygulanan seviye 1 sınavı.',
    isActive: true,
    questionCount: 50,
    categoryId: 1,
    level: 1,
    passScore: 70,
    isDynamic: true,
    defaultTimeLimitInSeconds: 30,
    jokersEnabled: true,
  },
  {
    id: 'q-isg-2',
    title: 'İSG Seviye 2',
    description: 'Seviye 1\'de en az %70 puan alanların katılabildiği, kalan havuzdan rastgele 10 soru ile uygulanan seviye 2 sınavı.',
    isActive: true,
    questionCount: 50,
    categoryId: 1,
    level: 2,
    passScore: 70,
    isDynamic: true,
    defaultTimeLimitInSeconds: 30,
    jokersEnabled: true,
  },
];

@Injectable()
export class MockApiService extends ApiService {
  private readonly categories: CategoryDto[] = structuredClone(demoCategories);
  private readonly quizzes: DemoQuiz[] = structuredClone(demoQuizzes);
  private readonly sessions = new Map<string, { quizId: string; quizTitle: string; pinCode: string; isTeamMode: boolean }>();
  private readonly sessionQuestionsMap = new Map<string, SessionQuestionDto[]>();
  private readonly sessionStates = new Map<string, GameSessionStateDto>();
  private readonly answers = new Map<string, AnswerRecord>();
  private readonly jokerUsages = new Map<string, Set<string>>();
  private sessionCounter = 0;

  private static readonly SESSIONS_KEY = 'tki_demo_sessions';
  private static readonly STATES_KEY = 'tki_demo_states';

  private readonly relay = inject(RelayService);
  private readonly hub = inject(GameHubService);
  private readonly relayDisconnects: Array<() => void> = [];

  constructor() {
    super(inject(HttpClient));
    this.loadPersisted();
    for (const [id, session] of this.sessions) {
      this.relayDisconnects.push(
        this.relay.connect(session.pinCode, true, (msg) => this.handleRelayMessage(id, session.pinCode, msg)),
      );
    }
  }

  private handleRelayMessage(sessionId: string, pinCode: string, msg: RelayMessage): void {
    if (msg.type === 'request') {
      if (msg.pinCode === pinCode) {
        const session = this.sessions.get(sessionId);
        if (session) {
          this.announce(sessionId, session, true);
        }
      }
      return;
    }
    if (msg.type === 'answer' && msg.sessionId === sessionId) {
      this.hub.answerSubmitted$.next({
        sessionId: msg.sessionId,
        playerId: msg.playerId,
        playerName: msg.playerName,
        isCorrect: msg.isCorrect,
        scoreEarned: msg.scoreEarned,
        newTotalScore: msg.newTotalScore,
      });
      return;
    }
    if (msg.type === 'joker' && msg.sessionId === sessionId) {
      this.hub.jokerUsed$.next({
        sessionId: msg.sessionId,
        playerId: msg.playerId,
        jokerType: msg.jokerType as 'FiftyFifty' | 'DoublePoints' | 'ExtraTime',
      });
      return;
    }
    if (msg.type !== 'join' || msg.sessionId !== sessionId) {
      return;
    }
    const state = this.sessionStates.get(sessionId);
    if (state && state.status === 'Finished') {
      void this.relay.publish(pinCode, {
        type: 'reject',
        sessionId,
        playerName: msg.playerName,
        message: 'Bu sınav oturumu sona erdi.',
      });
      return;
    }
    const participants = this.loadParticipants(sessionId);
    const normalized = msg.playerName.toLocaleLowerCase('tr-TR');
    if (participants.some((p) => p.playerName.toLocaleLowerCase('tr-TR') === normalized)) {
      void this.relay.publish(pinCode, {
        type: 'reject',
        sessionId,
        playerName: msg.playerName,
        message: 'Bu isim zaten lobide kullanılıyor.',
      });
      return;
    }
    participants.push({
      playerId: msg.playerId,
      playerName: msg.playerName,
      teamName: msg.teamName,
      avatarEmoji: msg.avatarEmoji,
      avatarColor: msg.avatarColor,
    });
    this.saveParticipants(sessionId, participants);
    void this.relay.publish(pinCode, {
      type: 'accept',
      sessionId,
      playerName: msg.playerName,
    });
  }

  private readonly lastAnnounceAt = new Map<string, number>();

  private announce(
    sessionId: string,
    session: { quizId: string; quizTitle: string; pinCode: string; isTeamMode: boolean },
    force = false,
  ): void {
    const now = Date.now();
    const last = this.lastAnnounceAt.get(sessionId) ?? 0;
    if (!force && now - last < 15000) {
      return;
    }
    this.lastAnnounceAt.set(sessionId, now);
    void this.relay.publish(session.pinCode, {
      type: 'announce',
      sessionId,
      quizTitle: session.quizTitle,
      pinCode: session.pinCode,
    });
  }

  private loadPersisted(): void {
    try {
      const rawSessions = localStorage.getItem(MockApiService.SESSIONS_KEY);
      if (rawSessions) {
        const entries: Array<{ id: string; quizId: string; quizTitle: string; pinCode: string; isTeamMode: boolean }> =
          JSON.parse(rawSessions);
        for (const entry of entries) {
          this.sessions.set(entry.id, entry);
        }
      }
    } catch {
      // depolama yoksa temiz başlanır
    }
    this.loadStates();
  }

  private persist(): void {
    try {
      localStorage.setItem(
        MockApiService.SESSIONS_KEY,
        JSON.stringify([...this.sessions.entries()].map(([id, session]) => ({ id, ...session }))),
      );
      localStorage.setItem(MockApiService.STATES_KEY, JSON.stringify([...this.sessionStates.values()]));
    } catch {
      // depolama dolu olabilir; görmezden gelinir
    }
  }

  private loadStates(): void {
    this.sessionStates.clear();
    try {
      const raw = localStorage.getItem(MockApiService.STATES_KEY);
      if (raw) {
        const entries = JSON.parse(raw) as GameSessionStateDto[];
        for (const entry of entries) {
          this.sessionStates.set(entry.id, entry);
        }
      }
    } catch {
      // temiz başlangıç
    }
  }

  private participantsKey(sessionId: string): string {
    return `tki_demo_participants_${sessionId}`;
  }

  private answerKey(sessionId: string, playerId: string, questionId: string): string {
    return `${sessionId}__${playerId}__${questionId}`;
  }

  private jokerKey(sessionId: string, playerId: string, questionId: string): string {
    return `${sessionId}__${playerId}__${questionId}`;
  }

  private getPlayerName(sessionId: string, playerId: string): string {
    const participants = this.loadParticipants(sessionId);
    return participants.find((p) => p.playerId === playerId)?.playerName ?? 'Oyuncu';
  }

  private calculatePlayerScore(sessionId: string, playerId: string): number {
    let total = 0;
    for (const [key, answer] of this.answers) {
      if (key.startsWith(sessionId) && key.includes(playerId)) {
        total += answer.scoreEarned;
      }
    }
    return total;
  }

  private loadParticipants(sessionId: string): SessionParticipantDto[] {
    try {
      const raw = localStorage.getItem(this.participantsKey(sessionId));
      const parsed = raw ? (JSON.parse(raw) as SessionParticipantDto[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveParticipants(sessionId: string, participants: SessionParticipantDto[]): void {
    try {
      localStorage.setItem(this.participantsKey(sessionId), JSON.stringify(participants));
    } catch {
      // yok say
    }
  }

  // --- Auth (demo: herhangi bir giriş başarılı) ---
  override async login(_data: LoginRequest): Promise<AuthResult> {
    return this.demoUser();
  }

  override async register(_data: RegisterRequest): Promise<AuthResult> {
    return this.demoUser();
  }

  // --- Categories ---
  override async getCategories(): Promise<CategoryDto[]> {
    return this.categories.map((c) => ({ ...c }));
  }

  override async createCategory(data: CreateCategoryRequest): Promise<{ id: number }> {
    const id = Math.max(...this.categories.map((c) => c.id), 0) + 1;
    this.categories.push({ id, name: data.name, description: data.description, questionCount: 0, isActive: true });
    return { id };
  }

  // --- Quizzes ---
  override async getQuizzes(): Promise<QuizDto[]> {
    return this.quizzes.map((quiz) => ({ ...quiz }));
  }

  override async getQuiz(id: string): Promise<QuizDetailDto> {
    const quiz = this.quizzes.find((q) => q.id === id);
    if (!quiz) {
      throw new Error('Sınav bulunamadı.');
    }
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      isActive: quiz.isActive,
      categoryId: quiz.categoryId,
      level: quiz.level,
      passScore: quiz.passScore,
      isDynamic: quiz.isDynamic,
      defaultTimeLimitInSeconds: quiz.defaultTimeLimitInSeconds,
      jokersEnabled: quiz.jokersEnabled,
      questions: drawQuestions(quiz.categoryId, 10).map((spec, index) =>
        toQuizQuestion(spec, index + 1),
      ),
    };
  }

  override async createQuiz(data: CreateQuizRequest): Promise<{ id: string }> {
    const id = uid('quiz');
    this.quizzes.unshift({
      id,
      title: data.title,
      description: data.description,
      isActive: data.isActive ?? true,
      questionCount: 10,
      categoryId: data.categoryId ?? null,
      level: data.level ?? 1,
      passScore: data.passScore ?? 70,
      isDynamic: true,
      defaultTimeLimitInSeconds: data.defaultTimeLimitInSeconds ?? 30,
      jokersEnabled: data.jokersEnabled ?? true,
    });
    return { id };
  }

  override async updateQuiz(id: string, data: UpdateQuizRequest): Promise<void> {
    const quiz = this.quizzes.find((q) => q.id === id);
    if (quiz) {
      Object.assign(quiz, data);
    }
  }

  override async deleteQuiz(id: string): Promise<void> {
    const index = this.quizzes.findIndex((q) => q.id === id);
    if (index !== -1) {
      this.quizzes.splice(index, 1);
    }
  }

  // --- Question pool ---
  override async getQuestionPool(): Promise<QuestionPoolDto> {
    return {
      categories: Object.entries(questionPool).map(([name, questions]) => ({
        name,
        questions: questions.map((q) => ({
          text: q.text,
          options: q.options.map((o) => o.text),
          correctIndex: q.options.findIndex((o) => o.isCorrect),
        })),
      })),
    };
  }

  private generatePinCode(): string {
    const used = new Set([...this.sessions.values()].map((s) => s.pinCode));
    for (let i = 0; i < 50; i++) {
      const length = Math.random() < 0.5 ? 4 : 6;
      let digits = '';
      for (let j = 0; j < length; j++) {
        digits += Math.floor(Math.random() * 10);
      }
      if (!used.has(digits)) {
        return digits;
      }
    }
    return String(Date.now()).slice(-6);
  }

  // --- Oturum akışı (canlı) ---
  override async createGameSession(data: { quizId: string; isTeamMode: boolean }): Promise<GameSessionDto> {
    this.sessionCounter += 1;
    const quiz = this.quizzes.find((q) => q.id === data.quizId);
    const id = `demo-session-${Date.now().toString(36)}${this.sessionCounter}`;
    const pinCode = this.generatePinCode();
    const quizTitle = quiz?.title ?? 'Demo Sınav';
    const categoryId = quiz?.categoryId ?? null;
    const categoryName = this.categories.find((c) => c.id === categoryId)?.name ?? 'İSG';
    const drawn = drawQuestions(categoryId, 10);
    this.sessionQuestionsMap.set(
      id,
      drawn.map((spec, index) => toSessionQuestion(spec, index + 1, categoryName)),
    );
    this.sessions.set(id, { quizId: data.quizId, quizTitle, pinCode, isTeamMode: data.isTeamMode });
    this.sessionStates.set(id, { id, status: 'Waiting', currentQuestionOrderNo: 0, startedAt: null, finishedAt: null });
    this.persist();
    this.relayDisconnects.push(
      this.relay.connect(pinCode, true, (msg) => this.handleRelayMessage(id, pinCode, msg)),
    );
    this.announce(id, { quizId: data.quizId, quizTitle, pinCode, isTeamMode: data.isTeamMode });
    return { id, quizId: data.quizId, pinCode, status: 'Waiting' };
  }

  override async startSession(id: string): Promise<GameSessionStateDto> {
    const state = this.sessionStates.get(id);
    if (state) {
      state.status = 'InGame';
      state.currentQuestionOrderNo = 1;
      state.startedAt = new Date().toISOString();
      this.persist();
    }
    const session = this.sessions.get(id);
    if (session) {
      this.announce(id, session);
      void this.relay.publish(session.pinCode, {
        type: 'state',
        sessionId: id,
        status: 'InGame',
        currentQuestionOrderNo: state?.currentQuestionOrderNo ?? 1,
      });
    }
    return this.getSessionState(id);
  }

  override async nextQuestion(id: string): Promise<GameSessionStateDto> {
    const state = this.sessionStates.get(id);
    const questions = this.sessionQuestionsMap.get(id);
    if (state && state.status === 'InGame' && questions && questions.length > 0) {
      const maxOrderNo = questions[questions.length - 1].orderNo;
      if (state.currentQuestionOrderNo < maxOrderNo) {
        state.currentQuestionOrderNo += 1;
      }
      this.persist();
    }
    const session = this.sessions.get(id);
    if (session && state) {
      void this.relay.publish(session.pinCode, {
        type: 'state',
        sessionId: id,
        status: state.status,
        currentQuestionOrderNo: state.currentQuestionOrderNo,
      });
    }
    return this.getSessionState(id);
  }

  override async finishSession(id: string): Promise<GameSessionStateDto> {
    const state = this.sessionStates.get(id);
    if (state) {
      state.status = 'Finished';
      state.finishedAt = new Date().toISOString();
      this.persist();
    }
    const session = this.sessions.get(id);
    if (session) {
      void this.relay.publish(session.pinCode, {
        type: 'state',
        sessionId: id,
        status: 'Finished',
        currentQuestionOrderNo: state?.currentQuestionOrderNo ?? 0,
      });
    }
    return this.getSessionState(id);
  }

  override async getSessionState(id: string): Promise<GameSessionStateDto> {
    this.loadStates();
    const local = this.sessionStates.get(id);
    if (local) {
      return local;
    }
    const remote = this.relay.getRemoteState(id);
    if (remote) {
      return {
        id,
        status: remote.status,
        currentQuestionOrderNo: remote.currentQuestionOrderNo,
        startedAt: null,
        finishedAt: null,
      };
    }
    return { id, status: 'Waiting', currentQuestionOrderNo: 0, startedAt: null, finishedAt: null };
  }

  override async getSessionQuestions(sessionId: string): Promise<SessionQuestionDto[]> {
    const stored = this.sessionQuestionsMap.get(sessionId);
    const questions =
      stored ??
      drawQuestions(null, 10).map((spec, index) => toSessionQuestion(spec, index + 1, 'İSG'));
    return questions.map((q) => ({
      ...q,
      options: q.options.map((o) => ({ ...o })),
    }));
  }

  override async joinGame(data: JoinGameSessionRequest): Promise<JoinGameSessionResult> {
    let sessionId: string | null = null;
    let session: { quizId: string; quizTitle: string; pinCode: string; isTeamMode: boolean } | null = null;
    for (const [id, candidate] of this.sessions) {
      if (candidate.pinCode === data.pinCode) {
        sessionId = id;
        session = candidate;
        break;
      }
    }

    const playerName = [data.firstName, data.lastName].filter((v) => v?.trim()).join(' ').trim();
    if (!playerName) {
      throw new ApiError(400, 'Ad Soyad bilgisi zorunludur.');
    }

    if (sessionId && session) {
      const state = this.sessionStates.get(sessionId);
      if (state && state.status === 'Finished') {
        throw new ApiError(400, 'Bu sınav oturumu sona erdi.');
      }

      const participants = this.loadParticipants(sessionId);
      const normalized = playerName.toLocaleLowerCase('tr-TR');
      if (participants.some((p) => p.playerName.toLocaleLowerCase('tr-TR') === normalized)) {
        throw new ApiError(409, 'Bu isim zaten lobide kullanılıyor.');
      }

      const playerId = data.playerId ?? uid('oyuncu');
      participants.push({
        playerId,
        playerName,
        teamName: data.teamName?.trim() || null,
        avatarEmoji: data.avatarEmoji?.trim() || DEFAULT_AVATAR.emoji,
        avatarColor: data.avatarColor?.trim() || DEFAULT_AVATAR.color,
      });
      this.saveParticipants(sessionId, participants);

      return {
        sessionId,
        pinCode: session.pinCode,
        quizTitle: session.quizTitle,
        playerId,
        playerName,
      };
    }

    // Cihazlar arası katılım: oturum bu cihazda yoksa röle üzerinden
    // host tarafından duyurulan oturuma katılınır.
    const announced = this.relay.getAnnounced(data.pinCode);
    if (!announced) {
      throw new ApiError(404, 'Bu PIN ile aktif bir sınav bulunamadı.');
    }

    const playerId = data.playerId ?? uid('oyuncu');
    void this.relay.publish(data.pinCode, {
      type: 'join',
      sessionId: announced.sessionId,
      playerId,
      playerName,
      teamName: data.teamName?.trim() || null,
      avatarEmoji: data.avatarEmoji?.trim() || DEFAULT_AVATAR.emoji,
      avatarColor: data.avatarColor?.trim() || DEFAULT_AVATAR.color,
    });

    return {
      sessionId: announced.sessionId,
      pinCode: data.pinCode,
      quizTitle: announced.quizTitle,
      playerId,
      playerName,
      viaRelay: true,
    };
  }

  override async getParticipants(sessionId: string): Promise<SessionParticipantDto[]> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.announce(sessionId, session);
    }
    return this.loadParticipants(sessionId).map((p) => ({ ...p }));
  }

  // --- Oyuncu cevap/joker akışı (demo modu) ---

  override async getQuestion(id: string, playerId: string): Promise<CurrentQuestionDto> {
    const state = this.sessionStates.get(id);
    const questions = this.sessionQuestionsMap.get(id);
    if (!state || !questions || questions.length === 0) {
      throw new ApiError(404, 'Oturum bulunamadı.');
    }
    const question = questions.find((q) => q.orderNo === state.currentQuestionOrderNo);
    if (!question) {
      throw new ApiError(404, 'Aktif soru bulunamadı.');
    }
    const aKey = this.answerKey(id, playerId, question.questionId);
    const answer = this.answers.get(aKey);
    const jKey = this.jokerKey(id, playerId, question.questionId);
    const usedJokers = [...(this.jokerUsages.get(jKey) ?? [])];

    let options = question.options.map((o) => ({ optionId: o.optionId, text: o.text }));
    if (usedJokers.includes('FiftyFifty') && !answer) {
      const correct = question.options.find((o) => o.isCorrect)!;
      const wrongs = question.options.filter((o) => !o.isCorrect);
      const keptWrong = wrongs[Math.floor(Math.random() * wrongs.length)];
      options = [
        { optionId: correct.optionId, text: correct.text },
        { optionId: keptWrong.optionId, text: keptWrong.text },
      ];
    }

    const result: CurrentQuestionDto = {
      answered: !!answer,
      finished: false,
      questionId: question.questionId,
      text: question.text,
      orderNo: state.currentQuestionOrderNo,
      totalQuestions: questions.length,
      timeLimitInSeconds: question.timeLimitInSeconds,
      points: question.points,
      options,
      jokersEnabled: true,
    };
    if (answer) {
      result.isCorrect = answer.isCorrect;
      result.scoreEarned = answer.scoreEarned;
      result.correctOptionId = answer.correctOptionId;
      result.usedJokers = answer.usedJokers;
    }
    return result;
  }

  override async submitAnswer(id: string, data: SubmitAnswerRequest): Promise<SubmitAnswerResult> {
    const questions = this.sessionQuestionsMap.get(id);
    const question = questions?.find((q) => q.questionId === data.questionId);
    if (!question) {
      throw new ApiError(404, 'Soru bulunamadı.');
    }
    const correctOption = question.options.find((o) => o.isCorrect);
    if (!correctOption) {
      throw new ApiError(500, 'Doğru cevap bulunamadı.');
    }
    const selectedOption = question.options.find((o) => o.optionId === data.selectedOptionId);
    if (!selectedOption) {
      throw new ApiError(400, 'Geçersiz seçenek.');
    }
    const aKey = this.answerKey(id, data.playerId, data.questionId);
    if (this.answers.has(aKey)) {
      throw new ApiError(400, 'Bu soruya zaten cevap verildi.');
    }

    const isCorrect = selectedOption.isCorrect;
    const jKey = this.jokerKey(id, data.playerId, data.questionId);
    const usedJokers = [...(this.jokerUsages.get(jKey) ?? [])];

    let scoreEarned = 0;
    if (isCorrect) {
      let timeLimit = question.timeLimitInSeconds;
      if (usedJokers.includes('ExtraTime')) {
        timeLimit += 15;
      }
      const effectiveTime = Math.min(Math.max(data.responseTimeInSeconds, 0), timeLimit);
      const timeFactor = 1.0 - (effectiveTime / timeLimit) * 0.5;
      scoreEarned = Math.round(question.points * timeFactor);
      if (usedJokers.includes('DoublePoints')) {
        scoreEarned *= 2;
      }
      scoreEarned = Math.max(0, scoreEarned);
    }

    const playerName = this.getPlayerName(id, data.playerId);
    const record: AnswerRecord = {
      sessionId: id,
      playerId: data.playerId,
      playerName,
      questionId: data.questionId,
      selectedOptionId: data.selectedOptionId,
      responseTimeInSeconds: data.responseTimeInSeconds,
      isCorrect,
      scoreEarned,
      correctOptionId: correctOption.optionId,
      usedJokers,
    };
    this.answers.set(aKey, record);

    const newTotalScore = this.calculatePlayerScore(id, data.playerId);
    this.hub.answerSubmitted$.next({
      sessionId: id,
      playerId: data.playerId,
      playerName,
      isCorrect,
      scoreEarned,
      newTotalScore,
    });
    const session = this.sessions.get(id);
    if (session) {
      void this.relay.publish(session.pinCode, {
        type: 'answer',
        sessionId: id,
        playerId: data.playerId,
        playerName,
        isCorrect,
        scoreEarned,
        newTotalScore,
      });
    }

    return {
      answerId: uid('cevap'),
      isCorrect,
      scoreEarned,
      correctOptionId: correctOption.optionId,
      responseTimeInSeconds: data.responseTimeInSeconds,
      usedJokers,
    };
  }

  override async useJoker(id: string, playerId: string, questionId: string, jokerType: string): Promise<void> {
    const jKey = this.jokerKey(id, playerId, questionId);
    const used = this.jokerUsages.get(jKey) ?? new Set<string>();
    if (used.has(jokerType)) {
      throw new ApiError(400, 'Bu joker zaten kullanıldı.');
    }
    const aKey = this.answerKey(id, playerId, questionId);
    if (this.answers.has(aKey)) {
      throw new ApiError(400, 'Bu soruya zaten cevap verildi.');
    }
    used.add(jokerType);
    this.jokerUsages.set(jKey, used);

    const playerName = this.getPlayerName(id, playerId);
    this.hub.jokerUsed$.next({
      sessionId: id,
      playerId,
      jokerType: jokerType as 'FiftyFifty' | 'DoublePoints' | 'ExtraTime',
    });
    const session = this.sessions.get(id);
    if (session) {
      void this.relay.publish(session.pinCode, {
        type: 'joker',
        sessionId: id,
        playerId,
        jokerType,
      });
    }
  }

  override async getScoreboard(sessionId: string): Promise<ScoreboardDto> {
    const session = this.sessions.get(sessionId);
    const participants = this.loadParticipants(sessionId);
    const playerStats = new Map<string, { score: number; correctCount: number; totalAnswers: number }>();
    for (const [key, answer] of this.answers) {
      if (!key.startsWith(sessionId)) continue;
      const existing = playerStats.get(answer.playerId) ?? { score: 0, correctCount: 0, totalAnswers: 0 };
      existing.score += answer.scoreEarned;
      existing.totalAnswers += 1;
      if (answer.isCorrect) existing.correctCount += 1;
      playerStats.set(answer.playerId, existing);
    }
    return {
      sessionId,
      quizTitle: session?.quizTitle ?? 'Demo Sınav',
      isTeamMode: session?.isTeamMode ?? false,
      individual: participants.map((p) => {
        const stats = playerStats.get(p.playerId) ?? { score: 0, correctCount: 0, totalAnswers: 0 };
        return {
          playerId: p.playerId,
          playerName: p.playerName,
          teamName: p.teamName,
          score: stats.score,
          correctCount: stats.correctCount,
          totalAnswers: stats.totalAnswers,
        };
      }),
      teams: [],
    };
  }

  override async getReport(_sessionId: string): Promise<unknown> {
    return { status: 'ok', message: 'Demo rapor verisi' };
  }

  override async downloadReport(sessionId: string, format: 'pdf' | 'excel'): Promise<void> {
    const session = this.sessions.get(sessionId);
    const title = session?.quizTitle ?? 'Demo Sınav';
    const participants = this.loadParticipants(sessionId);
    const lines = [
      'TKİ KAHOOT OYUN RAPORU',
      `Sınav: ${title}`,
      `Oturum: ${sessionId}`,
      `Tarih: ${new Date().toLocaleString('tr-TR')}`,
      '',
      'Oyuncu Skor Tablosu',
    ];
    if (participants.length === 0) {
      lines.push('Katılımcı bulunmuyor.');
    } else {
      participants.forEach((p, index) => {
        lines.push(`${index + 1}. ${p.playerName}${p.teamName ? ` (${p.teamName})` : ''} - 0 puan - 0/0 doğru`);
      });
    }
    lines.push('', 'Bu rapor sunum amaçlı demo verisidir.');
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `oyun-raporu-${sessionId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private demoUser(): AuthResult {
    return {
      userId: 'demo-admin-001',
      registrationNumber: 'admin1',
      firstName: 'Merve Sıla',
      lastName: 'Akyol',
      department: 'Yönetim',
      role: 'Admin',
      token: 'demo-token',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }
}
