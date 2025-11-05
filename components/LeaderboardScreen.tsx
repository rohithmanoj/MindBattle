import React, { useMemo } from 'react';
import { Contest, User } from '../types';
import { MindBattleIcon } from './icons';

interface LeaderboardScreenProps {
  contest: Contest;
  currentUser: User | null;
  onBack: () => void;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ contest, currentUser, onBack }) => {
  const sortedResults = useMemo(() => {
    if (!contest.results) return [];
    return [...contest.results].sort((a, b) => b.score - a.score || (a.time || 0) - (b.time || 0));
  }, [contest.results]);

  const getRankContent = (rank: number) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return rank + 1;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-white text-center p-4 sm:p-8 bg-slate-900/50 backdrop-blur-sm rounded-lg">
      <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4">
        <MindBattleIcon />
      </div>
      <h2 className="text-3xl font-bold mb-1 text-amber-400">Final Leaderboard</h2>
      <p className="text-lg text-slate-300 mb-6">{contest.title}</p>

      <div className="w-full max-w-2xl bg-slate-800/50 rounded-lg p-4 mb-8 flex-grow overflow-y-auto">
        {sortedResults.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-600 text-slate-400 uppercase text-sm">
                <th className="p-2 w-16 text-center">Rank</th>
                <th className="p-2">Player</th>
                <th className="p-2 text-right">{contest.format === 'KBC' ? 'Prize Won' : 'Score'}</th>
                {contest.format === 'FastestFinger' && <th className="p-2 text-right">Time (s)</th>}
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((player, index) => (
                <tr key={player.userId} className={`border-b border-slate-700 last:border-b-0 ${player.userId === currentUser?.email ? 'bg-amber-500/20' : ''}`}>
                  <td className={`p-2 font-bold text-center text-xl ${index < 3 ? '' : 'text-white'}`}>
                    {getRankContent(index)}
                  </td>
                  <td className={`p-2 font-semibold ${player.userId === currentUser?.email ? 'text-amber-300' : 'text-white'}`}>
                    {player.name}
                    {player.userId === currentUser?.email && <span className="text-xs text-slate-400 ml-2">(You)</span>}
                  </td>
                  <td className="p-2 text-right font-roboto-mono font-semibold text-lg">
                    {contest.format === 'KBC' ? `$${player.score.toLocaleString()}` : player.score}
                  </td>
                  {contest.format === 'FastestFinger' && (
                    <td className="p-2 text-right font-roboto-mono text-slate-400">
                      {player.time?.toFixed(2)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500">No results have been recorded for this contest.</p>
          </div>
        )}
      </div>

      <button
        onClick={onBack}
        className="bg-indigo-600 text-white font-bold text-xl py-4 px-8 rounded-lg hover:bg-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg shadow-indigo-500/20 flex-shrink-0"
      >
        Back to Contests
      </button>
    </div>
  );
};

export default LeaderboardScreen;
