import { createClient } from "@supabase/supabase-js";

export interface KaraokeQueueItem {
  id: string;
  session_id?: string | null;
  video_id: string;
  title: string;
  singer_name: string;
  singer_tag?: string | null;
  status: "pending" | "playing" | "finished";
  is_priority: boolean;
  positive_votes: number;
  tomatoes: number;
  created_at: string;
}

export interface KaraokeEvent {
  id: string;
  session_id?: string | null;
  type: "emoji" | "sound" | "fofoca" | "skip_vote";
  payload: string;
  created_at: string;
}

export interface KaraokeSession {
  id: string;
  name: string;
  started_at: string;
  ended_at?: string | null;
  total_songs: number;
  total_reactions: number;
  champion_name?: string | null;
  champion_song?: string | null;
  champion_votes: number;
  most_canceled_name?: string | null;
  most_canceled_tomatoes: number;
  notes?: string | null;
  created_at: string;
}

export interface KaraokeReaction {
  id: string;
  queue_id: string;
  voter_name: string;
  reaction_type: "heart" | "fire" | "clap" | "tomato";
  created_at: string;
}

export interface KaraokeGossip {
  id: string;
  session_id?: string | null;
  author: string;
  text: string;
  likes: number;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface SingerStats {
  singer_name: string;
  total_songs_sung: number;
  total_positive_votes: number;
  total_tomatoes: number;
  avg_votes_per_song: number;
  overall_approval_percent: number;
}

export interface KaraokePartySong {
  id: string;
  video_id: string;
  title: string;
  artist: string;
  tag?: string | null;
  sort_order: number;
  created_at: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = () => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes("your-project") &&
    !supabaseAnonKey.includes("your-anon-key")
  );
};

// Instância única do Supabase Client para Realtime
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    realtime: {
      params: {
        eventsPerSecond: 40,
      },
    },
  }
);
