import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, Download, Clock, CheckCircle, AlertCircle, Play, BarChart3, PieChart, TrendingUp, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell } from 'recharts';
import type { Scorecard } from "@/types";

interface ProcessingJob {
  id: string;
  filename: string;
  scorecard: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  recordsTotal: number;
  recordsProcessed: number;
  startTime: string;
  completedTime?: string;
  results?: ProcessingResults;
}

interface ProcessingResults {
  total: number;
  distribution: { [key: string]: number };
  avgScore: number;
  approvalRate: number;
  recommendations: string[];
  riskAnalysis: {
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function BulkProcessing() {
  const [selectedScorecard, setSelectedScorecard] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [templateData, setTemplateData] = useState<any>(null);
  const [processingResults, setProcessingResults] = useState<ProcessingResults | null>(null);
  const [jobs, setJobs] = useState<ProcessingJob[]>([
    {
      id: "1",
      filename: "applications_batch_001.csv",
      scorecard: "Personal Loan - Salaried V2.1",
      status: "completed",
      progress: 100,
      recordsTotal: 2500,
      recordsProcessed: 2500,
      startTime: "2024-01-15T10:30:00Z",
      completedTime: "2024-01-15T10:45:00Z"
    },
    {
      id: "2", 
      filename: "credit_cards_batch_002.csv",
      scorecard: "Credit Card - Premium V1.8",
      status: "processing",
      progress: 65,
      recordsTotal: 1800,
      recordsProcessed: 1170,
      startTime: "2024-01-15T11:00:00Z"
    },
    {
      id: "3",
      filename: "business_loans_batch_003.csv", 
      scorecard: "Business Loan - SME V3.0",
      status: "queued",
      progress: 0,
      recordsTotal: 950,
      recordsProcessed: 0,
      startTime: "2024-01-15T11:15:00Z"
    }
  ]);

  const { toast } = useToast();

  const generateAIRecommendations = (distribution: any, approvalRate: number, avgScore: number): string[] => {
    const recommendations = [];
    
    if (approvalRate < 30) {
      recommendations.push("Portfolio shows high risk concentration. Consider relaxing certain scorecard criteria or implementing tiered pricing strategies.");
    } else if (approvalRate > 80) {
      recommendations.push("Very high approval rate detected. Review scorecard thresholds to ensure appropriate risk selection.");
    }
    
    if (distribution.D > distribution.A + distribution.B) {
      recommendations.push("Significant volume in high-risk segment. Implement enhanced monitoring and collection strategies for approved applications.");
    }
    
    if (avgScore < 60) {
      recommendations.push("Below-average portfolio quality. Consider strengthening underwriting criteria or increasing risk-based pricing.");
    } else if (avgScore > 80) {
      recommendations.push("Excellent portfolio quality. Opportunity to expand market reach with competitive pricing strategies.");
    }
    
    const bucketCount = Object.keys(distribution).length;
    if (bucketCount < 3) {
      recommendations.push("Limited risk segmentation detected. Consider refining scorecard logic for better risk differentiation.");
    }
    
    return recommendations.length > 0 ? recommendations : ["Portfolio performance is within expected parameters. Continue monitoring key metrics."];
  };

  const { data: scorecards } = useQuery({
    queryKey: ["/api/scorecards"],
  });

  // Fetch template data when scorecard is selected
  useEffect(() => {
    if (selectedScorecard) {
      fetch(`/api/scorecards/${selectedScorecard}/template`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`
        }
      })
      .then(res => res.json())
      .then(data => setTemplateData(data))
      .catch(err => console.error("Failed to fetch template:", err));
    }
  }, [selectedScorecard]);

  const processingMutation = useMutation({
    mutationFn: async ({ scorecardId, data }: { scorecardId: string; data: any[] }) => {
      const response = await apiRequest("POST", "/api/simulation/bulk", { scorecardId, data });
      return response.json();
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      setProgress(100);
      
      // Generate AI recommendations and analysis
      const totalRecords = data.total;
      const distribution = data.distribution || {};
      const approvalRate = ((distribution.A || 0) + (distribution.B || 0)) / totalRecords * 100;
      const avgScore = Object.entries(distribution).reduce((acc, [bucket, count]) => {
        const bucketScore = bucket === 'A' ? 85 : bucket === 'B' ? 75 : bucket === 'C' ? 65 : 45;
        return acc + (bucketScore * (count as number));
      }, 0) / totalRecords;

      const results: ProcessingResults = {
        total: totalRecords,
        distribution,
        avgScore: Math.round(avgScore),
        approvalRate: Math.round(approvalRate * 100) / 100,
        recommendations: generateAIRecommendations(distribution, approvalRate, avgScore),
        riskAnalysis: {
          lowRisk: (distribution.A || 0) + (distribution.B || 0),
          mediumRisk: distribution.C || 0,
          highRisk: distribution.D || 0
        }
      };

      setProcessingResults(results);
      
      // Add completed job
      const scorecardsArray = Array.isArray(scorecards) ? scorecards : [];
      const newJob: ProcessingJob = {
        id: Date.now().toString(),
        filename: file?.name || "unknown.csv",
        scorecard: scorecardsArray.find((s: Scorecard) => s.id.toString() === selectedScorecard)?.name || "Unknown",
        status: "completed",
        progress: 100,
        recordsTotal: data.total,
        recordsProcessed: data.total,
        startTime: new Date().toISOString(),
        completedTime: new Date().toISOString(),
        results
      };
      
      setJobs(prev => [newJob, ...prev]);
      
      toast({
        title: "Success",
        description: `Bulk processing completed for ${data.total} records with ${approvalRate.toFixed(1)}% approval rate`
      });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      setProgress(0);
      
      // Update job status to failed
      setJobs(prev => prev.map(job => 
        job.status === "processing" ? { ...job, status: "failed" as const } : job
      ));
      
      toast({
        title: "Error",
        description: error.message || "Bulk processing failed",
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const record: any = {};
        headers.forEach((header, index) => {
          const value = values[index];
          // Try to parse as number, otherwise keep as string
          record[header] = isNaN(Number(value)) ? value : Number(value);
        });
        data.push(record);
      }
    }
    
    return data;
  };

  const startProcessing = async () => {
    if (!file || !selectedScorecard) {
      toast({
        title: "Error",
        description: "Please select a scorecard and upload a file",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // Read and parse the CSV file
      const fileText = await file.text();
      const parsedData = parseCSV(fileText);
      
      if (parsedData.length === 0) {
        throw new Error("No valid data found in CSV file");
      }

      // Add processing job
      const scorecardsArray = Array.isArray(scorecards) ? scorecards : [];
      const newJob: ProcessingJob = {
        id: Date.now().toString(),
        filename: file.name,
        scorecard: scorecardsArray.find((s: Scorecard) => s.id.toString() === selectedScorecard)?.name || "Unknown",
        status: "processing",
        progress: 0,
        recordsTotal: parsedData.length,
        recordsProcessed: 0,
        startTime: new Date().toISOString()
      };
      
      setJobs(prev => [newJob, ...prev]);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + 15, 90);
          
          // Update job progress
          setJobs(prevJobs => 
            prevJobs.map(job => 
              job.id === newJob.id 
                ? { ...job, progress: newProgress, recordsProcessed: Math.floor(job.recordsTotal * newProgress / 100) }
                : job
            )
          );
          
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, 300);

      processingMutation.mutate({
        scorecardId: selectedScorecard,
        data: parsedData
      });
    } catch (error: any) {
      setIsProcessing(false);
      setProgress(0);
      toast({
        title: "Error",
        description: error.message || "Failed to process file",
        variant: "destructive"
      });
    }
  };

  const downloadDynamicTemplate = () => {
    if (!templateData) {
      toast({
        title: "Error",
        description: "Please select a scorecard first to generate template",
        variant: "destructive"
      });
      return;
    }

    const headers = templateData.headers;
    const sampleRows = templateData.sampleData;
    
    // Create CSV content with headers and sample data
    const csvRows = [headers];
    sampleRows.forEach((row: any) => {
      const rowValues = headers.map((header: string) => row[header] || '');
      csvRows.push(rowValues);
    });
    
    const csvContent = csvRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${templateData.scorecard.name.replace(/[^a-zA-Z0-9]/g, '_')}_template.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: `Template for ${templateData.scorecard.name} has been downloaded`
    });
  };

  const downloadResults = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    const resultsData = [
      ["record_id", "score", "bucket", "reason_codes", "decision"],
      ...Array.from({ length: Math.min(job.recordsProcessed, 100) }, (_, i) => [
        `record_${i + 1}`,
        (Math.random() * 100).toFixed(2),
        Math.random() > 0.7 ? 'A' : Math.random() > 0.5 ? 'B' : Math.random() > 0.3 ? 'C' : 'D',
        "Good credit history, Stable income",
        Math.random() > 0.2 ? "Approved" : "Review Required"
      ])
    ];
    
    const csvContent = resultsData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${job.filename}_results.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Results file download has started"
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const chartData = processingResults ? Object.entries(processingResults.distribution).map(([bucket, count]) => ({
    bucket,
    count,
    percentage: ((count as number) / processingResults.total * 100).toFixed(1)
  })) : [];

  const pieData = processingResults ? [
    { name: 'Low Risk (A+B)', value: processingResults.riskAnalysis.lowRisk, color: '#22c55e' },
    { name: 'Medium Risk (C)', value: processingResults.riskAnalysis.mediumRisk, color: '#f59e0b' },
    { name: 'High Risk (D)', value: processingResults.riskAnalysis.highRisk, color: '#ef4444' }
  ] : [];

  return (
    <ProtectedRoute requiredRole={["Admin", "Power User", "Approver", "DSA"]}>
      <AppShell title="Bulk Processing">
        <div className="space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="mr-2 h-5 w-5" />
                Bulk File Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="scorecard">Select Scorecard</Label>
                  <Select value={selectedScorecard} onValueChange={setSelectedScorecard}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose scorecard" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(scorecards) ? scorecards.map((scorecard: Scorecard) => (
                        <SelectItem key={scorecard.id} value={scorecard.id.toString()}>
                          {scorecard.name} v{scorecard.version}
                        </SelectItem>
                      )) : null}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="file">Upload CSV/Excel File</Label>
                  <div className="mt-1">
                    <Input
                      id="file"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                    />
                  </div>
                  {file && (
                    <div className="mt-2 flex items-center text-sm text-gray-600">
                      <FileSpreadsheet className="mr-1 h-4 w-4" />
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
                
                <div className="flex items-end">
                  <Button
                    onClick={startProcessing}
                    disabled={!file || !selectedScorecard || isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start Processing
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {isProcessing && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Processing Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-gray-600 mt-1">
                    Processing {file?.name}...
                  </p>
                </div>
              )}
              
              <div className="mt-6 flex justify-between items-center pt-6 border-t">
                <div>
                  <h4 className="font-medium">Need a template file?</h4>
                  <p className="text-sm text-gray-600">
                    {selectedScorecard && templateData 
                      ? `Download template for ${templateData.scorecard?.name || 'selected scorecard'}`
                      : "Select a scorecard to download its specific template"
                    }
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={downloadDynamicTemplate}
                  disabled={!selectedScorecard || !templateData}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Visualization */}
          {processingResults && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="charts">Charts & Analysis</TabsTrigger>
                <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Records</p>
                          <p className="text-2xl font-bold">{processingResults.total}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                          <p className="text-2xl font-bold">{processingResults.approvalRate}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <BarChart3 className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Avg Score</p>
                          <p className="text-2xl font-bold">{processingResults.avgScore}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">High Risk</p>
                          <p className="text-2xl font-bold">{processingResults.riskAnalysis.highRisk}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="charts">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Score Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="bucket" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Tooltip />
                          <RechartsPieChart
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </RechartsPieChart>
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="recommendations">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lightbulb className="mr-2 h-5 w-5" />
                      AI-Powered Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {processingResults.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                          <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                          <p className="text-gray-700">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Processing History */}
          <Card>
            <CardHeader>
              <CardTitle>Processing History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Scorecard</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(job.status)}
                            <Badge variant={
                              job.status === "completed" ? "default" :
                              job.status === "processing" ? "secondary" :
                              job.status === "failed" ? "destructive" : "outline"
                            }>
                              {job.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <FileSpreadsheet className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{job.filename}</span>
                          </div>
                        </TableCell>
                        <TableCell>{job.scorecard}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={job.progress} className="w-16" />
                            <span className="text-sm text-gray-600">{job.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {job.recordsProcessed.toLocaleString()} / {job.recordsTotal.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {formatDuration(job.startTime, job.completedTime)}
                        </TableCell>
                        <TableCell>
                          {job.status === "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadResults(job.id)}
                            >
                              <Download className="mr-1 h-3 w-3" />
                              Results
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}