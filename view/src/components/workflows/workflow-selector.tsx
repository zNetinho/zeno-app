import { Button } from "@/components/ui/button";

interface WorkflowSelectorProps {
  activeWorkflow: string;
  onWorkflowSelect: (workflow: string) => void;
}

export function WorkflowSelector({ activeWorkflow, onWorkflowSelect }: WorkflowSelectorProps) {
  const workflows = [
    {
      id: 'registro',
      title: '📝 Registro Simples',
      description: 'Analisar → Categorizar → Registrar'
    },
    {
      id: 'analise',
      title: '📊 Análise de Dados',
      description: 'Analisar → Gerar Insights'
    },
    {
      id: 'consulta',
      title: '🔍 Consulta de Gastos',
      description: 'Buscar por critérios'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {workflows.map((workflow) => (
        <Button
          key={workflow.id}
          onClick={() => onWorkflowSelect(workflow.id)}
          variant={activeWorkflow === workflow.id ? 'default' : 'outline'}
          className="h-20 bg-neutral-700 border-slate-700 hover:bg-neutral-600 text-white"
        >
          <div className="text-center">
            <div className="font-semibold text-white">{workflow.title}</div>
            <div className="text-xs opacity-80 text-slate-200">{workflow.description}</div>
          </div>
        </Button>
      ))}
    </div>
  );
}
