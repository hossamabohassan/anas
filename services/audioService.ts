class AudioService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private audioContext: AudioContext | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGainNodes: GainNode[] = [];
  private suspenseInterval: any = null;

  constructor() {
    this.synth = window.speechSynthesis;
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
      };
    }
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Helper to stop all currently playing music/tones
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
  }

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
    
    // Cleanup reference after playing
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
    
    // Fanfare sequence
    const notes = [
        { f: 392.00, d: 0.2, t: 0 },   // G4
        { f: 523.25, d: 0.2, t: 0.2 }, // C5
        { f: 659.25, d: 0.2, t: 0.4 }, // E5
        { f: 783.99, d: 0.4, t: 0.6 }, // G5
        { f: 523.25, d: 0.2, t: 1.0 }, // C5
        { f: 659.25, d: 0.2, t: 1.2 }, // E5
        { f: 1046.50, d: 0.8, t: 1.4 } // C6
    ];

    notes.forEach(n => this.playTone(n.f, 'triangle', n.d, now + n.t, 0.2));
    
    // Bass support
    this.playTone(130.81, 'sawtooth', 2.0, now, 0.1); // C3
  }

  public playCelebrationMusic() {
    this.stopAllSounds();
    if (!this.audioContext) this.initAudioContext();
    const now = this.audioContext!.currentTime;

    // Upbeat Celebration Melody
    const tune = [
        { f: 523.25, d: 0.15, t: 0 },    // C5
        { f: 523.25, d: 0.15, t: 0.2 },  // C5
        { f: 523.25, d: 0.15, t: 0.4 },  // C5
        { f: 659.25, d: 0.4, t: 0.6 },   // E5
        { f: 783.99, d: 0.4, t: 1.0 },   // G5
        { f: 523.25, d: 0.2, t: 1.4 },   // C5
        { f: 659.25, d: 0.2, t: 1.6 },   // E5
        { f: 783.99, d: 0.6, t: 1.8 },   // G5
        
        { f: 880.00, d: 0.2, t: 2.5 },   // A5
        { f: 783.99, d: 0.2, t: 2.7 },   // G5
        { f: 698.46, d: 0.2, t: 2.9 },   // F5
        { f: 659.25, d: 0.2, t: 3.1 },   // E5
        { f: 587.33, d: 0.2, t: 3.3 },   // D5
        { f: 523.25, d: 0.8, t: 3.5 },   // C5
    ];

    tune.forEach(n => this.playTone(n.f, 'square', n.d, now + n.t, 0.15));
    
    // Arpeggio background
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
    
    // A rhythmic "Heartbeat" / Clock sound
    const playBeat = () => {
        const now = this.audioContext!.currentTime;
        // Low Thump
        this.playTone(110, 'sine', 0.1, now, 0.15);
        // Secondary tick
        this.playTone(220, 'square', 0.05, now + 0.5, 0.05);
    };

    playBeat();
    this.suspenseInterval = setInterval(playBeat, 1000); // 60 BPM loop
  }

  public stopSuspenseMusic() {
    if (this.suspenseInterval) {
        clearInterval(this.suspenseInterval);
        this.suspenseInterval = null;
    }
  }

  public playCorrectSound() {
      // Just a quick Ding, celebration music handled separately
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

  public speak(text: string, lang: string = 'ar-SA') {
    if (this.synth.speaking) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9; 
    utterance.pitch = 1.1; 

    // Prefer specific nice voices if available
    const voices = this.voices.filter(v => v.lang.includes(lang.split('-')[0]));
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Laila') || v.name.includes('Maged'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    } else if (voices.length > 0) {
      utterance.voice = voices[0];
    }

    this.synth.speak(utterance);
  }

  public encourageAlwaleed(isCorrect: boolean) {
    if (isCorrect) {
       // Randomly choose between Arabic praise, English praise, or mixed
       const type = Math.random();
       
       if (type < 0.33) {
           // English Enthusiastic
           const enPhrases = ["Great Alwaleed!", "Bravo Alwaleed!", "Excellent work!", "You are amazing Alwaleed!"];
           const phrase = enPhrases[Math.floor(Math.random() * enPhrases.length)];
           const u = new SpeechSynthesisUtterance(phrase);
           u.lang = 'en-US';
           u.pitch = 1.2;
           this.synth.speak(u);
       } else if (type < 0.66) {
           // Arabic Enthusiastic
           const arPhrases = [
             "الله عليك يا الوليد!",
             "شاطر يا بطل!",
             "ممتاز يا عبقري!",
             "إجابة روعة يا مليونير!"
           ];
           this.speak(arPhrases[Math.floor(Math.random() * arPhrases.length)]);
       } else {
           // Mixed
           const u1 = new SpeechSynthesisUtterance("Bravo");
           u1.lang = 'en-US';
           this.synth.speak(u1);
           setTimeout(() => this.speak("يا الوليد، أنت مبدع حقاً"), 800);
       }
    } else {
        const negativePhrases = [
          "ولا يهمك يا الوليد، فكر تاني",
          "قريب جداً، تعال نشوف الحل الصح",
          "حاول مرة تانية يا بطل",
        ];
        this.speak(negativePhrases[Math.floor(Math.random() * negativePhrases.length)]);
    }
  }
}

export const audioService = new AudioService();