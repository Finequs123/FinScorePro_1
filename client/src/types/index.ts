export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  organizationId: number;
}

export interface Organization {
  id: number;
  name: string;
  code: string;
  type: string;
  contactEmail: string;
}

export interface AuthUser {
  user: User;
  organization: Organization;
}

export interface DashboardMetrics {
  activeScoreCards: number;
  applicationsScored: number;
  approvalRate: number;
  abTests: number;
}

export interface ScorecardConfig {
  categories: Record<string, {
    weight: number;
    variables: string[];
  }>;
  bucketMapping: {
    A: { min: number; max: number };
    B: { min: number; max: number };
    C: { min: number; max: number };
    D: { min: number; max: number };
  };
  rules: any[];
  logicConstraints?: any;
}

export interface Scorecard {
  id: number;
  organizationId: number;
  name: string;
  product: string;
  segment: string;
  version: string;
  configJson: ScorecardConfig;
  status: string;
  createdBy: number;
  approvedBy?: number;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

export interface SimulationResult {
  id: number;
  scorecardId: number;
  recordId: string;
  score: string;
  bucket: string;
  reasonCodes: string[];
  inputData: any;
  createdAt: string;
}

export interface AbTest {
  id: number;
  name: string;
  organizationId: number;
  scorecardAId: number;
  scorecardBId: number;
  status: string;
  resultMetrics?: any;
  winnerId?: number;
  createdBy: number;
  createdAt: string;
  completedAt?: string;
}

export interface ApiLog {
  id: number;
  organizationId: number;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime?: number;
  payloadHash?: string;
  ipAddress?: string;
  userId?: number;
  createdAt: string;
}

export interface AuditTrail {
  id: number;
  organizationId: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  oldValues?: any;
  newValues?: any;
  description?: string;
  createdAt: string;
}
