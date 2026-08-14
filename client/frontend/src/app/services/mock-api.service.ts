import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService, type LoginRequest, type RegisterRequest } from './api.service';
import type {
  AuthResult,
  CategoryDto,
  CreateCategoryRequest,
  CreateQuizRequest,
  GameSessionDto,
  GameSessionStateDto,
  QuestionPoolDto,
  QuizDetailDto,
  QuizDto,
  QuizQuestionDto,
  ScoreboardDto,
  SessionParticipantDto,
  SessionQuestionDto,
  UpdateQuizRequest,
} from '../models/types';

const uid = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const demoCategories: CategoryDto[] = [
  { id: 1, name: 'İSG', description: 'İş sağlığı ve güvenliği soru havuzu: İSG kuralları, riskler ve koruyucu önlemler', questionCount: 50, isActive: true },
  { id: 2, name: 'TKİ / Kurum Kültürü', description: 'TKİ kurum değerleri, tarihçesi, mevzuat ve kurum içi bilgi kültürü', questionCount: 40, isActive: true },
  { id: 3, name: 'Madencilik', description: 'Maden üretim süreçleri, teknik operasyonlar ve işletme bilgisi', questionCount: 30, isActive: true },
  { id: 4, name: 'Bilgi Teknolojileri ve Siber Güvenlik', description: 'Bilişim sistemleri, veri güvenliği ve siber güvenlik farkındalığı', questionCount: 25, isActive: true },
  { id: 5, name: 'İnsan Kaynakları ve İdari İşler', description: 'Personel süreçleri, özlük işleri ve idari yönetim', questionCount: 20, isActive: true },
  { id: 6, name: 'Mali İşler ve Satın Alma', description: 'Finansal yönetim, satınalma ve ihale mevzuatı', questionCount: 15, isActive: true },
  { id: 7, name: 'Kalite ve Verimlilik', description: 'Kalite standartları, süreç iyileştirme ve verimlilik', questionCount: 18, isActive: true },
  { id: 8, name: 'Genel Kültür ve Oryantasyon', description: 'Genel kültür soruları ve kuruma yeni başlayanlar için oryantasyon', questionCount: 22, isActive: true },
  { id: 9, name: 'Genel Kurumsal', description: 'Kurum genelini ilgilendiren çapraz bilgi ve beceri soruları', questionCount: 12, isActive: true },
];

interface DemoQuiz extends QuizDto {
  questions: QuizQuestionDto[];
}

interface DemoQuestionSpec {
  text: string;
  options: { text: string; isCorrect: boolean }[];
}

const questionBank: DemoQuestionSpec[] = [
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
];

function sampleQuestions(categoryName: string): QuizQuestionDto[] {
  return questionBank.map((spec, index) => ({
    questionId: uid(`soru`),
    text: spec.text,
    orderNo: index + 1,
    timeLimitInSeconds: 30,
    points: 1000,
    categoryId: 1,
    options: spec.options.map((opt, oi) => ({
      optionId: uid(`secenek`),
      text: opt.text,
      isCorrect: opt.isCorrect,
    })),
  }));
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
    questions: sampleQuestions('İSG'),
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
    questions: sampleQuestions('İSG'),
  },
  {
    id: 'q-kurum-1',
    title: 'TKİ Kurum Kültürü',
    description: 'TKİ kurum değerleri, tarihçesi ve kurum içi bilgi kültürünü ölçen dinamik seviye 1 sınavı.',
    isActive: true,
    questionCount: 40,
    categoryId: 2,
    level: 1,
    passScore: 60,
    isDynamic: true,
    defaultTimeLimitInSeconds: 30,
    jokersEnabled: true,
    questions: sampleQuestions('TKİ / Kurum Kültürü'),
  },
  {
    id: 'q-maden-1',
    title: 'Madencilik Temel Bilgiler',
    description: 'Maden üretim süreçleri ve işletme bilgisi kapsamındaki dinamik seviye 1 sınavı.',
    isActive: true,
    questionCount: 30,
    categoryId: 3,
    level: 1,
    passScore: 60,
    isDynamic: true,
    defaultTimeLimitInSeconds: 30,
    jokersEnabled: true,
    questions: sampleQuestions('Madencilik'),
  },
  {
    id: 'q-siber-1',
    title: 'Siber Güvenlik Farkındalığı',
    description: 'Bilişim sistemleri, veri güvenliği ve siber güvenlik farkındalığını ölçen seviye 1 sınavı.',
    isActive: true,
    questionCount: 25,
    categoryId: 4,
    level: 1,
    passScore: 70,
    isDynamic: true,
    defaultTimeLimitInSeconds: 30,
    jokersEnabled: true,
    questions: sampleQuestions('Bilgi Teknolojileri ve Siber Güvenlik'),
  },
  {
    id: 'q-genel-1',
    title: 'Genel Kültür Haftalık Sınav',
    description: 'Genel kültür ve oryantasyon kapsamında uygulanan haftalık dinamik sınav.',
    isActive: false,
    questionCount: 22,
    categoryId: 8,
    level: 1,
    passScore: 50,
    isDynamic: true,
    defaultTimeLimitInSeconds: 30,
    jokersEnabled: false,
    questions: sampleQuestions('Genel Kültür ve Oryantasyon'),
  },
];

