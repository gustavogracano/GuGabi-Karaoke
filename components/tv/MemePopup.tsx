"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

export interface ActiveMeme {
  id: string;
  type: string;
  timestamp: number;
}

interface MemePopupProps {
  meme: ActiveMeme | null;
}

interface MemeConfig {
  title: string;
  subtitle: string;
  emoji: string;
  bgGradient: string;
  borderColor: string;
  shadowColor: string;
  textColor: string;
  hasConfetti?: boolean;
}

const MEME_CONFIGS: Record<string, MemeConfig> = {
  errou: {
    title: "ERROU!",
    subtitle: "Ô LOCO, BICHO! ERROU FEIO, ERROU RUDE!",
    emoji: "❌",
    bgGradient: "from-red-600 via-rose-700 to-red-900",
    borderColor: "border-red-400",
    shadowColor: "shadow-[0_0_80px_rgba(239,68,68,0.9)]",
    textColor: "text-white",
  },
  uepa: {
    title: "UÊÊÊ-PAAA!",
    subtitle: "RATINHOOO! AÍ É BRINCADEIRA!",
    emoji: "🗣️",
    bgGradient: "from-purple-600 via-fuchsia-700 to-indigo-900",
    borderColor: "border-yellow-400",
    shadowColor: "shadow-[0_0_80px_rgba(168,85,247,0.9)]",
    textColor: "text-yellow-300",
  },
  danca_gatinho: {
    title: "DANÇA GATINHO!",
    subtitle: "ELE GOSTA! DANÇA GATINHO, DANÇA!",
    emoji: "🕺",
    bgGradient: "from-pink-600 via-purple-700 to-cyan-800",
    borderColor: "border-pink-300",
    shadowColor: "shadow-[0_0_80px_rgba(236,72,153,0.9)]",
    textColor: "text-white",
  },
  rapaz: {
    title: "RAPAAAA-IZ!",
    subtitle: "XAROPINHO MANDOU AQUELA REAÇÃO!",
    emoji: "🐭",
    bgGradient: "from-amber-500 via-orange-600 to-yellow-700",
    borderColor: "border-yellow-300",
    shadowColor: "shadow-[0_0_80px_rgba(245,158,11,0.9)]",
    textColor: "text-black",
  },
  pare: {
    title: "PAAA-RE!",
    subtitle: "CALMA! TÁ DEMAIS PRO MEU CORAÇÃO!",
    emoji: "🛑",
    bgGradient: "from-red-700 via-rose-800 to-red-950",
    borderColor: "border-white",
    shadowColor: "shadow-[0_0_90px_rgba(220,38,38,1)]",
    textColor: "text-white",
  },
  queisso: {
    title: "QUE ISSO MEU FILHO?!",
    subtitle: "CALMA, CALMA! NINGUÉM SE MACHUCA!",
    emoji: "😅",
    bgGradient: "from-cyan-600 via-blue-700 to-indigo-900",
    borderColor: "border-cyan-300",
    shadowColor: "shadow-[0_0_80px_rgba(6,182,212,0.9)]",
    textColor: "text-yellow-300",
  },
  buzina: {
    title: "FÔÔÔ-FOM!",
    subtitle: "BUZINA DO PALCO! SOLTA O SOM DJ!",
    emoji: "📯",
    bgGradient: "from-yellow-500 via-amber-600 to-orange-700",
    borderColor: "border-white",
    shadowColor: "shadow-[0_0_80px_rgba(234,179,8,0.9)]",
    textColor: "text-slate-950",
  },
  aplausos: {
    title: "SHOW DE BOLA!",
    subtitle: "A PLATEIA VAI AO DELÍRIO TOTAL!",
    emoji: "👏",
    bgGradient: "from-emerald-500 via-teal-600 to-cyan-800",
    borderColor: "border-emerald-300",
    shadowColor: "shadow-[0_0_80px_rgba(16,185,129,0.9)]",
    textColor: "text-white",
    hasConfetti: true,
  },
  trompete_triste: {
    title: "FOI QUASE...",
    subtitle: "WAH-WAH-WAH-WAAAAH... TCHAU QUERIDO!",
    emoji: "🎺",
    bgGradient: "from-slate-800 via-blue-950 to-slate-900",
    borderColor: "border-blue-400",
    shadowColor: "shadow-[0_0_60px_rgba(59,130,246,0.6)]",
    textColor: "text-blue-300",
  },
  brasil: {
    title: "BRASIL SIL SIL!",
    subtitle: "É DO BRASIL! SHOW SENSACIONAL!",
    emoji: "🇧🇷",
    bgGradient: "from-emerald-600 via-yellow-500 to-blue-700",
    borderColor: "border-yellow-300",
    shadowColor: "shadow-[0_0_90px_rgba(34,197,94,0.9)]",
    textColor: "text-white",
    hasConfetti: true,
  },
  coracao: {
    title: "HAJA CORAÇÃO!",
    subtitle: "SEGURA ESSA EMOÇÃO NO PALCO!",
    emoji: "❤️‍🔥",
    bgGradient: "from-red-600 via-pink-700 to-purple-900",
    borderColor: "border-pink-300",
    shadowColor: "shadow-[0_0_80px_rgba(244,63,94,0.9)]",
    textColor: "text-white",
  },
  splash: {
    title: "TOMATADA!",
    subtitle: "SPLASH! DIRETO NO ALVO!",
    emoji: "🍅",
    bgGradient: "from-red-700 via-red-800 to-rose-950",
    borderColor: "border-red-400",
    shadowColor: "shadow-[0_0_80px_rgba(220,38,38,0.9)]",
    textColor: "text-white",
  },
  sino: {
    title: "NOTA DEZ!",
    subtitle: "ACERTOU! TEMOS UM ARTISTA AQUI!",
    emoji: "🔔",
    bgGradient: "from-amber-400 via-yellow-500 to-orange-600",
    borderColor: "border-white",
    shadowColor: "shadow-[0_0_80px_rgba(245,158,11,0.9)]",
    textColor: "text-black",
  },
  cavalo: {
    title: "CAVAALOOOO!",
    subtitle: "RODRIGO FARO INVOCADO NO PALCO!",
    emoji: "🐴",
    bgGradient: "from-amber-700 via-orange-800 to-amber-950",
    borderColor: "border-amber-300",
    shadowColor: "shadow-[0_0_80px_rgba(217,119,6,0.9)]",
    textColor: "text-yellow-200",
  },
  demais: {
    title: "DEEE-MAIS!",
    subtitle: "TÁ BOM, VOCÊ FALA DEMAIS!",
    emoji: "🗣️",
    bgGradient: "from-fuchsia-600 via-pink-700 to-purple-900",
    borderColor: "border-fuchsia-300",
    shadowColor: "shadow-[0_0_80px_rgba(192,38,211,0.9)]",
    textColor: "text-white",
  },
  ui: {
    title: "UUU-III!",
    subtitle: "ELE GOSTA! TOMEEEE!",
    emoji: "💋",
    bgGradient: "from-rose-600 via-pink-600 to-rose-900",
    borderColor: "border-pink-300",
    shadowColor: "shadow-[0_0_80px_rgba(244,63,94,0.9)]",
    textColor: "text-white",
  },
  nao_e_o_pai: {
    title: "NÃO É O PAI! 🍼",
    subtitle: "O RESULTADO DO TESTE DE DNA DEU NEGATIVO!",
    emoji: "🎉",
    bgGradient: "from-blue-600 via-indigo-700 to-blue-900",
    borderColor: "border-yellow-400",
    shadowColor: "shadow-[0_0_90px_rgba(37,99,235,1)]",
    textColor: "text-yellow-300",
    hasConfetti: true,
  },
  elegosta: {
    title: "ELE GOSTA! 😏",
    subtitle: "OLHA ELE AÍ! DANÇA GATINHO!",
    emoji: "🕺",
    bgGradient: "from-purple-600 via-indigo-800 to-slate-900",
    borderColor: "border-purple-300",
    shadowColor: "shadow-[0_0_80px_rgba(147,51,234,0.9)]",
    textColor: "text-purple-200",
  },
  chega: {
    title: "RAPAZ!",
    subtitle: "CALMA RATINHO! CHEGA POR HOJE!",
    emoji: "🐭",
    bgGradient: "from-amber-600 via-red-700 to-amber-900",
    borderColor: "border-yellow-300",
    shadowColor: "shadow-[0_0_80px_rgba(245,158,11,0.9)]",
    textColor: "text-white",
  },
  tetra: {
    title: "É TETRAAA! 🏆",
    subtitle: "É TETRA! É DO BRASIIIL!",
    emoji: "🇧🇷",
    bgGradient: "from-emerald-600 via-green-600 to-yellow-500",
    borderColor: "border-white",
    shadowColor: "shadow-[0_0_100px_rgba(34,197,94,1)]",
    textColor: "text-white",
    hasConfetti: true,
  },
  beijo: {
    title: "VAI DAR NAMORO! 💋",
    subtitle: "HMMMM! BEIJÃO DE CINEMA!",
    emoji: "❤️",
    bgGradient: "from-pink-600 via-rose-700 to-red-900",
    borderColor: "border-pink-300",
    shadowColor: "shadow-[0_0_80px_rgba(244,63,94,0.9)]",
    textColor: "text-white",
  },
  oloco: {
    title: "Ô LOCO MEU! 🎙️",
    subtitle: "OLHA AÍ BICHO! QUEM SABE FAZ AO VIVO!",
    emoji: "📺",
    bgGradient: "from-blue-700 via-indigo-800 to-slate-950",
    borderColor: "border-cyan-300",
    shadowColor: "shadow-[0_0_80px_rgba(6,182,212,0.9)]",
    textColor: "text-yellow-300",
  },
  plantao: {
    title: "🚨 PLANTÃO URGENTE! 🚨",
    subtitle: "INTERROMPEMOS A PROGRAMAÇÃO PARA ESTE HIT!",
    emoji: "🌐",
    bgGradient: "from-blue-900 via-red-900 to-black",
    borderColor: "border-red-500",
    shadowColor: "shadow-[0_0_100px_rgba(239,68,68,1)]",
    textColor: "text-white",
  },
  badumtss: {
    title: "BA-DUM-TSSS! 🥁",
    subtitle: "PIADA PRONTA! BOA DEMAIS!",
    emoji: "🥁",
    bgGradient: "from-slate-700 via-slate-800 to-zinc-950",
    borderColor: "border-white",
    shadowColor: "shadow-[0_0_70px_rgba(255,255,255,0.7)]",
    textColor: "text-yellow-300",
  },
  grilo: {
    title: "CRI-CRI... 🦗",
    subtitle: "SILÊNCIO TOTAL NA SALA!",
    emoji: "🦗",
    bgGradient: "from-stone-800 via-stone-900 to-black",
    borderColor: "border-stone-500",
    shadowColor: "shadow-[0_0_60px_rgba(120,113,108,0.6)]",
    textColor: "text-stone-300",
  },
  sirene: {
    title: "🚨 RAVE TOTAL! 🚨",
    subtitle: "SEGREEEEDO! PULA GERAL!",
    emoji: "🚔",
    bgGradient: "from-blue-700 via-red-700 to-blue-900",
    borderColor: "border-yellow-400",
    shadowColor: "shadow-[0_0_100px_rgba(239,68,68,1)]",
    textColor: "text-white",
  },
};

