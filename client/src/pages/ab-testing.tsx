import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Play, Pause, Trophy, TrendingUp, Target, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Scorecard, AbTest } from "@/types";

export default function ABTesting() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    scorecardAId: "",
    scorecardBId: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scorecards } = useQuery({
    queryKey: ["/api/scorecards"],
  });

  const { data: abTests, isLoading } = useQuery({
    queryKey: ["/api/ab-tests"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ab-tests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ab-tests"] });
      setOpen(false);
      setFormData({ name: "", scorecardAId: "", scorecardBId: "" });
      toast({
        title: "Success",
        description: "A/B test created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create A/B test",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      scorecardAId: parseInt(formData.scorecardAId),
      scorecardBId: parseInt(formData.scorecardBId)
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Running":
        return "bg-green-100 text-green-800";
      case "Completed":
        return "bg-blue-100 text-blue-800";
      case "Paused":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getScorecardName = (id: number) => {
    const scorecard = scorecards?.find((s: Scorecard) => s.id === id);
    return scorecard ? `${scorecard.name} v${scorecard.version}` : `Scorecard ${id}`;
  };

  // Mock performance data for running tests
  const mockPerformance = {
    1: {
      scorecardA: { approvalRate: 72.5, avgScore: 76.2, volume: 1250 },
      scorecardB: { approvalRate: 68.8, avgScore: 74.1, volume: 1180 },
      winner: "A",
      confidence: 95.2
    }
  };

  return (
    <ProtectedRoute requiredRole={["Admin", "Power User", "Approver", "DSA"]}>
      <AppShell title="A/B Testing">
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>A/B Testing Framework</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Compare scorecard performance and optimize your credit scoring models
                  </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New A/B Test
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create A/B Test</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Test Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter test name"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="scorecard-a">Scorecard A (Control)</Label>
                        <Select 
                          value={formData.scorecardAId} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, scorecardAId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select control scorecard" />
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
                        <Label htmlFor="scorecard-b">Scorecard B (Variant)</Label>
                        <Select 
                          value={formData.scorecardBId} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, scorecardBId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select variant scorecard" />
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
                      
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                          Create Test
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
          </Card>

          {/* Active Tests Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Play className="text-green-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Running Tests</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {abTests?.filter((test: AbTest) => test.status === "Running").length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Trophy className="text-blue-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Completed Tests</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {abTests?.filter((test: AbTest) => test.status === "Completed").length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <TrendingUp className="text-yellow-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Avg Improvement</h3>
                    <p className="text-2xl font-bold text-gray-900">+5.2%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tests List */}
          <Card>
            <CardHeader>
              <CardTitle>A/B Tests</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>Loading A/B tests...</div>
              ) : abTests?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No A/B tests found. Create your first test to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Scorecard A</TableHead>
                      <TableHead>Scorecard B</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abTests?.map((test: AbTest) => {
                      const performance = mockPerformance[test.id as keyof typeof mockPerformance];
                      
                      return (
                        <TableRow key={test.id}>
                          <TableCell className="font-medium">{test.name}</TableCell>
                          <TableCell>{getScorecardName(test.scorecardAId)}</TableCell>
                          <TableCell>{getScorecardName(test.scorecardBId)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(test.status)}>
                              {test.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {performance && test.status === "Running" && (
                              <div className="space-y-1">
                                <div className="flex items-center text-xs">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                                  A: {performance.scorecardA.approvalRate}%
                                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1 ml-2"></span>
                                  B: {performance.scorecardB.approvalRate}%
                                </div>
                                <div className="text-xs text-gray-500">
                                  Winner: Scorecard {performance.winner} ({performance.confidence}% confidence)
                                </div>
                              </div>
                            )}
                            {test.status === "Completed" && (
                              <span className="text-sm text-green-600">Test completed</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {test.status === "Running" && (
                                <Button variant="ghost" size="sm">
                                  <Pause className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm">
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Running Test Details */}
          {abTests?.some((test: AbTest) => test.status === "Running") && (
            <Card>
              <CardHeader>
                <CardTitle>Live Test Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {abTests
                  ?.filter((test: AbTest) => test.status === "Running")
                  .map((test: AbTest) => {
                    const performance = mockPerformance[test.id as keyof typeof mockPerformance];
                    if (!performance) return null;

                    return (
                      <div key={test.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{test.name}</h3>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-green-600">Live</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Scorecard A */}
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">Scorecard A (Control)</h4>
                              <Badge variant="outline">Control</Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Approval Rate</span>
                                <span className="font-medium">{performance.scorecardA.approvalRate}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Avg Score</span>
                                <span className="font-medium">{performance.scorecardA.avgScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Volume</span>
                                <span className="font-medium">{performance.scorecardA.volume}</span>
                              </div>
                            </div>
                          </div>

                          {/* Scorecard B */}
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">Scorecard B (Variant)</h4>
                              <Badge variant="outline">Variant</Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Approval Rate</span>
                                <span className="font-medium">{performance.scorecardB.approvalRate}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Avg Score</span>
                                <span className="font-medium">{performance.scorecardB.avgScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Volume</span>
                                <span className="font-medium">{performance.scorecardB.volume}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Winner Analysis */}
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-blue-900">
                                Current Winner: Scorecard {performance.winner}
                              </h4>
                              <p className="text-sm text-blue-700">
                                {performance.confidence}% statistical confidence
                              </p>
                            </div>
                            <Trophy className="h-8 w-8 text-blue-600" />
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Confidence Level</span>
                              <span>{performance.confidence}%</span>
                            </div>
                            <Progress value={performance.confidence} className="h-2" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
