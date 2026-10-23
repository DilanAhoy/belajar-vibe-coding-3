import { Elysia, t } from "elysia";
import { registerUser, DuplicateEmailError } from "../services/users-service";

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
  );
