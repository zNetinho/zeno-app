import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Receipt,
  Loader,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import {
  useProcessarComprovante,
  useVerificarQualidadeImagem,
  useAnalisarEntrada,
  useCategorizarGastos,
  useRegistrarGasto,
  useRegistrarGastoConfirmado,
  useUpdateGasto,
} from "@/lib/hooks";

interface GastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  gastoToEdit?: {
    id: number;
    tipo: "gasto" | "entrada";
    valor: number;
    item: string;
    quantidade: number;
    estabelecimento: string;
    data: string;
    categoria: string;
    forma_pagamento: string;
    tags: string[];
  };
}

export function GastoModal({ isOpen, onClose, onSuccess, gastoToEdit }: GastoModalProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [descricaoAdicional, setDescricaoAdicional] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<any>(null);
  const [showConfirmationButtons, setShowConfirmationButtons] = useState(false);
  const [pendingGastoData, setPendingGastoData] = useState<any>(null);

  // Estados para entrada manual
  const [activeTab, setActiveTab] = useState<"ocr" | "manual">("ocr");
  const [tipoRegistro, setTipoRegistro] = useState<"gasto" | "entrada">("gasto");
  const [manualGasto, setManualGasto] = useState({
    valor: "",
    item: "",
    estabelecimento: "",
    categoria: "Alimentação",
    forma_pagamento: "Não informado",
    data: new Date().toISOString().split('T')[0],
  });
  const [isProcessingManual, setIsProcessingManual] = useState(false);
  const [manualResult, setManualResult] = useState<any>(null);

  // Hooks
  const processarComprovante = useProcessarComprovante();
  const verificarQualidade = useVerificarQualidadeImagem();
  const analisarEntrada = useAnalisarEntrada();
  const categorizarGastos = useCategorizarGastos();
  const registrarGasto = useRegistrarGasto();
  const registrarGastoConfirmado = useRegistrarGastoConfirmado();
  const updateGasto = useUpdateGasto();

  // Categorias baseadas no tipo de registro
  const categoriasGasto = ["Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Outros"];
  const categoriasEntrada = ["Salário", "Freelance", "Investimentos", "Presente", "Reembolso", "Outros"];
  const formasPagamento = ["Dinheiro", "Cartão de Crédito", "Cartão de Débito", "PIX", "Transferência", "Boleto"];

  // Preencher dados quando estiver editando
  useEffect(() => {
    if (gastoToEdit) {
      setTipoRegistro(gastoToEdit.tipo);
      setManualGasto({
        valor: gastoToEdit.valor.toString(),
        item: gastoToEdit.item,
        estabelecimento: gastoToEdit.estabelecimento,
        categoria: gastoToEdit.categoria,
        forma_pagamento: gastoToEdit.forma_pagamento,
        data: gastoToEdit.data,
      });
      setActiveTab("manual"); // Forçar aba manual quando editando
    } else {
      // Reset para valores padrão quando não estiver editando
      setTipoRegistro("gasto");
      setManualGasto({
        valor: "",
        item: "",
        estabelecimento: "",
        categoria: "Alimentação",
        forma_pagamento: "Não informado",
        data: new Date().toISOString().split('T')[0],
      });
    }
  }, [gastoToEdit]);

  const getCategoriasAtuais = () => {
    return tipoRegistro === "entrada" ? categoriasEntrada : categoriasGasto;
  };

  const handleTipoChange = (novoTipo: "gasto" | "entrada") => {
    setTipoRegistro(novoTipo);
    // Reset category to appropriate default
    setManualGasto(prev => ({
      ...prev,
      categoria: novoTipo === "entrada" ? "Salário" : "Alimentação"
    }));
  };

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setProcessResult(null);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setProcessResult(null);
    setDescricaoAdicional("");
    setShowConfirmationButtons(false);
    setPendingGastoData(null);
  };

  const handleProcessImage = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    try {
      const imageUrl = imagePreview || "";

      await verificarQualidade.mutateAsync({ imagem_url: imageUrl });

      const result = await processarComprovante.mutateAsync({
        imagem_url: imageUrl,
        descricao_adicional: descricaoAdicional,
      });

      setProcessResult(result);
      setPendingGastoData(result.dados_extraidos);
      setShowConfirmationButtons(true);
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmarRegistro = async () => {
    if (!pendingGastoData) return;

    try {
      const result = await registrarGastoConfirmado.mutateAsync({
        dados: pendingGastoData
      });

      if (result.sucesso) {
        setShowConfirmationButtons(false);
        setPendingGastoData(null);
        setProcessResult(null);
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Erro ao confirmar registro:", error);
    }
  };

  const handleCancelarRegistro = () => {
    setShowConfirmationButtons(false);
    setPendingGastoData(null);
    setProcessResult(null);
  };

  const handleManualInputChange = (field: string, value: string) => {
    setManualGasto(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProcessManualGasto = async () => {
    if (!manualGasto.valor || !manualGasto.item) return;

    setIsProcessingManual(true);
    try {
      const descricao = `${tipoRegistro === "entrada" ? "Recebi" : "Gastei"} ${manualGasto.item} - R$ ${manualGasto.valor} - ${manualGasto.estabelecimento}`;

      const analise = await analisarEntrada.mutateAsync({
        entrada: descricao,
        is_imagem: false,
        tipo: tipoRegistro
      }) as any;

      if (analise?.sucesso) {
        const categorizacao = await categorizarGastos.mutateAsync({
          dados: {
            tipo: tipoRegistro,
            valor: parseFloat(manualGasto.valor),
            item: manualGasto.item,
            estabelecimento: manualGasto.estabelecimento,
            categoria: manualGasto.categoria,
            forma_pagamento: manualGasto.forma_pagamento,
            data: manualGasto.data,
            tags: [], // Add missing tags field
          }
        }) as any;

        if (categorizacao?.sucesso) {
          if (gastoToEdit) {
            // Modo edição
            const atualizacao = await updateGasto.mutateAsync({
              id: gastoToEdit.id,
              dados: categorizacao.dados_categorizados
            }) as any;

            if (atualizacao.sucesso) {
              setManualResult({
                id: atualizacao.gasto_atualizado.id,
                ...atualizacao.gasto_atualizado
              });
              onSuccess();
              onClose();
            }
          } else {
            // Modo criação
            const registro = await registrarGasto.mutateAsync({
              dados: categorizacao.dados_categorizados
            }) as any;

            if (registro.sucesso) {
              setManualResult({
                id: registro.id,
                ...categorizacao.dados_categorizados
              });

              setManualGasto({
                valor: "",
                item: "",
                estabelecimento: "",
                categoria: tipoRegistro === "entrada" ? "Salário" : "Alimentação",
                forma_pagamento: "Não informado",
                data: new Date().toISOString().split('T')[0],
              });

              onSuccess();
              onClose();
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro ao processar registro manual:", error);
    } finally {
      setIsProcessingManual(false);
    }
  };

  const handleClearManual = () => {
    setManualGasto({
      valor: "",
      item: "",
      estabelecimento: "",
      categoria: "Alimentação",
      forma_pagamento: "Não informado",
      data: new Date().toISOString().split('T')[0],
    });
    setManualResult(null);
  };

  const handleClose = () => {
    setActiveTab("ocr");
    setTipoRegistro("gasto");
    setSelectedImage(null);
    setImagePreview(null);
    setProcessResult(null);
    setDescricaoAdicional("");
    setShowConfirmationButtons(false);
    setPendingGastoData(null);
    setManualResult(null);
    setManualGasto({
      valor: "",
      item: "",
      estabelecimento: "",
      categoria: "Alimentação",
      forma_pagamento: "Não informado",
      data: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-neutral-700 border-slate-600">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            {gastoToEdit ? "Editar" : "Registrar Novo"} {tipoRegistro === "entrada" ? "Entrada" : "Gasto"}
          </DialogTitle>
          <DialogDescription className="text-slate-200">
            {gastoToEdit 
              ? "Edite os dados do registro selecionado"
              : `Use OCR ou digite manualmente os dados do ${tipoRegistro === "entrada" ? "entrada" : "gasto"}`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Seletor de Tipo */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => handleTipoChange("gasto")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              tipoRegistro === "gasto"
                ? "bg-red-600 text-white"
                : "bg-neutral-600 text-slate-300 hover:bg-neutral-500"
            }`}
          >
            💸 Gasto
          </button>
          <button
            onClick={() => handleTipoChange("entrada")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              tipoRegistro === "entrada"
                ? "bg-green-600 text-white"
                : "bg-neutral-600 text-slate-300 hover:bg-neutral-500"
            }`}
          >
            💰 Entrada
          </button>
        </div>

        <div className="space-y-4">
          {/* Abas */}
          <div className="flex border-b border-slate-600">
            <button
              onClick={() => setActiveTab("ocr")}
              className={`flex-1 py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "ocr"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-200 hover:text-slate-300"
              }`}
            >
              📷 OCR (Foto)
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`flex-1 py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "manual"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-200 hover:text-slate-300"
              }`}
            >
              ✏️ Manual
            </button>
          </div>

          {/* Conteúdo da Aba OCR */}
          {activeTab === "ocr" && (
            <div className="space-y-4">
              <ImageUpload
                onImageSelect={handleImageSelect}
                onClear={handleClearImage}
                selectedImage={selectedImage}
                imagePreview={imagePreview}
                isProcessing={isProcessing}
              />

              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-slate-300 text-sm">
                  Descrição Adicional (opcional)
                </Label>
                <Input
                  id="descricao"
                  value={descricaoAdicional}
                  onChange={(e) => setDescricaoAdicional(e.target.value)}
                  placeholder="Ex: Compras do fim de semana, jantar com amigos..."
                  className="bg-neutral-600 border-slate-600 text-white placeholder-slate-400 text-sm"
                />
              </div>

              <Button
                onClick={handleProcessImage}
                disabled={!selectedImage || isProcessing}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4 mr-2" />
                    Processar Comprovante
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Conteúdo da Aba Manual */}
          {activeTab === "manual" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor" className="text-slate-300 text-sm">
                    Valor *
                  </Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={manualGasto.valor}
                    onChange={(e) => handleManualInputChange("valor", e.target.value)}
                    placeholder="0,00"
                    className="bg-neutral-600 border-slate-600 text-white placeholder-slate-400 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data" className="text-slate-300 text-sm">
                    Data
                  </Label>
                  <Input
                    id="data"
                    type="date"
                    value={manualGasto.data}
                    onChange={(e) => handleManualInputChange("data", e.target.value)}
                    className="bg-neutral-600 border-slate-600 text-white text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item" className="text-slate-300 text-sm">
                  Item/Descrição *
                </Label>
                <Input
                  id="item"
                  value={manualGasto.item}
                  onChange={(e) => handleManualInputChange("item", e.target.value)}
                  placeholder="Ex: Almoço, Uber, Compras..."
                  className="bg-neutral-600 border-slate-600 text-white placeholder-slate-400 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estabelecimento" className="text-slate-300 text-sm">
                  Estabelecimento
                </Label>
                <Input
                  id="estabelecimento"
                  value={manualGasto.estabelecimento}
                  onChange={(e) => handleManualInputChange("estabelecimento", e.target.value)}
                  placeholder="Ex: Restaurante ABC, Uber, Supermercado..."
                  className="bg-neutral-600 border-slate-600 text-white placeholder-slate-400 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria" className="text-slate-300 text-sm">
                    Categoria
                  </Label>
                  <Select
                    value={manualGasto.categoria}
                    onValueChange={(value) => handleManualInputChange("categoria", value)}
                  >
                    <SelectTrigger className="bg-neutral-600 border-slate-600 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-600 border-slate-600">
                      {tipoRegistro === "gasto" ? (
                        <>
                          <SelectItem value="Alimentação">🍽️ Alimentação</SelectItem>
                          <SelectItem value="Transporte">🚗 Transporte</SelectItem>
                          <SelectItem value="Moradia">🏠 Moradia</SelectItem>
                          <SelectItem value="Lazer">🎮 Lazer</SelectItem>
                          <SelectItem value="Saúde">💊 Saúde</SelectItem>
                          <SelectItem value="Outros">📦 Outros</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Salário">💰 Salário</SelectItem>
                          <SelectItem value="Freelance">💼 Freelance</SelectItem>
                          <SelectItem value="Investimentos">📈 Investimentos</SelectItem>
                          <SelectItem value="Presente">🎁 Presente</SelectItem>
                          <SelectItem value="Reembolso">🔄 Reembolso</SelectItem>
                          <SelectItem value="Outros">📦 Outros</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forma_pagamento" className="text-slate-300 text-sm">
                    Forma de Pagamento
                  </Label>
                  <Select
                    value={manualGasto.forma_pagamento}
                    onValueChange={(value) => handleManualInputChange("forma_pagamento", value)}
                  >
                    <SelectTrigger className="bg-neutral-600 border-slate-600 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-600 border-slate-600">
                      <SelectItem value="Dinheiro">💵 Dinheiro</SelectItem>
                      <SelectItem value="Cartão de Crédito">💳 Cartão de Crédito</SelectItem>
                      <SelectItem value="Cartão de Débito">💳 Cartão de Débito</SelectItem>
                      <SelectItem value="PIX">📱 PIX</SelectItem>
                      <SelectItem value="Transferência">🏦 Transferência</SelectItem>
                      <SelectItem value="Boleto">📄 Boleto</SelectItem>
                      <SelectItem value="Não informado">❓ Não informado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleProcessManualGasto}
                  disabled={!manualGasto.valor || !manualGasto.item || isProcessingManual}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white"
                >
                  {isProcessingManual ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      {gastoToEdit ? "Atualizando..." : "Registrando..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {gastoToEdit ? "Atualizar" : "Registrar"} {tipoRegistro === "entrada" ? "Entrada" : "Gasto"}
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleClearManual}
                  variant="outline"
                  className="bg-neutral-600 border-slate-600 text-slate-300 hover:bg-slate-600"
                >
                  Limpar
                </Button>
              </div>
            </div>
          )}

          {/* Resultado OCR */}
          {processResult && activeTab === "ocr" && (
            <div className="space-y-4 p-4 bg-neutral-600 rounded-lg">
              <div className="flex items-center gap-2">
                {showConfirmationButtons ? (
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
                <h4 className="text-white font-medium">
                  {showConfirmationButtons ? "Confirme os Dados Extraídos" : "Dados Extraídos"}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm">Valor</Label>
                  <div className="text-white font-semibold">
                    R$ {processResult.dados_extraidos.valor.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm">Confiança OCR</Label>
                  <div className="text-white font-semibold">
                    {(processResult.dados_extraidos.confianca_ocr * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200 text-sm">Item</Label>
                <div className="text-white">{processResult.dados_extraidos.item}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm">Estabelecimento</Label>
                  <div className="text-white">{processResult.dados_extraidos.estabelecimento}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm">Categoria</Label>
                  <div className="text-white">{processResult.dados_extraidos.categoria}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm">Data</Label>
                  <div className="text-white">{processResult.dados_extraidos.data}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm">Forma de Pagamento</Label>
                  <div className="text-white">{processResult.dados_extraidos.forma_pagamento}</div>
                </div>
              </div>

              {showConfirmationButtons && (
                <div className="flex gap-3 pt-4 border-t border-slate-700">
                  <Button
                    onClick={handleConfirmarRegistro}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar e Registrar
                  </Button>
                  <Button
                    onClick={handleCancelarRegistro}
                    variant="outline"
                    className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Resultado Manual */}
          {manualResult && activeTab === "manual" && (
            <div className="space-y-4 p-4 bg-neutral-600 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <h4 className="text-white font-medium">Gasto Registrado com Sucesso!</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm">Valor</Label>
                  <div className="text-white font-semibold">
                    R$ {manualResult.valor.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm">ID</Label>
                  <div className="text-white font-semibold">
                    #{manualResult.id}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200 text-sm">Item</Label>
                <div className="text-white">{manualResult.item}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm">Estabelecimento</Label>
                  <div className="text-white">{manualResult.estabelecimento}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200 text-sm">Categoria</Label>
                  <div className="text-white">{manualResult.categoria}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
