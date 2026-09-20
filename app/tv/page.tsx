"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  supabase,
  isSupabaseConfigured,
  KaraokeQueueItem,
  KaraokeEvent,
} from "@/lib/supabase";
import { soundManager, SoundEffect } from "@/lib/sound-manager";
import { StagePlayer, StagePlayerRef } from "@/components/tv/StagePlayer";
import { SideQueue } from "@/components/tv/SideQueue";
import { FloatingEmojis, EmojiParticle } from "@/components/tv/FloatingEmojis";
import { TomatoSplatter } from "@/components/tv/TomatoSplatter";
import { StageBottomBar, GossipItem } from "@/components/tv/StageBottomBar";
import { MemePopup, ActiveMeme } from "@/components/tv/MemePopup";
import { DEFAULT_PARTY_PLAYLIST, PartySong } from "@/lib/party-playlist";
import { BarChart3, Wifi, WifiOff, Volume2, Music2, Keyboard, Sparkles } from "lucide-react";

export default function TVPage() {
  const [currentSong, setCurrentSong] = useState<KaraokeQueueItem | null>(null);
  const [pendingSongs, setPendingSongs] = useState<KaraokeQueueItem[]>([]);

  // Modo Festa Contínua: Playlist dinâmica sincronizada em tempo real via tabela Supabase
  const [isPartyModeEnabled, setIsPartyModeEnabled] = useState<boolean>(true);
  const [partyIndex, setPartyIndex] = useState<number>(0);
  const [partyPlaylist, setPartyPlaylist] = useState<PartySong[]>(DEFAULT_PARTY_PLAYLIST);
  const [activePartyTrack, setActivePartyTrack] = useState<PartySong | null>(null);

  // Mantém a playlistRef atualizada para buscas estáveis
  const partyPlaylistRef = useRef<PartySong[]>(partyPlaylist);
  useEffect(() => {
    partyPlaylistRef.current = partyPlaylist;
    // Se ainda não tem nenhuma tocando e a lista carregou, inicia na primeira
    if (!activePartyTrack && partyPlaylist.length > 0) {
      setActivePartyTrack(partyPlaylist[0]);
    }
  }, [partyPlaylist, activePartyTrack]);

  // Alterna para a próxima música da festa (somente quando a música atual terminar ou for pulada)
  const advancePartySong = useCallback(() => {
    const list = partyPlaylistRef.current;
    if (list.length === 0) return;

    setActivePartyTrack((currentTrack) => {
      if (!currentTrack) return list[0];
      const currentIndex = list.findIndex((s) => s.videoId === currentTrack.videoId);
      const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % list.length : 0;
      return list[nextIndex] || list[0];
    });
  }, []);

  // Liga/desliga o modo festa contínua
  const togglePartyMode = useCallback(() => {
    setIsPartyModeEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("gukaraoke_party_mode_enabled", String(next));
      }
      return next;
    });
  }, []);

  const [emojis, setEmojis] = useState<EmojiParticle[]>([]);
  const [incomingGossip, setIncomingGossip] = useState<GossipItem | null>(null);
  const [initialGossips, setInitialGossips] = useState<GossipItem[]>([]);
  const [deletedGossipId, setDeletedGossipId] = useState<string | null>(null);
  const [clearAllGossipsTrigger, setClearAllGossipsTrigger] = useState<number>(0);
  const [activeMeme, setActiveMeme] = useState<ActiveMeme | null>(null);
  const [isTomatoSplatterActive, setIsTomatoSplatterActive] = useState(false);
  const [tomatoAttackInfo, setTomatoAttackInfo] = useState<{ isSolo: boolean; attackerName: string | null }>({
    isSolo: false,
    attackerName: null,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gukaraoke_audio_unlocked") === "true";
    }
    return false;
  });

  // Referência ao player para comandos remotos do anfitrião
  const playerRef = useRef<StagePlayerRef | null>(null);

  // Registro de tomates com nome do autor para lógica inteligente de tomataço
  const recentTomatoEventsRef = useRef<{ timestamp: number; sender: string }[]>([]);
  const isTomatoSplatterActiveRef = useRef(false);

  // Prevenção de sobreposição de sons na TV (mínimo 2.5s entre memes na TV)
  const lastMemeTimeRef = useRef<number>(0);

  // Rastreamento de votos para pular (songId -> Set<userName>) para garantir unicidade
  const skipVotesRef = useRef<Map<string, Set<string>>>(new Map());

  // 1. Carrega fila inicial do Supabase
  const fetchQueue = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from("karaoke_queue")
        .select("*")
        .order("is_priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao carregar fila:", error);
        return;
      }

      if (data) {
        const playing = data.find((item) => item.status === "playing") || null;
        const pending = data.filter((item) => item.status === "pending");

        // Se não há música tocando, pega a primeira da fila pendente e coloca como playing
        if (!playing && pending.length > 0) {
          const nextToPlay = pending[0];
          await supabase
            .from("karaoke_queue")
            .update({ status: "playing" })
            .eq("id", nextToPlay.id);

          setCurrentSong({ ...nextToPlay, status: "playing" });
          setPendingSongs(pending.slice(1));
        } else {
          setCurrentSong(playing);
          setPendingSongs(pending);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar dados da fila:", err);
    }
  }, []);

  // 2. Carrega fofocas recentes para a fila VIP (últimos 2 minutos em ordem cronológica)
  const fetchInitialGossips = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("karaoke_events")
        .select("id, payload, created_at")
        .eq("type", "fofoca")
        .gte("created_at", twoMinutesAgo)
        .not("payload", "like", "[DELETADO]%")
        .neq("payload", "__DELETED__")
        .order("created_at", { ascending: true })
        .limit(10);

      if (data && data.length > 0) {
        setInitialGossips(
          data
            .filter(
              (d) => !d.payload.startsWith("[DELETADO]") && d.payload !== "__DELETED__"
            )
            .map((d) => ({
              id: d.id,
              text: d.payload,
              createdAt: d.created_at,
            }))
        );
      }
    } catch (e) {
      console.error("Erro ao buscar fofocas recentes:", e);
    }
  }, []);

  // 2b. Carrega playlist do Modo Festa diretamente da tabela karaoke_party_playlist
  const fetchPartyPlaylist = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from("karaoke_party_playlist")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao buscar playlist da tabela karaoke_party_playlist:", error);
        return;
      }

      if (data && data.length > 0) {
        setPartyPlaylist(
          data.map((item) => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            videoId: item.video_id,
            tag: item.tag || "Hit da Festa 🔥",
          }))
        );
      }
    } catch (e) {
      console.error("Erro ao buscar playlist do Modo Festa:", e);
    }
  }, []);

  // 3. Gerenciamento de eventos de Emojis (Flutuando com destaque vibrante na TV)
  const handleAddEmoji = useCallback((rawPayload: string) => {
    // Formato suportado: "🍅:Gustavo" ou simplesmente "🍅"
    const colonIndex = rawPayload.indexOf(":");
    const emoji = colonIndex !== -1 ? rawPayload.substring(0, colonIndex) : rawPayload;
    const sender = colonIndex !== -1 ? rawPayload.substring(colonIndex + 1).trim() : "Alguém";

    const burstCount = emoji === "🍅" ? 3 : 4;
    const newParticles: EmojiParticle[] = [];

    for (let i = 0; i < burstCount; i++) {
      // Distribuição pelos flancos (8% a 26% na esquerda, 56% a 88% na direita)
      // Mantém a área central (28% a 54%) desobstruída para leitura de letras
      const isRightSide = Math.random() > 0.35;
      const leftPercent = isRightSide
        ? Math.floor(Math.random() * 32) + 56
        : Math.floor(Math.random() * 18) + 8;

      newParticles.push({
        id: Math.random().toString(36).substring(2, 9) + `-${Date.now()}-${i}`,
        emoji,
        leftPercent,
        scale: 1.1 + Math.random() * 0.45,
        rotation: Math.floor(Math.random() * 36) - 18,
        delay: i * 0.09,
      });
    }

    setEmojis((prev) => [...prev.slice(-45), ...newParticles]);

    // Disparo Imediato e Impactante do Tomataço:
    if (emoji === "🍅") {
      if (isTomatoSplatterActiveRef.current) {
        return;
      }

      const isSolo = !!sender && sender !== "Alguém" && sender !== "Anônimo";
      setTomatoAttackInfo({
        isSolo: isSolo,
        attackerName: isSolo ? sender : null,
      });

      isTomatoSplatterActiveRef.current = true;
      setIsTomatoSplatterActive(true);
    }
  }, []);

  const handleRemoveEmoji = useCallback((id: string) => {
    setEmojis((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Se não houver música cantada por usuário na fila, o Modo Festa assume o palco!
  const isPartyActive = !currentSong && pendingSongs.length === 0 && isPartyModeEnabled;
  const currentPartyTrack = activePartyTrack || partyPlaylist[0] || DEFAULT_PARTY_PLAYLIST[0];

  // Identifica a próxima música da festa (a que está logo depois da atual na lista)
  const currentIdxInPlaylist = partyPlaylist.findIndex((p) => p.videoId === currentPartyTrack.videoId);
  const nextPartyIndex = currentIdxInPlaylist !== -1 ? (currentIdxInPlaylist + 1) % (partyPlaylist.length || 1) : 1 % (partyPlaylist.length || 1);
  const nextPartyTrack = partyPlaylist[nextPartyIndex] || partyPlaylist[0] || DEFAULT_PARTY_PLAYLIST[0];

  const activeSong: KaraokeQueueItem | null = currentSong || (isPartyActive && currentPartyTrack ? {
    id: `party_${currentPartyTrack.id}`,
    singer_name: "Palco Livre 🎉",
    singer_tag: currentPartyTrack.tag || "Clipe Oficial 🎬",
    title: `${currentPartyTrack.title} • ${currentPartyTrack.artist}`,
    video_id: currentPartyTrack.videoId,
    status: "playing",
    is_priority: false,
    positive_votes: 0,
    tomatoes: 0,
    created_at: new Date().toISOString(),
  } : null);

  // Referência estável a activeSong e handleSongEnd para evitar reconexões do Realtime
  const currentSongRef = useRef<KaraokeQueueItem | null>(null);
  useEffect(() => {
    currentSongRef.current = activeSong;
  }, [activeSong]);

  // 4. Conclusão de música: atualiza para 'finished' e avança para a próxima
  const handleSongEnd = useCallback(async () => {
    const song = currentSongRef.current;
    if (!song) return;

    // Se o que terminou era uma música do Modo Festa:
    if (song.id.startsWith("party_")) {
      advancePartySong();
      return;
    }

    try {
      await supabase
        .from("karaoke_queue")
        .update({ status: "finished" })
        .eq("id", song.id);

      const { data } = await supabase
        .from("karaoke_queue")
        .select("*")
        .eq("status", "pending")
        .order("is_priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1);

      if (data && data.length > 0) {
        const nextSong = data[0];
        await supabase
          .from("karaoke_queue")
          .update({ status: "playing" })
          .eq("id", nextSong.id);

        setCurrentSong({ ...nextSong, status: "playing" });
        setPendingSongs((prev) => prev.filter((s) => s.id !== nextSong.id));
      } else {
        setCurrentSong(null);
        // Ao esgotar a fila e voltar para o Modo Festa, avança para a próxima da lista sem repetir
        advancePartySong();
      }
    } catch (e) {
      console.error("Erro ao transicionar música:", e);
    }
  }, [advancePartySong]);

  const handleSongEndRef = useRef(handleSongEnd);
  useEffect(() => {
    handleSongEndRef.current = handleSongEnd;
  }, [handleSongEnd]);

  // 5. Inscrição Supabase Realtime Única, Estável e Contínua (Sem reconnect loop)
  useEffect(() => {
    fetchQueue();
    fetchInitialGossips();
    fetchPartyPlaylist();

    if (!isSupabaseConfigured()) {
      setIsConnected(false);
      return;
    }

    const channelName = `tv_stage_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "karaoke_queue" },
        () => {
          fetchQueue();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "karaoke_party_playlist" },
        () => {
          fetchPartyPlaylist();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "karaoke_events" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) {
              setDeletedGossipId(oldId);
            } else {
              setClearAllGossipsTrigger((prev) => prev + 1);
            }
            return;
          }
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as KaraokeEvent;
            if (
              updated &&
              (updated.payload?.startsWith("[DELETADO]") ||
                updated.payload === "__DELETED__")
            ) {
              setDeletedGossipId(updated.id);
            }
            return;
          }
          const event = payload.new as KaraokeEvent;
          if (!event) return;

          if (event.type === "emoji") {
            handleAddEmoji(event.payload);
          } else if (event.type === "sound") {
            // Comandos remotos de controle do anfitrião via sound event
            if (event.payload === "admin_pause") {
              playerRef.current?.pause();
            } else if (event.payload === "admin_play") {
              playerRef.current?.play();
            } else if (event.payload === "admin_skip") {
              handleSongEndRef.current();
            } else if (event.payload.startsWith("admin_volume:")) {
              const val = parseInt(event.payload.replace("admin_volume:", ""), 10);
              if (!isNaN(val)) {
                playerRef.current?.setVolume(val);
              }
            } else if (event.payload === "admin_toggle_mute") {
              playerRef.current?.toggleMute();
            } else if (event.payload === "admin_toggle_party_mode") {
              togglePartyMode();
            } else if (event.payload.startsWith("admin_party_playlist_sync:")) {
              const jsonStr = event.payload.replace("admin_party_playlist_sync:", "");
              try {
                const list = JSON.parse(jsonStr);
                if (Array.isArray(list) && list.length > 0) {
                  setPartyPlaylist(list);
                }
              } catch (err) {
                console.error("Erro ao sincronizar playlist da festa:", err);
              }
            } else {
              const now = Date.now();
              // Evita colisão apenas de cliques no mesmo milissegundo (400ms)
              if (now - lastMemeTimeRef.current < 400) {
                return;
              }
              lastMemeTimeRef.current = now;

              soundManager.play(event.payload as SoundEffect);
              // Ativa o popup visual na TV
              setActiveMeme({
                id: Math.random().toString(),
                type: event.payload,
                timestamp: Date.now(),
              });
            }
          } else if (event.type === "fofoca") {
            if (
              !event.payload.startsWith("[DELETADO]") &&
              event.payload !== "__DELETED__"
            ) {
              setIncomingGossip({
                id: event.id,
                text: event.payload,
                createdAt: event.created_at,
              });
            }
          } else if (event.type === "skip_vote") {
            // payload = '<songId>:<userName>'
            const colonIdx = event.payload.indexOf(":");
            if (colonIdx > 0) {
              const votedSongId = event.payload.substring(0, colonIdx);
              const voterName = event.payload.substring(colonIdx + 1);
              const currentRef = currentSongRef.current;
              if (currentRef && currentRef.id === votedSongId) {
                const votes = skipVotesRef.current.get(votedSongId) || new Set<string>();
                votes.add(voterName);
                skipVotesRef.current.set(votedSongId, votes);
                if (votes.size >= 3) {
                  skipVotesRef.current.delete(votedSongId); // limpa para não re-disparar
                  handleSongEndRef.current();
                }
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[TV Realtime Status]:", status);
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQueue, fetchInitialGossips, handleAddEmoji]);

  // 6. Atalhos de Teclado no Palco da TV (Espaço = Pausar/Tocar, N = Pular, F = Tela Cheia, ↑/↓ = Volume, M = Mudo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        playerRef.current?.togglePlay();
      } else if (e.code === "KeyN") {
        e.preventDefault();
        handleSongEnd();
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        const current = playerRef.current?.getVolume() ?? 100;
        playerRef.current?.setVolume(Math.min(100, current + 5));
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        const current = playerRef.current?.getVolume() ?? 100;
        playerRef.current?.setVolume(Math.max(0, current - 5));
      } else if (e.code === "KeyM") {
        e.preventDefault();
        playerRef.current?.toggleMute();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.code === "KeyC") {
        e.preventDefault();
        setIsCinemaMode(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSongEnd]);

  // Desbloqueia áudio globalmente no primeiro clique, tecla ou toque na TV
  useEffect(() => {
    const unlock = () => {
      soundManager.unlockAudio();
      setAudioUnlocked(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("gukaraoke_audio_unlocked", "true");
      }
    };

    window.addEventListener("click", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  const enableAudio = () => {
    soundManager.unlockAudio();
    setAudioUnlocked(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("gukaraoke_audio_unlocked", "true");
    }
    if (playerRef.current) {
      try {
        playerRef.current.play();
      } catch {}
    }
  };

  return (
    <div
      onClick={enableAudio}
      className={`relative h-screen w-full bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans ${
        isTomatoSplatterActive ? "animate-screen-shake" : ""
      }`}
    >
      {/* Luzes de Palco Neon (Roxo & Ciano) */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full max-w-7xl h-60 bg-gradient-to-b from-purple-900/20 via-cyan-900/10 to-transparent blur-3xl pointer-events-none" />

      {/* Chuva de Emojis na Frente do Vídeo com Z-Index Elevado (z-[85]) */}
      <FloatingEmojis emojis={emojis} onRemove={handleRemoveEmoji} />

      {/* Popups Visuais dos Memes na TV sincronizados com os botões de som */}
      <MemePopup meme={activeMeme} />

      {/* Efeito Tomataço com Tremor de Tela e Lógica Inteligente */}
      <TomatoSplatter
        active={isTomatoSplatterActive}
        attackerName={tomatoAttackInfo.attackerName}
        isSoloAttack={tomatoAttackInfo.isSolo}
        onFinished={() => {
          isTomatoSplatterActiveRef.current = false;
          setIsTomatoSplatterActive(false);
          setTomatoAttackInfo({ isSolo: false, attackerName: null });
        }}
      />

      {/* Badge flutuante de Modo Cinema */}
      {isCinemaMode && (
        <div className="fixed top-3 right-3 z-50">
          <button
            onClick={() => setIsCinemaMode(false)}
            title="Sair do Modo Cinema (tecla C)"
            className="flex items-center gap-1.5 bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all opacity-30 hover:opacity-100"
          >
            <span>🎬 Cinema</span>
            <span className="text-slate-400">• C para sair</span>
          </button>
        </div>
      )}

      {/* HEADER SUPERIOR COMPACTO COM GLASSMORPHISM */}
      {!isCinemaMode && (
      <header className="relative z-20 flex items-center justify-between px-3.5 py-2 md:px-5 md:py-2.5 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl shadow-lg shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)] shrink-0">
            <Music2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              GUGABI<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-400 to-cyan-400">KARAOKE</span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-extrabold px-2 py-0.5 rounded-full border border-cyan-500/40 font-mono tracking-wider">
                STAGE TV
              </span>
            </h1>
            <span className="hidden sm:inline text-xs text-slate-400 font-medium">• Palco Principal</span>
          </div>
        </div>

        {/* Status Realtime, Atalhos de Palco & Ações Rápidas */}
        <div className="flex items-center gap-2">
          {/* Alternador do Modo Festa Contínua (Clipes Oficiais) */}
          <button
            onClick={togglePartyMode}
            title="Ligar ou desligar clipes oficiais automáticos quando o palco estiver livre"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md transition-all hover:scale-105 shadow ${
              isPartyModeEnabled
                ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
                : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isPartyModeEnabled ? "text-yellow-300 animate-spin" : "text-slate-500"}`} />
            <span>Festa: {isPartyModeEnabled ? "ON 🎬" : "OFF"}</span>
          </button>

          {/* Atalhos Rápidos do Palco para o Anfitrião */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-400 font-mono bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            <Keyboard className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span><kbd className="text-white font-bold">Espaço</kbd> Pausa • <kbd className="text-white font-bold">N</kbd> Pular • <kbd className="text-white font-bold">F</kbd> Tela Cheia • <kbd className="text-white font-bold">C</kbd> Cinema</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${
              isConnected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                : "bg-amber-500/10 text-amber-400 border-amber-500/40"
            }`}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 animate-pulse" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Local</span>
              </>
            )}
          </div>

          {!audioUnlocked && (
            <button
              onClick={enableAudio}
              className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 px-3 py-1 rounded-full text-xs font-black shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:scale-105 transition-all animate-bounce"
            >
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span>Ligar Som</span>
            </button>
          )}

          <Link
            href="/relatorio"
            prefetch={false}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border border-white/20 transition-all hover:scale-105 shadow"
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Relatório</span>
          </Link>
        </div>
      </header>
      )}

      {/* CORPO CENTRAL: PALCO 16:9 MÁXIMO + BARRA MULTIMÍDIA INFERIOR + FILA LATERAL ELEGANTE */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col lg:flex-row gap-2.5 md:gap-3 p-2 md:p-3 overflow-hidden">
        {/* COLUNA DO PALCO: VÍDEO 16:9 + DASHBOARD MULTIMÍDIA INFERIOR */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col gap-2 md:gap-2.5 overflow-hidden">
          {/* PALCO CENTRAL 16:9 */}
          <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center overflow-hidden">
            <StagePlayer
              ref={playerRef}
              currentSong={activeSong}
              nextSong={pendingSongs[0] || null}
              onSongEnd={handleSongEnd}
              onSkipSong={handleSongEnd}
            />
          </div>

          {/* BARRA MULTIMÍDIA DO PALCO (EMBAIXO DO VÍDEO): QR CODE + MURAL FOFOCA VIP AO VIVO + A SEGUIR */}
          {!isCinemaMode && (
          <StageBottomBar
            currentSong={activeSong}
            nextSong={pendingSongs[0] || null}
            incomingGossip={incomingGossip}
            initialGossips={initialGossips}
            deletedGossipId={deletedGossipId}
            clearAllTrigger={clearAllGossipsTrigger}
            isPartyActive={isPartyActive}
            nextPartyTrack={isPartyActive ? nextPartyTrack : null}
          />
          )}
        </div>

        {/* FILA LATERAL ELEGANTE */}
        {!isCinemaMode && (
        <SideQueue
          currentSong={activeSong}
          pendingSongs={pendingSongs}
          nextPartyTrack={isPartyActive ? nextPartyTrack : null}
        />
        )}
      </main>
    </div>
  );
}
