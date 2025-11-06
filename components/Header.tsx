import React from 'react';
import { User } from '../types';
import { MindBattleIcon, SettingsIcon, WalletIcon } from './icons';
import RankBadge from './RankBadge';
import { getRank } from '../services/rankingService';

interface HeaderProps {
  currentUser: User | null;
  isAdmin: boolean;
  onLoginRequest: () => void;
  onLogout: () => void;
  onGoToAdmin: () => void;
  onGoToWallet: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, isAdmin, onLoginRequest, onLogout, onGoToAdmin, onGoToWallet }) => {
  return (
    <header className="flex-shrink-0 flex items-center justify-between p-4 bg-slate-900/30 border-b border-slate-700">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10">
          <MindBattleIcon />
        </div>
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 hidden sm:block">
          MindBattle
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {currentUser ? (
          <div className="flex items-center gap-2 sm:gap-4">
             {!isAdmin && (
               <button
                onClick={onGoToWallet}
                className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-full px-4 py-2 hover:bg-slate-700/50 hover:border-amber-400 transition-all"
                aria-label="Open Wallet"
              >
                  <WalletIcon />
                  <span className="font-bold text-amber-300 font-roboto-mono">${currentUser.walletBalance.toLocaleString()}</span>
              </button>
            )}

            <div className="hidden md:flex flex-col items-end">
                <span className="text-slate-300 font-bold -mb-0.5">{currentUser.name}</span>
                {!isAdmin && <RankBadge rank={getRank(currentUser.totalPoints || 0)} />}
            </div>
            
            <button 
              onClick={onLogout}
              className="bg-slate-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-slate-500 transition-colors duration-300"
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={onLoginRequest}
            className="bg-indigo-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-indigo-500 transition-colors duration-300"
          >
            Login
          </button>
        )}
        {isAdmin && (
            <button 
                onClick={onGoToAdmin} 
                className="text-slate-400 hover:text-amber-400 transition-colors p-2 rounded-full hover:bg-slate-700/50"
                aria-label="Open Settings"
            >
                <SettingsIcon />
            </button>
        )}
      </div>
    </header>
  );
};

export default Header;