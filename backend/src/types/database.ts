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
      accounting_settings: {
        Row: {
          account_id: string | null
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          account_id?: string | null
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          account_id?: string | null
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_postable: boolean
          name: string
          parent_id: string | null
          subtype: Database["public"]["Enums"]["account_subtype"]
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_postable?: boolean
          name: string
          parent_id?: string | null
          subtype: Database["public"]["Enums"]["account_subtype"]
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_postable?: boolean
          name?: string
          parent_id?: string | null
          subtype?: Database["public"]["Enums"]["account_subtype"]
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          created_at: string
          entity: Database["public"]["Enums"]["entity_type"]
          entity_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: Database["public"]["Enums"]["entity_type"]
          entity_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: Database["public"]["Enums"]["entity_type"]
          entity_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_snapshots: {
        Row: {
          amount: number
          as_of: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          amount: number
          as_of: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          as_of?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_budgets: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          id: string
          period: string
          planned_amount: number
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          id?: string
          period: string
          planned_amount: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          id?: string
          period?: string
          planned_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string
          document_number: string | null
          due_date: string | null
          expense_account_id: string | null
          id: string
          paid_from_account_id: string | null
          partner_id: string | null
          posted_at: string | null
          posted_by: string | null
          project_id: string | null
          spent_on: string
          status: Database["public"]["Enums"]["expense_status"]
          updated_at: string
          voided_at: string | null
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description: string
          document_number?: string | null
          due_date?: string | null
          expense_account_id?: string | null
          id?: string
          paid_from_account_id?: string | null
          partner_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          project_id?: string | null
          spent_on: string
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
          voided_at?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string
          document_number?: string | null
          due_date?: string | null
          expense_account_id?: string | null
          id?: string
          paid_from_account_id?: string | null
          partner_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          project_id?: string | null
          spent_on?: string
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_from_account_id_fkey"
            columns: ["paid_from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_periods: {
        Row: {
          created_at: string
          id: string
          period: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          period: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          period?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          description: string | null
          due_date: string
          id: string
          invoice_number: string
          issued_date: string
          paid_date: string | null
          partner_id: string
          project_id: string
          tax_amount: number
          updated_at: string
          voided_at: string | null
          withheld_amount: number
        }
        Insert: {
          amount: number
          amount_paid?: number
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          invoice_number: string
          issued_date: string
          paid_date?: string | null
          partner_id: string
          project_id: string
          tax_amount?: number
          updated_at?: string
          voided_at?: string | null
          withheld_amount?: number
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          issued_date?: string
          paid_date?: string | null
          partner_id?: string
          project_id?: string
          tax_amount?: number
          updated_at?: string
          voided_at?: string | null
          withheld_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          accounting_date: string
          created_at: string
          created_by: string
          description: string
          entry_number: string
          id: string
          journal_id: string
          posted_at: string | null
          posted_by: string | null
          reference: string | null
          reversal_of_id: string | null
          source_id: string | null
          source_type: Database["public"]["Enums"]["entry_source"]
          status: Database["public"]["Enums"]["entry_status"]
          updated_at: string
        }
        Insert: {
          accounting_date: string
          created_at?: string
          created_by: string
          description: string
          entry_number: string
          id?: string
          journal_id: string
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          reversal_of_id?: string | null
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["entry_source"]
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
        }
        Update: {
          accounting_date?: string
          created_at?: string
          created_by?: string
          description?: string
          entry_number?: string
          id?: string
          journal_id?: string
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          reversal_of_id?: string | null
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["entry_source"]
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_of_id_fkey"
            columns: ["reversal_of_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          credit: number
          debit: number
          description: string | null
          id: string
          journal_entry_id: string
          line_no: number
          partner_id: string | null
          project_id: string | null
        }
        Insert: {
          account_id: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id: string
          line_no: number
          partner_id?: string | null
          project_id?: string | null
        }
        Update: {
          account_id?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
          line_no?: number
          partner_id?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      journals: {
        Row: {
          code: string
          created_at: string
          default_account_id: string | null
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["journal_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_account_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          type: Database["public"]["Enums"]["journal_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_account_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["journal_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journals_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string
          created_by: string
          id: string
          loan_id: string
          txn_date: string
          type: Database["public"]["Enums"]["loan_txn_type"]
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          loan_id: string
          txn_date: string
          type: Database["public"]["Enums"]["loan_txn_type"]
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          loan_id?: string
          txn_date?: string
          type?: Database["public"]["Enums"]["loan_txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "loan_transactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          created_at: string
          id: string
          interest_rate_pct: number | null
          lender_partner_id: string
          liability_account_id: string
          maturity_date: string | null
          principal_amount: number
          reference: string
          start_date: string
          status: Database["public"]["Enums"]["loan_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_rate_pct?: number | null
          lender_partner_id: string
          liability_account_id: string
          maturity_date?: string | null
          principal_amount: number
          reference: string
          start_date: string
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_rate_pct?: number | null
          lender_partner_id?: string
          liability_account_id?: string
          maturity_date?: string | null
          principal_amount?: number
          reference?: string
          start_date?: string
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_lender_partner_id_fkey"
            columns: ["lender_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_liability_account_id_fkey"
            columns: ["liability_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          entity: Database["public"]["Enums"]["entity_type"]
          entity_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          entity: Database["public"]["Enums"]["entity_type"]
          entity_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          entity?: Database["public"]["Enums"]["entity_type"]
          entity_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          client_type: Database["public"]["Enums"]["client_type"] | null
          created_at: string
          id: string
          is_active: boolean
          is_customer: boolean
          is_employee: boolean
          is_lender: boolean
          is_vendor: boolean
          name: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          client_type?: Database["public"]["Enums"]["client_type"] | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_customer?: boolean
          is_employee?: boolean
          is_lender?: boolean
          is_vendor?: boolean
          name: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          client_type?: Database["public"]["Enums"]["client_type"] | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_customer?: boolean
          is_employee?: boolean
          is_lender?: boolean
          is_vendor?: boolean
          name?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_allocations: {
        Row: {
          amount: number
          created_at: string
          expense_id: string | null
          id: string
          invoice_id: string | null
          payment_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expense_id?: string | null
          id?: string
          invoice_id?: string | null
          payment_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expense_id?: string | null
          id?: string
          invoice_id?: string | null
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_account_id: string
          created_at: string
          created_by: string
          direction: Database["public"]["Enums"]["payment_direction"]
          id: string
          journal_id: string
          memo: string | null
          partner_id: string
          payment_date: string
          payment_number: string
          updated_at: string
          voided_at: string | null
        }
        Insert: {
          amount: number
          bank_account_id: string
          created_at?: string
          created_by: string
          direction: Database["public"]["Enums"]["payment_direction"]
          id?: string
          journal_id: string
          memo?: string | null
          partner_id: string
          payment_date: string
          payment_number: string
          updated_at?: string
          voided_at?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string
          created_at?: string
          created_by?: string
          direction?: Database["public"]["Enums"]["payment_direction"]
          id?: string
          journal_id?: string
          memo?: string | null
          partner_id?: string
          payment_date?: string
          payment_number?: string
          updated_at?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number | null
          contract_value: number
          created_at: string
          id: string
          is_flagged: boolean
          name: string
          partner_id: string
          product_line: Database["public"]["Enums"]["product_line"]
          updated_at: string
        }
        Insert: {
          budget?: number | null
          contract_value: number
          created_at?: string
          id?: string
          is_flagged?: boolean
          name: string
          partner_id: string
          product_line: Database["public"]["Enums"]["product_line"]
          updated_at?: string
        }
        Update: {
          budget?: number | null
          contract_value?: number
          created_at?: string
          id?: string
          is_flagged?: boolean
          name?: string
          partner_id?: string
          product_line?: Database["public"]["Enums"]["product_line"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_targets: {
        Row: {
          created_at: string
          id: string
          period: string
          target_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          period: string
          target_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          period?: string
          target_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      clients: {
        Row: {
          client_type: Database["public"]["Enums"]["client_type"] | null
          created_at: string
          id: string
          name: string
        }
        Relationships: []
      }
      v_account_balances: {
        Row: {
          account_code: string
          account_id: string
          account_name: string
          account_subtype: Database["public"]["Enums"]["account_subtype"]
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          total_credit: number
          total_debit: number
        }
        Relationships: []
      }
      v_invoice_paid: {
        Row: {
          amount: number
          amount_paid_derived: number
          amount_paid_stored: number
          invoice_id: string
          invoice_number: string
          outstanding_derived: number
        }
        Relationships: []
      }
      v_posted_lines: {
        Row: {
          account_code: string
          account_id: string
          account_name: string
          account_subtype: Database["public"]["Enums"]["account_subtype"]
          account_type: Database["public"]["Enums"]["account_type"]
          accounting_date: string
          credit: number
          debit: number
          entry_number: string
          journal_code: string
          journal_entry_id: string
          journal_id: string
          line_description: string | null
          line_id: string
          partner_id: string | null
          project_id: string | null
          source_id: string | null
          source_type: Database["public"]["Enums"]["entry_source"]
        }
        Relationships: []
      }
    }
    Functions: {
      post_journal_entry: {
        Args: {
          p_accounting_date: string
          p_actor_id: string
          p_description: string
          p_journal_code: string
          p_journal_id: string
          p_lines: Json
          p_reference?: string | null
          p_reversal_of_id?: string | null
          p_source_id?: string | null
          p_source_type: Database["public"]["Enums"]["entry_source"]
          p_status?: Database["public"]["Enums"]["entry_status"]
        }
        Returns: {
          entry_number: string
          id: string
        }[]
      }
      next_expense_number: {
        Args: { p_year: number }
        Returns: string
      }
      fn_project_pl: {
        Args: { p_as_of?: string; p_project_id: string }
        Returns: {
          cost: number
          profit: number
          revenue: number
        }[]
      }
      fn_trial_balance: {
        Args: { p_as_of?: string }
        Returns: {
          account_code: string
          account_id: string
          account_name: string
          account_subtype: Database["public"]["Enums"]["account_subtype"]
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          credit: number
          debit: number
        }[]
      }
    }
    Enums: {
      account_subtype:
        | "bank"
        | "cash"
        | "receivable"
        | "prepaid"
        | "other_current_asset"
        | "fixed_asset"
        | "payable"
        | "tax_payable"
        | "payroll_payable"
        | "loan"
        | "other_current_liability"
        | "capital"
        | "retained_earnings"
        | "opening_balance"
        | "operating_revenue"
        | "other_revenue"
        | "project_cost"
        | "payroll_expense"
        | "operating_expense"
        | "financial_expense"
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      client_type: "government" | "private"
      entity_type:
        | "invoice"
        | "project"
        | "expense"
        | "category_budget"
        | "revenue_target"
        | "cash_snapshot"
        | "page"
        | "loan"
        | "partner"
      entry_source:
        | "invoice"
        | "payment"
        | "expense"
        | "loan_transaction"
        | "payroll"
        | "opening"
        | "manual"
        | "reversal"
      entry_status: "draft" | "posted" | "cancelled"
      expense_category: "payroll" | "operations" | "project_costs"
      expense_status: "draft" | "posted" | "cancelled"
      journal_type: "sale" | "purchase" | "bank" | "cash" | "payroll" | "general"
      loan_status: "active" | "settled" | "cancelled"
      loan_txn_type:
        | "disbursement"
        | "principal_repayment"
        | "interest_accrual"
        | "interest_payment"
        | "fee"
      payment_direction: "inbound" | "outbound"
      product_line: "VIANA" | "ORION" | "AIoT" | "Indi AI" | "3D Digital Twin"
      user_role: "superadmin" | "admin" | "director" | "member"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      account_subtype: [
        "bank",
        "cash",
        "receivable",
        "prepaid",
        "other_current_asset",
        "fixed_asset",
        "payable",
        "tax_payable",
        "payroll_payable",
        "loan",
        "other_current_liability",
        "capital",
        "retained_earnings",
        "opening_balance",
        "operating_revenue",
        "other_revenue",
        "project_cost",
        "payroll_expense",
        "operating_expense",
        "financial_expense",
      ],
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      client_type: ["government", "private"],
      entity_type: [
        "invoice",
        "project",
        "expense",
        "category_budget",
        "revenue_target",
        "cash_snapshot",
        "page",
        "loan",
        "partner",
      ],
      entry_source: [
        "invoice",
        "payment",
        "expense",
        "loan_transaction",
        "payroll",
        "opening",
        "manual",
        "reversal",
      ],
      entry_status: ["draft", "posted", "cancelled"],
      expense_category: ["payroll", "operations", "project_costs"],
      expense_status: ["draft", "posted", "cancelled"],
      journal_type: ["sale", "purchase", "bank", "cash", "payroll", "general"],
      loan_status: ["active", "settled", "cancelled"],
      loan_txn_type: [
        "disbursement",
        "principal_repayment",
        "interest_accrual",
        "interest_payment",
        "fee",
      ],
      payment_direction: ["inbound", "outbound"],
      product_line: ["VIANA", "ORION", "AIoT", "Indi AI", "3D Digital Twin"],
      user_role: ["superadmin", "admin", "director", "member"],
    },
  },
} as const
