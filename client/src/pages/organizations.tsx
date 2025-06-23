import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Building, 
  Plus, 
  Edit, 
  Eye,
  Trash2,
  Phone,
  Globe,
  Calendar,
  UserCheck,
  DollarSign,
  Loader2
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Organization } from "@shared/schema";

const orgTypes = ["NBFC", "DSA", "Bank", "Aggregator", "Fintech"];

export default function Organizations() {
  const [open, setOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "",
    contactEmail: "",
    description: "",
    address: "",
    phone: "",
    website: "",
    businessRegNumber: "",
    licenseNumber: "",
    regulatoryAuthority: "",
    establishedYear: "",
    annualRevenue: "",
    employeeCount: "",
    branding: {
      primaryColor: "#3b82f6",
      secondaryColor: "#64748b",
      theme: "light",
      logo: ""
    },
    features: {
      aiScorecard: true,
      bulkProcessing: true,
      abTesting: false,
      apiAccess: true,
      advancedAnalytics: false,
      customReports: false
    },
    settings: {
      defaultApprovalRate: 75,
      riskTolerance: "Moderate"
    }
  });
  const [activeTab, setActiveTab] = useState("basic");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [viewingOrg, setViewingOrg] = useState<Organization | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["/api/organizations"]
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating organization with data:", data);
      return await apiRequest("POST", "/api/organizations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setOpen(false);
      resetForm();
      toast({
        title: "Organization Created",
        description: "The organization has been created successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Organization creation failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create organization.",
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PUT", `/api/organizations/${editingOrg?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setOpen(false);
      resetForm();
      toast({
        title: "Organization Updated",
        description: "The organization has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update organization.",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/organizations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setDeleteDialogOpen(false);
      setOrgToDelete(null);
      toast({
        title: "Organization Deleted",
        description: "The organization has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      type: "",
      contactEmail: "",
      description: "",
      address: "",
      phone: "",
      website: "",
      businessRegNumber: "",
      licenseNumber: "",
      regulatoryAuthority: "",
      establishedYear: "",
      annualRevenue: "",
      employeeCount: "",
      branding: {
        primaryColor: "#3b82f6",
        secondaryColor: "#64748b",
        theme: "light",
        logo: ""
      },
      features: {
        aiScorecard: true,
        bulkProcessing: true,
        abTesting: false,
        apiAccess: true,
        advancedAnalytics: false,
        customReports: false
      },
      settings: {
        defaultApprovalRate: 75,
        riskTolerance: "Moderate"
      }
    });
    setEditingOrg(null);
    setActiveTab("basic");
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      code: org.code,
      type: org.type,
      contactEmail: org.contactEmail,
      description: (org as any).description || "",
      address: (org as any).address || "",
      phone: (org as any).phone || "",
      website: (org as any).website || "",
      businessRegNumber: (org as any).businessRegNumber || "",
      licenseNumber: (org as any).licenseNumber || "",
      regulatoryAuthority: (org as any).regulatoryAuthority || "",
      establishedYear: (org as any).establishedYear?.toString() || "",
      annualRevenue: (org as any).annualRevenue?.toString() || "",
      employeeCount: (org as any).employeeCount?.toString() || "",
      branding: (org as any).branding || {
        primaryColor: "#3b82f6",
        secondaryColor: "#64748b",
        theme: "light",
        logo: ""
      },
      features: (org as any).features || {
        aiScorecard: true,
        bulkProcessing: true,
        abTesting: false,
        apiAccess: true,
        advancedAnalytics: false,
        customReports: false
      },
      settings: (org as any).settings || {
        defaultApprovalRate: 75,
        riskTolerance: "Moderate"
      }
    });
    setOpen(true);
  };

  const handleDelete = (org: Organization) => {
    setOrgToDelete(org);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (orgToDelete) {
      deleteMutation.mutate(orgToDelete.id);
    }
  };

  const handleViewDetails = (org: Organization) => {
    setViewingOrg(org);
    setViewDetailsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Raw form data:", formData);
    
    // Clean and validate the data before submission
    const cleanedData = {
      ...formData,
      // Ensure required fields are present and not empty
      name: formData.name?.trim() || '',
      code: formData.code?.trim() || '',
      type: formData.type || '',
      contactEmail: formData.contactEmail?.trim() || '',
      // Clean optional string fields
      description: formData.description?.trim() || null,
      address: formData.address?.trim() || null,
      phone: formData.phone?.trim() || null,
      website: formData.website?.trim() || null,
      businessRegNumber: formData.businessRegNumber?.trim() || null,
      licenseNumber: formData.licenseNumber?.trim() || null,
      regulatoryAuthority: formData.regulatoryAuthority?.trim() || null,
      // Convert numeric fields
      establishedYear: formData.establishedYear ? parseInt(String(formData.establishedYear)) : null,
      employeeCount: formData.employeeCount ? parseInt(String(formData.employeeCount)) : null,
      annualRevenue: formData.annualRevenue?.trim() || null,
      // Handle JSON fields
      branding: formData.branding || null,
      features: formData.features || null,
      settings: formData.settings || null,
    };
    
    console.log("Cleaned form data:", cleanedData);
    
    // Basic validation
    if (!cleanedData.name || !cleanedData.code || !cleanedData.type || !cleanedData.contactEmail) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields: Name, Code, Type, and Contact Email.",
        variant: "destructive",
      });
      return;
    }
    
    if (editingOrg) {
      updateMutation.mutate(cleanedData);
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "NBFC": return "bg-blue-100 text-blue-800";
      case "DSA": return "bg-green-100 text-green-800";
      case "Bank": return "bg-purple-100 text-purple-800";
      case "Aggregator": return "bg-orange-100 text-orange-800";
      case "Fintech": return "bg-pink-100 text-pink-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <ProtectedRoute requiredRole={["Admin"]}>
      <AppShell title="Organizations">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Organization Management</span>
                </CardTitle>
                <CardDescription>
                  Manage organizational settings, features, and configurations
                </CardDescription>
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Organization
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingOrg ? "Edit Organization" : "Add Organization"}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="features">Features</TabsTrigger>
                      <TabsTrigger value="branding">Branding</TabsTrigger>
                    </TabsList>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <TabsContent value="basic" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Organization Name *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              required
                              placeholder="Enter organization name"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="code">Organization Code *</Label>
                            <Input
                              id="code"
                              value={formData.code}
                              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                              required
                              placeholder="ORG001"
                              maxLength={10}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="type">Organization Type *</Label>
                            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select organization type" />
                              </SelectTrigger>
                              <SelectContent>
                                {orgTypes.map(type => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="email">Contact Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.contactEmail}
                              onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                              required
                              placeholder="contact@organization.com"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the organization"
                            rows={3}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="details" className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="address">Business Address</Label>
                          <Textarea
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Full business address"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="+1 (555) 123-4567"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input
                              id="website"
                              value={formData.website}
                              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                              placeholder="https://www.organization.com"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="businessRegNumber">Business Registration Number</Label>
                            <Input
                              id="businessRegNumber"
                              value={formData.businessRegNumber}
                              onChange={(e) => setFormData(prev => ({ ...prev, businessRegNumber: e.target.value }))}
                              placeholder="REG123456"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="licenseNumber">License Number</Label>
                            <Input
                              id="licenseNumber"
                              value={formData.licenseNumber}
                              onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                              placeholder="LIC789012"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="regulatoryAuthority">Regulatory Authority</Label>
                            <Input
                              id="regulatoryAuthority"
                              value={formData.regulatoryAuthority}
                              onChange={(e) => setFormData(prev => ({ ...prev, regulatoryAuthority: e.target.value }))}
                              placeholder="RBI, SEBI, etc."
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="establishedYear">Established Year</Label>
                            <Input
                              id="establishedYear"
                              type="number"
                              value={formData.establishedYear}
                              onChange={(e) => setFormData(prev => ({ ...prev, establishedYear: e.target.value }))}
                              placeholder="2020"
                              min="1800"
                              max={new Date().getFullYear()}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="employeeCount">Employee Count</Label>
                            <Input
                              id="employeeCount"
                              type="number"
                              value={formData.employeeCount}
                              onChange={(e) => setFormData(prev => ({ ...prev, employeeCount: e.target.value }))}
                              placeholder="100"
                              min="1"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="annualRevenue">Annual Revenue (USD)</Label>
                          <Input
                            id="annualRevenue"
                            type="number"
                            value={formData.annualRevenue}
                            onChange={(e) => setFormData(prev => ({ ...prev, annualRevenue: e.target.value }))}
                            placeholder="1000000"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="features" className="space-y-4">
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium">Platform Features</h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="aiScorecard">AI Scorecard Generator</Label>
                              <Switch
                                id="aiScorecard"
                                checked={formData.features.aiScorecard}
                                onCheckedChange={(checked) => 
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    features: { ...prev.features, aiScorecard: checked }
                                  }))
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label htmlFor="bulkProcessing">Bulk Processing</Label>
                              <Switch
                                id="bulkProcessing"
                                checked={formData.features.bulkProcessing}
                                onCheckedChange={(checked) => 
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    features: { ...prev.features, bulkProcessing: checked }
                                  }))
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label htmlFor="abTesting">A/B Testing</Label>
                              <Switch
                                id="abTesting"
                                checked={formData.features.abTesting}
                                onCheckedChange={(checked) => 
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    features: { ...prev.features, abTesting: checked }
                                  }))
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label htmlFor="apiAccess">API Access</Label>
                              <Switch
                                id="apiAccess"
                                checked={formData.features.apiAccess}
                                onCheckedChange={(checked) => 
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    features: { ...prev.features, apiAccess: checked }
                                  }))
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label htmlFor="advancedAnalytics">Advanced Analytics</Label>
                              <Switch
                                id="advancedAnalytics"
                                checked={formData.features.advancedAnalytics}
                                onCheckedChange={(checked) => 
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    features: { ...prev.features, advancedAnalytics: checked }
                                  }))
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label htmlFor="customReports">Custom Reports</Label>
                              <Switch
                                id="customReports"
                                checked={formData.features.customReports}
                                onCheckedChange={(checked) => 
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    features: { ...prev.features, customReports: checked }
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-4 pt-4 border-t">
                            <h4 className="text-sm font-medium">Default Settings</h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="defaultApprovalRate">Default Approval Rate (%)</Label>
                                <Input
                                  id="defaultApprovalRate"
                                  type="number"
                                  value={formData.settings.defaultApprovalRate}
                                  onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    settings: { ...prev.settings, defaultApprovalRate: parseInt(e.target.value) || 75 }
                                  }))}
                                  min="1"
                                  max="100"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                                <Select 
                                  value={formData.settings.riskTolerance} 
                                  onValueChange={(value) => setFormData(prev => ({ 
                                    ...prev, 
                                    settings: { ...prev.settings, riskTolerance: value }
                                  }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select risk tolerance" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Conservative">Conservative</SelectItem>
                                    <SelectItem value="Moderate">Moderate</SelectItem>
                                    <SelectItem value="Aggressive">Aggressive</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="branding" className="space-y-4">
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium">Brand Colors</h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="primaryColor">Primary Color</Label>
                              <div className="flex space-x-2">
                                <Input
                                  id="primaryColor"
                                  type="color"
                                  value={formData.branding.primaryColor}
                                  onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    branding: { ...prev.branding, primaryColor: e.target.value }
                                  }))}
                                  className="w-16 h-10"
                                />
                                <Input
                                  value={formData.branding.primaryColor}
                                  onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    branding: { ...prev.branding, primaryColor: e.target.value }
                                  }))}
                                  placeholder="#3b82f6"
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="secondaryColor">Secondary Color</Label>
                              <div className="flex space-x-2">
                                <Input
                                  id="secondaryColor"
                                  type="color"
                                  value={formData.branding.secondaryColor}
                                  onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    branding: { ...prev.branding, secondaryColor: e.target.value }
                                  }))}
                                  className="w-16 h-10"
                                />
                                <Input
                                  value={formData.branding.secondaryColor}
                                  onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    branding: { ...prev.branding, secondaryColor: e.target.value }
                                  }))}
                                  placeholder="#64748b"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="theme">Theme Preference</Label>
                            <Select 
                              value={formData.branding.theme} 
                              onValueChange={(value) => setFormData(prev => ({ 
                                ...prev, 
                                branding: { ...prev.branding, theme: value }
                              }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select theme" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="auto">Auto</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="logo">Logo URL</Label>
                            <Input
                              id="logo"
                              value={formData.branding.logo}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                branding: { ...prev.branding, logo: e.target.value }
                              }))}
                              placeholder="https://example.com/logo.png"
                            />
                          </div>
                        </div>
                      </TabsContent>
                      
                      <div className="flex justify-end space-x-2 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createMutation.isPending || updateMutation.isPending}
                        >
                          {createMutation.isPending || updateMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          {editingOrg ? "Update Organization" : "Create Organization"}
                        </Button>
                      </div>
                    </form>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading organizations...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations && Array.isArray(organizations) && organizations.map((org: Organization) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{org.code}</TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(org.type)}>
                          {org.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{org.contactEmail}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(org)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(org)}
                            title="Edit Organization"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(org)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete Organization"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Organization Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Organization</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete organization "{orgToDelete?.name}"? This action cannot be undone.
                All associated data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete Organization
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View Organization Details Dialog */}
        <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>{viewingOrg?.name}</span>
              </DialogTitle>
            </DialogHeader>
            
            {viewingOrg && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Organization Code</Label>
                    <p className="text-sm">{viewingOrg.code}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Type</Label>
                    <Badge className={getTypeColor(viewingOrg.type)}>
                      {viewingOrg.type}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Contact Email</Label>
                    <p className="text-sm">{viewingOrg.contactEmail}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>

                {(viewingOrg as any).description && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Description</Label>
                    <p className="text-sm mt-1">{(viewingOrg as any).description}</p>
                  </div>
                )}

                {(viewingOrg as any).address && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Address</Label>
                    <p className="text-sm mt-1">{(viewingOrg as any).address}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {(viewingOrg as any).phone && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>Phone</span>
                      </Label>
                      <p className="text-sm">{(viewingOrg as any).phone}</p>
                    </div>
                  )}
                  {(viewingOrg as any).website && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center space-x-1">
                        <Globe className="h-3 w-3" />
                        <span>Website</span>
                      </Label>
                      <p className="text-sm">{(viewingOrg as any).website}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {(viewingOrg as any).establishedYear && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Established</span>
                      </Label>
                      <p className="text-sm">{(viewingOrg as any).establishedYear}</p>
                    </div>
                  )}
                  {(viewingOrg as any).employeeCount && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center space-x-1">
                        <UserCheck className="h-3 w-3" />
                        <span>Employees</span>
                      </Label>
                      <p className="text-sm">{(viewingOrg as any).employeeCount}</p>
                    </div>
                  )}
                  {(viewingOrg as any).annualRevenue && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center space-x-1">
                        <DollarSign className="h-3 w-3" />
                        <span>Revenue</span>
                      </Label>
                      <p className="text-sm">${parseFloat((viewingOrg as any).annualRevenue).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {(viewingOrg as any).features && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Enabled Features</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries((viewingOrg as any).features).map(([key, value]) => (
                        value && (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 pt-4 border-t">
                  Created: {new Date(viewingOrg.createdAt).toLocaleDateString()}
                  {viewingOrg.updatedAt && (
                    <span className="ml-4">
                      Updated: {new Date(viewingOrg.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AppShell>
    </ProtectedRoute>
  );
}