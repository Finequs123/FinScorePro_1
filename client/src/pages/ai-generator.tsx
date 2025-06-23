import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, ChevronRight, Bot, Building, Target, Database, CheckCircle, 
  Settings, MapPin, Users, Shield, Zap, Info, Download, FileText, BarChart3, TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const steps = [
  { id: 1, title: "Institution Setup", icon: Building },
  { id: 2, title: "Product Configuration", icon: Target },
  { id: 3, title: "Data Sources & Quality", icon: Database },
  { id: 4, title: "Data Processing Capability", icon: Settings },
  { id: 5, title: "Final Preferences", icon: Shield },
  { id: 6, title: "Generate & Review", icon: Bot }
];

// Enhanced data source categories per specifications
const dataSources = [
  { 
    id: "credit_bureau", 
    label: "Credit Bureau", 
    typicalVariables: "Credit score, payment history, credit utilization, delinquency records",
    marketAvailability: "High - comprehensive coverage across most borrower segments"
  },
  { 
    id: "income_data", 
    label: "Income Data", 
    typicalVariables: "Salary slips, bank statements, ITR, Form 16, employer verification",
    marketAvailability: "Medium - varies by employment type and formality"
  },
  { 
    id: "employment_occupation", 
    label: "Employment / Occupation", 
    typicalVariables: "Employment tenure, designation, company profile, industry type",
    marketAvailability: "Medium - stronger for formal employment"
  },
  { 
    id: "banking_transactions", 
    label: "Banking Transactions", 
    typicalVariables: "Transaction patterns, balance stability, cash flow analysis",
    marketAvailability: "High - good penetration with bank account holders"
  },
  { 
    id: "gst", 
    label: "GST", 
    typicalVariables: "GST returns, turnover data, compliance history, input tax credits",
    marketAvailability: "Medium - applicable for businesses with GST registration"
  },
  { 
    id: "tax_data", 
    label: "Tax Data", 
    typicalVariables: "ITR filings, advance tax payments, TDS records, tax compliance",
    marketAvailability: "Medium - varies by income levels and compliance"
  },
  { 
    id: "telecom", 
    label: "Telecom", 
    typicalVariables: "Recharge value, frequency, call patterns, location data",
    marketAvailability: "High - especially strong for prepaid users"
  },
  { 
    id: "utility", 
    label: "Utility", 
    typicalVariables: "Electricity, water, gas bills, payment consistency, consumption patterns",
    marketAvailability: "Medium - varies by urban/rural and formal utility connections"
  },
  { 
    id: "ecommerce", 
    label: "Ecommerce", 
    typicalVariables: "Purchase patterns, payment methods, order frequency, delivery addresses",
    marketAvailability: "Medium - growing with digital adoption"
  },
  { 
    id: "mobile_usage", 
    label: "Mobile Usage", 
    typicalVariables: "App usage patterns, device information, digital behavior analytics",
    marketAvailability: "High - widespread smartphone penetration"
  },
  { 
    id: "founder_partner_profile", 
    label: "Founder & Partner Profile", 
    typicalVariables: "Educational background, work experience, business history, asset ownership",
    marketAvailability: "Low - limited to formal business establishments"
  },
  { 
    id: "other_data_sources", 
    label: "Other Data Sources", 
    typicalVariables: "Custom data sources as specified by institution",
    marketAvailability: "Variable - depends on specific data source"
  }
];

// Geographic focus options
const geographicOptions = [
  "Pan India", "Metro Cities", "Tier 1 Cities", "Tier 2 Cities", "Tier 3 Cities",
  "Rural Markets", "Semi-Urban Areas", "Urban + Semi-Urban Mix",
  "North India", "South India", "East India", "West India", "Central India", "North-East India",
  "Specific State Focus", "Custom Geography (Specify)"
];

// Indian States/UTs for state-specific focus
const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry"
];

// Customer segments
const customerSegments = [
  "Salaried", "Self-Employed", "MSMEs", "Gig Workers", "Students", "Pensioners", 
  "Agricultural Workers", "Small Traders", "Professionals", "Entrepreneurs"
];

