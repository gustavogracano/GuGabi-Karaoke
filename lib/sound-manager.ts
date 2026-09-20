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
  // Sons naturalmente muito estridentes ou agudos (ajustados para serem altos e nítidos sem distorcer)
  buzina: 0.90,
  gong: 0.95,
  pare: 1.10,
  sirene: 0.95,
  plantao: 1.05,

  // Efeitos cômicos e memes falados (precisam de presença e ganho expressivo para sobressair à música)
  sino: 1.15,
  brasil: 1.20,
  coracao: 1.20,
  danca_gatinho: 1.25,
  cavalo: 1.25,
  demais: 1.25,
  ui: 1.30,
  nao_e_o_pai: 1.25,
  elegosta: 1.25,
  chega: 1.25,
  tetra: 1.25,
  beijo: 1.30,
  oloco: 1.25,
  badumtss: 1.20,
  grilo: 1.25,

  // Sons de palco e tomataço (ganho máximo de destaque)
  errou: 1.30,
  aplausos: 1.25,
  uepa: 1.35,
  rapaz: 1.35,
  queisso: 1.35,
  trompete_triste: 1.30,
  splash: 1.35,
};

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGainNode: GainNode | null = null;
  private audioBuffers: Map<SoundEffect, AudioBuffer> = new Map();
  private audioElements: Map<SoundEffect, HTMLAudioElement> = new Map();
  private isUnlocked = false;
  private masterVolume = 1.0;
  private lastPlayed: Map<SoundEffect, number> = new Map();
  private isApplausePlaying = false;

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

        // Compressor de áudio de estúdio: eleva sons baixos e impede saturação
        this.compressor = this.audioCtx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-14, this.audioCtx.currentTime);
        this.compressor.knee.setValueAtTime(8, this.audioCtx.currentTime);
        this.compressor.ratio.setValueAtTime(4, this.audioCtx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
        this.compressor.release.setValueAtTime(0.18, this.audioCtx.currentTime);

        this.masterGainNode = this.audioCtx.createGain();
        this.masterGainNode.gain.setValueAtTime(1.15, this.audioCtx.currentTime);

        // Cadeia: Source -> SoundGain -> Compressor -> MasterGain -> Speakers
        this.compressor.connect(this.masterGainNode);
        this.masterGainNode.connect(this.audioCtx.destination);
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
    this.masterVolume = Math.max(0, Math.min(1.5, vol));
    if (this.masterGainNode && this.audioCtx) {
      this.masterGainNode.gain.setValueAtTime(this.masterVolume * 1.15, this.audioCtx.currentTime);
    }
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

    // Throttle leve de 200ms apenas para cliques repetidos no MESMO som
    const nowTime = Date.now();
    const last = this.lastPlayed.get(sound) || 0;
    if (nowTime - last < 200) {
      return;
    }
    this.lastPlayed.set(sound, nowTime);

    // Evita sobreposição de aplausos se já estiver tocando
    if (sound === "aplausos" && this.isApplausePlaying) {
      return;
    }

    const baseGain = SOUND_NORMALIZATION[sound] ?? 1.0;
    const targetGain = Math.max(0, baseGain * this.masterVolume);

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

        gainNode.gain.setValueAtTime(targetGain, this.audioCtx.currentTime);

        source.connect(gainNode);

        // Se o compressor estiver ativo, passa por ele para ter pegada broadcast de rádio
        if (this.compressor) {
          gainNode.connect(this.compressor);
        } else {
          gainNode.connect(this.audioCtx.destination);
        }

        source.start(0);

        if (sound === "aplausos") {
          this.isApplausePlaying = true;
          source.onended = () => {
            this.isApplausePlaying = false;
          };
        }

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
        audio.volume = Math.min(1, targetGain);
        audio.loop = false;

        if (sound === "aplausos") {
          this.isApplausePlaying = true;
          audio.onended = () => {
            this.isApplausePlaying = false;
          };
        }

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
