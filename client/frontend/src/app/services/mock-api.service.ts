import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  ApiError,
  ApiService,
  type JoinGameSessionRequest,
  type LoginRequest,
  type RegisterRequest,
} from './api.service';
import type {
  AuthResult,
  CategoryDto,
  CreateCategoryRequest,
  CreateQuizRequest,
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
  UpdateQuizRequest,
} from '../models/types';
import { DEFAULT_AVATAR } from '../data/avatars';

const uid = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const demoCategories: CategoryDto[] = [
  { id: 1, name: 'İSG', description: 'İş sağlığı ve güvenliği soru havuzu: İSG kuralları, riskler ve koruyucu önlemler', questionCount: 50, isActive: true },
];

interface DemoQuiz extends QuizDto {}

interface DemoQuestionSpec {
  text: string;
  options: { text: string; isCorrect: boolean }[];
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
  private sessionCounter = 0;

  private static readonly SESSIONS_KEY = 'tki_demo_sessions';
  private static readonly STATES_KEY = 'tki_demo_states';

  constructor() {
    super(inject(HttpClient));
    this.loadPersisted();
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

  // --- Oturum akışı (canlı) ---
  override async createGameSession(data: { quizId: string; isTeamMode: boolean }): Promise<GameSessionDto> {
    this.sessionCounter += 1;
    const quiz = this.quizzes.find((q) => q.id === data.quizId);
    const id = `demo-session-${this.sessionCounter}`;
    const pinCode = String(1000 + (this.sessionCounter * 7) % 9000);
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
    return this.getSessionState(id);
  }

  override async finishSession(id: string): Promise<GameSessionStateDto> {
    const state = this.sessionStates.get(id);
    if (state) {
      state.status = 'Finished';
      state.finishedAt = new Date().toISOString();
      this.persist();
    }
    return this.getSessionState(id);
  }

  override async getSessionState(id: string): Promise<GameSessionStateDto> {
    this.loadStates();
    return this.sessionStates.get(id) ?? { id, status: 'Waiting', currentQuestionOrderNo: 0, startedAt: null, finishedAt: null };
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
    if (!sessionId || !session) {
      throw new ApiError(404, 'Bu PIN ile aktif bir sınav bulunamadı.');
    }

    const state = this.sessionStates.get(sessionId);
    if (state && state.status === 'Finished') {
      throw new ApiError(400, 'Bu sınav oturumu sona erdi.');
    }

    const playerName = [data.firstName, data.lastName].filter((v) => v?.trim()).join(' ').trim();
    if (!playerName) {
      throw new ApiError(400, 'Ad Soyad bilgisi zorunludur.');
    }

    const participants = this.loadParticipants(sessionId);
    const normalized = playerName.toLocaleLowerCase('tr-TR');
    if (participants.some((p) => p.playerName.toLocaleLowerCase('tr-TR') === normalized)) {
      throw new ApiError(409, 'Bu isim zaten lobide kullanılıyor.');
    }

    const playerId = uid('oyuncu');
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

  override async getParticipants(sessionId: string): Promise<SessionParticipantDto[]> {
    return this.loadParticipants(sessionId).map((p) => ({ ...p }));
  }

  override async getScoreboard(sessionId: string): Promise<ScoreboardDto> {
    const session = this.sessions.get(sessionId);
    const participants = this.loadParticipants(sessionId);
    return {
      sessionId,
      quizTitle: session?.quizTitle ?? 'Demo Sınav',
      isTeamMode: session?.isTeamMode ?? false,
      individual: participants.map((p) => ({
        playerId: p.playerId,
        playerName: p.playerName,
        teamName: p.teamName,
        score: 0,
        correctCount: 0,
        totalAnswers: 0,
      })),
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
