import { GoogleGenAI } from "@google/genai";

// --- Exported Constants for Static Generation ---
export const PHRASES = {
    EN_CELEBRATION: [
        "Great Anas!",
        "Bravo Anas!",
        "Excellent work!",
        "You are amazing Anas!"
    ],
    AR_CELEBRATION: [
        "الله عليك يا أنس!",
        "شاطر يا بطل!",
        "ممتاز يا عبقري!",
        "إجابة روعة يا مليونير!"
    ],
    AR_WRONG: [
        "ولا يهمك يا أنس، فكر تاني",
        "قريب جداً، تعال نشوف الحل الصح",
        "حاول مرة تانية يا بطل"
    ],
    GENERIC_INTRO: "أهلاً بك يا أنس في مسابقة العباقرة",
    ANAS_WELCOME: "مرحباً يا أنس، جاهز نلعب شوية ونتعلم الحساب؟"
};

class AudioService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private audioContext: AudioContext | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGainNodes: GainNode[] = [];
  private suspenseInterval: any = null;
  
  // In-memory cache for current session speed
  private memoryCache: Map<string, AudioBuffer> = new Map();
  private genAI: GoogleGenAI | null = null;
  private pendingRequests: Map<string, Promise<void>> = new Map();

  // IndexedDB Configuration
  private dbName = 'AnasMathAudioDB';
  private storeName = 'audio_store';
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
      };
    }

    // Initialize Gemini API (Only used for the Generator Tool, not for runtime gameplay anymore)
    try {
      // Vite uses import.meta.env for environment variables
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY;
      if (apiKey) {
        this.genAI = new GoogleGenAI({ apiKey });
      }
    } catch (e) {
      console.warn("Gemini API Key not found");
    }

    // Initialize Database
    this.initDB();
  }

  // --- IndexedDB Implementation ---
  
  private initDB() {
      if (typeof window === 'undefined' || !window.indexedDB) return;
      
      this.dbPromise = new Promise((resolve, reject) => {
          const request = window.indexedDB.open(this.dbName, 1);
          
          request.onerror = () => {
              console.warn("Failed to open IndexedDB");
              reject(request.error);
          };
          
          request.onsuccess = () => {
              resolve(request.result);
          };
          
          request.onupgradeneeded = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              if (!db.objectStoreNames.contains(this.storeName)) {
                  db.createObjectStore(this.storeName);
              }
          };
      });
  }

  private async getFromDiskCache(key: string): Promise<string | null> {
      if (!this.dbPromise) return null;
      try {
          const db = await this.dbPromise;
          return new Promise((resolve) => {
              const transaction = db.transaction([this.storeName], 'readonly');
              const store = transaction.objectStore(this.storeName);
              const request = store.get(key);
              
              request.onsuccess = () => {
                  resolve(request.result as string || null);
              };
              request.onerror = () => {
                  resolve(null);
              };
          });
      } catch (e) {
          console.warn("Error reading from IDB", e);
          return null;
      }
  }

  private async saveToDiskCache(key: string, base64Data: string): Promise<void> {
      if (!this.dbPromise) return;
      try {
          const db = await this.dbPromise;
          const transaction = db.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          store.put(base64Data, key);
      } catch (e) {
          console.warn("Error saving to IDB", e);
      }
  }

  // --- Audio Context & Helpers ---

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    }
    // Resume if suspended (required by browser autoplay policy)
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume().catch(err => {
        console.warn('AudioContext resume failed:', err);
      });
    }
  }

  private decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  // --- Sound Management ---

  public stopAllSounds() {
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch(e) {}
    });
    this.activeGainNodes.forEach(gain => {
        try { gain.disconnect(); } catch(e) {}
    });
    this.activeOscillators = [];
    this.activeGainNodes = [];
    
    if (this.suspenseInterval) {
        clearInterval(this.suspenseInterval);
        this.suspenseInterval = null;
    }
    if (this.synth.speaking) {
        this.synth.cancel();
    }
  }

  // --- Tone Generation ---
  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number, vol: number = 0.1, decay: boolean = true) {
    if (!this.audioContext) this.initAudioContext();
    const ctx = this.audioContext!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
    if (decay) {
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    } else {
        gain.gain.setValueAtTime(vol, startTime + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
    }
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);

    this.activeOscillators.push(osc);
    this.activeGainNodes.push(gain);
    
    setTimeout(() => {
        const idx = this.activeOscillators.indexOf(osc);
        if (idx > -1) this.activeOscillators.splice(idx, 1);
    }, duration * 1000 + 100);
  }

  // --- Melodies ---
  public playIntroMusic() {
    this.stopAllSounds();
    if (!this.audioContext) this.initAudioContext();
    const now = this.audioContext!.currentTime;
    
    const notes = [
        { f: 392.00, d: 0.2, t: 0 },   
        { f: 523.25, d: 0.2, t: 0.2 }, 
        { f: 659.25, d: 0.2, t: 0.4 }, 
        { f: 783.99, d: 0.4, t: 0.6 }, 
        { f: 523.25, d: 0.2, t: 1.0 }, 
        { f: 659.25, d: 0.2, t: 1.2 }, 
        { f: 1046.50, d: 0.8, t: 1.4 } 
    ];

    notes.forEach(n => this.playTone(n.f, 'triangle', n.d, now + n.t, 0.2));
    this.playTone(130.81, 'sawtooth', 2.0, now, 0.1);
  }

  public playCelebrationMusic() {
    this.stopAllSounds();
    if (!this.audioContext) this.initAudioContext();
    const now = this.audioContext!.currentTime;

    const tune = [
        { f: 523.25, d: 0.15, t: 0 },   
        { f: 523.25, d: 0.15, t: 0.2 }, 
        { f: 523.25, d: 0.15, t: 0.4 }, 
        { f: 659.25, d: 0.4, t: 0.6 },   
        { f: 783.99, d: 0.4, t: 1.0 },   
        { f: 523.25, d: 0.2, t: 1.4 },   
        { f: 659.25, d: 0.2, t: 1.6 },   
        { f: 783.99, d: 0.6, t: 1.8 },   
        { f: 880.00, d: 0.2, t: 2.5 },   
        { f: 783.99, d: 0.2, t: 2.7 },   
        { f: 698.46, d: 0.2, t: 2.9 },   
        { f: 659.25, d: 0.2, t: 3.1 },   
        { f: 587.33, d: 0.2, t: 3.3 },   
        { f: 523.25, d: 0.8, t: 3.5 },   
    ];

    tune.forEach(n => this.playTone(n.f, 'square', n.d, now + n.t, 0.15));
    
    setTimeout(() => {
        this.playTone(261.63, 'triangle', 0.5, now, 0.1);
        this.playTone(329.63, 'triangle', 0.5, now + 0.5, 0.1);
        this.playTone(392.00, 'triangle', 0.5, now + 1.0, 0.1);
        this.playTone(523.25, 'triangle', 1.0, now + 1.5, 0.1);
    }, 0);
  }

  public startSuspenseMusic() {
    this.stopAllSounds();
    if (!this.audioContext) this.initAudioContext();
    
    const playBeat = () => {
        const now = this.audioContext!.currentTime;
        this.playTone(110, 'sine', 0.1, now, 0.15);
        this.playTone(220, 'square', 0.05, now + 0.5, 0.05);
    };

    playBeat();
    this.suspenseInterval = setInterval(playBeat, 1000);
  }

  public stopSuspenseMusic() {
    if (this.suspenseInterval) {
        clearInterval(this.suspenseInterval);
        this.suspenseInterval = null;
    }
  }

  public playCorrectSound() {
      this.playDing();
  }

  public playWrongSound() {
    this.stopAllSounds();
    if (!this.audioContext) this.initAudioContext();
    const now = this.audioContext!.currentTime;
    
    this.playTone(150, 'sawtooth', 0.5, now, 0.3);
    this.playTone(100, 'sawtooth', 1.0, now + 0.4, 0.3);
  }

  public playDing() {
    if (!this.audioContext) this.initAudioContext();
    const now = this.audioContext!.currentTime;
    this.playTone(880, 'sine', 0.1, now, 0.1); 
    this.playTone(1760, 'sine', 0.3, now + 0.1, 0.05); 
  }

  public playPhoneRing() {
    if (!this.audioContext) this.initAudioContext();
    const ctx = this.audioContext!;
    const now = ctx.currentTime;
    
    // Phone ring uses dual-tone: typically 440Hz and 480Hz alternating
    // We'll create a realistic phone ring pattern
    const ringDuration = 0.4; // Each ring lasts 0.4 seconds
    const pauseDuration = 0.2; // Pause between rings
    const totalRings = 3; // Play 3 rings
    
    for (let i = 0; i < totalRings; i++) {
      const ringStart = now + i * (ringDuration + pauseDuration);
      
      // Dual-tone phone ring: 440Hz and 480Hz simultaneously
      this.playTone(440, 'sine', ringDuration, ringStart, 0.15, false);
      this.playTone(480, 'sine', ringDuration, ringStart, 0.15, false);
    }
  }

  public playAudienceThinking() {
    if (!this.audioContext) this.initAudioContext();
    const ctx = this.audioContext!;
    const now = ctx.currentTime;
    
    // Create a crowd murmuring/thinking sound using multiple overlapping tones
    // Simulate multiple people talking/thinking at different pitches
    const baseFrequencies = [200, 250, 300, 350, 400, 450];
    const duration = 2.0; // 2 seconds of thinking sound
    
    baseFrequencies.forEach((freq, idx) => {
      // Stagger the start times slightly to create a more natural crowd effect
      const startTime = now + (idx * 0.1);
      // Vary the volume slightly for each voice
      const vol = 0.08 + (Math.random() * 0.04);
      
      // Use noise-like waveform (sawtooth) with slight variations
      this.playTone(freq, 'sawtooth', duration, startTime, vol, true);
      
      // Add some harmonics for richness
      if (idx % 2 === 0) {
        this.playTone(freq * 1.5, 'triangle', duration * 0.8, startTime + 0.2, vol * 0.6, true);
      }
    });
    
    // Add a low rumble for crowd atmosphere
    this.playTone(100, 'sine', duration, now, 0.05, true);
  }

  // --- High Quality Speech Implementation ---

  // Check if a static file exists (User must put them in public/audio/)
  private async checkStaticFile(filename: string): Promise<AudioBuffer | null> {
      try {
          const path = `./audio/${filename}`;
          const response = await fetch(path);
          if (!response.ok) return null;
          
          const arrayBuffer = await response.arrayBuffer();
          if (!this.audioContext) this.initAudioContext();
          return await this.audioContext!.decodeAudioData(arrayBuffer);
      } catch (e) {
          return null;
      }
  }

  // Preload audio without playing it
  public async preload(text: string, lang: string = 'ar-SA', staticFilename?: string | null): Promise<void> {
      const cacheKey = staticFilename || `${lang}-${text}`;

      // 1. Check Memory Cache
      if (this.memoryCache.has(cacheKey)) return;

      // 2. Check Pending Requests
      if (this.pendingRequests.has(cacheKey)) return this.pendingRequests.get(cacheKey);

      const requestPromise = (async () => {
          try {
              // 3. Try to fetch Static File (Project Assets)
              if (staticFilename) {
                  const staticBuffer = await this.checkStaticFile(staticFilename);
                  if (staticBuffer) {
                      this.memoryCache.set(cacheKey, staticBuffer);
                      // Also map the text to this buffer so fallback logic works
                      this.memoryCache.set(`${lang}-${text}`, staticBuffer); 
                      return;
                  }
              }

              // 4. Check Disk Cache (IndexedDB)
              const cachedBase64 = await this.getFromDiskCache(cacheKey);
              if (cachedBase64) {
                   if (!this.audioContext) this.initAudioContext();
                   const audioBuffer = await this.decodeAudioData(
                      this.decodeBase64(cachedBase64),
                      this.audioContext!,
                      24000,
                      1
                  );
                  this.memoryCache.set(cacheKey, audioBuffer);
                  return;
              }

              // 5. STOP: Do not fallback to API Generation for Gameplay.
              // If not found in file or DB, we just return. speak() will handle fallback to browser TTS.
              console.log(`Audio not found in cache/static for: ${staticFilename || text}. Will use Browser TTS fallback.`);
              
          } catch (e) {
              console.error("Preload failed for:", text, e);
          } finally {
              this.pendingRequests.delete(cacheKey);
          }
      })();

      this.pendingRequests.set(cacheKey, requestPromise);
      return requestPromise;
  }

  // Helper used by the Bulk Generator Tool ONLY to get raw base64 data
  // This allows the admin to generate the files initially.
  public async generateRawAudio(text: string): Promise<string | null> {
      if (!this.genAI) return null;
      try {
          const response = await this.genAI.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: text }] },
            config: {
                responseModalities: ['AUDIO'] as any,
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Puck' },
                    },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      } catch (e) {
          console.error("Gen fail", e);
          return null;
      }
  }

  public async speak(text: string, lang: string = 'ar-SA', staticFilename?: string | null) {
    // Stop any existing browser speech
    if (this.synth.speaking) {
      this.synth.cancel();
    }

    // Try finding by filename first, then by text key
    const cacheKey = staticFilename && this.memoryCache.has(staticFilename) 
        ? staticFilename 
        : `${lang}-${text}`;

    // Ensure Loaded (Check DB/File only, no API)
    // We try to preload if it's not in memory. 
    if (!this.memoryCache.has(cacheKey)) {
        await this.preload(text, lang, staticFilename);
    }

    // Determine final key to use
    const finalKey = this.memoryCache.has(staticFilename || '') ? staticFilename! : `${lang}-${text}`;

    // Play from memory if available
    if (this.memoryCache.has(finalKey)) {
        this.playAudioBuffer(this.memoryCache.get(finalKey)!);
    } else {
        // Fallback to Browser TTS
        console.log("Audio not available in high quality, using fallback.");
        this.speakFallback(text, lang);
    }
  }

  private playAudioBuffer(buffer: AudioBuffer) {
    if (!this.audioContext) this.initAudioContext();
    const source = this.audioContext!.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext!.destination);
    source.start();
  }

  private speakFallback(text: string, lang: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9; 
    utterance.pitch = 1.1; 

    const voices = this.voices.filter(v => v.lang.includes(lang.split('-')[0]));
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Laila') || v.name.includes('Maged'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    } else if (voices.length > 0) {
      utterance.voice = voices[0];
    }

    this.synth.speak(utterance);
  }

  public encourageAnas(isCorrect: boolean) {
    if (isCorrect) {
       const type = Math.random();
       
       if (type < 0.33) {
           const index = Math.floor(Math.random() * PHRASES.EN_CELEBRATION.length);
           const text = PHRASES.EN_CELEBRATION[index];
           const filename = `encourage_en_US_${index}.mp3`;
           this.speak(text, 'en-US', filename);
       } else if (type < 0.66) {
           const index = Math.floor(Math.random() * PHRASES.AR_CELEBRATION.length);
           const text = PHRASES.AR_CELEBRATION[index];
           const filename = `encourage_ar_SA_${index}.mp3`;
           this.speak(text, 'ar-SA', filename);
       } else {
           const text = "يا أنس، أنت مبدع حقاً";
           const filename = `encourage_special_1.mp3`;
           this.speak(text, 'ar-SA', filename);
       }
    } else {
        const index = Math.floor(Math.random() * PHRASES.AR_WRONG.length);
        const text = PHRASES.AR_WRONG[index];
        const filename = `wrong_ar_SA_${index}.mp3`;
        this.speak(text, 'ar-SA', filename);
    }
  }
}

export const audioService = new AudioService();
