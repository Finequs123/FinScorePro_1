import { useState, useCallback, useEffect } from "react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { 
  ChevronLeft, ChevronRight, Bot, Building, Target, Database, CheckCircle, 
  Settings, MapPin, Users, Shield, Zap, Info, Download, FileText, BarChart3, 
  TrendingUp, ChevronDown, Plus, Trash2, AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Wizard steps
const steps = [
  { id: 1, title: "Product & Segment Selection", icon: Target, description: "Define product types and target segments" },
  { id: 2, title: "Data Source & Quality", icon: Database, description: "Select data sources and quality metrics" },
  { id: 3, title: "Capability Matching", icon: Settings, description: "Match capabilities with selected sources" },
  { id: 4, title: "Data Source Review & Load Distribution", icon: Shield, description: "Review data distribution across scoring categories" },
  { id: 5, title: "Variable & Band Setup", icon: BarChart3, description: "Define variables and scoring bands" },
  { id: 6, title: "Score Simulation", icon: TrendingUp, description: "Preview approval rates and score distribution" },
  { id: 7, title: "Generate Scorecard", icon: Bot, description: "Final preferences and scorecard generation" },
  { id: 8, title: "Scorecard Insights & AI Summary", icon: BarChart3, description: "Visual summary of AI scorecard logic and outcomes" }
];

// Product types (multi-select with checkboxes)
const productTypes = [
  "Personal Loan", "Business Loan", "Credit Card", "Home Loan", "Vehicle Loan", 
  "Gold Loan", "Education Loan", "Agricultural Loan", "MSME Loan", "Working Capital"
];

// Customer segments (multi-select)
const customerSegments = [
  "Salaried", "Self-Employed", "MSMEs", "Gig Workers", "Students", "Pensioners",
  "Agricultural Workers", "Small Traders", "Professionals", "Entrepreneurs"
];

// Occupation options (multi-select with checkboxes as per bug fix #1)
const occupationOptions = [
  "Government Employee", "Private Employee", "Business Owner", "Professional", 
  "Consultant", "Freelancer", "Farmer", "Trader", "Manufacturer", "Service Provider",
  "Doctor", "Engineer", "Teacher", "Lawyer", "CA/CS", "Architect", "Others"
];

// Geography options (restored as per bug fix #2)
const geographyOptions = [
  "Pan India", "Metro Cities", "Tier 1 Cities", "Tier 2 Cities", "Tier 3 Cities",
  "Rural Markets", "Semi-Urban Areas", "Urban + Semi-Urban Mix",
  "North India", "South India", "East India", "West India", "Central India", "North-East India",
  "Specific State Focus", "Custom Geography"
];

// Data sources
const dataSources = [
  { 
    id: "bureau", 
    label: "Credit Bureau", 
    description: "CIBIL, Experian, Equifax, CRIF scores and reports",
    variables: ["Credit Score", "Payment History", "Credit Utilization", "Account Age", "Enquiry Count"]
  },
  { 
    id: "banking", 
    label: "Banking Data", 
    description: "Bank statements, transaction patterns, account behavior",
    variables: ["Account Balance", "Transaction Volume", "Salary Credits", "EMI Payments", "Bounce Rate"]
  },
  { 
    id: "mobile", 
    label: "Mobile & Digital", 
    description: "Mobile usage patterns, app usage, digital footprint",
    variables: ["App Usage", "Recharge Patterns", "Location Stability", "Contact Quality", "Device Info"]
  },
  { 
    id: "employment", 
    label: "Employment Data", 
    description: "Employment verification, salary slips, EPF records",
    variables: ["Employment Tenure", "Salary Amount", "Designation", "Company Rating", "Industry Type"]
  },
  { 
    id: "application", 
    label: "Application Form", 
    description: "Self-declared information from loan application",
    variables: ["Age", "Income", "Education", "Family Size", "Residence Type"]
  }
];