const demoSessionQuestions: SessionQuestionDto[] = questionBank.map((spec, index) => ({
  questionId: uid(`soru`),
  text: spec.text,
  categoryName: 'İSG',
  orderNo: index + 1,
  timeLimitInSeconds: 30,
  points: 1000,
  options: spec.options.map((opt, oi) => ({
    optionId: uid(`secenek`),
    text: opt.text,
    isCorrect: opt.isCorrect,
  })),
}));

const demoParticipants: SessionParticipantDto[] = [
  { playerId: 'oyuncu-1', playerName: 'Ayşe Yılmaz', teamName: null, avatarEmoji: '🦊', avatarColor: '#ef4444' },
  { playerId: 'oyuncu-2', playerName: 'Mehmet Demir', teamName: null, avatarEmoji: '🐺', avatarColor: '#3b82f6' },
  { playerId: 'oyuncu-3', playerName: 'Zeynep Kaya', teamName: null, avatarEmoji: '🦉', avatarColor: '#8b5cf6' },
  { playerId: 'oyuncu-4', playerName: 'Ali Şahin', teamName: null, avatarEmoji: '🐯', avatarColor: '#f59e0b' },
  { playerId: 'oyuncu-5', playerName: 'Elif Çelik', teamName: null, avatarEmoji: '🐸', avatarColor: '#10b981' },
];

@Injectable()
export class MockApiService extends ApiService {
  private readonly categories: CategoryDto[] = structuredClone(demoCategories);
  private readonly quizzes: DemoQuiz[] = structuredClone(demoQuizzes);
  private readonly sessions = new Map<string, { quizId: string; quizTitle: string; pinCode: string; isTeamMode: boolean }>();
  private readonly sessionStates = new Map<string, GameSessionStateDto>();
  private sessionCounter = 0;

