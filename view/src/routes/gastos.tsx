import { ChatWidget } from "@/components/chat-widget";
import { DecoButton } from "@/components/deco-button";
import { GastoModal } from "@/components/gasto-modal";
import {
  GastosFilters,
  GastosHeader,
  GastosList
} from "@/components/gastos";
import { useDeleteGasto, useListarGastos, useOptionalUser } from "@/lib/hooks";
import { createRoute, type RootRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

export default (rootRoute: RootRoute) => createRoute({
  getParentRoute: () => rootRoute,
  component: GastosPage,
  path: "/",
});

function GastosPage() {
  const { data: user } = useOptionalUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<any>(null);
  const [filters, setFilters] = useState({
    search: "",
    categoria: "todas",
    dataInicio: "",
    dataFim: "",
    valorMin: "",
    valorMax: ""
  });

  // Hooks
  const listarGastos = useListarGastos();
  const deleteGasto = useDeleteGasto();

  // Handlers
  const handleOpenModal = () => {
    setEditingGasto(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGasto(null);
  };

  const handleGastoSuccess = () => {
    listarGastos.refetch();
  };

  const handleEditGasto = (gasto: any) => {
    setEditingGasto(gasto);
    setIsModalOpen(true);
  };

  const handleDeleteGasto = (gastoId: number) => {
    if (confirm("Tem certeza que deseja remover este gasto?")) {
      deleteGasto.mutate(gastoId, {
        onSuccess: () => {
          listarGastos.refetch();
        }
      });
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      categoria: "todas",
      dataInicio: "",
      dataFim: "",
      valorMin: "",
      valorMax: ""
    });
  };

  const handleChatMessage = (message: string) => {
    if (message.toLowerCase().includes("gastos") ||
      message.toLowerCase().includes("consulta") ||
      message.toLowerCase().includes("listar")) {
      setTimeout(() => {
        listarGastos.refetch();
      }, 1000);
    }
  };

  useEffect(() => {
    listarGastos.refetch();
  }, []);

  const gastos = listarGastos.data?.gastos || [];
  const totalGastos = gastos.length;
  const saldoTotal = listarGastos.data?.saldo || 0;

  const categorias = [...new Set(gastos.map((gasto: any) => gasto.categoria).filter(Boolean))] as string[];

  // Mostrar mensagem de erro se houver
  if (listarGastos.error) {
    console.error("Erro ao carregar gastos:", listarGastos.error);
  }

  const filteredGastos = gastos.filter((gasto: any) => {
    if (filters.search && !gasto.descricao.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.categoria && filters.categoria !== "todas" && gasto.categoria !== filters.categoria) {
      return false;
    }
    if (filters.dataInicio && new Date(gasto.data) < new Date(filters.dataInicio)) {
      return false;
    }
    if (filters.dataFim && new Date(gasto.data) > new Date(filters.dataFim)) {
      return false;
    }
    if (filters.valorMin && gasto.valor < parseFloat(filters.valorMin)) {
      return false;
    }
    if (filters.valorMax && gasto.valor > parseFloat(filters.valorMax)) {
      return false;
    }
    return true;
  });



  return (
    <div className="bg-neutral-600 min-h-screen p-4 sm:p-6">
      {user ? (
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <GastosHeader
            totalGastos={totalGastos}
            saldoTotal={saldoTotal}
            onRefresh={() => listarGastos.refetch()}
            isLoading={listarGastos.isLoading}
          />

          {/* Filtros */}
          <GastosFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            categorias={categorias}
          />

          {/* Lista de Gastos */}
          <GastosList
            gastos={filteredGastos}
            isLoading={listarGastos.isLoading}
            onEdit={handleEditGasto}
            onDelete={handleDeleteGasto}
          />

          {/* Botão Flutuante */}
          <button
            onClick={handleOpenModal}
            className="fixed bottom-28 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-50"
            aria-label="Adicionar novo registro"
          >
            <Plus className="w-6 h-6" />
          </button>

          {/* Modal de Registro */}
          <GastoModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSuccess={handleGastoSuccess}
            gastoToEdit={editingGasto}
          />

          {/* Chat Widget Flutuante */}
          <ChatWidget onSendMessage={handleChatMessage} />
        </div>
      ) : (
        <div className="w-full h-max flex flex-col items-center justify-center">
          <h2 className="text-sm font-medium text-slate-400">
            The content below is only visible for authenticated users
          </h2>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <h3 className="text-sm font-medium text-white mb-2">Login Required</h3>
            <p className="text-xs text-slate-400 mb-3">
              Sign in to access authenticated features.
            </p>
            <DecoButton />
          </div>
        </div>
      )}
    </div>
  );
}
