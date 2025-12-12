export type Operation = 'multiplication' | 'division' | 'addition' | 'subtraction';

export enum Difficulty {
  EASY = 'سهل',
  MEDIUM = 'متوسط',
  HARD = 'صعب'
}

export interface Question {
  text: string;
  operandA: number;
  operandB: number;
  correctAnswer: number;
  answers: number[];
  isMissingOperand: boolean; // True if format is "2 x ? = 16"
}

export interface GameState {
  status: 'start' | 'playing' | 'won' | 'lost';
  score: number;
  currentLevel: number; // 0 to 14 (15 questions like Millionaire)
  lifelines: {
    fiftyFifty: boolean;
    askAudience: boolean;
    callFriend: boolean;
  };
  selectedOperation: Operation | null;
  selectedDifficulty: Difficulty | null;
}

export const LEVELS = [
  100, 200, 300, 500, 1000, 
  2000, 4000, 8000, 16000, 32000, 
  64000, 125000, 250000, 500000, 1000000
];