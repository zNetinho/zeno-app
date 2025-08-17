import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConsultarGastos } from "@/lib/hooks";

interface ConsultaWorkflowProps {
  onResult: (result: any) => void;
}

export function ConsultaWorkflow({ onResult }: ConsultaWorkflowProps) {
  const [consultaData, setConsultaData] = useState({
    criterio: "todos" as "todos" | "categoria" | "valor" | "data" | "descricao",
    valor: "",
    categoria: "todas",
    data_inicio: "",
    data_fim: "",
    valor_min: "",
    valor_max: ""
  });

  const consultarGastos = useConsultarGastos();

  const executeConsultaWorkflow = async (data: any) => {
    try {
      onResult(null);

      const consultaResult = await consultarGastos.mutateAsync(data) as any;
      if (!consultaResult.sucesso) {
        throw new Error(consultaResult.mensagem);
      }

      onResult({
        resultado: consultaResult,
        gastos_encontrados: consultaResult.gastos || []
      });
    } catch (error) {
      onResult({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeConsultaWorkflow(consultaData);
  };

  return (
    <Card className="bg-neutral-700 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">🔍 Consulta de Gastos</CardTitle>
        <CardDescription className="text-slate-200">
          Busca gastos por diferentes critérios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="criterio">Critério de Busca</Label>
            <Select 
              value={consultaData.criterio} 
              onValueChange={(value) => setConsultaData({ ...consultaData, criterio: value as any })}
            >
              <SelectTrigger className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0">
                <SelectValue className="text-neutral-900" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0">
                <SelectItem value="todos">Todos os Gastos</SelectItem>
                <SelectItem value="categoria">Por Categoria</SelectItem>
                <SelectItem value="valor">Por Valor</SelectItem>
                <SelectItem value="data">Por Data</SelectItem>
                <SelectItem value="descricao">Por Descrição</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {consultaData.criterio === 'categoria' && (
            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                placeholder="Ex: Transporte, Alimentação, Lazer"
                value={consultaData.categoria}
                onChange={(e) => setConsultaData({ ...consultaData, categoria: e.target.value })}
                className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
              />
            </div>
          )}

          {consultaData.criterio === 'valor' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valor_min">Valor Mínimo</Label>
                <Input
                  id="valor_min"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={consultaData.valor_min}
                  onChange={(e) => setConsultaData({ ...consultaData, valor_min: e.target.value })}
                  className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
                />
              </div>
              <div>
                <Label htmlFor="valor_max">Valor Máximo</Label>
                <Input
                  id="valor_max"
                  type="number"
                  step="0.01"
                  placeholder="1000.00"
                  value={consultaData.valor_max}
                  onChange={(e) => setConsultaData({ ...consultaData, valor_max: e.target.value })}
                  className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
                />
              </div>
            </div>
          )}

          {consultaData.criterio === 'data' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_inicio">Data Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={consultaData.data_inicio}
                  onChange={(e) => setConsultaData({ ...consultaData, data_inicio: e.target.value })}
                  className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
                />
              </div>
              <div>
                <Label htmlFor="data_fim">Data Fim</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={consultaData.data_fim}
                  onChange={(e) => setConsultaData({ ...consultaData, data_fim: e.target.value })}
                  className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
                />
              </div>
            </div>
          )}

          {consultaData.criterio === 'descricao' && (
            <div>
              <Label htmlFor="valor">Palavra-chave</Label>
              <Input
                id="valor"
                placeholder="Ex: Uber, restaurante, shopping"
                value={consultaData.valor}
                onChange={(e) => setConsultaData({ ...consultaData, valor: e.target.value })}
                className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
              />
            </div>
          )}

          <Button 
            type="submit" 
            disabled={consultarGastos.isPending} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
          >
            {consultarGastos.isPending ? 'Consultando...' : 'Executar Consulta'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
