import { createPrivateTool, createTool } from "@deco/workers-runtime/mastra";
import z from "zod";
import { gastosTable } from "./schema.ts";
import { getDb } from "./db.ts";
import type { Env } from "./main.ts";
import { eq, and, gte, lte } from "drizzle-orm";

/**
 * Helper function to get authenticated user from Deco context
 * Temporarily disabled for development
 */
async function getAuthenticatedUser(env: Env) {
  // Temporarily return a mock user for development
  return {
    id: "dev-user",
    email: "dev@example.com",
    name: "Developer"
  };
  
  // Original authentication code (commented out for now)
  // const decoUser = env.DECO_CHAT_REQUEST_CONTEXT.ensureAuthenticated();
  // if (!decoUser) {
  //   throw new Error("Usuário não autenticado");
  // }
  // return decoUser;
}

export const createAnalisarEntradaTool = (env: Env) =>
  createPrivateTool({
    id: "ANALISAR_ENTRADA",
    description: "Analisa entrada do usuário (texto ou imagem) e extrai dados relevantes para gastos ou entradas",
    inputSchema: z.object({
      entrada: z.string().describe("Texto do gasto/entrada ou descrição da imagem"),
      is_imagem: z.boolean().optional().describe("Se a entrada veio de uma imagem"),
      tipo: z.enum(["gasto", "entrada"]).optional().describe("Tipo de registro (gasto ou entrada)"),
    }),
    outputSchema: z.object({
      dados_extraidos: z.object({
        tipo: z.enum(["gasto", "entrada"]),
        valor: z.number(),
        item: z.string(),
        quantidade: z.number().optional(),
        estabelecimento: z.string().optional(),
        data: z.string(),
        categoria: z.string(),
        forma_pagamento: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
      sucesso: z.boolean(),
      mensagem: z.string(),
    }),
    execute: async ({ context }) => {
      try {
        // Determinar se é gasto ou entrada baseado no contexto
        const isEntrada = context.tipo === "entrada" ||
          context.entrada.toLowerCase().includes("recebi") ||
          context.entrada.toLowerCase().includes("entrada") ||
          context.entrada.toLowerCase().includes("salário") ||
          context.entrada.toLowerCase().includes("pagamento");

        const categoriasGasto = ["Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Outros"];
        const categoriasEntrada = ["Salário", "Freelance", "Investimentos", "Presente", "Reembolso", "Outros"];

        // Usar AI para extrair dados da entrada
        const resultado = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT({
          model: "openai:gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `Você é um assistente especializado em extrair informações financeiras de texto ou descrições de imagens. 
              Analise se a entrada se refere a um GASTO ou ENTRADA (receita) e extraia os seguintes dados:
              - tipo: "gasto" ou "entrada"
              - valor: valor monetário
              - item: descrição do item ou fonte da entrada
              - quantidade: quantidade (padrão 1)
              - estabelecimento: local ou fonte
              - data: formato YYYY-MM-DD (use hoje se não especificado)
              - categoria: para gastos use (Alimentação, Transporte, Moradia, Lazer, Saúde, Outros), para entradas use (Salário, Freelance, Investimentos, Presente, Reembolso, Outros)
              - forma_pagamento: forma de pagamento (para gastos) ou forma de recebimento (para entradas)
              
              Retorne apenas o JSON com os dados extraídos.`
            },
            {
              role: "user",
              content: `Entrada: ${context.entrada}
              É imagem: ${context.is_imagem || false}
              Tipo sugerido: ${isEntrada ? "entrada" : "gasto"}`
            }
          ],
          temperature: 0.1,
          skipTransaction: true,
          schema: {
            type: "object",
            properties: {
              tipo: { type: "string", enum: ["gasto", "entrada"] },
              valor: { type: "number" },
              item: { type: "string" },
              quantidade: { type: "number" },
              estabelecimento: { type: "string" },
              data: { type: "string" },
              categoria: { type: "string" },
              forma_pagamento: { type: "string" }
            },
            required: ["tipo", "valor", "item", "data", "categoria"]
          }
        });

        const dados = resultado.object;
        if (!dados) {
          throw new Error("Falha ao extrair dados da entrada");
        }

        // Validar categoria baseada no tipo
        let categoria = String(dados.categoria);
        if (dados.tipo === "gasto" && !categoriasGasto.includes(categoria)) {
          categoria = "Outros";
        } else if (dados.tipo === "entrada" && !categoriasEntrada.includes(categoria)) {
          categoria = "Outros";
        }

        return {
          dados_extraidos: {
            tipo: dados.tipo as "gasto" | "entrada",
            valor: Number(dados.valor),
            item: String(dados.item),
            quantidade: Number(dados.quantidade) || 1,
            estabelecimento: String(dados.estabelecimento || ""),
            data: String(dados.data),
            categoria: categoria,
            forma_pagamento: String(dados.forma_pagamento || ""),
            tags: [],
          } as any,
          sucesso: true,
          mensagem: "Dados extraídos com sucesso"
        };
      } catch (error) {
        console.error("Erro ao analisar entrada:", error);
        return {
          dados_extraidos: {
            tipo: "gasto" as const,
            valor: 0,
            item: "",
            quantidade: 1,
            estabelecimento: "",
            data: new Date().toISOString().split('T')[0],
            categoria: "Outros",
            forma_pagamento: "",
            tags: [],
          },
          sucesso: false,
          mensagem: `Erro ao analisar entrada: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        };
      }
    },
  });

export const createProcessarComprovanteTool = (env: Env) =>
  createTool({
    id: "PROCESSAR_COMPROVANTE",
    description: "Processa imagem de comprovante usando OCR e extrai dados para confirmação",
    inputSchema: z.object({
      imagem_url: z.string().describe("URL da imagem do comprovante"),
      descricao_adicional: z.string().optional().describe("Descrição adicional do usuário sobre o gasto"),
    }),
    outputSchema: z.object({
      dados_extraidos: z.object({
        tipo: z.enum(["gasto", "entrada"]),
        valor: z.number(),
        item: z.string(),
        estabelecimento: z.string(),
        data: z.string(),
        categoria: z.string(),
        forma_pagamento: z.string(),
        confianca_ocr: z.number(),
        tags: z.array(z.string()).optional(),
      }),
      texto_extraido: z.string(),
      sucesso: z.boolean(),
      mensagem: z.string(),
    }),
    execute: async ({ context }) => {
      try {
        // Passo 1: Extrair texto da imagem usando OCR
        const resultadoOCR = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT({
          model: "openai:gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `Você é um especialista em OCR e análise de comprovantes. 
              Analise a imagem fornecida e extraia TODAS as informações visíveis, incluindo:
              - Valores monetários
              - Nome do estabelecimento
              - Data
              - Itens comprados
              - Forma de pagamento
              - Qualquer outro texto relevante
              
              Retorne o texto extraído de forma clara e organizada.`
            },
            {
              role: "user",
              content: `Analise esta imagem de comprovante e extraia todas as informações visíveis:
              ${context.imagem_url}
              
              ${context.descricao_adicional ? `Informação adicional do usuário: ${context.descricao_adicional}` : ''}`
            }
          ],
          temperature: 0.1,
          skipTransaction: true,
          schema: {
            type: "object",
            properties: {
              texto_completo: { type: "string" },
              confianca: { type: "number", minimum: 0, maximum: 1 }
            },
            required: ["texto_completo", "confianca"]
          }
        });

        const textoExtraido = String(resultadoOCR.object?.texto_completo || "");
        const confianca = Number(resultadoOCR.object?.confianca || 0.5);

        if (!textoExtraido) {
          throw new Error("Não foi possível extrair texto da imagem");
        }

        // Passo 2: Analisar o texto extraído e extrair dados estruturados
        const analiseTexto = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT({
          model: "openai:gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Você é um especialista em análise de comprovantes e extratos.
              Analise o texto extraído de um comprovante e extraia as seguintes informações:
              - valor: o valor total da compra (número)
              - item: descrição principal do que foi comprado
              - estabelecimento: nome do estabelecimento/loja
              - data: data da compra (formato YYYY-MM-DD)
              - categoria: uma das opções: Alimentação, Transporte, Moradia, Lazer, Saúde, Outros
              - forma_pagamento: forma de pagamento usada
              
              Se alguma informação não estiver clara, use valores padrão sensatos.
              Para data, se não encontrar, use a data atual.
              Para categoria, analise o contexto e escolha a mais apropriada.`
            },
            {
              role: "user",
              content: `Analise este texto extraído de um comprovante:
              ${textoExtraido}
              
              ${context.descricao_adicional ? `Informação adicional: ${context.descricao_adicional}` : ''}`
            }
          ],
          temperature: 0.1,
          skipTransaction: true,
          schema: {
            type: "object",
            properties: {
              valor: { type: "number" },
              item: { type: "string" },
              estabelecimento: { type: "string" },
              data: { type: "string" },
              categoria: { type: "string" },
              forma_pagamento: { type: "string" }
            },
            required: ["valor", "item", "estabelecimento", "data", "categoria", "forma_pagamento"]
          }
        });

        const dadosExtraidos = analiseTexto.object;
        if (!dadosExtraidos) {
          throw new Error("Não foi possível analisar os dados extraídos");
        }

        // Passo 3: Validar e categorizar os dados
        const categorias_validas = ["Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Outros"];
        const formas_pagamento_validas = ["Dinheiro", "Cartão de Crédito", "Cartão de Débito", "PIX", "Transferência", "Boleto"];

        let categoria = String(dadosExtraidos.categoria);
        if (!categorias_validas.includes(categoria)) {
          categoria = "Outros";
        }

        let forma_pagamento = String(dadosExtraidos.forma_pagamento);
        if (!formas_pagamento_validas.includes(forma_pagamento)) {
          forma_pagamento = "Não informado";
        }

        // Validar data
        let data = String(dadosExtraidos.data);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
          data = new Date().toISOString().split('T')[0];
        }

        // Passo 4: Retornar dados extraídos para confirmação (não registra no banco)
        return {
          dados_extraidos: {
            tipo: "gasto" as const,
            valor: Number(dadosExtraidos.valor),
            item: String(dadosExtraidos.item),
            estabelecimento: String(dadosExtraidos.estabelecimento),
            data: data,
            categoria: categoria,
            forma_pagamento: forma_pagamento,
            confianca_ocr: confianca,
            tags: ["OCR", "Comprovante"],
          },
          texto_extraido: textoExtraido,
          sucesso: true,
          mensagem: `Dados extraídos com sucesso! Confiança do OCR: ${(Number(confianca) * 100).toFixed(1)}%. Confirme os dados para registrar o gasto.`
        };
      } catch (error) {
        console.error("Erro ao processar comprovante:", error);
        return {
          dados_extraidos: {
            tipo: "gasto" as const,
            valor: 0,
            item: "",
            estabelecimento: "",
            data: new Date().toISOString().split('T')[0],
            categoria: "Outros",
            forma_pagamento: "Não informado",
            confianca_ocr: 0,
            tags: [],
          },
          texto_extraido: "",
          sucesso: false,
          mensagem: `Erro ao processar comprovante: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        };
      }
    },
  });

export const createRegistrarGastoConfirmadoTool = (env: Env) =>
  createTool({
    id: "REGISTRAR_GASTO_CONFIRMADO",
    description: "Registra o gasto ou entrada no banco após confirmação do usuário",
    inputSchema: z.object({
      dados: z.object({
        tipo: z.enum(["gasto", "entrada"]),
        valor: z.number(),
        item: z.string(),
        estabelecimento: z.string(),
        data: z.string(),
        categoria: z.string(),
        forma_pagamento: z.string(),
        confianca_ocr: z.number(),
      }),
    }),
    outputSchema: z.object({
      id: z.number(),
      sucesso: z.boolean(),
      mensagem: z.string(),
    }),
    execute: async ({ context }) => {
      try {
        const db = await getDb(env);
        // Temporariamente removendo autenticação para debug
        // await getAuthenticatedUser(env);


        const novoRegistro = await db.insert(gastosTable).values({
          tipo: context.dados.tipo,
          valor: context.dados.valor,
          item: context.dados.item,
          quantidade: 1,
          estabelecimento: context.dados.estabelecimento,
          data: context.dados.data,
          categoria: context.dados.categoria,
          forma_pagamento: context.dados.forma_pagamento,
          tags: JSON.stringify(["OCR", "Comprovante", "Confirmado"]),
        }).returning({ id: gastosTable.id });

        const tipoTexto = context.dados.tipo === "entrada" ? "Entrada" : "Gasto";
        return {
          id: novoRegistro[0].id,
          sucesso: true,
          mensagem: `${tipoTexto} registrado com sucesso após confirmação`
        };
      } catch (error) {
        console.error("Erro ao registrar registro confirmado:", error);
        return {
          id: 0,
          sucesso: false,
          mensagem: `Erro ao registrar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        };
      }
    },
  });

