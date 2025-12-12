import React, { useState, useEffect } from 'react';
import { GameState, Operation, Difficulty, LEVELS, Question } from './types';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import ResultModal from './components/ResultModal';
import { generateQuestion } from './services/mathEngine';
import { audioService } from './services/audioService';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    status: 'start',
    score: 0,
    currentLevel: 0,
    lifelines: { fiftyFifty: true, askAudience: true, callFriend: true },
    selectedOperation: null,
    selectedDifficulty: null
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  const startGame = (op: Operation, diff: Difficulty) => {
    // Initial State Reset
    const newState: GameState = {
      status: 'playing',
      score: 0,
      currentLevel: 0,
      lifelines: { fiftyFifty: true, askAudience: true, callFriend: true },
      selectedOperation: op,
      selectedDifficulty: diff
    };
    setGameState(newState);
    
    // Generate First Question
    setCurrentQuestion(generateQuestion(op, diff));
    
    // Play sound
    audioService.speak(`أهلاً بك يا الوليد في مسابقة العباقرة. لنبدأ بالسؤال الأول`);
  };

  const handleAnswer = (ans: number) => {
    if (!currentQuestion) return;

    if (ans === currentQuestion.correctAnswer) {
      const nextLevel = gameState.currentLevel + 1;
      
      if (nextLevel >= LEVELS.length) {
        setGameState(prev => ({ ...prev, status: 'won', score: LEVELS[LEVELS.length - 1] }));
      } else {
        setGameState(prev => ({ 
          ...prev, 
          currentLevel: nextLevel,
          score: LEVELS[prev.currentLevel]
        }));
        // Generate next question
        setTimeout(() => {
          if (gameState.selectedOperation && gameState.selectedDifficulty) {
             setCurrentQuestion(generateQuestion(gameState.selectedOperation, gameState.selectedDifficulty));
          }
        }, 500);
      }
    } else {
      setGameState(prev => ({ ...prev, status: 'lost' }));
    }
  };

  const useLifeline = (type: 'fiftyFifty' | 'askAudience' | 'callFriend') => {
    setGameState(prev => ({
      ...prev,
      lifelines: { ...prev.lifelines, [type]: false }
    }));
    // Logic for display is now handled in GameScreen
  };

  const restartGame = () => {
    setGameState({
      status: 'start',
      score: 0,
      currentLevel: 0,
      lifelines: { fiftyFifty: true, askAudience: true, callFriend: true },
      selectedOperation: null,
      selectedDifficulty: null
    });
  };

  return (
    <div className="min-h-screen millionaire-gradient text-white overflow-hidden font-sans">
      {gameState.status === 'start' && (
        <StartScreen onStart={startGame} />
      )}

      {gameState.status === 'playing' && currentQuestion && (
        <GameScreen 
          gameState={gameState} 
          question={currentQuestion} 
          onAnswer={handleAnswer}
          onUseLifeline={useLifeline}
        />
      )}

      {(gameState.status === 'won' || gameState.status === 'lost') && (
        <ResultModal 
            gameState={gameState} 
            onRestart={restartGame} 
            lastQuestion={currentQuestion} 
        />
      )}
      
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] opacity-20">
         <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-600 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
}