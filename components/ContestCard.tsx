import React from 'react';
import { Contest, User } from '../types';

interface ContestCardProps {
  contest: Contest;
  onRegister: (contest: Contest) => void;
  onEnterContest: (contest: Contest) => void;
  currentUser: User | null;
}

const ContestCard: React.FC<ContestCardProps> = ({ contest, onRegister, onEnterContest, currentUser }) => {
  const { title, description, entryFee, prizePool, category, registrationStartDate, registrationEndDate, contestStartDate, maxParticipants, participants } = contest;

  const now = Date.now();
  const isRegistered = currentUser ? participants.includes(currentUser.email) : false;
  const isRegistrationOpen = now >= registrationStartDate && now <= registrationEndDate;
  const isFull = participants.length >= maxParticipants;
  
  const isFinished = contest.status === 'Finished' || now > contestStartDate + (2 * 60 * 60 * 1000);
  const isLive = now >= contestStartDate && !isFinished;
  const isWaiting = now < contestStartDate;

  const getButtonProps = () => {
    if (contest.status === 'Cancelled') return { text: 'Contest Cancelled', disabled: true, action: () => {} };
    if (isFinished) return { text: 'Contest Finished', disabled: true, action: () => {} };
    if (isLive) return { text: 'Contest is Live', disabled: true, action: () => {} };

    if (isRegistered) {
        if (isWaiting) {
            return { text: 'Enter Contest', disabled: false, action: () => onEnterContest(contest) };
        }
        return { text: 'Registered', disabled: true, action: () => {} };
    }

    if (!isRegistrationOpen) return { text: 'Registration Closed', disabled: true, action: () => {} };
    if (isFull) return { text: 'Contest Full', disabled: true, action: () => {} };
    if (!currentUser) {
        return { text: 'Login to Join', disabled: false, action: () => onRegister(contest) };
    }
    if (currentUser.walletBalance < entryFee) return { text: 'Insufficient Funds', disabled: true, action: () => {} };
    
    return { text: 'Register Now', disabled: false, action: () => onRegister(contest) };
  };

  const getStatusChip = () => {
    if (contest.status === 'Cancelled') {
      return <span className="bg-gray-500/20 text-gray-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Cancelled</span>;
    }
    if (isFinished) {
      return <span className="bg-slate-500/20 text-slate-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Finished</span>;
    }
    if (isLive) {
        return <span className="bg-red-500/20 text-red-300 text-xs font-semibold px-2.5 py-0.5 rounded-full animate-pulse">Live</span>;
    }
    if (isRegistrationOpen) {
        return <span className="bg-green-500/20 text-green-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Open</span>;
    }
    return <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Upcoming</span>;
  };
  
  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const formatDateTime = (timestamp: number) => new Date(timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  const { text: buttonText, disabled: isButtonDisabled, action: buttonAction } = getButtonProps();

  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-6 flex flex-col hover:border-amber-400/50 transition-all duration-300 shadow-lg ${isFinished || contest.status === 'Cancelled' ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-bold text-amber-400">{title}</h3>
        {getStatusChip()}
      </div>
      <p className="text-slate-400 text-sm mb-2 flex-grow">{description}</p>
      
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 font-semibold mb-4">
          <span>Registration: {formatDate(registrationStartDate)} - {formatDate(registrationEndDate)}</span>
          <span className="text-right font-bold text-slate-300">Starts: {formatDateTime(contestStartDate)}</span>
      </div>

      <div className="border-t border-slate-700 my-4"></div>

      <div className="grid grid-cols-3 gap-2 text-sm mb-6 font-semibold">
        <div className="flex flex-col text-center">
            <span className="text-slate-400 uppercase tracking-wider text-xs">Entry Fee</span>
            <span className={`text-lg font-bold ${entryFee > 0 ? 'text-white' : 'text-green-400'}`}>
                {entryFee === 0 ? 'FREE' : `$${entryFee.toLocaleString()}`}
            </span>
        </div>
        <div className="flex flex-col text-center">
            <span className="text-slate-400 uppercase tracking-wider text-xs">Participants</span>
            <span className="text-lg font-bold text-white">{participants.length} / {maxParticipants}</span>
        </div>
        <div className="flex flex-col text-center">
            <span className="text-slate-400 uppercase tracking-wider text-xs">Prize Pool</span>
            <span className="text-lg font-bold text-amber-300">${prizePool.toLocaleString()}</span>
        </div>
      </div>

      <button
        onClick={buttonAction}
        disabled={isButtonDisabled}
        className={`w-full font-bold text-lg py-3 px-6 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg
          ${isButtonDisabled 
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : (isRegistered ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-amber-500 text-slate-900 hover:bg-amber-400 shadow-amber-500/20')
          }`}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default ContestCard;
