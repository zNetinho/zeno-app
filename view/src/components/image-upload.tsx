import React, { useState, useRef } from "react";
import { Camera, Upload, X, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onClear: () => void;
  selectedImage: File | null;
  imagePreview: string | null;
  isProcessing?: boolean;
}

export function ImageUpload({
  onImageSelect,
  onClear,
  selectedImage,
  imagePreview,
  isProcessing = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageSelect(file);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Botões de Upload */}
      <div className="flex gap-3">
        <Button
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
          disabled={isProcessing}
        >
          <Camera className="w-4 h-4 mr-2" />
          Tirar Foto
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-green-600 hover:bg-green-500 text-white"
          disabled={isProcessing}
        >
          <Upload className="w-4 h-4 mr-2" />
          Selecionar
        </Button>
      </div>

      {/* Inputs ocultos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />

      {/* Área de Drop */}
      {!imagePreview && (
        <div
          className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-slate-500 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 mx-auto mb-4 text-slate-200" />
          <p className="text-slate-200 mb-2">
            Arraste uma imagem aqui ou use os botões acima
          </p>
          <p className="text-sm text-slate-200">
            Suporta: JPG, PNG, GIF
          </p>
        </div>
      )}

      {/* Preview da Imagem */}
      {imagePreview && (
        <div className="relative">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border border-slate-600"
          />
          <Button
            onClick={onClear}
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2"
            disabled={isProcessing}
          >
            <X className="w-4 h-4" />
          </Button>
          {isProcessing && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
              <div className="text-white text-center">
                <Loader className="w-6 h-6 mx-auto mb-2 animate-spin" />
                <p>Processando...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Informações do arquivo */}
      {selectedImage && (
        <div className="text-sm text-slate-200">
          <p>Arquivo: {selectedImage.name}</p>
          <p>Tamanho: {(selectedImage.size / 1024 / 1024).toFixed(2)} MB</p>
          <p>Tipo: {selectedImage.type}</p>
        </div>
      )}
    </div>
  );
}
