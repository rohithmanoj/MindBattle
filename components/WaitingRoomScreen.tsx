import React, { useState, useEffect } from 'react';
import { Contest } from '../types';
import { MindBattleIcon } from './icons';

interface WaitingRoomScreenProps {
  contest: Contest;
  onContestStart: () => void;
  onBack: () => void;
}

const Countdown: React.FC<{ targetDate: number }> = ({ targetDate }) => {
    const calculateTimeLeft = () => {
        const difference = targetDate - new Date().getTime();
        let timeLeft = {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
        };

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearTimeout(timer);
    });

    const timeParts = [];
    if (timeLeft.days > 0) timeParts.push({ unit: 'days', value: timeLeft.days });
    if (timeLeft.hours > 0 || timeLeft.days > 0) timeParts.push({ unit: 'hours', value: timeLeft.hours });
    timeParts.push({ unit: 'minutes', value: timeLeft.minutes });
    timeParts.push({ unit: 'seconds', value: timeLeft.seconds });


    return (
        <div className="flex justify-center gap-4 sm:gap-8 font-roboto-mono">
            {timeParts.map(({unit, value}) => (
                <div key={unit} className="flex flex-col items-center">
                    <span className="text-4xl sm:text-6xl font-bold text-white tracking-widest">{String(value).padStart(2, '0')}</span>
                    <span className="text-sm sm:text-base text-slate-400 uppercase">{unit}</span>
                </div>
            ))}
        </div>
    );
};


const WaitingRoomScreen: React.FC<WaitingRoomScreenProps> = ({ contest, onContestStart, onBack }) => {
    useEffect(() => {
        const now = new Date().getTime();
        const startTime = contest.contestStartDate;

        // If we load this screen and the contest should have already started, start it immediately.
        if (now >= startTime) {
            onContestStart();
            return;
        }

        // Set a timeout for the exact moment the contest should start.
        const timeoutId = setTimeout(() => {
            onContestStart();
        }, startTime - now);

        // Clean up the timeout if the component unmounts (e.g., user navigates away).
        return () => clearTimeout(timeoutId);
    }, [contest, onContestStart]);

    return (
        <div className="flex flex-col items-center justify-center h-full text-white text-center p-4 sm:p-8 bg-slate-900/50 backdrop-blur-sm rounded-lg">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4">
                <MindBattleIcon />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-slate-200">You are registered for:</h2>
            <p className="text-3xl sm:text-4xl font-bold text-amber-400 mb-6">{contest.title}</p>
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 sm:p-8 w-full max-w-3xl mb-8">
                <h3 className="text-xl sm:text-2xl text-slate-300 mb-4">The battle begins in...</h3>
                <Countdown targetDate={contest.contestStartDate} />
            </div>

            <p className="text-slate-400 mb-8 max-w-lg">The quiz will start automatically when the timer hits zero. Make sure you're ready!</p>
            <button 
                onClick={onBack}
                className="bg-slate-600 text-white font-bold text-lg py-3 px-6 rounded-lg hover:bg-slate-500 transition-all duration-300 ease-in-out transform hover:scale-105"
            >
                Back to Contests
            </button>
        </div>
    );
};

export default WaitingRoomScreen;
