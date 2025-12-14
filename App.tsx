import React, { useState, useRef } from 'react';
import { GameState, Operation, Difficulty, LEVELS, Question } from './types';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import ResultModal from './components/ResultModal';
import AudioGenerator from './components/AudioGenerator';
import { generateQuestion, getQuestionAudioText, getQuestionFileName } from './services/mathEngine';
import { audioService } from './services/audioService';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    status: 'start',
    score: 0,
    currentLevel: 0,
    lifelines: { fiftyFifty: true, askAudience: true, callFriend: true },
    selectedOperation: null,
    selectedDifficulty: null,
    selectedTable: null
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);

  const questionBuffer = useRef<Question[]>([]);

  // Helper to load audio with filename fallback
  const loadAudioForQuestion = async (q: Question) => {
      const text = getQuestionAudioText(q);
      const filename = getQuestionFileName(q);
      await audioService.preload(text, 'ar-SA', filename);
  };

  const startGame = async (op: Operation, diff: Difficulty, table: number | null) => {
    setIsLoading(true);
    setLoadingMessage("جاري تجهيز المسابقة...");
    
    const newState: GameState = {
      status: 'playing',
      score: 0,
      currentLevel: 0,
      lifelines: { fiftyFifty: true, askAudience: true, callFriend: true },
      selectedOperation: op,
      selectedDifficulty: diff,
      selectedTable: table
    };

    questionBuffer.current = [];

    // Generate first 3 questions
    const q1 = generateQuestion(op, diff, table);
    const q2 = generateQuestion(op, diff, table);
    const q3 = generateQuestion(op, diff, table);

    let introText = "أهلاً بك يا أنس";
    if (table) {
        if (op === 'multiplication') introText += ` في جدول الضرب للرقم ${table}`;
        else if (op === 'division') introText += ` في مسابقة القسمة على ${table}`;
    } else {
        introText += " في مسابقة العباقرة";
    }

    try {
        // Preload Audio
        const promises = [
            audioService.preload(introText),
            loadAudioForQuestion(q1),
            loadAudioForQuestion(q2),
            loadAudioForQuestion(q3)
        ];

        await Promise.all(promises);

        questionBuffer.current = [q2, q3];
        setGameState(newState);
        setCurrentQuestion(q1);
        setIsLoading(false);
        
        audioService.speak(introText);

    } catch (e) {
        console.error("Error preparing game:", e);
        // Fail safe
        setGameState(newState);
        setCurrentQuestion(q1);
        setIsLoading(false);
    }
  };

  const prepareNextBuffer = () => {
      if (!gameState.selectedOperation) return;
      
      const futureLevelIndex = gameState.currentLevel + 3;
      
      if (futureLevelIndex < LEVELS.length) {
          const futureQ = generateQuestion(
              gameState.selectedOperation, 
              gameState.selectedDifficulty || Difficulty.MEDIUM,
              gameState.selectedTable
          );
          questionBuffer.current.push(futureQ);
          loadAudioForQuestion(futureQ).catch(e => console.warn("Bg preload fail", e));
      }
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
        
        const nextQ = questionBuffer.current.shift();
        
        if (nextQ) {
            setCurrentQuestion(nextQ);
        } else {
            const fallbackQ = generateQuestion(
                gameState.selectedOperation!, 
                gameState.selectedDifficulty!, 
                gameState.selectedTable
            );
            setCurrentQuestion(fallbackQ);
            loadAudioForQuestion(fallbackQ); 
        }
      }
    } else {
      // Check if any lifelines are still available
      const hasLifelines = gameState.lifelines.fiftyFifty || 
                          gameState.lifelines.askAudience || 
                          gameState.lifelines.callFriend;
      
      if (hasLifelines) {
        // Don't end game, just show wrong answer feedback
        // The GameScreen will handle showing the error and allowing retry
        return;
      } else {
        // All lifelines used, end the game
        setGameState(prev => ({ ...prev, status: 'lost' }));
      }
    }
  };

  const useLifeline = (type: 'fiftyFifty' | 'askAudience' | 'callFriend') => {
    setGameState(prev => ({
      ...prev,
      lifelines: { ...prev.lifelines, [type]: false }
    }));
  };

  const restartGame = () => {
    setGameState({
      status: 'start',
      score: 0,
      currentLevel: 0,
      lifelines: { fiftyFifty: true, askAudience: true, callFriend: true },
      selectedOperation: null,
      selectedDifficulty: null,
      selectedTable: null
    });
    questionBuffer.current = [];
  };

  return (
    <div className="min-h-screen millionaire-gradient text-white overflow-hidden font-sans relative">
      
      {isLoading && (
          <div className="fixed inset-0 z-[200] bg-indigo-950 flex flex-col items-center justify-center animate-fadeIn">
              <Loader2 className="w-16 h-16 text-yellow-400 animate-spin mb-4" />
              <p className="text-xl font-bold text-white mb-2">{loadingMessage}</p>
          </div>
      )}
      
      {showGenerator && (
          <AudioGenerator onClose={() => setShowGenerator(false)} />
      )}

      {gameState.status === 'start' && !isLoading && !showGenerator && (
        <StartScreen onStart={startGame} onOpenGenerator={() => setShowGenerator(true)} />
      )}

      {gameState.status === 'playing' && currentQuestion && !isLoading && (
        <GameScreen 
          gameState={gameState} 
          question={currentQuestion} 
          onAnswer={handleAnswer}
          onUseLifeline={useLifeline}
          onCorrectAnswer={prepareNextBuffer}
          onBackToHome={restartGame}
        />
      )}

      {(gameState.status === 'won' || gameState.status === 'lost') && (
        <ResultModal 
            gameState={gameState} 
            onRestart={restartGame} 
            lastQuestion={currentQuestion} 
        />
      )}
    </div>
  );
}