export default function EnhancedAIGenerator() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedScorecard, setGeneratedScorecard] = useState<any>(null);
  const [showRationale, setShowRationale] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // v3 Enhancement: Weight Normalization Logic
  const normalizeWeights = useCallback((scorecard: any) => {
    if (!scorecard?.configJson?.categories) return scorecard;
    
    const categories = scorecard.configJson.categories;
    const totalWeight = Object.values(categories).reduce((sum: number, cat: any) => sum + (cat.weight || 0), 0);
    
    if (Math.abs(totalWeight - 100) > 10) {
      toast({
        title: "Weight Imbalance Detected",
        description: `Category weights total ${totalWeight}%. Normalizing to 100%.`,
        variant: "destructive"
      });
    }
    
    if (totalWeight !== 100) {
      // Normalize weights to sum to 100%
      const normalizedCategories = Object.fromEntries(
        Object.entries(categories).map(([key, cat]: [string, any]) => [
          key,
          { ...cat, weight: Math.round((cat.weight / totalWeight) * 100) }
        ])
      );
      
      return {
        ...scorecard,
        configJson: {
          ...scorecard.configJson,
          categories: normalizedCategories
        }
      };
    }
    
    return scorecard;
  }, [toast]);

  // Memoize normalized scorecard to prevent infinite re-renders
  const normalizedScorecard = useMemo(() => {
    if (!generatedScorecard) return null;
    return normalizeWeights(generatedScorecard);
  }, [generatedScorecard, normalizeWeights]);

  // Form state
  const [formData, setFormData] = useState({
    // Institution Setup
    institutionName: "",
    institutionType: "",
    
    // Product Configuration
    productType: "",
    targetSegments: [] as string[],
    geographicFocus: [] as string[],
    specificStates: [] as string[],
    customGeography: "",
    
    // Data Sources & Quality
    selectedDataSources: [] as string[],
    dataSourceAvailability: {} as Record<string, string>,
    otherDataSources: "",
    
    // Data Processing Capability
    creditBureauAccess: "",
    bankStatementCapability: "",
    dataProcessingMethod: "",
    
    // Final Preferences (Phase 1 Enhancement)
    riskAppetite: "",
    targetApprovalRate: 75,
    primaryFocus: ""
  });

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDataSourceToggle = (sourceId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        selectedDataSources: [...prev.selectedDataSources, sourceId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedDataSources: prev.selectedDataSources.filter(id => id !== sourceId),
        dataSourceAvailability: Object.fromEntries(
          Object.entries(prev.dataSourceAvailability).filter(([key]) => key !== sourceId)
        )
      }));
    }
  };

  const handleSegmentToggle = (segment: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        targetSegments: [...prev.targetSegments, segment]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        targetSegments: prev.targetSegments.filter(s => s !== segment)
      }));
    }
  };

  const handleGeographicToggle = (option: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        geographicFocus: [...prev.geographicFocus, option]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        geographicFocus: prev.geographicFocus.filter(g => g !== option)
      }));
    }
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/generate-scorecard", {
        institutionSetup: {
          name: formData.institutionName,
          type: formData.institutionType
        },
        productConfig: {
          productType: formData.productType,
          targetSegments: formData.targetSegments,
          geographicFocus: formData.geographicFocus,
          specificStates: formData.specificStates,
          customGeography: formData.customGeography
        },
        dataSources: {
          selectedSources: formData.selectedDataSources,
          availability: formData.dataSourceAvailability,
          otherSources: formData.otherDataSources
        },
        dataProcessing: {
          creditBureauAccess: formData.creditBureauAccess,
          bankStatementCapability: formData.bankStatementCapability,
          dataProcessingMethod: formData.dataProcessingMethod
        },
        finalPreferences: {
          riskAppetite: formData.riskAppetite,
          targetApprovalRate: formData.targetApprovalRate,
          primaryFocus: formData.primaryFocus
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "AI Scorecard Generated Successfully",
        description: `Created: ${data.name}`,
      });
      setGeneratedScorecard(data);
      queryClient.invalidateQueries({ queryKey: ["/api/scorecards"] });
      setCurrentStep(6);
      
      // Phase 2: Generate approval distribution simulation
      simulateApprovalDistribution(data.id);
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate AI scorecard",
        variant: "destructive",
      });
    }
  });

  // Phase 2: Approval Distribution Simulation
  const simulateApprovalDistribution = async (scorecardId: number) => {
    try {
      const response = await apiRequest("POST", `/api/scorecards/${scorecardId}/simulate-approval`, {
        sampleSize: 1000,
        targetApprovalRate: formData.targetApprovalRate
      });
      const results = await response.json();
      setSimulationResults(results);
    } catch (error) {
      console.error("Simulation failed:", error);
    }
  };



  // Phase 2: Export Scorecard
  const exportScorecard = async (format: 'excel' | 'pdf') => {
    if (!generatedScorecard) return;
    
    try {
      const response = await apiRequest("GET", `/api/scorecards/${generatedScorecard.id}/export?format=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedScorecard.name}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export scorecard",
        variant: "destructive"
      });
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    generateMutation.mutate();
    
    setTimeout(() => {
      setIsGenerating(false);
      setGenerationProgress(100);
      clearInterval(interval);
    }, 3000);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Institution Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="institutionName">Institution Name *</Label>
                  <Input
                    id="institutionName"
                    value={formData.institutionName}
                    onChange={(e) => setFormData(prev => ({...prev, institutionName: e.target.value}))}
                    placeholder="Enter institution name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="institutionType">Institution Type *</Label>
                  <Select value={formData.institutionType} onValueChange={(value) => 
                    setFormData(prev => ({...prev, institutionType: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select institution type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="nbfc">NBFC</SelectItem>
                      <SelectItem value="fintech">Fintech</SelectItem>
                      <SelectItem value="credit_union">Credit Union</SelectItem>
                      <SelectItem value="microfinance">Microfinance Institution</SelectItem>
                      <SelectItem value="cooperative">Cooperative Society</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                

              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Product Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="productType">Product Type *</Label>
                <Select value={formData.productType} onValueChange={(value) => 
                  setFormData(prev => ({...prev, productType: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal_loan">Personal Loan</SelectItem>
                    <SelectItem value="business_loan">Business Loan</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="auto_loan">Auto Loan</SelectItem>
                    <SelectItem value="home_loan">Home Loan</SelectItem>
                    <SelectItem value="education_loan">Education Loan</SelectItem>
                    <SelectItem value="microfinance">Microfinance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Target Customer Segments * (Multi-select)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {customerSegments.map((segment) => (
                    <div key={segment} className="flex items-center space-x-2">
                      <Checkbox
                        id={segment}
                        checked={formData.targetSegments.includes(segment)}
                        onCheckedChange={(checked) => handleSegmentToggle(segment, checked as boolean)}
                      />
                      <Label htmlFor={segment} className="text-sm">{segment}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Geographic Focus * (Multi-select)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {geographicOptions.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={option}
                        checked={formData.geographicFocus.includes(option)}
                        onCheckedChange={(checked) => handleGeographicToggle(option, checked as boolean)}
                      />
                      <Label htmlFor={option} className="text-sm">{option}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {formData.geographicFocus.includes("Specific State Focus") && (
                <div className="space-y-2">
                  <Label>Select States/UTs</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border rounded">
                    {indianStates.map((state) => (
                      <div key={state} className="flex items-center space-x-2">
                        <Checkbox
                          id={state}
                          checked={formData.specificStates.includes(state)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({
                                ...prev,
                                specificStates: [...prev.specificStates, state]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                specificStates: prev.specificStates.filter(s => s !== state)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={state} className="text-xs">{state}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.geographicFocus.includes("Custom Geography (Specify)") && (
                <div className="space-y-2">
                  <Label htmlFor="customGeography">Custom Geography Details</Label>
                  <Textarea
                    id="customGeography"
                    value={formData.customGeography}
                    onChange={(e) => setFormData(prev => ({...prev, customGeography: e.target.value}))}
                    placeholder="Specify your custom geographic focus..."
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Sources & Quality Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Select Data Sources * (Multi-select)</Label>
                {dataSources.map((source) => (
                  <div key={source.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={source.id}
                        checked={formData.selectedDataSources.includes(source.id)}
                        onCheckedChange={(checked) => handleDataSourceToggle(source.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={source.id} className="font-medium">{source.label}</Label>
                        <div className="text-sm text-gray-600">
                          <div><strong>Typical Variables:</strong> {source.typicalVariables}</div>
                          <div><strong>Market Availability:</strong> {source.marketAvailability}</div>
                        </div>
                      </div>
                    </div>
                    
                    {formData.selectedDataSources.includes(source.id) && (
                      <div className="ml-6 space-y-2">
                        <Label className="text-sm">Data availability for {source.label}</Label>
                        <RadioGroup
                          value={formData.dataSourceAvailability[source.id] || ""}
                          onValueChange={(value) => setFormData(prev => ({
                            ...prev,
                            dataSourceAvailability: {
                              ...prev.dataSourceAvailability,
                              [source.id]: value
                            }
                          }))}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="always" id={`${source.id}-always`} />
                            <Label htmlFor={`${source.id}-always`} className="text-sm">Always Available</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="usually" id={`${source.id}-usually`} />
                            <Label htmlFor={`${source.id}-usually`} className="text-sm">Usually Available</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sometimes" id={`${source.id}-sometimes`} />
                            <Label htmlFor={`${source.id}-sometimes`} className="text-sm">Sometimes Available</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="rarely" id={`${source.id}-rarely`} />
                            <Label htmlFor={`${source.id}-rarely`} className="text-sm">Rarely Available</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="not_available" id={`${source.id}-not`} />
                            <Label htmlFor={`${source.id}-not`} className="text-sm">Not Available</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {formData.selectedDataSources.includes("other_data_sources") && (
                <div className="space-y-2">
                  <Label htmlFor="otherDataSources">Specify Other Data Sources</Label>
                  <Textarea
                    id="otherDataSources"
                    value={formData.otherDataSources}
                    onChange={(e) => setFormData(prev => ({...prev, otherDataSources: e.target.value}))}
                    placeholder="Enter each data source on a new line..."
                    rows={4}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Data Processing Capability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Credit Bureau Access</Label>
                  <Select value={formData.creditBureauAccess} onValueChange={(value) => 
                    setFormData(prev => ({...prev, creditBureauAccess: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select access level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Access</SelectItem>
                      <SelectItem value="limited">Limited Access</SelectItem>
                      <SelectItem value="none">No Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Bank Statement Analysis Capability</Label>
                  <Select value={formData.bankStatementCapability} onValueChange={(value) => 
                    setFormData(prev => ({...prev, bankStatementCapability: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select capability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advanced">Advanced (12+ months)</SelectItem>
                      <SelectItem value="basic">Basic (3–6 months)</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Current Data Processing</Label>
                  <Select value={formData.dataProcessingMethod} onValueChange={(value) => 
                    setFormData(prev => ({...prev, dataProcessingMethod: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automated">Automated with APIs</SelectItem>
                      <SelectItem value="semi_automated">Semi-automated</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Final Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label>Risk Appetite *</Label>
                  <Select value={formData.riskAppetite} onValueChange={(value) => 
                    setFormData(prev => ({...prev, riskAppetite: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk appetite" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">
                    {formData.riskAppetite === "conservative" && "Lower risk tolerance, stricter scoring"}
                    {formData.riskAppetite === "moderate" && "Balanced risk approach, standard scoring"}
                    {formData.riskAppetite === "aggressive" && "Higher risk tolerance, lenient scoring"}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Target Approval Rate *</Label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min="10"
                      max="95"
                      value={formData.targetApprovalRate}
                      onChange={(e) => setFormData(prev => ({
                        ...prev, 
                        targetApprovalRate: parseInt(e.target.value) || 75
                      }))}
                      className="text-center"
                    />
                    <div className="text-center">
                      <span className="text-2xl font-bold text-blue-600">
                        {formData.targetApprovalRate}%
                      </span>
                    </div>
                    <Progress value={formData.targetApprovalRate} className="w-full" />
                  </div>
                  <p className="text-xs text-gray-600">
                    Drives cutoff thresholds and bucket sizing
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Primary Focus *</Label>
                  <RadioGroup
                    value={formData.primaryFocus}
                    onValueChange={(value) => setFormData(prev => ({...prev, primaryFocus: value}))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="minimize_defaults" id="minimize_defaults" />
                      <Label htmlFor="minimize_defaults" className="text-sm">
                        Minimize Defaults
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="maximize_approvals" id="maximize_approvals" />
                      <Label htmlFor="maximize_approvals" className="text-sm">
                        Maximize Approvals
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-gray-600">
                    {formData.primaryFocus === "minimize_defaults" && "Prioritize reducing bad debt over volume"}
                    {formData.primaryFocus === "maximize_approvals" && "Prioritize loan volume over strict risk control"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  AI Configuration Impact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Risk Appetite Impact:</strong>
                    <ul className="list-disc list-inside mt-1 text-gray-700">
                      <li>Affects scoring stringency and thresholds</li>
                      <li>Modifies variable weights for risk factors</li>
                      <li>Adjusts bucket boundaries (A/B/C/D)</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Target Approval Rate Impact:</strong>
                    <ul className="list-disc list-inside mt-1 text-gray-700">
                      <li>Drives cutoff score calculations</li>
                      <li>Determines bucket size distribution</li>
                      <li>Influences approval threshold placement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 6:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Generate & Review AI Scorecard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isGenerating && generationProgress === 0 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Configuration Summary</h3>
                    <div className="text-sm space-y-1">
                      <div><strong>Institution:</strong> {formData.institutionName} ({formData.institutionType})</div>
                      <div><strong>Product:</strong> {formData.productType}</div>
                      <div><strong>Target Segments:</strong> {formData.targetSegments.join(", ")}</div>
                      <div><strong>Geographic Focus:</strong> {formData.geographicFocus.join(", ")}</div>
                      <div><strong>Data Sources:</strong> {formData.selectedDataSources.length} selected</div>
                      <div><strong>Risk Appetite:</strong> {formData.riskAppetite}</div>
                      <div><strong>Target Approval Rate:</strong> {formData.targetApprovalRate}%</div>
                      <div><strong>Primary Focus:</strong> {formData.primaryFocus?.replace('_', ' ')}</div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleGenerate} 
                    className="w-full" 
                    size="lg"
                    disabled={!formData.institutionName || !formData.productType || formData.selectedDataSources.length === 0 || !formData.riskAppetite || !formData.primaryFocus}
                  >
                    <Bot className="mr-2 h-5 w-5" />
                    Generate AI Scorecard
                  </Button>
                </div>
              )}

              {(isGenerating || generationProgress > 0) && (
                <div className="space-y-4">
                  <div className="text-center">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-pulse" />
                    <h3 className="text-lg font-medium mb-2">
                      {isGenerating ? "Generating AI Scorecard..." : "Generation Complete!"}
                    </h3>
                    <Progress value={generationProgress} className="w-full" />
                    <p className="text-sm text-gray-600 mt-2">
                      {isGenerating ? "Analyzing data sources and creating optimal scoring model..." : "Your AI scorecard has been generated successfully!"}
                    </p>
                  </div>
                  
                  {generationProgress === 100 && generatedScorecard && (
                    <div className="space-y-6">
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-green-800 font-medium">
                          AI Scorecard generated successfully!
                        </p>
                      </div>

                      {/* v3 Enhancement: 4-Tab Redesigned Output Structure */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Generated Scorecard Configuration</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Tabs defaultValue="summary" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="summary">Category Summary</TabsTrigger>
                              <TabsTrigger value="variables">Variable View</TabsTrigger>
                              <TabsTrigger value="bands">Score Bands</TabsTrigger>
                              <TabsTrigger value="explainability">Explainability</TabsTrigger>
                            </TabsList>

                            {/* Tab 1: Category Summary */}
                            <TabsContent value="summary" className="space-y-4">
                              <div className="space-y-4">
                                <h4 className="font-medium">Category Weight Distribution</h4>
                                <div className="grid gap-3">
                                  {Object.entries(generatedScorecard?.configJson?.categories || {}).map(([category, details]: [string, any]) => (
                                    <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                      <span className="font-medium">{category}</span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-24 bg-gray-200 rounded-full h-2">
                                          <div 
                                            className="bg-blue-600 h-2 rounded-full" 
                                            style={{ width: `${details.weight}%` }}
                                          />
                                        </div>
                                        <span className="text-sm font-medium">{details.weight}%</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Total Weight: {Object.values(generatedScorecard?.configJson?.categories || {}).reduce((sum: number, cat: any) => sum + cat.weight, 0)}%
                                </div>
                              </div>
                            </TabsContent>

                            {/* Tab 2: Variable View */}
                            <TabsContent value="variables" className="space-y-4">
                              <div className="space-y-6">
                                {Object.entries(generatedScorecard?.configJson?.categories || {}).map(([category, details]: [string, any]) => (
                                  <div key={category} className="space-y-3">
                                    <h4 className="font-medium text-lg">{category} ({details.weight}%)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {details.variables?.map((variable: string, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                          <span className="text-sm">{variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {Math.round(details.weight / details.variables.length)}%
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TabsContent>

                            {/* Tab 3: Score Band Configuration */}
                            <TabsContent value="bands" className="space-y-4">
                              <div className="space-y-4">
                                <h4 className="font-medium">Score Band Thresholds</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse border border-gray-300">
                                    <thead>
                                      <tr className="bg-gray-50">
                                        <th className="border border-gray-300 p-2 text-left">Grade</th>
                                        <th className="border border-gray-300 p-2 text-left">Score Range</th>
                                        <th className="border border-gray-300 p-2 text-left">Label</th>
                                        <th className="border border-gray-300 p-2 text-left">Description</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {Object.entries(generatedScorecard.configJson?.bucketMapping || {}).map(([grade, config]: [string, any]) => (
                                        <tr key={grade}>
                                          <td className="border border-gray-300 p-2 font-medium">{grade}</td>
                                          <td className="border border-gray-300 p-2">{config.min} - {config.max}</td>
                                          <td className="border border-gray-300 p-2">
                                            <Badge variant={grade === 'A' ? 'default' : grade === 'B' ? 'secondary' : 'destructive'}>
                                              {grade === 'A' ? 'Prime' : grade === 'B' ? 'Near Prime' : grade === 'C' ? 'Subprime' : 'High Risk'}
                                            </Badge>
                                          </td>
                                          <td className="border border-gray-300 p-2 text-sm">{config.description}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </TabsContent>

                            {/* Tab 4: Scorecard Explainability */}
                            <TabsContent value="explainability" className="space-y-4">
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                    <h4 className="font-medium">AI Rationale</h4>
                                    <div className="space-y-3 text-sm">
                                      <div>
                                        <strong>Risk Appetite Impact ({formData.riskAppetite}):</strong>
                                        <p className="text-gray-600 mt-1">
                                          {formData.riskAppetite === 'conservative' && 'Higher weights assigned to Credit Bureau data and Employment verification for stricter risk assessment.'}
                                          {formData.riskAppetite === 'moderate' && 'Balanced distribution across traditional and alternative data sources for optimal risk-return balance.'}
                                          {formData.riskAppetite === 'aggressive' && 'Increased emphasis on behavioral patterns and transaction data to capture broader customer segments.'}
                                        </p>
                                      </div>
                                      <div>
                                        <strong>Primary Focus ({formData.primaryFocus?.replace('_', ' ')}):</strong>
                                        <p className="text-gray-600 mt-1">
                                          {formData.primaryFocus === 'minimize_defaults' && 'Enhanced weights on credit history and employment stability to reduce default risk.'}
                                          {formData.primaryFocus === 'maximize_approvals' && 'Optimized scoring bands and increased alternative data usage to expand approval rates.'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-4">
                                    <h4 className="font-medium">Configuration Metadata</h4>
                                    <div className="space-y-2 text-sm">
                                      <div><strong>Institution:</strong> {formData.institutionName} ({formData.institutionType})</div>
                                      <div><strong>Product:</strong> {formData.productType}</div>
                                      <div><strong>Target Segments:</strong> {formData.targetSegments.join(', ')}</div>
                                      <div><strong>Geographic Focus:</strong> {formData.geographicFocus.join(', ')}</div>
                                      <div><strong>Target Approval Rate:</strong> {formData.targetApprovalRate}%</div>
                                      <div><strong>Data Sources:</strong> {formData.selectedDataSources.length} categories selected</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Efficiency & Effectiveness Matrix - New v3 Feature */}
                                <div className="space-y-4">
                                  <h4 className="font-medium">Efficiency & Effectiveness Matrix</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse border border-gray-300">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          <th className="border border-gray-300 p-2 text-left">Score Band</th>
                                          <th className="border border-gray-300 p-2 text-left">Approval %</th>
                                          <th className="border border-gray-300 p-2 text-left">Default Risk %</th>
                                          <th className="border border-gray-300 p-2 text-left">Comments</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td className="border border-gray-300 p-2 font-medium">A</td>
                                          <td className="border border-gray-300 p-2">30%</td>
                                          <td className="border border-gray-300 p-2 text-green-600">0.5%</td>
                                          <td className="border border-gray-300 p-2 text-sm">Low-risk segment</td>
                                        </tr>
                                        <tr>
                                          <td className="border border-gray-300 p-2 font-medium">B</td>
                                          <td className="border border-gray-300 p-2">25%</td>
                                          <td className="border border-gray-300 p-2 text-yellow-600">1.8%</td>
                                          <td className="border border-gray-300 p-2 text-sm">Mid-risk borrowers</td>
                                        </tr>
                                        <tr>
                                          <td className="border border-gray-300 p-2 font-medium">C</td>
                                          <td className="border border-gray-300 p-2">20%</td>
                                          <td className="border border-gray-300 p-2 text-orange-600">4.0%</td>
                                          <td className="border border-gray-300 p-2 text-sm">Moderate decline</td>
                                        </tr>
                                        <tr>
                                          <td className="border border-gray-300 p-2 font-medium">D</td>
                                          <td className="border border-gray-300 p-2">25%</td>
                                          <td className="border border-gray-300 p-2 text-red-600">10%+</td>
                                          <td className="border border-gray-300 p-2 text-sm">Auto-decline zone</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </Card>

                      {/* Phase 2: Approval Distribution Simulation */}
                      {simulationResults && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <BarChart3 className="h-5 w-5" />
                              Live Approval Simulation Results
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                  {simulationResults.actualApprovalRate}%
                                </div>
                                <div className="text-sm text-gray-600">Actual vs {formData.targetApprovalRate}% Target</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                  {simulationResults.distribution?.A || 0}%
                                </div>
                                <div className="text-sm text-gray-600">Grade A (Prime)</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-600">
                                  {simulationResults.distribution?.B || 0}%
                                </div>
                                <div className="text-sm text-gray-600">Grade B (Near Prime)</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">
                                  {(simulationResults.distribution?.C || 0) + (simulationResults.distribution?.D || 0)}%
                                </div>
                                <div className="text-sm text-gray-600">Grade C+D (Review)</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="h-4 w-4" />
                              <span>Simulation based on 1,000 sample applications</span>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Export Options */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5" />
                            Export Scorecard
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              onClick={() => exportScorecard('excel')}
                              className="flex items-center gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Export to Excel
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => exportScorecard('pdf')}
                              className="flex items-center gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Export to PDF
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <ProtectedRoute requiredRole={["Admin"]}>
      <AppShell title="Enhanced AI Scorecard Generator">
        <div className="container mx-auto py-6 px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Enhanced AI Scorecard Generator</h1>
            <p className="text-gray-600 mt-2">
              Create intelligent credit scoring models with comprehensive data source analysis
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isActive ? 'border-blue-600 bg-blue-600 text-white' :
                      isCompleted ? 'border-green-600 bg-green-600 text-white' :
                      'border-gray-300 bg-white text-gray-400'
                    }`}>
                      {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div className="ml-3">
                      <div className={`text-sm font-medium ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-20 h-0.5 mx-4 ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Step Content */}
          <div className="mb-8">
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={prevStep} 
              disabled={currentStep === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            {currentStep < 6 && (
              <Button 
                onClick={nextStep}
                disabled={
                  (currentStep === 1 && (!formData.institutionName || !formData.institutionType)) ||
                  (currentStep === 2 && (!formData.productType || formData.targetSegments.length === 0)) ||
                  (currentStep === 3 && formData.selectedDataSources.length === 0) ||
                  (currentStep === 5 && (!formData.riskAppetite || !formData.primaryFocus))
                }
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}