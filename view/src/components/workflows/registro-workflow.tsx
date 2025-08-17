import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAnalisarEntrada, useCategorizarGastos, useRegistrarGasto } from "@/lib/hooks";

interface RegistroWorkflowProps {
  onResult: (result: any) => void;
}

export function RegistroWorkflow({ onResult }: RegistroWorkflowProps) {
  const [registroData, setRegistroData] = useState({
    entrada: "",
    tipo_entrada: "texto" // "texto" ou "imagem"
  });

  const analisarEntrada = useAnalisarEntrada();
  const categorizarGastos = useCategorizarGastos();
  const registrarGasto = useRegistrarGasto();

  const executeRegistroWorkflow = async (data: { entrada: string; is_imagem: boolean }) => {
    try {
      onResult(null);

      const analiseResult = await analisarEntrada.mutateAsync(data) as any;
      if (!analiseResult.sucesso) {
        throw new Error(analiseResult.mensagem);
      }

      const categorizacaoResult = await categorizarGastos.mutateAsync({
        dados: analiseResult.dados_extraidos
      }) as any;
      if (!categorizacaoResult.sucesso) {
        throw new Error(categorizacaoResult.mensagem);
      }

      const registroResult = await registrarGasto.mutateAsync({
        dados: categorizacaoResult.dados_categorizados
      }) as any;
      if (!registroResult.sucesso) {
        throw new Error(registroResult.mensagem);
      }

      onResult({
        resultado: registroResult,
        dados_registrados: categorizacaoResult.dados_categorizados
      });
    } catch (error) {
      onResult({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      entrada: registroData.entrada,
      is_imagem: registroData.tipo_entrada === "imagem"
    };
    executeRegistroWorkflow(data);
  };

  return (
    <Card className="bg-neutral-700 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">📝 Registro Simples de Gasto</CardTitle>
        <CardDescription className="text-slate-200">
          Digite o gasto ou faça upload de uma imagem. O sistema analisará automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tipo_entrada">Tipo de Entrada</Label>
            <Select 
              value={registroData.tipo_entrada} 
              onValueChange={(value) => setRegistroData({ ...registroData, tipo_entrada: value })}
            >
              <SelectTrigger className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0">
                <SelectValue className="text-neutral-900" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0">
                <SelectItem value="texto">📝 Texto</SelectItem>
                <SelectItem value="imagem">🖼️ Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {registroData.tipo_entrada === 'texto' ? (
            <div>
              <Label htmlFor="entrada">Descrição do Gasto</Label>
              <Textarea
                id="entrada"
                placeholder="Ex: Gastei R$ 35,00 no Uber hoje para ir ao trabalho"
                value={registroData.entrada}
                onChange={(e) => setRegistroData({ ...registroData, entrada: e.target.value })}
                required
                className="min-h-[100px] bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="entrada">Descrição da Imagem</Label>
              <Textarea
                id="entrada"
                placeholder="Descreva o que vê na imagem: Ex: Comprovante do Uber mostrando R$ 35,00"
                value={registroData.entrada}
                onChange={(e) => setRegistroData({ ...registroData, entrada: e.target.value })}
                required
                className="min-h-[100px] bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
              />
              <p className="text-sm text-slate-300 mt-2">
                💡 Dica: Descreva detalhadamente o que vê na imagem para melhor análise
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={analisarEntrada.isPending || categorizarGastos.isPending || registrarGasto.isPending} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
          >
            {analisarEntrada.isPending || categorizarGastos.isPending || registrarGasto.isPending ? 'Analisando...' : 'Analisar e Registrar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