  constructor() {
    super(inject(HttpClient));
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
    return this.quizzes.map(({ questions: _questions, ...quiz }) => ({ ...quiz }));
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
      questions: quiz.questions.map((q) => ({ ...q, options: [...q.options] })),
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
      questions: sampleQuestions('İSG'),
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
      categories: [
        {
          name: 'İSG',
          questions: questionBank.map((q) => ({
            text: q.text,
            options: q.options.map((o) => o.text),
            correctIndex: q.options.findIndex((o) => o.isCorrect),
          })),
        },
      ],
    };
  }

  // --- Oturum akışı (canlı) ---
  override async createGameSession(data: { quizId: string; isTeamMode: boolean }): Promise<GameSessionDto> {
    this.sessionCounter += 1;
    const quiz = this.quizzes.find((q) => q.id === data.quizId);
    const id = `demo-session-${this.sessionCounter}`;
    const pinCode = String(1000 + (this.sessionCounter * 7) % 9000);
    const quizTitle = quiz?.title ?? 'Demo Sınav';
    this.sessions.set(id, { quizId: data.quizId, quizTitle, pinCode, isTeamMode: data.isTeamMode });
    this.sessionStates.set(id, { id, status: 'Waiting', currentQuestionOrderNo: 0, startedAt: null, finishedAt: null });
    return { id, quizId: data.quizId, pinCode, status: 'Waiting' };
  }

  override async startSession(id: string): Promise<GameSessionStateDto> {
    const state = this.sessionStates.get(id);
    if (state) {
      state.status = 'InGame';
      state.currentQuestionOrderNo = 1;
      state.startedAt = new Date().toISOString();
    }
    return this.getSessionState(id);
  }

  override async nextQuestion(id: string): Promise<GameSessionStateDto> {
    const state = this.sessionStates.get(id);
    if (state && state.status === 'InGame') {
      state.currentQuestionOrderNo += 1;
    }
    return this.getSessionState(id);
  }

  override async finishSession(id: string): Promise<GameSessionStateDto> {
    const state = this.sessionStates.get(id);
    if (state) {
      state.status = 'Finished';
      state.finishedAt = new Date().toISOString();
    }
    return this.getSessionState(id);
  }

  override async getSessionState(id: string): Promise<GameSessionStateDto> {
    return this.sessionStates.get(id) ?? { id, status: 'Waiting', currentQuestionOrderNo: 0, startedAt: null, finishedAt: null };
  }

  override async getSessionQuestions(sessionId: string): Promise<SessionQuestionDto[]> {
    return demoSessionQuestions.map((q) => ({
      ...q,
      options: q.options.map((o) => ({ ...o })),
    }));
  }

  override async getParticipants(sessionId: string): Promise<SessionParticipantDto[]> {
    return demoParticipants.map((p) => ({ ...p }));
  }

  override async getScoreboard(sessionId: string): Promise<ScoreboardDto> {
    const session = this.sessions.get(sessionId);
    return {
      sessionId,
      quizTitle: session?.quizTitle ?? 'Demo Sınav',
      isTeamMode: session?.isTeamMode ?? false,
      individual: [
        { playerId: 'oyuncu-1', playerName: 'Ayşe Yılmaz', teamName: null, score: 8500, correctCount: 9, totalAnswers: 10 },
        { playerId: 'oyuncu-2', playerName: 'Mehmet Demir', teamName: null, score: 7000, correctCount: 7, totalAnswers: 10 },
        { playerId: 'oyuncu-3', playerName: 'Zeynep Kaya', teamName: null, score: 6000, correctCount: 6, totalAnswers: 10 },
        { playerId: 'oyuncu-4', playerName: 'Ali Şahin', teamName: null, score: 4500, correctCount: 5, totalAnswers: 10 },
        { playerId: 'oyuncu-5', playerName: 'Elif Çelik', teamName: null, score: 3000, correctCount: 3, totalAnswers: 10 },
      ],
      teams: [],
    };
  }

  override async getReport(_sessionId: string): Promise<unknown> {
    return { status: 'ok', message: 'Demo rapor verisi' };
  }

  override async downloadReport(sessionId: string, format: 'pdf' | 'excel'): Promise<void> {
    const session = this.sessions.get(sessionId);
    const title = session?.quizTitle ?? 'Demo Sınav';
    const content = [
      'TKİ KAHOOT OYUN RAPORU',
      `Sınav: ${title}`,
      `Oturum: ${sessionId}`,
      `Tarih: ${new Date().toLocaleString('tr-TR')}`,
      '',
      'Oyuncu Skor Tablosu',
      '1. Ayşe Yılmaz - 8500 puan - 9/10 doğru',
      '2. Mehmet Demir - 7000 puan - 7/10 doğru',
      '3. Zeynep Kaya - 6000 puan - 6/10 doğru',
      '4. Ali Şahin - 4500 puan - 5/10 doğru',
      '5. Elif Çelik - 3000 puan - 3/10 doğru',
      '',
      'Bu rapor sunum amaçlı demo verisidir.',
    ].join('\n');
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
