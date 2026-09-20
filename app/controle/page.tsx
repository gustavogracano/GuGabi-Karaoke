"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  supabase,
  isSupabaseConfigured,
  KaraokeQueueItem,
  KaraokeEvent,
} from "@/lib/supabase";
import { COMIC_TAGS } from "@/lib/utils";
import { YouTubeSearchResult } from "@/app/api/search-youtube/route";
import {
  Mic,
  Search,
  Sparkles,
  Heart,
  Flame,
  Volume2,
  VolumeX,
  Send,
  User,
  Music,
  Tv,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Radio,
  Bell,
  MessageSquare,
  Settings,
  Play,
  Pause,
  SkipForward,
  Lock,
  KeyRound,
  ArrowUp,
  ArrowDown,
  Trash2,
  PlayCircle,
  ShieldAlert,
  Crown,
  Plus,
  RotateCcw,
  ListMusic,
} from "lucide-react";
import {
  DEFAULT_PARTY_PLAYLIST,
  PartySong,
  extractYouTubeId,
} from "@/lib/party-playlist";
import { soundManager } from "@/lib/sound-manager";

export default function MobileControlPage() {
  // Perfil do Convidado
  const [userName, setUserName] = useState<string>("");
  const [userTag, setUserTag] = useState<string>("chuveiro");
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [goldenTicketUsed, setGoldenTicketUsed] = useState<boolean>(false);
  const [useGoldenTicket, setUseGoldenTicket] = useState<boolean>(false);
  const [duetPartner, setDuetPartner] = useState<string>('');
  const [showDuetField, setShowDuetField] = useState<boolean>(false);

  // Fila e Música Atual
  const [currentSong, setCurrentSong] = useState<KaraokeQueueItem | null>(null);
  const [pendingQueue, setPendingQueue] = useState<KaraokeQueueItem[]>([]);
  const [gossips, setGossips] = useState<KaraokeEvent[]>([]);

  // Busca do YouTube
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addedSuccessMessage, setAddedSuccessMessage] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<"karaoke" | "free">("karaoke");

  // Fofocas
  const [gossipText, setGossipText] = useState<string>("");
  const [isSendingGossip, setIsSendingGossip] = useState<boolean>(false);
  const [gossipSuccess, setGossipSuccess] = useState<boolean>(false);
  const [includeNameInGossip, setIncludeNameInGossip] = useState<boolean>(true);

  // Votação para Pular Música
  const [hasVotedSkip, setHasVotedSkip] = useState<string | null>(null); // song_id que votou pular
  const [skipVoteCount, setSkipVoteCount] = useState<number>(0); // contagem total de votos para pular

  // Painel do Anfitrião (Admin)
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminPinInput, setAdminPinInput] = useState<string>("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Playlist do Modo Festa (Admin)
  const [partyPlaylist, setPartyPlaylist] = useState<PartySong[]>(DEFAULT_PARTY_PLAYLIST);
  const [showAddPartyModal, setShowAddPartyModal] = useState<boolean>(false);
  const [newPartyTitle, setNewPartyTitle] = useState<string>("");
  const [newPartyArtist, setNewPartyArtist] = useState<string>("");
  const [newPartyVideoUrl, setNewPartyVideoUrl] = useState<string>("");
  const [newPartyTag, setNewPartyTag] = useState<string>("Hit da Festa 🔥");
  const [partyError, setPartyError] = useState<string | null>(null);

  // Busca do YouTube para o Modo Festa
  const [partySearchQuery, setPartySearchQuery] = useState<string>("");
  const [partySearchResults, setPartySearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearchingParty, setIsSearchingParty] = useState<boolean>(false);
  const [partySearchMode, setPartySearchMode] = useState<"search" | "manual">("search");

  // Feedback de toque e alerta de vibração disparado
  const hasVibratedForNextRef = useRef<string | null>(null);

  // Limite de vezes seguidas para sons (destravado no uso normal, pausa curta se spamar)
  const [soundSpamCooldown, setSoundSpamCooldown] = useState<number>(0);
  const soundConsecutiveCountRef = useRef<number>(0);
  const soundResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [gossipCooldown, setGossipCooldown] = useState<number>(0);
  const [emojiCooldown, setEmojiCooldown] = useState<number>(0);
  const emojiClickCountRef = useRef<number>(0);
  const emojiTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Contador de respiro após disparos seguidos (4s)
  useEffect(() => {
    if (soundSpamCooldown <= 0) return;
    const timer = setInterval(() => {
      setSoundSpamCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [soundSpamCooldown]);

  // Contador de cooldown de fofocas (20s)
  useEffect(() => {
    if (gossipCooldown <= 0) return;
    const timer = setInterval(() => {
      setGossipCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [gossipCooldown]);

  // Contador de cooldown de emojis (3s após sequência rápida)
  useEffect(() => {
    if (emojiCooldown <= 0) return;
    const timer = setInterval(() => {
      setEmojiCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [emojiCooldown]);

  // Aba Ativa
  const [activeTab, setActiveTab] = useState<"pedir" | "fila" | "mesa" | "fofoca">("pedir");

  // 1. Carrega Perfil e Admin do LocalStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("gukaraoke_user_name");
      const storedTag = localStorage.getItem("gukaraoke_user_tag");
      const storedTicket = localStorage.getItem("gukaraoke_ticket_used");
      const storedAdmin = localStorage.getItem("gukaraoke_is_admin");

      if (storedName) {
        setUserName(storedName);
      } else {
        setIsEditingProfile(true);
      }

      if (storedTag) {
        setUserTag(storedTag);
      }

      if (storedAdmin === "true") {
        setIsAdminAuthenticated(true);
      }

      // Purga trava legada de ticket e dados do localStorage para sincronizar via banco
      try {
        localStorage.removeItem("gukaraoke_ticket_used");
        localStorage.removeItem("gukaraoke_party_playlist");
        localStorage.removeItem("gukaraoke_party_playlist_version");
      } catch {}
    }
  }, []);

  const saveProfile = (name: string, tag: string) => {
    if (!name.trim()) return;
    setUserName(name.trim());
    setUserTag(tag);
    if (typeof window !== "undefined") {
      localStorage.setItem("gukaraoke_user_name", name.trim());
      localStorage.setItem("gukaraoke_user_tag", tag);
    }
    setIsEditingProfile(false);
  };

  // 2. Busca Fila e Fofocas no Supabase
  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const { data: queueData } = await supabase
        .from("karaoke_queue")
        .select("*")
        .order("is_priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (queueData) {
        const playing = queueData.find((item) => item.status === "playing") || null;
        const pending = queueData.filter((item) => item.status === "pending");
        setCurrentSong(playing);
        setPendingQueue(pending);

        // Verifica dinamicamente se o usuário já gastou o Golden Ticket na sessão ativa atual
        if (userName.trim()) {
          const uName = userName.trim().toLowerCase();
          const hasUsedInActiveSession = queueData.some(
            (item) =>
              item.is_priority &&
              (item.singer_name.toLowerCase() === uName ||
                item.singer_name.toLowerCase().includes(`& ${uName}`) ||
                item.singer_name.toLowerCase().includes(`${uName} &`))
          );
          setGoldenTicketUsed(hasUsedInActiveSession);
        }
      }

      // Busca a Playlist do Modo Festa do Supabase
      const { data: partyData } = await supabase
        .from("karaoke_party_playlist")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (partyData && partyData.length > 0) {
        setPartyPlaylist(
          partyData.map((p) => ({
            id: p.id,
            title: p.title,
            artist: p.artist,
            videoId: p.video_id,
            tag: p.tag || "Hit da Festa 🔥",
          }))
        );
      }

      const { data: gossipData } = await supabase
        .from("karaoke_events")
        .select("*")
        .eq("type", "fofoca")
        .not("payload", "like", "[DELETADO]%")
        .neq("payload", "__DELETED__")
        .order("created_at", { ascending: false })
        .limit(10);

      if (gossipData) {
        setGossips(
          gossipData.filter(
            (g) => !g.payload.startsWith("[DELETADO]") && g.payload !== "__DELETED__"
          )
        );
      }
    } catch (err) {
      console.error("Erro ao sincronizar dados mobile:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();

    if (!isSupabaseConfigured()) return;

    const channelName = `mobile_sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "karaoke_queue" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "karaoke_party_playlist" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "karaoke_events" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            fetchData();
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as KaraokeEvent;
            if (
              updated &&
              (updated.payload.startsWith("[DELETADO]") || updated.payload === "__DELETED__")
            ) {
              setGossips((prev) => prev.filter((g) => g.id !== updated.id));
            } else {
              fetchData();
            }
          } else if (payload.new && (payload.new as KaraokeEvent).type === "fofoca") {
            const newG = payload.new as KaraokeEvent;
            if (
              !newG.payload.startsWith("[DELETADO]") &&
              newG.payload !== "__DELETED__"
            ) {
              setGossips((prev) => [
                newG,
                ...prev.filter((g) => g.id !== newG.id).slice(0, 9),
              ]);
            }
          } else if (payload.new && (payload.new as KaraokeEvent).type === "skip_vote") {
            const ev = payload.new as KaraokeEvent;
            // Conta votos para a música atual
            if (currentSong && ev.payload?.startsWith(currentSong.id + ":")) {
              setSkipVoteCount((prev) => prev + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // 3. Status do Usuário na Fila com Vibração [200, 100, 200]
  const userStatus = useMemo(() => {
    if (!userName.trim()) return null;
    const cleanName = userName.trim().toLowerCase();

    if (currentSong && currentSong.singer_name.trim().toLowerCase() === cleanName) {
      return { type: "playing" as const, title: currentSong.title };
    }

    const pendingIndex = pendingQueue.findIndex(
      (s) => s.singer_name.trim().toLowerCase() === cleanName
    );

    if (pendingIndex === 0) {
      const songId = pendingQueue[0].id;
      // Dispara vibração uma vez por entrada na posição 1
      if (hasVibratedForNextRef.current !== songId) {
        hasVibratedForNextRef.current = songId;
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate([200, 100, 200]);
          } catch {
            // safe fallback
          }
        }
      }

      return { type: "next" as const, title: pendingQueue[0].title };
    } else if (pendingIndex > 0) {
      const waitMinutes = Math.round((pendingIndex + 1) * 3.5);
      return {
        type: "waiting" as const,
        title: pendingQueue[pendingIndex].title,
        position: pendingIndex + 1,
        waitTime: waitMinutes,
      };
    }

    return null;
  }, [currentSong, pendingQueue, userName]);

  // Resetar contagem de votos quando a música atual muda
  useEffect(() => {
    setHasVotedSkip(null);
    setSkipVoteCount(0);
  }, [currentSong?.id]);

  // 4. Busca no YouTube
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const typeParam = searchType === "free" ? "&type=party" : "";
      const res = await fetch(`/api/search-youtube?q=${encodeURIComponent(query)}${typeParam}`);
      const data = await res.json();

      if (data.isBlocked) {
        setSearchError(data.error || "O proprietário deste vídeo desativou a reprodução fora do YouTube. Por favor, escolha outra versão.");
        setSearchResults([]);
        return;
      }

      if (data.items) {
        setSearchResults(data.items);
        if (data.items.length === 0) {
          setSearchError(
            searchType === "free"
              ? "Nenhum vídeo compatível encontrado. Tente outro título."
              : "Nenhum vídeo de karaokê compatível encontrado. Tente outro título ou mude para Modo Livre."
          );
        }
      }
    } catch {
      setSearchError("Falha na busca. Verifique sua conexão.");
    } finally {
      setIsSearching(false);
    }
  };

  // 5. Adicionar à Fila (com limite de 2 músicas por pessoa para não monopolizar)
  const handleAddToQueue = async (item: YouTubeSearchResult, playNow = false) => {
    if (!userName.trim()) {
      setIsEditingProfile(true);
      return;
    }

    if (!isSupabaseConfigured()) {
      setAddedSuccessMessage("Supabase não configurado!");
      setTimeout(() => setAddedSuccessMessage(null), 3000);
      return;
    }

    // Regra de Ouro da Festa: máximo 2 músicas pendentes por cantor ao mesmo tempo (exceto Admin)
    if (!isAdminAuthenticated && !playNow) {
      const userPendingCount = pendingQueue.filter(
        (s) => s.singer_name.trim().toLowerCase() === userName.trim().toLowerCase()
      ).length;

      if (userPendingCount >= 2) {
        setSearchError(
          `Você já tem ${userPendingCount} músicas na fila de espera! Espere sua vez para cantar antes de adicionar mais 🎤`
        );
        return;
      }
    }

    const isPriority = (useGoldenTicket && !goldenTicketUsed) || playNow;

    try {
      if (playNow && isAdminAuthenticated) {
        if (currentSong) {
          await supabase
            .from("karaoke_queue")
            .update({ status: "finished" })
            .eq("id", currentSong.id);
        }
        await supabase.from("karaoke_queue").insert({
          video_id: item.videoId,
          title: item.title,
          singer_name: duetPartner.trim() ? `${userName.trim() || 'Anfitrião'} & ${duetPartner.trim()}` : (userName.trim() || 'Anfitrião'),
          singer_tag: userTag,
          status: "playing",
          is_priority: true,
        });
        setAddedSuccessMessage(`"${item.title.substring(0, 24)}..." tocando agora na TV!`);
        setTimeout(() => setAddedSuccessMessage(null), 4000);
        setSearchQuery("");
        setSearchResults([]);
        setDuetPartner("");
        setShowDuetField(false);
        fetchData();
        return;
      }

      const singerName = duetPartner.trim()
        ? `${userName.trim()} & ${duetPartner.trim()}`
        : userName.trim();

      const { error } = await supabase.from("karaoke_queue").insert({
        video_id: item.videoId,
        title: item.title,
        singer_name: singerName,
        singer_tag: userTag,
        status: "pending",
        is_priority: isPriority,
      });

      if (error) {
        alert("Erro ao enviar música para a fila.");
      } else {
        if (isPriority && !isAdminAuthenticated) {
          setGoldenTicketUsed(true);
          setUseGoldenTicket(false);
          soundManager.playVipFanfare();
        } else {
          soundManager.playSuccessChime();
        }

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(isPriority ? [50, 100, 150] : 60);
          } catch {}
        }

        const duetLabel = duetPartner.trim() ? ` (Dueto 🎤🎤)` : "";
        setAddedSuccessMessage(`"${item.title.substring(0, 28)}..." adicionada${duetLabel}!`);
        setTimeout(() => setAddedSuccessMessage(null), 4000);
        setSearchQuery("");
        setSearchResults([]);
        setDuetPartner("");
        setShowDuetField(false);
        setActiveTab("fila");
      }
    } catch (err) {
      console.error("Erro ao inserir na fila:", err);
    }
  };

  // 6. Reações Rápidas da Plateia (Liberado sem bloqueio - permite tomataço e chuva de reações)
  // 6. Reações Rápidas da Plateia com Proteção Anti-Spam e Anti-Fraude de Votos
  const handleReaction = async (emoji: "❤️" | "🔥" | "👏" | "🍅") => {
    // Se o usuário estiver no respiro de reações (bloqueia spam para não inflar votos):
    if (emojiCooldown > 0 && !isAdminAuthenticated) {
      return;
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch {}
    }

    // Controle de cliques em rajada: após 5 cliques rápidos em 2.5s, entra em respiro de 3s
    if (!isAdminAuthenticated) {
      emojiClickCountRef.current += 1;
      if (emojiTimerRef.current) clearTimeout(emojiTimerRef.current);
      emojiTimerRef.current = setTimeout(() => {
        emojiClickCountRef.current = 0;
      }, 2500);

      if (emojiClickCountRef.current >= 5) {
        emojiClickCountRef.current = 0;
        setEmojiCooldown(3);
      }
    }

    if (!isSupabaseConfigured()) return;

    try {
      const emojiPayload = userName.trim() ? `${emoji}:${userName.trim()}` : emoji;
      await supabase.from("karaoke_events").insert({
        type: "emoji",
        payload: emojiPayload,
      });

      if (currentSong) {
        // Mapeia emoji para tipo de reação
        const reactionTypeMap: Record<string, "heart" | "fire" | "clap" | "tomato"> = {
          "❤️": "heart",
          "🔥": "fire",
          "👏": "clap",
          "🍅": "tomato",
        };
        const mappedType = reactionTypeMap[emoji] || "heart";

        // Salva o registro detalhado da reação individual (quem votou em quem)
        await supabase
          .from("karaoke_reactions")
          .insert({
            queue_id: currentSong.id,
            voter_name: userName.trim() || "Anônimo",
            reaction_type: mappedType,
          });

        if (emoji === "❤️" || emoji === "🔥" || emoji === "👏") {
          await supabase.rpc("increment_positive_votes", { queue_id: currentSong.id });
          setCurrentSong((prev) =>
            prev ? { ...prev, positive_votes: prev.positive_votes + 1 } : null
          );
        } else if (emoji === "🍅") {
          await supabase.rpc("increment_tomatoes", { queue_id: currentSong.id });
          setCurrentSong((prev) =>
            prev ? { ...prev, tomatoes: prev.tomatoes + 1 } : null
          );
        }
      }
    } catch (err) {
      console.error("Erro na reação:", err);
    }
  };

  // 7. Disparador de Som: Destravado no uso normal, mas limita vezes seguidas (anti-spam)
  const handleTriggerSound = async (sound: string) => {
    // Se o usuário ultrapassou 3 sons seguidos e está na pausa de respiro:
    if (soundSpamCooldown > 0 && !isAdminAuthenticated) {
      return;
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(30);
      } catch {}
    }

    // Monitora repetições seguidas para convidados
    if (!isAdminAuthenticated) {
      soundConsecutiveCountRef.current += 1;

      // Se clicar 3 vezes seguidas em menos de 5 segundos, dá uma pausa curta de 4s
      if (soundConsecutiveCountRef.current >= 3) {
        setSoundSpamCooldown(4);
        soundConsecutiveCountRef.current = 0;
      } else {
        // Reseta o contador se der um intervalo natural de 5 segundos entre sons
        if (soundResetTimerRef.current) clearTimeout(soundResetTimerRef.current);
        soundResetTimerRef.current = setTimeout(() => {
          soundConsecutiveCountRef.current = 0;
        }, 5000);
      }
    }

    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from("karaoke_events").insert({
        type: "sound",
        payload: sound,
      });
    } catch (err) {
      console.error("Erro ao disparar som:", err);
    }
  };

  // 8. Painel do Anfitrião (Ações Remotas na TV & Gerenciamento da Festa)
  const [isCheckingPin, setIsCheckingPin] = useState<boolean>(false);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPinInput.trim()) return;

    setIsCheckingPin(true);
    setAdminError(null);

    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPinInput.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setIsAdminAuthenticated(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('gukaraoke_is_admin', 'true');
        }
        setAdminError(null);
        setAdminPinInput('');
      } else {
        setAdminError(data.error || 'Senha incorreta.');
      }
    } catch {
      setAdminError('Erro de conexão. Tente novamente.');
    } finally {
      setIsCheckingPin(false);
    }
  };

  const handleAdminAction = async (action: "pause" | "play" | "skip") => {
    if (!isSupabaseConfigured()) return;
    try {
      if (action === "pause") {
        await supabase.from("karaoke_events").insert({ type: "sound", payload: "admin_pause" });
      } else if (action === "play") {
        await supabase.from("karaoke_events").insert({ type: "sound", payload: "admin_play" });
      } else if (action === "skip") {
        await supabase.from("karaoke_events").insert({ type: "sound", payload: "admin_skip" });
        if (currentSong) {
          await supabase
            .from("karaoke_queue")
            .update({ status: "finished" })
            .eq("id", currentSong.id);
        }
      }
    } catch (err) {
      console.error("Erro na ação admin:", err);
    }
  };

  const [remoteVolume, setRemoteVolume] = useState<number>(100);

  const handleAdminVolume = async (newVol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVol)));
    setRemoteVolume(clamped);
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from("karaoke_events").insert({
        type: "sound",
        payload: `admin_volume:${clamped}`,
      });
    } catch (err) {
      console.error("Erro ao enviar volume da TV:", err);
    }
  };

  const handleAdminToggleMute = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from("karaoke_events").insert({
        type: "sound",
        payload: "admin_toggle_mute",
      });
    } catch (err) {
      console.error("Erro ao alternar mudo da TV:", err);
    }
  };

  const handleAdminTogglePartyMode = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from("karaoke_events").insert({
        type: "sound",
        payload: "admin_toggle_party_mode",
      });
      setAddedSuccessMessage("Modo Festa alternado na TV!");
      setTimeout(() => setAddedSuccessMessage(null), 2500);
    } catch (err) {
      console.error("Erro ao alternar modo festa na TV:", err);
    }
  };

  // Gerenciamento da Playlist do Modo Festa pelo Admin (sincronizado diretamente via tabela karaoke_party_playlist)
  const syncPartyPlaylist = async (newList: PartySong[]) => {
    setPartyPlaylist(newList);
    if (isSupabaseConfigured()) {
      try {
        // Atualiza a ordem no banco
        for (let i = 0; i < newList.length; i++) {
          const item = newList[i];
          await supabase
            .from("karaoke_party_playlist")
            .update({ sort_order: i + 1 })
            .eq("id", item.id);
        }
      } catch (err) {
        console.error("Erro ao atualizar ordem do modo festa:", err);
      }
    }
  };

  const handleMovePartyItem = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= partyPlaylist.length) return;
    const updated = [...partyPlaylist];
    const [removed] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, removed);
    setPartyPlaylist(updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("karaoke_party_playlist")
          .update({ sort_order: targetIndex + 1 })
          .eq("id", removed.id);
        await supabase
          .from("karaoke_party_playlist")
          .update({ sort_order: index + 1 })
          .eq("id", updated[index].id);
      } catch (err) {
        console.error("Erro ao mover clipe:", err);
      }
    }
  };

  const handleDeletePartyItem = async (index: number) => {
    if (partyPlaylist.length <= 1) {
      alert("A playlist deve ter pelo menos 1 clipe!");
      return;
    }
    const songToDelete = partyPlaylist[index];
    if (!confirm(`Remover "${songToDelete.title}" da playlist do Modo Festa?`)) return;
    const updated = partyPlaylist.filter((_, i) => i !== index);
    setPartyPlaylist(updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("karaoke_party_playlist")
          .delete()
          .eq("id", songToDelete.id);
      } catch (err) {
        console.error("Erro ao remover clipe da playlist:", err);
      }
    }
  };

  const handleResetPartyPlaylist = async () => {
    if (!confirm("Restaurar a playlist padrão com os maiores sucessos atuais?")) return;
    setPartyPlaylist(DEFAULT_PARTY_PLAYLIST);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("karaoke_party_playlist").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        const rows = DEFAULT_PARTY_PLAYLIST.map((s, idx) => ({
          video_id: s.videoId,
          title: s.title,
          artist: s.artist,
          tag: s.tag,
          sort_order: idx + 1,
        }));
        await supabase.from("karaoke_party_playlist").insert(rows);
      } catch (err) {
        console.error("Erro ao restaurar playlist padrão:", err);
      }
    }

    setAddedSuccessMessage("Playlist de sucessos restaurada!");
    setTimeout(() => setAddedSuccessMessage(null), 2500);
  };

  const handleAddPartyItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartyError(null);

    if (!newPartyTitle.trim()) {
      setPartyError("Informe o título da música.");
      return;
    }

    const videoId = extractYouTubeId(newPartyVideoUrl);
    if (!videoId || videoId.length !== 11) {
      setPartyError("URL do YouTube ou ID inválido. Insira o link do clipe oficial ou o ID de 11 dígitos.");
      return;
    }

    // Validação preventiva do clipe contra bloqueio do proprietário (Error 150/101)
    try {
      const checkRes = await fetch(`/api/search-youtube?q=${encodeURIComponent(videoId)}`);
      const checkData = await checkRes.json();
      if (checkData.isBlocked) {
        setPartyError(checkData.error || "Este vídeo foi bloqueado pelo proprietário para reprodução fora do YouTube.");
        return;
      }
    } catch {
      // safe fallback
    }

    let insertedId = `party-custom-${Date.now()}`;
    if (isSupabaseConfigured()) {
      try {
        const nextOrder = partyPlaylist.length + 1;
        const { data: insData } = await supabase
          .from("karaoke_party_playlist")
          .insert({
            video_id: videoId,
            title: newPartyTitle.trim(),
            artist: newPartyArtist.trim() || "Hit Atual",
            tag: newPartyTag.trim() || "Hit da Festa 🔥",
            sort_order: nextOrder,
          })
          .select("id")
          .single();
        if (insData?.id) {
          insertedId = insData.id;
        }
      } catch (err) {
        console.error("Erro ao salvar clipe no banco:", err);
      }
    }

    const newSong: PartySong = {
      id: insertedId,
      title: newPartyTitle.trim(),
      artist: newPartyArtist.trim() || "Hit Atual",
      videoId: videoId,
      tag: newPartyTag.trim() || "Hit da Festa 🔥",
    };

    setPartyPlaylist((prev) => [...prev, newSong]);
    setNewPartyTitle("");
    setNewPartyArtist("");
    setNewPartyVideoUrl("");
    setNewPartyTag("Hit da Festa 🔥");
    setShowAddPartyModal(false);
    setAddedSuccessMessage(`"${newSong.title}" adicionada ao fim da fila da festa!`);
    setTimeout(() => setAddedSuccessMessage(null), 3000);
  };

  // Busca do YouTube exclusiva para o Modo Festa
  const handleSearchPartyClips = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!partySearchQuery.trim()) return;

    setIsSearchingParty(true);
    setPartyError(null);
    try {
      const q = partySearchQuery.trim();
      const res = await fetch(`/api/search-youtube?q=${encodeURIComponent(q)}&type=party`);
      const data = await res.json();

      if (data.items && Array.isArray(data.items)) {
        setPartySearchResults(data.items);
        if (data.items.length === 0) {
          setPartyError("Nenhum resultado liberado encontrado. Tente buscar com outro termo.");
        }
      } else {
        setPartySearchResults([]);
        setPartyError("Não foi possível buscar no YouTube agora.");
      }
    } catch {
      setPartyError("Erro de conexão ao pesquisar vídeos.");
    } finally {
      setIsSearchingParty(false);
    }
  };

  const handleSelectPartySearchResult = async (result: YouTubeSearchResult) => {
    // Normaliza nome do artista e título
    const parts = result.title.split(/ - | – | • /);
    let artist = result.channelTitle || "Hit da Pista";
    let title = result.title;

    if (parts.length > 1) {
      artist = parts[0].trim();
      title = parts.slice(1).join(" - ").trim();
    }

    // Remove termos de busca do título
    title = title
      .replace(/\(clipe.*?\)/gi, "")
      .replace(/\[clipe.*?\]/gi, "")
      .replace(/\(official.*?\)/gi, "")
      .replace(/\[official.*?\]/gi, "")
      .replace(/\(vídeo.*?\)/gi, "")
      .replace(/\[vídeo.*?\]/gi, "")
      .trim();

    let insertedId = `party-${result.videoId}-${Date.now()}`;
    const cleanTitle = title || result.title;
    const cleanArtist = artist || "Hit da Festa";

    if (isSupabaseConfigured()) {
      try {
        const nextOrder = partyPlaylist.length + 1;
        const { data: insData } = await supabase
          .from("karaoke_party_playlist")
          .insert({
            video_id: result.videoId,
            title: cleanTitle,
            artist: cleanArtist,
            tag: "Hit da Festa 🔥",
            sort_order: nextOrder,
          })
          .select("id")
          .single();
        if (insData?.id) {
          insertedId = insData.id;
        }
      } catch (err) {
        console.error("Erro ao salvar clipe no Supabase:", err);
      }
    }

    const newSong: PartySong = {
      id: insertedId,
      title: cleanTitle,
      artist: cleanArtist,
      videoId: result.videoId,
      tag: "Hit da Festa 🔥",
    };

    setPartyPlaylist((prev) => [...prev, newSong]);
    setShowAddPartyModal(false);
    setPartySearchQuery("");
    setPartySearchResults([]);
    setAddedSuccessMessage(`"${newSong.title}" adicionada ao fim da fila da festa!`);
    setTimeout(() => setAddedSuccessMessage(null), 3000);
  };

  // Reordenação da Fila pelo Admin
  const handleMoveQueueItem = async (index: number, direction: "up" | "down") => {
    if (!isAdminAuthenticated || !isSupabaseConfigured()) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pendingQueue.length) return;

    const currentItem = pendingQueue[index];
    const targetItem = pendingQueue[targetIndex];

    // Atualização otimista imediata na UI
    const updatedQueue = [...pendingQueue];
    updatedQueue[index] = targetItem;
    updatedQueue[targetIndex] = currentItem;
    setPendingQueue(updatedQueue);

    try {
      const tempTime = currentItem.created_at;
      const targetTime = targetItem.created_at;
      const tempPriority = currentItem.is_priority;
      const targetPriority = targetItem.is_priority;

      // Inverte created_at e is_priority para swap perfeito na ordenação
      await supabase
        .from("karaoke_queue")
        .update({ created_at: targetTime, is_priority: targetPriority })
        .eq("id", currentItem.id);

      await supabase
        .from("karaoke_queue")
        .update({ created_at: tempTime, is_priority: tempPriority })
        .eq("id", targetItem.id);

      fetchData();
    } catch (err) {
      console.error("Erro ao reordenar fila:", err);
      fetchData();
    }
  };

  // Remover música da fila pelo Admin
  const handleRemoveQueueItem = async (songId: string, songTitle: string) => {
    if (!isAdminAuthenticated || !isSupabaseConfigured()) return;
    if (!confirm(`Remover "${songTitle}" da fila de espera?`)) return;

    try {
      await supabase.from("karaoke_queue").delete().eq("id", songId);
      setPendingQueue((prev) => prev.filter((s) => s.id !== songId));
    } catch (err) {
      console.error("Erro ao remover música da fila:", err);
    }
  };

  // Colocar música para tocar agora no palco
  const handlePlayNow = async (song: KaraokeQueueItem) => {
    if (!isAdminAuthenticated || !isSupabaseConfigured()) return;
    if (!confirm(`Tocar "${song.title}" agora no palco?`)) return;

    try {
      if (currentSong) {
        await supabase
          .from("karaoke_queue")
          .update({ status: "finished" })
          .eq("id", currentSong.id);
      }
      await supabase
        .from("karaoke_queue")
        .update({ status: "playing" })
        .eq("id", song.id);

      fetchData();
    } catch (err) {
      console.error("Erro ao colocar música no palco:", err);
    }
  };

  // Apagar Fofoca Individual pelo Admin
  const handleDeleteGossip = async (gossipId: string) => {
    if (!isAdminAuthenticated || !isSupabaseConfigured()) return;
    try {
      // 1. Atualização otimista imediata na UI
      setGossips((prev) => prev.filter((g) => g.id !== gossipId));

      // 2. Soft-delete (suportado por RLS UPDATE)
      await supabase
        .from("karaoke_events")
        .update({ payload: "[DELETADO]" })
        .eq("id", gossipId);

      // 3. Delete permanente no banco
      await supabase.from("karaoke_events").delete().eq("id", gossipId);
    } catch (err) {
      console.error("Erro ao apagar fofoca:", err);
    }
  };

  // Limpar Todas as Fofocas pelo Admin
  const handleClearAllGossips = async () => {
    if (!isAdminAuthenticated || !isSupabaseConfigured()) return;
    if (!confirm("Tem certeza que deseja apagar TODAS as fofocas da festa?")) return;

    try {
      // 1. Atualização otimista imediata na UI
      setGossips([]);

      // 2. Soft-delete em lote
      await supabase
        .from("karaoke_events")
        .update({ payload: "[DELETADO]" })
        .eq("type", "fofoca");

      // 3. Delete permanente no banco
      await supabase.from("karaoke_events").delete().eq("type", "fofoca");
    } catch (err) {
      console.error("Erro ao limpar fofocas:", err);
    }
  };

  // Limpar toda a fila pendente (Admin Only)
  const handleClearQueue = async () => {
    if (!isAdminAuthenticated || !isSupabaseConfigured()) return;
    if (!confirm(`Limpar TODAS as ${pendingQueue.length} músicas da fila de espera? Esta ação não pode ser desfeita.`)) return;
    try {
      await supabase
        .from('karaoke_queue')
        .update({ status: 'finished' })
        .eq('status', 'pending');
      setPendingQueue([]);
      setAddedSuccessMessage('Fila limpa com sucesso!');
      setTimeout(() => setAddedSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Erro ao limpar fila:', err);
    }
  };

  // 9. Enviar Fofoca (sem segurar o usuário - fica rodando na TV a cada 5s)
  const handleSendGossip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gossipText.trim() || isSendingGossip) return;

    setIsSendingGossip(true);
    try {
      if (isSupabaseConfigured()) {
        const payloadText =
          includeNameInGossip && userName.trim()
            ? `[${userName.trim()}]: ${gossipText.trim()}`
            : gossipText.trim();

        await supabase.from("karaoke_events").insert({
          type: "fofoca",
          payload: payloadText,
        });
      }
      setGossipText("");
      setGossipSuccess(true);
      soundManager.playSuccessChime();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(50); } catch {}
      }
      setTimeout(() => setGossipSuccess(false), 2500);
    } catch (err) {
      console.error("Erro ao enviar fofoca:", err);
    } finally {
      setIsSendingGossip(false);
    }
  };

  // 10. Votar para Pular Música (até 3 votos = pula automático na TV)
  const handleVoteSkip = async () => {
    if (!currentSong || !userName.trim() || !isSupabaseConfigured()) return;
    if (hasVotedSkip === currentSong.id) return; // já votou nessa música
    if (currentSong.singer_name.trim().toLowerCase() === userName.trim().toLowerCase()) {
      // Não deixa o próprio cantor votar para pular a si mesmo (isso é papel do admin)
      return;
    }

    try {
      await supabase.from("karaoke_events").insert({
        type: "skip_vote",
        payload: `${currentSong.id}:${userName.trim()}`,
      });
      setHasVotedSkip(currentSong.id);
      setSkipVoteCount((prev) => prev + 1);
    } catch (err) {
      console.error("Erro ao votar skip:", err);
    }
  };

  const selectedTagObj = COMIC_TAGS.find((t) => t.id === userTag) || COMIC_TAGS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between max-w-md mx-auto shadow-2xl relative pb-36 select-none">
      {/* HEADER MOBILE */}
      <header className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-950/85 backdrop-blur-xl border-b border-white/10 sticky top-0 z-30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(255,0,127,0.4)] shrink-0">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-xs sm:text-sm tracking-tight text-white flex items-center gap-1 truncate">
              GUGABI<span className="text-pink-500">KARAOKE</span>
              <span className="text-[9px] bg-white/10 px-1 py-0.2 rounded text-slate-300 font-mono shrink-0">
                CONTROLE
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Botão de Admin */}
          <button
            onClick={() => setShowAdminModal(true)}
            title="Painel do Anfitrião"
            className={`py-1 px-2.5 rounded-full border transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold ${
              isAdminAuthenticated
                ? "bg-gradient-to-r from-amber-500/25 to-yellow-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
            }`}
          >
            {isAdminAuthenticated ? (
              <>
                <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="text-[11px] font-black">Admin</span>
              </>
            ) : (
              <>
                <Settings className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium hidden xs:inline">Admin</span>
              </>
            )}
          </button>

          {/* Botão de Perfil */}
          <button
            onClick={() => setIsEditingProfile(true)}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow active:scale-95"
          >
            <span className="text-xs">{selectedTagObj.emoji}</span>
            <span className="max-w-[65px] sm:max-w-[85px] truncate text-slate-200">
              {userName || "Entrar"}
            </span>
          </button>
        </div>
      </header>

      {/* ALERTA: STATUS DO PRÓPRIO USUÁRIO NA FILA */}
      {userStatus && (
        <div className="px-4 pt-3">
          {userStatus.type === "playing" && (
            <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white p-3.5 rounded-2xl shadow-[0_0_25px_rgba(255,0,127,0.4)] flex items-center gap-3 animate-pulse">
              <span className="text-3xl">🎙️</span>
              <div>
                <p className="text-xs font-black uppercase tracking-wider">Você está no Palco Agora!</p>
                <p className="text-sm text-pink-100 line-clamp-1 font-bold">"{userStatus.title}"</p>
              </div>
            </div>
          )}

          {/* BANNER DOURADO PULSANTE: VOCÊ É O PRÓXIMO! */}
          {userStatus.type === "next" && (
            <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black p-4 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.6)] border-2 border-white flex items-center gap-3 animate-bounce">
              <Bell className="w-7 h-7 text-black shrink-0 animate-spin" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-black text-yellow-300 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">
                    ATENÇÃO
                  </span>
                  <p className="text-xs font-black uppercase tracking-wider">VOCÊ É O PRÓXIMO!</p>
                </div>
                <p className="text-sm font-black leading-tight mt-0.5">
                  Prepara o gogó e pegue o microfone! Sua música é a próxima da fila.
                </p>
              </div>
            </div>
          )}

          {userStatus.type === "waiting" && (
            <div className="bg-slate-900/80 border border-white/10 text-slate-300 p-2.5 rounded-2xl flex items-center justify-between text-xs backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sua vez: <b>{userStatus.position}º na fila</b></span>
              </div>
              <span className="text-[11px] text-cyan-300 font-semibold bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-800/40 font-mono">
                ~{userStatus.waitTime} min
              </span>
            </div>
          )}
        </div>
      )}

      {/* CARD DA MÚSICA TOCANDO AGORA COM DOCA RÁPIDA DE ANFITRIÃO */}
      <div className="px-4 pt-2.5 pb-1">
        <div className="bg-gradient-to-r from-pink-950/30 via-purple-950/30 to-slate-900/60 border border-pink-500/30 rounded-2xl p-3 relative overflow-hidden backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between text-xs mb-1 text-pink-400 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
              </span>
              No Palco da TV
            </span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-pink-300 font-bold flex items-center gap-0.5">
                ❤️ {currentSong?.positive_votes || 0}
              </span>
              <span className="text-red-400 font-bold flex items-center gap-0.5">
                🍅 {currentSong?.tomatoes || 0}
              </span>
            </div>
          </div>

          {currentSong ? (
            <div>
              <p className="font-extrabold text-sm text-white line-clamp-1">
                {currentSong.title}
              </p>
              <p className="text-xs text-cyan-300 font-medium mt-0.5">
                Cantor(a): <span className="font-bold">{currentSong.singer_name}</span>
              </p>
              {/* Barra de progresso visual animada para TV sincronizada */}
              <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 animate-[progressPulse_3s_ease-in-out_infinite] shadow-[0_0_8px_rgba(236,72,153,0.6)]" style={{ width: '100%' }} />
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Palco livre! Escolha uma música para começar.</p>
          )}

          {/* Doca Rápida Integrada do Anfitrião (TV Dock) */}
          {isAdminAuthenticated && (
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAdminAction("pause")}
                  title="Pausar Música na TV"
                  className="px-2 py-1 bg-white/10 hover:bg-white/20 active:scale-90 rounded-lg text-slate-200 transition-all flex items-center gap-1 text-[11px] font-bold"
                >
                  <Pause className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden xs:inline">Pausar</span>
                </button>
                <button
                  onClick={() => handleAdminAction("play")}
                  title="Despausar Música na TV"
                  className="px-2 py-1 bg-white/10 hover:bg-white/20 active:scale-90 rounded-lg text-slate-200 transition-all flex items-center gap-1 text-[11px] font-bold"
                >
                  <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                  <span className="hidden xs:inline">Tocar</span>
                </button>
                <button
                  onClick={() => handleAdminAction("skip")}
                  title="Pular Música na TV"
                  className="px-2.5 py-1 bg-red-600/25 hover:bg-red-600/40 border border-red-500/35 text-red-300 active:scale-90 rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold shadow-sm"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Pular</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowAdminModal(true)}
                  title="Ajustar Volume da TV"
                  className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/35 text-cyan-300 rounded-lg active:scale-90 transition-all flex items-center gap-1 text-[11px] font-mono font-bold"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>{remoteVolume}%</span>
                </button>
                <button
                  onClick={() => setShowAdminModal(true)}
                  title="Mais Opções do Anfitrião"
                  className="p-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg active:scale-90 transition-all"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Botão de votação para pular - apenas para convidados não-cantores */}
          {currentSong && !isAdminAuthenticated &&
           userName.trim().toLowerCase() !== currentSong.singer_name.trim().toLowerCase() && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <button
                onClick={handleVoteSkip}
                disabled={hasVotedSkip === currentSong.id}
                className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  hasVotedSkip === currentSong.id
                    ? 'bg-slate-800/60 text-slate-500 border border-white/10 cursor-not-allowed'
                    : 'bg-slate-800/80 hover:bg-red-900/40 border border-white/15 hover:border-red-500/40 text-slate-400 hover:text-red-300 active:scale-95'
                }`}
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>
                  {hasVotedSkip === currentSong.id
                    ? `Você votou para pular (${skipVoteCount}/3)`
                    : `Pular essa? (${skipVoteCount}/3 votos)`
                  }
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS (4 ABAS PERFEITAS PARA MOBILE) */}
      <div className="px-3 pt-2">
        <div className="grid grid-cols-4 bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs font-bold shadow-inner backdrop-blur-md gap-1">
          <button
            onClick={() => setActiveTab("pedir")}
            className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              activeTab === "pedir"
                ? "bg-pink-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Pedir</span>
          </button>
          <button
            onClick={() => setActiveTab("fila")}
            className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              activeTab === "fila"
                ? "bg-pink-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Fila ({pendingQueue.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("mesa")}
            className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              activeTab === "mesa"
                ? "bg-pink-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Sons</span>
          </button>
          <button
            onClick={() => setActiveTab("fofoca")}
            className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1 transition-all whitespace-nowrap relative ${
              activeTab === "fofoca"
                ? "bg-pink-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-yellow-400" />
            <span className="truncate">Fofocas</span>
            {gossips.length > 0 && activeTab !== "fofoca" && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* AVISO DE SUCESSO AO ADICIONAR */}
      {addedSuccessMessage && (
        <div className="mx-4 mt-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{addedSuccessMessage}</span>
        </div>
      )}

      {/* CONTEÚDO DAS ABAS */}
      <main className="flex-1 px-4 py-3">
        {/* ================= ABA 1: PEDIR MÚSICA ================= */}
        {activeTab === "pedir" && (
          <div className="space-y-4">
            {/* Cota de Músicas na Fila */}
            <div className="flex items-center justify-between text-xs px-1 text-slate-400">
              <span>
                {isAdminAuthenticated ? (
                  <span className="text-yellow-300 font-bold flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" /> Modo Admin (Fila Ilimitada)
                  </span>
                ) : (
                  <span>
                    Suas músicas aguardando:{" "}
                    <b
                      className={
                        pendingQueue.filter(
                          (s) => s.singer_name.trim().toLowerCase() === userName.trim().toLowerCase()
                        ).length >= 2
                          ? "text-amber-400"
                          : "text-cyan-400"
                      }
                    >
                      {
                        pendingQueue.filter(
                          (s) => s.singer_name.trim().toLowerCase() === userName.trim().toLowerCase()
                        ).length
                      }
                      /2
                    </b>
                  </span>
                )}
              </span>
              {!isAdminAuthenticated && (
                <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                  Limite: 2 por pessoa
                </span>
              )}
            </div>

            <form onSubmit={handleSearch} className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nome da música ou link do YouTube..."
                  className="w-full bg-slate-900/60 border border-white/15 focus:border-pink-500 rounded-2xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-slate-500 outline-none transition-all backdrop-blur-md"
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white rounded-xl transition-all active:scale-95"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Toggle Modo Livre / Karaokê */}
              <div className="flex items-center justify-between gap-2 bg-purple-500/10 border border-purple-500/30 p-2.5 rounded-xl backdrop-blur-md">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">🎵</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-purple-300 whitespace-nowrap truncate">
                      {searchType === "karaoke" ? "Modo Karaokê 🎤" : "Modo Livre 🎶"}
                    </p>
                    <p className="text-[10px] text-purple-400/80 truncate">
                      {searchType === "karaoke"
                        ? "Busca versões com letra"
                        : "Busca qualquer versão (clipe, ao vivo...)"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchType(t => t === "karaoke" ? "free" : "karaoke")}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all whitespace-nowrap ${
                    searchType === "karaoke"
                      ? "bg-purple-600/40 border-purple-500/50 text-purple-200"
                      : "bg-emerald-600/30 border-emerald-500/40 text-emerald-300"
                  }`}
                >
                  {searchType === "karaoke" ? "Karaokê" : "Livre"}
                </button>
              </div>

              {/* Modo Dueto */}
              <div className="flex items-center justify-between bg-pink-500/10 border border-pink-500/30 p-2.5 rounded-xl backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎤🎤</span>
                  <div>
                    <p className="text-xs font-bold text-pink-300">Modo Dueto</p>
                    <p className="text-[10px] text-pink-400/80">
                      Chame alguém para cantar junto!
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showDuetField}
                  onChange={(e) => {
                    setShowDuetField(e.target.checked);
                    if (!e.target.checked) setDuetPartner("");
                  }}
                  className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                />
              </div>

              {showDuetField && (
                <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                  <input
                    type="text"
                    value={duetPartner}
                    onChange={(e) => setDuetPartner(e.target.value)}
                    placeholder="Nome do(a) parceiro(a) de dueto..."
                    maxLength={30}
                    className="w-full bg-pink-950/30 border border-pink-500/40 focus:border-pink-400 rounded-xl py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                  />
                  {duetPartner.trim() && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-pink-300">
                      🎤🎤
                    </span>
                  )}
                </div>
              )}

              {/* Opção Golden Ticket */}
              <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-xs font-bold text-amber-300">
                      Golden Ticket (Fura-Fila VIP)
                    </p>
                    <p className="text-[10px] text-amber-400/80">
                      {goldenTicketUsed
                        ? "Você já usou seu ticket VIP nesta noite!"
                        : "Coloca sua música no topo da fila!"}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={goldenTicketUsed}
                  checked={useGoldenTicket}
                  onChange={(e) => setUseGoldenTicket(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer disabled:opacity-30"
                />
              </div>
            </form>

            {searchError && (
              <div className="text-center py-4 text-xs text-red-400 bg-red-950/20 border border-red-900/40 rounded-xl p-3">
                <AlertCircle className="w-5 h-5 mx-auto mb-1 text-red-400" />
                <p>{searchError}</p>
              </div>
            )}

            {/* CARDS DE RESULTADO DA BUSCA REFINADOS COM THUMBNAIL, TÍTULO E CANAL */}
            <div className="space-y-2.5">
              {searchResults.map((item) => (
                <div
                  key={item.videoId}
                  className="flex gap-3 p-3 bg-slate-900/80 border border-white/10 hover:border-pink-500/50 rounded-2xl transition-all backdrop-blur-md shadow"
                >
                  {/* Thumbnail grande e destacada */}
                  <div className="relative w-24 h-16 shrink-0 rounded-xl overflow-hidden bg-black border border-white/10">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] text-white px-1 rounded font-mono">
                      HD
                    </span>
                  </div>

                  {/* Informações completas e botão */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-black text-white line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Liberado na TV
                        </span>
                        {item.channelTitle && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            📺 {item.channelTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-1.5 flex-wrap">
                      {isAdminAuthenticated && (
                        <button
                          onClick={() => handleAddToQueue(item, true)}
                          title="Tocar essa música agora no palco da TV"
                          className="bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/40 text-cyan-300 text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 shadow transition-all active:scale-90"
                        >
                          <PlayCircle className="w-3 h-3" />
                          <span>Tocar Já</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleAddToQueue(item)}
                        className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1 shadow transition-all active:scale-90 hover:scale-105"
                      >
                        <Mic className="w-3 h-3" />
                        <span>Cantar Essa</span>
                        {useGoldenTicket && !goldenTicketUsed && (
                          <span className="text-[9px] bg-amber-400 text-black px-1 rounded font-extrabold ml-1">
                            VIP
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gêneros e Inspirações Rápidas de Karaokê */}
            {searchResults.length === 0 && !isSearching && (
              <div className="pt-2 space-y-3">
                {/* Categorias / Estilos em Destaque */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                    <span className="flex items-center gap-1">
                      <ListMusic className="w-3.5 h-3.5 text-pink-400" />
                      <span>Gêneros da Festa:</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Toque para buscar</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { title: "Sertanejo & Modão", query: "sertanejo karaoke", icon: "🤠", color: "from-amber-600/30 to-yellow-600/20 border-amber-500/30 text-amber-200" },
                      { title: "Pagode & Samba", query: "pagode karaoke", icon: "🥁", color: "from-orange-600/30 to-red-600/20 border-orange-500/30 text-orange-200" },
                      { title: "Pop Brasil & Hits", query: "pop brasil karaoke", icon: "✨", color: "from-pink-600/30 to-purple-600/20 border-pink-500/30 text-pink-200" },
                      { title: "Rock & Anos 80/90", query: "rock nacional karaoke", icon: "🎸", color: "from-cyan-600/30 to-blue-600/20 border-cyan-500/30 text-cyan-200" },
                    ].map((cat) => (
                      <button
                        key={cat.title}
                        type="button"
                        onClick={() => {
                          setSearchQuery(cat.query);
                          setIsSearching(true);
                          setSearchError(null);
                          const typeParam = searchType === "free" ? "&type=party" : "";
                          fetch(`/api/search-youtube?q=${encodeURIComponent(cat.query)}${typeParam}`)
                            .then((r) => r.json())
                            .then((d) => {
                              setSearchResults(d.items || []);
                              setIsSearching(false);
                            })
                            .catch(() => {
                              setIsSearching(false);
                              setSearchError("Erro ao pesquisar gênero.");
                            });
                        }}
                        className={`p-2 rounded-xl bg-gradient-to-r ${cat.color} border text-left flex items-center gap-2 hover:brightness-125 transition-all active:scale-95 shadow-sm`}
                      >
                        <span className="text-base shrink-0">{cat.icon}</span>
                        <span className="text-[11px] font-black leading-tight line-clamp-1">{cat.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hits Clássicos Diretos */}
                <div className="space-y-1.5 pt-1 border-t border-white/5">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Músicas certeiras que todo mundo canta:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {[
                      { label: "Evidências", icon: "🤠" },
                      { label: "Cheia de Manias", icon: "🥁" },
                      { label: "Bohemian Rhapsody", icon: "👑" },
                      { label: "Não Quero Dinheiro", icon: "🕺" },
                      { label: "Tempo Perdido", icon: "🎸" },
                      { label: "Fogo e Paixão", icon: "🌹" },
                      { label: "Pipoco", icon: "🚜" },
                      { label: "Macetando", icon: "🎉" },
                      { label: "Anna Júlia", icon: "🎤" },
                      { label: "Como Nossos Pais", icon: "✨" },
                      { label: "Nem de Graça", icon: "🍻" },
                      { label: "Lepo Lepo", icon: "💥" },
                    ].map((sug) => (
                      <button
                        key={sug.label}
                        onClick={() => {
                          setSearchQuery(sug.label);
                          setIsSearching(true);
                          setSearchError(null);
                          const typeParam = searchType === "free" ? "&type=party" : "";
                          fetch(`/api/search-youtube?q=${encodeURIComponent(sug.label)}${typeParam}`)
                            .then((r) => r.json())
                            .then((d) => {
                              setSearchResults(d.items || []);
                              setIsSearching(false);
                            })
                            .catch(() => {
                              setIsSearching(false);
                              setSearchError("Erro ao pesquisar música.");
                            });
                        }}
                        className="bg-white/5 hover:bg-pink-600/30 border border-white/10 hover:border-pink-500/40 px-3 py-1.5 rounded-full text-xs text-slate-200 hover:text-white transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="text-sm">{sug.icon}</span>
                        <span className="font-semibold">{sug.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= ABA 2: FILA EM TEMPO REAL ================= */}
        {activeTab === "fila" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-white/10">
              <span>Músicas na Espera ({pendingQueue.length})</span>
              <span>Ordem de Apresentação</span>
            </div>

            {isAdminAuthenticated && (
              <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/30 px-3 py-2 rounded-xl flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-2 font-bold">
                  <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Modo Anfitrião:</span>
                  <span className="text-[11px] text-amber-200 font-normal">Reordene ou toque na hora</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-400/80 font-mono">
                    {pendingQueue.length} {pendingQueue.length === 1 ? "música" : "músicas"}
                  </span>
                  {pendingQueue.length > 0 && (
                    <button
                      onClick={handleClearQueue}
                      title="Limpar toda a fila"
                      className="flex items-center gap-1 px-2 py-0.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {pendingQueue.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Music className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold">A fila está livre!</p>
                <p className="text-xs text-slate-500 mt-1">
                  Seja a primeira lenda a subir no palco hoje.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingQueue.map((song, index) => {
                  const isUserSong =
                    userName.trim() &&
                    song.singer_name.toLowerCase() === userName.trim().toLowerCase();
                  const tag = COMIC_TAGS.find((t) => t.id === song.singer_tag);
                  const waitEstimate = (index + 1) * 3.5;

                  return (
                    <div
                      key={song.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        isUserSong
                          ? "bg-pink-600/20 border-pink-500/70 shadow-[0_0_15px_rgba(255,0,127,0.25)]"
                          : song.is_priority
                          ? "bg-amber-500/10 border-amber-500/40"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                              index === 0
                                ? "bg-cyan-400 text-black font-black"
                                : "bg-white/15 text-white"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <p className="text-xs font-bold text-white truncate">
                            {song.title}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {song.is_priority && (
                            <span className="bg-amber-400 text-black font-black text-[9px] px-1.5 py-0.5 rounded shadow">
                              VIP
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            ~{Math.round(waitEstimate)}m
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pl-7">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <span>{tag?.emoji || "🎤"}</span>
                          <span className="font-semibold">{song.singer_name}</span>
                          {isUserSong && (
                            <span className="bg-pink-500 text-white font-black text-[9px] px-1.5 py-0.2 rounded-full uppercase">
                              Sua Vez!
                            </span>
                          )}
                        </div>

                        {tag && (
                          <span className="text-[10px] text-slate-400">
                            {tag.label}
                          </span>
                        )}
                      </div>

                      {/* CONTROLES DE REORDENAÇÃO & GERENCIAMENTO DO ADMIN */}
                      {isAdminAuthenticated && (
                        <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1">
                            <button
                              disabled={index === 0}
                              onClick={() => handleMoveQueueItem(index, "up")}
                              title="Subir posição na fila"
                              className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:pointer-events-none rounded-lg text-cyan-300 transition-all active:scale-90"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              disabled={index === pendingQueue.length - 1}
                              onClick={() => handleMoveQueueItem(index, "down")}
                              title="Descer posição na fila"
                              className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:pointer-events-none rounded-lg text-cyan-300 transition-all active:scale-90"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] text-slate-400 font-mono ml-1">
                              #{index + 1}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handlePlayNow(song)}
                              title="Tocar Agora no Palco da TV"
                              className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all active:scale-90 shadow-sm"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>Tocar Já</span>
                            </button>

                            <button
                              onClick={() => handleRemoveQueueItem(song.id, song.title)}
                              title="Remover da Fila"
                              className="w-7 h-7 flex items-center justify-center bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 rounded-lg transition-all active:scale-90"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= ABA 3: SONS & MEMES ================= */}
        {activeTab === "mesa" && (
          <div className="space-y-4">
            {/* Mesa de Som (Toca na TV da Sala) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4" />
                  <span>Mesa de Som (Toca na TV da Sala)</span>
                </h3>
              </div>

              {/* Aviso de respiro apenas se o convidado mandar 3 sons seguidos rápidos */}
              {soundSpamCooldown > 0 && !isAdminAuthenticated && (
                <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border border-amber-500/40 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-300 font-bold mb-3 shadow-lg animate-pulse">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Calma aí! 😅 Respiro de {soundSpamCooldown}s para o cantor:</span>
                  </div>
                  <span className="font-mono font-black text-sm bg-amber-500/30 text-white px-2.5 py-0.5 rounded-lg border border-amber-500/50">
                    {soundSpamCooldown}s
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {[
                  { id: "errou", emoji: "❌", label: "ERROU!", color: "border-red-500/50 bg-red-600/25 text-red-300 hover:border-red-400" },
                  { id: "uepa", emoji: "🗣️", label: "UÊPA!", color: "border-purple-500/50 bg-purple-600/25 text-purple-300 hover:border-purple-400" },
                  { id: "cavalo", emoji: "🐴", label: "CAVALO!", color: "border-amber-600/50 bg-amber-700/25 text-amber-200 hover:border-amber-400" },
                  { id: "ui", emoji: "💋", label: "UUUI!", color: "border-rose-500/50 bg-rose-600/25 text-rose-300 hover:border-rose-400" },
                  { id: "elegosta", emoji: "😏", label: "ELE GOSTA", color: "border-purple-600/50 bg-purple-700/25 text-purple-300 hover:border-purple-400" },
                  { id: "danca_gatinho", emoji: "🕺", label: "GATINHO", color: "border-pink-500/50 bg-pink-600/25 text-pink-300 hover:border-pink-400" },
                  { id: "rapaz", emoji: "🐭", label: "RAPAAAZ!", color: "border-amber-500/50 bg-amber-600/25 text-amber-300 hover:border-amber-400" },
                  { id: "pare", emoji: "🛑", label: "PARE!", color: "border-rose-600/50 bg-rose-700/25 text-rose-300 hover:border-rose-400" },
                  { id: "queisso", emoji: "😅", label: "CALMA!", color: "border-cyan-500/50 bg-cyan-600/25 text-cyan-300 hover:border-cyan-400" },
                  { id: "aplausos", emoji: "👏", label: "PALMAS", color: "border-emerald-500/50 bg-emerald-600/25 text-emerald-300 hover:border-emerald-400" },
                  { id: "buzina", emoji: "📯", label: "AIRHORN", color: "border-yellow-500/50 bg-yellow-600/25 text-yellow-300 hover:border-yellow-400" },
                  { id: "badumtss", emoji: "🥁", label: "BA DUM TSS", color: "border-slate-500/50 bg-slate-600/25 text-slate-200 hover:border-slate-300" },
                  { id: "beijo", emoji: "😘", label: "BEIJÃO", color: "border-pink-500/50 bg-pink-600/25 text-pink-300 hover:border-pink-400" },
                  { id: "sino", emoji: "🔔", label: "NOTA DEZ", color: "border-amber-400/50 bg-amber-500/25 text-amber-200 hover:border-amber-300" },
                  { id: "coracao", emoji: "❤️‍🔥", label: "CORAÇÃO", color: "border-pink-600/50 bg-pink-700/25 text-pink-300 hover:border-pink-400" },
                  { id: "trompete_triste", emoji: "🎺", label: "TRISTE", color: "border-blue-500/50 bg-blue-600/25 text-blue-300 hover:border-blue-400" },
                  { id: "brasil", emoji: "🇧🇷", label: "BRASIL!", color: "border-green-500/50 bg-green-600/25 text-green-300 hover:border-green-400" },
                  { id: "splash", emoji: "🍅", label: "TOMATE", color: "border-red-600/50 bg-red-700/25 text-red-300 hover:border-red-400" },
                ].map((btn) => {
                  const isLocked = soundSpamCooldown > 0 && !isAdminAuthenticated;
                  return (
                    <button
                      key={btn.id}
                      disabled={isLocked}
                      onClick={() => handleTriggerSound(btn.id)}
                      className={`p-3 border rounded-2xl text-center transition-all flex flex-col items-center justify-center gap-1 active:scale-90 hover:scale-105 active:rotate-2 shadow-md backdrop-blur-md ${btn.color} ${
                        isLocked ? "opacity-35 cursor-not-allowed filter grayscale" : ""
                      }`}
                    >
                      <span className="text-2xl filter drop-shadow">{btn.emoji}</span>
                      <span className="text-[11px] font-black uppercase tracking-tight">
                        {isLocked ? `${soundSpamCooldown}s` : btn.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 4: FOFOCAS & EXPOSED ================= */}
        {activeTab === "fofoca" && (
          <div className="space-y-6">
            {/* Enviar Fofoca */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>Enviar Fofoca ao Vivo</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 ml-5.5">
                    (Aparece no rodapé da TV)
                  </p>
                </div>
                <span className="text-[10px] text-slate-400">
                  {gossipText.length}/60
                </span>
              </div>

              <form onSubmit={handleSendGossip} className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    maxLength={60}
                    value={gossipText}
                    onChange={(e) => setGossipText(e.target.value)}
                    placeholder="Escreva uma fofoca ou exposed da galera..."
                    className="w-full bg-slate-900/60 border border-white/15 focus:border-yellow-400 rounded-2xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-slate-500 outline-none transition-all backdrop-blur-md"
                  />
                  <button
                    type="submit"
                    disabled={isSendingGossip || !gossipText.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-black rounded-xl transition-all active:scale-90"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIncludeNameInGossip(!includeNameInGossip)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 font-bold ${
                        includeNameInGossip && userName.trim()
                          ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
                          : "bg-slate-800 text-slate-400 border-white/10"
                      }`}
                    >
                      {includeNameInGossip && userName.trim() ? (
                        <>✍️ Por: <span className="text-white">{userName.trim()}</span></>
                      ) : (
                        <>🕵️ Fofoca Anônima</>
                      )}
                    </button>
                    <span className="text-slate-400">• 5s em destaque no telão</span>
                  </div>
                </div>
                {gossipSuccess && (
                  <p className="text-xs text-yellow-300 flex items-center gap-1 font-semibold animate-pulse">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Fofoca enviada para o telão!
                  </p>
                )}
              </form>
            </div>

            {/* Feed de Fofocas com Poder de Moderação para o Admin */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Mural de Fofocas da Festa</span>
                </h3>

                {isAdminAuthenticated && gossips.length > 0 && (
                  <button
                    onClick={handleClearAllGossips}
                    className="text-[10px] font-black text-red-400 hover:text-red-300 bg-red-950/40 border border-red-500/35 px-2.5 py-1 rounded-xl transition-all active:scale-95 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpar Todas</span>
                  </button>
                )}
              </div>

              {gossips.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {gossips.map((g, idx) => (
                    <div
                      key={g.id || idx}
                      className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 backdrop-blur-md hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <span className="text-yellow-400 shrink-0 mt-0.5">📢</span>
                        <p className="text-slate-200 italic font-medium break-words line-clamp-2">"{g.payload}"</p>
                      </div>

                      {isAdminAuthenticated && (
                        <button
                          onClick={() => handleDeleteGossip(g.id)}
                          title="Apagar fofoca da TV"
                          className="p-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 rounded-lg shrink-0 transition-all active:scale-90"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">
                  Nenhuma fofoca enviada ainda. Seja o primeiro a soltar um exposed! 🤫
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* BARRA FIXA DE REAÇÕES DA PLATEIA COM FEEDBACK VISUAL BOUNCE & PROTEÇÃO ANTI-SPAM */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/85 backdrop-blur-2xl border-t border-white/15 p-3 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.85)]">
        {emojiCooldown > 0 && !isAdminAuthenticated && (
          <div className="mb-2 bg-pink-500/15 border border-pink-500/30 rounded-xl px-2.5 py-1 flex items-center justify-between text-[11px] text-pink-300 font-bold animate-pulse">
            <span>Calma aí! 😅 Respiro de reações:</span>
            <span className="font-mono bg-pink-500/30 text-white px-2 py-0.2 rounded-md">
              {emojiCooldown}s
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => handleReaction("❤️")}
            disabled={emojiCooldown > 0 && !isAdminAuthenticated}
            className={`flex-1 py-2 bg-gradient-to-b from-pink-500/20 to-pink-900/30 hover:from-pink-500/35 hover:to-pink-900/50 border-2 border-pink-500/50 active:scale-90 hover:scale-105 active:rotate-6 rounded-2xl flex flex-col items-center justify-center transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)] ${
              emojiCooldown > 0 && !isAdminAuthenticated ? "opacity-40 cursor-not-allowed filter grayscale" : ""
            }`}
          >
            <span className="text-2xl sm:text-3xl select-none transition-transform hover:scale-125">❤️</span>
            <span className="text-[10px] font-black text-pink-300 mt-0.5 tracking-wide">Amei</span>
          </button>

          <button
            onClick={() => handleReaction("🔥")}
            disabled={emojiCooldown > 0 && !isAdminAuthenticated}
            className={`flex-1 py-2 bg-gradient-to-b from-amber-500/20 to-orange-900/30 hover:from-amber-500/35 hover:to-orange-900/50 border-2 border-amber-500/50 active:scale-90 hover:scale-105 active:-rotate-6 rounded-2xl flex flex-col items-center justify-center transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] ${
              emojiCooldown > 0 && !isAdminAuthenticated ? "opacity-40 cursor-not-allowed filter grayscale" : ""
            }`}
          >
            <span className="text-2xl sm:text-3xl select-none transition-transform hover:scale-125">🔥</span>
            <span className="text-[10px] font-black text-amber-300 mt-0.5 tracking-wide">Fogo</span>
          </button>

          <button
            onClick={() => handleReaction("👏")}
            disabled={emojiCooldown > 0 && !isAdminAuthenticated}
            className={`flex-1 py-2 bg-gradient-to-b from-emerald-500/20 to-teal-900/30 hover:from-emerald-500/35 hover:to-teal-900/50 border-2 border-emerald-500/50 active:scale-90 hover:scale-105 active:rotate-6 rounded-2xl flex flex-col items-center justify-center transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] ${
              emojiCooldown > 0 && !isAdminAuthenticated ? "opacity-40 cursor-not-allowed filter grayscale" : ""
            }`}
          >
            <span className="text-2xl sm:text-3xl select-none transition-transform hover:scale-125">👏</span>
            <span className="text-[10px] font-black text-emerald-300 mt-0.5 tracking-wide">Palmas</span>
          </button>

          <button
            onClick={() => handleReaction("🍅")}
            disabled={emojiCooldown > 0 && !isAdminAuthenticated}
            className={`flex-1 py-2 bg-gradient-to-b from-red-600/30 to-red-950/40 hover:from-red-600/45 hover:to-red-950/60 border-2 border-red-500/65 active:scale-90 hover:scale-105 active:-rotate-6 rounded-2xl flex flex-col items-center justify-center transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] group relative overflow-hidden ${
              emojiCooldown > 0 && !isAdminAuthenticated ? "opacity-40 cursor-not-allowed filter grayscale" : ""
            }`}
          >
            <span className="text-2xl sm:text-3xl select-none transition-transform group-hover:scale-125">🍅</span>
            <span className="text-[10px] font-black text-red-300 mt-0.5 tracking-wide">Tomataço</span>
          </button>
        </div>
      </footer>

      {/* PAINEL DO ANFITRIÃO (ADMIN MODAL REDESENHADO: BOTTOM-SHEET SCROLLÁVEL) */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-t sm:border border-cyan-500/40 rounded-t-[2rem] sm:rounded-3xl p-5 sm:p-6 w-full max-w-md max-h-[88vh] flex flex-col shadow-[0_0_50px_rgba(0,240,255,0.2)] relative overflow-hidden">
            {/* Barra de arrastar no mobile */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-3 shrink-0 sm:hidden" />

            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base leading-tight">Painel do Dono da Casa</h3>
                  <p className="text-[11px] text-slate-400">Comandos remotos da TV da sala</p>
                </div>
              </div>

              <button
                onClick={() => setShowAdminModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-slate-300 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo Scrollável com Proteção de Overflow */}
            <div className="flex-1 overflow-y-auto overscroll-contain py-3.5 pr-1 space-y-4">
              {!isAdminAuthenticated ? (
                /* Formulário de PIN */
                <form onSubmit={handleAdminAuth} className="space-y-4 py-2">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Digite a Senha do Anfitrião:
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        inputMode="numeric"
                        value={adminPinInput}
                        onChange={(e) => setAdminPinInput(e.target.value)}
                        placeholder="Senha..."
                        className="w-full bg-black/40 border border-white/20 focus:border-cyan-400 rounded-xl p-3 text-base text-white outline-none font-mono tracking-widest text-center"
                      />
                      <KeyRound className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    </div>
                    {adminError && <p className="text-xs text-red-400 mt-1.5 font-semibold">{adminError}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isCheckingPin || !adminPinInput.trim()}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-black py-3 rounded-xl text-xs transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                  >
                    {isCheckingPin ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verificando...</span>
                      </>
                    ) : (
                      'Desbloquear Painel'
                    )}
                  </button>
                </form>
              ) : (
                /* Ações de Anfitrião */
                <>
                  {/* Banner Ação Rápida: Começar / Resetar Festa */}
                  <div className="bg-gradient-to-r from-red-950/40 via-purple-950/40 to-pink-950/40 p-3 rounded-2xl border border-red-500/30 flex items-center justify-between gap-2 shadow-inner">
                    <div className="min-w-0">
                      <span className="text-xs font-black text-red-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Preparar para a Festa</span>
                      </span>
                      <p className="text-[10px] text-slate-300 truncate">Zera reações, fofocas e renova tickets</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("🚀 Deseja preparar a festa agora? Isso vai apagar fila/testes antigos, zerar fofocas e reações, e liberar Golden Ticket novo para todo mundo.")) return;
                        if (isSupabaseConfigured()) {
                          try {
                            await supabase.from("karaoke_queue").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                            await supabase.from("karaoke_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                            await supabase.from("karaoke_reactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                            fetchData();
                          } catch (e) {
                            console.error("Erro ao iniciar nova festa:", e);
                          }
                        }
                        setGoldenTicketUsed(false);
                        setUseGoldenTicket(true);
                        soundManager.playVipFanfare();
                        setAddedSuccessMessage("🎉 Festa Iniciada! Tudo limpo e Golden Tickets liberados!");
                        setTimeout(() => setAddedSuccessMessage(null), 4000);
                      }}
                      className="px-3 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-xl text-xs font-black shadow transition-all active:scale-95 shrink-0 flex items-center gap-1.5"
                    >
                      <span>🚀 Zerar & Iniciar</span>
                    </button>
                  </div>

                  {/* Card: No Palco Agora */}
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold mb-1">
                      <span>Música no Palco:</span>
                      <span className="text-emerald-400 flex items-center gap-1 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ao Vivo
                      </span>
                    </div>
                    <p className="font-black text-sm text-white truncate">
                      {currentSong ? currentSong.title : "Palco livre"}
                    </p>
                    {currentSong && (
                      <p className="text-xs text-cyan-300 mt-0.5">
                        Cantor(a): <span className="font-bold">{currentSong.singer_name}</span>
                      </p>
                    )}
                  </div>

                  {/* Card: Volume da TV */}
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-cyan-400" />
                        <span>Volume da Música na TV</span>
                      </span>
                      <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded-md shadow-sm">
                        {remoteVolume}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={remoteVolume}
                      onChange={(e) => handleAdminVolume(Number(e.target.value))}
                      className="w-full h-2.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-pink-400 transition-all"
                    />

                    <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                      <button
                        onClick={() => handleAdminVolume(0)}
                        className={`py-1.5 rounded-lg text-[11px] font-black border transition-all ${
                          remoteVolume === 0
                            ? "bg-red-500/25 text-red-300 border-red-500/50 shadow"
                            : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        Mudo
                      </button>
                      <button
                        onClick={() => handleAdminVolume(Math.max(0, remoteVolume - 10))}
                        className="py-1.5 rounded-lg text-[11px] font-black bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                      >
                        -10%
                      </button>
                      <button
                        onClick={() => handleAdminVolume(Math.min(100, remoteVolume + 10))}
                        className="py-1.5 rounded-lg text-[11px] font-black bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                      >
                        +10%
                      </button>
                      <button
                        onClick={() => handleAdminVolume(100)}
                        className={`py-1.5 rounded-lg text-[11px] font-black border transition-all ${
                          remoteVolume === 100
                            ? "bg-cyan-500/25 text-cyan-300 border-cyan-500/50 shadow"
                            : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        100%
                      </button>
                    </div>
                  </div>

                  {/* Card: Controles do Player na TV */}
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 space-y-2.5">
                    <span className="text-xs font-black text-slate-300 block">
                      Controles de Reprodução da TV
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleAdminAction("pause")}
                        className="py-2.5 px-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-black transition-all active:scale-90 shadow-sm"
                      >
                        <Pause className="w-4 h-4 text-amber-300" />
                        <span>Pausar</span>
                      </button>

                      <button
                        onClick={() => handleAdminAction("play")}
                        className="py-2.5 px-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-black transition-all active:scale-90 shadow-sm"
                      >
                        <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                        <span>Tocar</span>
                      </button>

                      <button
                        onClick={() => handleAdminAction("skip")}
                        className="py-2.5 px-2 bg-red-600/25 hover:bg-red-600/40 border border-red-500/40 text-red-300 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-black transition-all active:scale-90 shadow-sm"
                      >
                        <SkipForward className="w-4 h-4" />
                        <span>Pular</span>
                      </button>
                    </div>
                  </div>

                  {/* Card: Gerenciamento da Playlist do Modo Festa (Hits Atuais) */}
                  <div className="bg-gradient-to-br from-pink-950/50 via-purple-950/40 to-slate-900/80 p-3.5 rounded-2xl border border-pink-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                        <span className="text-xs font-black text-white">Modo Festa • Clipes Oficiais</span>
                      </div>
                      <span className="text-[10px] text-pink-300 font-bold bg-pink-500/20 px-2 py-0.5 rounded-full border border-pink-500/30">
                        {partyPlaylist.length} {partyPlaylist.length === 1 ? "clipe" : "clipes"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">
                      Clipes originais com voz para tocar sem parar quando a fila estiver vazia. Você pode ordenar, remover ou adicionar novos sucessos!
                    </p>

                    {/* Botões Rápidos: Ligar/Desligar na TV & Restaurar Padrão */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleAdminTogglePartyMode}
                        className="py-2 px-2.5 bg-gradient-to-r from-pink-600/40 to-purple-600/40 hover:from-pink-600/60 hover:to-purple-600/60 border border-pink-500/50 rounded-xl text-[11px] font-black text-pink-200 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow"
                      >
                        <Radio className="w-3.5 h-3.5 text-pink-400" />
                        <span>Alternar na TV</span>
                      </button>

                      <button
                        onClick={handleResetPartyPlaylist}
                        className="py-2 px-2.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-[11px] font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span>Restaurar Hits</span>
                      </button>
                    </div>

                    {/* Lista das Músicas com Ordenação e Exclusão */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {partyPlaylist.map((song, idx) => (
                        <div
                          key={song.id}
                          className="bg-black/40 border border-white/10 rounded-xl p-2 flex items-center justify-between gap-2 text-xs hover:border-pink-500/30 transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-300 font-black text-[10px] flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate text-[11px] leading-tight">
                                {song.title}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {song.artist}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMovePartyItem(idx, "up")}
                              title="Subir na ordem"
                              className="p-1 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 text-slate-300 active:scale-90 transition-all"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={idx === partyPlaylist.length - 1}
                              onClick={() => handleMovePartyItem(idx, "down")}
                              title="Descer na ordem"
                              className="p-1 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-20 text-slate-300 active:scale-90 transition-all"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePartyItem(idx)}
                              title="Remover clipe"
                              className="p-1 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300 active:scale-90 transition-all ml-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Botão Adicionar Novo Clipe */}
                    <button
                      onClick={() => setShowAddPartyModal(true)}
                      className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Adicionar Clipe do YouTube</span>
                    </button>
                  </div>

                  {/* Card: Moderação da Festa & Golden Tickets */}
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 space-y-2.5">
                    <span className="text-xs font-black text-slate-300 block">
                      Moderação & Privilégios VIP
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setGoldenTicketUsed(false);
                          setUseGoldenTicket(true);
                          setAddedSuccessMessage("Golden Ticket liberado para você usar agora! 🎟️✨");
                          setTimeout(() => setAddedSuccessMessage(null), 3500);
                        }}
                        className="py-2.5 px-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black shadow transition-all active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Meu Ticket 🎟️</span>
                      </button>

                      <button
                        onClick={async () => {
                          if (!confirm("Deseja renovar o Golden Ticket de TODOS os convidados agora?")) return;
                          if (isSupabaseConfigured()) {
                            try {
                              // Remove a marcação de prioridade das músicas anteriores para liberar novo ticket a todos
                              await supabase
                                .from("karaoke_queue")
                                .update({ is_priority: false })
                                .eq("is_priority", true);
                              fetchData();
                            } catch (e) {
                              console.error("Erro ao renovar tickets:", e);
                            }
                          }
                          setGoldenTicketUsed(false);
                          setAddedSuccessMessage("Golden Tickets renovados para TODOS os convidados! 🎉🎟️");
                          setTimeout(() => setAddedSuccessMessage(null), 4000);
                        }}
                        className="py-2.5 px-2 bg-gradient-to-r from-amber-600/30 to-yellow-600/30 hover:from-amber-600/40 hover:to-yellow-600/40 border border-amber-500/40 text-yellow-200 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black shadow transition-all active:scale-95"
                      >
                        <Crown className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Renovar de Todos 🎟️</span>
                      </button>
                    </div>

                    <button
                      onClick={handleClearAllGossips}
                      className="w-full py-2.5 px-3 bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/35 text-yellow-300 rounded-xl flex items-center justify-center gap-2 text-xs font-black shadow transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4 text-yellow-400" />
                      <span>Limpar Todas as Fofocas do Rodapé</span>
                    </button>

                    <button
                      onClick={async () => {
                        if (!confirm("⚠️ ATENÇÃO: Deseja apagar todas as músicas do relatório, fila e fofocas para começar uma FESTA TOTALMENTE NOVA? (Essa ação zera o placar e renova o Golden Ticket de todo mundo)")) return;
                        if (isSupabaseConfigured()) {
                          try {
                            await supabase.from("karaoke_queue").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                            await supabase.from("karaoke_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                            await supabase.from("karaoke_reactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                            fetchData();
                          } catch (e) {
                            console.error("Erro ao resetar festa:", e);
                          }
                        }
                        setGoldenTicketUsed(false);
                        setAddedSuccessMessage("Festa reiniciada! Relatório, fila e Golden Tickets zerados com sucesso! 🏆✨");
                        setTimeout(() => setAddedSuccessMessage(null), 4000);
                      }}
                      className="w-full py-2.5 px-3 bg-red-600/20 hover:bg-red-600/35 border border-red-500/40 text-red-300 rounded-xl flex items-center justify-center gap-2 text-xs font-black shadow transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span>Zerar Relatório & Iniciar Nova Festa 🚀</span>
                    </button>
                  </div>

                  {/* Rodapé: Logout do Admin */}
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-white/10">
                    <span className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                      <Crown className="w-3.5 h-3.5" /> Anfitrião Ativo
                    </span>
                    <button
                      onClick={() => {
                        setIsAdminAuthenticated(false);
                        setShowAdminModal(false);
                        if (typeof window !== "undefined") {
                          localStorage.removeItem("gukaraoke_is_admin");
                        }
                      }}
                      className="text-red-400 hover:text-red-300 hover:underline font-bold text-[11px] px-2.5 py-1 rounded-lg bg-red-950/30 border border-red-500/30 active:scale-95"
                    >
                      Sair do Modo Admin
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IDENTIFICAÇÃO DO CANTOR */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-pink-500/40 rounded-3xl p-4 sm:p-6 w-full max-w-sm max-h-[92vh] flex flex-col shadow-[0_0_40px_rgba(255,0,127,0.3)]">
            <div className="text-center mb-3 shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg mb-2 text-2xl">
                🎙️
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">Identifique-se, Astro!</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Escolha seu nome de palco e sua tag cômica.
              </p>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-0">
              <div>
                <label className="text-[11px] sm:text-xs font-bold text-slate-300 block mb-1">
                  Seu Nome ou Apelido:
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ex: Paulinho, Maria, Gu..."
                  className="w-full bg-black/50 border border-white/20 focus:border-pink-500 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-white outline-none transition-all placeholder:text-slate-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] sm:text-xs font-bold text-slate-300">
                    Sua Personalidade:
                  </label>
                  <span className="text-[10px] text-pink-300 font-mono bg-pink-500/20 px-1.5 py-0.5 rounded-md border border-pink-500/30">
                    {COMIC_TAGS.length} opções
                  </span>
                </div>

                {/* Tag Selecionada em Destaque */}
                {userTag && (
                  <div className="mb-2 p-2 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                      <span className="text-base">{selectedTagObj.emoji}</span>
                      <span>{selectedTagObj.label}</span>
                    </div>
                    <span className="text-[10px] text-pink-300 uppercase font-black tracking-wider">
                      Selecionado ✓
                    </span>
                  </div>
                )}

                {/* Grade Otimizada com Altura Dinâmica e Scroll Fluido */}
                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {COMIC_TAGS.map((tag) => {
                    const isSelected = userTag === tag.id;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setUserTag(tag.id)}
                        className={`p-2 rounded-xl text-left border text-xs flex items-center gap-1.5 transition-all active:scale-95 ${
                          isSelected
                            ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-400 font-bold shadow-md ring-1 ring-pink-400"
                            : "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-base shrink-0">{tag.emoji}</span>
                        <span className="text-[11px] font-semibold leading-tight line-clamp-2">
                          {tag.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 shrink-0">
              <button
                type="button"
                disabled={!userName.trim()}
                onClick={() => saveProfile(userName, userTag)}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-40 text-white font-black py-2.5 sm:py-3 rounded-2xl shadow-lg transition-all active:scale-95 text-xs sm:text-sm"
              >
                Entrar no Show! 🎤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR CLIPE AO MODO FESTA COM BUSCA DO YOUTUBE */}
      {showAddPartyModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-pink-500/50 rounded-3xl p-5 w-full max-w-md max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(255,0,127,0.35)]">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-base">
                  🎬
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Adicionar ao Modo Festa</h3>
                  <p className="text-[10px] text-pink-300">Clipes com Voz Liberados para a TV</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddPartyModal(false);
                  setPartyError(null);
                  setPartySearchQuery("");
                  setPartySearchResults([]);
                }}
                className="text-slate-400 hover:text-white p-1 text-sm font-black"
              >
                ✕
              </button>
            </div>

            {/* Alternador entre Busca e Link Manual */}
            <div className="flex p-1 bg-black/40 rounded-xl mb-3 border border-white/10">
              <button
                type="button"
                onClick={() => setPartySearchMode("search")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  partySearchMode === "search"
                    ? "bg-pink-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Pesquisar Música</span>
              </button>
              <button
                type="button"
                onClick={() => setPartySearchMode("manual")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  partySearchMode === "manual"
                    ? "bg-pink-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Colar Link / ID</span>
              </button>
            </div>

            {/* CONTEÚDO MODO BUSCA */}
            {partySearchMode === "search" && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                <form onSubmit={handleSearchPartyClips} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={partySearchQuery}
                      onChange={(e) => setPartySearchQuery(e.target.value)}
                      placeholder="Ex: Pipoco, Ana Castela, Dennis..."
                      className="w-full bg-black/40 border border-white/20 focus:border-pink-500 rounded-xl py-2.5 pl-3 pr-8 text-xs text-white placeholder:text-slate-500 outline-none"
                      autoFocus
                    />
                    {partySearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setPartySearchQuery("");
                          setPartySearchResults([]);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingParty || !partySearchQuery.trim()}
                    className="px-4 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow transition-all active:scale-95"
                  >
                    {isSearchingParty ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Buscar</span>
                  </button>
                </form>

                {partyError && (
                  <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-500/50 text-[11px] text-red-300">
                    {partyError}
                  </div>
                )}

                {/* Resultados da Busca */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px] max-h-[45vh]">
                  {isSearchingParty && (
                    <div className="text-center py-8 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-pink-500 mb-2" />
                      <p className="text-xs font-semibold">Buscando clipes liberados no YouTube...</p>
                    </div>
                  )}

                  {!isSearchingParty && partySearchResults.length === 0 && !partyError && (
                    <div className="text-center py-8 text-slate-500">
                      <Music className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                      <p className="text-xs font-medium">Digite o nome da música ou cantor acima.</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Os resultados já vêm verificados contra bloqueio de reprodução.</p>
                    </div>
                  )}

                  {!isSearchingParty &&
                    partySearchResults.map((item) => (
                      <div
                        key={item.videoId}
                        className="bg-black/40 border border-white/10 hover:border-pink-500/40 rounded-2xl p-2.5 flex items-center gap-3 transition-all"
                      >
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-16 h-12 rounded-xl object-cover border border-white/10 shrink-0 bg-slate-800"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white line-clamp-1">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-pink-300 line-clamp-1 mt-0.5">
                            {item.channelTitle || "YouTube"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectPartySearchResult(item)}
                          className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-black text-[11px] rounded-xl flex items-center gap-1 shadow transition-all active:scale-90 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* CONTEÚDO MODO LINK MANUAL */}
            {partySearchMode === "manual" && (
              <form onSubmit={handleAddPartyItem} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Título da Música:
                  </label>
                  <input
                    type="text"
                    value={newPartyTitle}
                    onChange={(e) => setNewPartyTitle(e.target.value)}
                    placeholder="Ex: Pipoco, Nosso Quadro..."
                    className="w-full bg-black/40 border border-white/20 focus:border-pink-500 rounded-xl p-2.5 text-xs text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Artista(s):
                  </label>
                  <input
                    type="text"
                    value={newPartyArtist}
                    onChange={(e) => setNewPartyArtist(e.target.value)}
                    placeholder="Ex: Ana Castela, Dennis..."
                    className="w-full bg-black/40 border border-white/20 focus:border-pink-500 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Link ou ID do Vídeo no YouTube:
                  </label>
                  <input
                    type="text"
                    value={newPartyVideoUrl}
                    onChange={(e) => setNewPartyVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... ou ID de 11 dígitos"
                    className="w-full bg-black/40 border border-white/20 focus:border-pink-500 rounded-xl p-2.5 text-xs text-white outline-none font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 Cole o link normal do YouTube. Faremos a checagem anti-bloqueio antes de salvar.
                  </span>
                </div>

                {partyError && (
                  <div className="p-2 rounded-xl bg-red-950/50 border border-red-500/50 text-[11px] text-red-300">
                    {partyError}
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPartyModal(false);
                      setPartyError(null);
                    }}
                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    Salvar Clipe
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
