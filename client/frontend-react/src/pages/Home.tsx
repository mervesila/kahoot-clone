import { useNavigate } from 'react-router-dom'
import { KahootButton } from '@/components/KahootButton'
import { Logo } from '@/components/Logo'

export function Home() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-10 bg-kahoot-purple px-6">
      <Logo size="lg" />
      <p className="max-w-xl text-center text-xl font-semibold text-white/85">
        TKİ Kurum Kültürü ve İSG bilgi yarışmasına hoş geldin! Oyuncu olarak katıl ya da
        yönetici olarak yeni bir oyun başlat.
      </p>
      <div className="grid w-full max-w-lg gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-3xl bg-white/10 p-6">
          <span className="text-5xl">🎮</span>
          <h2 className="text-2xl font-black">Oyuncu</h2>
          <p className="text-white/80">PIN koduyla oyuna katıl ve şıklara basarak yarış.</p>
          <KahootButton variant="red" size="lg" full onClick={() => navigate('/player')}>
            Oyuna Katıl
          </KahootButton>
        </div>
        <div className="flex flex-col gap-4 rounded-3xl bg-white/10 p-6">
          <span className="text-5xl">🧑‍💼</span>
          <h2 className="text-2xl font-black">Yönetici</h2>
          <p className="text-white/80">Quiz oluştur, oyunu başlat ve raporları indir.</p>
          <KahootButton variant="blue" size="lg" full onClick={() => navigate('/admin')}>
            Yönetim Paneli
          </KahootButton>
        </div>
      </div>
    </div>
  )
}
