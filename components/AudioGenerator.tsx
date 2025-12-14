import React, { useState, useRef } from 'react';
import { audioService, PHRASES } from '../services/audioService';
import { getQuestionAudioText } from '../services/mathEngine';
import { ArrowLeft, Download, CheckCircle, Globe, Zap, CheckSquare, Square, Music, Calculator } from 'lucide-react';
import JSZip from 'jszip';

interface Props {
    onClose: () => void;
}

type Provider = 'gemini' | 'elevenlabs';

const AudioGenerator: React.FC<Props> = ({ onClose }) => {
    const [progress, setProgress] = useState(0);
    const [total, setTotal] = useState(0);
    const [status, setStatus] = useState<'idle' | 'generating' | 'zipping' | 'done'>('idle');
    const [log, setLog] = useState<string[]>([]);
    const [provider, setProvider] = useState<Provider>('gemini');
    const [elevenLabsKey, setElevenLabsKey] = useState('');
    
    // Selection State
    const [includeMath, setIncludeMath] = useState(false);
    const [includePhrases, setIncludePhrases] = useState(true);
    
    // Use Ref for cancellation to ensure immediate effect inside the async loop
    const cancelRef = useRef(false);

    // Helper to convert Blob to Base64
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove data url prefix (e.g. "data:audio/mpeg;base64,")
                const base64 = base64String.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const generateElevenLabs = async (text: string): Promise<string | null> => {
        try {
            // Using "Rachel" (21m00Tcm4TlvDq8ikWAM) or similar.
            // For a more enthusiastic male voice, consider finding a "Hype" voice ID.
            // Here we tune the settings for maximum expressiveness.
            const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 
            
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
                method: 'POST',
                headers: {
                    'xi-api-key': elevenLabsKey,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_multilingual_v2", 
                    voice_settings: {
                        stability: 0.40,       // Lower stability = more emotion/range
                        similarity_boost: 0.75,
                        style: 0.55,           // Higher style = more exaggeration/enthusiasm
                        use_speaker_boost: true
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                console.error("ElevenLabs Error:", err);
                return null;
            }

            const blob = await response.blob();
            return await blobToBase64(blob);
        } catch (e) {
            console.error("ElevenLabs Fetch Error", e);
            return null;
        }
    };

    const generateAll = async () => {
        if (provider === 'elevenlabs' && !elevenLabsKey) {
            setLog(prev => ["⚠️ يرجى إدخال مفتاح ElevenLabs أولاً", ...prev]);
            return;
        }

        if (!includeMath && !includePhrases) {
            setLog(prev => ["⚠️ يرجى اختيار نوع واحد على الأقل (مسائل أو عبارات)", ...prev]);
            return;
        }

        setStatus('generating');
        cancelRef.current = false;
        const zip = new JSZip();
        
        // Define all questions to generate
        const tasks: { filename: string, text: string }[] = [];

        // --- 1. Math Questions (Conditional) ---
        if (includeMath) {
            // Multiplication Tables (2 to 9) x (1 to 10)
            for (let i = 2; i <= 9; i++) {
                for (let j = 1; j <= 10; j++) {
                    const q = { 
                        text: `${i} × ${j} = ؟`, 
                        operandA: i, 
                        operandB: j, 
                        correctAnswer: i*j, 
                        answers: [], 
                        isMissingOperand: false 
                    };
                    tasks.push({
                        filename: `math_mul_${i}_${j}.mp3`,
                        text: getQuestionAudioText(q)
                    });
                    
                    if (i !== j) {
                        tasks.push({
                            filename: `math_mul_${j}_${i}.mp3`,
                            text: getQuestionAudioText({ ...q, text: `${j} × ${i} = ؟` }) 
                        });
                    }
                }
            }

            // Division Tables
            for (let divisor = 2; divisor <= 9; divisor++) {
                for (let res = 1; res <= 10; res++) {
                    const dividend = divisor * res;
                    const q = {
                        text: `${dividend} ÷ ${divisor} = ؟`,
                        operandA: dividend,
                        operandB: divisor,
                        correctAnswer: res,
                        answers: [],
                        isMissingOperand: false
                    };
                    tasks.push({
                        filename: `math_div_${dividend}_${divisor}.mp3`,
                        text: getQuestionAudioText(q)
                    });
                }
            }
        }

        // --- 2. Celebration & Phrases (Conditional) ---
        if (includePhrases) {
            // English Celebration
            PHRASES.EN_CELEBRATION.forEach((text, index) => {
                tasks.push({
                    filename: `encourage_en_US_${index}.mp3`,
                    text: text
                });
            });

            // Arabic Celebration
            PHRASES.AR_CELEBRATION.forEach((text, index) => {
                tasks.push({
                    filename: `encourage_ar_SA_${index}.mp3`,
                    text: text
                });
            });

            // Special Phrase
            tasks.push({
                filename: `encourage_special_1.mp3`,
                text: "يا أنس، أنت مبدع حقاً"
            });

            // Arabic Wrong
            PHRASES.AR_WRONG.forEach((text, index) => {
                tasks.push({
                    filename: `wrong_ar_SA_${index}.mp3`,
                    text: text
                });
            });

            // Generic Intro
            tasks.push({
                filename: `intro_generic.mp3`,
                text: PHRASES.GENERIC_INTRO
            });
        }


        setTotal(tasks.length);
        let completed = 0;

        for (const task of tasks) {
            if (cancelRef.current) break;

            let success = false;
            let retries = 0;
            const maxRetries = 3;

            while (!success && retries <= maxRetries) {
                if (cancelRef.current) break;

                // Delay Logic
                let delay = 100; // Default fast for ElevenLabs
                
                if (provider === 'gemini') {
                    // Gemini rate limit logic
                    delay = retries > 0 ? 65000 : 6000;
                } else {
                    // ElevenLabs is fast, but let's be polite (3 requests per second max)
                    delay = 400; 
                }

                if (retries > 0) {
                     setLog(prev => [`⚠️ خطأ (محاولة ${retries}/${maxRetries})...`, ...prev].slice(0, 5));
                     if (provider === 'gemini') {
                         setLog(prev => [`انتظار 65 ثانية لتجديد رصيد Gemini...`, ...prev].slice(0, 5));
                     }
                } else {
                     setLog(prev => [`Generating: ${task.filename}...`, ...prev].slice(0, 5));
                }

                await new Promise(r => setTimeout(r, delay));
                if (cancelRef.current) break;

                let base64: string | null = null;
                
                if (provider === 'gemini') {
                    base64 = await audioService.generateRawAudio(task.text);
                } else {
                    base64 = await generateElevenLabs(task.text);
                }
                
                if (base64) {
                    zip.file(task.filename, base64, { base64: true });
                    success = true;
                } else {
                    retries++;
                }
            }
            
            if (!success && !cancelRef.current) {
                setLog(prev => [`❌ فشل نهائي: ${task.filename}`, ...prev]);
            }
            
            completed++;
            setProgress(completed);
        }

        if (cancelRef.current) {
            setStatus('idle');
            setLog(prev => [`تم إلغاء العملية.`, ...prev]);
            return;
        }

        setStatus('zipping');
        const content = await zip.generateAsync({ type: "blob" });
        
        // Trigger Download
        const url = window.URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = includeMath ? "anas_full_audio.zip" : "anas_phrases_audio.zip";
        a.click();
        
        setStatus('done');
    };

    const handleCancel = () => {
        cancelRef.current = true;
        setLog(prev => [`جاري الإلغاء...`, ...prev]);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-indigo-950 flex flex-col items-center justify-center p-6 animate-fadeIn overflow-y-auto">
            <div className="bg-indigo-900 border-2 border-yellow-500 rounded-3xl p-8 max-w-2xl w-full shadow-2xl my-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Download className="text-yellow-400" />
                        توليد مكتبة الأصوات
                    </h2>
                    <button onClick={onClose} className="text-indigo-300 hover:text-white">
                        <ArrowLeft />
                    </button>
                </div>

                {status === 'idle' && (
                    <div className="space-y-6">
                        {/* Provider Selection */}
                        <div className="bg-indigo-950/50 p-4 rounded-xl border border-indigo-700">
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                1. اختر مزود الخدمة:
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setProvider('gemini')}
                                    className={`p-4 rounded-xl border-2 text-center transition-all ${provider === 'gemini' ? 'border-yellow-400 bg-indigo-800' : 'border-indigo-700 hover:bg-indigo-800/50'}`}
                                >
                                    <Globe className={`w-8 h-8 mx-auto mb-2 ${provider === 'gemini' ? 'text-yellow-400' : 'text-gray-400'}`} />
                                    <div className="font-bold text-white">Google Gemini</div>
                                    <div className="text-xs text-indigo-300 mt-1">مجاني - بطيء</div>
                                </button>

                                <button 
                                    onClick={() => setProvider('elevenlabs')}
                                    className={`p-4 rounded-xl border-2 text-center transition-all ${provider === 'elevenlabs' ? 'border-yellow-400 bg-indigo-800' : 'border-indigo-700 hover:bg-indigo-800/50'}`}
                                >
                                    <Zap className={`w-8 h-8 mx-auto mb-2 ${provider === 'elevenlabs' ? 'text-yellow-400' : 'text-gray-400'}`} />
                                    <div className="font-bold text-white">ElevenLabs</div>
                                    <div className="text-xs text-indigo-300 mt-1">جودة واحتفالية عالية</div>
                                </button>
                            </div>
                        </div>

                        {/* Content Selection */}
                         <div className="bg-indigo-950/50 p-4 rounded-xl border border-indigo-700">
                            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                2. ماذا تريد أن تولد؟
                            </h3>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setIncludePhrases(!includePhrases)}
                                    className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-3 transition-colors ${includePhrases ? 'bg-green-600/20 border-green-500 text-green-300' : 'bg-indigo-900 border-indigo-600 text-gray-400'}`}
                                >
                                    {includePhrases ? <CheckSquare /> : <Square />}
                                    <div className="text-right">
                                        <div className="font-bold">عبارات وتشجيع</div>
                                        <div className="text-xs opacity-70">الاحتفال، الخطأ، المقدمة (سريع)</div>
                                    </div>
                                    <Music size={20} />
                                </button>

                                <button 
                                    onClick={() => setIncludeMath(!includeMath)}
                                    className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-3 transition-colors ${includeMath ? 'bg-green-600/20 border-green-500 text-green-300' : 'bg-indigo-900 border-indigo-600 text-gray-400'}`}
                                >
                                    {includeMath ? <CheckSquare /> : <Square />}
                                    <div className="text-right">
                                        <div className="font-bold">مسائل الرياضيات</div>
                                        <div className="text-xs opacity-70">الجداول كاملة (يأخذ وقتاً)</div>
                                    </div>
                                    <Calculator size={20} />
                                </button>
                            </div>
                        </div>

                        {/* ElevenLabs Settings */}
                        {provider === 'elevenlabs' && (
                            <div className="bg-indigo-800/30 p-4 rounded-xl animate-fadeIn">
                                <label className="block text-indigo-200 text-sm mb-2 font-bold">
                                    مفتاح API الخاص بـ ElevenLabs:
                                </label>
                                <input 
                                    type="text" 
                                    value={elevenLabsKey}
                                    onChange={(e) => setElevenLabsKey(e.target.value)}
                                    placeholder="أدخل مفتاح الـ API هنا..."
                                    className="w-full bg-indigo-950 border border-indigo-600 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-400 text-left dir-ltr"
                                    style={{ direction: 'ltr' }}
                                />
                                <p className="text-xs text-indigo-400 mt-2 flex items-center gap-1">
                                    <Zap size={12} className="text-yellow-400" />
                                    تم ضبط الإعدادات لتكون الشخصية حماسية واحتفالية (Stability: 0.4, Style: 0.55).
                                </p>
                            </div>
                        )}

                        <button 
                            onClick={generateAll}
                            disabled={provider === 'elevenlabs' && !elevenLabsKey}
                            className={`w-full font-bold py-4 rounded-xl shadow-lg transition-transform flex justify-center items-center gap-2 ${
                                (provider === 'elevenlabs' && !elevenLabsKey) 
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                : 'bg-green-600 hover:bg-green-500 hover:scale-105 text-white'
                            }`}
                        >
                            <Download />
                            {includeMath && includePhrases ? 'توليد الكل (قد يستغرق وقتاً)' : 'توليد المحدد فقط'}
                        </button>
                    </div>
                )}

                {(status === 'generating' || status === 'zipping') && (
                    <div className="space-y-4">
                        <div className="flex justify-between text-white font-bold">
                            <span>جاري المعالجة...</span>
                            <span>{Math.round((progress / total) * 100)}%</span>
                        </div>
                        <div className="w-full bg-indigo-950 rounded-full h-4 overflow-hidden">
                            <div 
                                className="bg-yellow-400 h-full transition-all duration-300"
                                style={{ width: `${(progress / total) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-center text-indigo-300 animate-pulse">
                            {status === 'zipping' ? 'جاري ضغط الملفات...' : `${progress} / ${total}`}
                        </p>
                        
                        <button 
                            onClick={handleCancel}
                            className="text-red-400 text-sm hover:text-red-300 border border-red-400/30 rounded-lg px-4 py-2 block mx-auto mt-4 transition-colors hover:bg-red-400/10"
                        >
                            إلغاء العملية
                        </button>
                    </div>
                )}

                {status === 'done' && (
                    <div className="text-center space-y-4">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                        <h3 className="text-2xl font-bold text-white">تمت العملية بنجاح!</h3>
                        <p className="text-indigo-200">تم تحميل الملف. لا تنسَ نقل الملفات إلى مجلد <code>public/audio</code>.</p>
                        <button onClick={onClose} className="bg-indigo-700 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg">
                            عودة
                        </button>
                    </div>
                )}

                {/* Logs */}
                <div className="mt-6 bg-black/30 rounded-lg p-3 h-32 overflow-hidden text-xs font-mono text-indigo-300">
                    {log.map((l, i) => <div key={i}>{l}</div>)}
                </div>
            </div>
        </div>
    );
};

export default AudioGenerator;