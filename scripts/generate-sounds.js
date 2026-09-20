const fs = require("fs");
const path = require("path");

const soundDir = path.join(__dirname, "..", "public", "sounds");
if (!fs.existsSync(soundDir)) {
  fs.mkdirSync(soundDir, { recursive: true });
}

// Helper to write a 16-bit Mono WAV file
function createWavBuffer(sampleRate, samples) {
  const byteRate = sampleRate * 2;
  const blockAlign = 2;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample (16)
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(s < 0 ? s * 0x8000 : s * 0x7fff), 44 + i * 2);
  }

  return buffer;
}

const sampleRate = 44100;

// 1. ERROU! (Harsh discordant buzzer)
function generateErrou() {
  const duration = 1.2;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Two buzz bursts
    const envelope = (t < 0.5 ? Math.sin((t / 0.5) * Math.PI) : t < 0.6 ? 0 : Math.sin(((t - 0.6) / 0.6) * Math.PI));
    const tone1 = Math.sign(Math.sin(2 * Math.PI * 140 * t));
    const tone2 = Math.sign(Math.sin(2 * Math.PI * 185 * t));
    samples[i] = (tone1 * 0.5 + tone2 * 0.5) * envelope * 0.7;
  }
  return createWavBuffer(sampleRate, samples);
}

// 2. APLAUSOS (Applause cheer)
function generateAplausos() {
  const duration = 2.5;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Claps simulation: dense noise with periodic peaks
    const noise = Math.random() * 2 - 1;
    const clapMod = 0.6 + 0.4 * Math.sin(t * 40) * Math.cos(t * 73);
    const env = t < 0.2 ? t / 0.2 : (1 - (t - 0.2) / 2.3);
    samples[i] = noise * clapMod * env * 0.65;
  }
  return createWavBuffer(sampleRate, samples);
}

// 3. BUZINA (Airhorn / Car horn)
function generateBuzina() {
  const duration = 1.0;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const env = t < 0.05 ? t / 0.05 : t > 0.8 ? (1 - t) / 0.2 : 1;
    const tone1 = Math.sin(2 * Math.PI * 440 * t);
    const tone2 = Math.sin(2 * Math.PI * 554.37 * t);
    const tone3 = Math.sin(2 * Math.PI * 659.25 * t);
    samples[i] = (tone1 * 0.4 + tone2 * 0.35 + tone3 * 0.25) * env * 0.7;
  }
  return createWavBuffer(sampleRate, samples);
}

// 4. SPLASH (Tomato hit squish)
function generateSplash() {
  const duration = 1.0;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 6);
    const freq = 400 * Math.exp(-t * 12) + 60;
    const squish = Math.sin(2 * Math.PI * freq * t);
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 10);
    samples[i] = (squish * 0.5 + noise * 0.5) * env * 0.8;
  }
  return createWavBuffer(sampleRate, samples);
}

// 5. UEPA! (Energetic vocal-like pitch rise)
function generateUepa() {
  const duration = 0.8;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const env = t < 0.1 ? t / 0.1 : Math.exp(-(t - 0.1) * 3);
    const freq = 220 + 260 * Math.sin((t / duration) * Math.PI * 0.8);
    const tone = Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(4 * Math.PI * freq * t);
    samples[i] = tone * env * 0.7;
  }
  return createWavBuffer(sampleRate, samples);
}

// 6. DANÇA GATINHO (Funky beat & slap bass groove)
function generateDancaGatinho() {
  const duration = 1.6;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const beatTime = (t % 0.4);
    const kick = Math.sin(2 * Math.PI * (120 * Math.exp(-beatTime * 25)) * beatTime) * Math.exp(-beatTime * 12);
    const hihat = (Math.random() * 2 - 1) * Math.exp(-(beatTime % 0.2) * 35) * 0.25;
    const bassTone = Math.sin(2 * Math.PI * 110 * t) * (t < 0.8 ? 0.4 : 0.6);
    samples[i] = (kick * 0.6 + hihat + bassTone * 0.3) * (1 - t / duration);
  }
  return createWavBuffer(sampleRate, samples);
}

// 7. TROMPETE TRISTE (Sad trombone wah-wah-wah-waaaah)
function generateTrompeteTriste() {
  const duration = 2.0;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);
  const notes = [
    { freq: 233.08, start: 0.0, end: 0.4 }, // Bb
    { freq: 220.00, start: 0.45, end: 0.85 }, // A
    { freq: 207.65, start: 0.9, end: 1.3 }, // Ab
    { freq: 196.00, start: 1.35, end: 1.95 }, // G (waaaah)
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let val = 0;
    for (const note of notes) {
      if (t >= note.start && t < note.end) {
        const nt = t - note.start;
        const dur = note.end - note.start;
        const vibrato = 1 + 0.03 * Math.sin(2 * Math.PI * 6 * nt);
        const pitch = note.freq * (note === notes[3] ? 1 - 0.08 * (nt / dur) : vibrato);
        const env = Math.sin((nt / dur) * Math.PI);
        const tone = Math.sin(2 * Math.PI * pitch * nt) + 0.4 * Math.sin(4 * Math.PI * pitch * nt);
        val = tone * env * 0.6;
        break;
      }
    }
    samples[i] = val;
  }
  return createWavBuffer(sampleRate, samples);
}

// 8. SINO DE ACERTO (High pleasant victory chime)
function generateSino() {
  const duration = 1.2;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 3.5);
    const c1 = Math.sin(2 * Math.PI * 1046.5 * t); // C6
    const c2 = Math.sin(2 * Math.PI * 2093.0 * t) * 0.5; // C7
    const c3 = Math.sin(2 * Math.PI * 3135.96 * t) * 0.25; // G7
    samples[i] = (c1 + c2 + c3) * env * 0.6;
  }
  return createWavBuffer(sampleRate, samples);
}

// 9. GONG (Dramatic stage gong)
function generateGong() {
  const duration = 2.2;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 2.0);
    const f1 = Math.sin(2 * Math.PI * 160 * t);
    const f2 = Math.sin(2 * Math.PI * 224 * t) * 0.7;
    const f3 = Math.sin(2 * Math.PI * 338 * t) * 0.4;
    const crash = (Math.random() * 2 - 1) * Math.exp(-t * 8) * 0.3;
    samples[i] = (f1 + f2 + f3 + crash) * env * 0.6;
  }
  return createWavBuffer(sampleRate, samples);
}

const errouWav = generateErrou();
const aplausosWav = generateAplausos();
const buzinaWav = generateBuzina();
const splashWav = generateSplash();
const uepaWav = generateUepa();
const dancaWav = generateDancaGatinho();
const trompeteWav = generateTrompeteTriste();
const sinoWav = generateSino();
const gongWav = generateGong();

fs.writeFileSync(path.join(soundDir, "errou.mp3"), errouWav);
fs.writeFileSync(path.join(soundDir, "aplausos.mp3"), aplausosWav);
fs.writeFileSync(path.join(soundDir, "buzina.mp3"), buzinaWav);
fs.writeFileSync(path.join(soundDir, "splash.mp3"), splashWav);
fs.writeFileSync(path.join(soundDir, "uepa.mp3"), uepaWav);
fs.writeFileSync(path.join(soundDir, "danca_gatinho.mp3"), dancaWav);
fs.writeFileSync(path.join(soundDir, "trompete_triste.mp3"), trompeteWav);
fs.writeFileSync(path.join(soundDir, "sino.mp3"), sinoWav);
fs.writeFileSync(path.join(soundDir, "gong.mp3"), gongWav);

console.log("Todos os efeitos sonoros atualizados em /public/sounds/!");

