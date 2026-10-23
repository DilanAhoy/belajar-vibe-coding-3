import { Elysia, t } from "elysia";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  DuplicateEmailError,
  InvalidCredentialsError,
  UnauthorizedError,
} from "../services/users-service";

function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return null;
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

export const usersRoute = new Elysia({ prefix: "/api/users" })
  .post(
    "/",
    async ({ body, set }) => {
      try {
        await registerUser(body);
        set.status = 200; // atau 201
        return {
          data: "OK",
        };
      } catch (error: any) {
        if (error instanceof DuplicateEmailError) {
          set.status = 400;
          return {
            error: error.message,
          };
        }

        set.status = 500;
        return {
          error: error?.message || "Internal server error",
        };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      try {
        const result = await loginUser(body);
        set.status = 200;
        return {
          data: result.token,
        };
      } catch (error: any) {
        if (error instanceof InvalidCredentialsError) {
          set.status = 400;
          return {
            error: error.message,
          };
        }

        set.status = 500;
        return {
          error: error?.message || "Internal server error",
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )
  .get("/current", async ({ headers, set }) => {
    const token = extractBearerToken(headers["authorization"]);
    if (!token) {
      set.status = 401;
      return {
        error: "unauthorized",
      };
    }

    try {
      const user = await getCurrentUser(token);
      set.status = 200;
      return {
        data: user,
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedError) {
        set.status = 401;
        return {
          error: "unauthorized",
        };
      }

      set.status = 500;
      return {
        error: error?.message || "Internal server error",
      };
    }
  })
  .delete("/logout", async ({ headers, set }) => {
    const token = extractBearerToken(headers["authorization"]);
    if (!token) {
      set.status = 401;
      return {
        error: "unauthorized",
      };
    }

    try {
      await logoutUser(token);
      set.status = 200;
      return {
        data: "OK",
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedError) {
        set.status = 401;
        return {
          error: "unauthorized",
        };
      }

      set.status = 500;
      return {
        error: error?.message || "Internal server error",
      };
    }
  });
