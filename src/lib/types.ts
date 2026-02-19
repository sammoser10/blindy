export type SessionStatus = "lobby" | "tasting" | "revealed";

export type GuessField = "grape" | "wine_type" | "region" | "producer" | "vintage";

export const GUESS_FIELD_LABELS: Record<GuessField, string> = {
  grape: "Grape / Varietal",
  wine_type: "Wine Type",
  region: "Region",
  producer: "Producer",
  vintage: "Vintage",
};

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  host_id: string;
  name: string;
  join_code: string;
  wine_count: number;
  guess_fields: GuessField[];
  status: SessionStatus;
  created_at: string;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
  profiles?: Profile;
}

export interface Wine {
  id: string;
  session_id: string;
  wine_number: number;
  name: string | null;
  grape: string | null;
  wine_type: string | null;
  region: string | null;
  producer: string | null;
  vintage: number | null;
}

export interface TastingEntry {
  id: string;
  session_id: string;
  user_id: string;
  wine_number: number;
  appearance_notes: string;
  nose_notes: string;
  palate_notes: string;
  overall_notes: string;
  guess_grape: string;
  guess_wine_type: string;
  guess_region: string;
  guess_producer: string;
  guess_vintage: number | null;
  rating: number | null;
  ranking: number | null;
  created_at: string;
  updated_at: string;
}

export interface SessionWithParticipants extends Session {
  participants: (SessionParticipant & { profiles: Profile })[];
  host: Profile;
}
