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
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'student' | 'teacher' | 'admin'
          student_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'student' | 'teacher' | 'admin'
          student_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'student' | 'teacher' | 'admin'
          student_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          capacity: number
          location: string
          facilities: string[]
          is_available: boolean
          restricted_hours: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          capacity: number
          location: string
          facilities?: string[]
          is_available?: boolean
          restricted_hours?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          capacity?: number
          location?: string
          facilities?: string[]
          is_available?: boolean
          restricted_hours?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          user_id: string
          room_id: string
          start_time: string
          end_time: string
          purpose: string
          status: 'pending' | 'confirmed' | 'rejected'
          attendees: string[]
          rejection_reason: string | null
          approved_by: string | null
          rejected_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          room_id: string
          start_time: string
          end_time: string
          purpose: string
          status?: 'pending' | 'confirmed' | 'rejected'
          attendees?: string[]
          rejection_reason?: string | null
          approved_by?: string | null
          rejected_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          room_id?: string
          start_time?: string
          end_time?: string
          purpose?: string
          status?: 'pending' | 'confirmed' | 'rejected'
          attendees?: string[]
          rejection_reason?: string | null
          approved_by?: string | null
          rejected_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reservations_archive: {
        Row: {
          id: string
          original_id: string
          user_id: string
          room_id: string
          start_time: string
          end_time: string
          purpose: string
          status: 'pending' | 'confirmed' | 'rejected'
          attendees: string[]
          approved_by: string | null
          rejected_by: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
          archived_at: string
        }
        Insert: {
          id?: string
          original_id: string
          user_id: string
          room_id: string
          start_time: string
          end_time: string
          purpose: string
          status?: 'pending' | 'confirmed' | 'rejected'
          attendees?: string[]
          approved_by?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          created_at: string
          updated_at: string
          archived_at?: string
        }
        Update: {
          id?: string
          original_id?: string
          user_id?: string
          room_id?: string
          start_time?: string
          end_time?: string
          purpose?: string
          status?: 'pending' | 'confirmed' | 'rejected'
          attendees?: string[]
          approved_by?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_old_reservations: {
        Args: Record<PropertyKey, never>
        Returns: {
          archived_count: number
          deleted_count: number
        }[]
      }
    }
    Enums: {
      user_role: 'student' | 'teacher' | 'admin'
      reservation_status: 'pending' | 'confirmed' | 'rejected'
    }
  }
}

// 편의를 위한 타입 별칭
export type User = Database['public']['Tables']['users']['Row']
export type Room = Database['public']['Tables']['rooms']['Row']
export type Reservation = Database['public']['Tables']['reservations']['Row']

export type UserInsert = Database['public']['Tables']['users']['Insert']
export type RoomInsert = Database['public']['Tables']['rooms']['Insert']
export type ReservationInsert = Database['public']['Tables']['reservations']['Insert']

export type UserUpdate = Database['public']['Tables']['users']['Update']
export type RoomUpdate = Database['public']['Tables']['rooms']['Update']
export type ReservationUpdate = Database['public']['Tables']['reservations']['Update']

