import { Elysia } from "elysia";
import { healthRoutes } from "./routes/health";
import { usersRoute } from "./routes/users-route";
import "dotenv/config";

const port = Number(process.env.PORT) || 3000;

const app = new Elysia()
  .get("/", () => ({
    message: "Welcome to ElysiaJS + Drizzle + MySQL API",
    status: "running",
    docs: "/health",
  }))
  .use(healthRoutes)
  .use(usersRoute)
  .listen(port);

console.log(`🚀 Server is running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
