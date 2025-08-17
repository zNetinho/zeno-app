import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEnviarEmail } from "@/lib/hooks";
import { useState } from "react";

interface WorkflowResultProps {
  result: any;
  onClear: () => void;
}

export function WorkflowResult({ result, onClear }: WorkflowResultProps) {
  const enviarEmail = useEnviarEmail();
  const [emailDestino, setEmailDestino] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);

  const handleEnviarRelatorioPorEmail = async () => {
    if (!result || !result.relatorio) {
      alert("Nenhum relatório disponível para enviar");
      return;
    }

    // Se não há email específico, mostrar input
    if (!emailDestino && !showEmailInput) {
      setShowEmailInput(true);
      return;
    }

    try {
      const emailResult = await enviarEmail.mutateAsync({
        insights: result.relatorio,
        periodo: result.relatorio.periodo || "Período atual",
        total_gasto: result.relatorio.total_gastos || 0,
        email_destino: emailDestino || undefined, // Enviar apenas se especificado
      }) as any;

      if (emailResult.sucesso) {
        alert("Relatório enviado com sucesso!");
        setShowEmailInput(false);
        setEmailDestino("");
      } else {
        alert("Erro ao enviar relatório: " + emailResult.mensagem);
      }
    } catch (error) {
      alert("Erro ao enviar relatório: " + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  if (!result) return null;

  if (result.error) {
    return (
      <Card className="bg-neutral-700 border-slate-700">
        <CardHeader>
          <CardTitle className="text-red-400">❌ Erro</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-300 mb-4">{result.error}</p>
          <Button onClick={onClear} className="bg-red-600 hover:bg-red-500 text-white">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-neutral-700 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">📋 Resultado</CardTitle>
        <CardDescription className="text-slate-200">
          {result.mensagem || "Operação concluída com sucesso"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dados Registrados */}
        {result.dados_registrados && (
          <div>
            <h4 className="font-semibold text-white mb-2">📝 Dados Registrados:</h4>
            <div className="bg-slate-800 p-3 rounded-lg">
              <p className="text-slate-200">
                <strong>Descrição:</strong> {result.dados_registrados.descricao}
              </p>
              <p className="text-slate-200">
                <strong>Valor:</strong> R$ {result.dados_registrados.valor}
              </p>
              <p className="text-slate-200">
                <strong>Categoria:</strong> {result.dados_registrados.categoria}
              </p>
              <p className="text-slate-200">
                <strong>Data:</strong> {result.dados_registrados.data}
              </p>
            </div>
          </div>
        )}

        {/* Gastos Encontrados */}
        {result.gastos_encontrados && result.gastos_encontrados.length > 0 && (
          <div>
            <h4 className="font-semibold text-white mb-2">🔍 Gastos Encontrados ({result.gastos_encontrados.length}):</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {result.gastos_encontrados.map((gasto: any, index: number) => (
                <div key={index} className="bg-slate-800 p-3 rounded-lg">
                  <p className="text-slate-200">
                    <strong>Descrição:</strong> {gasto.descricao}
                  </p>
                  <p className="text-slate-200">
                    <strong>Valor:</strong> R$ {gasto.valor}
                  </p>
                  <p className="text-slate-200">
                    <strong>Categoria:</strong> {gasto.categoria}
                  </p>
                  <p className="text-slate-200">
                    <strong>Data:</strong> {gasto.data}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relatório */}
        {result.relatorio && (
          <div>
            <h4 className="font-semibold text-white mb-2">📊 Relatório:</h4>
            <div className="bg-slate-800 p-3 rounded-lg">
              <p className="text-slate-200">
                <strong>Total de Gastos:</strong> R$ {result.relatorio.total_gastos}
              </p>
              <p className="text-slate-200">
                <strong>Quantidade:</strong> {result.relatorio.quantidade_gastos}
              </p>
              <p className="text-slate-200">
                <strong>Média:</strong> R$ {result.relatorio.media_gastos}
              </p>
            </div>
          </div>
        )}

        {/* Insights */}
        {result.insights && (
          <div>
            <h4 className="font-semibold text-white mb-2">💡 Insights:</h4>
            <div className="bg-slate-800 p-3 rounded-lg">
              <p className="text-slate-200">{result.insights}</p>
            </div>
          </div>
        )}

        {/* Campo de Email (quando necessário) */}
        {showEmailInput && (
          <div className="bg-slate-800 p-4 rounded-lg">
            <Label htmlFor="email" className="text-slate-200 mb-2 block">
              📧 Email de destino (opcional - deixe vazio para usar email padrão):
            </Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={emailDestino}
                onChange={(e) => setEmailDestino(e.target.value)}
                className="flex-1 bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
              />
              <Button
                onClick={handleEnviarRelatorioPorEmail}
                disabled={enviarEmail.isPending}
                className="bg-green-600 hover:bg-green-500 text-white"
              >
                {enviarEmail.isPending ? 'Enviando...' : 'Enviar'}
              </Button>
              <Button
                onClick={() => {
                  setShowEmailInput(false);
                  setEmailDestino("");
                }}
                variant="outline"
                className="bg-neutral-700 border-slate-600 text-slate-200 hover:bg-neutral-600"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-2 pt-4">
          {result.relatorio && !showEmailInput && (
            <Button
              onClick={handleEnviarRelatorioPorEmail}
              disabled={enviarEmail.isPending}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              {enviarEmail.isPending ? 'Enviando...' : '📧 Enviar por Email'}
            </Button>
          )}
          <Button onClick={onClear} className="bg-gray-600 hover:bg-gray-500 text-white">
            Limpar Resultado
          </Button>
        </div>

        {/* Debug Info */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-slate-300 hover:text-white">
            🔍 Ver dados completos (JSON)
          </summary>
          <pre className="bg-slate-800 p-4 rounded-lg overflow-auto text-sm mt-2 text-slate-200">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
