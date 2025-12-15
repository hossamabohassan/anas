import React, { useEffect, useState } from 'react';
import { Difficulty, Operation } from '../types';
import { Divide, X, Plus, Minus, Play, Sparkles, Grid3X3, Settings } from 'lucide-react';
import { audioService, PHRASES } from '../services/audioService';

// --- Anas Grid Image Component (Same as Sticker) ---
const AnasGridImage = ({ index }: { index: number }) => {
    // Assuming the grid is 3 columns by 5 rows (15 images total)
    const cols = 3;
    const rows = 5;
    
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    // Calculate percentages for background position
    const xPos = (col / (cols - 1)) * 100;
    const yPos = (row / (rows - 1)) * 100;

    return (
        <div 
            className="w-full h-full"
            style={{
                backgroundImage: 'url(stickers.jpg)', // Must match file name in public folder
                backgroundSize: `${cols * 100}% ${rows * 100}%`,
                backgroundPosition: `${xPos}% ${yPos}%`,
                backgroundRepeat: 'no-repeat'
            }}
        />
    );
};

interface Props {
  onStart: (op: Operation, diff: Difficulty, table: number | null) => void;
  onOpenGenerator: () => void; // New Prop
}

const StartScreen: React.FC<Props> = ({ onStart, onOpenGenerator }) => {
  const [selectedOp, setSelectedOp] = useState<Operation>('addition');
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>(Difficulty.EASY);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  
  // Random image from grid (same as stickers - 3 cols × 5 rows = 15 images)
  const [randomImageIndex, setRandomImageIndex] = useState(() => Math.floor(Math.random() * 15));

  useEffect(() => {
    // Initialize audio context on first user interaction
    const initAudio = () => {
      // Preload and play Anas's intro audio
      const playIntro = async () => {
        // Preload the intro audio file first
        await audioService.preload(PHRASES.ANAS_WELCOME, 'ar-SA', 'intro_anas.mp3');
        
        // Play intro music
        audioService.playIntroMusic();
        
        // Play voice after a short delay so it mixes with music
        setTimeout(() => {
          audioService.speak(PHRASES.ANAS_WELCOME, 'ar-SA', 'intro_anas.mp3');
        }, 500);
      };
      
      playIntro();
    };

    // Try to initialize on mount (may fail due to autoplay policy)
    const timer = setTimeout(() => {
      initAudio();
    }, 300);

    // Also initialize on first user interaction
    const handleInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const handleStart = () => {
      audioService.playDing();
      onStart(selectedOp, selectedDiff, selectedTable);
  };

  const isTableOperation = selectedOp === 'multiplication' || selectedOp === 'division';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center space-y-4 animate-fadeIn relative z-10">
      
      {/* Settings Button (Hidden access for generator) */}
      <button 
        onClick={onOpenGenerator}
        className="absolute top-4 left-4 text-indigo-400 hover:text-white transition-colors opacity-50 hover:opacity-100"
        title="إعدادات الصوت"
      >
          <Settings size={24} />
      </button>

      {/* Image / Logo Area - Random from Grid */}
      <div className="relative group cursor-default animate-float mb-4">
        <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full blur opacity-60 animate-pulse"></div>
        <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full border-8 border-yellow-400 shadow-2xl overflow-hidden bg-white">
          {/* Grid Image Component */}
          <AnasGridImage index={randomImageIndex} />
          {/* Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent rounded-full pointer-events-none"></div>
        </div>
      </div>
      
      <div>
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-500 mb-2 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
          أنس المليونير
        </h1>
        <p className="text-indigo-200 text-lg md:text-2xl font-bold drop-shadow-md flex items-center justify-center gap-2">
          <Sparkles className="text-yellow-400 animate-spin-slow" />
          مرحباً يا أنس، جاهز نلعب ونتعلم؟
          <Sparkles className="text-yellow-400 animate-spin-slow" />
        </p>
      </div>

      <div className="w-full max-w-2xl bg-white/10 backdrop-blur-xl rounded-3xl p-6 border-2 border-yellow-500/50 shadow-2xl relative overflow-hidden mt-4">
        
        {/* Operation Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-3 bg-indigo-900/50 inline-block px-4 py-1 rounded-full border border-indigo-400">اختر نوع المسابقة</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
                { id: 'addition', icon: Plus, label: 'جمع', color: 'bg-green-500' },
                { id: 'subtraction', icon: Minus, label: 'طرح', color: 'bg-orange-500' },
                { id: 'multiplication', icon: X, label: 'ضرب', color: 'bg-red-500' },
                { id: 'division', icon: Divide, label: 'قسمة', color: 'bg-blue-500' }
            ].map((op) => (
                <button 
                  key={op.id}
                  onClick={() => {
                      setSelectedOp(op.id as Operation);
                      setSelectedTable(null); // Reset table selection when changing Op
                      audioService.playDing();
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 transform ${selectedOp === op.id ? `${op.color} scale-105 shadow-lg border-2 border-white` : 'bg-indigo-900/60 hover:bg-indigo-800'}`}
                >
                  <op.icon size={28} className="text-white mb-1" strokeWidth={3} /> 
                  <span className="font-bold text-md">{op.label}</span>
                </button>
            ))}
          </div>
        </div>

        {/* Table Selection (Only for Mult/Div) */}
        {isTableOperation && (
            <div className="mb-6 animate-zoomInUp">
                <h3 className="text-lg font-bold text-white mb-3 bg-indigo-900/50 inline-block px-4 py-1 rounded-full border border-indigo-400">
                    {selectedOp === 'multiplication' ? 'أي جدول تريد؟' : 'القسمة على رقم؟'}
                </h3>
                <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                    {/* Numbers 2 to 9 */}
                    {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => { setSelectedTable(num); audioService.playDing(); }}
                            className={`py-3 rounded-xl font-black text-xl transition-all ${selectedTable === num ? 'bg-yellow-400 text-indigo-900 scale-110 ring-2 ring-white' : 'bg-indigo-800 text-indigo-200 hover:bg-indigo-700'}`}
                        >
                            {num}
                        </button>
                    ))}
                    {/* Mixed Option */}
                    <button
                        onClick={() => { setSelectedTable(null); audioService.playDing(); }}
                        className={`col-span-4 md:col-span-1 py-3 rounded-xl font-bold text-md transition-all flex items-center justify-center gap-1 ${selectedTable === null ? 'bg-purple-500 text-white ring-2 ring-white' : 'bg-indigo-800 text-indigo-200 hover:bg-indigo-700'}`}
                    >
                        <Grid3X3 size={16} />
                        كوكتيل
                    </button>
                </div>
            </div>
        )}

        {/* Difficulty (Only if not mixing tables, or for Add/Sub) */}
        {!isTableOperation && (
            <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-3 bg-indigo-900/50 inline-block px-4 py-1 rounded-full border border-indigo-400">مستوى الصعوبة</h3>
            <div className="flex justify-between gap-3 bg-indigo-950/40 p-2 rounded-2xl">
                {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map((diff) => (
                <button
                    key={diff}
                    onClick={() => { setSelectedDiff(diff); audioService.playDing(); }}
                    className={`flex-1 py-2 rounded-xl text-md font-bold transition-all ${selectedDiff === diff ? 'bg-yellow-400 text-indigo-900 shadow-lg' : 'text-indigo-300 hover:bg-white/10'}`}
                >
                    {diff}
                </button>
                ))}
            </div>
            </div>
        )}

        <button 
          onClick={handleStart}
          className="w-full bg-gradient-to-b from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white font-black text-2xl py-4 rounded-2xl shadow-[0_6px_0_rgb(21,128,61)] active:shadow-[0_3px_0_rgb(21,128,61)] active:translate-y-1 transition-all flex items-center justify-center gap-3 group border-t-2 border-green-300 mt-4"
        >
          <span>ابدأ التحدي</span>
          <Play className="group-hover:translate-x-1 transition-transform fill-current" size={28} />
        </button>

      </div>
    </div>
  );
};

export default StartScreen;
