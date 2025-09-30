import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Only configure WebSocket in development or when explicitly enabled
// In production environments like Render, WebSocket connections can be problematic
// so we use HTTP transport (default) which is more reliable for CRUD operations
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_WEBSOCKET === 'true') {
  neonConfig.webSocketConstructor = ws;
  console.log('[database] Using WebSocket transport for Neon connection');
} else {
  // Use HTTP transport in production for better compatibility
  neonConfig.webSocketConstructor = undefined;
  console.log('[database] Using HTTP transport for Neon connection');
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
