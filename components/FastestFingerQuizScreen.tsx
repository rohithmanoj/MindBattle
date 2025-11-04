import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Contest, GameResults, User } from '../types';
import { TimerIcon } from './icons';

interface FastestFingerQuizScreenProps {
  contest: Contest;
  currentUser: User;
  onEndGame: (results: GameResults) => void;
}

const FastestFingerQuizScreen: React.FC<FastestFingerQuizScreenProps> = ({ contest, currentUser, onEndGame }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerStatus, setAnswerStatus] = useState<'pending' | 'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(contest.totalContestTime || 60);

  const currentQuestion = useMemo(() => contest.questions[currentQuestionIndex], [contest.questions, currentQuestionIndex]);

  // Main contest timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const endGame = useCallback(() => {
    // Simulate a leaderboard with dummy players
    const leaderboard = [
      { name: 'AI_Player_1', score: Math.floor(Math.random() * 10) + 5, time: Math.random() * 45 + 15 },
      { name: 'AI_Player_2', score: Math.floor(Math.random() * 10) + 3, time: Math.random() * 50 + 10 },
      { name: 'You', score: score, time: totalTime },
      { name: 'AI_Player_3', score: Math.floor(Math.random() * 10), time: Math.random() * 55 + 5 },
    ];
    leaderboard.sort((a, b) => b.score - a.score || a.time - b.time); // Sort by score desc, then time asc
    
    onEndGame({ format: 'FastestFinger', leaderboard });
  }, [score, totalTime, onEndGame]);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < contest.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setAnswerStatus(null);
      setQuestionStartTime(Date.now());
    } else {
      endGame();
    }
  }, [currentQuestionIndex, contest.questions.length, endGame]);
  
  const handleAnswer = useCallback((answer: string) => {
    if (answerStatus !== null) return;
    setAnswerStatus('pending');

    setTimeout(() => {
      if (answer === currentQuestion.answer) {
        setAnswerStatus('correct');
        setScore(prev => prev + 1);
        const timeTaken = (Date.now() - questionStartTime) / 1000;
        setTotalTime(prev => prev + timeTaken);
      } else {
        setAnswerStatus('incorrect');
      }
      setTimeout(handleNext, 1000); // Automatically move to next question
    }, 1000);
  }, [answerStatus, currentQuestion.answer, questionStartTime, handleNext]);

  const getOptionClass = (option: string, isSelected: boolean) => {
    if (answerStatus === null) return 'bg-slate-800/50 border-slate-600 hover:bg-amber-500/20 hover:border-amber-400';
    if (isSelected) {
      if (answerStatus === 'pending') return 'bg-yellow-500/80 border-yellow-400 animate-pulse';
      if (answerStatus === 'correct') return 'bg-green-500/80 border-green-400';
      if (answerStatus === 'incorrect') return 'bg-red-500/80 border-red-400';
    }
    if (answerStatus !== 'pending' && option === currentQuestion.answer) {
        return 'bg-green-500/80 border-green-400';
    }
    return 'bg-slate-800/50 border-slate-600 opacity-50';
  };

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const handleOptionClick = (option: string) => {
      if(answerStatus === null) {
          setSelectedAnswer(option);
          handleAnswer(option);
      }
  };


  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-sm rounded-lg p-4 sm:p-8 text-white">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex flex-col">
            <h2 className="text-xl font-bold text-amber-400">{contest.title}</h2>
            <p className="text-sm text-slate-400">Question {currentQuestionIndex + 1} of {contest.questions.length}</p>
        </div>
        <div className="flex gap-4 items-center">
            <div className="text-right">
                <p className="text-slate-300 font-semibold">Score</p>
                <p className="text-2xl font-bold font-roboto-mono">{score}</p>
            </div>
            <div className={`flex items-center gap-2 p-2 rounded-full transition-all duration-300 ${timeLeft <= 10 ? 'bg-red-500/20 text-red-300' : 'bg-slate-700/50'}`}>
                <TimerIcon />
                <span className="font-roboto-mono text-lg font-bold w-12 text-center">
                    {`${Math.floor(timeLeft / 60)}`.padStart(2, '0')}:{`${timeLeft % 60}`.padStart(2, '0')}
                </span>
            </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center">
        <h2 className="text-xl sm:text-2xl md:text-3xl text-center font-semibold leading-relaxed mb-8">
            {currentQuestion.question}
        </h2>
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option, index) => (
                <button
                    key={index}
                    onClick={() => handleOptionClick(option)}
                    disabled={answerStatus !== null}
                    className={`p-4 rounded-lg border-2 text-left transition-all duration-300 text-base md:text-lg ${getOptionClass(option, option === selectedAnswer)} ${answerStatus !== null ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <span className="font-bold mr-2 text-amber-400">{String.fromCharCode(65 + index)}:</span> {option}
                </button>
            ))}
        </div>
      </div>
       <div className="h-2 bg-slate-700 rounded-full mt-4 flex-shrink-0">
          <div className="h-full bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / contest.questions.length) * 100}%` }}></div>
      </div>
    </div>
  );
};

export default FastestFingerQuizScreen;