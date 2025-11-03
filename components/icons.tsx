import React from 'react';

export const MindBattleIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'rgb(252, 211, 77)', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: 'rgb(245, 158, 11)', stopOpacity: 1 }} />
            </linearGradient>
        </defs>
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 7L12 12M22 7L12 12M12 22V12" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 4.5L7 9.5" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const FiftyFiftyIcon: React.FC<{ used?: boolean }> = ({ used = false }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={used ? 'text-slate-500' : 'text-white'}>
        <path d="M20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 20V4" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 4C13.6658 4.53603 15.1528 5.48514 16.3297 6.74684C17.5066 8.00854 18.3308 9.53818 18.718 11.18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <text x="7" y="15" fontFamily="sans-serif" fontSize="8px" fill="currentColor" fontWeight="bold">50</text>
        <text x="12" y="15" fontFamily="sans-serif" fontSize="8px" fill="currentColor" fontWeight="bold">50</text>
    </svg>
);

export const AskAIIcon: React.FC<{ used?: boolean }> = ({ used = false }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={used ? 'text-slate-500' : 'text-white'}>
        <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 13.4876 3.33614 14.893 3.93881 16.1419" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="8" r="1" fill="currentColor"/>
        <path d="M7 19.5C8.05731 18.5707 9.33333 18 10.7 18C12.0667 18 13.3427 18.5707 14.4 19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);

export const TimerIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    </svg>
);

export const SettingsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">
        <path d="M19.1414 12.0001C19.1414 15.9372 15.9371 19.1415 11.9999 19.1415C8.06277 19.1415 4.8584 15.9372 4.8584 12.0001C4.8584 8.06281 8.06277 4.85845 11.9999 4.85845C15.9371 4.85845 19.1414 8.06281 19.1414 12.0001Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 21.1667V22.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 1.5V2.83333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.25 19.75L5.16667 18.8333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18.8333 5.16669L19.75 4.25002" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22.5 12H21.1667" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2.83333 12H1.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.25 4.25L5.16667 5.16667" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18.8333 18.8333L19.75 19.75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const WalletIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">
        <path d="M19 7V6C19 4.34315 17.6569 3 16 3H5C3.34315 3 2 4.34315 2 6V18C2 19.6569 3.34315 21 5 21H16C17.6569 21 19 19.6569 19 18V17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 12H12C10.8954 12 10 12.8954 10 14V14C10 15.1046 10.8954 16 12 16H22V12Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);