export function MemePopup({ meme }: MemePopupProps) {
  const [visible, setVisible] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<MemeConfig | null>(null);

  useEffect(() => {
    if (!meme) return;

    const config = MEME_CONFIGS[meme.type];
    if (config) {
      setCurrentConfig(config);
      setVisible(true);

      if (config.hasConfetti) {
        try {
          confetti({
            particleCount: 70,
            spread: 75,
            origin: { x: 0.85, y: 0.18 },
          });
        } catch {}
      }

      const displayDuration = meme.type === "errou" || meme.type === "brasil" ? 3600 : 2800;
      const timer = setTimeout(() => {
        setVisible(false);
      }, displayDuration);

      return () => clearTimeout(timer);
    }
  }, [meme]);

  if (!visible || !currentConfig) return null;

  return (
    <div className="fixed top-24 right-6 md:right-8 z-[95] pointer-events-none select-none max-w-sm md:max-w-md w-full animate-in slide-in-from-right-10 fade-in duration-300">
      <div
        className={`relative flex items-center gap-4 px-6 py-4 rounded-3xl border-3 ${currentConfig.borderColor} bg-gradient-to-r ${currentConfig.bgGradient} ${currentConfig.shadowColor} backdrop-blur-2xl shadow-2xl transform transition-all animate-[bounce_1.2s_ease-in-out_infinite]`}
      >
        {/* Glow de fundo */}
        <div className="absolute inset-0 rounded-3xl bg-white/10 blur-md pointer-events-none" />

        {/* Emoji Animado */}
        <div className="text-5xl md:text-6xl shrink-0 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] animate-pulse">
          {currentConfig.emoji}
        </div>

        {/* Texto do Meme em formato Toast Lateral */}
        <div className="flex flex-col text-left min-w-0">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/90 bg-black/40 px-2.5 py-0.5 rounded-full w-fit mb-1 border border-white/20">
            ⚡ Reação ao Vivo da Galera
          </span>
          <h2
            className={`text-2xl md:text-3xl font-black tracking-tight leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${currentConfig.textColor}`}
          >
            {currentConfig.title}
          </h2>
          <p className="text-xs md:text-sm font-black text-white/95 mt-1 drop-shadow-md truncate">
            {currentConfig.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
