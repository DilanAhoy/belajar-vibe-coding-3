import { Elysia } from "elysia";
import { db, connectionPool } from "../db";
import { users } from "../db/schema";

export const healthRoutes = new Elysia({ prefix: "/health" })
  .get("/", async () => {
    let dbStatus = "connected";
    let dbError = null;

    try {
      // Test raw connection ping
      const connection = await connectionPool.getConnection();
      await connection.ping();
      connection.release();
    } catch (err: any) {
      dbStatus = "disconnected";
      dbError = err?.message ?? "Database connection failed";
    }

    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        error: dbError,
      },
    };
  });
