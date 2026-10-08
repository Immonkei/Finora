export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TxType = "expense" | "income" | "transfer";
export type RecurringFrequency = "daily" | "weekly" | "monthly";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          main_currency: string;
          timezone: string;
          week_starts_on: number;
          reminder_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          main_currency?: string;
          timezone?: string;
          week_starts_on?: number;
          reminder_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          main_currency?: string;
          timezone?: string;
          week_starts_on?: number;
          reminder_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          currency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          currency?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          icon: string | null;
          monthly_budget: number | null;
          rollover: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          color?: string | null;
          icon?: string | null;
          monthly_budget?: number | null;
          rollover?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string | null;
          icon?: string | null;
          monthly_budget?: number | null;
          rollover?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: TxType;
          amount: number;
          currency: string;
          exchange_rate: number;
          base_amount: number;
          account_id: string;
          to_account_id: string | null;
          category_id: string | null;
          note: string | null;
          occurred_at: string;
          recurring_id: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: TxType;
          amount: number;
          currency: string;
          exchange_rate?: number;
          base_amount: number;
          account_id: string;
          to_account_id?: string | null;
          category_id?: string | null;
          note?: string | null;
          occurred_at?: string;
          recurring_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: TxType;
          amount?: number;
          currency?: string;
          exchange_rate?: number;
          base_amount?: number;
          account_id?: string;
          to_account_id?: string | null;
          category_id?: string | null;
          note?: string | null;
          occurred_at?: string;
          recurring_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey";
            columns: ["to_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          total_limit: number;
        };
        Insert: {
          id?: string;
          user_id?: string;
          month: string;
          total_limit: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          total_limit?: number;
        };
        Relationships: [];
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          saved_amount: number;
          deadline: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          target_amount: number;
          saved_amount?: number;
          deadline?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target_amount?: number;
          saved_amount?: number;
          deadline?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      recurring_rules: {
        Row: {
          id: string;
          user_id: string;
          type: TxType;
          amount: number;
          currency: string;
          account_id: string;
          category_id: string | null;
          note: string | null;
          frequency: RecurringFrequency;
          start_date: string;
          end_date: string | null;
          next_run: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          type: TxType;
          amount: number;
          currency: string;
          account_id: string;
          category_id?: string | null;
          note?: string | null;
          frequency: RecurringFrequency;
          start_date: string;
          end_date?: string | null;
          next_run: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: TxType;
          amount?: number;
          currency?: string;
          account_id?: string;
          category_id?: string | null;
          note?: string | null;
          frequency?: RecurringFrequency;
          start_date?: string;
          end_date?: string | null;
          next_run?: string;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          message: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          kind: string;
          message: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: string;
          message?: string;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      exchange_rates: {
        Row: {
          id: string;
          from_currency: string;
          to_currency: string;
          rate: number;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_currency: string;
          to_currency: string;
          rate: number;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          from_currency?: string;
          to_currency?: string;
          rate?: number;
          date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      spending_by_category: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: {
          category_id: string | null;
          category_name: string;
          category_color: string | null;
          category_icon: string | null;
          total: number;
        }[];
      };
      spending_by_day: {
        Args: {
          p_from: string;
          p_to: string;
          p_tz?: string;
        };
        Returns: {
          day: string;
          total: number;
        }[];
      };
      top_small_expenses: {
        Args: {
          p_from: string;
          p_to: string;
          p_threshold_minor?: number;
        };
        Returns: {
          note: string;
          occurred_at: string;
          total: number;
        }[];
      };
    };
    Enums: {
      tx_type: TxType;
      recurring_frequency: RecurringFrequency;
    };
    CompositeTypes: Record<string, never>;
  };
};
