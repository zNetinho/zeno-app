import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { List, Calendar, Building, CreditCard, AlertCircle } from "lucide-react";

export function GastosSkeleton() {
  return (
    <div className="bg-neutral-600 min-h-screen p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-6 sm:mb-8">
          <div className="h-8 sm:h-9 bg-neutral-500 rounded-lg w-64 mb-2 animate-pulse"></div>
          <div className="h-4 sm:h-5 bg-neutral-500 rounded w-80 animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Coluna Central - Listagem de Gastos */}
          <div className="space-y-6 xl:col-span-2">
            {/* Card de Listagem de Gastos */}
            <Card className="bg-neutral-700 border-slate-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <List className="w-5 h-5 text-blue-400" />
                  <div className="h-6 bg-neutral-500 rounded w-32 animate-pulse"></div>
                </div>
                <div className="h-4 bg-neutral-500 rounded w-48 animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Botão de ação skeleton */}
                <div className="h-9 bg-neutral-500 rounded animate-pulse"></div>

                {/* Lista de gastos skeleton */}
                <div className="space-y-3">
                  {[...Array(5)].map((_, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-slate-600 bg-neutral-600 animate-pulse"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-5 bg-neutral-500 rounded-full w-20"></div>
                            <div className="h-4 bg-neutral-500 rounded w-32"></div>
                          </div>
                          <div className="h-3 bg-neutral-500 rounded w-40"></div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="h-4 bg-neutral-500 rounded w-16 mb-1"></div>
                          <div className="h-3 bg-neutral-500 rounded w-12"></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-4">
                          <div className="h-3 bg-neutral-500 rounded w-16"></div>
                          <div className="h-3 bg-neutral-500 rounded w-20"></div>
                        </div>
                        <div className="h-6 w-6 bg-neutral-500 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumo skeleton */}
                <div className="pt-4 border-t border-slate-600 space-y-2">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="h-4 bg-neutral-500 rounded w-24"></div>
                      <div className="h-4 bg-neutral-500 rounded w-16"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita - Informações e Ações */}
          <div className="space-y-6 xl:col-span-1">
            {/* Card de Resultado - Consulta Total */}
            <Card className="bg-neutral-700 border-slate-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <div className="h-6 bg-neutral-500 rounded w-32 animate-pulse"></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-neutral-600 rounded-lg">
                    <div className="h-6 bg-neutral-500 rounded w-12 mx-auto mb-1 animate-pulse"></div>
                    <div className="h-3 bg-neutral-500 rounded w-16 mx-auto animate-pulse"></div>
                  </div>
                  <div className="text-center p-3 bg-neutral-600 rounded-lg">
                    <div className="h-6 bg-neutral-500 rounded w-16 mx-auto mb-1 animate-pulse"></div>
                    <div className="h-3 bg-neutral-500 rounded w-12 mx-auto animate-pulse"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-500 rounded w-24 animate-pulse"></div>
                  <div className="space-y-1">
                    {[...Array(3)].map((_, index) => (
                      <div key={index} className="flex justify-between">
                        <div className="h-3 bg-neutral-500 rounded w-16 animate-pulse"></div>
                        <div className="h-3 bg-neutral-500 rounded w-12 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Ações Rápidas */}
            <Card className="bg-neutral-700 border-slate-700">
              <CardHeader>
                <div className="h-6 bg-neutral-500 rounded w-24 animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="h-10 bg-neutral-500 rounded animate-pulse"></div>
                ))}
              </CardContent>
            </Card>

            {/* Card de Dicas */}
            <Card className="bg-neutral-700 border-slate-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <div className="h-6 bg-neutral-500 rounded w-32 animate-pulse"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="h-3 bg-neutral-500 rounded animate-pulse"></div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Card de Resultado - Gastos por Categoria */}
            <Card className="bg-neutral-700 border-slate-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-green-400" />
                  <div className="h-6 bg-neutral-500 rounded w-32 animate-pulse"></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-neutral-600 rounded-lg">
                      <div>
                        <div className="h-4 bg-neutral-500 rounded w-20 mb-1 animate-pulse"></div>
                        <div className="h-3 bg-neutral-500 rounded w-12 animate-pulse"></div>
                      </div>
                      <div className="text-right">
                        <div className="h-4 bg-neutral-500 rounded w-16 mb-1 animate-pulse"></div>
                        <div className="h-3 bg-neutral-500 rounded w-14 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Card de Resultado - Relatório Mensal */}
            <Card className="bg-neutral-700 border-slate-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-400" />
                  <div className="h-6 bg-neutral-500 rounded w-28 animate-pulse"></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Resumo do Período */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-neutral-600 rounded-lg">
                    <div className="h-6 bg-neutral-500 rounded w-16 mx-auto mb-1 animate-pulse"></div>
                    <div className="h-3 bg-neutral-500 rounded w-12 mx-auto animate-pulse"></div>
                  </div>
                  <div className="text-center p-3 bg-neutral-600 rounded-lg">
                    <div className="h-6 bg-neutral-500 rounded w-16 mx-auto mb-1 animate-pulse"></div>
                    <div className="h-3 bg-neutral-500 rounded w-12 mx-auto animate-pulse"></div>
                  </div>
                </div>

                {/* Insights */}
                <div className="space-y-3">
                  <div className="h-4 bg-neutral-500 rounded w-12 animate-pulse"></div>
                  <div className="space-y-2">
                    {[...Array(4)].map((_, index) => (
                      <div key={index} className="h-3 bg-neutral-500 rounded animate-pulse"></div>
                    ))}
                  </div>
                </div>

                {/* Botão Enviar por Email */}
                <div className="pt-4 border-t border-slate-600">
                  <div className="h-10 bg-neutral-500 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Botão Flutuante Skeleton */}
      <div className="fixed bottom-28 right-6 w-14 h-14 bg-neutral-500 rounded-full animate-pulse"></div>
    </div>
  );
}
