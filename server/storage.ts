import { 
  organizations, users, scorecards, simulationResults, abTests, apiLogs, auditTrail,
  type User, type InsertUser, type Organization, type InsertOrganization,
  type Scorecard, type InsertScorecard, type SimulationResult, type InsertSimulationResult,
  type AbTest, type InsertAbTest, type ApiLog, type InsertApiLog,
  type AuditTrail, type InsertAuditTrail
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  updateUserPassword(email: string, hashedPassword: string): Promise<void>;
  deleteUser(id: number): Promise<void>;
  getUsers(organizationId?: number): Promise<User[]>;

  // Organization management
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationByCode(code: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization>;
  deleteOrganization(id: number): Promise<void>;
  getOrganizations(): Promise<Organization[]>;

  // Scorecard management
  getScorecard(id: number): Promise<Scorecard | undefined>;
  getScorecards(organizationId: number, filters?: { product?: string; segment?: string; status?: string }): Promise<Scorecard[]>;
  createScorecard(scorecard: InsertScorecard): Promise<Scorecard>;
  updateScorecard(id: number, updates: Partial<InsertScorecard>): Promise<Scorecard>;
  deleteScorecard(id: number): Promise<void>;
  getActiveScorecards(organizationId: number): Promise<Scorecard[]>;

  // Simulation management
  createSimulationResult(result: InsertSimulationResult): Promise<SimulationResult>;
  getSimulationResults(scorecardId: number, limit?: number): Promise<SimulationResult[]>;
  createBulkSimulationResults(results: InsertSimulationResult[]): Promise<void>;

  // A/B Testing
  createAbTest(test: InsertAbTest): Promise<AbTest>;
  getAbTest(id: number): Promise<AbTest | undefined>;
  getAbTests(organizationId: number): Promise<AbTest[]>;
  updateAbTest(id: number, updates: Partial<InsertAbTest>): Promise<AbTest>;

  // API Logs
  createApiLog(log: InsertApiLog): Promise<ApiLog>;
  getApiLogs(organizationId: number, limit?: number): Promise<ApiLog[]>;

  // Audit Trail
  createAuditTrail(audit: InsertAuditTrail): Promise<AuditTrail>;
  getAuditTrail(organizationId: number, limit?: number): Promise<AuditTrail[]>;

  // Dashboard metrics
  getDashboardMetrics(organizationId: number): Promise<{
    activeScoreCards: number;
    applicationsScored: number;
    approvalRate: number;
    abTests: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        updatedAt: new Date()
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async activateUser(id: number, isActive: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isActive,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateLastLogin(id: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        lastLoginAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, id));
  }

  async updateUserPassword(email: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ passwordHash: hashedPassword, updatedAt: new Date() })
      .where(eq(users.email, email));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsers(organizationId?: number): Promise<User[]> {
    if (organizationId) {
      return await db.select().from(users).where(eq(users.organizationId, organizationId));
    }
    return await db.select().from(users);
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async getOrganizationByCode(code: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.code, code));
    return org || undefined;
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    console.log("Storage creating organization:", JSON.stringify(insertOrg, null, 2));
    
    // Validate required fields
    if (!insertOrg.name || !insertOrg.code || !insertOrg.type || !insertOrg.contactEmail) {
      throw new Error(`Missing required fields. Received: ${JSON.stringify({
        name: insertOrg.name,
        code: insertOrg.code,
        type: insertOrg.type,
        contactEmail: insertOrg.contactEmail
      })}`);
    }

    // Process and clean data
    const processedData: any = {
      name: insertOrg.name,
      code: insertOrg.code,
      type: insertOrg.type,
      contactEmail: insertOrg.contactEmail,
      description: insertOrg.description || null,
      address: insertOrg.address || null,
      phone: insertOrg.phone || null,
      website: insertOrg.website || null,
      businessRegNumber: insertOrg.businessRegNumber || null,
      licenseNumber: insertOrg.licenseNumber || null,
      regulatoryAuthority: insertOrg.regulatoryAuthority || null,
      establishedYear: insertOrg.establishedYear ? parseInt(String(insertOrg.establishedYear)) : null,
      employeeCount: insertOrg.employeeCount ? parseInt(String(insertOrg.employeeCount)) : null,
      annualRevenue: insertOrg.annualRevenue ? String(insertOrg.annualRevenue) : null,
      branding: insertOrg.branding || null,
      features: insertOrg.features || null,
      settings: insertOrg.settings || null,
      status: insertOrg.status || "Active",
    };

    console.log("Processed organization data:", JSON.stringify(processedData, null, 2));

    try {
      const [org] = await db.insert(organizations)
        .values(processedData)
        .returning();
      console.log("Successfully created organization:", org.id);
      return org;
    } catch (dbError) {
      console.error("Database insertion error:", dbError);
      throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`);
    }
  }

  async updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization> {
    // Handle establishedYear conversion for different input types
    const processedUpdates = { ...updates };
    if (processedUpdates.establishedYear !== undefined) {
      if (typeof processedUpdates.establishedYear === 'string') {
        processedUpdates.establishedYear = parseInt(processedUpdates.establishedYear) || null;
      }
    }

    const [org] = await db
      .update(organizations)
      .set({ ...processedUpdates, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  async deleteOrganization(id: number): Promise<void> {
    await db.delete(organizations).where(eq(organizations.id, id));
  }

  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(organizations.name);
  }

  async getScorecard(id: number): Promise<Scorecard | undefined> {
    const [scorecard] = await db.select().from(scorecards).where(eq(scorecards.id, id));
    return scorecard || undefined;
  }

  async getScorecards(organizationId: number, filters?: { product?: string; segment?: string; status?: string }): Promise<Scorecard[]> {
    let query = db.select().from(scorecards).where(eq(scorecards.organizationId, organizationId));
    
    if (filters?.product) {
      query = query.where(eq(scorecards.product, filters.product));
    }
    if (filters?.segment) {
      query = query.where(eq(scorecards.segment, filters.segment));
    }
    if (filters?.status) {
      query = query.where(eq(scorecards.status, filters.status));
    }

    return await query.orderBy(desc(scorecards.updatedAt));
  }

  async createScorecard(insertScorecard: InsertScorecard): Promise<Scorecard> {
    console.log('ROOT CAUSE DEBUG: Creating scorecard with configJson:', JSON.stringify(insertScorecard.configJson, null, 2));
    
    const [scorecard] = await db
      .insert(scorecards)
      .values({
        ...insertScorecard,
        updatedAt: new Date()
      })
      .returning();
    
    console.log('ROOT CAUSE DEBUG: Created scorecard ID:', scorecard.id);
    console.log('ROOT CAUSE DEBUG: Returned configJson:', JSON.stringify(scorecard.configJson, null, 2));
    return scorecard;
  }

  async updateScorecard(id: number, updates: Partial<InsertScorecard>): Promise<Scorecard> {
    const [scorecard] = await db
      .update(scorecards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scorecards.id, id))
      .returning();
    return scorecard;
  }

  async deleteScorecard(id: number): Promise<void> {
    await db.delete(scorecards).where(eq(scorecards.id, id));
  }

  async getActiveScorecards(organizationId: number): Promise<Scorecard[]> {
    return await db
      .select()
      .from(scorecards)
      .where(and(eq(scorecards.organizationId, organizationId), eq(scorecards.status, "Active")));
  }

  async createSimulationResult(result: InsertSimulationResult): Promise<SimulationResult> {
    const [simulationResult] = await db
      .insert(simulationResults)
      .values(result)
      .returning();
    return simulationResult;
  }

  async getSimulationResults(scorecardId: number, limit = 100): Promise<SimulationResult[]> {
    return await db
      .select()
      .from(simulationResults)
      .where(eq(simulationResults.scorecardId, scorecardId))
      .orderBy(desc(simulationResults.createdAt))
      .limit(limit);
  }

  async createBulkSimulationResults(results: InsertSimulationResult[]): Promise<void> {
    await db.insert(simulationResults).values(results);
  }

  async createAbTest(test: InsertAbTest): Promise<AbTest> {
    const [abTest] = await db
      .insert(abTests)
      .values(test)
      .returning();
    return abTest;
  }

  async getAbTest(id: number): Promise<AbTest | undefined> {
    const [test] = await db.select().from(abTests).where(eq(abTests.id, id));
    return test || undefined;
  }

  async getAbTests(organizationId: number): Promise<AbTest[]> {
    return await db
      .select()
      .from(abTests)
      .where(eq(abTests.organizationId, organizationId))
      .orderBy(desc(abTests.createdAt));
  }

  async updateAbTest(id: number, updates: Partial<InsertAbTest>): Promise<AbTest> {
    const [test] = await db
      .update(abTests)
      .set(updates)
      .where(eq(abTests.id, id))
      .returning();
    return test;
  }

  async createApiLog(log: InsertApiLog): Promise<ApiLog> {
    const [apiLog] = await db
      .insert(apiLogs)
      .values(log)
      .returning();
    return apiLog;
  }

  async getApiLogs(organizationId: number, limit = 100): Promise<ApiLog[]> {
    return await db
      .select()
      .from(apiLogs)
      .where(eq(apiLogs.organizationId, organizationId))
      .orderBy(desc(apiLogs.createdAt))
      .limit(limit);
  }

  async createAuditTrail(audit: InsertAuditTrail): Promise<AuditTrail> {
    const [auditRecord] = await db
      .insert(auditTrail)
      .values(audit)
      .returning();
    return auditRecord;
  }

  async getAuditTrail(organizationId: number, limit = 100): Promise<AuditTrail[]> {
    return await db
      .select()
      .from(auditTrail)
      .where(eq(auditTrail.organizationId, organizationId))
      .orderBy(desc(auditTrail.createdAt))
      .limit(limit);
  }

  async getDashboardMetrics(organizationId: number): Promise<{
    activeScoreCards: number;
    applicationsScored: number;
    approvalRate: number;
    abTests: number;
  }> {
    const [activeScoreCardsResult] = await db
      .select({ count: count() })
      .from(scorecards)
      .where(and(eq(scorecards.organizationId, organizationId), eq(scorecards.status, "Active")));

    const [applicationsResult] = await db
      .select({ count: count() })
      .from(simulationResults)
      .innerJoin(scorecards, eq(simulationResults.scorecardId, scorecards.id))
      .where(eq(scorecards.organizationId, organizationId));

    const [abTestsResult] = await db
      .select({ count: count() })
      .from(abTests)
      .where(and(eq(abTests.organizationId, organizationId), eq(abTests.status, "Running")));

    return {
      activeScoreCards: activeScoreCardsResult.count,
      applicationsScored: applicationsResult.count,
      approvalRate: 78.4, // This would be calculated from actual approval data
      abTests: abTestsResult.count,
    };
  }
}

export const storage = new DatabaseStorage();
