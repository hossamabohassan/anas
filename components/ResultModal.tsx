import React from 'react';
import { GameState, LEVELS, Question } from '../types';
import { Trophy, Frown, RotateCcw, Lightbulb } from 'lucide-react';
import { getEducationalHint } from '../services/mathEngine';

interface Props {
  gameState: GameState;
  onRestart: () => void;
  lastQuestion: Question | null;
}

const ResultModal: React.FC<Props> = ({ gameState, onRestart, lastQuestion }) => {
  const isWin = gameState.status === 'won';
  const score = gameState.currentLevel > 0 ? LEVELS[gameState.currentLevel - 1] : 0;
  
  const hint = (!isWin && lastQuestion) ? getEducationalHint(lastQuestion) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-gradient-to-b from-indigo-900 to-indigo-950 border-4 border-yellow-500 rounded-3xl p-6 md:p-8 max-w-lg w-full text-center shadow-2xl transform scale-100 my-8">
        
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-800 p-6 rounded-full border-4 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]">
            {isWin ? (
              <Trophy className="w-20 h-20 text-yellow-400 animate-bounce" />
            ) : (
              <Frown className="w-20 h-20 text-indigo-300" />
            )}
          </div>
        </div>

        <h2 className="text-3xl font-black text-white mb-2">
          {isWin ? "ألف مبروك يا الوليد!" : "ولا يهمك يا بطل!"}
        </h2>
        
        <p className="text-indigo-200 text-lg mb-6">
          {isWin 
            ? "لقد أثبتت أنك عبقري حقيقي في الرياضيات! Great Job!" 
            : "كل خطأ هو فرصة للتعلم. حاول مرة أخرى وستنجح."}
        </p>

        {/* Educational Section for Wrong Answers */}
        {!isWin && hint && (
            <div className="bg-indigo-800/50 rounded-2xl p-4 mb-6 text-right border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2 text-yellow-400 font-bold">
                    <Lightbulb size={24} className="animate-pulse" />
                    <span>كيف تحل هذه المسألة؟</span>
                </div>
                {lastQuestion && (
                    <div className="mb-2 text-center bg-indigo-900 rounded p-2 dir-ltr text-lg font-mono">
                         {lastQuestion.text.replace('؟', lastQuestion.correctAnswer.toString())}
                    </div>
                )}
                <p className="text-white leading-relaxed text-sm md:text-base bg-black/20 p-3 rounded-lg">
                    {hint}
                </p>
            </div>
        )}

        <div className="bg-indigo-950/50 rounded-xl p-4 mb-6">
          <p className="text-sm text-indigo-400 mb-1">الرصيد النهائي</p>
          <p className="text-4xl font-black text-yellow-400 drop-shadow-md">
            {score.toLocaleString('ar-EG')} <span className="text-lg">نقطة</span>
          </p>
        </div>

        <button
          onClick={onRestart}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-indigo-900 font-bold text-xl py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 transform hover:scale-105"
        >
          <RotateCcw size={24} />
          <span>العب مرة أخرى</span>
        </button>

      </div>
    </div>
  );
};

export default ResultModal;