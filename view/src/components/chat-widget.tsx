import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Minimize2, Bot, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProcessarEntradaUsuario } from "@/lib/hooks";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  isLoading?: boolean;
  data?: any;
}

interface ChatWidgetProps {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  onSendMessage?: (message: string) => void;
  initialMessages?: Message[];
  enableAI?: boolean;
}

export function ChatWidget({
  title = "Chat de Suporte",
  subtitle = "Como posso ajudar você hoje?",
  placeholder = "Digite sua mensagem...",
  onSendMessage,
  initialMessages = [],
  enableAI = true,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  
  // Ref para a área de mensagens para scroll automático
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const processarEntrada = useProcessarEntradaUsuario();

  // Função para scroll automático para o final
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Effect para scroll automático sempre que as mensagens mudarem
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    // Call external handler if provided
    if (onSendMessage) {
      onSendMessage(inputValue);
    }

    // Se AI está habilitada, processar com a ferramenta
    if (enableAI) {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "",
        sender: "bot",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages(prev => [...prev, botMessage]);

      try {
        const resultado = await processarEntrada.mutateAsync({
          entrada: inputValue,
          contexto: "Chat de suporte - usuário solicitando ajuda"
        });

        // Atualizar a mensagem do bot com o resultado
        setMessages(prev => prev.map(msg => 
          msg.id === botMessage.id 
            ? {
                ...msg,
                text: formatarResposta(resultado),
                isLoading: false,
                data: resultado
              }
            : msg
        ));
      } catch (error) {
        console.error("Erro ao processar entrada:", error);
        
        // Atualizar com mensagem de erro
        setMessages(prev => prev.map(msg => 
          msg.id === botMessage.id 
            ? {
                ...msg,
                text: "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.",
                isLoading: false
              }
            : msg
        ));
      }
    } else {
      // Resposta padrão se AI não estiver habilitada
      setTimeout(() => {
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "Obrigado pela sua mensagem! Nossa equipe responderá em breve.",
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);
      }, 1000);
    }
  };

  const formatarResposta = (resultado: any): string => {
    if (!resultado.sucesso) {
      return `❌ Erro: ${resultado.mensagem}`;
    }

    switch (resultado.ferramenta_utilizada) {
      case "ANALISAR_ENTRADA":
        const dados = resultado.resultado.dados_extraidos;
        return `✅ Gasto analisado com sucesso!\n\n💰 Valor: R$ ${dados.valor.toFixed(2)}\n📝 Item: ${dados.item}\n🏪 Estabelecimento: ${dados.estabelecimento}\n📅 Data: ${dados.data}\n🏷️ Categoria: ${dados.categoria}`;

      case "CONSULTAR_GASTOS":
        const consulta = resultado.resultado;
        if (consulta.gastos && consulta.gastos.length > 0) {
          return `📊 Resumo dos seus gastos:\n\n📈 Total de gastos: ${consulta.total_gastos}\n💰 Valor total: R$ ${consulta.total_valor.toFixed(2)}\n\n${consulta.media_por_categoria.length > 0 ? '📋 Média por categoria:\n' + consulta.media_por_categoria.map((cat: any) => `• ${cat.categoria}: R$ ${cat.media.toFixed(2)}`).join('\n') : ''}\n\n📋 Últimos gastos:\n${consulta.gastos.slice(0, 3).map((gasto: any) => `• ${gasto.item} - R$ ${gasto.valor.toFixed(2)} (${gasto.categoria})`).join('\n')}`;
        } else {
          return `📊 Resumo dos seus gastos:\n\n📈 Total de gastos: ${consulta.total_gastos}\n💰 Valor total: R$ ${consulta.total_valor.toFixed(2)}\n\n💡 Você ainda não tem gastos registrados. Use o botão "Dados Exemplo" para inserir alguns gastos de teste ou registre seu primeiro gasto!`;
        }

      case "ANALISAR_DADOS":
        const relatorio = resultado.resultado.relatorio;
        return `📈 Relatório gerado!\n\n📅 Período: ${relatorio.periodo}\n💰 Total gasto: R$ ${relatorio.total_gasto.toFixed(2)}\n\n${relatorio.insights.length > 0 ? '💡 Insights:\n' + relatorio.insights.map((insight: string) => `• ${insight}`).join('\n') : ''}`;

      case "GERAR_INSIGHTS":
        const insights = resultado.resultado.insights_simples;
        return `💡 Insights financeiros:\n\n📝 ${insights.resumo}\n\n${insights.recomendacoes.length > 0 ? '🎯 Recomendações:\n' + insights.recomendacoes.map((rec: string) => `• ${rec}`).join('\n') : ''}`;

      case "ENVIAR_EMAIL":
        return `📧 ${resultado.resultado.mensagem}\n\n📮 Destinatário: ${resultado.resultado.detalhes_envio.destinatario}\n📋 Assunto: ${resultado.resultado.detalhes_envio.assunto}`;

      case "RESPOSTA_DIRETA":
        return resultado.resultado.resposta;

      case "SOLICITAR_CLARIFICACAO":
        return `❓ ${resultado.resultado.mensagem_clarificacao}`;

      default:
        return `✅ ${resultado.mensagem}\n\n🔧 Ferramenta utilizada: ${resultado.ferramenta_utilizada}`;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setIsMinimized(false);
    }
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  const expandChat = () => {
    setIsMinimized(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={toggleChat}
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {enableAI ? (
            <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </Button>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <Card className="w-96 h-auto bg-neutral-700 border-slate-700 shadow-2xl">
          {/* Header */}
          <CardHeader className="pb-3 bg-neutral-600 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {enableAI ? (
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                ) : (
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                )}
                <CardTitle className="text-xs sm:text-sm font-semibold text-slate-100">
                  {enableAI ? "Assistente IA" : title}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isMinimized ? expandChat : minimizeChat}
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-slate-200 hover:text-slate-100"
                >
                  <Minimize2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleChat}
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-slate-200 hover:text-slate-100"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-200">
              {enableAI ? "Pergunte sobre gastos, relatórios, insights..." : subtitle}
            </p>
          </CardHeader>

          {/* Chat Content */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <CardContent className="flex-1 p-3 sm:p-4 h-56 sm:h-64 overflow-y-auto space-y-2 sm:space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-200 text-xs sm:text-sm py-6 sm:py-8">
                    {enableAI ? (
                      <>
                        <Bot className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                        <p>Olá! Sou seu assistente de gastos</p>
                        <p className="text-xs">Pergunte sobre relatórios, insights, consultas...</p>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma mensagem ainda</p>
                        <p className="text-xs">Seja o primeiro a enviar uma mensagem!</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm ${
                            message.sender === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-neutral-600 text-slate-100"
                          }`}
                        >
                          {message.isLoading ? (
                            <div className="flex items-center gap-2">
                              <Loader className="h-3 w-3 animate-spin" />
                              <span>Processando...</span>
                            </div>
                          ) : (
                            <>
                              <p className="break-words whitespace-pre-line">{message.text}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {message.timestamp.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Elemento invisível para scroll automático */}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </CardContent>

              {/* Input */}
              <div className="p-3 sm:p-4 border-t border-slate-700">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={enableAI ? "Ex: Mostre meus gastos, gere um relatório..." : placeholder}
                    className="flex-1 text-xs sm:text-sm"
                    disabled={processarEntrada.isPending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || processarEntrada.isPending}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-500 h-8 sm:h-9 px-2 sm:px-3"
                  >
                    {processarEntrada.isPending ? (
                      <Loader className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
