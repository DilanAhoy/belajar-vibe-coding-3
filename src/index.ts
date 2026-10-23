import { Elysia } from "elysia";
import { healthRoutes } from "./routes/health";
import { usersRoute } from "./routes/users-route";
import "dotenv/config";

const port = Number(process.env.PORT) || 3000;

export const app = new Elysia()
  .get("/", () => ({
    message: "Welcome to ElysiaJS + Drizzle + MySQL API",
    status: "running",
    docs: "/health",
  }))
  .use(healthRoutes)
  .use(usersRoute);

if (process.env.NODE_ENV !== "test") {
  app.listen(port);
  console.log(`🚀 Server is running at http://${app.server?.hostname}:${app.server?.port}`);
}

export type App = typeof app;
