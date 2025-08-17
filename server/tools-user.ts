import { createTool } from "@deco/workers-runtime/mastra";
import { gastosTable } from "./schema.ts";
import { z } from "zod";
import { getDb } from "./db.ts";
import { eq, and, gte, lte } from "drizzle-orm";
import { Env } from "./main.ts";

/**
 * Helper function to get authenticated user from Deco context
 */
async function getAuthenticatedUser(env: Env) {
  const decoUser = env.DECO_CHAT_REQUEST_CONTEXT.ensureAuthenticated();
  if (!decoUser) {
    throw new Error("Usuário não autenticado");
  }
  return decoUser;
}

export const createProcessarEntradaUsuarioTool = (env: Env) =>
  createTool({
    id: "PROCESSAR_ENTRADA_USUARIO",
    description: "Recebe entrada do usuário e delega para a ferramenta apropriada baseada no conteúdo",
    inputSchema: z.object({
      entrada: z.string().describe("Texto de entrada do usuário"),
      contexto: z.string().optional().describe("Contexto adicional da conversa"),
      userEmail: z.string().optional().describe("Email do usuário"),
    }),
    outputSchema: z.object({
      acao_executada: z.string(),
      ferramenta_utilizada: z.string(),
      resultado: z.any(),
      sucesso: z.boolean(),
      mensagem: z.string(),
      proximos_passos: z.array(z.string()).optional(),
    }),
    execute: async ({ context }) => {
      try {
        await getAuthenticatedUser(env);

        const analise = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT({
          model: "openai:gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Você é um assistente especializado em analisar entradas de usuário e determinar qual ferramenta deve ser usada.
              
              Ferramentas disponíveis:
              1. ANALISAR_ENTRADA - Para processar descrições de gastos em texto
              2. PROCESSAR_COMPROVANTE - Para processar imagens de comprovantes
              3. CONSULTAR_GASTOS - Para consultar gastos existentes
              4. ANALISAR_DADOS - Para gerar relatórios e análises
              5. GERAR_INSIGHTS - Para gerar insights financeiros
              6. ENVIAR_EMAIL - Para enviar relatórios por email
              7. REGISTRAR_GASTO - Para registrar um gasto
              
              REGRAS IMPORTANTES:
              - Para ENVIAR_EMAIL: Se o usuário mencionar "enviar email", "enviar relatório", "mandar email", "email", etc., use ENVIAR_EMAIL e defina precisa_mais_info como false
              - Para CONSULTAR_GASTOS: Se o usuário mencionar "consultar gastos", "ver gastos", "listar gastos", etc., use CONSULTAR_GASTOS
              - Para GERAR_INSIGHTS: Se o usuário mencionar "gerar insight", "insights", "análise financeira", etc., use GERAR_INSIGHTS
              - Para ANALISAR_DADOS: Se o usuário mencionar "analisar dados", "relatório", "estatísticas", etc., use ANALISAR_DADOS
              - Para REGISTRAR_GASTO: Se o usuário mencionar "registrar gasto", "adicionar gasto", "gasto", "gastei", "gastei ontem", "gastei ontem no xyz", etc., use REGISTRAR_GASTO
              REGRA ESPECIAL PARA ENTRADAS GENÉRICAS:
              - Se o usuário digitar algo genérico como "tenta de novo", "opções", "ajuda", "o que posso fazer", "menu", etc., use RESPOSTA_DIRETA e defina precisa_mais_info como false
              - Neste caso, inclua uma lista completa das opções disponíveis na mensagem_clarificacao
              
              Só solicite mais informações (precisa_mais_info: true) se realmente não conseguir determinar qual ferramenta usar E a entrada não for genérica.
              
              Analise a entrada do usuário e determine:
              - Qual ferramenta usar
              - Que parâmetros passar
              - Se precisa de informações adicionais (geralmente false para comandos claros)
              
              Retorne uma resposta estruturada com a decisão.`
            },
            {
              role: "user",
              content: `Entrada do usuário: "${context.entrada}"
              Contexto: ${context.contexto || "Nenhum contexto adicional"}`
            }
          ],
          temperature: 0.1,
          skipTransaction: true,
          schema: {
            type: "object",
            properties: {
              ferramenta: {
                type: "string",
                enum: ["ANALISAR_ENTRADA", "PROCESSAR_COMPROVANTE", "CONSULTAR_GASTOS", "ANALISAR_DADOS", "GERAR_INSIGHTS", "ENVIAR_EMAIL", "RESPOSTA_DIRETA", "REGISTRAR_GASTO"]
              },
              parametros: { type: "object" },
              precisa_mais_info: { type: "boolean" },
              mensagem_clarificacao: { type: "string" },
              acao_descricao: { type: "string" }
            },
            required: ["ferramenta", "parametros", "precisa_mais_info", "acao_descricao"]
          }
        });

        const decisao = analise.object;
        if (!decisao) {
          throw new Error("Não foi possível analisar a entrada do usuário");
        }

        if (decisao.precisa_mais_info) {
          return {
            acao_executada: "SOLICITAR_CLARIFICACAO",
            ferramenta_utilizada: "ANALISE_IA",
            resultado: {
              mensagem_clarificacao: String(decisao.mensagem_clarificacao || "Preciso de mais informações para ajudá-lo melhor.")
            },
            sucesso: true,
            mensagem: "Solicitando clarificação do usuário",
            proximos_passos: ["Aguardar resposta do usuário com mais detalhes"]
          };
        }

        let resultado: any = {};
        let ferramentaExecutada = String(decisao.ferramenta);

        switch (decisao.ferramenta) {
          case "ANALISAR_ENTRADA":
            try {
              const analise = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT({
                model: "openai:gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: `Você é um assistente especializado em extrair informações de gastos de texto.
                    Analise o texto fornecido e extraia as seguintes informações:
                    - valor (número)
                    - item (string)
                    - estabelecimento (string)
                    - data (formato YYYY-MM-DD, use hoje se não especificado)
                    - categoria (uma das: Alimentação, Transporte, Lazer, Saúde, Educação, Moradia, Outros)
                    - forma_pagamento (uma das: Dinheiro, Cartão de Crédito, Cartão de Débito, PIX, Transferência)
                    
                    Retorne apenas os dados extraídos no formato especificado.`
                  },
                  {
                    role: "user",
                    content: context.entrada
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
                  required: ["valor", "item", "categoria"]
                }
              });

              const dadosExtraidos = analise.object;
              resultado = {
                dados_extraidos: {
                  valor: dadosExtraidos?.valor || 0,
                  item: dadosExtraidos?.item || "Item não identificado",
                  estabelecimento: dadosExtraidos?.estabelecimento || "Não informado",
                  data: dadosExtraidos?.data || new Date().toISOString().split('T')[0],
                  categoria: dadosExtraidos?.categoria || "Outros",
                  forma_pagamento: dadosExtraidos?.forma_pagamento || "Não informado"
                },
                sucesso: true,
                mensagem: "Análise de entrada realizada com sucesso"
              };
            } catch (error) {
              console.error("Erro ao analisar entrada:", error);
              resultado = {
                dados_extraidos: {
                  valor: 0,
                  item: "Item não identificado",
                  estabelecimento: "Não informado",
                  data: new Date().toISOString().split('T')[0],
                  categoria: "Outros",
                  forma_pagamento: "Não informado"
                },
                sucesso: false,
                mensagem: `Erro ao analisar entrada: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
              };
            }
            break;

          case "CONSULTAR_GASTOS":
            try {
              const db = await getDb(env);
              const gastos = await db.select().from(gastosTable);

              const total = gastos.reduce((sum, gasto) => sum + gasto.valor, 0);

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

              resultado = {
                gastos: gastos.map(gasto => ({
                  id: gasto.id,
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
                total_gastos: gastos.length,
                total_valor: total,
                media_por_categoria: mediaPorCategoria,
                sucesso: true,
                mensagem: `Consulta realizada com sucesso. ${gastos.length} gastos encontrados.`
              };
            } catch (error) {
              console.error("Erro ao consultar gastos:", error);
              resultado = {
                gastos: [],
                total_gastos: 0,
                total_valor: 0,
                media_por_categoria: [],
                sucesso: false,
                mensagem: `Erro ao consultar gastos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
              };
            }
            break;

          case "ANALISAR_DADOS":
            try {
              const db = await getDb(env);
              const currentDate = new Date();
              const mes = currentDate.getMonth() + 1;
              const ano = currentDate.getFullYear();

              // Calcular datas do período
              const dataInicio = `${ano}-${mes.toString().padStart(2, '0')}-01`;
              const ultimoDia = new Date(ano, mes, 0).getDate();
              const dataFim = `${ano}-${mes.toString().padStart(2, '0')}-${ultimoDia}`;

              // Buscar gastos do período
              const gastos = await db.select().from(gastosTable)
                .where(and(
                  gte(gastosTable.data, dataInicio),
                  lte(gastosTable.data, dataFim)
                ));

              // Calcular estatísticas
              const totalGasto = gastos.reduce((sum, gasto) => sum + gasto.valor, 0);

              // Agrupar por categoria
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

              // Comparação com período anterior
              const mesAnterior = mes === 1 ? 12 : mes - 1;
              const anoAnterior = mes === 1 ? ano - 1 : ano;

              const gastosMesAnterior = await db.select().from(gastosTable)
                .where(and(
                  gte(gastosTable.data, `${anoAnterior}-${mesAnterior.toString().padStart(2, '0')}-01`),
                  lte(gastosTable.data, `${anoAnterior}-${mesAnterior.toString().padStart(2, '0')}-31`)
                ));

              const totalMesAnterior = gastosMesAnterior.reduce((sum, gasto) => sum + gasto.valor, 0);
              const diferenca = totalGasto - totalMesAnterior;
              const percentual = totalMesAnterior > 0 ? (diferenca / totalMesAnterior) * 100 : 0;

              // Gerar insights básicos
              const insights = [];
              if (diferenca > 0) {
                insights.push(`Seus gastos aumentaram ${Math.abs(percentual).toFixed(1)}% em relação ao período anterior`);
              } else {
                insights.push(`Seus gastos diminuíram ${Math.abs(percentual).toFixed(1)}% em relação ao período anterior`);
              }

              if (categoriasMaisCaras.length > 0) {
                insights.push(`Sua categoria com maior gasto foi ${categoriasMaisCaras[0].categoria} com R$ ${categoriasMaisCaras[0].total.toFixed(2)}`);
              }

              resultado = {
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
                mensagem: `Análise realizada com sucesso. ${gastos.length} gastos analisados.`
              };
            } catch (error) {
              console.error("Erro ao analisar dados:", error);
              resultado = {
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
            break;

          case "GERAR_INSIGHTS":
            try {
              const db = await getDb(env);
              const gastos = await db.select().from(gastosTable);

              if (gastos.length === 0) {
                resultado = {
                  insights_simples: {
                    resumo: "Você ainda não registrou nenhum gasto",
                    principais_gastos: [],
                    recomendacoes: ["Comece a registrar seus gastos para obter insights mais detalhados"],
                    alertas: []
                  },
                  sucesso: true,
                  mensagem: "Insights gerados com sucesso"
                };
                break;
              }

              const totalGasto = gastos.reduce((sum, gasto) => sum + gasto.valor, 0);

              const porCategoria = gastos.reduce((acc, gasto) => {
                if (!acc[gasto.categoria]) {
                  acc[gasto.categoria] = { total: 0, quantidade: 0 };
                }
                acc[gasto.categoria].total += gasto.valor;
                acc[gasto.categoria].quantidade += 1;
                return acc;
              }, {} as Record<string, { total: number; quantidade: number }>);

              const categoriasMaisCaras = Object.entries(porCategoria)
                .map(([categoria, dados]) => ({ categoria, total: dados.total }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 3);

              const analise = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT({
                model: "openai:gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: `Você é um consultor financeiro especializado em análise de gastos pessoais. 
                    Analise os dados fornecidos e gere insights em linguagem simples e acessível, 
                    incluindo recomendações práticas para economia. Seja positivo e motivacional.
                    
                    Dados dos gastos:
                    - Total gasto: R$ ${totalGasto.toFixed(2)}
                    - Número de gastos: ${gastos.length}
                    - Categorias mais caras: ${categoriasMaisCaras.map(c => `${c.categoria} (R$ ${c.total.toFixed(2)})`).join(', ')}
                    
                    Gere insights úteis e recomendações práticas.`
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

              const insights = analise.object;
              resultado = {
                insights_simples: {
                  resumo: String(insights?.resumo || "Análise financeira baseada nos seus gastos"),
                  principais_gastos: Array.isArray(insights?.principais_gastos) ? insights.principais_gastos.map(String) : [],
                  recomendacoes: Array.isArray(insights?.recomendacoes) ? insights.recomendacoes.map(String) : [],
                  alertas: Array.isArray(insights?.alertas) ? insights.alertas.map(String) : [],
                },
                sucesso: true,
                mensagem: "Insights gerados com sucesso baseados nos seus dados reais"
              };
            } catch (error) {
              console.error("Erro ao gerar insights:", error);
              resultado = {
                insights_simples: {
                  resumo: "Não foi possível gerar insights neste momento",
                  principais_gastos: [],
                  recomendacoes: ["Tente novamente mais tarde"],
                  alertas: []
                },
                sucesso: false,
                mensagem: `Erro ao gerar insights: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
              };
            }
            break;

          case "ENVIAR_EMAIL":
            try {

              const db = await getDb(env);
              const gastos = await db.select().from(gastosTable);
              const userEmail = "antonio.neto@n1.ag";

              const totalGasto = gastos.reduce((sum, gasto) => sum + gasto.valor, 0);
              const currentDate = new Date();
              const periodo = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;

              const insights = {
                resumo: `Seu total de gastos é R$ ${totalGasto.toFixed(2)} com ${gastos.length} registros`,
                principais_gastos: gastos.slice(0, 5).map(g => `${g.item}: R$ ${g.valor.toFixed(2)}`),
                recomendacoes: ["Continue registrando seus gastos para melhor controle financeiro"],
                alertas: []
              };

              const conteudoHTML = `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                  <meta charset="UTF-8">
                  <title>Relatório de Gastos</title>
                </head>
                <body>
                  <h1>📊 Relatório de Gastos</h1>
                  <h2>📅 Período: ${periodo}</h2>
                  <h3>💰 Total Gasto: R$ ${totalGasto.toFixed(2)}</h3>
                  
                  <h4>📝 Resumo</h4>
                  <p>${insights.resumo}</p>
                  
                  <h4>💰 Principais Gastos</h4>
                  <ul>
                    ${insights.principais_gastos.map(gasto => `<li>${gasto}</li>`).join('')}
                  </ul>
                  
                  <h4>💡 Recomendações</h4>
                  <ul>
                    ${insights.recomendacoes.map(rec => `<li>${rec}</li>`).join('')}
                  </ul>
                  
                  <p>🕒 Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                </body>
                </html>
              `;

              const emailResult = await env.GMAIL_N1.SendEmail({
                to: userEmail,
                subject: `📊 Relatório de Gastos - ${periodo}`,
                bodyHtml: conteudoHTML,
              });

              resultado = {
                sucesso: true,
                mensagem: `Relatório enviado com sucesso para ${userEmail}`,
                email_enviado: true,
                detalhes_envio: {
                  destinatario: userEmail,
                  assunto: `📊 Relatório de Gastos - ${periodo}`,
                  timestamp: new Date().toISOString()
                }
              };
            } catch (error) {
              console.error("❌ Erro ao enviar email:", error);
              resultado = {
                sucesso: false,
                mensagem: `Erro ao enviar email: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                email_enviado: false,
              };
            }
            break;

          case "REGISTRAR_GASTO":
            try {
              // Analisar a entrada para extrair dados do gasto usando IA
              const analiseGasto = await env.DECO_CHAT_WORKSPACE_API.AI_GENERATE_OBJECT({
                model: "openai:gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: `Você é um assistente especializado em extrair informações financeiras de texto.
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
                    É imagem: false
                    Tipo sugerido: gasto`
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

              const dadosExtraidos = analiseGasto.object;
              if (!dadosExtraidos) {
                throw new Error("Falha ao extrair dados da entrada");
              }

              // Validar categoria baseada no tipo
              const categoriasGasto = ["Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Outros"];
              const categoriasEntrada = ["Salário", "Freelance", "Investimentos", "Presente", "Reembolso", "Outros"];

              let categoria = String(dadosExtraidos.categoria);
              if (dadosExtraidos.tipo === "gasto" && !categoriasGasto.includes(categoria)) {
                categoria = "Outros";
              } else if (dadosExtraidos.tipo === "entrada" && !categoriasEntrada.includes(categoria)) {
                categoria = "Outros";
              }

              const dadosCategorizados = {
                tipo: dadosExtraidos.tipo as "gasto" | "entrada",
                valor: Number(dadosExtraidos.valor),
                item: String(dadosExtraidos.item),
                quantidade: Number(dadosExtraidos.quantidade) || 1,
                estabelecimento: String(dadosExtraidos.estabelecimento || ""),
                data: String(dadosExtraidos.data),
                categoria: categoria,
                forma_pagamento: String(dadosExtraidos.forma_pagamento || ""),
                tags: [],
              };

              // Registrar o gasto diretamente no banco
              const db = await getDb(env);
              const novoRegistro = await db.insert(gastosTable).values({
                tipo: dadosCategorizados.tipo,
                valor: dadosCategorizados.valor,
                item: dadosCategorizados.item,
                quantidade: dadosCategorizados.quantidade,
                estabelecimento: dadosCategorizados.estabelecimento,
                data: dadosCategorizados.data,
                categoria: dadosCategorizados.categoria,
                forma_pagamento: dadosCategorizados.forma_pagamento,
                tags: JSON.stringify(dadosCategorizados.tags),
                created_at: new Date(),
              }).returning({ id: gastosTable.id });

              // Gerar mensagem de confirmação amigável
              const mensagemConfirmacao = `✅ **${dadosCategorizados.tipo === 'entrada' ? 'Entrada' : 'Gasto'} registrado com sucesso!**

💰 **Resumo do registro:**
• **Item:** ${dadosCategorizados.item}
• **Valor:** R$ ${dadosCategorizados.valor.toFixed(2)}
• **Estabelecimento:** ${dadosCategorizados.estabelecimento}
• **Data:** ${dadosCategorizados.data}
• **Categoria:** ${dadosCategorizados.categoria}
• **Forma de Pagamento:** ${dadosCategorizados.forma_pagamento}

📝 **ID do registro:** #${novoRegistro[0].id}

🎉 Seu ${dadosCategorizados.tipo === 'entrada' ? 'recebimento' : 'gasto'} foi salvo no sistema e está disponível para consultas e análises!`;

              resultado = {
                gasto_registrado: {
                  id: novoRegistro[0].id,
                  item: dadosCategorizados.item,
                  valor: dadosCategorizados.valor,
                  estabelecimento: dadosCategorizados.estabelecimento,
                  data: dadosCategorizados.data,
                  categoria: dadosCategorizados.categoria,
                  forma_pagamento: dadosCategorizados.forma_pagamento,
                  tags: dadosCategorizados.tags,
                  created_at: new Date().toISOString(),
                },
                mensagem_confirmacao: mensagemConfirmacao,
                sucesso: true,
                mensagem: `${dadosCategorizados.tipo === 'entrada' ? 'Entrada' : 'Gasto'} registrado com sucesso`
              };
            } catch (error) {
              console.error("Erro ao registrar gasto:", error);
              resultado = {
                sucesso: false,
                mensagem: `Erro ao registrar gasto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                erro_detalhes: error instanceof Error ? error.message : 'Erro desconhecido'
              };
            }
            break;

          case "RESPOSTA_DIRETA":
            const mensagemResposta = String(decisao.mensagem_clarificacao || "Entendi sua solicitação. Como posso ajudá-lo melhor?");

            if (!mensagemResposta.includes("opções disponíveis") && !mensagemResposta.includes("você pode")) {
              const opcoesCompletas = `
                ${mensagemResposta}

                📋 **Opções disponíveis:**

                💰 **Gestão de Gastos:**
                • "Registrar gasto: [descrição]" - Ex: "Registrar gasto: almoço R$ 25,50"
                • "Consultar gastos" - Ver todos os seus gastos
                • "Listar gastos" - Lista simples dos gastos

                📊 **Análises e Relatórios:**
                • "Gerar insights" - Análise financeira personalizada
                • "Analisar dados" - Relatório detalhado dos gastos
                • "Enviar relatório por email" - Receber relatório no email

                📷 **Processamento de Comprovantes:**
                • "Processar comprovante" - Analisar imagem de comprovante
                • "Verificar qualidade da imagem" - Verificar se a imagem é adequada

                🛠️ **Ferramentas de Teste:**
                • "Testar gmail" - Verificar integração com email
                • "Inserir dados de exemplo" - Adicionar dados para teste

                💡 **Dicas:**
                • Seja específico na descrição dos gastos
                • Para comprovantes, envie uma imagem clara
                • Use comandos diretos como "enviar email" ou "consultar gastos"
              `;

              resultado = {
                resposta: opcoesCompletas
              };
            } else {
              resultado = {
                resposta: mensagemResposta
              };
            }
            ferramentaExecutada = "RESPOSTA_DIRETA";
            break;

          default:
            resultado = {
              erro: "Ferramenta não reconhecida",
              ferramentas_disponiveis: [
                "ANALISAR_ENTRADA",
                "PROCESSAR_COMPROVANTE",
                "CONSULTAR_GASTOS",
                "ANALISAR_DADOS",
                "GERAR_INSIGHTS",
                "ENVIAR_EMAIL"
              ]
            };
        }

        return {
          acao_executada: String(decisao.acao_descricao),
          ferramenta_utilizada: ferramentaExecutada,
          resultado: resultado,
          sucesso: true,
          mensagem: `Ação executada com sucesso usando ${ferramentaExecutada}`,
          proximos_passos: [
            "Verificar resultado da execução",
            "Apresentar resposta ao usuário",
            "Solicitar feedback se necessário"
          ]
        };

      } catch (error) {
        console.error("❌ Erro ao processar entrada do usuário:", error);
        return {
          acao_executada: "ERRO_PROCESSAMENTO",
          ferramenta_utilizada: "NENHUMA",
          resultado: {
            erro: error instanceof Error ? error.message : "Erro desconhecido"
          },
          sucesso: false,
          mensagem: `Erro ao processar entrada: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          proximos_passos: [
            "Verificar logs de erro",
            "Tentar novamente com entrada diferente",
            "Solicitar reformulação da entrada"
          ]
        };
      }
    },
  });