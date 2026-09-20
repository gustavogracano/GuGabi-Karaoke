"use client";

import { useEffect } from "react";

export interface EmojiParticle {
  id: string;
  emoji: string;
  leftPercent?: number; // Posição horizontal na tela (ex: 15% ou 65%)
  right?: number;
  scale: number;
  rotation: number;
  delay?: number;
}

interface FloatingEmojisProps {
  emojis: EmojiParticle[];
  onRemove: (id: string) => void;
}

const getEmojiGlow = (emoji: string) => {
  if (emoji === "❤️") {
    return "drop-shadow-[0_0_20px_rgba(255,0,128,1)] drop-shadow-[0_0_40px_rgba(255,0,128,0.6)]";
  }
  if (emoji === "🔥") {
    return "drop-shadow-[0_0_20px_rgba(255,140,0,1)] drop-shadow-[0_0_40px_rgba(255,100,0,0.6)]";
  }
  if (emoji === "🍅") {
    return "drop-shadow-[0_0_20px_rgba(239,68,68,1)] drop-shadow-[0_0_40px_rgba(220,38,38,0.6)]";
  }
  if (emoji === "👏") {
    return "drop-shadow-[0_0_20px_rgba(16,185,129,1)] drop-shadow-[0_0_40px_rgba(16,185,129,0.6)]";
  }
  return "drop-shadow-[0_0_20px_rgba(0,240,255,1)]";
};

function SingleEmojiParticle({
  item,
  onRemove,
}: {
  item: EmojiParticle;
  onRemove: (id: string) => void;
}) {
  // Temporizador de segurança absoluto: garante remoção mesmo se o evento DOM falhar
  useEffect(() => {
    const totalDurationMs = (3.2 + (item.delay || 0)) * 1000 + 150;
    const timer = setTimeout(() => {
      onRemove(item.id);
    }, totalDurationMs);

    return () => clearTimeout(timer);
  }, [item.id, item.delay, onRemove]);

  const positionStyle =
    item.leftPercent !== undefined
      ? { left: `${item.leftPercent}%` }
      : { right: `${item.right || 120}px` };

  return (
    <div
      className="absolute bottom-16 animate-float-up pointer-events-none select-none"
      style={{
        ...positionStyle,
        animationDelay: `${item.delay || 0}s`,
        willChange: "transform, opacity",
      }}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) {
          onRemove(item.id);
        }
      }}
    >
      {/* Emoji com tamanho TV imersivo, rotação e brilho neon de alta intensidade */}
      <div
        className={`filter ${getEmojiGlow(item.emoji)} select-none`}
        style={{
          transform: `scale(${item.scale}) rotate(${item.rotation}deg)`,
        }}
      >
        <span className="text-7xl md:text-8xl lg:text-9xl select-none leading-none inline-block drop-shadow-[0_6px_18px_rgba(0,0,0,0.95)]">
          {item.emoji}
        </span>
      </div>
    </div>
  );
}

export function FloatingEmojis({ emojis, onRemove }: FloatingEmojisProps) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[85] select-none">
      {emojis.map((item) => (
        <SingleEmojiParticle key={item.id} item={item} onRemove={onRemove} />
      ))}
    </div>
  );
}
