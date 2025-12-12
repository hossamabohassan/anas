import React, { useEffect } from 'react';
import { Difficulty, Operation } from '../types';
import { GraduationCap, Calculator, Divide, X, Plus, Minus, Play, Sparkles } from 'lucide-react';
import { audioService } from '../services/audioService';

interface Props {
  onStart: (op: Operation, diff: Difficulty) => void;
}

const StartScreen: React.FC<Props> = ({ onStart }) => {
  const [selectedOp, setSelectedOp] = React.useState<Operation>('multiplication');
  const [selectedDiff, setSelectedDiff] = React.useState<Difficulty>(Difficulty.MEDIUM);

  useEffect(() => {
    // Attempt to play music when screen loads (might require interaction in some browsers)
    const timer = setTimeout(() => {
        audioService.playIntroMusic();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
      audioService.playDing(); // Affirmation sound
      onStart(selectedOp, selectedDiff);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center space-y-6 animate-fadeIn relative z-10">
      
      {/* Logo Area with playful animation */}
      <div className="relative group cursor-default animate-float">
        <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full blur opacity-60 animate-pulse"></div>
        <div className="relative bg-white rounded-full p-6 border-8 border-yellow-400 shadow-2xl">
           <span className="text-6xl filter drop-shadow-lg">💰</span>
        </div>
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-indigo-900 font-bold px-3 py-1 rounded-full animate-bounce">
            جديد!
        </div>
      </div>
      
      <div>
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-500 mb-2 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
          الوليد المليونير
        </h1>
        <p className="text-yellow-200 text-2xl font-bold drop-shadow-md">
          <Sparkles className="inline w-6 h-6 ml-2 text-yellow-400 animate-spin-slow" />
          رحلة المليون مع العبقري الصغير
          <Sparkles className="inline w-6 h-6 mr-2 text-yellow-400 animate-spin-slow" />
        </p>
      </div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl p-6 border-2 border-yellow-500/50 shadow-2xl relative overflow-hidden">
        {/* Decorative background circle */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob"></div>
        
        {/* Operation Selection */}
        <div className="mb-6 relative">
          <h3 className="text-xl font-bold text-white mb-3 bg-indigo-900/50 inline-block px-4 py-1 rounded-full border border-indigo-400">ماذا سنلعب اليوم؟</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
                { id: 'multiplication', icon: X, label: 'جدول الضرب', color: 'bg-red-500' },
                { id: 'division', icon: Divide, label: 'القسمة', color: 'bg-blue-500' },
                { id: 'addition', icon: Plus, label: 'الجمع', color: 'bg-green-500' },
                { id: 'subtraction', icon: Minus, label: 'الطرح', color: 'bg-orange-500' }
            ].map((op) => (
                <button 
                  key={op.id}
                  onClick={() => {
                      setSelectedOp(op.id as Operation);
                      audioService.playDing();
                  }}
                  className={`flex items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-300 transform ${selectedOp === op.id ? `${op.color} scale-105 shadow-lg border-2 border-white ring-4 ring-white/20` : 'bg-indigo-900/60 hover:bg-indigo-800'}`}
                >
                  <op.icon size={24} className="text-white" strokeWidth={3} /> 
                  <span className="font-bold text-lg">{op.label}</span>
                </button>
            ))}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-white mb-3 bg-indigo-900/50 inline-block px-4 py-1 rounded-full border border-indigo-400">مستوى التحدي</h3>
          <div className="flex justify-between gap-3 bg-indigo-950/40 p-2 rounded-2xl">
            {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map((diff) => (
              <button
                key={diff}
                onClick={() => {
                    setSelectedDiff(diff);
                    audioService.playDing();
                }}
                className={`flex-1 py-3 rounded-xl text-md font-bold transition-all ${selectedDiff === diff ? 'bg-yellow-400 text-indigo-900 shadow-lg transform -translate-y-1' : 'text-indigo-300 hover:text-white hover:bg-white/10'}`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleStart}
          className="w-full bg-gradient-to-b from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white font-black text-3xl py-5 rounded-2xl shadow-[0_6px_0_rgb(21,128,61)] active:shadow-[0_3px_0_rgb(21,128,61)] active:translate-y-1 transition-all flex items-center justify-center gap-3 group border-t-2 border-green-300"
        >
          <span>ابدأ يا بطل</span>
          <Play className="group-hover:translate-x-1 transition-transform fill-current" size={32} />
        </button>

      </div>
    </div>
  );
};

export default StartScreen;