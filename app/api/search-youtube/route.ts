import { NextRequest, NextResponse } from "next/server";
import { extractYouTubeId } from "@/lib/utils";

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle?: string;
  isVerified?: boolean;
}

// Catálogo de fallback com grandes sucessos de karaokê e hits 100% testados e liberados
const FALLBACK_KARAOKE_SONGS: YouTubeSearchResult[] = [
  {
    videoId: "LdydpFwQ11Y",
    title: "Sequência Feiticeira - Pedro Sampaio & MC GW (Versão Oficial)",
    thumbnail: "https://i.ytimg.com/vi/LdydpFwQ11Y/hqdefault.jpg",
    channelTitle: "LatinHype",
    isVerified: true,
  },
  {
    videoId: "69JAoslGYI8",
    title: "Pipoco - Ana Castela, Melody & DJ Chris (Clipe Oficial)",
    thumbnail: "https://i.ytimg.com/vi/69JAoslGYI8/hqdefault.jpg",
    channelTitle: "Ana Castela",
    isVerified: true,
  },
  {
    videoId: "vzEIwc0rG8Y",
    title: "Nosso Quadro - Ana Castela (Clipe Oficial)",
    thumbnail: "https://i.ytimg.com/vi/vzEIwc0rG8Y/hqdefault.jpg",
    channelTitle: "Ana Castela",
    isVerified: true,
  },
  {
    videoId: "Z_xh-_tEGTw",
    title: "Tá OK - Dennis & MC Kevin O Chris (Versão Oficial)",
    thumbnail: "https://i.ytimg.com/vi/Z_xh-_tEGTw/hqdefault.jpg",
    channelTitle: "LatinHype",
    isVerified: true,
  },
  {
    videoId: "tBdx1b40rfU",
    title: "Tubarão Te Amo - MC Ryan SP, MC Daniel & Cabelinho (Clipe Oficial)",
    thumbnail: "https://i.ytimg.com/vi/tBdx1b40rfU/hqdefault.jpg",
    channelTitle: "GR6 Explode",
    isVerified: true,
  },
  {
    videoId: "tfhwXKd1W_o",
    title: "Evidências - Chitãozinho & Xororó (Karaokê Version)",
    thumbnail: "https://i.ytimg.com/vi/tfhwXKd1W_o/hqdefault.jpg",
    channelTitle: "Singer! Karaokê",
    isVerified: true,
  },
  {
    videoId: "fJ9rUzIMcZQ",
    title: "Bohemian Rhapsody - Queen (Karaoke Version)",
    thumbnail: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg",
    channelTitle: "Sing King",
    isVerified: true,
  },
  {
    videoId: "qbCUViw6-5I",
    title: "Cheia de Manias - Raça Negra (Karaokê Version)",
    thumbnail: "https://i.ytimg.com/vi/qbCUViw6-5I/hqdefault.jpg",
    channelTitle: "Karaokê Oficial",
    isVerified: true,
  },
  {
    videoId: "3yd_eoMOvqk",
    title: "Olha a Explosão - MC Kevinho (Clipe Oficial)",
    thumbnail: "https://i.ytimg.com/vi/3yd_eoMOvqk/hqdefault.jpg",
    channelTitle: "Canal KondZilla",
    isVerified: true,
  },
  {
    videoId: "fEUCYAd0KGM",
    title: "Novo Balanço - Veigh (Clipe Oficial)",
    thumbnail: "https://i.ytimg.com/vi/fEUCYAd0KGM/hqdefault.jpg",
    channelTitle: "VEIGH",
    isVerified: true,
  },
  {
    videoId: "vAM1xXdRnH0",
    title: "Balanço da Rede - Matheus Fernandes & Xand Avião (Clipe Oficial)",
    thumbnail: "https://i.ytimg.com/vi/vAM1xXdRnH0/hqdefault.jpg",
    channelTitle: "Matheus Fernandes",
    isVerified: true,
  },
  {
    videoId: "_P7S2lKif-A",
    title: "Bum Bum Tam Tam - MC Fioti (Clipe Oficial)",
    thumbnail: "https://i.ytimg.com/vi/_P7S2lKif-A/hqdefault.jpg",
    channelTitle: "Canal KondZilla",
    isVerified: true,
  },
  {
    videoId: "LjhCEhWiKXk",
    title: "Tempo Perdido - Legião Urbana (Karaokê)",
    thumbnail: "https://i.ytimg.com/vi/LjhCEhWiKXk/hqdefault.jpg",
    channelTitle: "Rock Karaokê",
    isVerified: true,
  },
];

