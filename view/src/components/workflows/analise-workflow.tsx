import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAnalisarDados, useGerarInsights } from "@/lib/hooks";

interface AnaliseWorkflowProps {
  onResult: (result: any) => void;
}

export function AnaliseWorkflow({ onResult }: AnaliseWorkflowProps) {
  const [analiseData, setAnaliseData] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    tipo_periodo: "mensal" as "mensal" | "semanal" | "trimestral"
  });

  const analisarDados = useAnalisarDados();
  const gerarInsights = useGerarInsights();

  const executeAnaliseWorkflow = async (data: { mes: number; ano: number; tipo_periodo: "mensal" | "semanal" | "trimestral" }) => {
    try {
      onResult(null);

      // Step 1: Analisar dados
      const analiseResult = await analisarDados.mutateAsync(data) as any;
      if (!analiseResult.sucesso) {
        throw new Error(analiseResult.mensagem);
      }

      // Step 2: Gerar insights
      const insightsResult = await gerarInsights.mutateAsync({
        relatorio: analiseResult.relatorio
      }) as any;
      if (!insightsResult.sucesso) {
        throw new Error(insightsResult.mensagem);
      }

      const resultadoFinal = {
        relatorio: analiseResult.relatorio,
        insights: insightsResult.insights_simples,
        sucesso: true,
        mensagem: "Análise concluída com sucesso"
      };

      onResult(resultadoFinal);
    } catch (error) {
      onResult({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeAnaliseWorkflow(analiseData);
  };

  return (
    <Card className="bg-neutral-700 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">📊 Análise de Dados</CardTitle>
        <CardDescription className="text-slate-200">
          Gera relatório mensal com insights automáticos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="mes">Mês</Label>
              <Select 
                value={analiseData.mes.toString()} 
                onValueChange={(value) => setAnaliseData({ ...analiseData, mes: parseInt(value) })}
              >
                <SelectTrigger className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0">
                  <SelectValue className="text-neutral-900" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                    <SelectItem key={mes} value={mes.toString()}>{mes}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ano">Ano</Label>
              <Input
                id="ano"
                type="number"
                value={analiseData.ano}
                onChange={(e) => setAnaliseData({ ...analiseData, ano: parseInt(e.target.value) })}
                min="2020"
                max="2030"
                className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
              />
            </div>

            <div>
              <Label htmlFor="periodo">Tipo de Período</Label>
              <Select 
                value={analiseData.tipo_periodo} 
                onValueChange={(value) => setAnaliseData({ ...analiseData, tipo_periodo: value as any })}
              >
                <SelectTrigger className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0">
                  <SelectValue className="text-neutral-900" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0">
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={analisarDados.isPending || gerarInsights.isPending} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
          >
            {analisarDados.isPending || gerarInsights.isPending ? 'Analisando...' : 'Executar Análise'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
