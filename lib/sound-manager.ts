export type SoundEffect =
  | "errou"
  | "aplausos"
  | "buzina"
  | "splash"
  | "uepa"
  | "danca_gatinho"
  | "trompete_triste"
  | "sino"
  | "gong"
  | "rapaz"
  | "pare"
  | "queisso"
  | "brasil"
  | "coracao"
  | "cavalo"
  | "demais"
  | "ui"
  | "nao_e_o_pai"
  | "elegosta"
  | "chega"
  | "tetra"
  | "beijo"
  | "oloco"
  | "plantao"
  | "badumtss"
  | "grilo"
  | "sirene";

const ALL_SOUNDS: SoundEffect[] = [
  "errou",
  "aplausos",
  "buzina",
  "splash",
  "uepa",
  "danca_gatinho",
  "trompete_triste",
  "sino",
  "gong",
  "rapaz",
  "pare",
  "queisso",
  "brasil",
  "coracao",
  "cavalo",
  "demais",
  "ui",
  "nao_e_o_pai",
  "elegosta",
  "chega",
  "tetra",
  "beijo",
  "oloco",
  "plantao",
  "badumtss",
  "grilo",
  "sirene",
];

const SOUND_NORMALIZATION: Record<SoundEffect, number> = {
  // Sons naturalmente estridentes ou comprimidos (atenuados para equilíbrio)
  buzina: 0.58,
  gong: 0.60,
  pare: 0.72,
  sirene: 0.65,
  plantao: 0.75,

  // Sons médios/balanceados
  sino: 0.85,
  brasil: 0.85,
  coracao: 0.88,
  danca_gatinho: 0.90,
  cavalo: 0.90,
  demais: 0.90,
  ui: 0.95,
  nao_e_o_pai: 0.90,
  elegosta: 0.90,
  chega: 0.90,
  tetra: 0.90,
  beijo: 0.90,
  oloco: 0.90,
  badumtss: 0.90,
  grilo: 0.90,

  // Sons que precisam de ganho máximo para clareza
  errou: 0.95,
  aplausos: 1.0,
  uepa: 1.0,
  rapaz: 1.0,
  queisso: 1.0,
  trompete_triste: 1.0,
  splash: 1.0,
};

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private audioBuffers: Map<SoundEffect, AudioBuffer> = new Map();
  private audioElements: Map<SoundEffect, HTMLAudioElement> = new Map();
  private isUnlocked = false;
  private masterVolume = 0.85;
  private lastPlayed: Map<SoundEffect, number> = new Map();
  private isApplausePlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGainNode: GainNode | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentCutoffTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.initAudioContext();
      this.preloadAllSounds();
    }
  }

  private initAudioContext() {
    if (this.audioCtx || typeof window === "undefined") return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    } catch (e) {
      console.warn("Não foi possível inicializar AudioContext:", e);
    }
  }

  // Pré-carrega e decodifica TODOS os arquivos estáticos locais para a memória RAM
  private async preloadAllSounds() {
    if (typeof window === "undefined") return;

    for (const sound of ALL_SOUNDS) {
      // 1. Fallback HTML5 Audio imediato
      try {
        const audio = new Audio(`/sounds/${sound}.mp3`);
        audio.preload = "auto";
        this.audioElements.set(sound, audio);
      } catch {}

      // 2. Pré-carregamento com decodeAudioData no Web Audio (0ms de latência)
      this.preloadAudioBuffer(sound);
    }
  }

  private async preloadAudioBuffer(sound: SoundEffect) {
    try {
      this.initAudioContext();
      const response = await fetch(`/sounds/${sound}.mp3`);
      if (!response.ok) return;
      const arrayBuffer = await response.arrayBuffer();

      if (this.audioCtx) {
        // Decodifica os bytes MP3 diretamente para PCM na RAM
        const decodedBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
        this.audioBuffers.set(sound, decodedBuffer);
      }
    } catch {
      // Fallback permanece pronto via audioElements
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  // Desbloqueia o áudio no primeiro clique/toque do usuário (política de autoplay do Chrome/Safari)
  public unlockAudio() {
    if (typeof window === "undefined") return;
    this.initAudioContext();
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    this.isUnlocked = true;
  }

  public play(sound: SoundEffect) {
    if (typeof window === "undefined") return;
    this.unlockAudio();

    // Throttle para evitar sobreposição caótica no mesmo som (mínimo 350ms)
    const nowTime = Date.now();
    const last = this.lastPlayed.get(sound) || 0;
    if (nowTime - last < 350) {
      return;
    }
    this.lastPlayed.set(sound, nowTime);

    // Evita sobreposição de aplausos se já estiver tocando
    if (sound === "aplausos" && this.isApplausePlaying) {
      return;
    }

    // Para o som anterior imediatamente se outro for disparado (evita embolar quando mandam vários)
    this.stopActiveMemeSound();

    const baseGain = SOUND_NORMALIZATION[sound] ?? 0.85;
    const targetGain = Math.max(0, Math.min(1, baseGain * this.masterVolume));

    // Duração máxima dinâmica: sons curtos e pontuais (1.5s - 2.0s)
    const maxDurationSec =
      sound === "aplausos" ? 3.0 :
      sound === "tetra" ? 2.2 :
      sound === "plantao" ? 2.2 :
      sound === "errou" ? 2.0 :
      1.6;

    // =========================================================================
    // ROTA A (Prioritária): Web Audio API com AudioBuffer da RAM (Latência 0ms)
    // =========================================================================
    if (this.audioCtx && this.audioBuffers.has(sound)) {
      try {
        if (this.audioCtx.state === "suspended") {
          this.audioCtx.resume();
        }

        const source = this.audioCtx.createBufferSource();
        source.buffer = this.audioBuffers.get(sound)!;
        const gainNode = this.audioCtx.createGain();

        const curr = this.audioCtx.currentTime;
        gainNode.gain.setValueAtTime(targetGain, curr);

        // Fade-out suave antes de cortar para evitar cliques estáticos
        const fadeStart = curr + Math.max(0.3, maxDurationSec - 0.25);
        const fadeEnd = curr + maxDurationSec;
        gainNode.gain.setValueAtTime(targetGain, fadeStart);
        gainNode.gain.linearRampToValueAtTime(0.001, fadeEnd);

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        source.start(0);

        this.currentSource = source;
        this.currentGainNode = gainNode;

        source.onended = () => {
          if (this.currentSource === source) {
            this.currentSource = null;
            this.currentGainNode = null;
          }
          if (sound === "aplausos") {
            this.isApplausePlaying = false;
          }
        };

        return;
      } catch (err) {
        console.warn("Erro ao tocar via Web Audio API, tentando fallback:", err);
      }
    }

    // =========================================================================
    // ROTA B (Fallback Rápido): HTML5 Audio Pool Pré-carregado
    // =========================================================================
    try {
      const audio = this.audioElements.get(sound);
      if (audio) {
        audio.currentTime = 0;
        audio.volume = targetGain;
        audio.loop = false;
        this.currentAudioElement = audio;

        if (this.currentCutoffTimer) {
          clearTimeout(this.currentCutoffTimer);
        }

        this.currentCutoffTimer = setTimeout(() => {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {}
          if (this.currentAudioElement === audio) {
            this.currentAudioElement = null;
          }
        }, maxDurationSec * 1000);

        audio.onended = () => {
          if (this.currentCutoffTimer) clearTimeout(this.currentCutoffTimer);
          if (this.currentAudioElement === audio) {
            this.currentAudioElement = null;
          }
          if (sound === "aplausos") this.isApplausePlaying = false;
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            if (sound === "aplausos") this.isApplausePlaying = false;
            this.playSynthesized(sound);
          });
        }
        return;
      }
    } catch {
      // Fallback sintetizado
    }

    this.playSynthesized(sound);
  }

  // Interrompe imediatamente qualquer áudio de meme ativo
  public stopActiveMemeSound() {
    if (this.currentCutoffTimer) {
      clearTimeout(this.currentCutoffTimer);
      this.currentCutoffTimer = null;
    }

    if (this.currentSource) {
      try {
        if (this.currentGainNode && this.audioCtx) {
          const curr = this.audioCtx.currentTime;
          this.currentGainNode.gain.setValueAtTime(this.currentGainNode.gain.value, curr);
          this.currentGainNode.gain.linearRampToValueAtTime(0.001, curr + 0.05);
        }
        setTimeout(() => {
          try {
            this.currentSource?.stop();
          } catch {}
          this.currentSource = null;
          this.currentGainNode = null;
        }, 50);
      } catch {
        this.currentSource = null;
        this.currentGainNode = null;
      }
    }

    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {}
      this.currentAudioElement = null;
    }
  }

  // Fallback via Web Audio API caso o arquivo não toque
  private playSynthesized(sound: SoundEffect) {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;

      const ctx = this.audioCtx;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (sound === "errou") {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sawtooth";
        osc2.type = "sawtooth";
        osc1.frequency.setValueAtTime(140, now);
        osc2.frequency.setValueAtTime(185, now);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.8);
        osc2.stop(now + 0.8);
      } else if (sound === "buzina") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.5);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
      } else if (sound === "splash") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.4);
      } else if (sound === "aplausos") {
        const bufferSize = ctx.sampleRate * 1.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.8));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        noise.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
      } else if (sound === "trompete_triste") {
        // Fallback sintetizado: Wah-wah-wah-waaaah (Bb - A - Ab - G)
        const notes = [
          { freq: 233.08, start: 0.0, dur: 0.35 },
          { freq: 220.0, start: 0.4, dur: 0.35 },
          { freq: 207.65, start: 0.8, dur: 0.35 },
          { freq: 196.0, start: 1.2, dur: 0.9, bend: true },
        ];
        notes.forEach((n) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          const startT = now + n.start;
          osc.frequency.setValueAtTime(n.freq, startT);
          if (n.bend) {
            osc.frequency.linearRampToValueAtTime(n.freq * 0.88, startT + n.dur);
          }
          gain.gain.setValueAtTime(0.35, startT);
          gain.gain.exponentialRampToValueAtTime(0.01, startT + n.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startT);
          osc.stop(startT + n.dur);
        });
      }
    } catch (e) {
      console.warn("Erro ao sintetizar áudio:", e);
    }
  }

  /**
   * Som de sucesso sutil para ações no celular (ex: envio de fofoca, adicionar música)
   */
  public playSuccessChime() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const ctx = this.audioCtx;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      // Arpejo ascendente suave de 3 notas (Mi5, Sol#5, Si5)
      const notes = [659.25, 830.61, 987.77];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        const startT = now + idx * 0.08;
        osc.frequency.setValueAtTime(freq, startT);
        gain.gain.setValueAtTime(0.18, startT);
        gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startT);
        osc.stop(startT + 0.35);
      });
    } catch (e) {
      // AudioContext não inicializado ou bloqueado
    }
  }

  /**
   * Fanfarra VIP brilhante para Golden Ticket (efeito mágico dourado)
   */
  public playVipFanfare() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const ctx = this.audioCtx;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      // Escala mágica cintilante (Dó5, Mi5, Sol5, Dó6)
      const chord = [523.25, 659.25, 783.99, 1046.50];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        const startT = now + idx * 0.07;
        osc.frequency.setValueAtTime(freq, startT);
        gain.gain.setValueAtTime(0.25, startT);
        gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startT);
        osc.stop(startT + 0.5);
      });
    } catch (e) {
      // AudioContext não inicializado ou bloqueado
    }
  }
}

export const soundManager = new SoundManager();
