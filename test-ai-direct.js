// Direct test of AI scorecard creation
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testDirectInsert() {
  try {
    const comprehensiveConfig = {
      categories: {
        "Transaction History": {
          weight: 25,
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
          weight: 20,
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
          weight: 15,
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
          weight: 15,
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
          weight: 15,
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
          weight: 10,
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
        institutionName: "Direct Test Bank",
        productType: "Business Loan",
        targetSegment: "SME",
        riskTolerance: "Medium",
        generatedAt: new Date().toISOString()
      }
    };

    const result = await pool.query(`
      INSERT INTO scorecards (
        organization_id, 
        name, 
        product, 
        segment, 
        version, 
        config_json, 
        status, 
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, status
    `, [
      1,
      'AI Business Loan - Direct Test Bank',
      'Business Loan',
      'SME',
      '1.0',
      JSON.stringify(comprehensiveConfig),
      'Draft by AI',
      1
    ]);

    console.log('Direct insert successful:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Direct insert failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

testDirectInsert().catch(console.error);