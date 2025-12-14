import React, { useEffect, useState } from 'react';
import { GameState, Question, LEVELS } from '../types';
import { audioService } from '../services/audioService';
import { getQuestionAudioText, getQuestionFileName } from '../services/mathEngine';
import { Users, Phone, Star, User, XCircle } from 'lucide-react';

interface Props {
  gameState: GameState;
  question: Question;
  onAnswer: (ans: number) => void;
  onUseLifeline: (type: 'fiftyFifty' | 'askAudience' | 'callFriend') => void;
  onCorrectAnswer?: () => void; // Trigger for background loading
}

interface LifelineModalProps {
  type: 'audience' | 'friend';
  data: any;
  onClose: () => void;
}

const LifelineModal: React.FC<LifelineModalProps> = ({ type, data, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-indigo-900 border-4 border-yellow-500 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 left-4 text-indigo-300 hover:text-white">
                    <XCircle size={32} />
                </button>
                
                <h3 className="text-2xl font-bold text-yellow-400 text-center mb-6 flex items-center justify-center gap-2">
                    {type === 'audience' ? <Users size={32} /> : <Phone size={32} />}
                    {type === 'audience' ? 'رأي الجمهور' : 'اتصال بصديق'}
                </h3>

                {type === 'audience' && (
                    <div className="flex justify-around items-end h-64 gap-4 px-2">
                        {data.map((item: any, idx: number) => (
                            <div key={idx} className="flex flex-col items-center w-full group">
                                <div className="text-white font-bold mb-1 text-sm">{item.percentage}%</div>
                                <div 
                                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-1000 ease-out shadow-lg group-hover:from-blue-500 group-hover:to-blue-300"
                                    style={{ height: `${item.percentage}%` }}
                                ></div>
                                <div className="text-yellow-400 font-bold mt-2 text-xl">{item.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {type === 'friend' && (
                    <div className="text-center">
                        <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-indigo-500">
                             <User size={48} className="text-gray-500" />
                        </div>
                        <p className="text-indigo-200 mb-2">صديقك "أحمد" يقول:</p>
                        <div className="bg-white text-indigo-900 p-4 rounded-xl relative bubble font-bold text-lg mb-4">
                            "أهلاً يا أنس! سؤال ذكي مثلك. <br/>
                            أنا متأكد بنسبة 90% أن الإجابة هي <span className="text-red-600 text-2xl font-black mx-1">{data.answer}</span>."
                        </div>
                        <p className="text-sm text-yellow-400 animate-pulse">حظاً موفقاً يا بطل!</p>
                    </div>
                )}
                
                <button onClick={onClose} className="w-full bg-indigo-700 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl mt-6 transition-colors">
                    شكراً
                </button>
            </div>
        </div>
    );
};

// --- Sticker Component ---
const Sticker = ({ index }: { index: number }) => {
    // Assuming the grid is 3 columns by 5 rows (15 stickers total)
    const cols = 3;
    const rows = 5;
    
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    // Calculate percentages for background position
    const xPos = (col / (cols - 1)) * 100;
    const yPos = (row / (rows - 1)) * 100;

    return (
        <div className="relative w-64 h-64 md:w-80 md:h-80 bg-white rounded-full border-8 border-yellow-400 shadow-[0_0_60px_rgba(255,215,0,0.6)] overflow-hidden animate-zoomInUp transform hover:scale-110 transition-transform duration-500 mx-auto mt-4">
             <div 
                className="w-full h-full"
                style={{
                    backgroundImage: 'url(stickers.jpg)', // Must match file name in public folder
                    backgroundSize: `${cols * 100}% ${rows * 100}%`,
                    backgroundPosition: `${xPos}% ${yPos}%`,
                    backgroundRepeat: 'no-repeat'
                }}
             />
             {/* Shine Effect */}
             <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent rounded-full pointer-events-none"></div>
        </div>
    );
};

const CelebrationOverlay = ({ stickerIndex }: { stickerIndex: number | null }) => (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
        {/* Semi-transparent background to pop the text */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"></div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col items-center justify-center">
            
            {/* Sticker appears first/central */}
            {stickerIndex !== null && (
                <div className="mb-6 z-20">
                    <Sticker index={stickerIndex} />
                </div>
            )}

            {/* Big Name Splash */}
            <div className="text-center animate-zoomInUp transition-transform duration-500" style={{animationDelay: '0.2s'}}>
                <h1 className="text-8xl md:text-[140px] leading-tight font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-orange-400 to-red-600 drop-shadow-[0_10px_0_rgba(255,255,255,0.2)] transform -rotate-6">
                    أنس
                </h1>
                <div className="text-5xl md:text-7xl animate-bounce mt-2 drop-shadow-lg text-yellow-300 font-black stroke-black">
                     ⭐ بطل ⭐
                </div>
            </div>
        </div>

        {/* Floating Balloons */}
        <div className="absolute -bottom-40 left-[10%] text-8xl animate-float-up" style={{animationDuration: '3s'}}>🎈</div>
        <div className="absolute -bottom-40 left-[25%] text-7xl animate-float-up" style={{animationDuration: '4s', animationDelay: '0.2s'}}>🎈</div>
        <div className="absolute -bottom-40 left-[40%] text-9xl animate-float-up" style={{animationDuration: '2.5s', animationDelay: '0.5s'}}>🎉</div>
        <div className="absolute -bottom-40 right-[25%] text-8xl animate-float-up" style={{animationDuration: '3.5s', animationDelay: '0.1s'}}>🎈</div>
        <div className="absolute -bottom-40 right-[10%] text-7xl animate-float-up" style={{animationDuration: '4.5s', animationDelay: '0.3s'}}>🎈</div>

        {/* Fireworks (Expanding colored circles) */}
        <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-yellow-400 rounded-full animate-firework shadow-[0_0_50px_#facc15]"></div>
        <div className="absolute top-1/3 right-1/4 w-8 h-8 bg-purple-500 rounded-full animate-firework shadow-[0_0_50px_#a855f7]" style={{animationDelay: '0.2s'}}></div>
        <div className="absolute bottom-1/3 left-1/3 w-8 h-8 bg-green-500 rounded-full animate-firework shadow-[0_0_50px_#22c55e]" style={{animationDelay: '0.4s'}}></div>
        <div className="absolute top-1/2 right-1/3 w-8 h-8 bg-red-500 rounded-full animate-firework shadow-[0_0_50px_#ef4444]" style={{animationDelay: '0.1s'}}></div>
        <div className="absolute top-[15%] right-[10%] w-8 h-8 bg-blue-400 rounded-full animate-firework shadow-[0_0_50px_#60a5fa]" style={{animationDelay: '0.3s'}}></div>
    </div>
);

const GameScreen: React.FC<Props> = ({ gameState, question, onAnswer, onUseLifeline, onCorrectAnswer }) => {
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [answerStatus, setAnswerStatus] = useState<'correct' | 'wrong' | null>(null);
  const [hiddenAnswers, setHiddenAnswers] = useState<number[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeLifelineModal, setActiveLifelineModal] = useState<{type: 'audience' | 'friend', data: any} | null>(null);
  const [stickerIndex, setStickerIndex] = useState<number | null>(null);

  // Initialize music and question reading
  useEffect(() => {
    setSelectedAns(null);
    setAnswerStatus(null);
    setHiddenAnswers([]);
    setShowCelebration(false);
    setStickerIndex(null);
    setActiveLifelineModal(null);
    
    // Stop any previous music and start suspense loop
    audioService.startSuspenseMusic();
    
    // REDUCED DELAY: from 1000ms to 300ms because we are preloading audio now
    const timer = setTimeout(() => {
        const qText = getQuestionAudioText(question);
        const filename = getQuestionFileName(question);
        audioService.speak(qText, 'ar-SA', filename);
    }, 300);
    
    return () => {
        clearTimeout(timer);
        audioService.stopSuspenseMusic();
    }
  }, [question]);

  const handleAnswerClick = (ans: number) => {
    if (selectedAns !== null) return; 
    
    setSelectedAns(ans);
    audioService.stopSuspenseMusic();
    
    if (ans === question.correctAnswer) {
      setAnswerStatus('correct');
      if (onCorrectAnswer) onCorrectAnswer();

      setStickerIndex(Math.floor(Math.random() * 15));
      setShowCelebration(true); 
      
      audioService.playCelebrationMusic();
      audioService.encourageAnas(true);
      
      setTimeout(() => {
        onAnswer(ans);
      }, 5000); 
    } else {
      setAnswerStatus('wrong');
      audioService.playWrongSound();
      audioService.encourageAnas(false);
      setTimeout(() => {
        onAnswer(ans);
      }, 3000);
    }
  };

  const handleFiftyFifty = () => {
    onUseLifeline('fiftyFifty');
    const wrongAnswers = question.answers.filter(a => a !== question.correctAnswer);
    const shuffled = wrongAnswers.sort(() => 0.5 - Math.random());
    setHiddenAnswers([shuffled[0], shuffled[1]]);
    audioService.playDing();
  };

  const handleAskAudience = () => {
      onUseLifeline('askAudience');
      audioService.playDing();
      
      const data = question.answers.map((ans, idx) => {
          let percentage = 0;
          if (ans === question.correctAnswer) {
              percentage = Math.floor(Math.random() * (90 - 60) + 60);
          } else {
              percentage = Math.floor(Math.random() * 15);
          }
          return { label: ['أ', 'ب', 'ج', 'د'][idx], percentage, ans };
      });
      
      const total = data.reduce((acc, curr) => acc + curr.percentage, 0);
      data.forEach(d => d.percentage = Math.floor((d.percentage / total) * 100));
      
      setActiveLifelineModal({ type: 'audience', data });
  };

  const handleCallFriend = () => {
      onUseLifeline('callFriend');
      audioService.playDing();
      const friendAns = Math.random() > 0.1 ? question.correctAnswer : question.answers.find(a => a !== question.correctAnswer);
      setActiveLifelineModal({ type: 'friend', data: { answer: friendAns }});
  };

  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto p-4 md:flex-row gap-6">
      
      {showCelebration && <CelebrationOverlay stickerIndex={stickerIndex} />}
      
      {activeLifelineModal && (
          <LifelineModal 
            type={activeLifelineModal.type} 
            data={activeLifelineModal.data} 
            onClose={() => setActiveLifelineModal(null)} 
          />
      )}

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col justify-center items-center order-2 md:order-1 relative z-10">
        
        {/* Lifelines Bar */}
        <div className="flex gap-4 mb-6">
          <button 
            disabled={!gameState.lifelines.fiftyFifty}
            onClick={handleFiftyFifty}
            className={`flex flex-col items-center p-3 rounded-full border-4 transition-all transform hover:scale-110 active:scale-95 ${!gameState.lifelines.fiftyFifty ? 'opacity-40 grayscale border-gray-600 bg-gray-800' : 'border-blue-400 bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'}`}
            title="حذف إجابتين"
          >
            <span className="text-white font-black text-xl">50:50</span>
          </button>
          
          <button 
            disabled={!gameState.lifelines.askAudience}
            onClick={handleAskAudience}
            className={`flex flex-col items-center p-3 rounded-full border-4 transition-all transform hover:scale-110 active:scale-95 ${!gameState.lifelines.askAudience ? 'opacity-40 grayscale border-gray-600 bg-gray-800' : 'border-purple-400 bg-purple-600 hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]'}`}
            title="رأي الجمهور"
          >
            <Users className="text-white" />
          </button>

          <button 
             disabled={!gameState.lifelines.callFriend}
             onClick={handleCallFriend}
             className={`flex flex-col items-center p-3 rounded-full border-4 transition-all transform hover:scale-110 active:scale-95 ${!gameState.lifelines.callFriend ? 'opacity-40 grayscale border-gray-600 bg-gray-800' : 'border-green-400 bg-green-600 hover:bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]'}`}
             title="اتصال بصديق"
          >
            <Phone className="text-white" />
          </button>
        </div>

        {/* Question Box */}
        <div className="w-full bg-indigo-900/90 backdrop-blur-md border-[6px] border-yellow-400 rounded-[30px] p-8 mb-8 text-center shadow-[0_10px_0_rgba(0,0,0,0.3)] relative animate-float">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-indigo-900 px-6 py-2 rounded-full font-black text-xl border-4 border-indigo-900 shadow-lg">
                سؤال رقم {gameState.currentLevel + 1}
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-white dir-ltr font-mono drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]" style={{ direction: 'ltr' }}>
              {question.text}
            </h2>
        </div>

        {/* Answers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full px-2 md:px-10">
          {question.answers.map((ans, idx) => {
            if (hiddenAnswers.includes(ans)) {
                return <div key={idx} className="invisible"></div>
            }

            let bgClass = "bg-gradient-to-b from-indigo-600 to-indigo-800 border-indigo-400 hover:from-indigo-500 hover:to-indigo-700 hover:border-yellow-300";
            if (selectedAns === ans) {
                if (answerStatus === 'correct') bgClass = "bg-gradient-to-b from-green-500 to-green-700 border-green-300 animate-pulse scale-105 shadow-[0_0_30px_rgba(34,197,94,0.6)]";
                else if (answerStatus === 'wrong') bgClass = "bg-gradient-to-b from-red-500 to-red-700 border-red-300 animate-shake";
                else bgClass = "bg-gradient-to-b from-yellow-500 to-yellow-700 border-yellow-300 scale-105";
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswerClick(ans)}
                disabled={selectedAns !== null}
                className={`relative w-full py-5 px-8 rounded-2xl border-4 text-3xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0 flex justify-between items-center group overflow-hidden ${bgClass}`}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <span className="text-yellow-300 group-hover:text-white text-2xl">{['أ', 'ب', 'ج', 'د'][idx]}</span>
                <span className="flex-1 text-center font-mono drop-shadow-md">{ans}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Money Ladder (Sidebar) */}
      <div className="hidden md:flex flex-col justify-center w-72 bg-indigo-950/80 backdrop-blur-md rounded-3xl p-4 border-2 border-indigo-700 order-2 shadow-2xl z-10">
        <h3 className="text-center text-yellow-400 font-bold mb-4 text-xl border-b border-indigo-700 pb-2">سلم المليونير</h3>
        <div className="flex flex-col-reverse gap-1 overflow-y-auto">
          {LEVELS.map((amount, idx) => {
            const isCurrent = idx === gameState.currentLevel;
            const isPast = idx < gameState.currentLevel;
            const isMilestone = amount === 1000 || amount === 32000 || amount === 1000000;
            
            return (
              <div 
                key={idx}
                className={`flex justify-between items-center px-4 py-2 rounded-xl transition-all ${isCurrent ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-indigo-900 font-black scale-105 shadow-md -mx-2 z-10' : isPast ? 'text-green-400 bg-indigo-900/30' : isMilestone ? 'text-white font-bold bg-white/5' : 'text-indigo-400'}`}
              >
                <span className="text-xs opacity-70">{idx + 1}</span>
                <span className={`${isCurrent ? 'text-xl' : 'text-md'}`}>
                  {amount.toLocaleString('ar-EG')} <span className="text-xs">💰</span>
                </span>
                {isCurrent && <Star size={20} className="text-indigo-900 animate-spin-slow" fill="currentColor" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Level Indicator */}
      <div className="md:hidden fixed top-4 left-4 bg-indigo-900/90 backdrop-blur px-4 py-2 rounded-full border-2 border-yellow-500 text-yellow-400 font-bold text-lg shadow-lg z-50 flex items-center gap-2">
         <Star size={16} fill="currentColor" />
         {LEVELS[gameState.currentLevel].toLocaleString()}
      </div>
    </div>
  );
};

export default GameScreen;