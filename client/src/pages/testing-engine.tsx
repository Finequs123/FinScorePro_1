import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BucketDistribution } from "@/components/charts/bucket-distribution";
import { Upload, FileSpreadsheet, Play, Download, BarChart3, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Scorecard } from "@/types";

export default function TestingEngine() {
  const [selectedScorecard, setSelectedScorecard] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);

  const { toast } = useToast();

  const { data: scorecards } = useQuery({
    queryKey: ["/api/scorecards"],
  });

  const simulationMutation = useMutation({
    mutationFn: async ({ scorecardId, data }: { scorecardId: string; data: any[] }) => {
      const response = await apiRequest("POST", "/api/simulation/bulk", { scorecardId, data });
      return response.json();
    },
    onSuccess: (data) => {
      setSimulationResults(data);
      setIsSimulating(false);
      setProgress(100);
      toast({
        title: "Success",
        description: `Simulation completed for ${data.total} records`
      });
    },
    onError: (error: any) => {
      setIsSimulating(false);
      setProgress(0);
      toast({
        title: "Error",
        description: error.message || "Simulation failed",
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setSimulationResults(null);
    }
  };

  const runSimulation = async () => {
    if (!file || !selectedScorecard) {
      toast({
        title: "Error",
        description: "Please select a scorecard and upload a file",
        variant: "destructive"
      });
      return;
    }

    setIsSimulating(true);
    setProgress(0);

    // Mock file parsing - in real implementation, would parse CSV/Excel
    const mockData = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      age: 25 + Math.floor(Math.random() * 40),
      income: 30000 + Math.floor(Math.random() * 100000),
      credit_score: 600 + Math.floor(Math.random() * 250),
      employment_type: Math.random() > 0.5 ? "salaried" : "self_employed"
    }));

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    simulationMutation.mutate({
      scorecardId: selectedScorecard,
      data: mockData
    });
  };

  const downloadResults = () => {
    if (!simulationResults) return;
    
    // Mock download - in real implementation, would generate actual file
    const dataStr = JSON.stringify(simulationResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'simulation_results.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Mock bucket distribution from results
  const bucketData = simulationResults ? [
    { bucket: "A", count: simulationResults.distribution?.A || 0, percentage: Math.round((simulationResults.distribution?.A || 0) / simulationResults.total * 100) },
    { bucket: "B", count: simulationResults.distribution?.B || 0, percentage: Math.round((simulationResults.distribution?.B || 0) / simulationResults.total * 100) },
    { bucket: "C", count: simulationResults.distribution?.C || 0, percentage: Math.round((simulationResults.distribution?.C || 0) / simulationResults.total * 100) },
    { bucket: "D", count: simulationResults.distribution?.D || 0, percentage: Math.round((simulationResults.distribution?.D || 0) / simulationResults.total * 100) },
  ] : [];

  return (
    <ProtectedRoute requiredRole={["Admin", "Power User", "Approver", "DSA"]}>
      <AppShell title="Testing Engine">
        <div className="space-y-6">
          {/* Setup Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Play className="mr-2 h-5 w-5" />
                Bulk Simulation Setup
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
                      {scorecards?.map((scorecard: Scorecard) => (
                        <SelectItem key={scorecard.id} value={scorecard.id.toString()}>
                          {scorecard.name} v{scorecard.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="file">Upload Data File</Label>
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
                      {file.name}
                    </div>
                  )}
                </div>
                
                <div className="flex items-end">
                  <Button
                    onClick={runSimulation}
                    disabled={!file || !selectedScorecard || isSimulating}
                    className="w-full"
                  >
                    {isSimulating ? (
                      <>Running Simulation...</>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Run Simulation
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {isSimulating && (
                <div className="mt-4">
                  <Label>Simulation Progress</Label>
                  <Progress value={progress} className="mt-2" />
                  <p className="text-sm text-gray-600 mt-1">{progress}% complete</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {simulationResults && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="distribution">Distribution</TabsTrigger>
                <TabsTrigger value="sample">Sample Results</TabsTrigger>
                <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <FileSpreadsheet className="text-blue-600 h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-sm font-medium text-gray-500">Total Records</h3>
                          <p className="text-2xl font-bold text-gray-900">{simulationResults.total}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-3 bg-green-100 rounded-lg">
                          <TrendingUp className="text-green-600 h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-sm font-medium text-gray-500">Approval Rate</h3>
                          <p className="text-2xl font-bold text-gray-900">
                            {Math.round(((simulationResults.distribution?.A || 0) + (simulationResults.distribution?.B || 0)) / simulationResults.total * 100)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-3 bg-yellow-100 rounded-lg">
                          <BarChart3 className="text-yellow-600 h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-sm font-medium text-gray-500">Avg Score</h3>
                          <p className="text-2xl font-bold text-gray-900">74.2</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Actions</h3>
                          <Button onClick={downloadResults} size="sm" className="mt-2">
                            <Download className="mr-2 h-4 w-4" />
                            Download Results
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="distribution" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BucketDistribution data={bucketData} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sample" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Sample Results (First 10 Records)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Record ID</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Bucket</TableHead>
                          <TableHead>Reason Codes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {simulationResults.results?.map((result: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{result.recordId}</TableCell>
                            <TableCell>{result.score}</TableCell>
                            <TableCell>
                              <Badge className={`${
                                result.bucket === 'A' ? 'bg-green-100 text-green-800' :
                                result.bucket === 'B' ? 'bg-blue-100 text-blue-800' :
                                result.bucket === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {result.bucket}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {result.reasonCodes?.join(", ")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900">Optimization Suggestions</h4>
                        <ul className="mt-2 text-sm text-blue-800 space-y-1">
                          <li>• Consider increasing weight for Income category (currently 30%)</li>
                          <li>• Bucket C shows high concentration - review threshold at 60 points</li>
                          <li>• Add rule for employment type weighting</li>
                        </ul>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900">Performance Insights</h4>
                        <ul className="mt-2 text-sm text-green-800 space-y-1">
                          <li>• Approval rate is within target range (65-75%)</li>
                          <li>• Score distribution appears balanced</li>
                          <li>• Model shows good discriminatory power</li>
                        </ul>
                      </div>
                      
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <h4 className="font-medium text-yellow-900">Areas to Monitor</h4>
                        <ul className="mt-2 text-sm text-yellow-800 space-y-1">
                          <li>• Review Bucket D rejections for potential bias</li>
                          <li>• Monitor age distribution impact</li>
                          <li>• Consider additional data sources for improvement</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
