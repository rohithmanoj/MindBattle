import { StoredUser, Contest, GameResults, Difficulty, Rank, UserContestHistory } from '../types';
import { SCORING_POINTS, RANK_THRESHOLDS, RANK_ORDER } from '../constants';

export const getRank = (points: number): Rank => {
  for (const rank of RANK_ORDER) {
    if (points >= RANK_THRESHOLDS[rank]) {
      return rank;
    }
  }
  return 'Bronze Beginner';
};

export const calculatePoints = (difficulty: Difficulty, isWin: boolean): number => {
  const points = SCORING_POINTS[difficulty];
  return points.base + (isWin ? points.win : points.loss);
};

export const updateUserStatsAfterContest = (user: StoredUser, contest: Contest, results: GameResults): StoredUser => {
    let isWin = false;
    let resultScore = 0;

    if (results.format === 'KBC') {
        isWin = results.score > 0;
        resultScore = results.score;
    } else if (results.format === 'FastestFinger') {
        const userResult = results.leaderboard.find(p => p.name === 'You');
        if (userResult) {
            const userRank = results.leaderboard.findIndex(p => p.name === 'You') + 1;
            // A win is defined as placing in the top 3
            isWin = userRank > 0 && userRank <= 3;
            resultScore = userResult.score;
        }
    }

    const pointsEarned = calculatePoints(contest.difficulty, isWin);

    const newHistoryEntry: UserContestHistory = {
        contestId: contest.id,
        contestTitle: contest.title,
        difficulty: contest.difficulty,
        category: contest.category,
        result: resultScore,
        pointsEarned,
        timestamp: Date.now(),
    };
    
    const updatedUser: StoredUser = {
        ...user,
        totalPoints: Math.max(0, (user.totalPoints || 0) + pointsEarned), // Ensure points don't go below zero
        contestHistory: [newHistoryEntry, ...(user.contestHistory || [])],
    };

    return updatedUser;
};
