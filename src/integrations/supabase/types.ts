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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      inter_mat_operadores: {
        Row: {
          usuario_id: string
          papel: "admin" | "gestor" | "operador" | "consulta"
          ativo: boolean
          criado_em: string
        }
        Insert: {
          usuario_id: string
          papel: "admin" | "gestor" | "operador" | "consulta"
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          usuario_id?: string
          papel?: "admin" | "gestor" | "operador" | "consulta"
          ativo?: boolean
          criado_em?: string
        }
        Relationships: []
      }
      auditoria: {
        Row: {
          acao: string
          data: string
          detalhes: Json | null
          entidade: string
          id: string
          usuario: string | null
        }
        Insert: {
          acao: string
          data?: string
          detalhes?: Json | null
          entidade: string
          id?: string
          usuario?: string | null
        }
        Update: {
          acao?: string
          data?: string
          detalhes?: Json | null
          entidade?: string
          id?: string
          usuario?: string | null
        }
        Relationships: []
      }
      devolucoes: {
        Row: {
          criado_em: string | null
          data: string
          emprestimo_id: string
          id: string
          observacoes: string | null
          quantidade: number
          responsavel: string | null
          tipo: string
        }
        Insert: {
          criado_em?: string | null
          data?: string
          emprestimo_id: string
          id?: string
          observacoes?: string | null
          quantidade: number
          responsavel?: string | null
          tipo: string
        }
        Update: {
          criado_em?: string | null
          data?: string
          emprestimo_id?: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          responsavel?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "devolucoes_emprestimo_id_fkey"
            columns: ["emprestimo_id"]
            isOneToOne: false
            referencedRelation: "emprestimos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cidade: string | null
          cnpj: string
          criado_em: string | null
          email: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          limite_centavos: number
          nome_fantasia: string
          observacoes: string | null
          prazo_padrao_dias: number
          razao_social: string
          responsavel: string | null
          status: string
          telefone: string | null
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          cnpj: string
          criado_em?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          limite_centavos?: number
          nome_fantasia: string
          observacoes?: string | null
          prazo_padrao_dias?: number
          razao_social: string
          responsavel?: string | null
          status?: string
          telefone?: string | null
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          cnpj?: string
          criado_em?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          limite_centavos?: number
          nome_fantasia?: string
          observacoes?: string | null
          prazo_padrao_dias?: number
          razao_social?: string
          responsavel?: string | null
          status?: string
          telefone?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      emprestimos: {
        Row: {
          criado_em: string | null
          data: string
          empresa_id: string
          id: string
          motorista: string | null
          numero: string
          observacoes: string | null
          prazo_devolucao: string
          produto_id: string
          quantidade: number
          quantidade_devolvida: number
          responsavel: string | null
          status: string
          valor_unitario_centavos: number
          veiculo: string | null
        }
        Insert: {
          criado_em?: string | null
          data?: string
          empresa_id: string
          id?: string
          motorista?: string | null
          numero: string
          observacoes?: string | null
          prazo_devolucao: string
          produto_id: string
          quantidade: number
          quantidade_devolvida?: number
          responsavel?: string | null
          status?: string
          valor_unitario_centavos?: number
          veiculo?: string | null
        }
        Update: {
          criado_em?: string | null
          data?: string
          empresa_id?: string
          id?: string
          motorista?: string | null
          numero?: string
          observacoes?: string | null
          prazo_devolucao?: string
          produto_id?: string
          quantidade?: number
          quantidade_devolvida?: number
          responsavel?: string | null
          status?: string
          valor_unitario_centavos?: number
          veiculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emprestimos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emprestimos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      motoristas: {
        Row: {
          cnh: string
          criado_em: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          cnh: string
          criado_em?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          cnh?: string
          criado_em?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          data: string
          empresa_id: string | null
          id: string
          origem: string | null
          produto_id: string
          quantidade: number
          tipo: string
          usuario: string | null
        }
        Insert: {
          data?: string
          empresa_id?: string | null
          id?: string
          origem?: string | null
          produto_id: string
          quantidade: number
          tipo: string
          usuario?: string | null
        }
        Update: {
          data?: string
          empresa_id?: string | null
          id?: string
          origem?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          categoria: string | null
          codigo: string
          codigo_barras: string | null
          criado_em: string | null
          custo_centavos: number
          descricao: string
          estoque_atual: number
          estoque_minimo: number
          fornecedor: string | null
          id: string
          localizacao: string | null
          marca: string | null
          unidade: string
          venda_centavos: number
        }
        Insert: {
          categoria?: string | null
          codigo: string
          codigo_barras?: string | null
          criado_em?: string | null
          custo_centavos?: number
          descricao: string
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          unidade: string
          venda_centavos?: number
        }
        Update: {
          categoria?: string | null
          codigo?: string
          codigo_barras?: string | null
          criado_em?: string | null
          custo_centavos?: number
          descricao?: string
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          unidade?: string
          venda_centavos?: number
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          capacidade: string | null
          criado_em: string | null
          id: string
          modelo: string
          placa: string
        }
        Insert: {
          capacidade?: string | null
          criado_em?: string | null
          id?: string
          modelo: string
          placa: string
        }
        Update: {
          capacidade?: string | null
          criado_em?: string | null
          id?: string
          modelo?: string
          placa?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      registrar_emprestimo_seguro: {
        Args: {
          p_empresa_id: string
          p_produto_id: string
          p_quantidade: number
          p_valor_unitario_centavos: number
          p_data: string
          p_prazo_devolucao: string
          p_responsavel: string
          p_motorista: string
          p_veiculo: string
          p_observacoes: string
        }
        Returns: Database["public"]["Tables"]["emprestimos"]["Row"]
      }
      registrar_devolucao_segura: {
        Args: {
          p_emprestimo_id: string
          p_tipo: string
          p_quantidade: number
          p_responsavel: string
          p_observacoes: string
        }
        Returns: Database["public"]["Tables"]["devolucoes"]["Row"]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
