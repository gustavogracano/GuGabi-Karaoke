"use client";

import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { KaraokeQueueItem } from "@/lib/supabase";
import {
  Smartphone,
  Flame,
  Clock,
  Sparkles,
  Mic,
  Music,
  Radio,
  Share2,
} from "lucide-react";

export interface GossipItem {
  id: string;
  text: string;
  createdAt?: string;
}

interface StageBottomBarProps {
  currentSong: KaraokeQueueItem | null;
  nextSong: KaraokeQueueItem | null;
  incomingGossip?: GossipItem | null;
  initialGossips?: GossipItem[];
  deletedGossipId?: string | null;
  clearAllTrigger?: number;
  isPartyActive?: boolean;
  nextPartyTrack?: { title: string; artist: string; tag?: string } | null;
}

const GOSSIP_DURATION_MS = 5000; // 5s por fofoca real
const TIMER_TICK_MS = 50;

const IDLE_PARTY_TIPS = [
  "✨ Bem-vindos ao Karaokê do Gu & Gabi! 🎤🎉",
  "📱 Aponte a câmera pro QR Code e escolha o que quer cantar!",
  "🤫 Fofoca VIP: Mande um babado anônimo pelo celular e veja aqui na TV!",
  "🍅 Se o cantor desafinar, a galera pode jogar tomate pelo celular!",
  "👑 Golden Ticket: Seu passe VIP para furar a fila e cantar antes!",
  "🎤 Afinação é detalhe, a emoção e o gogó são obrigatórios!",
  "🔥 O Mais Votado e o Mais Cancelado da noite vão pro Relatório!",
  "🥂 Hoje a noite é nossa! Hidratem a garganta e soltem a voz!",
];

