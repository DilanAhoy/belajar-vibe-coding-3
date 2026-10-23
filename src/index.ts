import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { healthRoutes } from "./routes/health";
import { usersRoute } from "./routes/users-route";
import "dotenv/config";

const port = Number(process.env.PORT) || 3000;

export const app = new Elysia()
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "User Management & Authentication API",
          version: "1.0.0",
          description:
            "Dokumentasi interaktif RESTful API untuk sistem autentikasi dan manajemen sesi pengguna.",
        },
        tags: [
          {
            name: "Users",
            description: "Endpoint registrasi, autentikasi, profil, dan sesi pengguna",
          },
          {
            name: "System",
            description: "Endpoint kesehatan dan status aplikasi",
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "UUID",
              description: "Masukkan token sesi yang didapatkan dari endpoint login",
            },
          },
        },
      },
    })
  )
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
