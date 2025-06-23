import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BucketDistribution } from "@/components/charts/bucket-distribution";
import { ScorecardCard } from "@/components/scorecard/scorecard-card";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  CheckCircle, 
  Percent, 
  FlaskRound, 
  Building, 
  ChartPie, 
  Database, 
  Plus,
  Edit,
  FileText,
  Upload
} from "lucide-react";
import type { DashboardMetrics, Scorecard } from "@/types";

// Mock bucket distribution data
const bucketData = [
  { bucket: "A", count: 28, percentage: 28 },
  { bucket: "B", count: 35, percentage: 35 },
  { bucket: "C", count: 25, percentage: 25 },
  { bucket: "D", count: 12, percentage: 12 },
];

export default function Dashboard() {
  const { user } = useAuth();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: scorecards, isLoading: scorecardsLoading } = useQuery({
    queryKey: ["/api/scorecards"],
  });

  const recentScorecards = scorecards?.slice(0, 3) || [];

  const MetricCard = ({ 
    icon: Icon, 
    title, 
    value, 
    bgColor, 
    textColor 
  }: {
    icon: any;
    title: string;
    value: string | number;
    bgColor: string;
    textColor: string;
  }) => (
    <Card className="metric-card">
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`metric-icon ${bgColor}`}>
            <Icon className={`${textColor} text-xl h-6 w-6`} />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppShell title="Dashboard">
      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metricsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="metric-card">
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <MetricCard
              icon={TrendingUp}
              title="Active Scorecards"
              value={metrics?.activeScoreCards || 0}
              bgColor="bg-blue-100"
              textColor="text-blue-600"
            />
            <MetricCard
              icon={CheckCircle}
              title="Applications Scored"
              value={metrics?.applicationsScored?.toLocaleString() || "0"}
              bgColor="bg-green-100"
              textColor="text-green-600"
            />
            <MetricCard
              icon={Percent}
              title="Approval Rate"
              value={`${metrics?.approvalRate || 0}%`}
              bgColor="bg-yellow-100"
              textColor="text-yellow-600"
            />
            <MetricCard
              icon={FlaskRound}
              title="A/B Tests Running"
              value={metrics?.abTests || 0}
              bgColor="bg-purple-100"
              textColor="text-purple-600"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Scorecards */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Scorecards</CardTitle>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {scorecardsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentScorecards.map((scorecard: Scorecard) => (
                  <ScorecardCard key={scorecard.id} scorecard={scorecard} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <p className="text-sm text-gray-500">Last 30 days bucket classification</p>
          </CardHeader>
          <CardContent>
            <BucketDistribution data={bucketData} />
          </CardContent>
        </Card>
      </div>

      {/* AI Scorecard Generator */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Scorecard Generator</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Create intelligent credit scoring models in minutes
              </p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Scorecard
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Building className="text-white text-xl h-6 w-6" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Institution Details</h3>
              <p className="text-sm text-gray-600">
                Define your organization type, products, and target segments
              </p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ChartPie className="text-white text-xl h-6 w-6" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Risk Preferences</h3>
              <p className="text-sm text-gray-600">
                Set your risk appetite and desired approval ratios
              </p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Database className="text-white text-xl h-6 w-6" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Data Sources</h3>
              <p className="text-sm text-gray-600">
                Select income verification and intent signal sources
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="outline" size="sm">
              View Full Audit Trail
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Edit className="text-blue-600 text-sm h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{user?.name}</span> updated scorecard{" "}
                  <span className="font-medium text-blue-600">Personal Loan - Salaried V2.1</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600 text-sm h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">
                  A/B test <span className="font-medium text-blue-600">CC Premium V1.8 vs V1.9</span> completed
                </p>
                <p className="text-xs text-gray-500 mt-1">4 hours ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Upload className="text-yellow-600 text-sm h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">
                  Bulk simulation completed with{" "}
                  <span className="font-medium text-blue-600">2,500 applications</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">6 hours ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <FileText className="text-purple-600 text-sm h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">
                  AI generated new scorecard draft for{" "}
                  <span className="font-medium text-blue-600">Home Loan - Professional</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
