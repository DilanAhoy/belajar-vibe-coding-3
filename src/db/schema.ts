import { mysqlTable, serial, varchar, timestamp, int } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = mysqlTable("sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
