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

export type Database = {
  public: {
    Tables: {
      battles: {
        Row: {
          id: string;
          slug: string;
          title: string;
          creator_id: string;
          status: "active" | "closed";
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          creator_id: string;
          status?: "active" | "closed";
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          creator_id?: string;
          status?: "active" | "closed";
          created_at?: string;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "battle_options_battle_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "battle_options";
            referencedColumns: ["battle_id"];
          },
        ];
      };
      battle_options: {
        Row: {
          id: string;
          battle_id: string;
          label: string;
          image_path: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          battle_id: string;
          label: string;
          image_path?: string | null;
          position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          battle_id?: string;
          label?: string;
          image_path?: string | null;
          position?: number;
          created_at?: string;
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
      votes: {
        Row: {
          id: string;
          battle_id: string;
          option_id: string;
          voter_token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          battle_id: string;
          option_id: string;
          voter_token: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          battle_id?: string;
          option_id?: string;
          voter_token?: string;
          created_at?: string;
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
    Views: Record<string, never>;
    Functions: {
      cast_vote: {
        Args: {
          p_battle_id: string;
          p_option_id: string;
          p_voter_token: string;
        };
        Returns: {
          success: boolean;
          error?: string;
          already_voted?: boolean;
        };
      };
      get_battle_results: {
        Args: {
          p_battle_id: string;
        };
        Returns: BattleResult[];
      };
      count_active_battles: {
        Args: {
          p_creator_id: string;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Battle = Database["public"]["Tables"]["battles"]["Row"];
export type BattleOption = Database["public"]["Tables"]["battle_options"]["Row"];
export type Vote = Database["public"]["Tables"]["votes"]["Row"];

export type BattleWithOptions = Battle & {
  battle_options: BattleOption[];
};

export type FeedBattle = Battle & {
  battle_options: BattleOption[];
  total_votes: number;
};
