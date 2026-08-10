import type { ScoreboardDto, ScoreboardPlayerDto } from '@/lib/types'

interface ScoreTableProps {
  scoreboard: ScoreboardDto
  highlightPlayerId?: string | null
  variant?: 'dark' | 'light'
}

export function ScoreTable({
  scoreboard,
  highlightPlayerId,
  variant = 'dark',
}: ScoreTableProps) {
  const light = variant === 'light'

  return (
    <div className="space-y-6">
      <div
        className={[
          'overflow-hidden rounded-3xl',
          light ? 'bg-kahoot-purple/5' : 'bg-white/10',
        ].join(' ')}
      >
        <div
          className={[
            'px-5 py-3 text-center text-xl font-black uppercase tracking-wide',
            light ? 'bg-kahoot-purple/10' : 'bg-white/15',
          ].join(' ')}
        >
          🏆 Skor Tablosu
        </div>
        <ol className={light ? 'divide-y divide-kahoot-purple/10' : 'divide-y divide-white/10'}>
          {scoreboard.individual.length === 0 ? (
            <li
              className={[
                'px-5 py-6 text-center font-bold',
                light ? 'text-kahoot-purple/60' : 'text-white/70',
              ].join(' ')}
            >
              Henüz puan yok — ilk cevap bekleniyor.
            </li>
          ) : (
            scoreboard.individual.map((player, index) => (
              <RankedPlayerRow
                key={player.playerId}
                player={player}
                rank={index + 1}
                highlighted={player.playerId === highlightPlayerId}
                light={light}
              />
            ))
          )}
        </ol>
      </div>

      {scoreboard.isTeamMode && scoreboard.teams.length > 0 ? (
        <div
          className={[
            'overflow-hidden rounded-3xl',
            light ? 'bg-kahoot-purple/5' : 'bg-white/10',
          ].join(' ')}
        >
          <div
            className={[
              'px-5 py-3 text-center text-xl font-black uppercase tracking-wide',
              light ? 'bg-kahoot-purple/10' : 'bg-white/15',
            ].join(' ')}
          >
            👥 Takım Skoru
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            {scoreboard.teams.map((team, index) => (
              <div
                key={team.teamName}
                className={[
                  'flex items-center justify-between rounded-2xl px-4 py-3',
                  light ? 'bg-kahoot-purple/5' : 'bg-white/10',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-kahoot-yellow">#{index + 1}</span>
                  <div>
                    <p className="font-black">{team.teamName}</p>
                    <p
                      className={[
                        'text-sm',
                        light ? 'text-kahoot-purple/60' : 'text-white/70',
                      ].join(' ')}
                    >
                      {team.playerCount} oyuncu · {team.totalScore} puan
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-kahoot-green">
                    {Math.round(team.averageScore)}
                  </p>
                  <p
                    className={[
                      'text-xs font-bold uppercase',
                      light ? 'text-kahoot-purple/50' : 'text-white/60',
                    ].join(' ')}
                  >
                    ort.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function RankedPlayerRow({
  player,
  rank,
  highlighted,
  light,
}: {
  player: ScoreboardPlayerDto
  rank: number
  highlighted: boolean
  light: boolean
}) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
  return (
    <li
      className={[
        'flex items-center justify-between px-5 py-3',
        highlighted ? 'bg-kahoot-yellow/90 text-kahoot-purple' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <span className="w-8 text-xl">{medal}</span>
        <div>
          <p className="font-black leading-tight">{player.playerName}</p>
          {player.teamName ? (
            <p
              className={[
                'text-xs font-bold uppercase tracking-wide',
                light ? 'text-kahoot-purple/50' : 'opacity-70',
              ].join(' ')}
            >
              {player.teamName}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <p
          className={[
            'text-sm font-bold',
            light ? 'text-kahoot-purple/60' : 'opacity-70',
          ].join(' ')}
        >
          {player.correctCount}/{player.totalAnswers} ✓
        </p>
        <p className="text-xl font-black">{player.score}</p>
      </div>
    </li>
  )
}
