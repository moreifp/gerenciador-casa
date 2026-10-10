export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          file_name: string
          file_url: string
          id: string
          label: string | null
          uploaded_by: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          label?: string | null
          uploaded_by: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          label?: string | null
          uploaded_by?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_reports: {
        Row: {
          admin_comment: string | null
          amount_received: number | null
          amount_spent: number | null
          change_amount: number | null
          created_at: string
          credit_card: Database["public"]["Enums"]["credit_card_type"] | null
          description: string | null
          expense_type: Database["public"]["Enums"]["expense_type"]
          id: string
          ocr_raw_text: string | null
          receipt_date: string | null
          receipt_photo_urls: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["expense_status"]
          updated_at: string
          user_id: string
          vendor_name: string | null
        }
        Insert: {
          admin_comment?: string | null
          amount_received?: number | null
          amount_spent?: number | null
          change_amount?: number | null
          created_at?: string
          credit_card?: Database["public"]["Enums"]["credit_card_type"] | null
          description?: string | null
          expense_type?: Database["public"]["Enums"]["expense_type"]
          id?: string
          ocr_raw_text?: string | null
          receipt_date?: string | null
          receipt_photo_urls?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
          user_id: string
          vendor_name?: string | null
        }
        Update: {
          admin_comment?: string | null
          amount_received?: number | null
          amount_spent?: number | null
          change_amount?: number | null
          created_at?: string
          credit_card?: Database["public"]["Enums"]["credit_card_type"] | null
          description?: string | null
          expense_type?: Database["public"]["Enums"]["expense_type"]
          id?: string
          ocr_raw_text?: string | null
          receipt_date?: string | null
          receipt_photo_urls?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
          user_id?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          used?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          admission_date: string | null
          bank_details: Json | null
          cpf: string | null
          created_at: string
          documents: Json | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          id: string
          initials: string | null
          phone: string | null
          photo_url: string | null
          role_title: string | null
        }
        Insert: {
          address?: string | null
          admission_date?: string | null
          bank_details?: Json | null
          cpf?: string | null
          created_at?: string
          documents?: Json | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          id: string
          initials?: string | null
          phone?: string | null
          photo_url?: string | null
          role_title?: string | null
        }
        Update: {
          address?: string | null
          admission_date?: string | null
          bank_details?: Json | null
          cpf?: string | null
          created_at?: string
          documents?: Json | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          id?: string
          initials?: string | null
          phone?: string | null
          photo_url?: string | null
          role_title?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          completed_at: string
          completed_by: string | null
          created_at: string
          due_date: string | null
          id: string
          proof_id: string | null
          task_id: string
          undone_at: string | null
        }
        Insert: {
          completed_at?: string
          completed_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          proof_id?: string | null
          task_id: string
          undone_at?: string | null
        }
        Update: {
          completed_at?: string
          completed_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          proof_id?: string | null
          task_id?: string
          undone_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_proof_id_fkey"
            columns: ["proof_id"]
            isOneToOne: false
            referencedRelation: "task_proofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_feedback: {
        Row: {
          action: Database["public"]["Enums"]["feedback_action"]
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          proof_id: string | null
          task_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["feedback_action"]
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          proof_id?: string | null
          task_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["feedback_action"]
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          proof_id?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_feedback_proof_id_fkey"
            columns: ["proof_id"]
            isOneToOne: false
            referencedRelation: "task_proofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_feedback_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_proofs: {
        Row: {
          audio_transcription: string | null
          audio_url: string | null
          comment: string | null
          created_at: string
          id: string
          kind: string
          photo_urls: string[] | null
          submitted_by: string | null
          task_id: string
        }
        Insert: {
          audio_transcription?: string | null
          audio_url?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          kind?: string
          photo_urls?: string[] | null
          submitted_by?: string | null
          task_id: string
        }
        Update: {
          audio_transcription?: string | null
          audio_url?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          kind?: string
          photo_urls?: string[] | null
          submitted_by?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_proofs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_replies: {
        Row: {
          audio_transcription: string | null
          audio_url: string | null
          created_at: string
          id: string
          image_url: string | null
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          suggested_status: string | null
          task_id: string | null
          text: string | null
          user_id: string
          zapi_message_id: string | null
        }
        Insert: {
          audio_transcription?: string | null
          audio_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          suggested_status?: string | null
          task_id?: string | null
          text?: string | null
          user_id: string
          zapi_message_id?: string | null
        }
        Update: {
          audio_transcription?: string | null
          audio_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          suggested_status?: string | null
          task_id?: string | null
          text?: string | null
          user_id?: string
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_replies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          cleared_at: string | null
          audio_transcription: string | null
          audio_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          image_urls: string[] | null
          is_archived: boolean
          is_shared: boolean
          priority: Database["public"]["Enums"]["task_priority"]
          recurrence_days: number[] | null
          recurrence_type: Database["public"]["Enums"]["recurrence_type"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          cleared_at?: string | null
          audio_transcription?: string | null
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          image_urls?: string[] | null
          is_archived?: boolean
          is_shared?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_days?: number[] | null
          recurrence_type?: Database["public"]["Enums"]["recurrence_type"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          cleared_at?: string | null
          audio_transcription?: string | null
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          image_urls?: string[] | null
          is_archived?: boolean
          is_shared?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_days?: number[] | null
          recurrence_type?: Database["public"]["Enums"]["recurrence_type"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          audio_url: string | null
          created_at: string
          error: string | null
          id: string
          image_url: string | null
          kind: string | null
          message: string
          phone: string
          ref_id: string | null
          scheduled_for: string | null
          status: string
          task_id: string | null
          user_id: string
          zapi_message_id: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          error?: string | null
          id?: string
          image_url?: string | null
          kind?: string | null
          message: string
          phone: string
          ref_id?: string | null
          scheduled_for?: string | null
          status?: string
          task_id?: string | null
          user_id: string
          zapi_message_id?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          error?: string | null
          id?: string
          image_url?: string | null
          kind?: string | null
          message?: string
          phone?: string
          ref_id?: string | null
          scheduled_for?: string | null
          status?: string
          task_id?: string | null
          user_id?: string
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_unmatched: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      call_send_whatsapp: { Args: { _payload: Json }; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "employee"
      credit_card_type: "hipercard" | "pao_de_acucar" | "nubank" | "c6"
      document_category:
        | "rg"
        | "cnh"
        | "ctps"
        | "contrato"
        | "atestado"
        | "comprovante_residencia"
        | "certidao"
        | "outro"
      expense_status: "pending" | "approved" | "rejected"
      expense_type: "reimbursement" | "company_money"
      feedback_action: "approved" | "reopened"
      invitation_status: "pending" | "accepted" | "expired"
      recurrence_type: "none" | "daily" | "weekly" | "monthly" | "custom"
      task_priority: "low" | "medium" | "high"
      task_status: "pending" | "in_progress" | "completed" | "blocked"
      task_type: "routine" | "one_off"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "employee"],
      credit_card_type: ["hipercard", "pao_de_acucar", "nubank", "c6"],
      document_category: [
        "rg",
        "cnh",
        "ctps",
        "contrato",
        "atestado",
        "comprovante_residencia",
        "certidao",
        "outro",
      ],
      expense_status: ["pending", "approved", "rejected"],
      expense_type: ["reimbursement", "company_money"],
      feedback_action: ["approved", "reopened"],
      invitation_status: ["pending", "accepted", "expired"],
      recurrence_type: ["none", "daily", "weekly", "monthly", "custom"],
      task_priority: ["low", "medium", "high"],
      task_status: ["pending", "in_progress", "completed", "blocked"],
      task_type: ["routine", "one_off"],
    },
  },
} as const
