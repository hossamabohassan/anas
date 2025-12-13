import React, { useState, useRef } from 'react';
import { GameState, Operation, Difficulty, LEVELS, Question } from './types';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import ResultModal from './components/ResultModal';
import { generateQuestion, getQuestionAudioText } from './services/mathEngine';
import { audioService } from './services/audioService';
import { Loader2 } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Buffer to hold upcoming questions with preloaded audio
  const questionBuffer = useRef<Question[]>([]);

  const startGame = async (op: Operation, diff: Difficulty) => {
    setIsLoading(true);
    setLoadingMessage("جاري تجهيز المسابقة وتحميل الأصوات...");
    
    // Reset State
    const newState: GameState = {
      status: 'playing',
      score: 0,
      currentLevel: 0,
      lifelines: { fiftyFifty: true, askAudience: true, callFriend: true },
      selectedOperation: op,
      selectedDifficulty: diff
    };

    questionBuffer.current = [];

    // Generate first 3 questions (or less if levels are short, but assuming 15)
    const q1 = generateQuestion(op, diff);
    const q2 = generateQuestion(op, diff);
    const q3 = generateQuestion(op, diff);

    const introText = "أهلاً بك يا الوليد في مسابقة العباقرة. لنبدأ بالسؤال الأول";

    try {
        // Preload Audio for Intro + First 3 Questions in Parallel
        const promises = [
            audioService.preload(introText),
            audioService.preload(getQuestionAudioText(q1)),
            audioService.preload(getQuestionAudioText(q2)),
            audioService.preload(getQuestionAudioText(q3))
        ];

        await Promise.all(promises);

        // Store Q2 and Q3 in buffer, set Q1 as current
        questionBuffer.current = [q2, q3];
        
        setGameState(newState);
        setCurrentQuestion(q1);
        setIsLoading(false);
        
        // Speak Intro immediately (cached)
        audioService.speak(introText);

    } catch (e) {
        console.error("Error preparing game:", e);
        // Fail safe: start anyway even if audio failed
        setGameState(newState);
        setCurrentQuestion(q1);
        setIsLoading(false);
    }
  };

  // Called when we know the user is moving to the next level (e.g. during celebration)
  // We use this time to replenish the buffer
  const prepareNextBuffer = () => {
      if (!gameState.selectedOperation || !gameState.selectedDifficulty) return;
      
      // We are at currentLevel.
      // currentQuestion is active.
      // buffer has [Q(current+1), Q(current+2)]
      // We want to generate Q(current+3) and preload it now.
      
      // Calculate index of the question to generate for the future
      // Current Level = 0. We have Q1 (active), Q2(buffer), Q3(buffer). We need Q4.
      const futureLevelIndex = gameState.currentLevel + 3;
      
      if (futureLevelIndex < LEVELS.length) {
          const futureQ = generateQuestion(gameState.selectedOperation, gameState.selectedDifficulty);
          // Add to end of buffer
          questionBuffer.current.push(futureQ);
          // Start downloading audio silently
          audioService.preload(getQuestionAudioText(futureQ)).catch(e => console.warn("Bg preload fail", e));
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
        
        // Get next question from buffer
        const nextQ = questionBuffer.current.shift(); // Remove first element
        
        if (nextQ) {
            setCurrentQuestion(nextQ);
        } else {
            // Fallback if buffer empty (unlikely with this logic)
            const fallbackQ = generateQuestion(gameState.selectedOperation!, gameState.selectedDifficulty!);
            setCurrentQuestion(fallbackQ);
            audioService.preload(getQuestionAudioText(fallbackQ)); // Try to load fast
        }
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
    questionBuffer.current = [];
  };

  return (
    <div className="min-h-screen millionaire-gradient text-white overflow-hidden font-sans relative">
      
      {isLoading && (
          <div className="fixed inset-0 z-[200] bg-indigo-950 flex flex-col items-center justify-center animate-fadeIn">
              <Loader2 className="w-16 h-16 text-yellow-400 animate-spin mb-4" />
              <p className="text-xl md:text-2xl font-bold text-white mb-2">{loadingMessage}</p>
              <p className="text-sm text-indigo-300">نقوم بتحميل الأصوات عالية الجودة...</p>
          </div>
      )}

      {gameState.status === 'start' && !isLoading && (
        <StartScreen onStart={startGame} />
      )}

      {gameState.status === 'playing' && currentQuestion && !isLoading && (
        <GameScreen 
          gameState={gameState} 
          question={currentQuestion} 
          onAnswer={handleAnswer}
          onUseLifeline={useLifeline}
          onCorrectAnswer={prepareNextBuffer}
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