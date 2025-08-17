import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface GastosFiltersProps {
  filters: {
    search: string;
    categoria: string;
    dataInicio: string;
    dataFim: string;
    valorMin: string;
    valorMax: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  categorias: string[];
}

export function GastosFilters({ 
  filters, 
  onFilterChange, 
  onClearFilters, 
  categorias 
}: GastosFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="bg-neutral-700 rounded-lg border border-slate-700 mb-6 overflow-hidden">
      {/* Accordion Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-600 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-slate-400" />
          <h3 className="font-semibold text-white">Filtros</h3>
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              Ativo
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClearFilters();
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
          <div className="text-slate-400">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* Accordion Content */}
      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Busca */}
        <div>
          <Label htmlFor="search" className="text-slate-300">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="search"
              placeholder="Descrição, estabelecimento..."
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="pl-10 bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
            />
          </div>
        </div>

        {/* Categoria */}
        <div>
          <Label htmlFor="categoria" className="text-slate-300">Categoria</Label>
          <Select 
            value={filters.categoria} 
            onValueChange={(value) => onFilterChange('categoria', value)}
          >
            <SelectTrigger className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
                         <SelectContent className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0">
               <SelectItem value="todas">Todas as categorias</SelectItem>
               {categorias.map((categoria) => (
                 <SelectItem key={categoria} value={categoria}>
                   {categoria}
                 </SelectItem>
               ))}
             </SelectContent>
          </Select>
        </div>

        {/* Data Início */}
        <div>
          <Label htmlFor="dataInicio" className="text-slate-300">Data Início</Label>
          <Input
            id="dataInicio"
            type="date"
            value={filters.dataInicio}
            onChange={(e) => onFilterChange('dataInicio', e.target.value)}
            className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
          />
        </div>

        {/* Data Fim */}
        <div>
          <Label htmlFor="dataFim" className="text-slate-300">Data Fim</Label>
          <Input
            id="dataFim"
            type="date"
            value={filters.dataFim}
            onChange={(e) => onFilterChange('dataFim', e.target.value)}
            className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
          />
        </div>

        {/* Valor Mínimo */}
        <div>
          <Label htmlFor="valorMin" className="text-slate-300">Valor Mínimo</Label>
          <Input
            id="valorMin"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={filters.valorMin}
            onChange={(e) => onFilterChange('valorMin', e.target.value)}
            className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
          />
        </div>

        {/* Valor Máximo */}
        <div>
          <Label htmlFor="valorMax" className="text-slate-300">Valor Máximo</Label>
          <Input
            id="valorMax"
            type="number"
            step="0.01"
            placeholder="1000.00"
            value={filters.valorMax}
            onChange={(e) => onFilterChange('valorMax', e.target.value)}
            className="bg-neutral-200 border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:ring-0 focus:ring-offset-0"
          />
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
