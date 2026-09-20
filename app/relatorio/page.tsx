"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  supabase,
  isSupabaseConfigured,
  KaraokeQueueItem,
  KaraokeEvent,
} from "@/lib/supabase";
import { COMIC_TAGS } from "@/lib/utils";
import confetti from "canvas-confetti";
import {
  Trophy,
  Crown,
  Flame,
  Heart,
  Tv,
  Smartphone,
  Copy,
  Check,
  Music,
  Radio,
  Sparkles,
  ArrowLeft,
  Trash2,
  Share2,
  Clock,
  Zap,
  Download,
  Award,
} from "lucide-react";

export default function RelatorioPage() {
  const [finishedSongs, setFinishedSongs] = useState<KaraokeQueueItem[]>([]);
  const [gossips, setGossips] = useState<KaraokeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  useEffect(() => {
    try {
      confetti({
        particleCount: 120,
        spread: 85,
        origin: { y: 0.55 },
      });
    } catch {}

    loadReportData();
  }, []);

  const loadReportData = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const { data: songsData } = await supabase
        .from("karaoke_queue")
        .select("*")
        .eq("status", "finished")
        .order("positive_votes", { ascending: false });

      if (songsData) {
        setFinishedSongs(songsData);
      }

      const { data: gossipsData } = await supabase
        .from("karaoke_events")
        .select("*")
        .eq("type", "fofoca")
        .order("created_at", { ascending: false });

      if (gossipsData) {
        setGossips(gossipsData);
      }
    } catch (err) {
      console.error("Erro ao carregar relatório:", err);
    } finally {
      setLoading(false);
    }
  };

  // Estatísticas Gerais
  const totalSongs = finishedSongs.length;
  const totalPositiveVotes = finishedSongs.reduce((acc, s) => acc + s.positive_votes, 0);
  const totalTomatoes = finishedSongs.reduce((acc, s) => acc + s.tomatoes, 0);
  const totalReactions = totalPositiveVotes + totalTomatoes;

  // Tempo total estimado de karaokê (3.5 min por música)
  const totalDurationFormatted = useMemo(() => {
    const totalMinutes = Math.round(totalSongs * 3.5);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} minutos`;
  }, [totalSongs]);

  // Pódio dos 3 primeiros (mais votos positivos)
  const podium = useMemo(() => {
    return finishedSongs.slice(0, 3);
  }, [finishedSongs]);

  // Badge Especial: "Cancelado da Festa" (quem levou mais tomates)
  const mostCanceled = useMemo(() => {
    if (finishedSongs.length === 0) return null;
    const sorted = [...finishedSongs].sort((a, b) => b.tomatoes - a.tomatoes);
    return sorted[0].tomatoes > 0 ? sorted[0] : null;
  }, [finishedSongs]);

  // Inimigo do Fim (quem cantou mais vezes)
  const topPerformer = useMemo(() => {
    if (finishedSongs.length === 0) return null;
    const counts: Record<string, { count: number; name: string; tag?: string | null }> = {};
    finishedSongs.forEach((s) => {
      const key = s.singer_name.trim().toLowerCase();
      if (!counts[key]) {
        counts[key] = { count: 0, name: s.singer_name, tag: s.singer_tag };
      }
      counts[key].count += 1;
    });

    const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
    return sorted[0] || null;
  }, [finishedSongs]);

  // Limpar sessão / Nova festa
  const handleClearSession = async () => {
    setIsClearing(true);
    try {
      if (isSupabaseConfigured()) {
        await supabase.from("karaoke_queue").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("karaoke_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("karaoke_reactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
      setFinishedSongs([]);
      setGossips([]);
      setShowClearModal(false);
      alert("Festa e relatório resetados com sucesso! Golden Tickets renovados para todos!");
    } catch (err) {
      console.error("Erro ao resetar:", err);
    } finally {
      setIsClearing(false);
    }
  };

  // Formata o resumo completo para o WhatsApp
  const generateWhatsAppSummary = () => {
    let text = `🎤 *SHOW TIME: RESUMO DO GUGABI KARAOKE* 🏆\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `📊 *NÚMEROS DA NOITE:*\n`;
    text += `• Total de Músicas: ${totalSongs} apresentações\n`;
    text += `• Tempo de Cantoria: ${totalDurationFormatted}\n`;
    text += `• Total de Reações: ${totalReactions} (❤️ ${totalPositiveVotes} | 🍅 ${totalTomatoes})\n\n`;

    text += `👑 *PÓDIO DOS CAMPEÕES:*\n`;
    if (podium[0]) text += `🥇 1º Lugar: *${podium[0].singer_name}* - "${podium[0].title}" (${podium[0].positive_votes} ❤️)\n`;
    if (podium[1]) text += `🥈 2º Lugar: *${podium[1].singer_name}* - "${podium[1].title}" (${podium[1].positive_votes} ❤️)\n`;
    if (podium[2]) text += `🥉 3º Lugar: *${podium[2].singer_name}* - "${podium[2].title}" (${podium[2].positive_votes} ❤️)\n\n`;

    text += `🏅 *PREMIAÇÕES ESPECIAIS:*\n`;
    if (mostCanceled) {
      text += `🍅 *Cancelado da Festa:* ${mostCanceled.singer_name} levou ${mostCanceled.tomatoes} tomates na cara!\n`;
    }
    if (topPerformer) {
      text += `⚡ *Inimigo do Fim:* ${topPerformer.name} com ${topPerformer.count} músicas cantadas!\n`;
    }

    if (gossips.length > 0) {
      text += `\n🚨 *FOFOCA DOS BASTIDORES:* "${gossips[0].payload}"\n`;
    }

    text += `\nValeu pelo show, galera! Até o próximo karaokê! 🎶🍻`;
    return text;
  };

  const handleCopy = () => {
    const summary = generateWhatsAppSummary();
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getTag = (tagId?: string | null) => {
    return COMIC_TAGS.find((t) => t.id === tagId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 select-none">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* HEADER SUPERIOR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Link
              href="/tv"
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-slate-300 hover:text-white transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                RESUMO DA <span className="text-neon-pink">NOITE</span> 🏆
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Premiações, pódio dos campeões e estatísticas da cantoria.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCardModal(true)}
              className="bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-black px-3.5 py-2.5 rounded-2xl flex items-center gap-1.5 transition-all active:scale-95 shadow"
            >
              <Share2 className="w-4 h-4" />
              <span>Card Stories</span>
            </button>

            <button
              onClick={handleCopy}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-xs font-black px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copiado!" : "Compartilhar no WhatsApp"}</span>
            </button>

            <button
              onClick={() => setShowClearModal(true)}
              title="Resetar festa para uma nova noite"
              className="bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-300 text-xs font-bold p-2.5 rounded-2xl transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ESTATÍSTICAS GERAIS NO TOPO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 border border-white/10 p-4 rounded-3xl backdrop-blur-md flex items-center gap-3.5 shadow">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total de Músicas
              </span>
              <p className="text-2xl font-black text-white font-mono mt-0.5">
                {totalSongs} <span className="text-xs text-pink-300 font-sans font-bold">faixas</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-white/10 p-4 rounded-3xl backdrop-blur-md flex items-center gap-3.5 shadow">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Reações Disparadas
              </span>
              <p className="text-2xl font-black text-white font-mono mt-0.5">
                {totalReactions} <span className="text-xs text-amber-300 font-sans font-bold">ao vivo</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-white/10 p-4 rounded-3xl backdrop-blur-md flex items-center gap-3.5 shadow">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Tempo de Karaokê
              </span>
              <p className="text-2xl font-black text-cyan-300 font-mono mt-0.5">
                {totalDurationFormatted}
              </p>
            </div>
          </div>
        </div>

        {/* PÓDIO OLÍMPICO ESTILO SHOW */}
        {podium.length > 0 && (
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="text-center mb-6">
              <span className="bg-amber-500/20 text-amber-300 text-xs font-black px-4 py-1 rounded-full border border-amber-500/40 uppercase tracking-widest inline-flex items-center gap-1.5 shadow">
                <Crown className="w-4 h-4 text-yellow-400" /> Pódio Oficial do GuGabi Karaoke
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white mt-2 drop-shadow">
                As Maiores Vozes do Palco
              </h2>
            </div>

            <div className="flex items-end justify-center gap-3 md:gap-6 pt-6 pb-2 max-w-lg mx-auto">
              {/* 2º Lugar (Prata) */}
              <div className="flex-1 flex flex-col items-center">
                {podium[1] ? (
                  <div className="text-center w-full">
                    <span className="text-3xl mb-1 block">🥈</span>
                    <p className="text-xs md:text-sm font-black text-white truncate max-w-[110px] mx-auto">
                      {podium[1].singer_name}
                    </p>
                    <span className="text-[10px] text-pink-300 font-mono font-bold block mb-2">
                      ❤️ {podium[1].positive_votes}
                    </span>
                    <div className="h-28 bg-gradient-to-t from-slate-700 to-slate-500 rounded-t-2xl border-t-2 border-slate-300 flex items-center justify-center font-black text-2xl text-slate-200 shadow-lg">
                      2º
                    </div>
                  </div>
                ) : (
                  <div className="h-28 w-full bg-white/5 rounded-t-2xl flex items-center justify-center text-slate-600 font-black">
                    -
                  </div>
                )}
              </div>

              {/* 1º Lugar (Ouro) */}
              <div className="flex-1 flex flex-col items-center">
                {podium[0] && (
                  <div className="text-center w-full">
                    <span className="text-4xl mb-1 block animate-bounce">👑</span>
                    <p className="text-sm md:text-base font-black text-yellow-300 truncate max-w-[125px] mx-auto drop-shadow">
                      {podium[0].singer_name}
                    </p>
                    <span className="text-xs text-yellow-200 font-mono font-bold block mb-2">
                      ❤️ {podium[0].positive_votes} votos
                    </span>
                    <div className="h-36 bg-gradient-to-t from-amber-600 via-yellow-500 to-amber-300 rounded-t-2xl border-t-4 border-yellow-200 flex items-center justify-center font-black text-4xl text-black shadow-[0_0_35px_rgba(245,158,11,0.6)]">
                      1º
                    </div>
                  </div>
                )}
              </div>

              {/* 3º Lugar (Bronze) */}
              <div className="flex-1 flex flex-col items-center">
                {podium[2] ? (
                  <div className="text-center w-full">
                    <span className="text-3xl mb-1 block">🥉</span>
                    <p className="text-xs md:text-sm font-black text-white truncate max-w-[110px] mx-auto">
                      {podium[2].singer_name}
                    </p>
                    <span className="text-[10px] text-pink-300 font-mono font-bold block mb-2">
                      ❤️ {podium[2].positive_votes}
                    </span>
                    <div className="h-20 bg-gradient-to-t from-amber-900 to-amber-700 rounded-t-2xl border-t-2 border-amber-600 flex items-center justify-center font-black text-xl text-amber-200 shadow">
                      3º
                    </div>
                  </div>
                ) : (
                  <div className="h-20 w-full bg-white/5 rounded-t-2xl flex items-center justify-center text-slate-600 font-black">
                    -
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CARDS DE DESTAQUE: CANCELADO DA FESTA & INIMIGO DO FIM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* BADGE ESPECIAL: CANCELADO DA FESTA */}
          <div className="bg-gradient-to-b from-red-600/20 to-slate-900/80 border border-red-500/40 rounded-3xl p-5 shadow flex items-center justify-between backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black uppercase tracking-wider text-red-300 bg-red-950/60 px-2.5 py-0.5 rounded-full border border-red-500/40">
                  Cancelado da Festa
                </span>
              </div>

              {mostCanceled ? (
                <div className="mt-2">
                  <p className="text-2xl font-black text-white">{mostCanceled.singer_name}</p>
                  <p className="text-xs text-slate-300 truncate mt-0.5">"{mostCanceled.title}"</p>
                  <span className="inline-block mt-2 text-xs font-bold text-red-300 bg-red-600/20 px-3 py-1 rounded-xl border border-red-500/30">
                    💥 {mostCanceled.tomatoes} tomates recebidos
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-2">Nenhum tomate! A plateia amou todo mundo.</p>
              )}
            </div>

            <div className="text-5xl md:text-6xl select-none animate-pulse shrink-0">
              🍅
            </div>
          </div>

          {/* INIMIGO DO FIM */}
          <div className="bg-gradient-to-b from-purple-600/20 to-slate-900/80 border border-purple-500/40 rounded-3xl p-5 shadow flex items-center justify-between backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black uppercase tracking-wider text-purple-300 bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-500/40">
                  Inimigo do Fim
                </span>
              </div>

              {topPerformer ? (
                <div className="mt-2">
                  <p className="text-2xl font-black text-white">{topPerformer.name}</p>
                  <p className="text-xs text-slate-300 mt-0.5">Não largou o microfone por nada!</p>
                  <span className="inline-block mt-2 text-xs font-bold text-purple-200 bg-purple-600/20 px-3 py-1 rounded-xl border border-purple-500/30">
                    🎤 {topPerformer.count} apresentações no palco
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-2">Nenhuma apresentação concluída ainda.</p>
              )}
            </div>

            <div className="text-5xl md:text-6xl select-none text-purple-400 shrink-0">
              🔥
            </div>
          </div>
        </div>

        {/* TABELA CRONOLÓGICA DAS MÚSICAS CANTADAS */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-black text-white">Histórico das Apresentações</h2>
            </div>
            <span className="text-xs text-slate-400 font-semibold bg-white/5 px-3 py-1 rounded-full font-mono">
              {finishedSongs.length} músicas cantadas
            </span>
          </div>

          {finishedSongs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-400 uppercase font-black">
                    <th className="py-3 px-2">#</th>
                    <th className="py-3 px-4">Música</th>
                    <th className="py-3 px-4">Cantor</th>
                    <th className="py-3 px-4">Personalidade</th>
                    <th className="py-3 px-4 text-center">Placar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {finishedSongs.map((song, idx) => {
                    const tag = getTag(song.singer_tag);
                    return (
                      <tr key={song.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-2 font-black text-slate-400">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white max-w-xs truncate">
                          {song.title}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-cyan-300">
                          {song.singer_name}
                        </td>
                        <td className="py-3.5 px-4">
                          {tag ? (
                            <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border ${tag.color}`}>
                              <span>{tag.emoji}</span> {tag.label}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-2.5 bg-black/40 px-3 py-1 rounded-xl border border-white/10 text-xs font-mono">
                            <span className="text-pink-400 font-bold">❤️ {song.positive_votes}</span>
                            <span className="text-red-400 font-bold">🍅 {song.tomatoes}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm">Nenhuma música finalizada na sessão.</p>
            </div>
          )}
        </div>

        {/* MURAL DAS FOFOCAS */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-yellow-400 animate-pulse" />
              <h2 className="text-lg font-black text-white">Mural das Fofocas de Bastidor</h2>
            </div>
            <span className="text-xs text-yellow-300 font-semibold bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-full font-mono">
              {gossips.length} enviadas
            </span>
          </div>

          {gossips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {gossips.map((gossip, idx) => (
                <div
                  key={gossip.id || idx}
                  className="bg-yellow-500/10 border border-yellow-500/25 p-4 rounded-2xl hover:border-yellow-400/50 transition-all flex flex-col justify-between backdrop-blur-md"
                >
                  <p className="text-sm font-semibold text-yellow-100 italic leading-snug">
                    "{gossip.payload}"
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-yellow-400/70 font-mono">
                    <span>📢 Exposed Anônimo</span>
                    <span>#{idx + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">
              Nenhuma fofoca registrada nesta sessão.
            </p>
          )}
        </div>
      </div>

      {/* MODAL DO CARD STORIES 9:16 (INSTAGRAM / WHATSAPP STATUS) */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-purple-950 via-slate-950 to-black border border-pink-500/50 rounded-3xl p-6 w-full max-w-xs text-center shadow-[0_0_50px_rgba(255,0,127,0.4)] relative">
            <button
              onClick={() => setShowCardModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm"
            >
              ✕
            </button>

            <span className="text-[10px] bg-pink-600/30 text-pink-300 px-3 py-1 rounded-full border border-pink-500/40 uppercase font-black tracking-wider">
              GUGABI KARAOKE STORIES 📸
            </span>

            <h3 className="text-2xl font-black text-white mt-3">🏆 FIM DE SHOW!</h3>
            <p className="text-xs text-slate-300 mt-1">Resumo Oficial da Festa</p>

            <div className="my-5 space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 text-left text-xs">
              {podium[0] && (
                <div>
                  <span className="text-[10px] text-amber-300 font-bold uppercase">🥇 A Voz da Noite:</span>
                  <p className="font-black text-white text-sm">{podium[0].singer_name} ({podium[0].positive_votes} ❤️)</p>
                </div>
              )}
              {mostCanceled && (
                <div>
                  <span className="text-[10px] text-red-400 font-bold uppercase">🍅 Mais Cancelado:</span>
                  <p className="font-black text-white text-sm">{mostCanceled.singer_name} ({mostCanceled.tomatoes} 🍅)</p>
                </div>
              )}
              {topPerformer && (
                <div>
                  <span className="text-[10px] text-purple-300 font-bold uppercase">⚡ Inimigo do Fim:</span>
                  <p className="font-black text-white text-sm">{topPerformer.name} ({topPerformer.count} músicas)</p>
                </div>
              )}
              <div className="pt-2 border-t border-white/10 flex justify-between text-[10px] text-slate-400">
                <span>Total: {totalSongs} músicas</span>
                <span>Tempo: {totalDurationFormatted}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-4">Tire um print para postar nos stories!</p>
            <button
              onClick={handleCopy}
              className="w-full bg-pink-600 hover:bg-pink-500 text-white font-black py-2.5 rounded-xl text-xs shadow active:scale-95 transition-all"
            >
              {copied ? "Copiado!" : "Copiar Texto do Resumo"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE RESET DA SESSÃO */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-3 animate-pulse" />
            <h3 className="text-xl font-black text-white">Resetar o Karaokê?</h3>
            <p className="text-xs text-slate-300 mt-2 mb-6">
              Isso apagará todas as músicas concluídas e fofocas para que você possa começar uma nova festa com o placar zerado.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl text-xs transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearSession}
                disabled={isClearing}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-2.5 rounded-xl text-xs transition-all active:scale-95"
              >
                {isClearing ? "Limpando..." : "Sim, Resetar Tudo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
