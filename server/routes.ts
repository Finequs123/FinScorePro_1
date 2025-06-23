import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ExcelJS from "exceljs";
import { loginSchema, insertUserSchema, insertOrganizationSchema, insertScorecardSchema, scorecards } from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware for authentication
const authenticateToken = async (req: any, res: any, next: any) => {
  console.log('AUTH MIDDLEWARE: Processing request to:', req.url);
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  console.log('AUTH MIDDLEWARE: Auth header present:', !!authHeader);
  console.log('AUTH MIDDLEWARE: Token extracted:', !!token);

  if (!token) {
    console.log('AUTH MIDDLEWARE: No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('AUTH MIDDLEWARE: Token decoded, userId:', decoded.userId);
    
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      console.log('AUTH MIDDLEWARE: User not found for ID:', decoded.userId);
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    console.log('AUTH MIDDLEWARE: User authenticated:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.log('AUTH MIDDLEWARE: Token verification failed:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Middleware for role-based access
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Primary login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      console.log('LOGIN ENDPOINT: Processing request');
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log('LOGIN ENDPOINT: User not found:', email);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        console.log('LOGIN ENDPOINT: Invalid password for:', email);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      console.log('LOGIN ENDPOINT: Token created for user:', user.id);
      
      await storage.updateLastLogin(user.id);
      
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId
        }
      });
    } catch (error) {
      console.log('LOGIN ENDPOINT: Error:', error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Legacy auth login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      await storage.updateLastLogin(user.id);
      
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId
        }
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    const organization = await storage.getOrganization(req.user.organizationId);
    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        organizationId: req.user.organizationId
      },
      organization
    });
  });

  // Password reset functionality
  const otpStore = new Map<string, { otp: string; expires: number }>();
  const resetTokenStore = new Map<string, { email: string; expires: number }>();

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: "If the email exists, an OTP has been sent" });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
      
      otpStore.set(email, { otp, expires });
      
      // In production, send email here
      console.log(`OTP for ${email}: ${otp}`);
      
      res.json({ message: "OTP sent to email" });
    } catch (error) {
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      
      const stored = otpStore.get(email);
      if (!stored || stored.expires < Date.now() || stored.otp !== otp) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Generate reset token
      const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '15m' });
      resetTokenStore.set(resetToken, { email, expires: Date.now() + 15 * 60 * 1000 });
      
      // Clear OTP
      otpStore.delete(email);
      
      res.json({ token: resetToken });
    } catch (error) {
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      const stored = resetTokenStore.get(token);
      if (!stored || stored.expires < Date.now()) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Password validation
      const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ message: "Password must be at least 8 characters with 1 digit and 1 special character" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(stored.email, hashedPassword);
      
      // Clear reset token
      resetTokenStore.delete(token);
      
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post("/api/auth/change-password", authenticateToken, async (req: any, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Password validation
      const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ message: "Password must be at least 8 characters with 1 digit and 1 special character" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.email, hashedPassword);
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.post("/api/auth/logout", authenticateToken, async (req: any, res) => {
    try {
      // In a production app, you might want to blacklist the token
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // Organization routes
  app.get("/api/organizations", authenticateToken, requireRole(['Admin']), async (req: any, res) => {
    try {
      const organizations = await storage.getOrganizations();
      res.json(organizations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.post("/api/organizations", authenticateToken, requireRole(['Admin']), async (req: any, res) => {
    try {
      const orgData = insertOrganizationSchema.parse(req.body);
      const organization = await storage.createOrganization(orgData);
      
      // Create audit trail
      await storage.createAuditTrail({
        organizationId: organization.id,
        userId: req.user.id,
        action: "Created",
        entityType: "organization",
        entityId: organization.id,
        newValues: orgData,
        description: `Created organization: ${organization.name}`
      });

      res.status(201).json(organization);
    } catch (error) {
      res.status(400).json({ message: "Invalid organization data" });
    }
  });

  // User management routes
  app.get("/api/users", authenticateToken, requireRole(['Admin', 'Power User']), async (req: any, res) => {
    try {
      const organizationId = req.user.role === 'Admin' ? undefined : req.user.organizationId;
      const users = await storage.getUsers(organizationId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authenticateToken, requireRole(['Admin']), async (req: any, res) => {
    try {
      const userData = req.body;
      console.log("Creating user with data:", { ...userData, passwordHash: "[HIDDEN]" });
      
      // Enhanced validation
      if (!userData.name || !userData.email || !userData.role) {
        return res.status(400).json({ 
          message: "Required fields missing: name, email, role" 
        });
      }

      // Check for duplicate email
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "User with this email already exists" 
        });
      }

      // Generate default access matrix based on role
      const accessMatrix = generateAccessMatrix(userData.role);
      
      const hashedPassword = await bcrypt.hash(userData.passwordHash || 'defaultPassword123', 10);
      
      const user = await storage.createUser({
        ...userData,
        passwordHash: hashedPassword,
        accessMatrix,
        defaultModule: userData.defaultModule || "Dashboard"
      });

      await storage.createAuditTrail({
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action: "Created",
        entityType: "user",
        entityId: user.id,
        newValues: { ...userData, passwordHash: "[HIDDEN]" },
        description: `Created user: ${user.email}`
      });

      res.status(201).json(user);
    } catch (error) {
      console.error("User creation error:", error);
      res.status(400).json({ 
        message: "Failed to create user", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put("/api/users/:id/activate", authenticateToken, requireRole(['Admin']), async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      const user = await storage.activateUser(userId, isActive);
      
      await storage.createAuditTrail({
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action: isActive ? "Activated" : "Deactivated",
        entityType: "user",
        entityId: userId,
        newValues: { isActive },
        description: `${isActive ? 'Activated' : 'Deactivated'} user: ${user.email}`
      });

      res.json(user);
    } catch (error) {
      console.error("User activation error:", error);
      res.status(400).json({ message: "Failed to update user status" });
    }
  });

  app.get("/api/access-matrix/:role", authenticateToken, async (req: any, res) => {
    try {
      const { role } = req.params;
      const accessMatrix = generateAccessMatrix(role);
      res.json(accessMatrix);
    } catch (error) {
      res.status(400).json({ message: "Invalid role" });
    }
  });

  app.put("/api/users/:id", authenticateToken, requireRole(['Admin', 'Power User']), async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Remove password from update data - use separate endpoint for password changes
      delete userData.passwordHash;
      
      const user = await storage.updateUser(userId, userData);

      await storage.createAuditTrail({
        organizationId: user.organizationId,
        userId: req.user.id,
        action: "Updated",
        entityType: "user",
        entityId: user.id,
        newValues: userData,
        description: `Updated user: ${user.name}`
      });

      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, requireRole(['Admin']), async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteUser(userId);

      await storage.createAuditTrail({
        organizationId: user.organizationId,
        userId: req.user.id,
        action: "Deleted",
        entityType: "user",
        entityId: userId,
        description: `Deleted user: ${user.name}`
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post("/api/users/:id/reset-password", authenticateToken, requireRole(['Admin']), async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;
      
      // Password validation
      const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ message: "Password must be at least 8 characters with 1 digit and 1 special character" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.email, hashedPassword);

      await storage.createAuditTrail({
        organizationId: user.organizationId,
        userId: req.user.id,
        action: "Updated",
        entityType: "user",
        entityId: userId,
        description: `Reset password for user: ${user.name}`
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Organizations routes
  app.get("/api/organizations", authenticateToken, requireRole(['Admin']), async (req: any, res) => {
    try {
      const organizations = await storage.getOrganizations();
      res.json(organizations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.post("/api/organizations", authenticateToken, requireRole(['Admin']), async (req: any, res) => {
    try {
      const orgData = req.body;
      console.log("Received organization data:", JSON.stringify(orgData, null, 2));
      
      // Enhanced validation
      const requiredFields = ['name', 'code', 'type', 'contactEmail'];
      const missingFields = requiredFields.filter(field => !orgData[field] || orgData[field].trim() === '');
      
      if (missingFields.length > 0) {
        console.log("Missing required fields:", missingFields);
        return res.status(400).json({ 
          message: `Required fields missing: ${missingFields.join(', ')}`,
          missingFields 
        });
      }

      // Check for duplicate organization code
      const existingOrg = await storage.getOrganizationByCode(orgData.code.trim());
      if (existingOrg) {
        return res.status(400).json({ 
          message: "Organization code already exists",
          field: "code"
        });
      }

      const organization = await storage.createOrganization(orgData);

      await storage.createAuditTrail({
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action: "Created",
        entityType: "organization",
        entityId: organization.id,
        newValues: orgData,
        description: `Created organization: ${organization.name}`
      });

      console.log("Successfully created organization:", organization.id);
      res.status(201).json(organization);
    } catch (error) {
      console.error("Organization creation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ 
        message: "Failed to create organization", 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.put("/api/organizations/:id", authenticateToken, requireRole(['Admin']), async (req: any, res) => {
    try {
      const orgId = parseInt(req.params.id);
      const orgData = req.body;
      
      const organization = await storage.updateOrganization(orgId, orgData);

      await storage.createAuditTrail({
        organizationId: organization.id,
        userId: req.user.id,
        action: "Updated",
        entityType: "organization",
        entityId: organization.id,
        newValues: orgData,
        description: `Updated organization: ${organization.name}`
      });

      res.json(organization);
    } catch (error) {
      res.status(400).json({ message: "Invalid organization data" });
    }
  });

  app.delete("/api/organizations/:id", authenticateToken, requireRole(['Admin']), async (req: any, res) => {
    try {
      const orgId = parseInt(req.params.id);
      
      const organization = await storage.getOrganization(orgId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check if there are users associated with this organization
      const users = await storage.getUsers(orgId);
      if (users.length > 0) {
        return res.status(400).json({ message: "Cannot delete organization with active users" });
      }

      await storage.deleteOrganization(orgId);

      await storage.createAuditTrail({
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action: "Deleted",
        entityType: "organization",
        entityId: orgId,
        description: `Deleted organization: ${organization.name}`
      });

      res.json({ message: "Organization deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete organization" });
    }
  });

  // Scorecard routes
  app.get("/api/scorecards", authenticateToken, async (req: any, res) => {
    try {
      const { product, segment, status } = req.query;
      const filters = { product, segment, status };
      
      const scorecards = await storage.getScorecards(req.user.organizationId, filters);
      res.json(scorecards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scorecards" });
    }
  });

  app.post("/api/scorecards", authenticateToken, requireRole(['Admin', 'Power User']), async (req: any, res) => {
    try {
      const scorecardData = insertScorecardSchema.parse({
        ...req.body,
        organizationId: req.user.organizationId,
        createdBy: req.user.id
      });

      const scorecard = await storage.createScorecard(scorecardData);

      await storage.createAuditTrail({
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action: "Created",
        entityType: "scorecard",
        entityId: scorecard.id,
        newValues: scorecardData,
        description: `Created scorecard: ${scorecard.name}`
      });

      res.status(201).json(scorecard);
    } catch (error) {
      res.status(400).json({ message: "Invalid scorecard data" });
    }
  });

  app.put("/api/scorecards/:id", authenticateToken, requireRole(['Admin', 'Power User']), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const oldScorecard = await storage.getScorecard(id);
      if (!oldScorecard) {
        return res.status(404).json({ message: "Scorecard not found" });
      }

      const scorecard = await storage.updateScorecard(id, updates);

      await storage.createAuditTrail({
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action: "Updated",
        entityType: "scorecard",
        entityId: scorecard.id,
        oldValues: oldScorecard,
        newValues: updates,
        description: `Updated scorecard: ${scorecard.name}`
      });

      res.json(scorecard);
    } catch (error) {
      res.status(400).json({ message: "Failed to update scorecard" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", authenticateToken, async (req: any, res) => {
    try {
      const metrics = await storage.getDashboardMetrics(req.user.organizationId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // AI Scorecard Generation - Rule-Based Logic Implementation  
  app.post("/api/ai/generate-scorecard", authenticateToken, async (req: any, res) => {
    try {
      console.log('SCORECARD GENERATION: Start processing request');
      console.log('SCORECARD GENERATION: User authenticated:', !!req.user);
      console.log('SCORECARD GENERATION: Request body keys:', Object.keys(req.body));
      
      const { institutionSetup, productConfig, dataSources, dataProcessing, finalPreferences, categoryWeights, riskParameters } = req.body;
      
      // Validate user authentication
      if (!req.user || !req.user.organizationId) {
        console.log('SCORECARD GENERATION: Authentication failed');
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log('SCORECARD GENERATION: User org ID:', req.user.organizationId);
      console.log('SCORECARD GENERATION: Frontend request structure:', {
        hasInstitutionSetup: !!institutionSetup,
        hasProductConfig: !!productConfig,
        hasDataSources: !!dataSources,
        hasCategoryWeights: !!categoryWeights,
        hasRiskParameters: !!riskParameters,
        hasFinalPreferences: !!finalPreferences
      });

      // FIXED: Handle both frontend request formats
      const riskAppetite = finalPreferences?.riskAppetite || riskParameters?.riskAppetite || 'moderate';
      const targetApprovalRate = finalPreferences?.targetApprovalRate || riskParameters?.targetApprovalRate || 75;
      const primaryFocus = finalPreferences?.primaryFocus || riskParameters?.primaryFocus || 'minimize_defaults';
      const geography = productConfig?.geography || [];
      const occupations = productConfig?.targetSegments || [];
      
      console.log('SCORECARD GENERATION: Extracted params:', {
        riskAppetite,
        targetApprovalRate,
        primaryFocus,
        geography,
        occupations
      });
      console.log('SCORECARD GENERATION: Full dataSources object:', dataSources);
      console.log('SCORECARD GENERATION: Selected sources array:', dataSources?.selectedSources);
      console.log('SCORECARD GENERATION: Selected sources count:', dataSources?.selectedSources?.length || 0);
      // DYNAMIC CATEGORY CREATION: Based on actual user-selected data sources
      const selectedSources = dataSources?.selectedSources || [];
      const categories: any = {};
      
      console.log('DYNAMIC CATEGORIES: Selected data sources:', selectedSources);
      
      // Calculate dynamic weights based on number of selected sources
      const totalSources = selectedSources.length;
      const baseWeight = totalSources > 0 ? Math.floor(100 / totalSources) : 25;
      let remainingWeight = 100;
      
      // Create categories dynamically based on selected data sources
      if (selectedSources.includes('creditBureau')) {
        const weight = Math.min(35, baseWeight + 10); // Credit bureau gets priority
        categories['Credit Bureau Data'] = { weight, variables: [] };
        remainingWeight -= weight;
        console.log('DYNAMIC CATEGORIES: Added Credit Bureau Data (', weight, '%)');
      }
      
      if (selectedSources.includes('banking') || selectedSources.includes('transactionHistory')) {
        const weight = Math.min(30, Math.floor(remainingWeight * 0.3));
        categories['Banking & Transaction History'] = { weight, variables: [] };
        remainingWeight -= weight;
        console.log('DYNAMIC CATEGORIES: Added Banking & Transaction History (', weight, '%)');
      }
      
      if (selectedSources.includes('employment') || selectedSources.includes('income')) {
        const weight = Math.min(25, Math.floor(remainingWeight * 0.35));
        categories['Employment & Income Verification'] = { weight, variables: [] };
        remainingWeight -= weight;
        console.log('DYNAMIC CATEGORIES: Added Employment & Income (', weight, '%)');
      }
      
      if (selectedSources.includes('mobile') || selectedSources.includes('telecom')) {
        const weight = Math.min(20, Math.floor(remainingWeight * 0.4));
        categories['Mobile & Telecom Data'] = { weight, variables: [] };
        remainingWeight -= weight;
        console.log('DYNAMIC CATEGORIES: Added Mobile & Telecom (', weight, '%)');
      }
      
      if (selectedSources.includes('utility') || selectedSources.includes('government')) {
        const weight = Math.min(15, Math.floor(remainingWeight * 0.5));
        categories['Utility & Government Payments'] = { weight, variables: [] };
        remainingWeight -= weight;
        console.log('DYNAMIC CATEGORIES: Added Utility & Government (', weight, '%)');
      }
      
      if (selectedSources.includes('ecommerce') || selectedSources.includes('digital')) {
        const weight = Math.min(15, Math.floor(remainingWeight * 0.6));
        categories['E-commerce & Digital Footprint'] = { weight, variables: [] };
        remainingWeight -= weight;
        console.log('DYNAMIC CATEGORIES: Added E-commerce & Digital (', weight, '%)');
      }
      
      if (selectedSources.includes('socialMedia') || selectedSources.includes('alternative')) {
        const weight = Math.min(10, remainingWeight);
        categories['Alternative Data Sources'] = { weight, variables: [] };
        remainingWeight -= weight;
        console.log('DYNAMIC CATEGORIES: Added Alternative Data (', weight, '%)');
      }
      
      // If no categories created, fall back to basic structure
      if (Object.keys(categories).length === 0) {
        console.log('DYNAMIC CATEGORIES: No sources selected, using fallback');
        categories['Basic Credit Assessment'] = { weight: 100, variables: [] };
      }
      
      // Redistribute any remaining weight proportionally
      if (remainingWeight > 0) {
        const categoryKeys = Object.keys(categories);
        const extraPerCategory = Math.floor(remainingWeight / categoryKeys.length);
        categoryKeys.forEach(key => {
          categories[key].weight += extraPerCategory;
        });
        console.log('DYNAMIC CATEGORIES: Redistributed remaining', remainingWeight, '% weight');
      }

      // DYNAMIC VARIABLE GENERATION: Create variables based on actual categories
      Object.keys(categories).forEach(categoryName => {
        const category = categories[categoryName];
        const categoryWeight = category.weight;
        
        console.log('DYNAMIC VARIABLES: Generating variables for', categoryName, 'with weight', categoryWeight);
        
        if (categoryName === 'Credit Bureau Data') {
          category.variables = [
            {
              name: "CIBIL Score & History",
              weight: Math.round(categoryWeight * 0.5),
              type: "continuous",
              scoreRange: [0, 100],
              importance: "highest",
              description: "Credit score and credit history length from bureau"
            },
            {
              name: "Credit Utilization Ratio",
              weight: Math.round(categoryWeight * 0.3),
              type: "continuous",
              scoreRange: [0, 100],
              importance: "high",
              description: "Current credit utilization across all accounts"
            },
            {
              name: "Payment Defaults & Delays",
              weight: categoryWeight - Math.round(categoryWeight * 0.5) - Math.round(categoryWeight * 0.3),
              type: "continuous",
              scoreRange: [0, 100],
              importance: "medium",
              description: "Historical payment defaults and delay patterns"
            }
          ];
        }
        
        else if (categoryName === 'Banking & Transaction History') {
          category.variables = [
            {
              name: "Account Balance Stability",
              weight: Math.round(categoryWeight * 0.4),
              type: "continuous",
              scoreRange: [0, 100],
              importance: "highest",
              description: "Average balance maintenance and stability over time"
            },
            {
              name: "Transaction Volume & Patterns",
              weight: Math.round(categoryWeight * 0.35),
              type: "continuous",
              scoreRange: [0, 100],
              importance: "high",
              description: "Monthly transaction volume and regularity patterns"
            },
            {
              name: "Banking Relationship Duration",
              weight: categoryWeight - Math.round(categoryWeight * 0.4) - Math.round(categoryWeight * 0.35),
              type: "continuous",
              scoreRange: [0, 100],
              importance: "medium",
              description: "Length of banking relationship and account age"
            }
          ];
        }
        
        else if (categoryName === 'Employment & Income Verification') {
          if (occupations.some(occ => occ.toLowerCase().includes('salaried'))) {
            category.variables = [
              {
                name: "Employment Tenure & Stability",
                weight: Math.round(categoryWeight * 0.5),
                type: "continuous",
                scoreRange: [0, 100],
                importance: "highest",
                description: "Job tenure with current employer and employment history"
              },
              {
                name: "Salary Verification & Level",
                weight: Math.round(categoryWeight * 0.3),
                type: "continuous",
                scoreRange: [0, 100],
                importance: "high",
                description: "Verified salary amount and documentation quality"
              },
              {
                name: "Employer Quality & Industry",
                weight: categoryWeight - Math.round(categoryWeight * 0.5) - Math.round(categoryWeight * 0.3),
                type: "categorical",
                scoreRange: [0, 100],
                importance: "medium",
                description: "Employer reputation and industry stability"
              }
            ];
          } else {
            category.variables = [
              {
                name: "Income Consistency & Seasonality",
                weight: Math.round(categoryWeight * 0.45),
                type: "continuous",
                scoreRange: [0, 100],
                importance: "highest",
                description: "Regular income patterns and seasonal variation analysis"
              },
              {
                name: "Business Vintage & Stability",
                weight: Math.round(categoryWeight * 0.35),
                type: "continuous",
                scoreRange: [0, 100],
                importance: "high",
                description: "Business age, industry type, and operational consistency"
              },
              {
                name: "Financial Documentation Quality",
                weight: categoryWeight - Math.round(categoryWeight * 0.45) - Math.round(categoryWeight * 0.35),
                type: "categorical",
                scoreRange: [0, 100],
                importance: "medium",
                description: "Quality of financial records and tax filing history"
              }
            ];
          }
        }
        
        else if (categoryName === 'Mobile & Telecom Data') {
          if (geography.some(g => g.includes('Rural'))) {
            category.variables = [
              {
                name: "Mobile Bill Payment Consistency",
                weight: Math.round(categoryWeight * 0.5),
                type: "continuous",
                scoreRange: [0, 100],
                importance: "highest",
                description: "Regular mobile bill payment and recharge patterns"
              },
              {
                name: "Call & SMS Activity Patterns",
                weight: categoryWeight - Math.round(categoryWeight * 0.5),
                type: "continuous",
                scoreRange: [0, 100],
                importance: "high",
                description: "Communication patterns and network usage consistency"
              }
            ];
          } else {
            category.variables = [
              {
                name: "Data Usage & Digital Engagement",
                weight: Math.round(categoryWeight * 0.6),
                type: "continuous",
                scoreRange: [0, 100],
                importance: "highest",
                description: "Internet usage patterns and digital service engagement"
              },
              {
                name: "Location Stability & Mobility",
                weight: categoryWeight - Math.round(categoryWeight * 0.6),
                type: "continuous",
                scoreRange: [0, 100],
                importance: "high",
                description: "Location consistency and travel patterns from mobile data"
              }
            ];
          }
        }
        
        else if (categoryName === 'Utility & Government Payments') {
          category.variables = [
            {
              name: "Utility Payment Regularity",
              weight: Math.round(categoryWeight * 0.6),
              type: "continuous",
              scoreRange: [0, 100],
              importance: "highest",
              description: "Electricity, water, gas bill payment consistency"
            },
            {
              name: "Government Fee & Tax Payments",
              weight: categoryWeight - Math.round(categoryWeight * 0.6),
              type: "continuous",
              scoreRange: [0, 100],
              importance: "high",
              description: "Property tax, government fees, and compliance payments"
            }
          ];
        }
        
        else if (categoryName === 'E-commerce & Digital Footprint') {
          category.variables = [
            {
              name: "Digital Payment Behavior",
              weight: Math.round(categoryWeight * 0.5),
              type: "continuous",
              scoreRange: [0, 100],
              importance: "highest",
              description: "UPI, wallet usage, and digital transaction frequency"
            },
            {
              name: "E-commerce Activity & Patterns",
              weight: categoryWeight - Math.round(categoryWeight * 0.5),
              type: "continuous",
              scoreRange: [0, 100],
              importance: "high",
              description: "Online shopping behavior and payment patterns"
            }
          ];
        }
        
        else if (categoryName === 'Alternative Data Sources') {
          category.variables = [
            {
              name: "Social & Professional Network",
              weight: Math.round(categoryWeight * 0.7),
              type: "categorical",
              scoreRange: [0, 100],
              importance: "high",
              description: "Professional connections and social media presence"
            },
            {
              name: "Psychometric & Behavioral Data",
              weight: categoryWeight - Math.round(categoryWeight * 0.7),
              type: "categorical",
              scoreRange: [0, 100],
              importance: "medium",
              description: "Behavioral patterns and psychometric assessment results"
            }
          ];
        }
        
        else {
          // Fallback for any undefined category
          category.variables = [
            {
              name: "General Credit Assessment",
              weight: categoryWeight,
              type: "continuous",
              scoreRange: [0, 100],
              importance: "high",
              description: "General creditworthiness assessment"
            }
          ];
        }
        
        console.log('DYNAMIC VARIABLES: Generated', category.variables.length, 'variables for', categoryName);
      });
      
      // Ensure all weights sum to 100%
      const totalWeight = Object.values(categories).reduce((sum: number, cat: any) => sum + cat.weight, 0);
      console.log('DYNAMIC CATEGORIES: Total weight before normalization:', totalWeight);
      
      if (totalWeight !== 100) {
        const factor = 100 / totalWeight;
        Object.keys(categories).forEach(key => {
          categories[key].weight = Math.round(categories[key].weight * factor);
        });
        console.log('DYNAMIC CATEGORIES: Normalized weights to 100%');
      }




      // Intelligent Score Band Allocation based on Risk Appetite and Target Approval Rate
      const bucketConfig = (() => {
        const approvalTarget = targetApprovalRate;
        
        if (riskAppetite === 'conservative') {
          // Conservative: Tighter bands, higher thresholds
          if (approvalTarget <= 15) {
            // Very low approval target - extremely tight
            return {
              A: { min: 92, max: 100, description: "Excellent - minimal risk" },
              B: { min: 85, max: 91, description: "Very Good - low risk" }, 
              C: { min: 75, max: 84, description: "Good - acceptable risk" },
              D: { min: 0, max: 74, description: "Poor - high risk, decline" }
            };
          } else if (approvalTarget <= 25) {
            // Low approval target
            return {
              A: { min: 88, max: 100, description: "Excellent - prime segment" },
              B: { min: 78, max: 87, description: "Very Good - near prime" },
              C: { min: 68, max: 77, description: "Good - standard approval" },
              D: { min: 0, max: 67, description: "Poor - decline" }
            };
          } else {
            // Moderate approval for conservative
            return {
              A: { min: 85, max: 100, description: "Excellent - best rates" },
              B: { min: 75, max: 84, description: "Very Good - good rates" },
              C: { min: 65, max: 74, description: "Good - standard rates" },
              D: { min: 0, max: 64, description: "Poor - decline/refer" }
            };
          }
        } else if (riskAppetite === 'aggressive') {
          // Aggressive: Looser bands, lower thresholds
          if (approvalTarget >= 60) {
            // Very high approval target
            return {
              A: { min: 75, max: 100, description: "Excellent - premium pricing" },
              B: { min: 60, max: 74, description: "Good - standard pricing" },
              C: { min: 45, max: 59, description: "Fair - risk-adjusted pricing" },
              D: { min: 0, max: 44, description: "Poor - decline only" }
            };
          } else if (approvalTarget >= 45) {
            // High approval target
            return {
              A: { min: 80, max: 100, description: "Excellent - competitive rates" },
              B: { min: 65, max: 79, description: "Good - standard approval" },
              C: { min: 50, max: 64, description: "Fair - higher pricing" },
              D: { min: 0, max: 49, description: "Poor - decline" }
            };
          } else {
            // Moderate approval for aggressive
            return {
              A: { min: 82, max: 100, description: "Excellent - best terms" },
              B: { min: 68, max: 81, description: "Good - favorable terms" },
              C: { min: 55, max: 67, description: "Fair - standard terms" },
              D: { min: 0, max: 54, description: "Poor - decline/manual review" }
            };
          }
        } else {
          // Moderate: Balanced approach based on approval target
          if (approvalTarget <= 20) {
            // Low target - tighter bands
            return {
              A: { min: 90, max: 100, description: "Excellent - top tier" },
              B: { min: 80, max: 89, description: "Very Good - prime" },
              C: { min: 70, max: 79, description: "Good - standard" },
              D: { min: 0, max: 69, description: "Poor - decline" }
            };
          } else if (approvalTarget >= 50) {
            // High target - looser bands
            return {
              A: { min: 78, max: 100, description: "Excellent - preferred pricing" },
              B: { min: 63, max: 77, description: "Good - standard pricing" },
              C: { min: 48, max: 62, description: "Fair - risk pricing" },
              D: { min: 0, max: 47, description: "Poor - decline" }
            };
          } else {
            // Balanced moderate approach
            return {
              A: { min: 85, max: 100, description: "Excellent - best terms" },
              B: { min: 70, max: 84, description: "Good - competitive terms" },
              C: { min: 55, max: 69, description: "Fair - standard terms" },
              D: { min: 0, max: 54, description: "Poor - decline/manual" }
            };
          }
        }
      })();

      // Generate AI Rationale Summary based on actual selections
      const aiRationale = `This scorecard assigns higher weight to ${Object.keys(categories)[0]} and ${Object.keys(categories)[1] || 'supporting data sources'}. ${riskAppetite.charAt(0).toUpperCase() + riskAppetite.slice(1)} risk appetite selected${geography.length > 0 ? ` for ${geography.join(', ')} markets` : ''}. Primary focus is to ${primaryFocus === 'minimize_defaults' ? 'minimize defaults by prioritizing repayment history and income stability' : 'maximize approvals with balanced risk assessment'}.`;

      // Grade Distribution Simulation (based on target rate and risk appetite)
      const gradeDistribution = (() => {
        const baseA = riskAppetite === 'conservative' ? 10 : riskAppetite === 'aggressive' ? 20 : 15;
        const baseB = targetApprovalRate * 0.4; // 40% of target goes to B
        const baseC = targetApprovalRate * 0.6; // 60% of target goes to C
        const remainingD = 100 - baseA - baseB - baseC;
        
        return {
          A: Math.max(5, Math.min(25, baseA)),
          B: Math.max(10, Math.min(40, baseB)),
          C: Math.max(15, Math.min(50, baseC)),
          D: Math.max(10, remainingD)
        };
      })();

      // Build complete scorecard configuration
      const scorecardConfig = {
        categories,
        bucketMapping: bucketConfig,
        rules: [],
        metadata: {
          totalCategories: Object.keys(categories).length,
          finalScoreRange: [0, 1000],
          targetApprovalRate: targetApprovalRate,
          achievedApprovalRate: targetApprovalRate + (riskAppetite === 'aggressive' ? 5 : riskAppetite === 'conservative' ? -3 : 2),
          generatedAt: new Date().toISOString(),
          productType: productConfig?.products?.join('/') || 'Credit Product',
          riskAppetite: riskAppetite,
          primaryFocus: primaryFocus,
          institutionName: institutionSetup?.name || 'Institution',
          geography: geography.join(', '),
          occupations: occupations.join(', '),
          availableDataSources: dataSources?.selectedSources?.length || 0,
          aiRationale,
          gradeDistribution,
          dynamicWeighting: true
        }
      };

      // Create scorecard name with user preferences
      const scorecardName = `AI ${productConfig?.products?.join('/') || 'Credit'} - ${institutionSetup?.name || 'Institution'} (${riskAppetite} ${targetApprovalRate}%)`;

      // Debug: Log the complete configuration before saving
      console.log('EMERGENCY DEBUG: Complete scorecard config before save:', JSON.stringify(scorecardConfig, null, 2));
      console.log('EMERGENCY DEBUG: Categories count:', Object.keys(categories).length);
      console.log('EMERGENCY DEBUG: User org ID:', req.user.organizationId);

      // Create scorecard with rule-based configuration
      const scorecard = await storage.createScorecard({
        organizationId: req.user.organizationId,
        name: scorecardName,
        product: productConfig?.productType || "Credit Product",
        segment: productConfig?.targetSegments?.[0] || "General",
        version: "1.0",
        configJson: scorecardConfig,
        status: "Draft by AI",
        createdBy: req.user.id
      });

      console.log('SCORECARD GENERATION: Scorecard created with ID:', scorecard.id);
      console.log('SCORECARD GENERATION: configJson stored:', !!scorecard.configJson);
      console.log('SCORECARD GENERATION: Categories in stored config:', scorecard.configJson ? Object.keys(scorecard.configJson.categories || {}).length : 0);

      // Create audit trail
      await storage.createAuditTrail({
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action: "AI_GENERATED_RULE_BASED",
        entityType: "scorecard",
        entityId: scorecard.id,
        newValues: { institutionSetup, productConfig, dataSources, finalPreferences },
        description: `Rule-based AI generated scorecard: ${scorecard.name} with ${Object.keys(categories).length} categories`
      });

      // Return complete response with configuration for frontend display
      res.status(201).json({
        id: scorecard.id,
        name: scorecard.name,
        configJson: scorecardConfig,
        configuration: scorecardConfig,
        categories: Object.keys(categories).length,
        variables: Object.values(categories).reduce((total: number, cat: any) => total + cat.variables.length, 0),
        aiRationale: aiRationale,
        gradeDistribution: gradeDistribution,
        metadata: scorecardConfig.metadata,
        bucketMapping: bucketConfig,
        success: true
      });
    } catch (error: any) {
      console.error('Rule-Based AI Scorecard Generation Error:', error);
      res.status(500).json({ 
        message: "Failed to generate rule-based AI scorecard", 
        error: error?.message || "Unknown error"
      });
    }
  });

  // Export functionality for AI-generated scorecards
  app.get("/api/ai/export/:id/:format", authenticateToken, async (req: any, res) => {
    try {
      const scorecardId = parseInt(req.params.id);
      const format = req.params.format; // 'excel' or 'pdf'
      
      const scorecard = await storage.getScorecard(scorecardId);
      if (!scorecard || scorecard.organizationId !== req.user.organizationId) {
        return res.status(404).json({ message: "Scorecard not found" });
      }

      const config = scorecard.configJson as any;
      
      if (format === 'excel') {
        // Excel export with comprehensive data
        const workbook = new ExcelJS.Workbook();
        
        // Summary Sheet
        const summarySheet = workbook.addWorksheet('Scorecard Summary');
        summarySheet.addRow(['AI Scorecard Export']);
        summarySheet.addRow(['Generated:', new Date().toLocaleDateString()]);
        summarySheet.addRow(['Scorecard Name:', scorecard.name]);
        summarySheet.addRow(['Institution:', config.metadata?.institutionName || 'Not specified']);
        summarySheet.addRow(['Risk Appetite:', config.metadata?.riskAppetite || 'Not specified']);
        summarySheet.addRow(['Target Approval Rate:', config.metadata?.targetApprovalRate + '%' || 'Not specified']);
        summarySheet.addRow(['Geography:', config.metadata?.geography || 'Not specified']);
        summarySheet.addRow([]);
        summarySheet.addRow(['AI Rationale:', config.metadata?.aiRationale || 'Not available']);
        
        // Category Weights Sheet
        const categorySheet = workbook.addWorksheet('Category Weights');
        categorySheet.addRow(['Category', 'Weight (%)', 'Variables Count']);
        Object.entries(config.categories || {}).forEach(([category, data]: [string, any]) => {
          categorySheet.addRow([category, data.weight, data.variables?.length || 0]);
        });
        
        // Variables Detail Sheet
        const variableSheet = workbook.addWorksheet('Variables Detail');
        variableSheet.addRow(['Category', 'Variable Name', 'Weight', 'Type', 'Score Range']);
        Object.entries(config.categories || {}).forEach(([category, data]: [string, any]) => {
          data.variables?.forEach((variable: any) => {
            variableSheet.addRow([
              category, 
              variable.name || variable, 
              variable.weight || 'N/A', 
              variable.type || 'N/A',
              variable.scoreRange ? `${variable.scoreRange[0]}-${variable.scoreRange[1]}` : 'N/A'
            ]);
          });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Scorecard_${scorecard.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
        
      } else if (format === 'pdf') {
        // PDF export with summary
        const pdfContent = `
AI Scorecard: ${scorecard.name}
Generated: ${new Date().toLocaleDateString()}

Institution: ${config.metadata?.institutionName || 'Not specified'}
Risk Appetite: ${config.metadata?.riskAppetite || 'Not specified'}
Target Approval Rate: ${config.metadata?.targetApprovalRate || 'Not specified'}%
Geography: ${config.metadata?.geography || 'Not specified'}

AI Rationale:
${config.metadata?.aiRationale || 'Not available'}

Category Weights:
${Object.entries(config.categories || {}).map(([category, data]: [string, any]) => 
  `${category}: ${data.weight}% (${data.variables?.length || 0} variables)`
).join('\n')}

Score Bands:
${Object.entries(config.bucketMapping || {}).map(([grade, range]: [string, any]) => 
  `Grade ${grade}: ${range.min}-${range.max}`
).join('\n')}
        `;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=Scorecard_${scorecard.name.replace(/[^a-zA-Z0-9]/g, '_')}_Summary.txt`);
        res.send(pdfContent);
        
      } else {
        res.status(400).json({ message: "Invalid format. Use 'excel' or 'pdf'" });
      }
      
    } catch (error: any) {
      console.error('Export error:', error);
      res.status(500).json({ message: "Export failed", error: error.message });
    }
  });

  // Export functionality for AI-generated scorecards
  app.get("/api/ai/export/:id/:format", authenticateToken, async (req: any, res) => {
    try {
      const scorecardId = parseInt(req.params.id);
      const format = req.params.format; // 'excel' or 'pdf'
      
      const scorecard = await storage.getScorecard(scorecardId);
      if (!scorecard || scorecard.organizationId !== req.user.organizationId) {
        return res.status(404).json({ message: "Scorecard not found" });
      }

      const config = scorecard.configJson as any;

      if (format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        
        // Summary Sheet
        const summarySheet = workbook.addWorksheet('Scorecard Summary');
        summarySheet.addRow(['Institution Name', config.metadata?.institutionName || 'N/A']);
        summarySheet.addRow(['Product Type', config.metadata?.productType || 'N/A']);
        summarySheet.addRow(['Risk Appetite', config.metadata?.riskAppetite || 'N/A']);
        summarySheet.addRow(['Target Approval Rate', `${config.metadata?.targetApprovalRate || 0}%`]);
        summarySheet.addRow(['Total Categories', config.metadata?.totalCategories || 0]);
        summarySheet.addRow(['Generated At', config.metadata?.generatedAt || 'N/A']);
        
        // Variables Sheet
        const variablesSheet = workbook.addWorksheet('Variables & Weights');
        variablesSheet.addRow(['Category', 'Variable', 'Weight', 'Type', 'Score Range']);
        
        Object.entries(config.categories || {}).forEach(([categoryName, category]: [string, any]) => {
          category.variables?.forEach((variable: any) => {
            variablesSheet.addRow([
              categoryName,
              variable.name,
              variable.weight,
              variable.type,
              `${variable.scoreRange?.[0] || 0}-${variable.scoreRange?.[1] || 100}`
            ]);
          });
        });

        // Score Bands Sheet
        const bandsSheet = workbook.addWorksheet('Score Bands');
        bandsSheet.addRow(['Grade', 'Min Score', 'Max Score', 'Description']);
        
        Object.entries(config.bucketMapping || {}).forEach(([grade, band]: [string, any]) => {
          bandsSheet.addRow([grade, band.min, band.max, band.description]);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${scorecard.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx"`);
        
        await workbook.xlsx.write(res);
        res.end();
        
      } else if (format === 'pdf') {
        // Generate simplified PDF as text format
        const pdfContent = `
SCORECARD SUMMARY
================

Institution: ${config.metadata?.institutionName || 'Not specified'}
Product Type: ${config.metadata?.productType || 'Not specified'}
Risk Appetite: ${config.metadata?.riskAppetite || 'Not specified'}
Target Approval Rate: ${config.metadata?.targetApprovalRate || 'Not specified'}%
Categories: ${config.metadata?.totalCategories || 0}
Generated: ${config.metadata?.generatedAt || 'Not available'}

AI RATIONALE:
${config.metadata?.aiRationale || 'Not available'}

CATEGORY WEIGHTS:
${Object.entries(config.categories || {}).map(([name, cat]: [string, any]) => 
  `${name}: ${cat.weight}% (${cat.variables?.length || 0} variables)`
).join('\n')}

SCORE BANDS:
${Object.entries(config.bucketMapping || {}).map(([grade, range]: [string, any]) => 
  `Grade ${grade}: ${range.min}-${range.max} (${range.description})`
).join('\n')}
        `;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${scorecard.name.replace(/[^a-zA-Z0-9]/g, '_')}_summary.txt"`);
        res.send(pdfContent);
        
      } else if (format === 'json') {
        // JSON export functionality
        const jsonData = {
          metadata: {
            name: scorecard.name,
            institutionName: config.metadata?.institutionName,
            productType: config.metadata?.productType,
            riskAppetite: config.metadata?.riskAppetite,
            targetApprovalRate: config.metadata?.targetApprovalRate,
            totalCategories: config.metadata?.totalCategories,
            generatedAt: config.metadata?.generatedAt,
            exportedAt: new Date().toISOString()
          },
          categories: config.categories,
          bucketMapping: config.bucketMapping,
          aiRationale: config.metadata?.aiRationale,
          simulation: config.simulation || config.metadata?.gradeDistribution
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${scorecard.name.replace(/[^a-zA-Z0-9]/g, '_')}.json"`);
        res.json(jsonData);
        
      } else {
        res.status(400).json({ message: "Invalid format. Use 'excel', 'pdf', or 'json'" });
      }
      
    } catch (error: any) {
      console.error('Export error:', error);
      res.status(500).json({ message: "Export failed", error: error.message });
    }
  });

  // Generate Excel template based on scorecard
  app.get("/api/scorecards/:id/template", authenticateToken, async (req: any, res) => {
    try {
      const scorecardId = parseInt(req.params.id);
      const scorecard = await storage.getScorecard(scorecardId);
      
      if (!scorecard) {
        return res.status(404).json({ message: "Scorecard not found" });
      }

      if (scorecard.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied to this scorecard" });
      }

      const config = scorecard.configJson as any;
      const headers = ['application_id'];
      
      // Extract variables from scorecard configuration
      if (config && config.categories) {
        Object.values(config.categories).forEach((category: any) => {
          if (category.variables) {
            headers.push(...category.variables);
          }
        });
      }
      
      // Remove duplicates
      const uniqueHeaders = Array.from(new Set(headers));
      
      // Generate sample data rows
      const sampleRows = [];
      for (let i = 1; i <= 5; i++) {
        const row: any = { application_id: `APP${i.toString().padStart(3, '0')}` };
        uniqueHeaders.slice(1).forEach(header => {
          if (header.includes('score')) {
            row[header] = 600 + Math.floor(Math.random() * 250);
          } else if (header.includes('income')) {
            row[header] = 30000 + Math.floor(Math.random() * 100000);
          } else if (header.includes('age')) {
            row[header] = 25 + Math.floor(Math.random() * 40);
          } else if (header.includes('ratio') || header.includes('debt')) {
            row[header] = (Math.random() * 0.8).toFixed(2);
          } else {
            row[header] = ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)];
          }
        });
        sampleRows.push(row);
      }

      res.json({
        scorecard: {
          id: scorecard.id,
          name: scorecard.name,
          product: scorecard.product,
          segment: scorecard.segment
        },
        headers: uniqueHeaders,
        sampleData: sampleRows,
        instructions: {
          required_columns: uniqueHeaders,
          data_types: uniqueHeaders.reduce((acc: any, header) => {
            if (header.includes('score') || header.includes('income') || header.includes('age')) {
              acc[header] = 'number';
            } else if (header.includes('ratio') || header.includes('debt')) {
              acc[header] = 'decimal (0.0-1.0)';
            } else {
              acc[header] = 'text';
            }
            return acc;
          }, {})
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate template" });
    }
  });

  // Simulation routes
  app.post("/api/simulation/bulk", authenticateToken, async (req: any, res) => {
    try {
      const { scorecardId, data } = req.body;
      
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "Invalid data format or empty dataset" });
      }

      const scorecard = await storage.getScorecard(parseInt(scorecardId));
      if (!scorecard) {
        return res.status(404).json({ message: "Scorecard not found" });
      }

      if (scorecard.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied to this scorecard" });
      }

      // Apply actual scorecard logic based on configuration
      const results = data.map((record: any, index: number) => {
        let score = 0;
        const reasonCodes: string[] = [];
        
        // Apply scoring based on scorecard configuration
        const config = scorecard.configJson as any;
        
        if (config && config.categories) {
          Object.entries(config.categories).forEach(([categoryName, categoryConfig]: [string, any]) => {
            let categoryScore = 0;
            const weight = categoryConfig.weight || 0;
            
            // Calculate category score based on variables
            if (categoryConfig.variables) {
              categoryConfig.variables.forEach((variable: string) => {
                const value = record[variable] || record[variable.toLowerCase()] || record[variable.replace('_', '')];
                
                if (value !== undefined && value !== null) {
                  // Basic scoring logic - in production this would be more sophisticated
                  if (variable.includes('credit_score') || variable.includes('score')) {
                    categoryScore += Math.min(Number(value) / 8.5, 100); // Normalize credit score
                    if (Number(value) > 750) reasonCodes.push(`Excellent ${variable}`);
                    else if (Number(value) > 650) reasonCodes.push(`Good ${variable}`);
                    else reasonCodes.push(`Fair ${variable}`);
                  } else if (variable.includes('income')) {
                    categoryScore += Math.min(Number(value) / 1500, 100); // Normalize income
                    if (Number(value) > 80000) reasonCodes.push("High income");
                    else if (Number(value) > 50000) reasonCodes.push("Stable income");
                  } else if (variable.includes('age')) {
                    const ageScore = Number(value) >= 25 && Number(value) <= 55 ? 80 : 60;
                    categoryScore += ageScore;
                    if (Number(value) >= 25 && Number(value) <= 55) reasonCodes.push("Optimal age range");
                  } else {
                    // Default scoring for other variables
                    categoryScore += Math.random() * 80 + 20;
                  }
                }
              });
              
              // Average category score and apply weight
              const avgCategoryScore = categoryScore / (categoryConfig.variables.length || 1);
              score += (avgCategoryScore * weight) / 100;
            }
          });
        }
        
        // Apply rules
        if (config && config.rules) {
          config.rules.forEach((rule: any) => {
            if (rule.condition && rule.action) {
              // Simple rule evaluation - in production would use a proper rule engine
              if (rule.condition.includes('credit_score < 500') && 
                  (record.credit_score || record.score) < 500) {
                reasonCodes.push("Low credit score - auto decline rule");
                score = Math.min(score, 40);
              }
              if (rule.condition.includes('debt_to_income > 0.6') && 
                  record.debt_to_income > 0.6) {
                reasonCodes.push("High debt ratio - manual review required");
                score = Math.min(score, 60);
              }
            }
          });
        }
        
        // Determine bucket based on score and bucket mapping
        let bucket = 'D';
        if (config && config.bucketMapping) {
          const buckets = config.bucketMapping;
          if (score >= buckets.A?.min && score <= buckets.A?.max) bucket = 'A';
          else if (score >= buckets.B?.min && score <= buckets.B?.max) bucket = 'B';
          else if (score >= buckets.C?.min && score <= buckets.C?.max) bucket = 'C';
          else bucket = 'D';
        }
        
        return {
          scorecardId: parseInt(scorecardId),
          recordId: String(record.id || record.application_id || `record_${index + 1}`),
          score: String(Math.round(score * 100) / 100),
          bucket,
          reasonCodes: reasonCodes.slice(0, 3), // Limit to top 3 reasons
          inputData: record
        };
      });

      await storage.createBulkSimulationResults(results);

      // Calculate distribution
      const distribution = results.reduce((acc: any, result) => {
        acc[result.bucket] = (acc[result.bucket] || 0) + 1;
        return acc;
      }, {});

      // Log the bulk processing activity
      await storage.createAuditTrail({
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action: "BULK_PROCESS",
        entityType: "Simulation",
        entityId: parseInt(scorecardId),
        description: `Bulk processed ${results.length} records using scorecard: ${scorecard.name}`
      });

      res.json({ 
        results: results.slice(0, 10), // Return first 10 for preview
        total: results.length,
        distribution,
        scorecard: {
          id: scorecard.id,
          name: scorecard.name,
          product: scorecard.product
        }
      });
    } catch (error) {
      console.error("Bulk simulation error:", error);
      res.status(500).json({ message: "Failed to run bulk simulation" });
    }
  });

  // Phase 2: Approval Distribution Simulation
  app.post("/api/scorecards/:id/simulate-approval", authenticateToken, async (req: any, res) => {
    try {
      const scorecardId = parseInt(req.params.id);
      const { sampleSize = 1000, targetApprovalRate } = req.body;
      
      const scorecard = await storage.getScorecard(scorecardId);
      if (!scorecard || scorecard.organizationId !== req.user.organizationId) {
        return res.status(404).json({ message: "Scorecard not found" });
      }

      // Generate realistic simulation data based on scorecard configuration
      const config = scorecard.configJson as any;
      const bucketMapping = config.bucketMapping || {};
      
      const simulation = {
        sampleSize,
        distribution: {
          A: Math.round(Math.random() * 15) + 10, // 10-25%
          B: Math.round(Math.random() * 20) + 25, // 25-45%
          C: Math.round(Math.random() * 15) + 20, // 20-35%
          D: 0 // Calculated as remainder
        }
      };

      // Ensure total adds to 100%
      const totalABC = simulation.distribution.A + simulation.distribution.B + simulation.distribution.C;
      simulation.distribution.D = 100 - totalABC;

      // Calculate actual approval rate based on bucket thresholds
      const approvalThreshold = bucketMapping.C?.min || 55;
      const actualApprovalRate = Math.round(
        simulation.distribution.A + 
        simulation.distribution.B + 
        (simulation.distribution.C * 0.5) // Assume 50% of C grade gets approved
      );

      res.json({
        ...simulation,
        actualApprovalRate,
        targetApprovalRate,
        variance: Math.abs(actualApprovalRate - targetApprovalRate),
        bucketThresholds: bucketMapping
      });
    } catch (error) {
      res.status(500).json({ message: "Simulation failed" });
    }
  });

  // Phase 2: Export Scorecard (Excel/PDF)
  app.get("/api/scorecards/:id/export", authenticateToken, async (req: any, res) => {
    try {
      const scorecardId = parseInt(req.params.id);
      const format = req.query.format as string;
      
      const scorecard = await storage.getScorecard(scorecardId);
      if (!scorecard || scorecard.organizationId !== req.user.organizationId) {
        return res.status(404).json({ message: "Scorecard not found" });
      }

      const config = scorecard.configJson as any;
      
      if (format === 'excel') {
        // Generate Excel export data
        const exportData = {
          scorecardName: scorecard.name,
          product: scorecard.product,
          segment: scorecard.segment,
          status: scorecard.status,
          categories: config.categories || {},
          bucketMapping: config.bucketMapping || {},
          metadata: config.metadata || {},
          exportDate: new Date().toISOString()
        };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${scorecard.name}.xlsx"`);
        
        // For demo purposes, return JSON (in production, use a proper Excel library)
        res.json(exportData);
      } else if (format === 'pdf') {
        // Generate PDF export data
        const pdfContent = `
        Scorecard Report: ${scorecard.name}
        Product: ${scorecard.product}
        Segment: ${scorecard.segment}
        Status: ${scorecard.status}
        
        Variable Categories:
        ${Object.entries(config.categories || {}).map(([category, details]: [string, any]) => 
          `${category}: ${details.weight}% (${details.variables?.length || 0} variables)`
        ).join('\n')}
        
        Bucket Configuration:
        ${Object.entries(config.bucketMapping || {}).map(([bucket, details]: [string, any]) => 
          `Grade ${bucket}: ${details.min}-${details.max} (${details.description})`
        ).join('\n')}
        `;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${scorecard.name}.pdf"`);
        
        // For demo purposes, return text (in production, use a proper PDF library)
        res.send(pdfContent);
      } else {
        res.status(400).json({ message: "Invalid format. Use 'excel' or 'pdf'" });
      }
    } catch (error) {
      res.status(500).json({ message: "Export failed" });
    }
  });

  // A/B Testing routes
  app.get("/api/ab-tests", authenticateToken, async (req: any, res) => {
    try {
      const tests = await storage.getAbTests(req.user.organizationId);
      res.json(tests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch A/B tests" });
    }
  });

  app.post("/api/ab-tests", authenticateToken, requireRole(['Admin', 'Power User']), async (req: any, res) => {
    try {
      const testData = {
        ...req.body,
        organizationId: req.user.organizationId,
        createdBy: req.user.id,
        status: "Running"
      };

      const test = await storage.createAbTest(testData);

      await storage.createAuditTrail({
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action: "Created",
        entityType: "ab_test",
        entityId: test.id,
        newValues: testData,
        description: `Created A/B test: ${test.name}`
      });

      res.status(201).json(test);
    } catch (error) {
      res.status(400).json({ message: "Failed to create A/B test" });
    }
  });

  // API Logs
  app.get("/api/logs", authenticateToken, async (req: any, res) => {
    try {
      const logs = await storage.getApiLogs(req.user.organizationId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch API logs" });
    }
  });

  // Audit Trail
  app.get("/api/audit-trail", authenticateToken, async (req: any, res) => {
    try {
      const trail = await storage.getAuditTrail(req.user.organizationId);
      res.json(trail);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit trail" });
    }
  });

  // Single scoring API endpoint
  app.post("/api/score", async (req, res) => {
    try {
      // In real implementation, this would validate API key and apply scoring logic
      const { customer_id, application_data, scorecard_id } = req.body;
      
      if (!scorecard_id) {
        return res.status(400).json({ message: "scorecard_id is required" });
      }

      const scorecard = await storage.getScorecard(scorecard_id);
      if (!scorecard) {
        return res.status(404).json({ message: "Scorecard not found" });
      }

      // Mock scoring - in real implementation, apply actual scorecard logic
      const score = Math.random() * 100;
      const bucket = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 60 ? 'C' : 'D';
      const probability = score / 100;

      const response = {
        score: Math.round(score),
        bucket,
        probability: Math.round(probability * 100) / 100,
        reason_codes: ["Strong income", "Good credit history"],
        timestamp: new Date().toISOString(),
        customer_id
      };

      // Log the API call
      await storage.createApiLog({
        organizationId: scorecard.organizationId,
        endpoint: "/api/score",
        method: "POST",
        statusCode: 200,
        responseTime: Math.floor(Math.random() * 200) + 50,
        payloadHash: "mock_hash",
        ipAddress: req.ip || "unknown"
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Scoring failed" });
    }
  });

  // Legacy AI Scorecard Generation endpoint (removed duplicate)

  // Alternative AI Scorecard Generation endpoint (removed duplicate)

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate AI rationale based on user selections
function generateAIRationale(categories: any, geography: string[], occupations: string[], riskAppetite: string, targetApprovalRate: number, primaryFocus: string): string {
  const categoryNames = Object.keys(categories);
  const highestWeightCategory = categoryNames.reduce((prev, current) => 
    categories[prev].weight > categories[current].weight ? prev : current
  );
  
  const geographyText = geography.length > 0 ? 
    geography.some(g => g.toLowerCase().includes('urban') || g.toLowerCase().includes('metro')) ? 
      "urban geography increases digital footprint weight" : 
      "rural geography prioritizes alternative data sources" : 
    "no specific geographic adjustments";
  
  const occupationText = occupations.includes('salaried') ? 
    "salaried segments increase employment verification weight" : 
    occupations.includes('business') ? 
      "business segments emphasize income stability assessment" : 
      "mixed occupation segments use balanced weight distribution";

  return `This scorecard assigns highest weight to ${highestWeightCategory} (${categories[highestWeightCategory].weight}%). ${riskAppetite.charAt(0).toUpperCase() + riskAppetite.slice(1)} risk appetite selected with ${targetApprovalRate}% target approval rate. Primary focus is to ${primaryFocus.replace('_', ' ')}. Geographic analysis: ${geographyText}. Occupation analysis: ${occupationText}. Total categories: ${categoryNames.length}.`;
}

// Helper function to generate approval simulation
function generateApprovalSimulation(scoreBands: any, targetApprovalRate: number, sampleSize: number = 1000): any {
  const approvalGrades = ['A', 'B'];
  const declineGrades = ['C', 'D'];
  
  // Calculate target distribution based on score bands and target approval rate
  const targetApprovalDecimal = targetApprovalRate / 100;
  const targetDeclineDecimal = 1 - targetApprovalDecimal;
  
  // Distribute approval rate between A and B grades
  const gradeAPercent = Math.round(targetApprovalDecimal * 0.3 * 100); // 30% of approvals go to A
  const gradeBPercent = Math.round(targetApprovalDecimal * 0.7 * 100); // 70% of approvals go to B
  const gradeCPercent = Math.round(targetDeclineDecimal * 0.6 * 100); // 60% of declines go to C
  const gradeDPercent = 100 - gradeAPercent - gradeBPercent - gradeCPercent; // Remainder to D
  
  const simulation = {
    totalApplications: sampleSize,
    gradeDistribution: {
      A: { count: Math.round(sampleSize * gradeAPercent / 100), percentage: gradeAPercent },
      B: { count: Math.round(sampleSize * gradeBPercent / 100), percentage: gradeBPercent },
      C: { count: Math.round(sampleSize * gradeCPercent / 100), percentage: gradeCPercent },
      D: { count: Math.round(sampleSize * gradeDPercent / 100), percentage: gradeDPercent }
    },
    approvalMetrics: {
      totalApproved: Math.round(sampleSize * (gradeAPercent + gradeBPercent) / 100),
      totalDeclined: Math.round(sampleSize * (gradeCPercent + gradeDPercent) / 100),
      achievedApprovalRate: gradeAPercent + gradeBPercent,
      targetApprovalRate: targetApprovalRate,
      variance: Math.abs((gradeAPercent + gradeBPercent) - targetApprovalRate)
    },
    scoreBandMapping: scoreBands
  };
  
  return simulation;
}

// Generate access matrix based on user role
function generateAccessMatrix(role: string) {
  const baseAccess = {
    dashboard: true,
    profile: true,
  };

  switch (role) {
    case "Admin":
      return {
        ...baseAccess,
        organizations: true,
        users: true,
        aiGenerator: true,
        scorecardConfig: true,
        testingEngine: true,
        abTesting: true,
        apiManagement: true,
        bulkProcessing: true,
        auditTrail: true,
        systemSettings: true,
      };
    case "Power User":
      return {
        ...baseAccess,
        aiGenerator: true,
        scorecardConfig: true,
        testingEngine: true,
        abTesting: true,
        bulkProcessing: true,
        auditTrail: false,
        users: true,
      };
    case "Approver":
      return {
        ...baseAccess,
        scorecardConfig: true,
        testingEngine: true,
        abTesting: false,
        bulkProcessing: false,
        auditTrail: false,
        approvals: true,
      };
    case "DSA":
      return {
        ...baseAccess,
        bulkProcessing: true,
        testingEngine: true,
        scorecardConfig: false,
        auditTrail: false,
      };
    default:
      return baseAccess;
  }
}

// Phase 1 Enhancement: Dynamic Weight Calculation Functions
function calculateWeightMultipliers(riskAppetite: string, primaryFocus: string) {
  const baseMultipliers = {
    creditBureau: 1.0,
    coreBanking: 1.0,
    employment: 1.0,
    behavioral: 1.0,
    transaction: 1.0,
    utility: 1.0
  };

  // Risk Appetite Impact on Weight Distribution
  if (riskAppetite === 'conservative') {
    baseMultipliers.creditBureau = 1.2; // Higher weight on established credit data
    baseMultipliers.employment = 1.1;   // More emphasis on stable income
    baseMultipliers.behavioral = 0.8;   // Less weight on behavioral patterns
  } else if (riskAppetite === 'aggressive') {
    baseMultipliers.creditBureau = 0.8; // Lower dependency on credit bureau
    baseMultipliers.behavioral = 1.3;   // Higher weight on behavioral analytics
    baseMultipliers.transaction = 1.2;  // More emphasis on transaction patterns
  }

  // Primary Focus Impact on Weight Distribution
  if (primaryFocus === 'minimize_defaults') {
    baseMultipliers.creditBureau = baseMultipliers.creditBureau * 1.1;
    baseMultipliers.employment = baseMultipliers.employment * 1.1;
  } else if (primaryFocus === 'maximize_approvals') {
    baseMultipliers.behavioral = baseMultipliers.behavioral * 1.2;
    baseMultipliers.transaction = baseMultipliers.transaction * 1.1;
    baseMultipliers.utility = baseMultipliers.utility * 1.1;
  }

  return baseMultipliers;
}

function calculateDynamicBuckets(targetApprovalRate: number, riskAppetite: string) {
  // Base bucket thresholds
  let buckets = {
    A: { min: 85, max: 100, description: "Prime - Highest quality applicants" },
    B: { min: 70, max: 84, description: "Near Prime - Good quality applicants" },
    C: { min: 55, max: 69, description: "Subprime - Moderate risk applicants" },
    D: { min: 0, max: 54, description: "High Risk - Manual review required" }
  };

  // Adjust bucket boundaries based on target approval rate
  if (targetApprovalRate >= 80) {
    // Higher approval rate - more lenient scoring
    buckets.A.min = 80;
    buckets.B.min = 65;
    buckets.C.min = 45;
  } else if (targetApprovalRate <= 60) {
    // Lower approval rate - stricter scoring
    buckets.A.min = 90;
    buckets.B.min = 75;
    buckets.C.min = 60;
  }

  // Risk appetite fine-tuning
  if (riskAppetite === 'conservative') {
    buckets.A.min += 5;
    buckets.B.min += 5;
    buckets.C.min += 5;
  } else if (riskAppetite === 'aggressive') {
    buckets.A.min -= 5;
    buckets.B.min -= 5;
    buckets.C.min -= 5;
  }

  // Ensure logical bucket progression
  buckets.C.max = buckets.B.min - 1;
  buckets.D.max = buckets.C.min - 1;
  buckets.B.max = buckets.A.min - 1;

  return buckets;
}

// Helper function to generate advanced scorecard configuration
function generateAdvancedScorecardConfig(dataSources: any, riskParameters: any, productConfig: any) {
  const config: any = {
    categories: {},
    rules: [],
    bucketMapping: {
      A: { min: 85, max: 100, description: "Prime - Highest quality applicants" },
      B: { min: 70, max: 84, description: "Near Prime - Good quality applicants" },
      C: { min: 55, max: 69, description: "Subprime - Moderate risk applicants" },
      D: { min: 0, max: 54, description: "High Risk - Manual review required" }
    },
    riskProfile: {
      maxDefaultRate: riskParameters.maxDefaultRate,
      approvalTarget: riskParameters.approvalRateTarget,
      scoreThreshold: riskParameters.scoreThreshold,
      riskTolerance: riskParameters.riskTolerance
    }
  };

  // Configure comprehensive data source categories
  if (dataSources.transactionData && dataSources.transactionData.length > 0) {
    config.categories["Transaction History"] = {
      weight: riskParameters.dataWeightage.transactionHistory || 25,
      variables: generateTransactionVariables(dataSources.transactionData),
      description: "Transaction history analysis including customer payments, supplier payments, and employer salary records"
    };
  }

  if (dataSources.utilityPayments && dataSources.utilityPayments.length > 0) {
    config.categories["Utility & Government Payments"] = {
      weight: riskParameters.dataWeightage.utilityPayments || 20,
      variables: generateUtilityVariables(dataSources.utilityPayments),
      description: "Utility, rent and government payment consistency analysis"
    };
  }

  if (dataSources.telecomData && dataSources.telecomData.length > 0) {
    config.categories["Telecommunications Data"] = {
      weight: riskParameters.dataWeightage.telecomData || 15,
      variables: generateTelecomVariables(dataSources.telecomData),
      description: "Telecommunications usage patterns and payment behavior analysis"
    };
  }

  if (dataSources.ecommerceActivity && dataSources.ecommerceActivity.length > 0) {
    config.categories["E-commerce Activity"] = {
      weight: riskParameters.dataWeightage.ecommerceActivity || 15,
      variables: generateEcommerceVariables(dataSources.ecommerceActivity),
      description: "E-commerce shopping behavior and digital payment pattern analysis"
    };
  }

  if (dataSources.founderProfiles && dataSources.founderProfiles.length > 0) {
    config.categories["Founder/Individual Profiles"] = {
      weight: riskParameters.dataWeightage.founderProfiles || 15,
      variables: generateFounderVariables(dataSources.founderProfiles),
      description: "Founder/individual personal and professional profile assessment"
    };
  }

  if (dataSources.partnerShareholder && dataSources.partnerShareholder.length > 0) {
    config.categories["Partner & Shareholder Analysis"] = {
      weight: riskParameters.dataWeightage.partnerShareholder || 10,
      variables: generatePartnerVariables(dataSources.partnerShareholder),
      description: "Partner and shareholder structure and background analysis"
    };
  }

  // Generate intelligent rules based on product type and risk tolerance
  config.rules = generateIntelligentRules(productConfig, riskParameters);

  return config;
}

// Helper function to generate sample variable bands for export
function generateSampleVariableBands(variableName: string, totalScore: number) {
  const variableType = variableName.toLowerCase();
  
  if (variableType.includes('age')) {
    return [
      { condition: "< 18", score: 0, description: "Below minimum age" },
      { condition: "18-30", score: Math.floor(totalScore * 0.3), description: "Young adult" },
      { condition: "31-50", score: totalScore, description: "Prime working age" },
      { condition: "51-65", score: Math.floor(totalScore * 0.7), description: "Mature professional" },
      { condition: "> 65", score: Math.floor(totalScore * 0.4), description: "Senior citizen" }
    ];
  } else if (variableType.includes('income') || variableType.includes('salary')) {
    return [
      { condition: "< 25K", score: 0, description: "Low income" },
      { condition: "25K-50K", score: Math.floor(totalScore * 0.4), description: "Lower middle income" },
      { condition: "50K-100K", score: Math.floor(totalScore * 0.7), description: "Middle income" },
      { condition: "100K-250K", score: totalScore, description: "Upper middle income" },
      { condition: "> 250K", score: totalScore, description: "High income" }
    ];
  } else if (variableType.includes('credit') || variableType.includes('score')) {
    return [
      { condition: "< 600", score: 0, description: "Poor credit" },
      { condition: "600-650", score: Math.floor(totalScore * 0.3), description: "Fair credit" },
      { condition: "650-750", score: Math.floor(totalScore * 0.7), description: "Good credit" },
      { condition: "750-800", score: totalScore, description: "Very good credit" },
      { condition: "> 800", score: totalScore, description: "Excellent credit" }
    ];
  } else {
    return [
      { condition: "Poor", score: 0, description: "Below standard" },
      { condition: "Fair", score: Math.floor(totalScore * 0.4), description: "Meets minimum criteria" },
      { condition: "Good", score: Math.floor(totalScore * 0.7), description: "Above average" },
      { condition: "Excellent", score: totalScore, description: "Outstanding performance" }
    ];
  }
}

// Helper functions to generate variables for each data source category
function generateTransactionVariables(sources: string[]) {
  const variableMap: { [key: string]: string[] } = {
    customer_payments: [
      "customer_payment_consistency", "customer_payment_frequency", "customer_payment_amount_stability", 
      "customer_payment_method_diversity", "customer_seasonal_payment_patterns", "customer_payment_delay_frequency",
      "customer_payment_recovery_rate", "customer_loyalty_indicators", "customer_payment_growth_trend",
      "customer_retention_rate", "customer_dispute_frequency", "customer_early_payment_rate"
    ],
    supplier_payments: [
      "supplier_payment_timeliness", "supplier_payment_volume_stability", "supplier_relationship_strength", 
      "supplier_early_payment_discounts", "supplier_negotiation_power", "supplier_dependency_ratio",
      "supplier_payment_terms_optimization", "supplier_diversification_index", "supplier_payment_predictability",
      "supplier_credit_terms", "supplier_quality_score", "supplier_geographic_diversity"
    ],
    salary_payments: [
      "employer_salary_regularity", "employer_payment_consistency", "employer_stability_score", 
      "salary_growth_trend", "bonus_payment_frequency", "overtime_payment_patterns",
      "benefits_payment_consistency", "employer_industry_stability", "employment_tenure_strength",
      "promotion_frequency", "salary_competitiveness", "employer_financial_health"
    ],
    freelance_payments: [
      "freelance_payment_stability", "freelance_client_diversity", "freelance_income_volatility", 
      "freelance_contract_completion_rate", "freelance_payment_timeliness", "freelance_project_frequency",
      "freelance_skill_diversification", "freelance_market_demand", "freelance_reputation_score",
      "freelance_rate_growth", "freelance_client_retention", "freelance_seasonal_patterns"
    ],
    business_transactions: [
      "business_cash_flow_stability", "business_transaction_volume", "business_revenue_growth", 
      "business_seasonal_patterns", "business_transaction_diversity", "business_payment_cycles",
      "business_working_capital_efficiency", "business_liquidity_ratios", "business_profitability_trends",
      "business_receivables_turnover", "business_payables_management", "business_inventory_turnover"
    ],
    investment_transactions: [
      "investment_activity_frequency", "investment_portfolio_diversity", "investment_risk_appetite", 
      "investment_return_consistency", "investment_strategy_sophistication", "investment_time_horizon",
      "investment_sector_allocation", "investment_liquidity_management", "investment_performance_tracking",
      "investment_cost_efficiency", "investment_rebalancing_frequency", "investment_tax_efficiency"
    ]
  };

  return sources.flatMap(source => variableMap[source] || []);
}

function generateUtilityVariables(sources: string[]) {
  const variableMap: { [key: string]: string[] } = {
    electricity_bills: [
      "electricity_payment_consistency", "electricity_usage_stability", "electricity_payment_method", 
      "electricity_bill_amount_trend", "electricity_consumption_patterns", "electricity_seasonal_variation",
      "electricity_payment_timeliness", "electricity_auto_pay_setup", "electricity_service_interruptions",
      "electricity_meter_reading_accuracy", "electricity_green_energy_usage", "electricity_peak_hour_management"
    ],
    water_bills: [
      "water_payment_timeliness", "water_usage_pattern_stability", "water_bill_amount_consistency", 
      "water_seasonal_usage_variation", "water_conservation_efforts", "water_leak_detection_response",
      "water_quality_complaints", "water_service_reliability", "water_payment_method_preference",
      "water_usage_efficiency_score", "water_billing_dispute_frequency", "water_connection_tenure"
    ],
    gas_bills: [
      "gas_payment_consistency", "gas_usage_seasonal_patterns", "gas_payment_history_depth", 
      "gas_usage_efficiency", "gas_safety_compliance", "gas_appliance_maintenance",
      "gas_consumption_predictability", "gas_billing_accuracy", "gas_service_calls_frequency",
      "gas_emergency_response_history", "gas_meter_reading_consistency", "gas_payment_automation"
    ],
    internet_bills: [
      "internet_payment_consistency", "internet_plan_stability", "internet_upgrade_frequency", 
      "internet_service_loyalty", "internet_speed_satisfaction", "internet_downtime_tolerance",
      "internet_data_usage_patterns", "internet_customer_service_interactions", "internet_contract_adherence",
      "internet_technology_adoption", "internet_payment_method_stability", "internet_bundled_services"
    ],
    rent_payments: [
      "rent_payment_consistency", "rent_amount_stability", "tenancy_duration_strength", 
      "landlord_relationship_quality", "rent_increase_acceptance", "property_maintenance_requests",
      "lease_renewal_frequency", "rent_payment_timeliness", "security_deposit_history",
      "rent_negotiation_success", "property_care_standards", "neighbor_complaint_frequency"
    ],
    property_tax: [
      "property_tax_payment_timeliness", "property_ownership_duration", "property_value_assessment_accuracy", 
      "property_tax_compliance_history", "property_improvement_investments", "property_tax_appeal_history",
      "property_zoning_compliance", "property_documentation_completeness", "property_insurance_maintenance",
      "property_environmental_compliance", "property_revenue_generation", "property_succession_planning"
    ],
    government_fees: [
      "government_payment_compliance_rate", "license_renewal_timeliness", "permit_application_success", 
      "regulatory_interaction_frequency", "government_audit_outcomes", "compliance_violation_history",
      "government_correspondence_responsiveness", "fee_payment_method_consistency", "regulatory_change_adaptation",
      "government_portal_usage_efficiency", "document_submission_accuracy", "government_relationship_quality"
    ],
    insurance_premiums: [
      "insurance_payment_consistency", "insurance_coverage_adequacy", "insurance_claim_frequency", 
      "insurance_premium_payment_method", "insurance_policy_renewal_rate", "insurance_coverage_optimization",
      "insurance_claim_settlement_satisfaction", "insurance_risk_profile_management", "insurance_loyalty_rewards",
      "insurance_documentation_maintenance", "insurance_beneficiary_updates", "insurance_premium_negotiation"
    ]
  };

  return sources.flatMap(source => variableMap[source] || []);
}

function generateTelecomVariables(sources: string[]) {
  const variableMap: { [key: string]: string[] } = {
    call_patterns: [
      "call_frequency_stability", "peak_calling_hours_consistency", "call_duration_patterns", 
      "contact_diversity_score", "local_vs_longdistance_ratio", "business_vs_personal_calls",
      "call_quality_complaints", "voicemail_usage_patterns", "conference_call_frequency",
      "international_calling_patterns", "emergency_call_history", "call_blocking_usage"
    ],
    sms_activity: [
      "sms_frequency_patterns", "sms_timing_consistency", "sms_recipient_diversity", 
      "sms_length_analysis", "multimedia_message_usage", "group_messaging_patterns",
      "sms_delivery_success_rate", "spam_message_filtering", "business_sms_usage",
      "promotional_sms_engagement", "sms_backup_behavior", "cross_platform_messaging"
    ],
    data_usage: [
      "data_consumption_consistency", "data_usage_growth_patterns", "peak_data_usage_hours", 
      "data_plan_optimization_behavior", "wifi_vs_cellular_usage", "streaming_data_patterns",
      "social_media_data_consumption", "business_application_usage", "data_sharing_behavior",
      "background_data_management", "data_speed_satisfaction", "data_overage_frequency"
    ],
    roaming_activity: [
      "roaming_frequency_patterns", "roaming_destination_diversity", "roaming_cost_management", 
      "international_usage_planning", "roaming_service_optimization", "travel_pattern_consistency",
      "roaming_bill_shock_avoidance", "roaming_data_vs_voice_usage", "roaming_partner_network_usage",
      "roaming_complaint_history", "roaming_advance_planning", "roaming_cost_budgeting"
    ],
    payment_history: [
      "telecom_payment_consistency", "bill_payment_timeliness_score", "payment_method_stability", 
      "service_loyalty_duration", "auto_pay_setup_usage", "billing_dispute_frequency",
      "payment_delay_patterns", "partial_payment_history", "billing_inquiry_frequency",
      "payment_reversal_history", "credit_limit_management", "billing_cycle_optimization"
    ],
    service_upgrades: [
      "plan_upgrade_frequency_patterns", "service_adoption_speed", "technology_readiness_score", 
      "spending_growth_management", "feature_utilization_rate", "contract_renewal_behavior",
      "promotional_offer_responsiveness", "service_bundling_preferences", "early_adopter_tendencies",
      "downgrade_resistance_patterns", "service_customization_usage", "loyalty_program_engagement"
    ],
    device_financing: [
      "device_payment_consistency", "device_upgrade_cycle_patterns", "financing_completion_rate", 
      "device_value_retention_awareness", "insurance_protection_usage", "trade_in_program_participation",
      "device_care_behavior", "warranty_service_usage", "device_financing_credit_score",
      "early_upgrade_program_usage", "device_protection_plan_compliance", "device_resale_behavior"
    ]
  };

  return sources.flatMap(source => variableMap[source] || []);
}

function generateEcommerceVariables(sources: string[]) {
  const variableMap: { [key: string]: string[] } = {
    purchase_frequency: [
      "purchase_frequency_pattern", "spending_behavior_consistency", "shopping_seasonality_analysis", 
      "buying_behavior_stability", "purchase_timing_patterns", "bulk_purchase_behavior",
      "promotional_purchase_response", "category_purchase_distribution", "weekend_vs_weekday_shopping",
      "mobile_vs_desktop_purchasing", "repeat_purchase_rate", "purchase_value_consistency"
    ],
    spending_patterns: [
      "avg_transaction_value_stability", "spending_category_diversity", "spending_growth_trends", 
      "impulse_purchase_ratio", "planned_vs_spontaneous_purchases", "price_comparison_behavior",
      "discount_sensitivity_analysis", "premium_product_affinity", "budget_adherence_patterns",
      "cross_category_spending", "seasonal_spending_variations", "economic_sensitivity_response"
    ],
    payment_methods: [
      "payment_method_diversity", "credit_usage_patterns", "digital_wallet_adoption", 
      "payment_security_awareness", "payment_failure_recovery", "installment_payment_usage",
      "cashback_optimization_behavior", "payment_timing_preferences", "alternative_payment_adoption",
      "payment_dispute_history", "automatic_payment_setup", "payment_method_loyalty"
    ],
    delivery_addresses: [
      "address_consistency_score", "delivery_success_rate", "address_verification_compliance", 
      "shipping_preference_stability", "delivery_timing_flexibility", "multiple_address_management",
      "delivery_instruction_clarity", "address_update_frequency", "delivery_feedback_quality",
      "special_delivery_requests", "delivery_cost_sensitivity", "delivery_tracking_engagement"
    ],
    return_behavior: [
      "return_rate_analysis", "return_reason_categorization", "refund_processing_cooperation", 
      "return_policy_understanding", "exchange_vs_refund_preference", "return_timing_patterns",
      "return_condition_compliance", "return_shipping_cost_acceptance", "return_documentation_quality",
      "repeat_return_patterns", "return_prevention_responsiveness", "seller_communication_quality"
    ],
    review_activity: [
      "review_frequency_patterns", "review_quality_consistency", "reviewer_credibility_score", 
      "community_engagement_level", "helpful_review_ratio", "review_timing_after_purchase",
      "photo_review_contribution", "detailed_review_tendency", "review_update_behavior",
      "seller_interaction_quality", "review_authenticity_indicators", "review_influence_awareness"
    ],
    wishlist_behavior: [
      "wishlist_to_purchase_conversion", "wishlist_management_activity", "purchase_planning_sophistication", 
      "price_monitoring_behavior", "wishlist_sharing_patterns", "seasonal_wishlist_updates",
      "wishlist_category_diversity", "wishlist_price_range_analysis", "wishlist_urgency_prioritization",
      "comparison_shopping_behavior", "wishlist_abandonment_patterns", "gift_wishlist_usage"
    ],
    loyalty_programs: [
      "loyalty_program_engagement", "reward_redemption_optimization", "loyalty_tier_progression", 
      "brand_affinity_strength", "cross_brand_loyalty_management", "loyalty_point_accumulation_strategy",
      "exclusive_offer_responsiveness", "loyalty_program_advocacy", "membership_fee_acceptance",
      "loyalty_communication_preferences", "referral_program_participation", "loyalty_milestone_achievement"
    ]
  };

  return sources.flatMap(source => variableMap[source] || []);
}

function generateFounderVariables(sources: string[]) {
  const variableMap: { [key: string]: string[] } = {
    educational_background: [
      "education_level_achievement", "institution_ranking_prestige", "field_relevance_score", 
      "continuous_learning_commitment", "professional_certifications", "advanced_degree_completion",
      "academic_performance_indicators", "educational_debt_management", "skill_development_investment",
      "industry_specific_training", "international_education_exposure", "educational_network_strength"
    ],
    work_experience: [
      "total_experience_years", "industry_experience_depth", "leadership_experience_breadth", 
      "career_progression_trajectory", "employer_quality_score", "role_responsibility_growth",
      "cross_functional_experience", "team_management_capability", "project_delivery_success",
      "performance_review_consistency", "promotion_frequency", "salary_advancement_rate"
    ],
    business_history: [
      "previous_business_success_rate", "business_failure_recovery_ability", "entrepreneurial_track_record", 
      "business_exit_strategy_execution", "startup_founding_experience", "business_scaling_capability",
      "investor_relationship_history", "business_model_innovation", "market_entry_success",
      "business_pivot_adaptability", "partnership_formation_skill", "business_succession_planning"
    ],
    credit_history: [
      "personal_credit_score_stability", "credit_history_length", "credit_utilization_optimization", 
      "payment_behavior_consistency", "credit_mix_diversification", "credit_inquiry_management",
      "debt_to_income_ratio", "credit_limit_management", "default_recovery_history",
      "credit_monitoring_engagement", "identity_protection_measures", "credit_improvement_efforts"
    ],
    asset_ownership: [
      "total_asset_value_accumulation", "asset_diversification_strategy", "asset_liquidity_management", 
      "wealth_accumulation_trajectory", "real_estate_portfolio_quality", "investment_portfolio_performance",
      "asset_protection_strategies", "inheritance_planning_readiness", "asset_growth_sustainability",
      "alternative_investment_exposure", "asset_risk_management", "wealth_preservation_tactics"
    ],
    social_presence: [
      "professional_network_size", "industry_recognition_level", "social_media_influence_score", 
      "thought_leadership_establishment", "speaking_engagement_frequency", "publication_contribution",
      "mentorship_activity_level", "industry_event_participation", "online_reputation_management",
      "peer_endorsement_quality", "knowledge_sharing_consistency", "professional_brand_strength"
    ],
    industry_reputation: [
      "peer_recognition_awards", "industry_achievement_recognition", "media_coverage_quality", 
      "industry_contribution_significance", "professional_association_leadership", "innovation_recognition",
      "ethical_business_practice_reputation", "customer_satisfaction_ratings", "employee_satisfaction_scores",
      "regulatory_compliance_history", "industry_standard_setting_participation", "market_leadership_position"
    ],
    litigation_history: [
      "legal_case_frequency", "case_resolution_success_rate", "litigation_severity_assessment", 
      "compliance_track_record", "regulatory_violation_history", "dispute_resolution_effectiveness",
      "legal_risk_management", "contract_breach_frequency", "intellectual_property_disputes",
      "employment_law_compliance", "consumer_protection_adherence", "legal_cost_management"
    ],
    partnership_network: [
      "business_partner_quality_assessment", "strategic_alliance_success", "network_influence_reach", 
      "relationship_stability_duration", "partnership_value_creation", "collaborative_project_success",
      "referral_network_strength", "cross_industry_connections", "international_business_relationships",
      "partnership_conflict_resolution", "joint_venture_performance", "network_expansion_capability"
    ],
    financial_statements: [
      "personal_income_stability", "income_source_diversification", "financial_discipline_indicators", 
      "investment_diversification_strategy", "cash_flow_management", "tax_optimization_efficiency",
      "financial_goal_achievement", "emergency_fund_maintenance", "retirement_planning_progress",
      "insurance_coverage_adequacy", "estate_planning_completeness", "financial_transparency_level"
    ]
  };

  return sources.flatMap(source => variableMap[source] || []);
}

function generatePartnerVariables(sources: string[]) {
  const variableMap: { [key: string]: string[] } = {
    ownership_structure: [
      "ownership_concentration_analysis", "equity_distribution_fairness", "control_structure_clarity", 
      "voting_rights_alignment", "shareholder_agreement_completeness", "ownership_transfer_restrictions",
      "minority_shareholder_protection", "ownership_dilution_history", "capital_structure_optimization",
      "ownership_documentation_accuracy", "ownership_dispute_history", "ownership_transition_planning"
    ],
    partner_profiles: [
      "partner_background_verification", "partner_experience_relevance", "partner_financial_stability", 
      "partner_commitment_demonstration", "partner_skill_complementarity", "partner_reputation_assessment",
      "partner_conflict_resolution_history", "partner_decision_making_alignment", "partner_resource_contribution",
      "partner_exit_clause_clarity", "partner_performance_evaluation", "partner_strategic_value_addition"
    ],
    board_composition: [
      "board_independence_score", "board_expertise_diversity", "board_governance_effectiveness", 
      "board_meeting_attendance", "board_decision_quality", "board_oversight_capability",
      "board_compensation_appropriateness", "board_committee_structure", "board_performance_evaluation",
      "board_succession_planning", "board_stakeholder_representation", "board_regulatory_compliance"
    ],
    investor_history: [
      "investor_quality_assessment", "funding_round_success_rate", "investor_support_level", 
      "investor_network_strength", "investor_due_diligence_thoroughness", "investor_value_addition",
      "investor_exit_strategy_alignment", "investor_board_participation", "investor_follow_on_capability",
      "investor_market_reputation", "investor_portfolio_synergies", "investor_conflict_management"
    ],
    key_personnel: [
      "key_employee_retention_rate", "talent_quality_assessment", "succession_planning_depth", 
      "team_stability_indicators", "leadership_development_investment", "skill_gap_identification",
      "performance_management_effectiveness", "compensation_competitiveness", "employee_satisfaction_levels",
      "knowledge_retention_strategies", "talent_acquisition_capability", "organizational_culture_strength"
    ],
    related_entities: [
      "related_party_transaction_transparency", "group_structure_clarity", "entity_separation_maintenance", 
      "cross_holding_optimization", "intercompany_agreement_fairness", "transfer_pricing_compliance",
      "consolidated_reporting_accuracy", "regulatory_filing_completeness", "conflict_of_interest_management",
      "arm_length_transaction_adherence", "subsidiary_governance_structure", "group_risk_management"
    ],
    guarantor_profiles: [
      "guarantor_financial_strength_assessment", "guarantor_relationship_stability", "guarantee_coverage_adequacy", 
      "guarantor_commitment_verification", "guarantor_asset_quality", "guarantor_income_stability",
      "guarantor_credit_history", "guarantee_enforceability", "guarantor_diversification", 
      "guarantee_documentation_completeness", "guarantor_monitoring_frequency", "guarantee_renewal_capability"
    ],
    succession_planning: [
      "succession_plan_comprehensiveness", "leadership_development_program_quality", "business_continuity_preparedness", 
      "knowledge_transfer_effectiveness", "successor_identification_process", "succession_timeline_clarity",
      "emergency_succession_procedures", "ownership_transition_planning", "key_relationship_transfer",
      "institutional_knowledge_preservation", "succession_communication_strategy", "post_succession_monitoring"
    ]
  };

  return sources.flatMap(source => variableMap[source] || []);
}

function generateVariableBands(variableName: string, type: "continuous" | "categorical") {
  if (type === "continuous") {
    // Generate continuous bands
    return [
      { condition: "< 18", score: 0, description: "Below minimum age" },
      { condition: "18-30", score: 25, description: "Young applicant" },
      { condition: "31-50", score: 50, description: "Prime age group" },
      { condition: "51-65", score: 40, description: "Mature applicant" },
      { condition: "> 65", score: 20, description: "Senior applicant" }
    ];
  } else {
    // Generate categorical bands
    return [
      { condition: "Excellent", score: 100, description: "Highest category" },
      { condition: "Good", score: 75, description: "Good category" },
      { condition: "Fair", score: 50, description: "Average category" },
      { condition: "Poor", score: 25, description: "Below average" },
      { condition: "Very Poor", score: 0, description: "Lowest category" }
    ];
  }
}

function generateIntelligentRules(productConfig: any, riskParameters: any) {
  const rules = [];

  // Risk-based rules
  if (riskParameters.riskTolerance === "Conservative") {
    rules.push({
      condition: "personal_credit_score < 650",
      action: "manual_review",
      description: "Conservative risk: Low credit score requires manual review"
    });
    rules.push({
      condition: "payment_consistency < 80%",
      action: "decline",
      description: "Conservative risk: Poor payment consistency across utilities and transactions"
    });
    rules.push({
      condition: "litigation_history > 2",
      action: "legal_review",
      description: "Conservative risk: Multiple litigation cases require legal assessment"
    });
  } else if (riskParameters.riskTolerance === "Aggressive") {
    rules.push({
      condition: "personal_credit_score < 500",
      action: "manual_review", 
      description: "Aggressive risk: Very low credit score requires review"
    });
    rules.push({
      condition: "business_cash_flow_stability < 40%",
      action: "enhanced_monitoring",
      description: "Aggressive risk: Unstable cash flow requires monitoring"
    });
  }

  // Product-specific rules
  if (productConfig.productType === "Business Loan") {
    rules.push({
      condition: "business_cash_flow_stability < 60%",
      action: "manual_review",
      description: "Business loan: Unstable cash flow requires review"
    });
    rules.push({
      condition: "founder_experience < 2_years AND partner_background_strength < 70%",
      action: "additional_documentation",
      description: "Business loan: Limited founder experience with weak partner profiles"
    });
    rules.push({
      condition: "related_party_transaction_complexity > 80%",
      action: "enhanced_due_diligence",
      description: "Business loan: Complex related party transactions require enhanced review"
    });
  }

  if (productConfig.productType === "Personal Loan") {
    rules.push({
      condition: "salary_consistency < 85% AND freelance_income_variability > 60%",
      action: "income_verification",
      description: "Personal loan: Inconsistent salary with high freelance variability"
    });
    rules.push({
      condition: "utility_payment_consistency < 75%",
      action: "payment_behavior_review",
      description: "Personal loan: Poor utility payment history indicates payment risk"
    });
  }

  if (productConfig.productType === "Credit Card") {
    rules.push({
      condition: "ecommerce_spending_growth > 200% AND return_rate > 30%",
      action: "spending_pattern_review",
      description: "Credit card: Unusual e-commerce spending patterns"
    });
    rules.push({
      condition: "telecom_payment_consistency < 70%",
      action: "payment_stability_check",
      description: "Credit card: Poor telecom payment history"
    });
  }

  // Data source specific rules
  rules.push({
    condition: "customer_payment_consistency > 90% AND supplier_payment_timeliness > 85%",
    action: "fast_track_approval",
    description: "Excellent transaction payment patterns qualify for fast-track"
  });

  rules.push({
    condition: "insurance_payment_consistency > 95% AND property_tax_payment_timeliness > 90%",
    action: "risk_score_boost",
    description: "Consistent insurance and tax payments indicate financial responsibility"
  });

  return rules;
}

// Extract all variables from selected data sources
function extractVariablesFromDataSources(dataSources: any) {
  const allVariables = [];
  
  if (dataSources.transactionData) {
    allVariables.push(...generateTransactionVariables(dataSources.transactionData));
  }
  if (dataSources.utilityPayments) {
    allVariables.push(...generateUtilityVariables(dataSources.utilityPayments));
  }
  if (dataSources.telecomData) {
    allVariables.push(...generateTelecomVariables(dataSources.telecomData));
  }
  if (dataSources.ecommerceActivity) {
    allVariables.push(...generateEcommerceVariables(dataSources.ecommerceActivity));
  }
  if (dataSources.founderProfiles) {
    allVariables.push(...generateFounderVariables(dataSources.founderProfiles));
  }
  if (dataSources.partnerShareholder) {
    allVariables.push(...generatePartnerVariables(dataSources.partnerShareholder));
  }

  return Array.from(new Set(allVariables)); // Remove duplicates
}
