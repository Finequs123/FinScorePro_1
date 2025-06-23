import { pool } from './db';

interface ComprehensiveDataSources {
  creditBureauData?: string[];
  coreBankingVariables?: string[];
  employmentIncome?: string[];
  behavioralAnalytics?: string[];
  transactionHistory?: string[];
  utilityPayments?: string[];
  telecomData?: string[];
  ecommerceActivity?: string[];
  founderProfiles?: string[];
  partnerShareholder?: string[];
  geographicData?: string[];
  customSources?: Array<{
    name: string;
    weight: number;
    variables: string[];
  }>;
}

export async function createAIScorecard(
  organizationId: number,
  userId: number,
  institutionSetup: { name: string; type: string },
  productConfig: { productType: string; targetSegment: string },
  dataSources: ComprehensiveDataSources,
  riskParameters: {
    dataWeightage: Record<string, number>;
    riskTolerance: string;
  }
) {
  // Comprehensive data source definitions
  const allCategories = {
    "Credit Bureau Data": {
      weight: riskParameters.dataWeightage.creditBureau || 20,
      variables: ["credit_score", "payment_history", "credit_utilization", "credit_age", "credit_mix", "new_credit_inquiries", "delinquency_history", "bankruptcy_records", "collection_accounts", "credit_limit_usage", "account_types_diversity", "credit_behavior_trends"]
    },
    "Core Banking Variables": {
      weight: riskParameters.dataWeightage.coreBanking || 18,
      variables: ["account_balance_stability", "transaction_velocity", "overdraft_frequency", "deposit_consistency", "withdrawal_patterns", "account_age", "relationship_depth", "product_utilization", "fee_payment_behavior", "account_maintenance_quality", "cross_selling_response", "service_channel_preference"]
    },
    "Employment & Income": {
      weight: riskParameters.dataWeightage.employment || 15,
      variables: ["employment_stability", "income_consistency", "salary_progression", "employer_quality", "industry_risk_profile", "job_tenure", "income_source_diversity", "seasonal_income_variation", "bonus_regularity", "overtime_patterns", "employment_benefits", "career_advancement_potential"]
    },
    "Behavioral Analytics": {
      weight: riskParameters.dataWeightage.behavioral || 12,
      variables: ["spending_patterns", "financial_discipline", "payment_timing", "account_management_behavior", "digital_engagement", "customer_service_interactions", "complaint_history", "product_adoption_rate", "financial_planning_behavior", "risk_taking_propensity", "loyalty_indicators", "channel_usage_patterns"]
    },
    "Transaction History": {
      weight: riskParameters.dataWeightage.transactionHistory || 10,
      variables: ["customer_payment_consistency", "supplier_payment_timeliness", "salary_regularity", "freelance_income_stability", "business_transaction_volume", "investment_activity_patterns", "recurring_payment_reliability", "cash_flow_predictability", "transaction_categorization", "merchant_diversity", "international_transactions", "payment_method_preferences"]
    },
    "Utility & Government Payments": {
      weight: riskParameters.dataWeightage.utilityPayments || 8,
      variables: ["electricity_payment_consistency", "water_payment_timeliness", "rent_payment_stability", "internet_payment_regularity", "property_tax_compliance", "insurance_premium_consistency", "municipal_fee_payments", "utility_consumption_patterns", "service_interruption_history", "advance_payment_behavior", "seasonal_payment_variations", "multiple_utility_management"]
    },
    "Telecommunications Data": {
      weight: riskParameters.dataWeightage.telecomData || 6,
      variables: ["call_frequency_stability", "payment_consistency", "data_usage_patterns", "roaming_behavior", "service_upgrade_history", "device_financing_history", "network_usage_optimization", "customer_service_calls", "plan_change_frequency", "family_plan_management", "international_usage", "payment_method_stability"]
    },
    "E-commerce Activity": {
      weight: riskParameters.dataWeightage.ecommerceActivity || 5,
      variables: ["purchase_frequency_pattern", "spending_behavior_consistency", "payment_method_diversity", "delivery_address_stability", "return_behavior_analysis", "loyalty_program_engagement", "seasonal_shopping_patterns", "price_sensitivity", "brand_preference_stability", "cart_abandonment_patterns", "review_contribution", "social_commerce_activity"]
    },
    "Founder/Individual Profiles": {
      weight: riskParameters.dataWeightage.founderProfiles || 3,
      variables: ["educational_background_strength", "credit_history_stability", "business_experience", "asset_ownership_diversity", "industry_reputation", "litigation_history_analysis", "professional_certifications", "network_quality", "previous_business_success", "financial_management_skills", "leadership_experience", "innovation_track_record"]
    },
    "Partner & Shareholder Analysis": {
      weight: riskParameters.dataWeightage.partnerShareholder || 2,
      variables: ["ownership_structure_clarity", "partner_background_strength", "governance_quality", "investor_history_analysis", "key_personnel_stability", "succession_planning_quality", "board_composition", "strategic_partnerships", "capital_structure", "exit_strategy_clarity", "conflict_resolution_mechanisms", "stakeholder_alignment"]
    },
    "Geographic & Market Data": {
      weight: riskParameters.dataWeightage.geographic || 1,
      variables: ["location_economic_stability", "regional_market_conditions", "local_competition_intensity", "infrastructure_quality", "regulatory_environment", "demographic_trends", "property_values_trend", "employment_market_health", "educational_infrastructure", "healthcare_accessibility", "transportation_connectivity", "natural_disaster_risk"]
    }
  };

  // Build selected categories based on data sources
  const selectedCategories: Record<string, any> = {};
  
  // Map data source keys to category names
  const sourceMapping: Record<string, string> = {
    creditBureauData: "Credit Bureau Data",
    coreBankingVariables: "Core Banking Variables", 
    employmentIncome: "Employment & Income",
    behavioralAnalytics: "Behavioral Analytics",
    transactionHistory: "Transaction History",
    utilityPayments: "Utility & Government Payments",
    telecomData: "Telecommunications Data",
    ecommerceActivity: "E-commerce Activity",
    founderProfiles: "Founder/Individual Profiles",
    partnerShareholder: "Partner & Shareholder Analysis",
    geographicData: "Geographic & Market Data"
  };

  // Add selected categories
  Object.entries(sourceMapping).forEach(([sourceKey, categoryName]) => {
    if (dataSources[sourceKey as keyof ComprehensiveDataSources] && 
        Array.isArray(dataSources[sourceKey as keyof ComprehensiveDataSources]) && 
        (dataSources[sourceKey as keyof ComprehensiveDataSources] as string[]).length > 0) {
      selectedCategories[categoryName] = allCategories[categoryName];
    }
  });

  // Add custom data sources
  if (dataSources.customSources && Array.isArray(dataSources.customSources)) {
    dataSources.customSources.forEach(customSource => {
      if (customSource.name && customSource.variables && customSource.weight) {
        selectedCategories[customSource.name] = {
          weight: customSource.weight,
          variables: customSource.variables
        };
      }
    });
  }

  const scorecardConfig = {
    categories: selectedCategories,
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

  // Insert directly into database
  const result = await pool.query(`
    INSERT INTO scorecards (
      organization_id, name, product, segment, version, config_json, status, created_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING id, name, product, segment, version, status, created_at
  `, [
    organizationId,
    `AI ${productConfig.productType} - ${institutionSetup.name}`,
    productConfig.productType,
    productConfig.targetSegment || "General",
    "1.0",
    JSON.stringify(scorecardConfig),
    "Draft by AI",
    userId
  ]);

  return result.rows[0];
}