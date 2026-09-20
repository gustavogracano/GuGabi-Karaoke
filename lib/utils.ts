import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Se já for um ID direto de 11 caracteres
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Padrões de URL do YouTube
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export const COMIC_TAGS = [
  { id: "chuveiro", label: "Cantor de Chuveiro", emoji: "🚿", color: "bg-blue-600/30 text-blue-300 border-blue-500/40" },
  { id: "pagodeiro", label: "Pagodeiro Nato", emoji: "🥁", color: "bg-amber-600/30 text-amber-300 border-amber-500/40" },
  { id: "inimigo_ritmo", label: "Inimigo do Ritmo", emoji: "⚡", color: "bg-red-600/30 text-red-300 border-red-500/40" },
  { id: "bebado", label: "Só Canto Bêbado", emoji: "🍻", color: "bg-emerald-600/30 text-emerald-300 border-emerald-500/40" },
  { id: "diva", label: "Diva Pop", emoji: "👑", color: "bg-pink-600/30 text-pink-300 border-pink-500/40" },
  { id: "roqueiro", label: "Roqueiro Triste", emoji: "🎸", color: "bg-purple-600/30 text-purple-300 border-purple-500/40" },
  { id: "sofrencia", label: "Sertanejo Sofrência", emoji: "🤠", color: "bg-orange-600/30 text-orange-300 border-orange-500/40" },
  { id: "falsete", label: "Rei do Falsete", emoji: "🎤", color: "bg-cyan-600/30 text-cyan-300 border-cyan-500/40" },
  { id: "tiktoker", label: "Tiktoker Desesperado", emoji: "📱", color: "bg-fuchsia-600/30 text-fuchsia-300 border-fuchsia-500/40" },
  { id: "metaleiro", label: "Metaleiro do Elevador", emoji: "🤘", color: "bg-neutral-600/30 text-neutral-300 border-neutral-500/40" },
  { id: "bossanova", label: "Bossa Nova de Shopping", emoji: "☕", color: "bg-yellow-600/30 text-yellow-300 border-yellow-500/40" },
  { id: "trapstar", label: "TrapStar do Autotune", emoji: "💸", color: "bg-violet-600/30 text-violet-300 border-violet-500/40" },
  { id: "anos80", label: "Nostálgico dos Anos 80", emoji: "🕺", color: "bg-teal-600/30 text-teal-300 border-teal-500/40" },
  { id: "beyonce", label: "Fã de Beyoncé no Banho", emoji: "✨", color: "bg-rose-600/30 text-rose-300 border-rose-500/40" },
  { id: "sem_nocao", label: "Sem Noção do Tom", emoji: "🙉", color: "bg-lime-600/30 text-lime-300 border-lime-500/40" },
  { id: "romantico", label: "Romântico Incorrigível", emoji: "🌹", color: "bg-red-500/30 text-red-200 border-red-400/40" },
];
