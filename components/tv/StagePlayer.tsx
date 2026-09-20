"use client";

import { useEffect, useRef, useState, useMemo, useImperativeHandle, forwardRef } from "react";
import YouTube, { YouTubeProps, YouTubePlayer } from "react-youtube";
import { KaraokeQueueItem, supabase } from "@/lib/supabase";
import { soundManager } from "@/lib/sound-manager";
import confetti from "canvas-confetti";
import {
  Mic,
  SkipForward,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  AlertCircle,
  Sparkles,
  Radio,
  Clock,
  RefreshCw,
} from "lucide-react";

export interface StagePlayerRef {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  restart: () => void;
  skip: () => void;
  setVolume: (val: number) => void;
  getVolume: () => number;
  toggleMute: () => void;
}

interface StagePlayerProps {
  currentSong: KaraokeQueueItem | null;
  nextSong: KaraokeQueueItem | null;
  onSongEnd: () => void;
  onSkipSong: () => void;
}

export const StagePlayer = forwardRef<StagePlayerRef, StagePlayerProps>(function StagePlayer(
  { currentSong, nextSong, onSongEnd, onSkipSong },
  ref
) {
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [overrideVideoId, setOverrideVideoId] = useState<string | null>(null);
  const attemptedRecoveryIdsRef = useRef<Set<string>>(new Set());

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMutedAutoplay, setIsMutedAutoplay] = useState(false);
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gukaraoke_music_volume");
      if (saved) return Number(saved);
    }
    return 100;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [errorSkipCountdown, setErrorSkipCountdown] = useState<number | null>(null);

  // Progresso do Vídeo & Tempo Restante
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [showPreparaBanner, setShowPreparaBanner] = useState(false);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageWrapperRef = useRef<HTMLDivElement | null>(null);
  const [stageDimensions, setStageDimensions] = useState<{ width: number; height: number } | null>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimer = useRef<NodeJS.Timeout | null>(null);

  // Calcula com perfeição o enquadramento widescreen 16:9 que preenche o palco ao máximo (MacBook 13", TV 1080p)
  useEffect(() => {
    if (!stageWrapperRef.current) return;
    const updateSize = () => {
      if (!stageWrapperRef.current) return;
      const { clientWidth, clientHeight } = stageWrapperRef.current;
      if (clientWidth > 0 && clientHeight > 0) {
        const targetRatio = 16 / 9;
        let w = clientWidth;
        let h = clientWidth / targetRatio;
        if (h > clientHeight) {
          h = clientHeight;
          w = clientHeight * targetRatio;
        }
        setStageDimensions({ width: Math.floor(w), height: Math.floor(h) });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(stageWrapperRef.current);
    return () => observer.disconnect();
  }, []);

  // Ajuste de volume persistido e sincronizado com o player do YouTube
  const changeVolume = (newVol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVol)));
    setVolumeState(clamped);
    if (playerRef.current && typeof playerRef.current.setVolume === "function") {
      try {
        playerRef.current.setVolume(clamped);
        if (clamped > 0 && isMuted) {
          playerRef.current.unMute();
          setIsMuted(false);
          setIsMutedAutoplay(false);
        }
      } catch {}
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("gukaraoke_music_volume", clamped.toString());
    }
  };

  // Imperative handle para controle remoto do host (via celular)
  useImperativeHandle(ref, () => ({
    play: () => {
      try {
        playerRef.current?.playVideo?.();
        setIsPlaying(true);
      } catch {}
    },
    pause: () => {
      try {
        playerRef.current?.pauseVideo?.();
        setIsPlaying(false);
      } catch {}
    },
    togglePlay: () => {
      if (isPlaying) {
        playerRef.current?.pauseVideo?.();
        setIsPlaying(false);
      } else {
        playerRef.current?.playVideo?.();
        setIsPlaying(true);
      }
    },
    restart: () => restartSong(),
    skip: () => onSkipSong(),
    setVolume: (val: number) => changeVolume(val),
    getVolume: () => volume,
    toggleMute: () => toggleMute(),
  }));

  // Monitora progresso do vídeo e tempo restante
  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        try {
          const curr = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;
          setCurrentTime(curr);
          setDuration(dur);

          if (dur > 0) {
            const pct = Math.min(100, Math.max(0, (curr / dur) * 100));
            setProgressPercent(pct);

            const remaining = dur - curr;
            if (remaining <= 20 && remaining > 1 && nextSong) {
              setShowPreparaBanner(true);
            } else {
              setShowPreparaBanner(false);
            }
          }
        } catch {}
      }
    }, 500);

    return () => clearInterval(timer);
  }, [nextSong]);

  // Contagem regressiva de auto-skip em caso de erro no vídeo
  useEffect(() => {
    if (errorSkipCountdown !== null) {
      if (errorSkipCountdown <= 0) {
        setErrorSkipCountdown(null);
        setPlayerError(null);
        onSkipSong();
        return;
      }
      const timer = setTimeout(() => {
        setErrorSkipCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [errorSkipCountdown, onSkipSong]);

  // Gatilho ao trocar de música
  useEffect(() => {
    if (currentSong) {
      setPlayerError(null);
      setErrorSkipCountdown(null);
      setIsRecovering(false);
      setRecoveryMessage(null);
      setOverrideVideoId(null);
      setIsMutedAutoplay(false);
      setProgressPercent(0);
      setShowPreparaBanner(false);

      const isPartyTrack = currentSong.id.startsWith("party_");

      if (isPartyTrack) {
        setCountdown(null);
        setTimeout(() => {
          if (playerRef.current) {
            try {
              playerRef.current.playVideo();
            } catch {}
          }
        }, 200);
      } else {
        setCountdown(3);
        soundManager.play("gong");

        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(interval);
              // Ao terminar a contagem regressiva, garante que o vídeo dê play
              setTimeout(() => {
                if (playerRef.current) {
                  try {
                    playerRef.current.playVideo();
                  } catch {}
                }
              }, 300);
              return null;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(interval);
      }
    }
  }, [currentSong?.id]);

  // Conclusão com confetes (para cantores reais)
  const handleInternalEnd = () => {
    const isPartyTrack = currentSong?.id.startsWith("party_");
    if (!isPartyTrack && currentSong && currentSong.positive_votes > currentSong.tomatoes) {
      try {
        confetti({
          particleCount: 120,
          spread: 85,
          origin: { y: 0.5 },
        });
        soundManager.play("aplausos");
      } catch {}
    }
    onSongEnd();
  };

  // ESTRATÉGIA DE ÁUDIO E AUTOPLAY CONTÍNUO:
  const onReady: YouTubeProps["onReady"] = (event) => {
    playerRef.current = event.target;

    try {
      const iframe = typeof event.target.getIframe === "function" ? event.target.getIframe() : null;
      if (iframe) {
        iframe.setAttribute("referrerpolicy", "origin-when-cross-origin");
        iframe.setAttribute(
          "allow",
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        );
      }
    } catch {}

    const isAudioPermanentlyUnlocked =
      typeof window !== "undefined" &&
      (localStorage.getItem("gukaraoke_audio_unlocked") === "true" ||
        Boolean((navigator as any)?.userActivation?.hasBeenActive));

    const attemptPlay = () => {
      try {
        const targetVol = volume > 0 ? volume : 100;
        if (typeof event.target.setVolume === "function") {
          event.target.setVolume(targetVol);
        }

        // Se o som já foi ativado uma vez, NUNCA muta entre as músicas!
        if (isAudioPermanentlyUnlocked || !isMuted) {
          event.target.unMute();
          setIsMuted(false);
          setIsMutedAutoplay(false);
        }
        event.target.playVideo();
      } catch {}

      // Se o som já está desbloqueado, NUNCA executa watchdog de mutar!
      if (isAudioPermanentlyUnlocked) {
        return;
      }

      // Watchdog apenas no primeiro carregamento frio antes de qualquer clique
      if (watchdogTimer.current) clearTimeout(watchdogTimer.current);
      watchdogTimer.current = setTimeout(() => {
        try {
          if (
            localStorage.getItem("gukaraoke_audio_unlocked") === "true" ||
            Boolean((navigator as any)?.userActivation?.hasBeenActive)
          ) {
            return;
          }

          const state = event.target.getPlayerState();
          // Apenas se o browser travou em paused (2) por bloqueio estrito de autoplay
          if (state === 2) {
            console.warn("Autoplay com áudio bloqueado no primeiro carregamento sem clique.");
            event.target.mute();
            event.target.playVideo();
            setIsMutedAutoplay(true);
            setIsMuted(true);
          }
        } catch {}
      }, 4000);
    };

    attemptPlay();
  };

  const onStateChange: YouTubeProps["onStateChange"] = (event) => {
    // 1 = PLAYING
    if (event.data === 1) {
      setIsPlaying(true);
      setPlayerError(null);
      setErrorSkipCountdown(null);
    } else if (event.data === 2) {
      setIsPlaying(false);
    }
  };

  // Tratamento Inteligente de Erro do YouTube com Auto-Recuperação de Versão Alternativa
  const onError: YouTubeProps["onError"] = async (event) => {
    console.warn("YouTube Player error:", event.data);
    if (!currentSong) return;

    // Se for clipe do Modo Festa, pula imediatamente para o próximo clipe oficial sem interromper a festa
    if (currentSong.id.startsWith("party_")) {
      console.warn("Clipe do Modo Festa com restrição, pulando imediatamente para o próximo...");
      onSkipSong();
      return;
    }

    const currentBadVideoId = overrideVideoId || currentSong.video_id;

    // 1. Se ainda não tentou auto-recuperar esta música, busca versão alternativa de karaokê verificada
    if (!attemptedRecoveryIdsRef.current.has(currentSong.id)) {
      attemptedRecoveryIdsRef.current.add(currentSong.id);
      setIsRecovering(true);
      setRecoveryMessage(`Buscando outra versão liberada de "${currentSong.title}"...`);

      try {
        const cleanTitle = currentSong.title
          .replace(/\(karaok[eê].*?\)/gi, "")
          .replace(/\[karaok[eê].*?\]/gi, "")
          .replace(/\(com letra.*?\)/gi, "")
          .replace(/\(instrumental.*?\)/gi, "")
          .replace(/\(vers[aã]o.*?\)/gi, "")
          .trim();

        const res = await fetch(`/api/search-youtube?q=${encodeURIComponent(cleanTitle || currentSong.title)}`);
        const data = await res.json();

        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          const alternative = data.items.find(
            (item: any) => item.videoId && item.videoId !== currentBadVideoId
          );

          if (alternative) {
            setRecoveryMessage(
              `Versão compatível encontrada: "${alternative.title.substring(0, 32)}..."! Iniciando show...`
            );

            try {
              await supabase
                .from("karaoke_queue")
                .update({ video_id: alternative.videoId })
                .eq("id", currentSong.id);
            } catch {}

            setTimeout(() => {
              setOverrideVideoId(alternative.videoId);
              setIsRecovering(false);
              setRecoveryMessage(null);
              setPlayerError(null);
              setErrorSkipCountdown(null);
            }, 500);
            return;
          }
        }
      } catch (err) {
        console.error("Erro na busca de versão alternativa:", err);
      }
    }

    // 2. Se a recuperação automática não encontrou outra versão
    setIsRecovering(false);
    setRecoveryMessage(null);

    let msg = "Vídeo indisponível ou com restrição da gravadora no YouTube. Pulando em 3s...";
    if (event.data === 100) {
      msg = "Este vídeo do YouTube foi removido ou tornado privado. Pulando em 3s...";
    } else if (event.data === 101 || event.data === 150) {
      msg = "O proprietário deste vídeo restringiu a reprodução externa. Pulando em 3s...";
    }
    setPlayerError(msg);
    setErrorSkipCountdown(3);
  };

  // Desmuta e ativa áudio com 1 clique em qualquer lugar
  const unmuteAndStartAudio = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gukaraoke_audio_unlocked", "true");
    }
    soundManager.unlockAudio();
    if (playerRef.current) {
      try {
        playerRef.current.unMute();
        if (typeof playerRef.current.setVolume === "function") {
          playerRef.current.setVolume(volume > 0 ? volume : 100);
        }
        playerRef.current.playVideo();
      } catch {}
    }
    setIsMuted(false);
    setIsMutedAutoplay(false);
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const restartSong = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(0, true);
      playerRef.current.playVideo();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
      setIsMutedAutoplay(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("gukaraoke_audio_unlocked", "true");
      }
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const opts: YouTubeProps["opts"] = useMemo(
    () => ({
      height: "100%",
      width: "100%",
      playerVars: {
        autoplay: 1,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        fs: 0,
        playsinline: 1,
        enablejsapi: 1,
        iv_load_policy: 3,
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    }),
    []
  );

  return (
    <div
      ref={stageWrapperRef}
      className="w-full h-full min-h-0 min-w-0 flex items-center justify-center overflow-hidden"
    >
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        style={
          isFullscreen
            ? { width: "100vw", height: "100vh" }
            : stageDimensions
            ? { width: `${stageDimensions.width}px`, height: `${stageDimensions.height}px` }
            : { width: "100%", aspectRatio: "16 / 9" }
        }
        className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-white/15 bg-black shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col justify-center select-none shrink-0"
      >
      {/* Luzes de Palco Neon */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-purple-600/20 via-cyan-500/10 to-transparent pointer-events-none z-10" />
      <div className="absolute -top-10 left-1/4 w-36 h-64 bg-pink-500/20 blur-3xl transform -rotate-12 pointer-events-none animate-pulse" />
      <div className="absolute -top-10 right-1/4 w-36 h-64 bg-cyan-500/20 blur-3xl transform rotate-12 pointer-events-none animate-pulse" />

      {/* AVISO SALVADOR DE AUTOPLAY: SE O NAVEGADOR EXIGIR CLIQUE PARA ÁUDIO */}
      {isMutedAutoplay && (
        <div className="absolute top-5 left-5 z-40 animate-bounce">
          <button
            onClick={unmuteAndStartAudio}
            className="bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 hover:scale-105 text-black font-black px-4 py-2.5 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.8)] border-2 border-white flex items-center gap-2.5 text-xs transition-all"
          >
            <VolumeX className="w-4 h-4 animate-pulse" />
            <span>Vídeo tocando! Clique aqui para LIGAR O SOM 🔊</span>
          </button>
        </div>
      )}

      {/* BADGE "MODO FESTA • CLIPE OFICIAL" */}
      {currentSong && currentSong.id.startsWith("party_") && (
        <div className="absolute top-4 left-5 z-30 flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-xl border border-pink-500/60 px-4 py-2 rounded-full shadow-[0_0_30px_rgba(255,0,127,0.4)] animate-in fade-in duration-300">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-80" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500" />
          </span>
          <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            🎉 MODO FESTA • CLIPE OFICIAL
          </span>
          <span className="text-[11px] text-slate-300 font-semibold hidden sm:inline">
            — Aponte no QR Code para cantar e furar a fila!
          </span>
        </div>
      )}

      {/* BANNER ANIMADO: "PREPARA O GOGÓ" NOS 20s FINAIS (CENTRALIZADO NO CENTRO DO VÍDEO) */}
      {showPreparaBanner && nextSong && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 pointer-events-none animate-in fade-in zoom-in-90 duration-300">
          <div className="max-w-xl w-full animate-bounce duration-1000">
            <div className="bg-gradient-to-r from-amber-500/95 via-pink-600/95 to-purple-600/95 backdrop-blur-2xl border-2 border-white/40 text-white p-5 md:p-6 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.85)] flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-inner shrink-0">
                <span className="text-3xl animate-spin">🎤</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs md:text-sm font-black uppercase tracking-widest text-yellow-300 drop-shadow">
                  <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
                  <span>Prepara o Gogó!</span>
                </div>
                <h4 className="text-base md:text-xl font-black text-white truncate mt-0.5 drop-shadow">
                  <span className="text-yellow-200 underline decoration-yellow-400 decoration-2">{nextSong.singer_name}</span> canta a seguir:
                </h4>
                <p className="text-sm md:text-base font-bold text-cyan-200 truncate mt-0.5 drop-shadow">
                  "{nextSong.title}"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTAGEM REGRESSIVA CINEMATOGRÁFICA DE ENTRADA (Apenas cantores reais) */}
      {countdown !== null && currentSong && !currentSong.id.startsWith("party_") && (
        <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
          <div className="space-y-4 max-w-xl">
            <span className="inline-flex items-center gap-2 bg-pink-600/30 text-pink-300 font-black text-xs md:text-sm px-4 py-1.5 rounded-full border border-pink-500/40 uppercase tracking-widest shadow-[0_0_20px_rgba(255,0,127,0.4)]">
              <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
              Subindo ao Palco Agora
            </span>

            <h3 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
              {currentSong.singer_name}
            </h3>

            <p className="text-lg md:text-2xl text-cyan-300 font-bold drop-shadow truncate">
              "{currentSong.title}"
            </p>

            <div className="pt-4">
              <span className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-pink-500 animate-ping inline-block">
                {countdown}
              </span>
            </div>
          </div>
        </div>
      )}

      {currentSong ? (
        <div className="relative w-full h-full flex flex-col justify-center">
          {/* PLAYER DO YOUTUBE - Com key dinâmica para auto-recuperação e montagem limpa */}
          <div className="w-full h-full absolute inset-0">
            <YouTube
              key={`${currentSong.id}-${overrideVideoId || currentSong.video_id}`}
              videoId={overrideVideoId || currentSong.video_id}
              opts={opts}
              onReady={onReady}
              onEnd={handleInternalEnd}
              onStateChange={onStateChange}
              onError={onError}
              className="w-full h-full"
              iframeClassName="w-full h-full rounded-2xl md:rounded-3xl"
            />
          </div>

          {/* BARRA DE PROGRESSO NEON NA BASE DO VÍDEO */}
          <div className="absolute bottom-0 left-0 right-0 z-20 h-1.5 bg-black/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.9)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* EQUALIZADOR ANIMADO & TEMPO */}
          <div className="absolute bottom-3 left-6 z-20 pointer-events-none flex items-center gap-3">
            <div className="flex items-end gap-1 opacity-80">
              <div className="w-1 bg-pink-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-4" />
              <div className="w-1 bg-purple-500 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-7" />
              <div className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-5" />
              <div className="w-1 bg-yellow-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-8" />
              <div className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-3" />
              <div className="w-1 bg-pink-400 rounded-full animate-[pulse_0.9s_ease-in-out_infinite] h-6" />
            </div>

            <div className="bg-black/60 px-2.5 py-1 rounded-lg border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 backdrop-blur-md">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
          </div>

          {/* DOCA DE CONTROLES DO ANFITRIÃO */}
          <div
            className={`absolute bottom-4 right-6 z-30 flex items-center gap-2 bg-slate-900/85 backdrop-blur-xl border border-white/20 p-2 rounded-2xl shadow-2xl transition-all duration-300 ${
              showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
            }`}
          >
            <button
              onClick={togglePlay}
              title={isPlaying ? "Pausar" : "Tocar"}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={restartSong}
              title="Reiniciar do começo"
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Controle Interativo de Volume da Música */}
            <div className="flex items-center gap-1.5 bg-white/10 p-1.5 px-2.5 rounded-xl border border-white/15">
              <button
                onClick={toggleMute}
                title={isMuted ? "Desmutar" : "Mutar"}
                className="text-white hover:text-cyan-300 transition-all p-0.5"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                className="w-14 sm:w-20 h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-pink-400 transition-all"
                title={`Volume da Música: ${isMuted ? 0 : volume}%`}
              />
              <span className="text-[11px] font-mono font-bold text-slate-300 min-w-[28px] text-right select-none">
                {isMuted ? "0%" : `${volume}%`}
              </span>
            </div>

            <button
              onClick={onSkipSong}
              title="Pular para a próxima música"
              className="p-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl transition-all flex items-center gap-1 text-xs font-black shadow"
            >
              <SkipForward className="w-4 h-4" />
              <span>Pular</span>
            </button>

            <button
              onClick={toggleFullscreen}
              title="Tela Cheia"
              className="p-2.5 bg-white/10 hover:bg-white/20 text-cyan-300 rounded-xl transition-all"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>

          {/* TELA DE AUTO-RECUPERAÇÃO DE VÍDEO ALTERNATIVO */}
          {isRecovering && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 z-40 text-center animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center mb-3 shadow-[0_0_25px_rgba(0,240,255,0.4)]">
                <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white">Auto-Recuperação de Karaokê</h3>
              <p className="text-cyan-300 font-semibold text-sm md:text-base max-w-md mt-2">
                {recoveryMessage}
              </p>
              <p className="text-xs text-slate-400 mt-2 font-mono">
                🎤 Não se preocupe! Buscando outra versão para você não perder a sua vez.
              </p>
            </div>
          )}

          {/* FALLBACK DE ERRO COM AUTO-SKIP EM 10s */}
          {playerError && !isRecovering && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 md:p-8 z-30 text-center animate-in fade-in duration-200">
              <AlertCircle className="w-12 h-12 text-amber-400 mb-3 animate-pulse" />
              <h3 className="text-xl md:text-2xl font-black text-white">Vídeo com Bloqueio no YouTube</h3>
              <p className="text-slate-300 text-sm max-w-md mt-1 mb-2">
                {playerError}
              </p>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs text-slate-200 mb-4 max-w-md">
                <span>Cantor: <b className="text-white">{currentSong.singer_name}</b> • Música: <b className="text-cyan-300">"{currentSong.title}"</b></span>
              </div>

              {errorSkipCountdown !== null && (
                <p className="text-yellow-400 font-bold text-xs md:text-sm mb-4 animate-pulse">
                  ⏭️ Pulando automaticamente em <span className="font-mono text-base font-black">{errorSkipCountdown}s</span>...
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={onSkipSong}
                  className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-black px-5 py-2.5 rounded-xl flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,0,127,0.5)] active:scale-95 text-xs md:text-sm"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Pular para Próxima</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Palco Aberto / Estado Vazio */
        <div className="flex flex-col items-center justify-center text-center p-8 z-10">
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-pink-600 via-purple-600 to-cyan-500 flex items-center justify-center shadow-[0_0_50px_rgba(255,0,127,0.5)] animate-pulse">
              <Mic className="w-14 h-14 text-white" />
            </div>
            <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-2xl -z-10" />
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            PALCO <span className="text-neon-pink">ABERTO</span>
          </h2>
          <p className="text-slate-400 max-w-md text-base mt-3">
            O karaokê está pronto para o show! Use o QR Code ao lado ou acesse{" "}
            <span className="text-cyan-400 font-mono font-bold">/controle</span> no seu celular para escolher uma música.
          </p>
        </div>
      )}
      </div>
    </div>
  );
});
