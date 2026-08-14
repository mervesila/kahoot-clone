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
  'TKİ / Kurum Kültürü': [
    {
      text: 'TKİ\'nin temel görevi aşağıdakilerden hangisidir?',
      options: [
        { text: 'Kömür üretimi ve işletmeciliği yapmak', isCorrect: true },
        { text: 'Çelik üretimi yapmak', isCorrect: false },
        { text: 'Petrol rafinerisi işletmek', isCorrect: false },
        { text: 'Tarımsal üretim yapmak', isCorrect: false },
      ],
    },
    {
      text: 'Kurum kültürünü oluşturan temel unsur aşağıdakilerden hangisidir?',
      options: [
        { text: 'Paylaşılan değerler ve inançlar', isCorrect: true },
        { text: 'Yalnızca bina ve ofisler', isCorrect: false },
        { text: 'Sadece yönetim kararları', isCorrect: false },
        { text: 'Günlük yazışmalar', isCorrect: false },
      ],
    },
    {
      text: 'TKİ çalışanları için öncelikli ilke aşağıdakilerden hangisidir?',
      options: [
        { text: 'İş sağlığı ve güvenliği', isCorrect: true },
        { text: 'Mesai süresinin kısalması', isCorrect: false },
        { text: 'Kişisel çıkar', isCorrect: false },
        { text: 'Kurum içi rekabet', isCorrect: false },
      ],
    },
    {
      text: 'Yeni başlayan çalışanlara verilen oryantasyon eğitiminin amacı nedir?',
      options: [
        { text: 'Kuruma uyumlarını ve iş süreçlerini tanımalarını sağlamak', isCorrect: true },
        { text: 'Sınav yapmak', isCorrect: false },
        { text: 'Yalnızca bina turu yaptırmak', isCorrect: false },
        { text: 'Kişisel gelişim testi uygulamak', isCorrect: false },
      ],
    },
    {
      text: 'Kurumsal etik davranışın temelini ne oluşturur?',
      options: [
        { text: 'Dürüstlük ve şeffaflık', isCorrect: true },
        { text: 'Bilgiyi gizli tutmak', isCorrect: false },
        { text: 'Kural dışı kolaylıklar', isCorrect: false },
        { text: 'Rekabetten kaçınmak', isCorrect: false },
      ],
    },
    {
      text: 'TKİ üretim faaliyetlerinde öncelik verilmesi gereken konu nedir?',
      options: [
        { text: 'Çevrenin ve insan sağlığının korunması', isCorrect: true },
        { text: 'Maliyetin her ne pahasına olursa olsun düşürülmesi', isCorrect: false },
        { text: 'Üretim hızının artırılması', isCorrect: false },
        { text: 'Çalışan sayısının azaltılması', isCorrect: false },
      ],
    },
    {
      text: 'Kurum içi resmi yazışmalarda uyulması gereken temel kural nedir?',
      options: [
        { text: 'Standart ve resmi dil kullanmak', isCorrect: true },
        { text: 'Sözlü iletişimi yazılıya tercih etmek', isCorrect: false },
        { text: 'Kişisel görüşleri öne çıkarmak', isCorrect: false },
        { text: 'Kısaltma ve jargon kullanmak', isCorrect: false },
      ],
    },
    {
      text: 'Kurumun vizyonuyla ilgili aşağıdakilerden hangisi doğrudur?',
      options: [
        { text: 'Geleceğe dönük hedefleri ortaya koyar', isCorrect: true },
        { text: 'Geçmiş yılların kar rakamlarını gösterir', isCorrect: false },
        { text: 'Yalnızca personel listesini içerir', isCorrect: false },
        { text: 'Günlük işleri tanımlar', isCorrect: false },
      ],
    },
  ],
  'Madencilik': [
    {
      text: 'Açık işletme madenciliğinde en yaygın kullanılan üretim yöntemi hangisidir?',
      options: [
        { text: 'Basamaklı kazı', isCorrect: true },
        { text: 'Grizu ile patlatma', isCorrect: false },
        { text: 'Dalgıçlı kesim', isCorrect: false },
        { text: 'Yüzey sıkıştırma', isCorrect: false },
      ],
    },
    {
      text: 'Maden ocaklarında düzenli gaz ölçümünün amacı nedir?',
      options: [
        { text: 'Tehlikeli gazları zamanında tespit etmek', isCorrect: true },
        { text: 'Hava sıcaklığını artırmak', isCorrect: false },
        { text: 'Üretim planını gizli tutmak', isCorrect: false },
        { text: 'Patlatma maliyetini hesaplamak', isCorrect: false },
      ],
    },
    {
      text: 'Grizu patlamalarına neden olan başlıca gaz hangisidir?',
      options: [
        { text: 'Metan (CH4)', isCorrect: true },
        { text: 'Karbondioksit (CO2)', isCorrect: false },
        { text: 'Azot (N2)', isCorrect: false },
        { text: 'Oksijen (O2)', isCorrect: false },
      ],
    },
    {
      text: 'Kömür tozu patlamasını önlemek için alınan önlemlerden biri nedir?',
      options: [
        { text: 'Taş tozu serpmek', isCorrect: true },
        { text: 'Su miktarını azaltmak', isCorrect: false },
        { text: 'Havalandırmayı kapatmak', isCorrect: false },
        { text: 'Aydınlatmayı söndürmek', isCorrect: false },
      ],
    },
    {
      text: 'Yeraltı ocağının havalandırılmasının temel amacı nedir?',
      options: [
        { text: 'Temiz hava sağlamak ve zararlı gazları uzaklaştırmak', isCorrect: true },
        { text: 'Ocak sıcaklığını yükseltmek', isCorrect: false },
        { text: 'Gürültüyü azaltmak', isCorrect: false },
        { text: 'Enerji tüketimini artırmak', isCorrect: false },
      ],
    },
    {
      text: 'Dekapaj kavramı madencilikte neyi ifade eder?',
      options: [
        { text: 'Maden üzerindeki örtü tabakasının kaldırılması', isCorrect: true },
        { text: 'Cevherin yıkanması', isCorrect: false },
        { text: 'Yolların asfaltlanması', isCorrect: false },
        { text: 'Makinaların bakımı', isCorrect: false },
      ],
    },
    {
      text: 'Yeraltı ocaklarında tahkimatın görevi nedir?',
      options: [
        { text: 'Tavanı emniyete almak', isCorrect: true },
        { text: 'Suyu pompalamak', isCorrect: false },
        { text: 'Aydınlatmayı artırmak', isCorrect: false },
        { text: 'Madeni zenginleştirmek', isCorrect: false },
      ],
    },
    {
      text: 'İş makinesi operatörü vardiya başında önce ne yapmalıdır?',
      options: [
        { text: 'Makineyi kontrol etmeli ve uyarı işaretlerini gözden geçirmeli', isCorrect: true },
        { text: 'Doğrudan üretime geçmeli', isCorrect: false },
        { text: 'Bakımı yarına ertelemeli', isCorrect: false },
        { text: 'Çay molası vermeli', isCorrect: false },
      ],
    },
  ],
  'Bilgi Teknolojileri ve Siber Güvenlik': [
    {
      text: 'Aşağıdakilerden hangisi güçlü bir paroladır?',
      options: [
        { text: 'Uzun ve karışık karakterler içeren parola', isCorrect: true },
        { text: 'Doğum tarihinden oluşan parola', isCorrect: false },
        { text: 'Ad soyaddan oluşan parola', isCorrect: false },
        { text: '123456 gibi sıralı sayılar', isCorrect: false },
      ],
    },
    {
      text: 'Kimlik avı (phishing) saldırısı nedir?',
      options: [
        { text: 'Sahte e-posta veya site ile kişisel bilgi çalmak', isCorrect: true },
        { text: 'Bilgisayara virüs bulaştırıp yavaşlatmak', isCorrect: false },
        { text: 'İnternet bağlantısını kesmek', isCorrect: false },
        { text: 'Yazıcıları çalıştırmak', isCorrect: false },
      ],
    },
    {
      text: 'İki faktörlü doğrulamanın amacı nedir?',
      options: [
        { text: 'Hesap güvenliğini artırmak', isCorrect: true },
        { text: 'Giriş süresini uzatmak', isCorrect: false },
        { text: 'Şifreleri basitleştirmek', isCorrect: false },
        { text: 'İnterneti hızlandırmak', isCorrect: false },
      ],
    },
    {
      text: 'Düzenli veri yedekleme neden önemlidir?',
      options: [
        { text: 'Veri kaybına karşı koruma sağlar', isCorrect: true },
        { text: 'Disk alanını artırır', isCorrect: false },
        { text: 'Bilgisayarı hızlandırır', isCorrect: false },
        { text: 'Yazılım lisansı sağlar', isCorrect: false },
      ],
    },
    {
      text: 'Şüpheli bir e-posta eki aldığınızda ne yapmalısınız?',
      options: [
        { text: 'Açmadan silmeli ve güvenlik birimine bildirmeli', isCorrect: true },
        { text: 'Hemen açıp içeriğini incelemeli', isCorrect: false },
        { text: 'Arkadaşlarına iletmeli', isCorrect: false },
        { text: 'İnternet tarayıcısında yüklemeli', isCorrect: false },
      ],
    },
    {
      text: 'Fidye yazılımı (ransomware) nedir?',
      options: [
        { text: 'Dosyaları şifreleyip fidye isteyen zararlı yazılım', isCorrect: true },
        { text: 'Bilgisayarı hızlandıran yazılım', isCorrect: false },
        { text: 'Reklam gösteren yazılım', isCorrect: false },
        { text: 'Şifre yöneticisi', isCorrect: false },
      ],
    },
    {
      text: 'Kurumsal Wi-Fi ağına bağlanırken uyulması gereken kural nedir?',
      options: [
        { text: 'Yalnızca yetkili kurumsal cihazlarla bağlanmak', isCorrect: true },
        { text: 'Şifreyi herkesle paylaşmak', isCorrect: false },
        { text: 'Güvenlik duvarını kapatmak', isCorrect: false },
        { text: 'Ağdan bağımsız çalışmak', isCorrect: false },
      ],
    },
    {
      text: 'Güncel antivirüs yazılımı kullanmanın amacı nedir?',
      options: [
        { text: 'Zararlı yazılımları tespit edip engellemek', isCorrect: true },
        { text: 'İnternet hızını iki katına çıkarmak', isCorrect: false },
        { text: 'Dosyaları otomatik silmek', isCorrect: false },
        { text: 'Reklamları azaltmak', isCorrect: false },
      ],
    },
  ],
  'Genel Kültür ve Oryantasyon': [
    {
      text: 'Yeni işe başlayan bir çalışanın ilk yapması gereken nedir?',
      options: [
        { text: 'Kurumu ve iş süreçlerini tanımak', isCorrect: true },
        { text: 'Tüm izinleri kullanmak', isCorrect: false },
        { text: 'Tatil planı yapmak', isCorrect: false },
        { text: 'İş arkadaşlarıyla rekabete girmek', isCorrect: false },
      ],
    },
    {
      text: 'Türkiye Cumhuriyeti\'nin başkenti neresidir?',
      options: [
        { text: 'Ankara', isCorrect: true },
        { text: 'İstanbul', isCorrect: false },
        { text: 'İzmir', isCorrect: false },
        { text: 'Bursa', isCorrect: false },
      ],
    },
    {
      text: 'Toplantılarda etkili iletişim için öncelikli davranış hangisidir?',
      options: [
        { text: 'Aktif dinlemek', isCorrect: true },
        { text: 'Telefonla ilgilenmek', isCorrect: false },
        { text: 'Söz keserek konuşmak', isCorrect: false },
        { text: 'Not almadan beklemek', isCorrect: false },
      ],
    },
    {
      text: 'TKİ\'nin merkezi hangi şehirde yer almaktadır?',
      options: [
        { text: 'Ankara', isCorrect: true },
        { text: 'Zonguldak', isCorrect: false },
        { text: 'İstanbul', isCorrect: false },
        { text: 'Soma', isCorrect: false },
      ],
    },
    {
      text: 'Zaman yönetiminde doğru yaklaşım hangisidir?',
      options: [
        { text: 'Önce acil ve önemli işleri yapmak', isCorrect: true },
        { text: 'Tüm işleri son dakikaya bırakmak', isCorrect: false },
        { text: 'Öncelikleri belirlememek', isCorrect: false },
        { text: 'Küçük işleri hiç yapmamak', isCorrect: false },
      ],
    },
    {
      text: 'Kurum içi duyurular nereden takip edilmelidir?',
      options: [
        { text: 'Kurumun resmi duyuru kanallarından', isCorrect: true },
        { text: 'Sosyal medya yorumlarından', isCorrect: false },
        { text: 'Söylentilerden', isCorrect: false },
        { text: 'Kişisel mesaj gruplarından', isCorrect: false },
      ],
    },
    {
      text: 'Ekip çalışmasında başarıyı artıran temel faktör nedir?',
      options: [
        { text: 'Görev ve sorumlulukların net paylaşılması', isCorrect: true },
        { text: 'Herkesin aynı işi yapması', isCorrect: false },
        { text: 'Kararları tek kişinin vermesi', isCorrect: false },
        { text: 'İletişimin sınırlı tutulması', isCorrect: false },
      ],
    },
    {
      text: 'Oryantasyon sürecinde çalışana öncelikle tanıtılan konular nelerdir?',
      options: [
        { text: 'Kurum tarihi, değerleri ve iş süreçleri', isCorrect: true },
        { text: 'Yalnızca yemekhane saatleri', isCorrect: false },
        { text: 'Yalnızca ücret politikaları', isCorrect: false },
        { text: 'Yalnızca tatil takvimi', isCorrect: false },
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
  },
];

const demoParticipants: SessionParticipantDto[] = [];

@Injectable()
export class MockApiService extends ApiService {
  private readonly categories: CategoryDto[] = structuredClone(demoCategories);
  private readonly quizzes: DemoQuiz[] = structuredClone(demoQuizzes);
  private readonly sessions = new Map<string, { quizId: string; quizTitle: string; pinCode: string; isTeamMode: boolean }>();
  private readonly sessionQuestionsMap = new Map<string, SessionQuestionDto[]>();
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
    const stored = this.sessionQuestionsMap.get(sessionId);
    const questions =
      stored ??
      drawQuestions(null, 10).map((spec, index) => toSessionQuestion(spec, index + 1, 'İSG'));
    return questions.map((q) => ({
      ...q,
      options: q.options.map((o) => ({ ...o })),
    }));
  }

  override async getParticipants(_sessionId: string): Promise<SessionParticipantDto[]> {
    return demoParticipants.map((p) => ({ ...p }));
  }

  override async getScoreboard(sessionId: string): Promise<ScoreboardDto> {
    const session = this.sessions.get(sessionId);
    return {
      sessionId,
      quizTitle: session?.quizTitle ?? 'Demo Sınav',
      isTeamMode: session?.isTeamMode ?? false,
      individual: [],
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
      'Katılımcı bulunmuyor.',
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
