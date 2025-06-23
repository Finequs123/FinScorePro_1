import { storage } from './storage';
import { InsertScorecard } from '@shared/schema';

export interface AIGenerationRequest {
  institutionSetup: {
    name: string;
    type: string;
  };
  productConfig: {
    productType: string;
    targetSegment: string;
  };
  dataSources: {
    transactionData: string[];
    utilityPayments: string[];
    telecomData: string[];
    ecommerceActivity: string[];
    founderProfiles: string[];
    partnerShareholder: string[];
  };
  riskParameters: {
    dataWeightage: {
      transactionHistory: number;
      utilityPayments: number;
      telecomData: number;
      ecommerceActivity: number;
      founderProfiles: number;
      partnerShareholder: number;
    };
    riskTolerance: string;
  };
}

export async function generateAIScorecard(
  request: AIGenerationRequest,
  userId: number,
  organizationId: number
) {
  const { institutionSetup, productConfig, dataSources, riskParameters } = request;

  // Create comprehensive scorecard configuration
  const scorecardConfig = {
    categories: {
      "Transaction History": {
        weight: riskParameters.dataWeightage.transactionHistory,
        variables: [
          "customer_payment_consistency",
          "supplier_payment_timeliness", 
          "salary_regularity",
          "freelance_income_stability",
          "business_transaction_volume",
          "investment_activity_patterns"
        ]
      },
      "Utility & Government Payments": {
        weight: riskParameters.dataWeightage.utilityPayments,
        variables: [
          "electricity_payment_consistency",
          "water_payment_timeliness",
          "rent_payment_stability",
          "internet_payment_regularity",
          "property_tax_compliance",
          "insurance_premium_consistency"
        ]
      },
      "Telecommunications Data": {
        weight: riskParameters.dataWeightage.telecomData,
        variables: [
          "call_frequency_stability",
          "payment_consistency",
          "data_usage_patterns",
          "roaming_behavior",
          "service_upgrade_history",
          "device_financing_history"
        ]
      },
      "E-commerce Activity": {
        weight: riskParameters.dataWeightage.ecommerceActivity,
        variables: [
          "purchase_frequency_pattern",
          "spending_behavior_consistency",
          "payment_method_diversity",
          "delivery_address_stability",
          "return_behavior_analysis",
          "loyalty_program_engagement"
        ]
      },
      "Founder/Individual Profiles": {
        weight: riskParameters.dataWeightage.founderProfiles,
        variables: [
          "educational_background_strength",
          "credit_history_stability",
          "business_experience",
          "asset_ownership_diversity",
          "industry_reputation",
          "litigation_history_analysis"
        ]
      },
      "Partner & Shareholder Analysis": {
        weight: riskParameters.dataWeightage.partnerShareholder,
        variables: [
          "ownership_structure_clarity",
          "partner_background_strength",
          "governance_quality",
          "investor_history_analysis",
          "key_personnel_stability",
          "succession_planning_quality"
        ]
      }
    },
    bucketMapping: {
      A: { min: 85, max: 100, description: "Prime - Highest quality applicants" },
      B: { min: 70, max: 84, description: "Near Prime - Good quality applicants" },
      C: { min: 55, max: 69, description: "Subprime - Moderate risk applicants" },
      D: { min: 0, max: 54, description: "High Risk - Manual review required" }
    },
    rules: [],
    metadata: {
      institutionName: institutionSetup.name,
      productType: productConfig.productType,
      targetSegment: productConfig.targetSegment,
      riskTolerance: riskParameters.riskTolerance,
      generatedAt: new Date().toISOString()
    }
  };

  // Create scorecard
  const scorecard = await storage.createScorecard({
    organizationId,
    name: `AI ${productConfig.productType} - ${institutionSetup.name}`,
    product: productConfig.productType,
    segment: productConfig.targetSegment || "General",
    version: "1.0",
    status: "Draft by AI",
    configJson: scorecardConfig,
    createdBy: userId
  });

  // Create audit trail
  const totalDataSources = Object.values(dataSources).flat().length;
  await storage.createAuditTrail({
    organizationId,
    userId,
    action: "AI_SCORECARD_GENERATION",
    entityType: "scorecard",
    entityId: scorecard.id,
    description: `Generated AI scorecard with ${totalDataSources} comprehensive data sources`
  });

  return {
    scorecard,
    generationSummary: {
      totalDataSources,
      categoriesUsed: 6,
      dataSourceBreakdown: Object.entries(dataSources).map(([category, sources]) => ({
        category,
        count: sources.length
      })),
      note: "Scorecard created with all 6 comprehensive data source categories"
    }
  };
}