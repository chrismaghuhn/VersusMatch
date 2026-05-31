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