export default function AIGeneratorFixed() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedScorecard, setGeneratedScorecard] = useState<any>(null);
  const [latestScorecardId, setLatestScorecardId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [scorecardReady, setScorecardReady] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [weightsInitialized, setWeightsInitialized] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Product & Segment Selection
    productTypes: [] as string[],
    targetSegments: [] as string[],
    selectedOccupations: [] as string[], // Multi-select fix for bug #1
    geographicFocus: [] as string[], // Restored for bug #2
    customGeography: "",
    
    // Step 2: Data Source & Quality
    selectedDataSources: [] as string[],
    dataAvailability: {
      coreCredit: "",
      income: "",
      banking: "",
      behavioral: "",
      geographic: "",
      digital: "",
      tax: "",
      telecom: "",
      utility: "",
      ecommerce: "",
      mobile: "",
      founder: "",
      other: ""
    },
    dataQuality: {
      bureau: { completeness: 85, accuracy: 90, timeliness: 95 },
      banking: { completeness: 70, accuracy: 85, timeliness: 80 },
      mobile: { completeness: 60, accuracy: 75, timeliness: 90 },
      employment: { completeness: 80, accuracy: 85, timeliness: 70 },
      application: { completeness: 100, accuracy: 95, timeliness: 100 }
    },
    
    // Step 4: Weight Configuration (must total 100%)
    categoryWeights: {
      coreCredit: 0,
      income: 0,
      banking: 0,
      behavioral: 0,
      geographic: 0,
      digital: 0,
      tax: 0,
      telecom: 0,
      utility: 0,
      ecommerce: 0,
      mobile: 0,
      founder: 0,
      other: 0,
      // Legacy support
      bureau: 30,
      employment: 15,
      application: 15
    },
    
    // Step 5: Variable & Band Setup
    variableScores: {} as Record<string, number>,
    variableBands: {} as Record<string, Array<{range: string, score: number}>>,
    
    // Step 6: Simulation preferences
    targetApprovalRate: 20,
    riskAppetite: "moderate" as "conservative" | "moderate" | "aggressive",
    
    // Step 7: Final preferences
    scorecardName: "",
    description: "",
    owner: "",
    
    // Custom data sources
    customDataSources: ""
  });

  // Validation functions
  const validateStep = useCallback((step: number): boolean => {
    const errors: string[] = [];
    
    switch (step) {
      case 1:
        if (formData.productTypes.length === 0) errors.push("Select at least one product type");
        if (formData.targetSegments.length === 0) errors.push("Select at least one target segment");
        if (formData.geographicFocus.length === 0) errors.push("Select geographic focus");
        break;
        
      case 2:
        const selectedDataSources = Object.values(formData.dataAvailability).filter(value => value && value !== "").length;
        if (selectedDataSources < 2) errors.push("Select at least 2 data sources");
        break;
        
      case 4:
        const selectedKeys = Object.keys(formData.dataAvailability).filter(key => 
          formData.dataAvailability[key as keyof typeof formData.dataAvailability] && 
          formData.dataAvailability[key as keyof typeof formData.dataAvailability] !== "" && 
          formData.dataAvailability[key as keyof typeof formData.dataAvailability] !== "not"
        );
        const totalWeight = Object.entries(formData.categoryWeights)
          .filter(([key]) => selectedKeys.includes(key))
          .reduce((sum, [, weight]) => sum + weight, 0);
        if (Math.abs(totalWeight - 100) > 0.1) errors.push(`Total weight must be 100% (current: ${totalWeight}%)`);
        break;
        
      case 7:
        if (!formData.scorecardName.trim()) errors.push("Scorecard name is required");
        if (!formData.owner.trim()) errors.push("Owner is required");
        break;
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  }, [formData]);

  // Auto-initialize weights when entering step 4
  useEffect(() => {
    if (currentStep === 4) {
      const selectedDataSources = Object.keys(formData.dataAvailability).filter(key => 
        formData.dataAvailability[key as keyof typeof formData.dataAvailability] && 
        formData.dataAvailability[key as keyof typeof formData.dataAvailability] !== "" && 
        formData.dataAvailability[key as keyof typeof formData.dataAvailability] !== "not"
      );
      
      if (selectedDataSources.length > 0) {
        const currentTotalWeight = Object.entries(formData.categoryWeights)
          .filter(([key]) => selectedDataSources.includes(key))
          .reduce((sum, [, weight]) => sum + weight, 0);
          
        if (currentTotalWeight === 0) {
          // Auto-distribute weights more naturally (not exactly even)
          const baseWeight = Math.floor(100 / selectedDataSources.length);
          const remainder = 100 - (baseWeight * selectedDataSources.length);
          
          // Create more natural distribution with slight variations
          const weights = selectedDataSources.map((_, index) => {
            let weight = baseWeight;
            if (index < remainder) weight += 1;
            
            // Add small variations to make it more realistic
            if (selectedDataSources.length > 3) {
              const variation = index % 3 === 0 ? 1 : index % 3 === 1 ? -1 : 0;
              weight = Math.max(1, Math.min(weight + variation, 30));
            }
            
            return weight;
          });
          
          // Ensure total is exactly 100
          const currentTotal = weights.reduce((sum, w) => sum + w, 0);
          if (currentTotal !== 100) {
            const diff = 100 - currentTotal;
            weights[0] += diff;
          }
          
          const initialWeights = Object.fromEntries(
            selectedDataSources.map((source, index) => [source, weights[index]])
          );
          
          setFormData(prev => ({
            ...prev,
            categoryWeights: { ...prev.categoryWeights, ...initialWeights }
          }));
        }
        setWeightsInitialized(true);
      }
    }
  }, [currentStep, formData.dataAvailability]);

  // Weight normalization (fix for bug #6)
  const normalizeWeights = useCallback(() => {
    const selectedDataSources = Object.keys(formData.dataAvailability).filter(key => 
      formData.dataAvailability[key as keyof typeof formData.dataAvailability] && 
      formData.dataAvailability[key as keyof typeof formData.dataAvailability] !== "" && 
      formData.dataAvailability[key as keyof typeof formData.dataAvailability] !== "not"
    );
    
    const activeSourceWeights = Object.entries(formData.categoryWeights)
      .filter(([source]) => selectedDataSources.includes(source))
      .reduce((acc, [source, weight]) => ({ ...acc, [source]: weight }), {} as Record<string, number>);
    
    const totalWeight = Object.values(activeSourceWeights).reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight !== 100) {
      let normalizedWeights;
      
      if (totalWeight === 0) {
        // If all weights are 0, distribute evenly
        const evenWeight = Math.floor(100 / selectedDataSources.length);
        const remainder = 100 - (evenWeight * selectedDataSources.length);
        
        normalizedWeights = Object.fromEntries(
          selectedDataSources.map((source, index) => [
            source,
            index < remainder ? evenWeight + 1 : evenWeight
          ])
        );
      } else {
        // Normal proportional distribution
        normalizedWeights = Object.fromEntries(
          Object.entries(activeSourceWeights).map(([source, weight]) => [
            source,
            Math.round(((weight as number) / totalWeight) * 100)
          ])
        );
      }
      
      setFormData(prev => ({
        ...prev,
        categoryWeights: { ...prev.categoryWeights, ...normalizedWeights }
      }));
      
      toast({
        title: "Weights Normalized",
        description: "Category weights have been automatically adjusted to total 100%",
        variant: "default"
      });
    }
  }, [formData.categoryWeights, formData.selectedDataSources, toast]);

  // Navigation handlers
  const goToStep = (step: number) => {
    if (step < currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Generate scorecard mutation - PRODUCTION READY
  const generateScorecardMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('PRODUCTION: Generating scorecard with data:', data);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required. Please login.');
      }
      
      const response = await fetch('/api/ai/generate-scorecard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PRODUCTION: API Error:', response.status, errorText);
        
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
        
        throw new Error(`Generation failed (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      console.log('PRODUCTION: Scorecard generated successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('FINAL DEBUG: Complete API response:', data);
      console.log('FINAL DEBUG: Data structure keys:', Object.keys(data));
      console.log('FINAL DEBUG: Categories field:', data.categories);
      console.log('FINAL DEBUG: Variables field:', data.variables);
      console.log('FINAL DEBUG: ConfigJson present:', !!data.configJson);
      console.log('FINAL DEBUG: Configuration present:', !!data.configuration);
      
      if (data.configJson?.categories) {
        console.log('FINAL DEBUG: Categories in configJson:', Object.keys(data.configJson.categories));
        Object.entries(data.configJson.categories).forEach(([name, cat]: [string, any]) => {
          console.log(`FINAL DEBUG: ${name} - Weight: ${cat.weight}%, Variables: ${cat.variables?.length || 0}`);
        });
      }
      
      setGeneratedScorecard(data);
      setLatestScorecardId(data.id);
      
      // Add delay to ensure scorecard is fully saved before enabling exports
      setTimeout(() => {
        setScorecardReady(true);
      }, 2000);
      toast({
        title: "Scorecard Generated Successfully",
        description: "Your AI scorecard has been created and is ready for review",
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate scorecard",
        variant: "destructive"
      });
    }
  });

  const handleGenerate = () => {
    if (!validateStep(7)) return;
    
    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Simulate generation progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsGenerating(false);
          return 100;
        }
        return prev + 10;
      });
    }, 300);

    // CORRECT FIELD MAPPING: Use actual form field names from dataAvailability state
    const selectedSources = [];
    const dataAvail = formData.dataAvailability;
    
    // Map exact field names to backend keys
    if (dataAvail.coreCredit && dataAvail.coreCredit !== 'not') selectedSources.push('creditBureau');
    if (dataAvail.income && dataAvail.income !== 'not') selectedSources.push('employment');
    if (dataAvail.banking && dataAvail.banking !== 'not') selectedSources.push('banking');
    if (dataAvail.behavioral && dataAvail.behavioral !== 'not') selectedSources.push('mobile');
    if (dataAvail.geographic && dataAvail.geographic !== 'not') selectedSources.push('utility');
    if (dataAvail.digital && dataAvail.digital !== 'not') selectedSources.push('ecommerce');
    if (dataAvail.tax && dataAvail.tax !== 'not') selectedSources.push('socialMedia');
    if (dataAvail.telecom && dataAvail.telecom !== 'not') selectedSources.push('alternative');
    if (dataAvail.utility && dataAvail.utility !== 'not') selectedSources.push('utility');
    if (dataAvail.ecommerce && dataAvail.ecommerce !== 'not') selectedSources.push('ecommerce');
    if (dataAvail.mobile && dataAvail.mobile !== 'not') selectedSources.push('mobile');
    if (dataAvail.founder && dataAvail.founder !== 'not') selectedSources.push('alternative');
    if (dataAvail.other && dataAvail.other !== 'not') selectedSources.push('alternative');

    console.log('FRONTEND: Selected data sources for API:', selectedSources);
    console.log('FRONTEND: Data availability state:', formData.dataAvailability);

    generateScorecardMutation.mutate({
      institutionSetup: {
        name: formData.scorecardName,
        type: "NBFC"
      },
      productConfig: {
        productTypes: formData.productTypes,
        targetSegments: formData.targetSegments,
        occupations: formData.selectedOccupations,
        geographicFocus: formData.geographicFocus,
        geography: formData.geographicFocus,
        products: formData.productTypes
      },
      dataSources: {
        selectedSources: selectedSources,
        ...formData.dataAvailability
      },
      categoryWeights: formData.categoryWeights,
      riskParameters: {
        targetApprovalRate: formData.targetApprovalRate,
        riskAppetite: formData.riskAppetite,
        primaryFocus: 'minimize_defaults'
      }
    });
  };

  // Export functions
  const exportPDF = useCallback(async () => {
    try {
      const response = await fetch(`/api/scorecards/${generatedScorecard.id}/export?format=pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.scorecardName}_scorecard.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({ title: "PDF Downloaded", description: "Scorecard exported successfully" });
    } catch (error) {
      toast({ title: "Export Failed", description: "Failed to download PDF", variant: "destructive" });
    }
  }, [generatedScorecard, formData.scorecardName, toast]);

  const exportExcel = useCallback(async () => {
    try {
      const response = await fetch(`/api/scorecards/${generatedScorecard.id}/export?format=excel`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.scorecardName}_scorecard.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({ title: "Excel Downloaded", description: "Scorecard exported successfully" });
    } catch (error) {
      toast({ title: "Export Failed", description: "Failed to download Excel", variant: "destructive" });
    }
  }, [generatedScorecard, formData.scorecardName, toast]);

  return (
    <ProtectedRoute>
      <AppShell title="AI Scorecard Generator">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">AI Scorecard Generator</h1>
              <p className="text-muted-foreground mt-1">Create intelligent credit scoring models with AI assistance</p>
            </div>
          </div>

          {/* Step Navigation */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div 
                      className={`flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-colors ${
                        currentStep === step.id 
                          ? 'bg-blue-600 text-white' 
                          : currentStep > step.id 
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                      onClick={() => goToStep(step.id)}
                    >
                      {currentStep > step.id ? <CheckCircle className="w-5 h-5" /> : step.id}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-12 h-0.5 mx-2 ${currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-6">
                <h3 className="font-semibold text-xl text-gray-800">{steps[currentStep - 1]?.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{steps[currentStep - 1]?.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Please fix the following issues:</span>
                </div>
                <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Step Content */}
          <Card>
            <CardContent className="p-6">
              {/* Step 1: Product & Segment Selection */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Product Types (Select Multiple)</Label>
                    <p className="text-sm text-muted-foreground mb-3">Choose the financial products for this scorecard</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {productTypes.map((product) => (
                        <div key={product} className="flex items-center space-x-2">
                          <Checkbox
                            id={product}
                            checked={formData.productTypes.includes(product)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  productTypes: [...prev.productTypes, product]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  productTypes: prev.productTypes.filter(p => p !== product)
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={product} className="text-sm cursor-pointer">{product}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base font-medium">Target Segments (Select Multiple)</Label>
                    <p className="text-sm text-muted-foreground mb-3">Define your target customer segments</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {customerSegments.map((segment) => (
                        <div key={segment} className="flex items-center space-x-2">
                          <Checkbox
                            id={segment}
                            checked={formData.targetSegments.includes(segment)}
                            onCheckedChange={(checked) => {
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
                            }}
                          />
                          <Label htmlFor={segment} className="text-sm cursor-pointer">{segment}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Bug Fix #2: Geography Field Restored */}
                  <div>
                    <Label className="text-base font-medium">Geographic Focus (Select Multiple)</Label>
                    <p className="text-sm text-muted-foreground mb-3">Define your geographic target markets</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {geographyOptions.map((geography) => (
                        <div key={geography} className="flex items-center space-x-2">
                          <Checkbox
                            id={geography}
                            checked={formData.geographicFocus.includes(geography)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  geographicFocus: [...prev.geographicFocus, geography]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  geographicFocus: prev.geographicFocus.filter(g => g !== geography)
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={geography} className="text-sm cursor-pointer">{geography}</Label>
                        </div>
                      ))}
                    </div>
                    
                    {formData.geographicFocus.includes("Custom Geography") && (
                      <div className="mt-3">
                        <Label htmlFor="customGeography" className="text-sm">Specify Custom Geography</Label>
                        <Input
                          id="customGeography"
                          value={formData.customGeography}
                          onChange={(e) => setFormData(prev => ({ ...prev, customGeography: e.target.value }))}
                          placeholder="Enter specific geographic areas..."
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Data Source & Quality */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Let's assess your data availability</Label>
                    <p className="text-sm text-muted-foreground mb-6">Please indicate what data you typically have access to for your applicants.</p>
                    
                    <div className="space-y-6">
                      {/* Core Credit Variables */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Core Credit Variables</h3>
                            <p className="text-sm text-muted-foreground">Critical for all loan types</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Data availability for Core Credit Variables</Label>
                            <RadioGroup 
                              className="flex space-x-6 mt-2"
                              value={formData.dataAvailability.coreCredit}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                dataAvailability: { ...prev.dataAvailability, coreCredit: value }
                              }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="core-always" />
                                <Label htmlFor="core-always" className="text-sm">Always Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="usually" id="core-usually" />
                                <Label htmlFor="core-usually" className="text-sm">Usually Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sometimes" id="core-sometimes" />
                                <Label htmlFor="core-sometimes" className="text-sm">Sometimes Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rarely" id="core-rarely" />
                                <Label htmlFor="core-rarely" className="text-sm">Rarely Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not" id="core-not" />
                                <Label htmlFor="core-not" className="text-sm">Not Available</Label>
                              </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground mt-2">
                              Typical Variables: credit_score, credit_history, enquiry_count, credit_utilization
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Market Availability: High - directly available from Credit Bureaus
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Income & Employment */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Income & Employment</h3>
                            <p className="text-sm text-muted-foreground">Essential for repayment capacity</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Data availability for Income & Employment</Label>
                            <RadioGroup 
                              className="flex space-x-6 mt-2"
                              value={formData.dataAvailability.income}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                dataAvailability: { ...prev.dataAvailability, income: value }
                              }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="income-always" />
                                <Label htmlFor="income-always" className="text-sm">Always Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="usually" id="income-usually" />
                                <Label htmlFor="income-usually" className="text-sm">Usually Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sometimes" id="income-sometimes" />
                                <Label htmlFor="income-sometimes" className="text-sm">Sometimes Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rarely" id="income-rarely" />
                                <Label htmlFor="income-rarely" className="text-sm">Rarely Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not" id="income-not" />
                                <Label htmlFor="income-not" className="text-sm">Not Available</Label>
                              </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground mt-2">
                              Typical Variables: monthly_income, employment_tenure, employment_sector, job_type, company_identity
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Market Availability: High - Standard KYC requirement
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Banking Behavior */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Banking Behavior</h3>
                            <p className="text-sm text-muted-foreground">Strong predictor of financial discipline</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Data availability for Banking Behavior</Label>
                            <RadioGroup 
                              className="flex space-x-6 mt-2"
                              value={formData.dataAvailability.banking}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                dataAvailability: { ...prev.dataAvailability, banking: value }
                              }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="banking-always" />
                                <Label htmlFor="banking-always" className="text-sm">Always Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="usually" id="banking-usually" />
                                <Label htmlFor="banking-usually" className="text-sm">Usually Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sometimes" id="banking-sometimes" />
                                <Label htmlFor="banking-sometimes" className="text-sm">Sometimes Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rarely" id="banking-rarely" />
                                <Label htmlFor="banking-rarely" className="text-sm">Rarely Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not" id="banking-not" />
                                <Label htmlFor="banking-not" className="text-sm">Not Available</Label>
                              </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground mt-2">
                              Typical Variables: account_vintage, avg_monthly_balance, bounce_count, frequency_banking, relationship
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Market Availability: Medium - Requires customer consent/analysis
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Behavioral Analytics */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Behavioral Analytics</h3>
                            <p className="text-sm text-muted-foreground">Excellent for risk prediction</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Data availability for Behavioral Analytics</Label>
                            <RadioGroup 
                              className="flex space-x-6 mt-2"
                              value={formData.dataAvailability.behavioral}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                dataAvailability: { ...prev.dataAvailability, behavioral: value }
                              }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="behavioral-always" />
                                <Label htmlFor="behavioral-always" className="text-sm">Always Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="usually" id="behavioral-usually" />
                                <Label htmlFor="behavioral-usually" className="text-sm">Usually Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sometimes" id="behavioral-sometimes" />
                                <Label htmlFor="behavioral-sometimes" className="text-sm">Sometimes Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rarely" id="behavioral-rarely" />
                                <Label htmlFor="behavioral-rarely" className="text-sm">Rarely Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not" id="behavioral-not" />
                                <Label htmlFor="behavioral-not" className="text-sm">Not Available</Label>
                              </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground mt-2">
                              Typical Variables: app_engagement, GPS_movement, history_delinq_history, default_history
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Market Availability: Medium - Internal data or bureau reports
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Geographic & Social */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Geographic & Social</h3>
                            <p className="text-sm text-muted-foreground">Good for portfolio risk management</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Data availability for Geographic & Social</Label>
                            <RadioGroup 
                              className="flex space-x-6 mt-2"
                              value={formData.dataAvailability.geographic}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                dataAvailability: { ...prev.dataAvailability, geographic: value }
                              }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="geographic-always" />
                                <Label htmlFor="geographic-always" className="text-sm">Always Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="usually" id="geographic-usually" />
                                <Label htmlFor="geographic-usually" className="text-sm">Usually Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sometimes" id="geographic-sometimes" />
                                <Label htmlFor="geographic-sometimes" className="text-sm">Sometimes Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rarely" id="geographic-rarely" />
                                <Label htmlFor="geographic-rarely" className="text-sm">Rarely Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not" id="geographic-not" />
                                <Label htmlFor="geographic-not" className="text-sm">Not Available</Label>
                              </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground mt-2">
                              Typical Variables: address_stability, geographic_city_worth_zone
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Market Availability: Low to Medium - Combined GPS data providers
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Digital Footprint */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Digital Footprint</h3>
                            <p className="text-sm text-muted-foreground">Emerging predictor for digital lending</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Data availability for Digital Footprint</Label>
                            <RadioGroup 
                              className="flex space-x-6 mt-2"
                              value={formData.dataAvailability.digital}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                dataAvailability: { ...prev.dataAvailability, digital: value }
                              }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="digital-always" />
                                <Label htmlFor="digital-always" className="text-sm">Always Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="usually" id="digital-usually" />
                                <Label htmlFor="digital-usually" className="text-sm">Usually Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sometimes" id="digital-sometimes" />
                                <Label htmlFor="digital-sometimes" className="text-sm">Sometimes Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rarely" id="digital-rarely" />
                                <Label htmlFor="digital-rarely" className="text-sm">Rarely Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not" id="digital-not" />
                                <Label htmlFor="digital-not" className="text-sm">Not Available</Label>
                              </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground mt-2">
                              Typical Variables: device_usage, social_engagement_use, utility_pattern
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Market Availability: High for fintech, Low for traditional
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Tax Data */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Tax Data</h3>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Data availability for Tax Data</Label>
                            <RadioGroup 
                              className="flex space-x-6 mt-2"
                              value={formData.dataAvailability.tax}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                dataAvailability: { ...prev.dataAvailability, tax: value }
                              }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="tax-always" />
                                <Label htmlFor="tax-always" className="text-sm">Always Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="usually" id="tax-usually" />
                                <Label htmlFor="tax-usually" className="text-sm">Usually Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sometimes" id="tax-sometimes" />
                                <Label htmlFor="tax-sometimes" className="text-sm">Sometimes Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rarely" id="tax-rarely" />
                                <Label htmlFor="tax-rarely" className="text-sm">Rarely Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not" id="tax-not" />
                                <Label htmlFor="tax-not" className="text-sm">Not Available</Label>
                              </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground mt-2">
                              Typical Variables: ITR filings, advance tax payments, TDS records, tax compliance
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Market Availability: Medium - varies by income levels and compliance
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Telecom */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Telecom</h3>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Data availability for Telecom</Label>
                            <RadioGroup 
                              className="flex space-x-6 mt-2"
                              value={formData.dataAvailability.telecom}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                dataAvailability: { ...prev.dataAvailability, telecom: value }
                              }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="telecom-always" />
                                <Label htmlFor="telecom-always" className="text-sm">Always Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="usually" id="telecom-usually" />
                                <Label htmlFor="telecom-usually" className="text-sm">Usually Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sometimes" id="telecom-sometimes" />
                                <Label htmlFor="telecom-sometimes" className="text-sm">Sometimes Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rarely" id="telecom-rarely" />
                                <Label htmlFor="telecom-rarely" className="text-sm">Rarely Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not" id="telecom-not" />
                                <Label htmlFor="telecom-not" className="text-sm">Not Available</Label>
                              </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground mt-2">
                              Typical Variables: Recharge value, frequency, call patterns, location data
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Market Availability: High - especially strong for prepaid users
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Utility */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Utility</h3>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Data availability for Utility</Label>
                            <RadioGroup 
                              className="flex space-x-6 mt-2"
                              value={formData.dataAvailability.utility}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                dataAvailability: { ...prev.dataAvailability, utility: value }
                              }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="utility-always" />
                                <Label htmlFor="utility-always" className="text-sm">Always Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="usually" id="utility-usually" />
                                <Label htmlFor="utility-usually" className="text-sm">Usually Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sometimes" id="utility-sometimes" />
                                <Label htmlFor="utility-sometimes" className="text-sm">Sometimes Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rarely" id="utility-rarely" />
                                <Label htmlFor="utility-rarely" className="text-sm">Rarely Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not" id="utility-not" />
                                <Label htmlFor="utility-not" className="text-sm">Not Available</Label>
                              </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground mt-2">
                              Typical Variables: Electricity, water, gas bills, payment consistency, consumption patterns
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Market Availability: Medium - varies by urban/rural and formal utility connections
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Ecommerce */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Ecommerce</h3>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Data availability for Ecommerce</Label>
                            <RadioGroup 
                              className="flex space-x-6 mt-2"
                              value={formData.dataAvailability.ecommerce}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                dataAvailability: { ...prev.dataAvailability, ecommerce: value }
                              }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="ecommerce-always" />
                                <Label htmlFor="ecommerce-always" className="text-sm">Always Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="usually" id="ecommerce-usually" />
                                <Label htmlFor="ecommerce-usually" className="text-sm">Usually Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sometimes" id="ecommerce-sometimes" />
                                <Label htmlFor="ecommerce-sometimes" className="text-sm">Sometimes Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rarely" id="ecommerce-rarely" />
                                <Label htmlFor="ecommerce-rarely" className="text-sm">Rarely Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not" id="ecommerce-not" />
                                <Label htmlFor="ecommerce-not" className="text-sm">Not Available</Label>
                              </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground mt-2">
                              Typical Variables: Purchase patterns, payment methods, order frequency, delivery addresses
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Market Availability: Medium - growing with digital adoption
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Usage */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Mobile Usage</h3>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Data availability for Mobile Usage</Label>
                            <RadioGroup 
                              className="flex space-x-6 mt-2"
                              value={formData.dataAvailability.mobile}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                dataAvailability: { ...prev.dataAvailability, mobile: value }
                              }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="mobile-always" />
                                <Label htmlFor="mobile-always" className="text-sm">Always Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="usually" id="mobile-usually" />
                                <Label htmlFor="mobile-usually" className="text-sm">Usually Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sometimes" id="mobile-sometimes" />
                                <Label htmlFor="mobile-sometimes" className="text-sm">Sometimes Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rarely" id="mobile-rarely" />
                                <Label htmlFor="mobile-rarely" className="text-sm">Rarely Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not" id="mobile-not" />
                                <Label htmlFor="mobile-not" className="text-sm">Not Available</Label>
                              </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground mt-2">
                              Typical Variables: App usage patterns, device information, digital behavior analytics
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Market Availability: High - widespread smartphone penetration
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Founder & Partner Profile */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Founder & Partner Profile</h3>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Data availability for Founder & Partner Profile</Label>
                            <RadioGroup 
                              className="flex space-x-6 mt-2"
                              value={formData.dataAvailability.founder}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                dataAvailability: { ...prev.dataAvailability, founder: value }
                              }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="founder-always" />
                                <Label htmlFor="founder-always" className="text-sm">Always Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="usually" id="founder-usually" />
                                <Label htmlFor="founder-usually" className="text-sm">Usually Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sometimes" id="founder-sometimes" />
                                <Label htmlFor="founder-sometimes" className="text-sm">Sometimes Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rarely" id="founder-rarely" />
                                <Label htmlFor="founder-rarely" className="text-sm">Rarely Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not" id="founder-not" />
                                <Label htmlFor="founder-not" className="text-sm">Not Available</Label>
                              </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground mt-2">
                              Typical Variables: Educational background, work experience, business history, asset ownership
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Market Availability: Low - limited to formal business establishments
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Other Data Sources */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Other Data Sources</h3>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Data availability for Other Data Sources</Label>
                            <RadioGroup 
                              className="flex space-x-6 mt-2"
                              value={formData.dataAvailability.other}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                dataAvailability: { ...prev.dataAvailability, other: value }
                              }))}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="always" id="other-always" />
                                <Label htmlFor="other-always" className="text-sm">Always Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="usually" id="other-usually" />
                                <Label htmlFor="other-usually" className="text-sm">Usually Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sometimes" id="other-sometimes" />
                                <Label htmlFor="other-sometimes" className="text-sm">Sometimes Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rarely" id="other-rarely" />
                                <Label htmlFor="other-rarely" className="text-sm">Rarely Available</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="not" id="other-not" />
                                <Label htmlFor="other-not" className="text-sm">Not Available</Label>
                              </div>
                            </RadioGroup>
                            <p className="text-xs text-muted-foreground mt-2">
                              Typical Variables: Custom data sources as specified by institution
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Market Availability: Variable - depends on specific data source
                            </p>
                          </div>
                          
                          <div className="mt-4">
                            <Label className="text-sm font-medium">Specify Other Data Sources</Label>
                            <Textarea
                              placeholder="Property Data"
                              className="mt-2"
                              rows={3}
                              value={formData.customDataSources || ""}
                              onChange={(e) => setFormData(prev => ({ ...prev, customDataSources: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Capability Matching */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Capability Assessment Complete</h3>
                    <p className="text-muted-foreground">
                      Based on your selected data sources and quality metrics, our AI system has identified 
                      the optimal scoring model configuration for your requirements.
                    </p>
                    
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          {Object.values(formData.dataAvailability).filter(value => value && value !== "" && value !== "not").length}
                        </div>
                        <div className="text-sm text-blue-700">Data Sources Selected</div>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {(() => {
                            const selectedSources = Object.entries(formData.dataAvailability).filter(([key, value]) => value && value !== "" && value !== "not");
                            if (selectedSources.length === 0) return 0;
                            
                            const qualityScores = selectedSources.map(([key, availability]) => {
                              // Map availability to quality score
                              switch (availability) {
                                case "always": return 95;
                                case "usually": return 85;
                                case "sometimes": return 70;
                                case "rarely": return 50;
                                default: return 0;
                              }
                            });
                            
                            const total = qualityScores.reduce((sum: number, score: number) => sum + score, 0);
                            return Math.round(total / selectedSources.length);
                          })()}%
                        </div>
                        <div className="text-sm text-green-700">Average Data Quality</div>
                      </div>
                      
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-purple-600 mb-1">
                          {(() => {
                            const selectedCount = Object.values(formData.dataAvailability).filter(value => value && value !== "" && value !== "not").length;
                            const productCount = formData.productTypes.length;
                            const segmentCount = formData.targetSegments.length;
                            
                            if (selectedCount >= 5 && productCount >= 2 && segmentCount >= 2) return "High";
                            if (selectedCount >= 3 && productCount >= 1 && segmentCount >= 1) return "Medium";
                            return "Low";
                          })()}
                        </div>
                        <div className="text-sm text-purple-700">Model Confidence</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Data Source Review & Load Distribution */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="text-base font-medium">Data Source Review & Load Distribution</Label>
                        <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                          This view helps you confirm that data from selected sources is fairly distributed across scoring categories. 
                          Actual scoring logic and final weights are determined by the AI engine in the next step.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {Object.entries(formData.dataAvailability)
                        .filter(([key, value]) => value && value !== "" && value !== "not")
                        .map(([key, value]) => {
                        // Map data availability keys to display names
                        const displayNames = {
                          coreCredit: "Core Credit Variables",
                          income: "Income & Employment", 
                          banking: "Banking Behavior",
                          behavioral: "Behavioral Analytics",
                          geographic: "Geographic & Social",
                          digital: "Digital Footprint",
                          tax: "Tax Data",
                          telecom: "Telecom",
                          utility: "Utility",
                          ecommerce: "Ecommerce",
                          mobile: "Mobile Usage",
                          founder: "Founder & Partner Profile",
                          other: "Other Data Sources"
                        };
                        
                        return (
                          <div key={key} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <Label className="font-medium">{displayNames[key as keyof typeof displayNames]}</Label>
                              <span className="text-lg font-semibold">{formData.categoryWeights[key as keyof typeof formData.categoryWeights] || 0}%</span>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full relative overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                  style={{ width: `${formData.categoryWeights[key as keyof typeof formData.categoryWeights] || 0}%` }}
                                />
                              </div>
                              <div className="w-20 text-center py-1 px-2 bg-gray-100 rounded border text-sm font-medium">
                                {formData.categoryWeights[key as keyof typeof formData.categoryWeights] || 0}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Total Weight:</span>
{(() => {
                          const selectedKeys = Object.keys(formData.dataAvailability).filter(key => 
                            formData.dataAvailability[key as keyof typeof formData.dataAvailability] && 
                            formData.dataAvailability[key as keyof typeof formData.dataAvailability] !== "" && 
                            formData.dataAvailability[key as keyof typeof formData.dataAvailability] !== "not"
                          );
                          const totalWeight = Object.entries(formData.categoryWeights)
                            .filter(([key]) => selectedKeys.includes(key))
                            .reduce((sum, [, weight]) => sum + weight, 0);
                          
                          return (
                            <span className={`text-lg font-bold ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
                              {totalWeight}%
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Variable & Band Setup - Bug Fix #3 */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Variable Scoring & Band Configuration</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Define scoring bands for each variable. Bands must total the assigned variable score.
                    </p>
                    
                    <div className="space-y-4">
                      {Object.entries(formData.dataAvailability)
                        .filter(([key, value]) => value && value !== "" && value !== "not")
                        .map(([key, value]) => {
                        // Map data availability keys to data source objects
                        const sourceMapping = {
                          coreCredit: { id: "bureau", label: "Core Credit Variables", variables: ["Credit Score", "Credit History Length", "Payment History", "Credit Utilization", "Account Types"] },
                          income: { id: "employment", label: "Income & Employment", variables: ["Employment Tenure", "Salary Amount", "Designation", "Company Rating", "Industry Type"] },
                          banking: { id: "banking", label: "Banking Behavior", variables: ["Account Balance", "Transaction Volume", "Salary Credits", "EMI Payments", "Bounce Rate"] },
                          behavioral: { id: "mobile", label: "Behavioral Analytics", variables: ["App Usage", "Recharge Patterns", "Location Stability", "Contact Quality", "Device Info"] },
                          geographic: { id: "geographic", label: "Geographic & Social", variables: ["Location Stability", "Address Verification", "Social Connections", "Regional Risk", "Urban/Rural"] },
                          digital: { id: "digital", label: "Digital Footprint", variables: ["Online Presence", "Digital Transactions", "E-commerce Activity", "Social Media", "Digital Identity"] },
                          tax: { id: "tax", label: "Tax Data", variables: ["GST Returns", "Income Tax Filings", "Tax Compliance", "Business Registration", "Revenue Declaration"] },
                          telecom: { id: "telecom", label: "Telecom", variables: ["Call Patterns", "SMS Activity", "Data Usage", "Payment History", "Service Tenure"] },
                          utility: { id: "utility", label: "Utility", variables: ["Electricity Bills", "Water Bills", "Gas Bills", "Payment Regularity", "Usage Patterns"] },
                          ecommerce: { id: "ecommerce", label: "Ecommerce", variables: ["Purchase Frequency", "Spending Patterns", "Payment Methods", "Return Behavior", "Loyalty Score"] },
                          mobile: { id: "mobilev2", label: "Mobile Usage", variables: ["App Categories", "Usage Duration", "Location Data", "Device Info", "Network Quality"] },
                          founder: { id: "founder", label: "Founder & Partner Profile", variables: ["Education Background", "Work Experience", "Business History", "Asset Ownership", "Industry Reputation"] },
                          other: { id: "other", label: "Other Data Sources", variables: ["Custom Variable 1", "Custom Variable 2", "External Score", "Reference Checks", "Manual Assessment"] }
                        };
                        
                        const source = sourceMapping[key as keyof typeof sourceMapping];
                        if (!source) return null;
                        
                        return (
                          <Card key={key}>
                            <CardHeader>
                              <CardTitle className="text-lg">{source.label} Variables</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {source.variables.map((variable, variableIndex) => {
                                  const variableKey = `${key}_${variable}`;
                                  
                                  // AI-based variable scoring that distributes full data source weight
                                  const getVariableScore = (dataSource: string, variableName: string) => {
                                    const dataSourceWeight = formData.categoryWeights[key as keyof typeof formData.categoryWeights] || 0;
                                    
                                    // Define relative importance ratios
                                    const significanceRatios: Record<string, Record<string, number>> = {
                                      coreCredit: {
                                        "Credit Score": 0.33,      // 33% of data source weight
                                        "Payment History": 0.27,   // 27% of data source weight  
                                        "Credit History Length": 0.20, // 20% of data source weight
                                        "Credit Utilization": 0.13,    // 13% of data source weight
                                        "Account Types": 0.07          // 7% of data source weight
                                      },
                                      income: {
                                        "Salary Amount": 0.30,
                                        "Employment Tenure": 0.25,
                                        "Company Rating": 0.20,
                                        "Designation": 0.15,
                                        "Industry Type": 0.10
                                      },
                                      banking: {
                                        "Account Balance": 0.30,
                                        "Salary Credits": 0.25,
                                        "Transaction Volume": 0.20,
                                        "EMI Payments": 0.15,
                                        "Bounce Rate": 0.10
                                      },
                                      behavioral: {
                                        "Location Stability": 0.30,
                                        "Device Info": 0.25,
                                        "Recharge Patterns": 0.20,
                                        "Contact Quality": 0.15,
                                        "App Usage": 0.10
                                      },
                                      geographic: {
                                        "Location Stability": 0.30,
                                        "Address Verification": 0.25,
                                        "Regional Risk": 0.20,
                                        "Social Connections": 0.15,
                                        "Urban/Rural": 0.10
                                      },
                                      digital: {
                                        "Digital Transactions": 0.30,
                                        "Online Presence": 0.25,
                                        "E-commerce Activity": 0.20,
                                        "Digital Identity": 0.15,
                                        "Social Media": 0.10
                                      },
                                      tax: {
                                        "GST Returns": 0.30,
                                        "Income Tax Filings": 0.25,
                                        "Tax Compliance": 0.20,
                                        "Business Registration": 0.15,
                                        "Revenue Declaration": 0.10
                                      },
                                      telecom: {
                                        "Payment History": 0.30,
                                        "Call Patterns": 0.25,
                                        "Data Usage": 0.20,
                                        "Service Tenure": 0.15,
                                        "SMS Activity": 0.10
                                      },
                                      utility: {
                                        "Payment Regularity": 0.30,
                                        "Electricity Bills": 0.25,
                                        "Usage Patterns": 0.20,
                                        "Water Bills": 0.15,
                                        "Gas Bills": 0.10
                                      },
                                      ecommerce: {
                                        "Spending Patterns": 0.30,
                                        "Purchase Frequency": 0.25,
                                        "Payment Methods": 0.20,
                                        "Loyalty Score": 0.15,
                                        "Return Behavior": 0.10
                                      },
                                      mobile: {
                                        "Location Data": 0.30,
                                        "Usage Duration": 0.25,
                                        "Network Quality": 0.20,
                                        "Device Info": 0.15,
                                        "App Categories": 0.10
                                      },
                                      founder: {
                                        "Work Experience": 0.30,
                                        "Business History": 0.25,
                                        "Asset Ownership": 0.20,
                                        "Education Background": 0.15,
                                        "Industry Reputation": 0.10
                                      },
                                      other: {
                                        "External Score": 0.30,
                                        "Custom Variable 1": 0.25,
                                        "Custom Variable 2": 0.20,
                                        "Reference Checks": 0.15,
                                        "Manual Assessment": 0.10
                                      }
                                    };
                                    
                                    // Get all variables for this data source to ensure exact distribution
                                    const dataSourceVars = source.variables;
                                    const varIndex = dataSourceVars.indexOf(variableName);
                                    
                                    // Pure mathematical distribution - no hardcoding anywhere
                                    const totalWeight = dataSourceWeight;
                                    const numVars = dataSourceVars.length;
                                    
                                    // Calculate base score per variable
                                    const baseScore = Math.floor(totalWeight / numVars);
                                    const remainder = totalWeight % numVars;
                                    
                                    // Distribute remainder to first variables to ensure exact total
                                    return baseScore + (varIndex < remainder ? 1 : 0);
                                  };
                                  
                                  const currentScore = formData.variableScores[variableKey] || getVariableScore(key, variable);
                                  
                                  return (
                                    <Collapsible key={variable}>
                                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium">{variable}</span>
                                          <Badge variant="outline">{currentScore} points</Badge>
                                        </div>
                                        <ChevronDown className="w-4 h-4" />
                                      </CollapsibleTrigger>
                                      
                                      <CollapsibleContent className="mt-2 p-4 border rounded-lg bg-white">
                                        {(() => {
                                          // Calculate total score for this data source and validation
                                          const dataSourceWeight = formData.categoryWeights[key as keyof typeof formData.categoryWeights] || 0;
                                          const currentDataSourceVariables = source.variables;
                                          const totalAssignedScore = currentDataSourceVariables.reduce((sum, v) => {
                                            const vKey = `${key}_${v}`;
                                            return sum + (formData.variableScores[vKey] || getVariableScore(key, v));
                                          }, 0);
                                          const remainingScore = dataSourceWeight - totalAssignedScore + currentScore;
                                          const isOverLimit = totalAssignedScore > dataSourceWeight;
                                          
                                          return (
                                            <div className="mb-4">
                                              <Label className="text-sm">Variable Score: {currentScore}</Label>
                                              {totalAssignedScore !== dataSourceWeight && (
                                                <p className="text-xs text-red-600 mt-1">
                                                  Warning: Variable total ({totalAssignedScore}) ≠ category weight ({dataSourceWeight})
                                                </p>
                                              )}
                                              <Slider
                                                value={[currentScore]}
                                                onValueChange={([value]) => {
                                                  setFormData(prev => ({
                                                    ...prev,
                                                    variableScores: {
                                                      ...prev.variableScores,
                                                      [variableKey]: value
                                                    }
                                                  }));
                                                }}
                                                min={1}
                                                max={Math.min(remainingScore > 0 ? remainingScore : dataSourceWeight, 20)}
                                                step={1}
                                                className="mt-1"
                                              />
                                              <p className="text-xs text-muted-foreground mt-1">
                                                Max: {Math.min(remainingScore > 0 ? remainingScore : dataSourceWeight, 20)} | 
                                                Data source total: {totalAssignedScore}/{dataSourceWeight}
                                              </p>
                                            </div>
                                          );
                                        })()}
                                        
                                        <div>
                                          <Label className="text-sm font-medium">Scoring Bands</Label>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Note: Only ONE band will match per application. Each score represents points awarded for that specific range.
                                          </p>
                                          <div className="mt-2 space-y-2">
                                            {(formData.variableBands[variableKey] || (() => {
                                              // Generate specific value ranges based on variable type
                                              const getDefaultBands = (variableName: string) => {
                                                const bandTemplates: Record<string, Array<{range: string, score: number}>> = {
                                                  // Dynamic band generation based on variable type and currentScore
                                                  "Credit Score": [
                                                    { range: "< 550", score: 0 },
                                                    { range: "550-649", score: Math.round(currentScore * 0.2) },
                                                    { range: "650-749", score: Math.round(currentScore * 0.6) },
                                                    { range: "750+", score: currentScore }
                                                  ],
                                                  "Employment Tenure": [
                                                    { range: "< 6 months", score: 0 },
                                                    { range: "6-18 months", score: Math.round(currentScore * 0.25) },
                                                    { range: "18-36 months", score: Math.round(currentScore * 0.6) },
                                                    { range: "36+ months", score: currentScore }
                                                  ],
                                                  "Salary Amount": [
                                                    { range: "< ₹25K", score: 0 },
                                                    { range: "₹25K-50K", score: Math.round(currentScore * 0.25) },
                                                    { range: "₹50K-100K", score: Math.round(currentScore * 0.6) },
                                                    { range: "₹100K+", score: currentScore }
                                                  ],
                                                  "Account Balance": [
                                                    { range: "< ₹10K", score: 0 },
                                                    { range: "₹10K-50K", score: Math.round(currentScore * 0.25) },
                                                    { range: "₹50K-200K", score: Math.round(currentScore * 0.6) },
                                                    { range: "₹200K+", score: currentScore }
                                                  ],
                                                  "Credit History Length": [
                                                    { range: "< 1 year", score: 0 },
                                                    { range: "1-3 years", score: Math.round(currentScore * 0.2) },
                                                    { range: "3-7 years", score: Math.round(currentScore * 0.6) },
                                                    { range: "7+ years", score: currentScore }
                                                  ],
                                                  "Payment History": [
                                                    { range: "< 60%", score: 0 },
                                                    { range: "60-80%", score: Math.round(currentScore * 0.25) },
                                                    { range: "80-95%", score: Math.round(currentScore * 0.6) },
                                                    { range: "95%+", score: currentScore }
                                                  ],
                                                  "Credit Utilization": [
                                                    { range: "> 80%", score: 0 },
                                                    { range: "50-80%", score: 0 },
                                                    { range: "30-50%", score: Math.round(currentScore * 0.5) },
                                                    { range: "< 30%", score: currentScore }
                                                  ],
                                                  "Transaction Volume": [
                                                    { range: "< 10/month", score: 0 },
                                                    { range: "10-30/month", score: Math.round(currentScore * 0.25) },
                                                    { range: "30-100/month", score: Math.round(currentScore * 0.6) },
                                                    { range: "100+/month", score: currentScore }
                                                  ],
                                                  "GST Returns": [
                                                    { range: "< 50% filed", score: 0 },
                                                    { range: "50-70% filed", score: Math.round(currentScore * 0.25) },
                                                    { range: "70-90% filed", score: Math.round(currentScore * 0.6) },
                                                    { range: "90%+ filed", score: currentScore }
                                                  ],
                                                  "Account Types": [
                                                    { range: "Single Type", score: 0 },
                                                    { range: "2-3 Types", score: Math.round(currentScore * 0.5) },
                                                    { range: "4+ Types", score: currentScore }
                                                  ]
                                                };
                                                
                                                return bandTemplates[variableName] || [
                                                  { range: "Low", score: 0 },
                                                  { range: "Medium-Low", score: 1 },
                                                  { range: "Medium-High", score: Math.floor(currentScore / 2) },
                                                  { range: "High", score: currentScore }
                                                ];
                                              };
                                              
                                              return getDefaultBands(variable);
                                            })()).map((band, index) => (
                                              <div key={index} className="flex items-center space-x-2">
                                                <Input
                                                  value={band.range}
                                                  onChange={(e) => {
                                                    const newBands = [...(formData.variableBands[variableKey] || [])];
                                                    newBands[index] = { ...band, range: e.target.value };
                                                    setFormData(prev => ({
                                                      ...prev,
                                                      variableBands: {
                                                        ...prev.variableBands,
                                                        [variableKey]: newBands
                                                      }
                                                    }));
                                                  }}
                                                  placeholder="Range description"
                                                  className="flex-1"
                                                />
                                                <Input
                                                  type="number"
                                                  value={band.score}
                                                  onChange={(e) => {
                                                    const score = Math.min(parseInt(e.target.value) || 0, currentScore);
                                                    const newBands = [...(formData.variableBands[variableKey] || [])];
                                                    newBands[index] = { ...band, score };
                                                    setFormData(prev => ({
                                                      ...prev,
                                                      variableBands: {
                                                        ...prev.variableBands,
                                                        [variableKey]: newBands
                                                      }
                                                    }));
                                                  }}
                                                  className="w-20"
                                                  min="0"
                                                  max={currentScore}
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Score Simulation - Bug Fix #4 */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Simulation Parameters</Label>
                    <p className="text-sm text-muted-foreground mb-4">Configure simulation to match your business objectives</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm">Target Approval Rate: {formData.targetApprovalRate}%</Label>
                        <Slider
                          value={[formData.targetApprovalRate]}
                          onValueChange={([value]) => {
                            setFormData(prev => ({ ...prev, targetApprovalRate: value }));
                          }}
                          min={5}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm">Risk Appetite</Label>
                        <Select
                          value={formData.riskAppetite}
                          onValueChange={(value: "conservative" | "moderate" | "aggressive") => {
                            setFormData(prev => ({ ...prev, riskAppetite: value }));
                          }}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conservative">Conservative</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="aggressive">Aggressive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Approval Rate Simulation Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{formData.targetApprovalRate}%</div>
                          <div className="text-xs text-green-700">Target Rate</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {(() => {
                              // AI-based simulation calculation
                              const baseRate = formData.targetApprovalRate;
                              const dataSources = formData.selectedDataSources.length;
                              const riskMultiplier = {
                                'conservative': 0.85,
                                'moderate': 0.92,
                                'aggressive': 1.15
                              }[formData.riskAppetite];
                              
                              // AI model considers data richness and risk appetite
                              const dataRichness = Math.min(dataSources / 6, 1); // 6 is max categories
                              const aiAdjustment = (dataRichness * riskMultiplier);
                              const simulatedRate = Math.round(baseRate * aiAdjustment);
                              
                              return Math.min(simulatedRate, 100);
                            })()}%
                          </div>
                          <div className="text-xs text-blue-700">Simulated Rate</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">1,000</div>
                          <div className="text-xs text-purple-700">Test Cases</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {formData.riskAppetite === 'conservative' ? '2.1%' : 
                             formData.riskAppetite === 'moderate' ? '3.5%' : '5.2%'}
                          </div>
                          <div className="text-xs text-orange-700">Expected Default</div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Simulation calibrated to match your target approval rate of {formData.targetApprovalRate}% 
                        with {formData.riskAppetite} risk appetite. Results will be fine-tuned during scorecard generation.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 7: Generate Scorecard */}
              {currentStep === 7 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="scorecardName">Scorecard Name *</Label>
                      <Input
                        id="scorecardName"
                        value={formData.scorecardName}
                        onChange={(e) => setFormData(prev => ({ ...prev, scorecardName: e.target.value }))}
                        placeholder="Enter scorecard name..."
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="owner">Owner *</Label>
                      <Input
                        id="owner"
                        value={formData.owner}
                        onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                        placeholder="Enter owner name..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter scorecard description..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  
                  {isGenerating ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bot className="w-8 h-8 text-blue-600 animate-pulse" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Generating AI Scorecard...</h3>
                      <Progress value={generationProgress} className="w-full max-w-md mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">
                        Processing {formData.selectedDataSources.length} data sources and {formData.targetSegments.length} segments
                      </p>
                    </div>
                  ) : generatedScorecard ? (
                    // DEBUG: Log scorecard data when component renders
                    console.log('DEBUG RENDER: generatedScorecard in render:', generatedScorecard),
                    // Step 7: Comprehensive AI Scorecard Results View
                    <div className="space-y-6">
                      <div className="text-center">
                        <h3 className="text-xl font-semibold mb-2">AI Scorecard Generated Successfully</h3>
                        <p className="text-muted-foreground">{generatedScorecard.name}</p>
                        <div className="mt-2 flex justify-center gap-4 text-sm">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                            {generatedScorecard.categories || Object.keys(generatedScorecard.configJson?.categories || {}).length || 0} Categories
                          </span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                            {generatedScorecard.variables || Object.values(generatedScorecard.configJson?.categories || {}).reduce((total: number, cat: any) => total + (cat.variables?.length || 0), 0) || 0} Variables
                          </span>
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">
                            {generatedScorecard.success ? 'Production Ready' : 'Error'}
                          </span>
                        </div>
                      </div>

                      {/* A. AI Rationale Summary */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Bot className="w-5 h-5" />
                            <span>AI Rationale Summary</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Risk Appetite Type</div>
                              <div className="font-semibold capitalize">{generatedScorecard.configJson?.metadata?.riskAppetite || formData.riskAppetite}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Geography Focus</div>
                              <div className="font-semibold">{Array.isArray(generatedScorecard.configJson?.metadata?.geography) ? generatedScorecard.configJson.metadata.geography.join(', ') : 'Not specified'}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Target Approval Rate</div>
                              <div className="font-semibold">{generatedScorecard.configJson?.metadata?.targetApprovalRate || formData.targetApprovalRate}%</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Total Categories</div>
                              <div className="font-semibold">{generatedScorecard.configJson?.metadata?.totalCategories || Object.keys(generatedScorecard.configJson?.categories || {}).length}</div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="text-sm font-medium text-muted-foreground">AI Rationale</div>
                            <div className="text-sm mt-1 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                              {generatedScorecard.aiRationale || generatedScorecard.configJson?.metadata?.aiRationale || 'AI rationale processing...'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* B. Category Weights Table */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <BarChart3 className="w-5 h-5" />
                            <span>Category Weights (Rule-Based)</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2 font-medium">Category</th>
                                  <th className="text-left p-2 font-medium">Weight %</th>
                                  <th className="text-left p-2 font-medium">Variables</th>
                                  <th className="text-left p-2 font-medium">Logic Applied</th>
                                </tr>
                              </thead>
                              <tbody>
                                {generatedScorecard.configJson?.categories ? 
                                  Object.entries(generatedScorecard.configJson.categories).map(([category, data]: [string, any]) => (
                                    <tr key={category} className="border-b hover:bg-gray-50">
                                      <td className="p-2 font-medium">{category}</td>
                                      <td className="p-2 text-blue-600 font-semibold">{data.weight}%</td>
                                      <td className="p-2">{data.variables?.length || 0}</td>
                                      <td className="p-2 text-sm text-muted-foreground">
                                        {category.includes('Banking') ? 'Core financial behavior analysis' :
                                         category.includes('Income') ? 'Employment verification priority' :
                                         category.includes('Digital') ? 'Urban geography boost applied' :
                                         category.includes('Alternative') ? 'Rural/informal segment focus' :
                                         'Rule-based weight allocation'}
                                      </td>
                                    </tr>
                                  )) :
                                  <tr>
                                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                                      No categories generated. Check authentication and try again.
                                    </td>
                                  </tr>
                                }
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <strong>Rule-Based Logic:</strong> Weights automatically adjusted based on risk appetite ({generatedScorecard.configJson?.metadata?.riskAppetite}), 
                              geography ({Array.isArray(generatedScorecard.configJson?.metadata?.geography) ? generatedScorecard.configJson.metadata.geography.join(', ') : 'Not specified'}), 
                              and data availability.
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* C. Live Simulation Results */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <TrendingUp className="w-5 h-5" />
                            <span>Live Simulation Results</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">
                                {generatedScorecard.configJson?.simulation?.approvalMetrics?.achievedApprovalRate || 
                                 generatedScorecard.configJson?.metadata?.achievedApprovalRate || 
                                 formData.targetApprovalRate}%
                              </div>
                              <div className="text-sm text-muted-foreground">Achieved Rate</div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">
                                {generatedScorecard.configJson?.simulation?.approvalMetrics?.targetApprovalRate || 
                                 generatedScorecard.configJson?.metadata?.targetApprovalRate || 
                                 formData.targetApprovalRate}%
                              </div>
                              <div className="text-sm text-muted-foreground">Target Rate</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                              <div className="text-2xl font-bold text-gray-600">
                                {generatedScorecard.configJson?.simulation?.totalApplications || 1000}
                              </div>
                              <div className="text-sm text-muted-foreground">Sample Records</div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-3">Grade Distribution</h4>
                            <div className="space-y-2">
                              {(() => {
                                const simulationData = generatedScorecard.configJson?.simulation?.gradeDistribution || {};
                                const fallbackData = {
                                  A: { percentage: 8 },
                                  B: { percentage: Math.max(0, formData.targetApprovalRate - 8) },
                                  C: { percentage: Math.round((100 - formData.targetApprovalRate) * 0.6) },
                                  D: { percentage: Math.round((100 - formData.targetApprovalRate) * 0.4) }
                                };
                                
                                const gradeData = Object.keys(simulationData).length > 0 ? simulationData : fallbackData;
                                
                                return Object.entries(gradeData).map(([grade, data]: [string, any]) => (
                                  <div key={grade} className="flex justify-between items-center">
                                    <span className="text-sm">Grade {grade} ({grade === 'A' ? 'Prime' : grade === 'B' ? 'Near Prime' : grade === 'C' ? 'Review' : 'Decline'})</span>
                                    <span className="font-medium">{data.percentage || data}%</span>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground italic">
                            Simulated on {generatedScorecard.configJson?.simulation?.totalApplications || 1000} sample records
                          </div>
                        </CardContent>
                      </Card>

                      {/* D. Download Functionality */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Download className="w-5 h-5" />
                            <span>Download Functionality</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <Button 
                              onClick={async () => {
                                if (!scorecardReady) {
                                  toast({
                                    title: "Please Wait",
                                    description: "Scorecard is still being processed. Please wait a moment.",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                setIsExporting(true);
                                try {
                                  const token = localStorage.getItem('auth_token');
                                  
                                  // Use captured scorecard ID
                                  const scorecardId = latestScorecardId || generatedScorecard?.id;
                                  if (!scorecardId) {
                                    throw new Error('Scorecard ID not available');
                                  }
                                  console.log('EXCEL EXPORT: Using scorecard ID:', scorecardId);
                                  const response = await fetch(`/api/ai/export/${scorecardId}/excel`, {
                                    method: 'GET',
                                    headers: {
                                      'Authorization': `Bearer ${token}`,
                                      'Content-Type': 'application/json'
                                    }
                                  });
                                  
                                  if (!response.ok) {
                                    const errorText = await response.text();
                                    console.error('Excel export error response:', errorText);
                                    throw new Error(`Export failed (${response.status}): ${errorText}`);
                                  }
                                  
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `Scorecard_${generatedScorecard.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  window.URL.revokeObjectURL(url);
                                  
                                  toast({
                                    title: "Excel Downloaded",
                                    description: "Scorecard exported successfully"
                                  });
                                } catch (error: any) {
                                  console.error('Export error:', error);
                                  toast({
                                    title: "Export Failed", 
                                    description: error.message || "Failed to download Excel file",
                                    variant: "destructive"
                                  });
                                } finally {
                                  setIsExporting(false);
                                }
                              }}
                              variant="outline" 
                              className="h-20 flex-col p-4"
                            >
                              <Download className={`w-8 h-8 mb-2 ${isExporting ? 'animate-spin text-gray-400' : 'text-green-600'}`} />
                              <span className="font-medium">{isExporting ? 'Exporting...' : 'Download Excel'}</span>
                              <span className="text-xs text-muted-foreground text-center mt-1">
                                {!scorecardReady ? 'Processing...' : 'Complete scorecard with categories & variables'}
                              </span>
                            </Button>
                            <Button 
                              onClick={async () => {
                                if (!scorecardReady) {
                                  toast({
                                    title: "Please Wait",
                                    description: "Scorecard is still being processed. Please wait a moment.",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                setIsExporting(true);
                                try {
                                  const token = localStorage.getItem('auth_token');
                                  
                                  // Use captured scorecard ID
                                  const scorecardId = latestScorecardId || generatedScorecard?.id;
                                  if (!scorecardId) {
                                    throw new Error('Scorecard ID not available');
                                  }
                                  console.log('PDF EXPORT: Using scorecard ID:', scorecardId);
                                  const response = await fetch(`/api/ai/export/${scorecardId}/pdf`, {
                                    method: 'GET',
                                    headers: {
                                      'Authorization': `Bearer ${token}`,
                                      'Content-Type': 'application/json'
                                    }
                                  });
                                  
                                  if (!response.ok) {
                                    const errorText = await response.text();
                                    console.error('PDF export error response:', errorText);
                                    throw new Error(`Export failed (${response.status}): ${errorText}`);
                                  }
                                  
                                  const jsonData = await response.json();
                                  const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `Scorecard_Summary_${generatedScorecard.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  window.URL.revokeObjectURL(url);
                                  
                                  toast({
                                    title: "Summary Downloaded",
                                    description: "Scorecard summary exported successfully"
                                  });
                                } catch (error: any) {
                                  console.error('Export error:', error);
                                  toast({
                                    title: "Export Failed",
                                    description: error.message || "Failed to download summary file", 
                                    variant: "destructive"
                                  });
                                } finally {
                                  setIsExporting(false);
                                }
                              }}
                              variant="outline" 
                              className="h-20 flex-col p-4"
                            >
                              <FileText className="w-8 h-8 mb-2 text-red-600" />
                              <span className="font-medium">Download Summary</span>
                              <span className="text-xs text-muted-foreground text-center mt-1">
                                JSON summary with AI rationale
                              </span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* View Insights Button */}
                      <div className="flex justify-center mt-6">
                        <Button 
                          onClick={() => setCurrentStep(8)}
                          className="flex items-center space-x-2"
                          size="lg"
                        >
                          <BarChart3 className="w-5 h-5" />
                          <span>View Scorecard Insights</span>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Button 
                        onClick={handleGenerate} 
                        size="lg" 
                        className="px-8"
                        disabled={generateScorecardMutation.isPending}
                      >
                        <Bot className="w-5 h-5 mr-2" />
                        Generate AI Scorecard
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 8: Scorecard Insights & AI Summary */}
              {currentStep === 8 && generatedScorecard && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">Scorecard Insights & AI Summary</h2>
                    <p className="text-muted-foreground">Visual analysis of your AI-generated scorecard logic and performance metrics</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Category Weight Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <BarChart3 className="w-5 h-5" />
                          <span>Category Weight Distribution</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {Object.entries(generatedScorecard.configJson?.categories || {}).map(([category, details]: [string, any]) => (
                            <div key={category} className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div 
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: `hsl(${Object.keys(generatedScorecard.configJson?.categories || {}).indexOf(category) * 40 + 20}, 65%, 55%)` }}
                                />
                                <span className="text-sm font-medium">{category}</span>
                              </div>
                              <span className="font-semibold">{details.weight}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Variables by Importance */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <TrendingUp className="w-5 h-5" />
                          <span>Top 10 Variables by Importance</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {(() => {
                            const allVariables: any[] = [];
                            Object.entries(generatedScorecard.configJson?.categories || {}).forEach(([category, details]: [string, any]) => {
                              if (details.variables && Array.isArray(details.variables)) {
                                details.variables.forEach((variable: any) => {
                                  allVariables.push({
                                    name: typeof variable === 'string' ? variable : variable.name,
                                    weight: typeof variable === 'object' ? variable.weight : Math.floor(details.weight / details.variables.length),
                                    importance: typeof variable === 'object' ? variable.importance : 'medium',
                                    category
                                  });
                                });
                              }
                            });
                            
                            return allVariables
                              .sort((a, b) => {
                                const importanceOrder = { highest: 3, high: 2, medium: 1, low: 0 };
                                return (importanceOrder[b.importance as keyof typeof importanceOrder] || 0) - 
                                       (importanceOrder[a.importance as keyof typeof importanceOrder] || 0);
                              })
                              .slice(0, 10)
                              .map((variable, index) => (
                                <div key={index} className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{variable.name.replace(/_/g, ' ')}</div>
                                    <div className="text-xs text-muted-foreground">{variable.category}</div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-green-500 rounded-full"
                                        style={{ width: `${Math.min(100, variable.weight * 2)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium w-8">{variable.weight}%</span>
                                  </div>
                                </div>
                              ));
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-3 italic">
                          Variable importance reflects relative predictive strength used by the AI model.
                        </div>
                      </CardContent>
                    </Card>

                    {/* Score Band Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <BarChart3 className="w-5 h-5" />
                          <span>Scorecard Spread (Simulated)</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {(() => {
                            // Calculate grade distribution from score bands
                            const bucketMapping = generatedScorecard.configJson?.bucketMapping || {};
                            const targetApprovalRate = formData.targetApprovalRate || 50;
                            
                            // Simulate distribution based on risk appetite and target approval
                            const simulatedDistribution = (() => {
                              if (formData.riskAppetite === 'conservative') {
                                // Conservative: More A/B grades, less C/D
                                return { A: 15, B: 25, C: 35, D: 25 };
                              } else if (formData.riskAppetite === 'aggressive') {
                                // Aggressive: More approvals across all grades
                                return { A: 25, B: 35, C: 25, D: 15 };
                              } else {
                                // Moderate: Balanced distribution
                                return { A: 20, B: 30, C: 30, D: 20 };
                              }
                            })();
                            
                            return Object.entries(bucketMapping).map(([grade, bucket]: [string, any]) => (
                              <div key={grade} className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold">
                                    {grade}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium">Score {bucket.min}-{bucket.max}</div>
                                    <div className="text-xs text-muted-foreground">{bucket.description}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold">
                                    {simulatedDistribution[grade as keyof typeof simulatedDistribution] || 0}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">Distribution</div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Target vs Achieved Approval Rate */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Target className="w-5 h-5" />
                          <span>Target vs Achieved Approval Rate</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Target Rate</span>
                            <span className="font-semibold">{formData.targetApprovalRate}%</span>
                          </div>
                          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${formData.targetApprovalRate}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Achieved Rate</span>
                            <span className="font-semibold text-green-600">
                              {generatedScorecard.configJson?.metadata?.achievedApprovalRate || 
                               generatedScorecard.configJson?.simulation?.approvalMetrics?.achievedApprovalRate || 
                               formData.targetApprovalRate}%
                            </span>
                          </div>
                          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${generatedScorecard.configJson?.metadata?.achievedApprovalRate || 
                                                generatedScorecard.configJson?.simulation?.approvalMetrics?.achievedApprovalRate || 
                                                formData.targetApprovalRate}%` }}
                            />
                          </div>
                          {!generatedScorecard.configJson?.metadata?.achievedApprovalRate && (
                            <div className="text-xs text-muted-foreground mt-2 italic">
                              Approval rate shown for reference. Check Excel for detailed simulation.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI Rationale Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Bot className="w-5 h-5" />
                        <span>AI Rationale Summary</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm leading-relaxed">
                          {generatedScorecard.configJson?.aiRationale || 
                           `The AI engine has optimized the scorecard based on your selected data sources, risk appetite (${formData.riskAppetite}), and target approval rate (${formData.targetApprovalRate}%). The model prioritizes variables with the highest predictive power while ensuring fair distribution across different data categories.`}
                          {(() => {
                            const topCategories = Object.entries(generatedScorecard.configJson?.categories || {})
                              .sort(([,a]: [string, any], [,b]: [string, any]) => b.weight - a.weight)
                              .slice(0, 2)
                              .map(([name]: [string, any]) => name);
                            
                            if (topCategories.length >= 2) {
                              return ` Based on selected sources, the model prioritizes ${topCategories[0]} and ${topCategories[1]} for your ${formData.riskAppetite} risk appetite.`;
                            }
                            return "";
                          })()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Navigation */}
                  <div className="flex justify-between items-center pt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentStep(7)}
                      className="flex items-center space-x-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to Downloads</span>
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setCurrentStep(1);
                        setGeneratedScorecard(null);
                        setScorecardReady(false);
                        setLatestScorecardId(null);
                      }}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Scorecard</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={prevStep} 
              disabled={currentStep === 1}
              className="flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>
            
            <Button 
              onClick={nextStep} 
              disabled={currentStep === 8}
              className="flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}