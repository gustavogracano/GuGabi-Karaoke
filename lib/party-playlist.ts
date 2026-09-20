export interface PartySong {
  id: string;
  title: string;
  artist: string;
  videoId: string;
  tag: string;
}

export const DEFAULT_PARTY_PLAYLIST: PartySong[] = [
  {
    id: "pipoco-ana-castela",
    title: "Pipoco",
    artist: "Ana Castela, Melody & DJ Chris",
    videoId: "69JAoslGYI8",
    tag: "Agrofunk 🤠",
  },
  {
    id: "nosso-quadro-ana-castela",
    title: "Nosso Quadro",
    artist: "Ana Castela",
    videoId: "vzEIwc0rG8Y",
    tag: "Hit Nacional 🌟",
  },
  {
    id: "macetando-ivete-ludmilla",
    title: "Macetando",
    artist: "Ivete Sangalo & Ludmilla",
    videoId: "M0MzT4IrDnY",
    tag: "Carnaval 🎉",
  },
  {
    id: "tubarao-te-amo-ryan",
    title: "Tubarão Te Amo",
    artist: "MC Ryan SP, MC Daniel & MC Cabelinho",
    videoId: "tBdx1b40rfU",
    tag: "Funk Explosão 🦈",
  },
  {
    id: "tem-cabare-nattan",
    title: "Tem Cabaré Essa Noite",
    artist: "Nivaldo Marques & Nattan",
    videoId: "WiNYFwIfg4w",
    tag: "Piseiro Louco 🍾",
  },
  {
    id: "olha-a-explosao-kevinho",
    title: "Olha a Explosão",
    artist: "MC Kevinho",
    videoId: "3yd_eoMOvqk",
    tag: "Clássico da Pista 💣",
  },
  {
    id: "dengo-joao-gomes",
    title: "Dengo",
    artist: "João Gomes",
    videoId: "I-UEY8A-b5c",
    tag: "Piseiro Romântico 🌵",
  },
  {
    id: "malvada-ze-felipe",
    title: "Malvada",
    artist: "Zé Felipe",
    videoId: "r0mNwyywHIY",
    tag: "Dancinha Viral 💃",
  },
  {
    id: "dentro-da-hilux-luan",
    title: "Dentro da Hilux",
    artist: "Luan Pereira, MC Daniel & Ryan SP",
    videoId: "HZli8pArLSE",
    tag: "Agro Funk 🚜",
  },
  {
    id: "lepo-lepo-psirico",
    title: "Lepo Lepo",
    artist: "Psirico",
    videoId: "AHVS5DW434g",
    tag: "Axé Raiz 🥁",
  },
  {
    id: "nem-de-graca-pixote",
    title: "Nem de Graça / Saudade Arregaça",
    artist: "Grupo Pixote",
    videoId: "QxamVP2dJCA",
    tag: "Pagode Ao Vivo 🍻",
  },
  {
    id: "pega-o-guanabara-safadao",
    title: "Pega o Guanabara",
    artist: "Wesley Safadão & Alanzim Coreano",
    videoId: "uBc1wkTMywM",
    tag: "Forró No Talo 🚌",
  },
  {
    id: "bum-bum-tam-tam-fioti",
    title: "Bum Bum Tam Tam",
    artist: "MC Fioti",
    videoId: "_P7S2lKif-A",
    tag: "Hit Mundial 🌍",
  },
  {
    id: "solteiro-forcado-ana",
    title: "Solteiro Forçado",
    artist: "Ana Castela",
    videoId: "f58W_FVXBLg",
    tag: "Sucesso Absoluto 🤠",
  },
  {
    id: "balanco-da-rede-matheus",
    title: "Balanço da Rede",
    artist: "Matheus Fernandes & Xand Avião",
    videoId: "vAM1xXdRnH0",
    tag: "Piseiro Animado 🌴",
  },
  {
    id: "vai-malandra-anitta",
    title: "Vai Malandra",
    artist: "Anitta & MC Zaac",
    videoId: "kDhptBT_-VI",
    tag: "Funk Global 🍑",
  },
  {
    id: "novo-balanco-veigh",
    title: "Novo Balanço",
    artist: "Veigh & Bvga Beatz",
    videoId: "fEUCYAd0KGM",
    tag: "Trap Brasil 💎",
  },
  {
    id: "abaixa-que-e-tiro-parangole",
    title: "Abaixa Que É Tiro",
    artist: "Parangolé",
    videoId: "bxEGolj7sb0",
    tag: "Swingaço 💥",
  },
];

// Retrocompatibilidade
export const PARTY_PLAYLIST = DEFAULT_PARTY_PLAYLIST;

/**
 * Utilitário para extrair ID do vídeo a partir de URL ou ID direto do YouTube
 */
export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return "";
  const trimmed = urlOrId.trim();

  // Caso já seja o ID de 11 caracteres
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Formato: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  // Formato: https://youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch && shortMatch[1]) {
    return shortMatch[1];
  }

  // Formato: https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1];
  }

  return trimmed;
}