export function StageBottomBar({
  currentSong,
  nextSong,
  incomingGossip,
  initialGossips,
  deletedGossipId,
  clearAllTrigger,
  isPartyActive = false,
  nextPartyTrack,
}: StageBottomBarProps) {
  // 1. Estado da URL do QR Code (garante IP da rede para celulares e Macs)
  const [controlUrl, setControlUrl] = useState<string>("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isLocalhost) {
        fetch("/api/network-ip")
          .then((r) => r.json())
          .then((data) => {
            if (data?.controlUrl) {
              setControlUrl(data.controlUrl);
            } else {
              setControlUrl(`${origin}/controle`);
            }
          })
          .catch(() => {
            setControlUrl(`${origin}/controle`);
          });
      } else {
        setControlUrl(`${origin}/controle`);
      }
    }
  }, []);

  // 2. Estado das Fofocas Reais & Fila
  const [gossipQueue, setGossipQueue] = useState<GossipItem[]>([]);
  const [activeGossip, setActiveGossip] = useState<GossipItem | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(GOSSIP_DURATION_MS);
  const displayedIdsRef = useRef<Set<string>>(new Set());

  // 3. Estado das Dicas Divertidas quando não há fofoca ativa
  const [tipIndex, setTipIndex] = useState<number>(0);
  const [tipFade, setTipFade] = useState<boolean>(true);

  // Alterna as dicas a cada 6 segundos quando a fofoca estiver ociosa
  useEffect(() => {
    if (activeGossip) return;

    const interval = setInterval(() => {
      setTipFade(false);
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % IDLE_PARTY_TIPS.length);
        setTipFade(true);
      }, 250);
    }, 6000);

    return () => clearInterval(interval);
  }, [activeGossip]);

  // Carga inicial de fofocas
  useEffect(() => {
    if (!initialGossips || initialGossips.length === 0) return;
    const valid = initialGossips.filter(
      (g) =>
        g.id &&
        !displayedIdsRef.current.has(g.id) &&
        !g.text.startsWith("[DELETADO]") &&
        g.text !== "__DELETED__"
    );
    if (valid.length === 0) return;

    if (!activeGossip) {
      setActiveGossip(valid[0]);
      setTimeLeft(GOSSIP_DURATION_MS);
      setGossipQueue(valid.slice(1));
    } else {
      setGossipQueue((prev) => {
        const existingIds = new Set([activeGossip.id, ...prev.map((i) => i.id)]);
        const newItems = valid.filter((i) => !existingIds.has(i.id));
        return [...prev, ...newItems];
      });
    }
  }, [initialGossips]);

  // Nova fofoca chegando em tempo real
  useEffect(() => {
    if (!incomingGossip || !incomingGossip.id || !incomingGossip.text?.trim()) return;
    if (
      incomingGossip.text.startsWith("[DELETADO]") ||
      incomingGossip.text === "__DELETED__"
    ) {
      return;
    }

    if (displayedIdsRef.current.has(incomingGossip.id)) return;
    if (activeGossip?.id === incomingGossip.id) return;

    setGossipQueue((prev) => {
      if (prev.some((item) => item.id === incomingGossip.id)) return prev;
      if (!activeGossip) {
        setActiveGossip(incomingGossip);
        setTimeLeft(GOSSIP_DURATION_MS);
        return prev;
      }
      return [...prev, incomingGossip];
    });
  }, [incomingGossip, activeGossip]);

  // Exclusão de fofoca pelo anfitrião
  useEffect(() => {
    if (!deletedGossipId) return;
    displayedIdsRef.current.add(deletedGossipId);

    if (activeGossip?.id === deletedGossipId) {
      setGossipQueue((prev) => {
        if (prev.length > 0) {
          const next = prev[0];
          setActiveGossip(next);
          return prev.slice(1);
        } else {
          setActiveGossip(null);
          return [];
        }
      });
    } else {
      setGossipQueue((prev) => prev.filter((i) => i.id !== deletedGossipId));
    }
  }, [deletedGossipId, activeGossip]);

  // Limpeza total de fofocas
  useEffect(() => {
    if (clearAllTrigger && clearAllTrigger > 0) {
      setActiveGossip(null);
      setGossipQueue([]);
    }
  }, [clearAllTrigger]);

  // Transição após 5s para a próxima fofoca (zero re-render spam no Safari)
  useEffect(() => {
    if (!activeGossip) return;

    const timer = setTimeout(() => {
      displayedIdsRef.current.add(activeGossip.id);
      setIsTransitioning(true);

      setTimeout(() => {
        setGossipQueue((prevQueue) => {
          if (prevQueue.length > 0) {
            const next = prevQueue[0];
            setActiveGossip(next);
            setIsTransitioning(false);
            return prevQueue.slice(1);
          } else {
            setActiveGossip(null);
            setIsTransitioning(false);
            return [];
          }
        });
      }, 200);
    }, GOSSIP_DURATION_MS);

    return () => clearTimeout(timer);
  }, [activeGossip]);

  return (
    <div className="w-full shrink-0 flex flex-col sm:flex-row items-stretch gap-2 md:gap-2.5 select-none z-20">
      {/* 1. CARD QR CODE: ULTRA NÍTIDO E PROEMINENTE EMBAIXO DO VÍDEO */}
      <div className="bg-slate-900/90 backdrop-blur-2xl border-2 border-cyan-500/40 rounded-2xl p-2 md:p-2.5 shadow-[0_0_25px_rgba(0,240,255,0.2)] flex items-center gap-2.5 shrink-0 hover:border-cyan-400 transition-all">
        <div className="p-1.5 bg-white rounded-xl shadow-md shrink-0">
          {controlUrl ? (
            <QRCodeSVG
              value={controlUrl}
              size={54}
              level="M"
              bgColor="#ffffff"
              fgColor="#050510"
            />
          ) : (
            <div className="w-14 h-14 bg-slate-200 animate-pulse rounded-lg" />
          )}
        </div>

        <div className="flex flex-col justify-center leading-tight pr-1">
          <div className="flex items-center gap-1 text-cyan-300 font-black text-[11px] uppercase tracking-wider">
            <Smartphone className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span>Peça no Celular</span>
          </div>
          <span className="text-white font-black text-xs mt-0.5 drop-shadow">
            Aponte a Câmera
          </span>
          <span className="font-mono text-[11px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 px-2 py-0.5 rounded-md mt-1 w-fit">
            /controle
          </span>
        </div>
      </div>

      {/* 2. CARD CENTRAL: MURAL FOFOCA VIP AO VIVO (SEMPRE ATIVO COM CONTEÚDO OU DICAS) */}
      <div className="bg-slate-900/90 backdrop-blur-2xl border-2 border-pink-500/45 rounded-2xl p-2 md:p-2.5 shadow-[0_0_25px_rgba(236,72,153,0.25)] flex-1 min-w-0 flex flex-col justify-between relative overflow-hidden">
        {/* Linha Neon Superior */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent opacity-90" />

        {/* Linha de Cabeçalho do Mural */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-pink-500/20 border border-pink-500/50 text-pink-300 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(236,72,153,0.3)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500" />
              </span>
              <span>FOFOCA VIP</span>
              <Flame className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 animate-pulse" />
            </div>

            {activeGossip && gossipQueue.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-white/10 border border-white/15 text-slate-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>+{gossipQueue.length} na fila</span>
              </span>
            )}

            {!activeGossip && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-slate-300">
                • Mural Interativo da Festa
              </span>
            )}
          </div>

          {/* Temporizador quando há fofoca real */}
          {activeGossip ? (
            <div className="flex items-center gap-1 bg-pink-950/80 border border-pink-500/50 text-pink-300 font-mono text-xs font-black px-2.5 py-0.5 rounded-full shadow-inner">
              <Clock className="w-3 h-3 text-pink-400 animate-spin" style={{ animationDuration: "5s" }} />
              <span>{Math.max(1, Math.ceil(timeLeft / 1000))}s</span>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-pink-300/80 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20 hidden sm:inline">
              Mande a sua pelo celular 📲
            </span>
          )}
        </div>

        {/* Linha Central: Texto da Fofoca ou Dica Divertida */}
        <div className="flex-1 flex items-center justify-center my-0.5 overflow-hidden">
          {activeGossip ? (
            <div
              className={`w-full text-center transition-all duration-200 transform ${
                isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
              }`}
            >
              <p className="font-black text-white text-xs sm:text-sm md:text-base tracking-wide truncate drop-shadow">
                <span className="text-pink-400 mr-1 font-serif text-base select-none">“</span>
                <span className="bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
                  {activeGossip.text}
                </span>
                <span className="text-pink-400 ml-1 font-serif text-base select-none">”</span>
              </p>
            </div>
          ) : (
            <div
              className={`w-full text-center transition-opacity duration-300 ${
                tipFade ? "opacity-100" : "opacity-0"
              }`}
            >
              <p className="font-bold text-slate-200 text-xs sm:text-sm truncate">
                {IDLE_PARTY_TIPS[tipIndex]}
              </p>
            </div>
          )}
        </div>

        {/* Barra de Progresso Neon Regressiva da Fofoca (Aceleração por Hardware) */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden shrink-0 mt-0.5">
          {activeGossip ? (
            <div
              key={activeGossip.id}
              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 shadow-[0_0_10px_rgba(236,72,153,0.9)] animate-[gossipCountdown_5s_linear_forwards] origin-left will-change-transform"
            />
          ) : (
            <div className="h-full bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-cyan-400/40 animate-pulse w-full" />
          )}
        </div>
      </div>

      {/* 3. CARD DIREITO: PRÓXIMO NA FILA ("PREPARA O GOGÓ") */}
      <div className="bg-slate-900/90 backdrop-blur-2xl border-2 border-purple-500/40 rounded-2xl p-2 md:p-2.5 shadow-[0_0_20px_rgba(168,85,247,0.2)] w-full sm:w-56 md:w-64 shrink-0 flex flex-col justify-center overflow-hidden">
        {nextSong ? (
          <div>
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-cyan-300">
                <Mic className="w-3 h-3 text-cyan-400" />
                <span>A Seguir</span>
              </span>
              {nextSong.is_priority && (
                <span className="text-[9px] font-black uppercase bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 px-1.5 py-0.2 rounded shadow animate-pulse">
                  ⭐ VIP
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 truncate">
              {nextSong.singer_name}
            </p>
            <p className="text-[11px] text-slate-300 truncate">
              "{nextSong.title}"
            </p>
          </div>
        ) : isPartyActive && nextPartyTrack ? (
          <div>
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-pink-300">
                <Radio className="w-3 h-3 text-pink-400" />
                <span>Na Festa • A Seguir</span>
              </span>
              <span className="text-[9px] text-yellow-300 font-bold">Clipe Oficial</span>
            </div>
            <p className="text-xs md:text-sm font-black text-white truncate">
              {nextPartyTrack.artist}
            </p>
            <p className="text-[11px] text-pink-200 truncate">
              "{nextPartyTrack.title}"
            </p>
          </div>
        ) : (
          <div className="text-center py-0.5">
            <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-yellow-300 mb-0.5">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              <span>Palco Aberto</span>
            </div>
            <p className="text-xs font-black text-white truncate">
              Sua vez de cantar!
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              Peça uma música pelo celular
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
