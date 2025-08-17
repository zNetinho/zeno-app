import {
  drizzle,
  migrateWithoutTransaction,
} from "@deco/workers-runtime/drizzle";
import type { Env } from "./main";
import migrations from "./drizzle/migrations";

export const getDb = async (env: Env) => {
  const db = drizzle(env);
  
  try {
    console.log("🔄 Applying database migrations...");
    await migrateWithoutTransaction(db, migrations);
    console.log("✅ Database migrations completed successfully");
  } catch (error) {
    console.error("❌ Database migration failed:", error);
    
    // Fallback: create tables manually
    try {
      console.log("🔄 Creating tables manually...");
      await db.run(`
        CREATE TABLE IF NOT EXISTS gastos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo TEXT DEFAULT 'gasto' NOT NULL,
          valor REAL NOT NULL,
          item TEXT NOT NULL,
          quantidade INTEGER DEFAULT 1,
          estabelecimento TEXT NOT NULL,
          data TEXT NOT NULL,
          categoria TEXT NOT NULL,
          forma_pagamento TEXT NOT NULL,
          tags TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `);
      
      await db.run(`
        CREATE TABLE IF NOT EXISTS todos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          completed INTEGER DEFAULT 0
        )
      `);
      
      console.log("✅ Manual table creation successful");
    } catch (manualError) {
      console.error("❌ Manual table creation failed:", manualError);
      throw manualError;
    }
  }
  
  return db;
};
