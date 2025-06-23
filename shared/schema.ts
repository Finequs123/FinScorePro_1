import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organizations table
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  type: text("type").notNull(), // NBFC, DSA, Bank, Aggregator, Fintech
  contactEmail: text("contact_email").notNull(),
  description: text("description"),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 255 }),
  businessRegNumber: varchar("business_reg_number", { length: 100 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  regulatoryAuthority: varchar("regulatory_authority", { length: 255 }),
  establishedYear: integer("established_year"),
  annualRevenue: varchar("annual_revenue", { length: 255 }),
  employeeCount: integer("employee_count"),
  branding: jsonb("branding"),
  features: jsonb("features"),
  settings: jsonb("settings"),
  status: varchar("status", { length: 50 }).default("Active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // Admin, Power User, Approver, DSA
  organizationId: integer("organization_id").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  defaultModule: varchar("default_module", { length: 50 }).default("Dashboard"), // Default landing page
  accessMatrix: jsonb("access_matrix"), // Role-based access permissions
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Scorecards table
export const scorecards = pgTable("scorecards", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: text("name").notNull(),
  product: text("product").notNull(), // Personal Loan, Credit Card, Business Loan, etc.
  segment: text("segment").notNull(), // Salaried, Self-Employed, Professional, etc.
  version: text("version").notNull(),
  configJson: jsonb("config_json").notNull(),
  status: text("status").notNull(), // Draft by AI, Draft, Awaiting Approval, Active, Archived
  createdBy: integer("created_by").notNull(),
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
});

// Simulation Results table
export const simulationResults = pgTable("simulation_results", {
  id: serial("id").primaryKey(),
  scorecardId: integer("scorecard_id").notNull(),
  recordId: text("record_id").notNull(),
  score: decimal("score", { precision: 5, scale: 2 }).notNull(),
  bucket: text("bucket").notNull(), // A, B, C, D
  reasonCodes: jsonb("reason_codes"),
  inputData: jsonb("input_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A/B Tests table
export const abTests = pgTable("ab_tests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  organizationId: integer("organization_id").notNull(),
  scorecardAId: integer("scorecard_a_id").notNull(),
  scorecardBId: integer("scorecard_b_id").notNull(),
  status: text("status").notNull(), // Running, Completed, Paused
  resultMetrics: jsonb("result_metrics"),
  winnerId: integer("winner_id"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// API Logs table
export const apiLogs = pgTable("api_logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time"), // in milliseconds
  payloadHash: text("payload_hash"),
  ipAddress: text("ip_address"),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit Trail table
export const auditTrail = pgTable("audit_trail", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // Created, Updated, Deleted, Approved, Activated, etc.
  entityType: text("entity_type").notNull(), // scorecard, user, organization, etc.
  entityId: integer("entity_id").notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  scorecards: many(scorecards),
  abTests: many(abTests),
  apiLogs: many(apiLogs),
  auditTrail: many(auditTrail),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  scorecards: many(scorecards, { relationName: "createdBy" }),
  approvedScorecards: many(scorecards, { relationName: "approvedBy" }),
  abTests: many(abTests),
  apiLogs: many(apiLogs),
  auditTrail: many(auditTrail),
}));

export const scorecardsRelations = relations(scorecards, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [scorecards.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [scorecards.createdBy],
    references: [users.id],
    relationName: "createdBy",
  }),
  approver: one(users, {
    fields: [scorecards.approvedBy],
    references: [users.id],
    relationName: "approvedBy",
  }),
  simulationResults: many(simulationResults),
  abTestsA: many(abTests, { relationName: "scorecardA" }),
  abTestsB: many(abTests, { relationName: "scorecardB" }),
}));

export const simulationResultsRelations = relations(simulationResults, ({ one }) => ({
  scorecard: one(scorecards, {
    fields: [simulationResults.scorecardId],
    references: [scorecards.id],
  }),
}));

export const abTestsRelations = relations(abTests, ({ one }) => ({
  organization: one(organizations, {
    fields: [abTests.organizationId],
    references: [organizations.id],
  }),
  scorecardA: one(scorecards, {
    fields: [abTests.scorecardAId],
    references: [scorecards.id],
    relationName: "scorecardA",
  }),
  scorecardB: one(scorecards, {
    fields: [abTests.scorecardBId],
    references: [scorecards.id],
    relationName: "scorecardB",
  }),
  winner: one(scorecards, {
    fields: [abTests.winnerId],
    references: [scorecards.id],
  }),
  creator: one(users, {
    fields: [abTests.createdBy],
    references: [users.id],
  }),
}));

export const apiLogsRelations = relations(apiLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiLogs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [apiLogs.userId],
    references: [users.id],
  }),
}));

export const auditTrailRelations = relations(auditTrail, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditTrail.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [auditTrail.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  establishedYear: z.union([z.number(), z.string(), z.null()]).optional(),
  employeeCount: z.union([z.number(), z.string(), z.null()]).optional(),
  annualRevenue: z.string().optional().nullable(),
  branding: z.any().optional().nullable(),
  features: z.any().optional().nullable(),
  settings: z.any().optional().nullable(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScorecardSchema = createInsertSchema(scorecards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export const insertSimulationResultSchema = createInsertSchema(simulationResults).omit({
  id: true,
  createdAt: true,
});

export const insertAbTestSchema = createInsertSchema(abTests).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertApiLogSchema = createInsertSchema(apiLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAuditTrailSchema = createInsertSchema(auditTrail).omit({
  id: true,
  createdAt: true,
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Scorecard = typeof scorecards.$inferSelect;
export type InsertScorecard = z.infer<typeof insertScorecardSchema>;
export type SimulationResult = typeof simulationResults.$inferSelect;
export type InsertSimulationResult = z.infer<typeof insertSimulationResultSchema>;
export type AbTest = typeof abTests.$inferSelect;
export type InsertAbTest = z.infer<typeof insertAbTestSchema>;
export type ApiLog = typeof apiLogs.$inferSelect;
export type InsertApiLog = z.infer<typeof insertApiLogSchema>;
export type AuditTrail = typeof auditTrail.$inferSelect;
export type InsertAuditTrail = z.infer<typeof insertAuditTrailSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
