import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2 } from "lucide-react";

interface Gasto {
  id: number;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  estabelecimento?: string;
  forma_pagamento?: string;
  tags?: string[];
  tipo: "gasto" | "entrada";
}

interface GastosListProps {
  gastos: Gasto[];
  isLoading: boolean;
  onEdit: (gasto: Gasto) => void;
  onDelete: (id: number) => void;
}

export function GastosList({ gastos, isLoading, onEdit, onDelete }: GastosListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-neutral-700 p-4 rounded-lg border border-slate-700 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="h-4 bg-slate-600 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-600 rounded w-1/2"></div>
              </div>
              <div className="h-6 bg-slate-600 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (gastos.length === 0) {
    return (
      <Card className="bg-neutral-700 border-slate-700">
        <CardContent className="p-8 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Nenhum gasto registrado
          </h3>
          <p className="text-slate-400">
            Comece adicionando seu primeiro gasto usando o botão + abaixo
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-h-[calc(100vh-10rem)] overflow-y-auto" style={{ scrollbarWidth: "thin"  }}>
      {gastos.map((gasto) => (
        <Card key={gasto.id} className="bg-neutral-700 border-slate-700 hover:bg-neutral-600 transition-colors">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-white">{gasto.descricao}</h3>
                  <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
                    {gasto.categoria}
                  </span>
                </div>
                
                <div className="text-sm text-neutral-200 space-y-1">
                  {gasto.estabelecimento && (
                    <div>🏪 {gasto.estabelecimento}</div>
                  )}
                  <div>📅 {new Date(gasto.data).toLocaleDateString('pt-BR')}</div>
                  {gasto.forma_pagamento && (
                    <div>💳 {gasto.forma_pagamento}</div>
                  )}
                  {gasto.tags && gasto.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {gasto.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-slate-600 text-slate-300 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2 ml-4">
                <div className={`text-xl font-bold ${gasto.tipo === 'entrada' ? "text-green-400" : "text-red-400"}`}>
                  {gasto.tipo === 'entrada' ? "+" : "-"} R$ {gasto.valor.toFixed(2)}
                </div>
                
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(gasto)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-600"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(gasto.id)}
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
