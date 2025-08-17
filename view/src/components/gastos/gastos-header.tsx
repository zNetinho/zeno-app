import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface GastosHeaderProps {
  totalGastos: number;
  saldoTotal: number;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function GastosHeader({ totalGastos, saldoTotal, onRefresh, isLoading }: GastosHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
        💰 Gestão de Gastos
      </h1>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm sm:text-base text-slate-200">
          Controle seus gastos e mantenha suas finanças organizadas
        </p>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="bg-blue-500 border-blue-600 text-slate-200 hover:bg-sky-500 transition-all duration-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Carregando...' : 'Recarregar'}
          </Button>
        )}
      </div>
      
      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-neutral-700 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total de Registros</p>
              <p className="text-2xl font-bold text-white">{totalGastos}</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>
        
        <div className="bg-neutral-700 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Saldos</p>
              <p className={`text-2xl font-bold ${saldoTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                R$ {saldoTotal.toFixed(2)}
              </p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>
      </div>
    </div>
  );
}
