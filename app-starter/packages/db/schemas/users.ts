import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { tenants } from "./tenants";

export const USER_ROLE_VALUES = ["admin", "member", "viewer"] as const;
export type UserRole = (typeof USER_ROLE_VALUES)[number];
export const USER_ROLE_LABEL: Record<UserRole, string> = {
  admin: "管理者",
  member: "メンバー",
  viewer: "閲覧者",
};
export const userRoleEnum = pgEnum("user_role", USER_ROLE_VALUES);

export const users = pgTable(
  "users",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    publicId: uuid("public_id").notNull().defaultRandom(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade", onUpdate: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull().default("member"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => ({
    tenantIdIdx: index("users_tenant_id_idx").on(table.tenantId),
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
    isActiveIdx: index("users_is_active_idx").on(table.isActive),
    publicIdUidIdx: unique("users_public_id_uidx").on(table.publicId),
    clerkUserIdUidIdx: uniqueIndex("users_clerk_user_id_uidx").on(table.clerkUserId),
    emailUidIdx: uniqueIndex("users_email_uidx").on(table.email),
  }),
);

