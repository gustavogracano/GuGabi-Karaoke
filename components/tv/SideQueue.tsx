"use client";

import { KaraokeQueueItem } from "@/lib/supabase";
import { COMIC_TAGS } from "@/lib/utils";
import { DynamicQRCode } from "@/components/tv/DynamicQRCode";
import { Disc3, Sparkles, Heart, Flame, Clock, Music } from "lucide-react";

interface SideQueueProps {
  currentSong: KaraokeQueueItem | null;
  pendingSongs: KaraokeQueueItem[];
  nextPartyTrack?: { title: string; artist: string; tag?: string } | null;
}

export function SideQueue({ currentSong, pendingSongs, nextPartyTrack }: SideQueueProps) {
  const nextFive = pendingSongs.slice(0, 5);

  const getTagInfo = (tagIdOrLabel?: string | null) => {
    if (!tagIdOrLabel) return null;
    return (
      COMIC_TAGS.find(
        (t) => t.id === tagIdOrLabel || t.label.toLowerCase() === tagIdOrLabel.toLowerCase()
      ) || {
        id: "custom",
        label: tagIdOrLabel,
        emoji: "🎤",
        color: "bg-purple-600/30 text-purple-300 border-purple-500/40",
      }
    );
  };

  const currentTag = getTagInfo(currentSong?.singer_tag);

  return (
    <div className="w-56 sm:w-60 md:w-64 lg:w-[250px] xl:w-[270px] shrink-0 flex flex-col gap-2.5 z-20 select-none overflow-hidden justify-between">
      {/* CARD "NO PALCO AGORA" COMPACTO E ELEGANTE */}
      <div className="bg-slate-900/80 backdrop-blur-2xl border-2 border-pink-500/40 rounded-2xl p-3 shadow-[0_0_25px_rgba(255,0,127,0.2)] relative overflow-hidden shrink-0">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-pink-500/20 via-purple-600/10 to-transparent rounded-full filter blur-xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-pink-400 font-black text-[11px] uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500" />
            </span>
            <span>{currentSong?.id.startsWith("party_") ? "No Palco • Modo Festa 🎬" : "No Palco Agora"}</span>
          </div>
          <Disc3 className="w-4 h-4 text-pink-400 animate-spin" />
        </div>

        {currentSong ? (
          <div className="space-y-2">
            {/* Título da Música */}
            <div>
              <h3 className="text-sm font-black text-white truncate leading-snug drop-shadow">
                {currentSong.title}
              </h3>
            </div>

            {/* Thumbnail do Vídeo */}
            {!currentSong.id.startsWith('party_') && (
              <div className="relative w-full h-16 rounded-xl overflow-hidden bg-black border border-white/10 mt-1">
                <img
                  src={`https://img.youtube.com/vi/${currentSong.video_id}/mqdefault.jpg`}
                  alt={currentSong.title}
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            )}

            {/* Nome do Cantor ou Palco Livre */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-2 backdrop-blur-md shadow-inner">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                {currentSong.id.startsWith("party_") ? "🎬 Clipe em Exibição:" : "🎤 Voz do Show:"}
              </span>
              <p className="text-base md:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 truncate mt-0.5 drop-shadow">
                {currentSong.singer_name}
              </p>

              {/* Badge da Singer Tag */}
              {currentTag && (
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${currentTag.color}`}
                  >
                    <span>{currentTag.emoji}</span>
                    <span className="truncate max-w-[130px]">{currentTag.label}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Placar ao Vivo de Reações: 🔥/❤️ vs 🍅 */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <div className="flex items-center justify-center gap-1.5 bg-pink-950/40 border border-pink-500/30 py-1 px-2 rounded-lg shadow-inner">
                <div className="flex items-center gap-0.5 text-pink-400">
                  <Heart className="w-3.5 h-3.5 fill-pink-500" />
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </div>
                <span className="text-sm font-black text-pink-200 font-mono">
                  {currentSong.positive_votes}
                </span>
              </div>

              <div className="flex flex-col justify-center bg-red-950/40 border border-red-500/30 py-1 px-2 rounded-lg shadow-inner">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-sm">🍅</span>
                  <span className="text-sm font-black text-red-300 font-mono">
                    {currentSong.tomatoes}
                  </span>
                </div>
                {/* Mini Tomatômetro da música atual (meta de 5 tomates) */}
                <div className="w-full bg-black/40 h-1 rounded-full overflow-hidden mt-0.5 border border-red-500/20">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(100, ((currentSong.tomatoes % 5 === 0 && currentSong.tomatoes > 0 ? 5 : currentSong.tomatoes % 5) / 5) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-3 text-center text-slate-400">
            <Music className="w-6 h-6 mx-auto text-slate-500 mb-1 animate-pulse" />
            <p className="text-xs font-black text-white">Palco Livre!</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Peça uma música pelo celular!
            </p>
          </div>
        )}
      </div>

      {/* FILA LATERAL COMPACTA: PRÓXIMAS MÚSICAS */}
      <div className="bg-slate-900/75 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 shadow-xl flex-1 flex flex-col justify-between overflow-hidden min-h-0">
        <div className="overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-1.5 text-cyan-300 font-black text-[11px] uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>A Seguir</span>
            </div>
            <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded-full text-slate-200 font-mono">
              {pendingSongs.length} na fila
            </span>
          </div>

          <div className="space-y-1.5 overflow-y-auto pr-0.5 flex-1 min-h-0">
            {nextFive.length > 0 ? (
              nextFive.map((song, index) => {
                const tag = getTagInfo(song.singer_tag);
                const positionLabel = index === 0 ? "A Seguir" : `${index + 1}º da Fila`;

                return (
                  <div
                    key={song.id}
                    className={`p-2 rounded-xl border transition-all relative overflow-hidden ${
                      song.is_priority
                        ? "bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        : index === 0
                        ? "bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.1)]"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          index === 0
                            ? "bg-cyan-400 text-slate-950 font-black shadow"
                            : "bg-white/15 text-slate-200"
                        }`}
                      >
                        {positionLabel}
                      </span>

                      {song.is_priority && (
                        <span className="flex items-center gap-0.5 text-[9px] font-black uppercase bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 px-1.5 py-0.5 rounded shadow animate-pulse">
                          <Sparkles className="w-2.5 h-2.5" /> VIP
                        </span>
                      )}
                    </div>

                    {/* Thumbnail em miniatura */}
                    <div className="w-full h-9 rounded-lg overflow-hidden bg-black/40 border border-white/5 mb-0.5 mt-0.5">
                      <img
                        src={`https://img.youtube.com/vi/${song.video_id}/default.jpg`}
                        alt={song.title}
                        className="w-full h-full object-cover opacity-75"
                      />
                    </div>

                    <p className="text-xs font-bold text-white truncate">
                      {song.title}
                    </p>

                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5 text-[10px]">
                      <span className="font-semibold text-slate-300 truncate max-w-[110px]">
                        🎙️ {song.singer_name}
                      </span>
                      {tag && (
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.2 rounded-full border truncate max-w-[80px] ${tag.color}`}
                        >
                          {tag.emoji} {tag.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : nextPartyTrack ? (
              <div className="p-2.5 rounded-xl border border-pink-500/30 bg-pink-500/10 shadow-inner">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-pink-500/30 text-pink-300 border border-pink-500/40">
                    A Seguir na Festa
                  </span>
                  <span className="text-[9px] text-yellow-300 font-bold">🎉 Modo Festa</span>
                </div>
                <p className="text-xs font-bold text-white truncate">
                  {nextPartyTrack.title}
                </p>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/10 text-[10px]">
                  <span className="font-semibold text-slate-300 truncate max-w-[110px]">
                    🎙️ {nextPartyTrack.artist}
                  </span>
                  {nextPartyTrack.tag && (
                    <span className="text-[9px] font-medium text-pink-300 truncate max-w-[80px]">
                      {nextPartyTrack.tag}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-cyan-300 font-bold mt-1.5 pt-1 border-t border-white/10 text-center">
                  👉 Peça pelo celular e cante antes!
                </p>
              </div>
            ) : (
              <div className="py-3 text-center text-slate-400">
                <p className="text-xs font-bold">Fila livre</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Aponte no QR Code embaixo do vídeo!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé informativo da fila */}
        {pendingSongs.length > 5 && (
          <div className="pt-1.5 mt-1 border-t border-white/10 text-center shrink-0">
            <p className="text-[10px] text-slate-300 font-medium">
              + <span className="text-cyan-400 font-bold">{pendingSongs.length - 5}</span>{" "}
              músicas na sequência
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
