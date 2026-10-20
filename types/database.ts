export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "user" | "admin";
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type SeriesRow = {
  id: number;
  slug: string;
  name: string;
  created_at: string;
};

type DayRow = {
  id: number;
  series_id: number;
  day_number: number;
  title: string;
  subtitle: string | null;
  language: "te" | "en";
  published: boolean;
  cover_url: string | null;
  youtube_id: string | null;
  created_at: string;
};

type SectionRow = {
  id: string;
  day_id: number;
  section_order: number;
  title: string;
  content: Json;
  minutes: number | null;
  start_sec: number | null;
  updated_at: string;
  updated_by: string | null;
};

type ProgressRow = {
  user_id: string;
  day_number: number;
  language: "te" | "en";
  series_slug: string | null;
  section_id: string | null;
  section_order: number | null;
  spread_index: number;
  updated_at: string;
};

type HighlightRow = {
  id: string;
  user_id: string;
  day_number: number;
  section_id: string;
  selected_text: string;
  start_offset: number | null;
  end_offset: number | null;
  color: string;
  note_text: string | null;
  voice_note_url: string | null;
  created_at: string;
  updated_at: string;
};

type BookmarkRow = {
  id: string;
  user_id: string;
  day_number: number;
  section_id: string;
  label: string | null;
  created_at: string;
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      series: Table<
        SeriesRow,
        {
          id?: number;
          slug: string;
          name: string;
          created_at?: string;
        }
      >;
      profiles: Table<
        ProfileRow,
        {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: "user" | "admin";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      days: Table<
        DayRow,
        {
          id?: number;
          series_id: number;
          day_number: number;
          title: string;
          subtitle?: string | null;
          language?: "te" | "en";
          published?: boolean;
          cover_url?: string | null;
          youtube_id?: string | null;
          created_at?: string;
        }
      >;
      sections: Table<
        SectionRow,
        {
          id?: string;
          day_id: number;
          section_order: number;
          title: string;
          content: Json;
          minutes?: number | null;
          start_sec?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        }
      >;
      user_progress: Table<
        ProgressRow,
        {
          user_id: string;
          day_number: number;
          language?: "te" | "en";
          series_slug?: string | null;
          section_id?: string | null;
          section_order?: number | null;
          spread_index?: number;
          updated_at?: string;
        }
      >;
      highlights: Table<
        HighlightRow,
        {
          id?: string;
          user_id: string;
          day_number: number;
          section_id: string;
          selected_text: string;
          start_offset?: number | null;
          end_offset?: number | null;
          color?: string;
          note_text?: string | null;
          voice_note_url?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      bookmarks: Table<
        BookmarkRow,
        {
          id?: string;
          user_id: string;
          day_number: number;
          section_id: string;
          label?: string | null;
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