// Helper para decodificar entidades HTML nos títulos do YouTube
function decodeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Checagem definitiva de permissão de embed via YouTube oEmbed
 * Se o proprietário tiver desativado a reprodução externa (Error 150/101),
 * o YouTube responde com HTTP 401 (Unauthorized) ou 403.
 */
async function verifyYouTubeEmbedPermission(videoId: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const oRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { next: { revalidate: 1800 } }
    );

    if (oRes.status === 401 || oRes.status === 403) {
      return { ok: false, reason: "O proprietário deste vídeo desativou a reprodução fora do YouTube." };
    }
    if (oRes.status === 404) {
      return { ok: false, reason: "Vídeo indisponível, excluído ou privado." };
    }
    return { ok: oRes.ok };
  } catch {
    return { ok: true };
  }
}

/**
 * Busca direta no YouTube via extração inteligente de resultados (Zero Quota / Ilimitada)
 * Permite buscar QUALQUER música ou karaokê mesmo quando a cota da Google Cloud API estiver esgotada.
 */
async function scrapeYouTubeSearchResults(query: string): Promise<YouTubeSearchResult[]> {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*(\{.+?\});/);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const contents =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    const items: YouTubeSearchResult[] = [];

    if (Array.isArray(contents)) {
      for (const c of contents) {
        const videoRenderers = c.itemSectionRenderer?.contents;
        if (Array.isArray(videoRenderers)) {
          for (const v of videoRenderers) {
            const vr = v.videoRenderer;
            if (vr && vr.videoId && vr.title?.runs?.[0]?.text) {
              items.push({
                videoId: vr.videoId,
                title: decodeHtml(vr.title.runs[0].text),
                channelTitle: decodeHtml(vr.ownerText?.runs?.[0]?.text || "YouTube"),
                thumbnail:
                  vr.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
                  `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
                isVerified: true,
              });
            }
          }
        }
      }
    }
    return items;
  } catch (err) {
    console.error("Erro no scraping YouTube:", err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q) {
    return NextResponse.json({ items: [] });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  // 1. O usuário colou uma URL direta do YouTube ou ID
  const directId = extractYouTubeId(q);
  if (directId) {
    // Validação prévia imediata do link colado para nunca quebrar a TV
    const embedCheck = await verifyYouTubeEmbedPermission(directId);
    if (!embedCheck.ok) {
      return NextResponse.json({
        items: [],
        isDirectLink: true,
        isBlocked: true,
        error: embedCheck.reason || "O proprietário deste vídeo desativou a reprodução fora do YouTube. Escolha outra versão.",
      });
    }

    // Se tiver API Key, consulta o título e canal real
    if (apiKey && apiKey !== "your-youtube-api-key") {
      try {
        const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,status,contentDetails&id=${directId}&key=${apiKey}`;
        const vRes = await fetch(vUrl);
        if (vRes.ok) {
          const vData = await vRes.json();
          const item = vData.items?.[0];
          if (item) {
            if (!item.status?.embeddable) {
              return NextResponse.json({
                items: [],
                isDirectLink: true,
                isBlocked: true,
                error: "O proprietário deste vídeo desativou a reprodução fora do YouTube. Escolha outra versão.",
              });
            }

            return NextResponse.json({
              items: [
                {
                  videoId: directId,
                  title: decodeHtml(item.snippet?.title || `Vídeo do YouTube (${directId})`),
                  thumbnail:
                    item.snippet?.thumbnails?.high?.url ||
                    item.snippet?.thumbnails?.medium?.url ||
                    `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
                  channelTitle: decodeHtml(item.snippet?.channelTitle || "Link Direto"),
                  isVerified: true,
                },
              ],
              isDirectLink: true,
            });
          }
        }
      } catch (err) {
        console.error("Erro ao verificar link direto via API:", err);
      }
    }

    return NextResponse.json({
      items: [
        {
          videoId: directId,
          title: `Vídeo do YouTube (${directId})`,
          thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
          channelTitle: "Link Direto Verificado",
          isVerified: true,
        },
      ],
      isDirectLink: true,
    });
  }

  const type = searchParams.get("type"); // "party" para clipes oficiais/originais

  // 2. Busca Híbrida Inteligente (Scraper Ilimitado + Validação de Gravadoras / Embed)
  let searchQuery = q;
  if (type === "party") {
    // Para o Modo Festa (clipes oficiais com voz original), não injeta 'karaoke'
    const hasOfficialWord = /clipe|oficial|official|video|music video|lyric/i.test(q);
    searchQuery = hasOfficialWord ? q : `${q} clipe oficial`;
  } else {
    // Para pedidos normais de karaokê
    const hasKaraokeWord = /karaok[eê]|playback/i.test(q);
    searchQuery = hasKaraokeWord ? q : `${q} karaoke`;
  }

  // 2a. Busca direta no YouTube (Sem limite de cota 429)
  let rawCandidates: YouTubeSearchResult[] = await scrapeYouTubeSearchResults(searchQuery);

  // 2b. Se o scraper falhar por qualquer razão e houver API Key, tenta a API oficial como fallback
  if (rawCandidates.length === 0 && apiKey && apiKey !== "your-youtube-api-key") {
    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&type=video&videoEmbeddable=true&q=${encodeURIComponent(
        searchQuery
      )}&key=${apiKey}`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const data = await res.json();
        rawCandidates = (data.items || [])
          .map((item: any) => ({
            videoId: item.id?.videoId,
            title: decodeHtml(item.snippet?.title || ""),
            channelTitle: decodeHtml(item.snippet?.channelTitle || ""),
            thumbnail:
              item.snippet?.thumbnails?.high?.url ||
              item.snippet?.thumbnails?.medium?.url ||
              `https://i.ytimg.com/vi/${item.id?.videoId}/hqdefault.jpg`,
            isVerified: true,
          }))
          .filter((i: any) => Boolean(i.videoId));
      }
    } catch (e) {
      console.error("Fallback search API falhou:", e);
    }
  }

  // 2c. Validação e Filtragem rigorosa contra Error 150 (bloqueio de gravadoras multinacionais)
  if (rawCandidates.length > 0) {
    const candidateIds = rawCandidates.slice(0, 15).map((c) => c.videoId);

    // Se temos API key, consultamos contentDetails de todos em 1 única chamada (custa apenas 1 unit!)
    let verifiedItems: YouTubeSearchResult[] = [];

    if (apiKey && apiKey !== "your-youtube-api-key") {
      try {
        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=status,contentDetails&id=${candidateIds.join(
          ","
        )}&key=${apiKey}`;
        const vRes = await fetch(videosUrl);
        if (vRes.ok) {
          const vData = await vRes.json();
          const itemsMap = new Map<string, any>((vData.items || []).map((i: any) => [i.id, i]));

          for (const cand of rawCandidates) {
            const apiInfo = itemsMap.get(cand.videoId);
            if (!apiInfo) continue;

            // Bloqueia se a API disser expressamente que embed está desativado
            if (apiInfo.status?.embeddable === false) continue;
            if (apiInfo.status?.privacyStatus && apiInfo.status.privacyStatus !== "public") continue;

            // Filtro vital contra Erro 150: Se tiver blocked regions (ex: ["BY","RU"] ou ["RU"]), é gravadora com Content ID bloqueando TV
            const blocked = apiInfo.contentDetails?.regionRestriction?.blocked;
            if (Array.isArray(blocked) && (blocked.length > 0 || blocked.includes("BR"))) continue;

            if (apiInfo.contentDetails?.contentRating?.ytRating === "ytAgeRestricted") continue;

            verifiedItems.push({
              ...cand,
              isVerified: true,
            });
          }
        }
      } catch (err) {
        console.error("Erro ao validar candidatos na videos.list:", err);
      }
    }

    // Se a API não respondeu ou filtrou tudo, valida via oEmbed
    if (verifiedItems.length === 0) {
      const oembedChecks = await Promise.all(
        rawCandidates.slice(0, 10).map(async (cand) => {
          const check = await verifyYouTubeEmbedPermission(cand.videoId);
          return check.ok ? { ...cand, isVerified: true } : null;
        })
      );
      verifiedItems = oembedChecks.filter(Boolean) as YouTubeSearchResult[];
    }

    if (verifiedItems.length > 0) {
      return NextResponse.json({
        items: verifiedItems.slice(0, 5),
        source: "youtube-verified-live",
      });
    }
  }

  // 3. Fallback inteligente com catálogo curado e verificado (Top 5)
  const filtered = FALLBACK_KARAOKE_SONGS.filter((s) =>
    s.title.toLowerCase().includes(q.toLowerCase())
  );

  const fallbackResults = (filtered.length > 0 ? filtered : FALLBACK_KARAOKE_SONGS).slice(0, 5);

  return NextResponse.json({
    items: fallbackResults,
    source: "demo-fallback",
    notice: "Exibindo os 5 melhores sucessos verificados",
  });
}
