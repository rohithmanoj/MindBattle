import React from 'react';
import { MindBattleIcon } from './icons';

interface EndScreenProps {
  score: number;
  onRestart: () => void;
  totalQuestions: number;
  prizeAmounts: number[];
}

const EndScreen: React.FC<EndScreenProps> = ({ score, onRestart, totalQuestions, prizeAmounts }) => {
  const questionsAnswered = prizeAmounts.indexOf(score) !== -1 
    ? totalQuestions - prizeAmounts.indexOf(score) - 1
    : score === prizeAmounts[0] ? totalQuestions : 0;
    
  const getMessage = () => {
    if (score === prizeAmounts[0]) return "Congratulations! You're a MindBattle Champion!";
    if (score >= prizeAmounts[Math.floor(prizeAmounts.length / 2)]) return "Incredible performance!";
    if (score > 0) return "Great effort! You've got what it takes.";
    return "Tough battle! Why not try again?";
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-white text-center p-8 bg-slate-900/50 backdrop-blur-sm rounded-lg">
      <div className="w-20 h-20 mb-4">
        <MindBattleIcon />
      </div>
      <h2 className="text-3xl font-bold mb-2 text-amber-400">{getMessage()}</h2>
      <p className="text-lg text-slate-300 mb-6">You walk away with:</p>
      <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 font-bold text-5xl py-4 px-8 rounded-lg mb-8 shadow-xl shadow-amber-500/20">
        ${score.toLocaleString()}
      </div>
      <p className="text-slate-400 mb-8">You answered {questionsAnswered} out of {totalQuestions} questions correctly.</p>
      <button 
        onClick={onRestart}
        className="bg-indigo-600 text-white font-bold text-xl py-4 px-8 rounded-lg hover:bg-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg shadow-indigo-500/20"
      >
        Back to Contests
      </button>
    </div>
  );
};

export default EndScreen;