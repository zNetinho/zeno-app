import { useQuery, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { client } from "./rpc";

// ===== TODO HOOKS =====

export const useListTodos = () => {
  return useQuery({
    queryKey: ["todos"],
    queryFn: () => client.LIST_TODOS({}),
  });
};

export const useCreateTodo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { title: string }) => client.CREATE_TODO(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
};

export const useToggleTodo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => client.TOGGLE_TODO({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
};

export const useDeleteTodo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => client.DELETE_TODO({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
};

export const useGenerateTodoWithAI = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => client.GENERATE_TODO_WITH_AI({}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
};

// ===== USER HOOKS =====

export const useOptionalUser = () => {
  return useSuspenseQuery({
    queryKey: ["user"],
    queryFn: () =>
      client.GET_USER({}, {
        handleResponse: async (res: Response) => {
          if (res.status === 401) {
            return null;
          }
          return res.json();
        },
      }),
    retry: false,
  });
};

export const useUser = () => {
  // Como agora usamos autenticação nativa do Deco, 
  // este hook retorna sempre null para manter compatibilidade
  return {
    data: null,
    isLoading: false,
    error: null,
  };
};

// ===== GASTOS HOOKS =====

export const useVerificarQualidadeImagem = () => {
  return useMutation({
    mutationFn: (data: { 
      imagem_url: string; 
    }) => client.VERIFICAR_QUALIDADE_IMAGEM(data),
  });
};

export const useAnalisarEntrada = () => {
  return useMutation({
    mutationFn: (data: { 
      entrada: string; 
      is_imagem?: boolean; 
      tipo?: "gasto" | "entrada"; 
    }) => client.ANALISAR_ENTRADA(data),
  });
};

export const useCategorizarGastos = () => {
  return useMutation({
    mutationFn: (data: {
      dados: {
        tipo: "gasto" | "entrada";
        valor: number;
        item: string;
        quantidade?: number;
        estabelecimento?: string;
        data: string;
        categoria: string;
        forma_pagamento?: string;
        tags?: string[];
      };
    }) => client.CATEGORIZAR_GASTOS(data),
  });
};

export const useProcessarComprovante = () => {
  return useMutation({
    mutationFn: (data: { 
      imagem_url: string; 
      descricao_adicional?: string; 
    }) => client.PROCESSAR_COMPROVANTE(data),
  });
};

export const useRegistrarGastoConfirmado = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      dados: {
        tipo: "gasto" | "entrada";
        valor: number;
        item: string;
        estabelecimento: string;
        data: string;
        categoria: string;
        forma_pagamento: string;
        confianca_ocr: number;
      };
    }) => client.REGISTRAR_GASTO_CONFIRMADO(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
    },
  });
};

export const useConsultarGastos = () => {
  return useMutation({
    mutationFn: (data: {
      tipo_consulta: "periodo" | "categoria" | "total" | "top_n";
      data_inicio?: string;
      data_fim?: string;
      categoria?: string;
      limite?: number;
    }) => client.CONSULTAR_GASTOS(data),
  });
};

export const useListarGastos = () => {
  return useQuery({
    queryKey: ["gastos"],
    queryFn: () => client.LISTAR_GASTOS({}),
  });
};

export const useRegistrarGasto = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      dados: {
        tipo: "gasto" | "entrada";
        valor: number;
        item: string;
        quantidade: number;
        estabelecimento: string;
        data: string;
        categoria: string;
        forma_pagamento: string;
        tags: string[];
      };
    }) => client.REGISTRAR_GASTO(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
    },
  });
};

export const useAnalisarDados = () => {
  return useMutation({
    mutationFn: (data: {
      mes: number;
      ano: number;
      tipo_periodo: "semanal" | "mensal" | "trimestral";
    }) => client.ANALISAR_DADOS(data),
  });
};

export const useGerarInsights = () => {
  return useMutation({
    mutationFn: (data: {
      relatorio: {
        periodo: string;
        total_gasto: number;
        media_por_categoria: Array<{
          categoria: string;
          total: number;
          media: number;
          quantidade: number;
        }>;
        categorias_mais_caras: Array<{
          categoria: string;
          total: number;
        }>;
        comparacao_mes_anterior: {
          diferenca: number;
          percentual: number;
        };
        insights: string[];
      };
    }) => client.GERAR_INSIGHTS(data),
  });
};

export const useDeleteGasto = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => client.DELETE_GASTO({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
    },
  });
};

export const useUpdateGasto = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      id: number;
      dados: {
        tipo: "gasto" | "entrada";
        valor: number;
        item: string;
        quantidade: number;
        estabelecimento: string;
        data: string;
        categoria: string;
        forma_pagamento: string;
        tags: string[];
      };
    }) => client.UPDATE_GASTO(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
    },
  });
};

export const useEnviarEmail = () => {
  return useMutation({
    mutationFn: (data: {
      insights: {
        resumo: string;
        principais_gastos: string[];
        recomendacoes: string[];
        alertas: string[];
      };
      periodo: string;
      total_gasto: number;
      email_destino?: string;
    }) => client.ENVIAR_EMAIL(data),
  });
};

export const useProcessarEntradaUsuario = () => {
  return useMutation({
    mutationFn: (data: {
      entrada: string;
      contexto?: string;
    }) => client.PROCESSAR_ENTRADA_USUARIO(data),
  });
};

// ===== WORKFLOW HOOKS =====

export const useStartRegistroWorkflow = () => {
  return useMutation({
    mutationFn: (data: {
      entrada: string;
      contexto?: string;
    }) => client.START_REGISTRO_WORKFLOW(data),
  });
};

export const useStartConsultaWorkflow = () => {
  return useMutation({
    mutationFn: (data: {
      tipo_consulta: string;
      parametros?: any;
    }) => client.START_CONSULTA_WORKFLOW(data),
  });
};

export const useStartAnaliseWorkflow = () => {
  return useMutation({
    mutationFn: (data: {
      mes: number;
      ano: number;
      tipo_periodo: string;
    }) => client.START_ANALISE_WORKFLOW(data),
  });
};
