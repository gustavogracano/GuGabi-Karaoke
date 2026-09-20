"use client";

import { useState, useEffect, useRef } from "react";
import { Flame, Clock, Sparkles } from "lucide-react";

export interface GossipItem {
  id: string;
  text: string;
  createdAt?: string;
}

interface GossipTickerProps {
  incomingGossip?: GossipItem | null;
  initialGossips?: GossipItem[];
  deletedGossipId?: string | null;
  clearAllTrigger?: number;
  gossips?: string[]; // Retrocompatibilidade caso ainda seja passado string[]
}

const DISPLAY_DURATION_MS = 5000; // 5 segundos por fofoca
const TIMER_TICK_MS = 50;

export function GossipTicker({
  incomingGossip,
  initialGossips,
  deletedGossipId,
  clearAllTrigger,
  gossips,
}: GossipTickerProps) {
  const [queue, setQueue] = useState<GossipItem[]>([]);
  const [currentGossip, setCurrentGossip] = useState<GossipItem | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(DISPLAY_DURATION_MS);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Registro de IDs já exibidos para não repetir durante a mesma sessão
  const displayedIdsRef = useRef<Set<string>>(new Set());

  // 1. Carga inicial de fofocas recentes
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

    if (!currentGossip) {
      setCurrentGossip(valid[0]);
      setTimeLeft(DISPLAY_DURATION_MS);
      setQueue(valid.slice(1));
    } else {
      setQueue((prev) => {
        const existingIds = new Set([currentGossip.id, ...prev.map((i) => i.id)]);
        const newItems = valid.filter((i) => !existingIds.has(i.id));
        return [...prev, ...newItems];
      });
    }
  }, [initialGossips]);

  // 1b. Suporte a gossips legados em string[] (se fornecido)
  const prevLegacyGossipsRef = useRef<string[]>([]);
  useEffect(() => {
    if (!gossips || gossips.length === 0) return;
    const newStrings = gossips.filter(
      (g) =>
        g &&
        !g.startsWith("[DELETADO]") &&
        g !== "__DELETED__" &&
        !prevLegacyGossipsRef.current.includes(g)
    );
    prevLegacyGossipsRef.current = gossips;

    if (newStrings.length === 0) return;

    const items: GossipItem[] = newStrings.map((s) => ({
      id: `legacy-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: s,
    }));

    if (!currentGossip) {
      setCurrentGossip(items[0]);
      setTimeLeft(DISPLAY_DURATION_MS);
      setQueue((prev) => [...prev, ...items.slice(1)]);
    } else {
      setQueue((prev) => [...prev, ...items]);
    }
  }, [gossips, currentGossip]);

  // 2. Nova fofoca chegando via Realtime
  useEffect(() => {
    if (!incomingGossip || !incomingGossip.id || !incomingGossip.text?.trim()) return;
    if (
      incomingGossip.text.startsWith("[DELETADO]") ||
      incomingGossip.text === "__DELETED__"
    ) {
      return;
    }

    // Se já foi exibida ou é a atual, ignora
    if (displayedIdsRef.current.has(incomingGossip.id)) return;
    if (currentGossip?.id === incomingGossip.id) return;

    setQueue((prev) => {
      // Se já está na fila, ignora duplicata
      if (prev.some((item) => item.id === incomingGossip.id)) {
        return prev;
      }

      // Se nenhuma fofoca está ativa no momento, ativa imediatamente
      if (!currentGossip) {
        setCurrentGossip(incomingGossip);
        setTimeLeft(DISPLAY_DURATION_MS);
        return prev;
      }

      // Caso contrário, adiciona ao final da fila
      return [...prev, incomingGossip];
    });
  }, [incomingGossip, currentGossip]);

  // 3. Exclusão de Fofoca pelo Admin (individual)
  useEffect(() => {
    if (!deletedGossipId) return;

    displayedIdsRef.current.add(deletedGossipId);

    // Se a fofoca deletada está no ar agora, pula imediatamente para a próxima
    if (currentGossip?.id === deletedGossipId) {
      setQueue((prev) => {
        if (prev.length > 0) {
          const next = prev[0];
          setCurrentGossip(next);
          setTimeLeft(DISPLAY_DURATION_MS);
          return prev.slice(1);
        } else {
          setCurrentGossip(null);
          setTimeLeft(DISPLAY_DURATION_MS);
          return [];
        }
      });
    } else {
      // Remove da fila de espera se estiver aguardando
      setQueue((prev) => prev.filter((item) => item.id !== deletedGossipId));
    }
  }, [deletedGossipId, currentGossip]);

  // 4. Limpeza total de fofocas pelo Admin
  useEffect(() => {
    if (clearAllTrigger && clearAllTrigger > 0) {
      setCurrentGossip(null);
      setQueue([]);
      setTimeLeft(DISPLAY_DURATION_MS);
    }
  }, [clearAllTrigger]);

  // 5. Contador decrescente da fofoca em exibição (50ms por tick)
  useEffect(() => {
    if (!currentGossip) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - TIMER_TICK_MS));
    }, TIMER_TICK_MS);

    return () => clearInterval(interval);
  }, [currentGossip]);

  // 6. Transição após os 5 segundos: avança para a próxima da fila ou encerra
  useEffect(() => {
    if (timeLeft === 0 && currentGossip) {
      displayedIdsRef.current.add(currentGossip.id);
      setIsTransitioning(true);

      const timer = setTimeout(() => {
        setQueue((prevQueue) => {
          if (prevQueue.length > 0) {
            const next = prevQueue[0];
            setCurrentGossip(next);
            setTimeLeft(DISPLAY_DURATION_MS);
            setIsTransitioning(false);
            return prevQueue.slice(1);
          } else {
            // Fila esgotada: esconde a barra
            setCurrentGossip(null);
            setTimeLeft(DISPLAY_DURATION_MS);
            setIsTransitioning(false);
            return [];
          }
        });
      }, 220);

      return () => clearTimeout(timer);
    }
  }, [timeLeft, currentGossip]);

  const isVisible = Boolean(currentGossip);
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / DISPLAY_DURATION_MS) * 100));

  return (
    <div
      className={`w-full relative overflow-hidden transition-all duration-500 ease-in-out select-none ${
        isVisible
          ? "h-12 md:h-14 opacity-100 translate-y-0 bg-slate-950/95 backdrop-blur-2xl border-t-2 border-pink-500/50 shadow-[0_-8px_25px_rgba(236,72,153,0.3)] flex flex-col justify-center"
          : "h-0 max-h-0 opacity-0 translate-y-4 pointer-events-none border-t-0 py-0"
      }`}
    >
      {isVisible && currentGossip && (
        <>
          {/* Brilho neon de topo */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-400 to-transparent opacity-80" />

          {/* Conteúdo Central */}
          <div className="flex items-center justify-between px-3 sm:px-6 md:px-8 w-full">
            {/* Lado Esquerdo: Badge VIP e Contador de Fila */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-pink-500/25 via-purple-500/25 to-pink-500/15 border border-pink-500/45 text-pink-300 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500" />
                </span>
                <span>FOFOCA VIP</span>
                <Flame className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 animate-pulse" />
              </div>

              {queue.length > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 bg-white/10 border border-white/15 text-slate-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>+{queue.length} na fila</span>
                </span>
              )}
            </div>

            {/* Centro: Texto Único em Destaque Absoluto com Transição Suave */}
            <div className="flex-1 mx-3 md:mx-6 text-center overflow-hidden">
              <div
                className={`transition-all duration-200 transform ${
                  isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
                }`}
              >
                {(() => {
                  // Suporta opcionalmente fofocas que venham com autor no formato "[Nome]: Mensagem" ou texto puro
                  const matchAuthor = currentGossip.text.match(/^\[(.*?)\]:\s*(.*)$/);
                  const author = matchAuthor ? matchAuthor[1] : null;
                  const displayMessage = matchAuthor ? matchAuthor[2] : currentGossip.text;

                  return (
                    <p
                      className={`font-black text-white tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] ${
                        displayMessage.length > 55
                          ? "text-xs md:text-sm line-clamp-1"
                          : "text-xs sm:text-sm md:text-base lg:text-lg line-clamp-1"
                      }`}
                    >
                      {author && (
                        <span className="mr-2 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] md:text-xs font-black bg-pink-500/20 text-pink-300 border border-pink-500/30">
                          {author}
                        </span>
                      )}
                      <span className="text-pink-400 mr-1 font-serif text-base md:text-lg select-none">“</span>
                      <span className="bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
                        {displayMessage}
                      </span>
                      <span className="text-pink-400 ml-1 font-serif text-base md:text-lg select-none">”</span>
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Lado Direito: Temporizador 5s Regressivo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-pink-950/70 border border-pink-500/40 text-pink-300 font-mono text-xs font-black px-2.5 py-0.5 rounded-full shadow-inner">
                <Clock
                  className="w-3 h-3 text-pink-400 animate-spin"
                  style={{ animationDuration: "5s" }}
                />
                <span>{Math.max(1, Math.ceil(timeLeft / 1000))}s</span>
              </div>
            </div>
          </div>

          {/* Barra de Progresso Regressiva dos 5 Segundos */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 shadow-[0_0_12px_rgba(236,72,153,0.9)] transition-[width] duration-75 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
