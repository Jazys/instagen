export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          email: string
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          email: string
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          email?: string
        }
      }
      user_quotas: {
        Row: {
          user_id: string
          credits_remaining: number
          last_reset_date: string
          next_reset_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          credits_remaining?: number
          last_reset_date?: string
          next_reset_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          credits_remaining?: number
          last_reset_date?: string
          next_reset_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      credits_usage_logs: {
        Row: {
          id: string
          user_id: string
          action_type: string
          credits_used: number
          credits_remaining: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action_type: string
          credits_used: number
          credits_remaining: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action_type?: string
          credits_used?: number
          credits_remaining?: number
          created_at?: string
        }
      }
    }
    Functions: {
      use_credits: {
        Args: {
          p_user_id: string
          p_action_type: string
          p_credits_to_use: number
        }
        Returns: Json
      }
    }
  }
} 