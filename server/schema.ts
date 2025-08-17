/**
 * This file is used to define the schema for the database.
 * 
 * After making changes to this file, run `npm run db:generate` to generate the migration file.
 * Then, by just using the app, the migration is lazily ensured at runtime.
 */
import { integer, sqliteTable, text, real } from "@deco/workers-runtime/drizzle";

export const todosTable = sqliteTable("todos", {
  id: integer("id").primaryKey(),
  title: text("title"),
  completed: integer("completed").default(0),
});

export const gastosTable = sqliteTable("gastos", {
  id: integer("id").primaryKey(),
  tipo: text("tipo").notNull().default("gasto"), // "gasto" ou "entrada"
  valor: real("valor").notNull(),
  item: text("item").notNull(),
  quantidade: integer("quantidade").default(1),
  estabelecimento: text("estabelecimento").notNull(),
  data: text("data").notNull(), // formato YYYY-MM-DD
  categoria: text("categoria").notNull(), // Alimentação, Transporte, Moradia, Lazer, Saúde, Outros, Salário, Freelance, Investimentos, Outros
  forma_pagamento: text("forma_pagamento").notNull(), // Dinheiro, Cartão de Crédito, Cartão de Débito, PIX, Transferência, Boleto
  tags: text("tags"), // JSON string para tags adicionais
  created_at: integer("created_at", { mode: "timestamp" }).default(new Date()),
});