export const createVerificarQualidadeImagemTool = (env: Env) =>
  createTool({
    id: "VERIFICAR_QUALIDADE_IMAGEM",
    description: "Verifica se a imagem é adequada para OCR e fornece recomendações",
    inputSchema: z.object({
      imagem_url: z.string().describe("URL da imagem para verificação"),
    }),
    outputSchema: z.object({
      adequada_para_ocr: z.boolean(),
      qualidade: z.enum(["Excelente", "Boa", "Regular", "Ruim"]),
      problemas_identificados: z.array(z.string()),
      recomendacoes: z.array(z.string()),
      sucesso: z.boolean(),
      mensagem: z.string(),
    }),
    execute: async ({ context }) => {
      try {
        const resultado = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT({
          model: "openai:gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Você é um especialista em qualidade de imagem para OCR.
              Analise a imagem fornecida e avalie se ela é adequada para extração de texto.
              Considere:
              - Nitidez e foco
              - Iluminação
              - Ângulo da foto
              - Presença de texto legível
              - Contraste
              - Resolução
              
              Retorne uma avaliação detalhada com recomendações.`
            },
            {
              role: "user",
              content: `Avalie a qualidade desta imagem para OCR:
              ${context.imagem_url}`
            }
          ],
          temperature: 0.1,
          skipTransaction: true,
          schema: {
            type: "object",
            properties: {
              adequada: { type: "boolean" },
              qualidade: { type: "string", enum: ["Excelente", "Boa", "Regular", "Ruim"] },
              problemas: { type: "array", items: { type: "string" } },
              recomendacoes: { type: "array", items: { type: "string" } }
            },
            required: ["adequada", "qualidade", "problemas", "recomendacoes"]
          }
        });

        const avaliacao = resultado.object;
        if (!avaliacao) {
          throw new Error("Não foi possível avaliar a qualidade da imagem");
        }

        return {
          adequada_para_ocr: Boolean(avaliacao.adequada),
          qualidade: String(avaliacao.qualidade) as any,
          problemas_identificados: Array.isArray(avaliacao.problemas) ? avaliacao.problemas.map(String) : [],
          recomendacoes: Array.isArray(avaliacao.recomendacoes) ? avaliacao.recomendacoes.map(String) : [],
          sucesso: true,
          mensagem: "Avaliação de qualidade concluída"
        };
      } catch (error) {
        console.error("Erro ao verificar qualidade da imagem:", error);
        return {
          adequada_para_ocr: false,
          qualidade: "Ruim" as any,
          problemas_identificados: ["Erro na análise da imagem"],
          recomendacoes: ["Tente novamente ou use uma imagem diferente"],
          sucesso: false,
          mensagem: `Erro ao verificar qualidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        };
      }
    },
  });

export const createListarGastosTool = (env: Env) =>
  createTool({
    id: "LISTAR_GASTOS",
    description: "Lista todos os gastos e entradas do usuário de forma simples",
    inputSchema: z.object({
      limite: z.number().optional().describe("Número máximo de registros a retornar"),
    }),
    outputSchema: z.object({
      gastos: z.array(z.object({
        id: z.number(),
        tipo: z.enum(["gasto", "entrada"]),
        valor: z.number(),
        item: z.string(),
        quantidade: z.number(),
        estabelecimento: z.string().optional(),
        data: z.string(),
        categoria: z.string(),
        forma_pagamento: z.string().optional(),
        tags: z.array(z.string()),
        created_at: z.string(),
      })),
      total_gastos: z.number(),
      total_entradas: z.number(),
      total_valor_gastos: z.number(),
      total_valor_entradas: z.number(),
      saldo: z.number(),
      sucesso: z.boolean(),
      mensagem: z.string(),
    }),
    execute: async ({ context }) => {
      try {
        const db = await getDb(env);

        await getAuthenticatedUser(env);

        const gastos = await db.select().from(gastosTable);

        const gastosList = gastos.filter(g => g.tipo === "gasto");
        const entradasList = gastos.filter(g => g.tipo === "entrada");

        const totalValorGastos = gastosList.reduce((sum, gasto) => sum + gasto.valor, 0);
        const totalValorEntradas = entradasList.reduce((sum, entrada) => sum + entrada.valor, 0);
        const saldo = totalValorEntradas - totalValorGastos;

        return {
          gastos: gastos.map(gasto => ({
            id: gasto.id,
            tipo: gasto.tipo as "gasto" | "entrada",
            valor: gasto.valor,
            item: gasto.item,
            quantidade: gasto.quantidade || 1,
            estabelecimento: gasto.estabelecimento || "",
            data: gasto.data,
            categoria: gasto.categoria,
            forma_pagamento: gasto.forma_pagamento || "",
            tags: gasto.tags ? JSON.parse(gasto.tags) as string[] : [],
            created_at: gasto.created_at ? gasto.created_at.toISOString() : new Date().toISOString(),
          })),
          total_gastos: gastosList.length,
          total_entradas: entradasList.length,
          total_valor_gastos: totalValorGastos,
          total_valor_entradas: totalValorEntradas,
          saldo: saldo,
          sucesso: true,
          mensagem: `${gastos.length} registros encontrados (${gastosList.length} gastos, ${entradasList.length} entradas)`
        };
      } catch (error) {
        console.error("❌ Erro ao listar gastos:", error);
        return {
          gastos: [],
          total_gastos: 0,
          total_entradas: 0,
          total_valor_gastos: 0,
          total_valor_entradas: 0,
          saldo: 0,
          sucesso: false,
          mensagem: `Erro ao listar gastos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        };
      }
    },
  });

export const createCategorizarGastosTool = (env: Env) =>
  createTool({
    id: "CATEGORIZAR_GASTOS",
    description: "Categoriza e valida os dados de gastos ou entradas extraídos",
    inputSchema: z.object({
      dados: z.object({
        tipo: z.enum(["gasto", "entrada"]),
        valor: z.number(),
        item: z.string(),
        quantidade: z.number().optional(),
        estabelecimento: z.string().optional(),
        data: z.string(),
        categoria: z.string(),
        forma_pagamento: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    }),
    outputSchema: z.object({
      dados_categorizados: z.object({
        tipo: z.enum(["gasto", "entrada"]),
        valor: z.number(),
        item: z.string(),
        quantidade: z.number(),
        estabelecimento: z.string(),
        data: z.string(),
        categoria: z.string(),
        forma_pagamento: z.string(),
        tags: z.array(z.string()),
      }),
      sucesso: z.boolean(),
      mensagem: z.string(),
    }),
    execute: async ({ context }) => {
      try {
        const categorias_gasto = ["Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Outros"];
        const categorias_entrada = ["Salário", "Freelance", "Investimentos", "Presente", "Reembolso", "Outros"];
        const formas_pagamento_validas = ["Dinheiro", "Cartão de Crédito", "Cartão de Débito", "PIX", "Transferência", "Boleto"];

        let categoria = context.dados.categoria;
        if (context.dados.tipo === "gasto" && !categorias_gasto.includes(categoria)) {
          categoria = "Outros";
        } else if (context.dados.tipo === "entrada" && !categorias_entrada.includes(categoria)) {
          categoria = "Outros";
        }

        let forma_pagamento = context.dados.forma_pagamento || "Não informado";
        if (forma_pagamento && !formas_pagamento_validas.includes(forma_pagamento)) {
          forma_pagamento = "Não informado";
        }

        // Validar data
        let data = context.dados.data;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
          data = new Date().toISOString().split('T')[0];
        }

        return {
          dados_categorizados: {
            tipo: context.dados.tipo,
            valor: context.dados.valor,
            item: context.dados.item,
            quantidade: context.dados.quantidade || 1,
            estabelecimento: context.dados.estabelecimento && context.dados.estabelecimento !== "undefined" ? context.dados.estabelecimento : "Não informado",
            data: data,
            categoria: categoria,
            forma_pagamento: forma_pagamento,
            tags: context.dados.tags || [],
          },
          sucesso: true,
          mensagem: "Dados categorizados com sucesso"
        };
      } catch (error) {
        console.error("Erro ao categorizar dados:", error);
        return {
          dados_categorizados: {
            tipo: "gasto" as const,
            valor: 0,
            item: "",
            quantidade: 1,
            estabelecimento: "",
            data: new Date().toISOString().split('T')[0],
            categoria: "Outros",
            forma_pagamento: "Não informado",
            tags: [],
          },
          sucesso: false,
          mensagem: `Erro ao categorizar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        };
      }
    },
  });

export const createRegistrarGastoTool = (env: Env) =>
  createTool({
    id: "REGISTRAR_GASTO",
    description: "Registra o gasto ou entrada no banco de dados SQLite",
    inputSchema: z.object({
      dados: z.object({
        tipo: z.enum(["gasto", "entrada"]),
        valor: z.number(),
        item: z.string(),
        quantidade: z.number(),
        estabelecimento: z.string(),
        data: z.string(),
        categoria: z.string(),
        forma_pagamento: z.string(),
        tags: z.array(z.string()),
      }),
    }),
    outputSchema: z.object({
      id: z.number(),
      sucesso: z.boolean(),
      mensagem: z.string(),
    }),
    execute: async ({ context }) => {
      try {
        const db = await getDb(env);

        // Temporariamente removendo autenticação para debug
        // await getAuthenticatedUser(env);


        const novoRegistro = await db.insert(gastosTable).values({
          tipo: context.dados.tipo,
          valor: context.dados.valor,
          item: context.dados.item,
          quantidade: context.dados.quantidade,
          estabelecimento: context.dados.estabelecimento,
          data: context.dados.data,
          categoria: context.dados.categoria,
          forma_pagamento: context.dados.forma_pagamento,
          tags: JSON.stringify(context.dados.tags),
          created_at: new Date(),
        }).returning({ id: gastosTable.id });

        const tipoTexto = context.dados.tipo === "entrada" ? "Entrada" : "Gasto";
        return {
          id: novoRegistro[0].id,
          sucesso: true,
          mensagem: `${tipoTexto} registrado com sucesso`
        };
      } catch (error) {
        console.error("Erro ao registrar:", error);
        return {
          id: 0,
          sucesso: false,
          mensagem: `Erro ao registrar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        };
      }
    },
  });

export const createAnalisarDadosTool = (env: Env) =>
  createTool({
    id: "ANALISAR_DADOS",
    description: "Gera relatório mensal com análise dos gastos",
    inputSchema: z.object({
      mes: z.number(),
      ano: z.number(),
      tipo_periodo: z.enum(["semanal", "mensal", "trimestral"]),
    }),
    outputSchema: z.object({
      relatorio: z.object({
        periodo: z.string(),
        total_gasto: z.number(),
        media_por_categoria: z.array(z.object({
          categoria: z.string(),
          total: z.number(),
          media: z.number(),
          quantidade: z.number(),
        })),
        categorias_mais_caras: z.array(z.object({
          categoria: z.string(),
          total: z.number(),
        })),
        comparacao_mes_anterior: z.object({
          diferenca: z.number(),
          percentual: z.number(),
        }),
        insights: z.array(z.string()),
      }),
      sucesso: z.boolean(),
      mensagem: z.string(),
    }),
    execute: async ({ context }) => {
      try {
        const db = await getDb(env);

        await getAuthenticatedUser(env);

        let dataInicio, dataFim;
        const hoje = new Date();

        if (context.tipo_periodo === "mensal") {
          dataInicio = `${context.ano}-${context.mes.toString().padStart(2, '0')}-01`;
          const ultimoDia = new Date(context.ano, context.mes, 0).getDate();
          dataFim = `${context.ano}-${context.mes.toString().padStart(2, '0')}-${ultimoDia}`;
        } else if (context.tipo_periodo === "semanal") {
          // semana específica
          dataInicio = `${context.ano}-${context.mes.toString().padStart(2, '0')}-01`;
          dataFim = `${context.ano}-${context.mes.toString().padStart(2, '0')}-07`;
        } else {
          // Trimestral
          const trimestreInicio = Math.floor((context.mes - 1) / 3) * 3 + 1;
          dataInicio = `${context.ano}-${trimestreInicio.toString().padStart(2, '0')}-01`;
          const trimestreFim = trimestreInicio + 2;
          const ultimoDia = new Date(context.ano, trimestreFim, 0).getDate();
          dataFim = `${context.ano}-${trimestreFim.toString().padStart(2, '0')}-${ultimoDia}`;
        }

        const gastos = await db.select().from(gastosTable)
          .where(and(
            gte(gastosTable.data, dataInicio),
            lte(gastosTable.data, dataFim)
          ));

        // Calcular estatísticas  
        const totalGasto = gastos.reduce((sum, gasto) => sum + gasto.valor, 0);

        const porCategoria = gastos.reduce((acc, gasto) => {
          if (!acc[gasto.categoria]) {
            acc[gasto.categoria] = { total: 0, quantidade: 0 };
          }
          acc[gasto.categoria].total += gasto.valor;
          acc[gasto.categoria].quantidade += 1;
          return acc;
        }, {} as Record<string, { total: number; quantidade: number }>);

        const mediaPorCategoria = Object.entries(porCategoria).map(([categoria, dados]) => ({
          categoria,
          total: dados.total,
          media: dados.total / dados.quantidade,
          quantidade: dados.quantidade,
        }));

        const categoriasMaisCaras = Object.entries(porCategoria)
          .map(([categoria, dados]) => ({ categoria, total: dados.total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 3);

        const mesAnterior = context.mes === 1 ? 12 : context.mes - 1;
        const anoAnterior = context.mes === 1 ? context.ano - 1 : context.ano;

        const gastosMesAnterior = await db.select().from(gastosTable)
          .where(and(
            gte(gastosTable.data, `${anoAnterior}-${mesAnterior.toString().padStart(2, '0')}-01`),
            lte(gastosTable.data, `${anoAnterior}-${mesAnterior.toString().padStart(2, '0')}-31`)
          ));

        const totalMesAnterior = gastosMesAnterior.reduce((sum, gasto) => sum + gasto.valor, 0);
        const diferenca = totalGasto - totalMesAnterior;
        const percentual = totalMesAnterior > 0 ? (diferenca / totalMesAnterior) * 100 : 0;

        const insights = [];
        if (diferenca > 0) {
          insights.push(`Seus gastos aumentaram ${Math.abs(percentual).toFixed(1)}% em relação ao período anterior`);
        } else {
          insights.push(`Seus gastos diminuíram ${Math.abs(percentual).toFixed(1)}% em relação ao período anterior`);
        }

        if (categoriasMaisCaras.length > 0) {
          insights.push(`Sua categoria com maior gasto foi ${categoriasMaisCaras[0].categoria} com R$ ${categoriasMaisCaras[0].total.toFixed(2)}`);
        }

        return {
          relatorio: {
            periodo: `${dataInicio} a ${dataFim}`,
            total_gasto: totalGasto,
            media_por_categoria: mediaPorCategoria,
            categorias_mais_caras: categoriasMaisCaras,
            comparacao_mes_anterior: {
              diferenca: diferenca,
              percentual: percentual,
            },
            insights: insights,
          },
          sucesso: true,
          mensagem: "Análise realizada com sucesso"
        };
      } catch (error) {
        console.error("Erro ao analisar dados:", error);
        return {
          relatorio: {
            periodo: "",
            total_gasto: 0,
            media_por_categoria: [],
            categorias_mais_caras: [],
            comparacao_mes_anterior: { diferenca: 0, percentual: 0 },
            insights: [],
          },
          sucesso: false,
          mensagem: `Erro ao analisar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        };
      }
    },
  });

export const createGerarInsightsTool = (env: Env) =>
  createTool({
    id: "GERAR_INSIGHTS",
    description: "Converte relatório técnico em linguagem simples com recomendações",
    inputSchema: z.object({
      relatorio: z.object({
        periodo: z.string(),
        total_gasto: z.number(),
        media_por_categoria: z.array(z.object({
          categoria: z.string(),
          total: z.number(),
          media: z.number(),
          quantidade: z.number(),
        })),
        categorias_mais_caras: z.array(z.object({
          categoria: z.string(),
          total: z.number(),
        })),
        comparacao_mes_anterior: z.object({
          diferenca: z.number(),
          percentual: z.number(),
        }),
        insights: z.array(z.string()),
      }),
    }),
    outputSchema: z.object({
      insights_simples: z.object({
        resumo: z.string(),
        principais_gastos: z.array(z.string()),
        recomendacoes: z.array(z.string()),
        alertas: z.array(z.string()),
      }),
      sucesso: z.boolean(),
      mensagem: z.string(),
    }),
    execute: async ({ context }) => {
      try {
        const resultado = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT({
          model: "openai:gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `Você é um consultor financeiro especializado em análise de gastos pessoais. 
                Analise o relatório fornecido e gere insights em linguagem simples e acessível, 
                incluindo recomendações práticas para economia. Seja positivo e motivacional.`
            },
            {
              role: "user",
              content: `Analise este relatório de gastos e gere insights simples:
                Período: ${context.relatorio.periodo}
                Total gasto: R$ ${context.relatorio.total_gasto.toFixed(2)}
                Categorias mais caras: ${context.relatorio.categorias_mais_caras.map(c => `${c.categoria} (R$ ${c.total.toFixed(2)})`).join(', ')}
                Comparação com período anterior: ${context.relatorio.comparacao_mes_anterior.diferenca > 0 ? 'aumento' : 'diminuição'} de ${Math.abs(context.relatorio.comparacao_mes_anterior.percentual).toFixed(1)}%
                Insights técnicos: ${context.relatorio.insights.join(', ')}`
            }
          ],
          temperature: 0.7,
          skipTransaction: true,
          schema: {
            type: "object",
            properties: {
              resumo: { type: "string" },
              principais_gastos: { type: "array", items: { type: "string" } },
              recomendacoes: { type: "array", items: { type: "string" } },
              alertas: { type: "array", items: { type: "string" } }
            },
            required: ["resumo", "principais_gastos", "recomendacoes", "alertas"]
          }
        });

        const insights = resultado.object;
        if (!insights) {
          throw new Error("Falha ao gerar insights");
        }

        return {
          insights_simples: {
            resumo: String(insights.resumo),
            principais_gastos: Array.isArray(insights.principais_gastos) ? insights.principais_gastos.map(String) : [],
            recomendacoes: Array.isArray(insights.recomendacoes) ? insights.recomendacoes.map(String) : [],
            alertas: Array.isArray(insights.alertas) ? insights.alertas.map(String) : [],
          } as any,
          sucesso: true,
          mensagem: "Insights gerados com sucesso"
        };
      } catch (error) {
        console.error("Erro ao gerar insights:", error);
        return {
          insights_simples: {
            resumo: "Não foi possível gerar insights neste momento",
            principais_gastos: [],
            recomendacoes: [],
            alertas: [],
          },
          sucesso: false,
          mensagem: `Erro ao gerar insights: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        };
      }
    },
  });

export const createEnviarEmailTool = (env: Env) =>
  createTool({
    id: "ENVIAR_EMAIL",
    description: "Envia relatório de gastos por email usando integração MCP Gmail",
    inputSchema: z.object({
      insights: z.object({
        resumo: z.string(),
        principais_gastos: z.array(z.string()),
        recomendacoes: z.array(z.string()),
        alertas: z.array(z.string()),
      }),
      periodo: z.string(),
      total_gasto: z.number(),
      email_destino: z.string().optional().describe("Email de destino (opcional - será obtido do usuário logado se não fornecido)"),
    }),
    outputSchema: z.object({
      sucesso: z.boolean(),
      mensagem: z.string(),
      email_enviado: z.boolean(),
      detalhes_envio: z.object({
        destinatario: z.string(),
        assunto: z.string(),
        timestamp: z.string(),
      }).optional(),
    }),
    execute: async ({ context }) => {
      try {

        // Função para obter email do usuário logado
        async function getUserEmail(): Promise<string> {
          try {
            // Tentar obter usuário autenticado via Deco
            const decoUser = env.DECO_CHAT_REQUEST_CONTEXT.ensureAuthenticated();
            if (decoUser && decoUser.email) {
              return decoUser.email;
            }
          } catch (error) {
            
          }

                     // Email padrão como fallback
           return "user@example.com";

          // Email padrão como fallback
          const defaultEmail = "0414399291465neto@gmail.com";
          return defaultEmail;
        }

        let emailDestino: string;
        
        if (context.email_destino) {
          emailDestino = context.email_destino; 
        } else {
          emailDestino = await getUserEmail();
        }

        const assunto = `📊 Relatório de Gastos - ${context.periodo}`;
        const conteudoHTML = gerarConteudoEmailHTML(context);

        try {
          const emailResult = await env.GMAIL_N1.SendEmail({
            to: emailDestino,
            subject: assunto,
            bodyHtml: conteudoHTML,
          });

          return {
            sucesso: true,
            mensagem: `Relatório enviado com sucesso para ${emailDestino}`,
            email_enviado: true,
            detalhes_envio: {
              destinatario: emailDestino,
              assunto: assunto,
              timestamp: new Date().toISOString(),
            },
          };

        } catch (gmailError) {
          console.error("❌ Erro ao enviar email via MCP Gmail:", gmailError);
          if (gmailError instanceof Error) {
            console.error("Detalhes do erro:", {
              message: gmailError.message,
              stack: gmailError.stack,
            });
          }

          return {
            sucesso: false,
            mensagem: `Erro ao enviar email via Gmail: ${gmailError instanceof Error ? gmailError.message : 'Erro desconhecido'}`,
            email_enviado: false,
          };
        }

      } catch (error) {
        console.error("❌ Erro geral ao processar envio de email:", error);
        return {
          sucesso: false,
          mensagem: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          email_enviado: false,
        };
      }
    },
  });

export const createConsultarGastosTool = (env: Env) =>
  createTool({
    id: "CONSULTAR_GASTOS",
    description: "Consulta gastos no banco por diferentes critérios",
    inputSchema: z.object({
      tipo_consulta: z.enum(["periodo", "categoria", "total", "top_n"]),
      data_inicio: z.string().optional(),
      data_fim: z.string().optional(),
      categoria: z.string().optional(),
      limite: z.number().optional(),
    }),
    outputSchema: z.object({
      gastos: z.array(z.object({
        id: z.number(),
        tipo: z.enum(["gasto", "entrada"]),
        valor: z.number(),
        item: z.string(),
        quantidade: z.number(),
        estabelecimento: z.string(),
        data: z.string(),
        categoria: z.string(),
        forma_pagamento: z.string(),
        tags: z.array(z.string()),
      })),
      total: z.number(),
      total_gastos: z.number(),
      total_valor: z.number(),
      media_por_categoria: z.array(z.object({
        categoria: z.string(),
        total: z.number(),
        media: z.number(),
        quantidade: z.number(),
      })),
      gastos_por_categoria: z.array(z.object({
        categoria: z.string(),
        total: z.number(),
        media: z.number(),
        quantidade: z.number(),
      })).optional(),
      sucesso: z.boolean(),
      mensagem: z.string(),
    }),
    execute: async ({ context }) => {
      try {
        const db = await getDb(env);

        await getAuthenticatedUser(env);

        let conditions = [];

        switch (context.tipo_consulta) {
          case "periodo":
            if (context.data_inicio && context.data_fim) {
              conditions.push(
                gte(gastosTable.data, context.data_inicio),
                lte(gastosTable.data, context.data_fim)
              );
            }
            break;
          case "categoria":
            if (context.categoria) {
              conditions.push(eq(gastosTable.categoria, context.categoria));
            }
            break;
        }

        const gastos = await db.select().from(gastosTable).where(and(...conditions));
        // verificar se e entrada ou gasto
        const totalEntrada = gastos.reduce((sum, gasto) => sum + (gasto.tipo === 'entrada' ? gasto.valor : 0), 0);
        const totalGasto = gastos.reduce((sum, gasto) => sum + (gasto.tipo === 'gasto' ? gasto.valor : 0), 0);
        const total = totalEntrada - totalGasto;
        const totalGastos = gastos.length;

        const porCategoria = gastos.reduce((acc, gasto) => {
          if (!acc[gasto.categoria]) {
            acc[gasto.categoria] = { total: 0, quantidade: 0 };
          }
          acc[gasto.categoria].total += gasto.valor;
          acc[gasto.categoria].quantidade += 1;
          return acc;
        }, {} as Record<string, { total: number; quantidade: number }>);

        const mediaPorCategoria = Object.entries(porCategoria).map(([categoria, dados]) => ({
          categoria,
          total: dados.total,
          media: dados.total / dados.quantidade,
          quantidade: dados.quantidade,
        }));

        const response: any = {
          gastos: gastos.map(gasto => ({
            id: gasto.id,
            tipo: gasto.tipo as "gasto" | "entrada",
            valor: gasto.valor,
            item: gasto.item,
            quantidade: gasto.quantidade || 1,
            estabelecimento: gasto.estabelecimento || "",
            data: gasto.data,
            categoria: gasto.categoria,
            forma_pagamento: gasto.forma_pagamento || "",
            tags: gasto.tags ? JSON.parse(gasto.tags) as string[] : [],
          })),
          total: total,
          total_gastos: totalGastos,
          total_valor: total,
          media_por_categoria: mediaPorCategoria,
          sucesso: true,
          mensagem: "Consulta realizada com sucesso"
        };

        if (context.tipo_consulta === "categoria") {
          response.gastos_por_categoria = mediaPorCategoria;
        }

        return response;
      } catch (error) {
        console.error("Erro ao consultar gastos:", error);
        return {
          gastos: [],
          total: 0,
          total_gastos: 0,
          total_valor: 0,
          media_por_categoria: [],
          gastos_por_categoria: [],
          sucesso: false,
          mensagem: `Erro ao consultar gastos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        };
      }
    },
  });

export const createDeleteGastoTool = (env: Env) =>
  createTool({
    id: "DELETE_GASTO",
    description: "Remove um gasto do banco de dados",
    inputSchema: z.object({
      id: z.number(),
    }),
    outputSchema: z.object({
      sucesso: z.boolean(),
      deletedId: z.number(),
      mensagem: z.string(),
    }),
    execute: async ({ context }) => {
      try {
        const db = await getDb(env);
        await getAuthenticatedUser(env);

        const existingGasto = await db.select().from(gastosTable).where(
          eq(gastosTable.id, context.id)
        ).limit(1);

        if (existingGasto.length === 0) {
          return {
            sucesso: false,
            deletedId: context.id,
            mensagem: "Gasto não encontrado ou não pertence ao usuário"
          };
        }

        await db.delete(gastosTable).where(eq(gastosTable.id, context.id));

        return {
          sucesso: true,
          deletedId: context.id,
          mensagem: "Gasto removido com sucesso"
        };
      } catch (error) {
        console.error("Erro ao remover gasto:", error);
        return {
          sucesso: false,
          deletedId: context.id,
          mensagem: `Erro ao remover gasto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        };
      }
    },
  });

function gerarConteudoEmailHTML(context: any): string {
  return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Gastos</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          
          .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 600;
          }
          
          .header p {
            font-size: 16px;
            opacity: 0.9;
          }
          
          .content {
            padding: 30px 20px;
          }
          
          .summary-box {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-left: 5px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
          }
          
          .summary-box h2 {
            color: #667eea;
            font-size: 20px;
            margin-bottom: 10px;
          }
          
          .summary-box h3 {
            color: #495057;
            font-size: 24px;
            font-weight: 600;
          }
          
          .insight-section {
            margin: 25px 0;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            border: 1px solid #e9ecef;
          }
          
          .insight-title {
            color: #667eea;
            font-weight: 600;
            font-size: 18px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .insight-content {
            color: #495057;
            line-height: 1.7;
          }
          
          ul {
            padding-left: 20px;
            margin: 10px 0;
          }
          
          li {
            margin: 8px 0;
            color: #495057;
          }
          
          .alert {
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            border: 1px solid #ffc107;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
          }
          
          .alert .insight-title {
            color: #856404;
          }
          
          .footer {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 25px 20px;
            text-align: center;
            border-top: 1px solid #dee2e6;
          }
          
          .footer p {
            font-size: 14px;
            color: #6c757d;
            margin: 5px 0;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          
          .stat-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e9ecef;
          }
          
          .stat-value {
            font-size: 24px;
            font-weight: 600;
            color: #667eea;
          }
          
          .stat-label {
            font-size: 12px;
            color: #6c757d;
            margin-top: 5px;
          }
          
          @media (max-width: 600px) {
            .container {
              margin: 0;
              box-shadow: none;
            }
            
            .header {
              padding: 20px 15px;
            }
            
            .content {
              padding: 20px 15px;
            }
            
            .stats-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Relatório de Gastos</h1>
            <p>Seu resumo financeiro mensal</p>
          </div>
          
          <div class="content">
            <div class="summary-box">
              <h2>📅 Período: ${context.periodo}</h2>
              <h3>💰 Total Gasto: R$ ${context.total_gasto.toFixed(2)}</h3>
            </div>
            
            <div class="insight-section">
              <div class="insight-title">
                <span>📝</span>
                <span>Resumo</span>
              </div>
              <div class="insight-content">
                <p>${context.insights.resumo}</p>
              </div>
            </div>
            
            <div class="insight-section">
              <div class="insight-title">
                <span>💰</span>
                <span>Principais Gastos</span>
              </div>
              <div class="insight-content">
                               <ul>
                   ${context.insights.principais_gastos.map((gasto: string) => `<li>${gasto}</li>`).join('')}
                 </ul>
              </div>
            </div>
            
            <div class="insight-section">
              <div class="insight-title">
                <span>💡</span>
                <span>Recomendações</span>
              </div>
              <div class="insight-content">
                               <ul>
                   ${context.insights.recomendacoes.map((rec: string) => `<li>${rec}</li>`).join('')}
                 </ul>
              </div>
            </div>
            
            ${context.insights.alertas.length > 0 ? `
            <div class="alert">
              <div class="insight-title">
                <span>⚠️</span>
                <span>Alertas</span>
              </div>
              <div class="insight-content">
                  <ul>
                    ${context.insights.alertas.map((alerta: string) => `<li>${alerta}</li>`).join('')}
                  </ul>
              </div>
            </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>📧 Este relatório foi gerado automaticamente pelo seu assistente de gestão financeira.</p>
            <p>💡 Dica: Mantenha o controle dos seus gastos para melhorar sua saúde financeira!</p>
            <p>🕒 Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
}

export const createUpdateGastoTool = (env: Env) =>
  createTool({
    id: "UPDATE_GASTO",
    description: "Atualiza um gasto existente no banco de dados",
    inputSchema: z.object({
      id: z.number(),
      dados: z.object({
        tipo: z.enum(["gasto", "entrada"]),
        valor: z.number(),
        item: z.string(),
        quantidade: z.number(),
        estabelecimento: z.string(),
        data: z.string(),
        categoria: z.string(),
        forma_pagamento: z.string(),
        tags: z.array(z.string()),
      }),
    }),
    outputSchema: z.object({
      sucesso: z.boolean(),
      mensagem: z.string(),
      gasto_atualizado: z.object({
        id: z.number(),
        tipo: z.enum(["gasto", "entrada"]),
        valor: z.number(),
        item: z.string(),
        quantidade: z.number(),
        estabelecimento: z.string(),
        data: z.string(),
        categoria: z.string(),
        forma_pagamento: z.string(),
        tags: z.array(z.string()),
      }).optional(),
    }),
    execute: async ({ context }) => {
      try {
        const db = await getDb(env);
        await getAuthenticatedUser(env);

        // Verificar se o gasto existe
        const existingGasto = await db.select().from(gastosTable).where(
          eq(gastosTable.id, context.id)
        ).limit(1);

        if (existingGasto.length === 0) {
          return {
            sucesso: false,
            mensagem: "Gasto não encontrado ou não pertence ao usuário"
          };
        }

        // Atualizar o gasto
        const gastoAtualizado = await db.update(gastosTable)
          .set({
            tipo: context.dados.tipo,
            valor: context.dados.valor,
            item: context.dados.item,
            quantidade: context.dados.quantidade,
            estabelecimento: context.dados.estabelecimento,
            data: context.dados.data,
            categoria: context.dados.categoria,
            forma_pagamento: context.dados.forma_pagamento,
            tags: JSON.stringify(context.dados.tags),
          })
          .where(eq(gastosTable.id, context.id))
          .returning();

        const tipoTexto = context.dados.tipo === "entrada" ? "Entrada" : "Gasto";
        
        return {
          sucesso: true,
          mensagem: `${tipoTexto} atualizado com sucesso`,
          gasto_atualizado: {
            id: gastoAtualizado[0].id,
            tipo: gastoAtualizado[0].tipo as "gasto" | "entrada",
            valor: gastoAtualizado[0].valor,
            item: gastoAtualizado[0].item,
            quantidade: gastoAtualizado[0].quantidade || 1,
            estabelecimento: gastoAtualizado[0].estabelecimento || "",
            data: gastoAtualizado[0].data,
            categoria: gastoAtualizado[0].categoria,
            forma_pagamento: gastoAtualizado[0].forma_pagamento || "",
            tags: gastoAtualizado[0].tags ? JSON.parse(gastoAtualizado[0].tags) as string[] : [],
          }
        };
      } catch (error) {
        console.error("Erro ao atualizar gasto:", error);
        return {
          sucesso: false,
          mensagem: `Erro ao atualizar gasto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        };
      }
    },
  });