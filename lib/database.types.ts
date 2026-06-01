import type { BattleCategory } from "@/lib/categories";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BattleResult = {
  option_id: string;
  position: number;
  label: string;
  image_path: string | null;
  vote_count: number;
};

export type FeedBattleRow = {
  id: string;
  slug: string;
  title: string;
  creator_id: string;
  status: "active" | "closed";
  category: BattleCategory;
  created_at: string;
  expires_at: string | null;
  total_votes: number;
  battle_options: {
    id: string;
    battle_id: string;
    label: string;
    image_path: string | null;
    position: number;
    created_at: string;
  }[];
  results: BattleResult[];
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      battle_options: {
        Row: {
          battle_id: string;
          created_at: string;
          id: string;
          image_path: string | null;
          label: string;
          position: number;
        };
        Insert: {
          battle_id: string;
          created_at?: string;
          id?: string;
          image_path?: string | null;
          label: string;
          position: number;
        };
        Update: {
          battle_id?: string;
          created_at?: string;
          id?: string;
          image_path?: string | null;
          label?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "battle_options_battle_id_fkey";
            columns: ["battle_id"];
            isOneToOne: false;
            referencedRelation: "battles";
            referencedColumns: ["id"];
          },
        ];
      };
      battle_reports: {
        Row: {
          battle_id: string;
          created_at: string;
          id: string;
          reason: string;
          resolved_at: string | null;
        };
        Insert: {
          battle_id: string;
          created_at?: string;
          id?: string;
          reason: string;
          resolved_at?: string | null;
        };
        Update: {
          battle_id?: string;
          created_at?: string;
          id?: string;
          reason?: string;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "battle_reports_battle_id_fkey";
            columns: ["battle_id"];
            isOneToOne: false;
            referencedRelation: "battles";
            referencedColumns: ["id"];
          },
        ];
      };
      battle_slug_redirects: {
        Row: {
          battle_id: string;
          old_slug: string;
        };
        Insert: {
          battle_id: string;
          old_slug: string;
        };
        Update: {
          battle_id?: string;
          old_slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "battle_slug_redirects_battle_id_fkey";
            columns: ["battle_id"];
            isOneToOne: false;
            referencedRelation: "battles";
            referencedColumns: ["id"];
          },
        ];
      };
      battles: {
        Row: {
          category: BattleCategory;
          created_at: string;
          creator_id: string;
          expires_at: string | null;
          id: string;
          slug: string;
          status: "active" | "closed";
          title: string;
        };
        Insert: {
          category?: BattleCategory;
          created_at?: string;
          creator_id: string;
          expires_at?: string | null;
          id?: string;
          slug: string;
          status?: "active" | "closed";
          title: string;
        };
        Update: {
          category?: BattleCategory;
          created_at?: string;
          creator_id?: string;
          expires_at?: string | null;
          id?: string;
          slug?: string;
          status?: "active" | "closed";
          title?: string;
        };
        Relationships: [];
      };
      featured_battles: {
        Row: {
          battle_id: string;
          featured_date: string;
        };
        Insert: {
          battle_id: string;
          featured_date: string;
        };
        Update: {
          battle_id?: string;
          featured_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "featured_battles_battle_id_fkey";
            columns: ["battle_id"];
            isOneToOne: false;
            referencedRelation: "battles";
            referencedColumns: ["id"];
          },
        ];
      };
      reward_grants: {
        Row: {
          created_at: string;
          id: string;
          user_id: string;
          vote_id: string;
          xp_awarded: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          user_id: string;
          vote_id: string;
          xp_awarded: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          user_id?: string;
          vote_id?: string;
          xp_awarded?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reward_grants_vote_id_fkey";
            columns: ["vote_id"];
            isOneToOne: true;
            referencedRelation: "votes";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          ends_at: string;
          id: string;
          name: string;
          starts_at: string;
        };
        Insert: {
          ends_at: string;
          id?: string;
          name: string;
          starts_at: string;
        };
        Update: {
          ends_at?: string;
          id?: string;
          name?: string;
          starts_at?: string;
        };
        Relationships: [];
      };
      party_players: {
        Row: {
          is_host: boolean;
          joined_at: string;
          last_reaction_at: string | null;
          last_seen_at: string;
          rerolls_used: number;
          room_id: string;
          score: number;
          user_id: string;
        };
        Insert: {
          is_host?: boolean;
          joined_at?: string;
          last_reaction_at?: string | null;
          last_seen_at?: string;
          rerolls_used?: number;
          room_id: string;
          score?: number;
          user_id: string;
        };
        Update: {
          is_host?: boolean;
          joined_at?: string;
          last_reaction_at?: string | null;
          last_seen_at?: string;
          rerolls_used?: number;
          room_id?: string;
          score?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      party_reactions: {
        Row: {
          created_at: string;
          id: string;
          reaction_key: string;
          room_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reaction_key: string;
          room_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reaction_key?: string;
          room_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      party_rooms: {
        Row: {
          canvas_editor_enabled: boolean;
          caption_count: number;
          caption_duration_seconds: number;
          code: string;
          created_at: string;
          current_round: number;
          host_id: string;
          id: string;
          phase: string;
          phase_ends_at: string | null;
          phase_seed: number | null;
          rerolls_per_player: number;
          round_count: number;
          status: string;
          template_id: string | null;
          used_template_ids: string[];
          votes_cast_count: number;
        };
        Insert: {
          canvas_editor_enabled?: boolean;
          caption_count?: number;
          caption_duration_seconds?: number;
          code: string;
          created_at?: string;
          current_round?: number;
          host_id: string;
          id?: string;
          phase?: string;
          phase_ends_at?: string | null;
          phase_seed?: number | null;
          rerolls_per_player?: number;
          round_count?: number;
          status?: string;
          template_id?: string | null;
          used_template_ids?: string[];
          votes_cast_count?: number;
        };
        Update: {
          canvas_editor_enabled?: boolean;
          caption_count?: number;
          caption_duration_seconds?: number;
          code?: string;
          created_at?: string;
          current_round?: number;
          host_id?: string;
          id?: string;
          phase?: string;
          phase_ends_at?: string | null;
          phase_seed?: number | null;
          rerolls_per_player?: number;
          round_count?: number;
          status?: string;
          template_id?: string | null;
          used_template_ids?: string[];
          votes_cast_count?: number;
        };
        Relationships: [];
      };
      party_player_rounds: {
        Row: {
          caption_draft: Json | null;
          layout_revision: number;
          room_id: string;
          round: number;
          template_id: string;
          user_id: string;
        };
        Insert: {
          caption_draft?: Json | null;
          layout_revision?: number;
          room_id: string;
          round: number;
          template_id: string;
          user_id: string;
        };
        Update: {
          caption_draft?: Json | null;
          layout_revision?: number;
          room_id?: string;
          round?: number;
          template_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      party_round_results: {
        Row: {
          room_id: string;
          round: number;
          submission_id: string;
          vote_count: number;
        };
        Insert: {
          room_id: string;
          round: number;
          submission_id: string;
          vote_count?: number;
        };
        Update: {
          room_id?: string;
          round?: number;
          submission_id?: string;
          vote_count?: number;
        };
        Relationships: [];
      };
      party_submissions: {
        Row: {
          caption: string;
          caption_rich: unknown | null;
          created_at: string;
          id: string;
          room_id: string;
          round: number;
          template_id: string | null;
          user_id: string;
        };
        Insert: {
          caption: string;
          caption_rich?: unknown | null;
          created_at?: string;
          id?: string;
          room_id: string;
          round: number;
          template_id?: string | null;
          user_id: string;
        };
        Update: {
          caption?: string;
          caption_rich?: unknown | null;
          created_at?: string;
          id?: string;
          room_id?: string;
          round?: number;
          template_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      party_templates: {
        Row: {
          active: boolean;
          id: string;
          image_path: string;
          sort_order: number;
          text_boxes: unknown;
        };
        Insert: {
          active?: boolean;
          id?: string;
          image_path: string;
          sort_order?: number;
          text_boxes?: unknown;
        };
        Update: {
          active?: boolean;
          id?: string;
          image_path?: string;
          sort_order?: number;
          text_boxes?: unknown;
        };
        Relationships: [];
      };
      party_votes: {
        Row: {
          created_at: string;
          room_id: string;
          round: number;
          submission_id: string;
          voter_id: string;
        };
        Insert: {
          created_at?: string;
          room_id: string;
          round: number;
          submission_id: string;
          voter_id: string;
        };
        Update: {
          created_at?: string;
          room_id?: string;
          round?: number;
          submission_id?: string;
          voter_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          handle: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          handle: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          handle?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          badge_key: string;
          earned_at: string;
          user_id: string;
        };
        Insert: {
          badge_key: string;
          earned_at?: string;
          user_id: string;
        };
        Update: {
          badge_key?: string;
          earned_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_progress: {
        Row: {
          current_streak: number;
          last_rewarded_vote_date: string | null;
          longest_streak: number;
          season_id: string;
          season_vote_count: number;
          underdog_count: number;
          user_id: string;
          xp: number;
        };
        Insert: {
          current_streak?: number;
          last_rewarded_vote_date?: string | null;
          longest_streak?: number;
          season_id: string;
          season_vote_count?: number;
          underdog_count?: number;
          user_id: string;
          xp?: number;
        };
        Update: {
          current_streak?: number;
          last_rewarded_vote_date?: string | null;
          longest_streak?: number;
          season_id?: string;
          season_vote_count?: number;
          underdog_count?: number;
          user_id?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: "user_progress_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      votes: {
        Row: {
          battle_id: string;
          created_at: string;
          id: string;
          ip_hash: string | null;
          option_id: string;
          user_side_pct: number | null;
          voter_token: string;
        };
        Insert: {
          battle_id: string;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          option_id: string;
          user_side_pct?: number | null;
          voter_token: string;
        };
        Update: {
          battle_id?: string;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          option_id?: string;
          user_side_pct?: number | null;
          voter_token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_battle_id_fkey";
            columns: ["battle_id"];
            isOneToOne: false;
            referencedRelation: "battles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_option_id_fkey";
            columns: ["option_id"];
            isOneToOne: false;
            referencedRelation: "battle_options";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cast_vote: {
        Args: {
          p_battle_id: string;
          p_option_id: string;
          p_voter_token: string;
          p_ip_hash?: string | null;
          p_user_side_pct?: number | null;
        };
        Returns: {
          success: boolean;
          error?: string;
          already_voted?: boolean;
          vote_id?: string;
        };
      };
      claim_pending_reward_by_ip: {
        Args: {
          p_user_id: string;
          p_ip_hash: string;
        };
        Returns: {
          granted: boolean;
          success?: boolean;
          already_granted?: boolean;
          xp_awarded?: number;
          badges_earned?: string[];
          current_streak?: number;
          total_xp?: number;
          error?: string;
        };
      };
      count_active_battles: {
        Args: {
          p_creator_id: string;
        };
        Returns: number;
      };
      get_battle_results: {
        Args: {
          p_battle_id: string;
        };
        Returns: BattleResult[];
      };
      get_feed_with_results: {
        Args: {
          p_limit?: number;
          p_category?: string;
          p_sort?: string;
        };
        Returns: FeedBattleRow[];
      };
      grant_reward_for_vote: {
        Args: {
          p_user_id: string;
          p_vote_id: string;
          p_is_featured?: boolean;
        };
        Returns: {
          success: boolean;
          already_granted?: boolean;
          xp_awarded?: number;
          badges_earned?: string[];
          current_streak?: number;
          total_xp?: number;
          error?: string;
        };
      };
      party_advance_phase: {
        Args: { p_room_id: string };
        Returns: Record<string, unknown>;
      };
      party_cast_vote: {
        Args: { p_room_id: string; p_submission_id: string };
        Returns: Record<string, unknown>;
      };
      party_create_room: {
        Args: {
          p_round_count?: number;
          p_rerolls_per_player?: number;
          p_canvas_editor_enabled?: boolean;
        };
        Returns: Record<string, unknown>;
      };
      party_sync_caption_draft: {
        Args: {
          p_room_id: string;
          p_draft: Json;
          p_layout_revision: number;
        };
        Returns: Record<string, unknown>;
      };
      party_get_my_vote: {
        Args: { p_room_id: string };
        Returns: Record<string, unknown>;
      };
      upsert_profile: {
        Args: { p_handle: string; p_avatar_url: string };
        Returns: Record<string, unknown>;
      };
      party_heartbeat: {
        Args: { p_room_id: string };
        Returns: Record<string, unknown>;
      };
      party_join_room: {
        Args: { p_code: string };
        Returns: Record<string, unknown>;
      };
      party_leave_room: {
        Args: { p_room_id: string };
        Returns: Record<string, unknown>;
      };
      party_retract_caption: {
        Args: { p_room_id: string };
        Returns: Record<string, unknown>;
      };
      party_retract_vote: {
        Args: { p_room_id: string };
        Returns: Record<string, unknown>;
      };
      party_reroll_template: {
        Args: { p_room_id: string };
        Returns: Record<string, unknown>;
      };
      party_send_reaction: {
        Args: { p_room_id: string; p_reaction_key: string };
        Returns: Record<string, unknown>;
      };
      party_start_game: {
        Args: { p_room_id: string };
        Returns: Record<string, unknown>;
      };
      party_submit_caption: {
        Args: {
          p_room_id: string;
          p_caption: string;
          p_caption_rich?: unknown | null;
        };
        Returns: Record<string, unknown>;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

export type Battle = Database["public"]["Tables"]["battles"]["Row"];
export type BattleOption = Database["public"]["Tables"]["battle_options"]["Row"];
export type Vote = Database["public"]["Tables"]["votes"]["Row"];
export type Season = Database["public"]["Tables"]["seasons"]["Row"];
export type UserProgress = Database["public"]["Tables"]["user_progress"]["Row"];
export type UserBadge = Database["public"]["Tables"]["user_badges"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type RewardGrant = Database["public"]["Tables"]["reward_grants"]["Row"];
export type FeaturedBattle = Database["public"]["Tables"]["featured_battles"]["Row"];

export type BattleWithOptions = Battle & {
  battle_options: BattleOption[];
};

export type FeedBattle = Battle & {
  battle_options: BattleOption[];
  total_votes: number;
  results: BattleResult[];
};
