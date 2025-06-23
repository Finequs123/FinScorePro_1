import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Key, Zap, Clock, AlertTriangle, CheckCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { ApiLog } from "@/types";

export default function APIManagement() {
  const [showApiModal, setShowApiModal] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("");
  
  const { toast } = useToast();
  const { organization } = useAuth();

  const { data: apiLogs } = useQuery({
    queryKey: ["/api/logs"],
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard"
    });
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "text-green-600";
    if (statusCode >= 400 && statusCode < 500) return "text-yellow-600";
    if (statusCode >= 500) return "text-red-600";
    return "text-gray-600";
  };

  const endpoints = [
    {
      path: "/api/score",
      method: "POST",
      description: "Single record scoring",
      rateLimit: "1000/hour",
      avgResponse: "120ms"
    },
    {
      path: "/api/score/bulk",
      method: "POST", 
      description: "Bulk scoring (CSV upload)",
      rateLimit: "100/hour",
      avgResponse: "2.5s"
    }
  ];

  const sampleRequest = `{
  "customer_id": "12345",
  "scorecard_id": 1,
  "application_data": {
    "age": 32,
    "income": 75000,
    "employment_type": "salaried",
    "credit_history_months": 48,
    "existing_loans": 1
  }
}`;

  const sampleResponse = `{
  "score": 742,
  "bucket": "A",
  "probability": 0.89,
  "reason_codes": ["Strong income", "Good credit history"],
  "timestamp": "2024-01-15T10:30:00Z",
  "customer_id": "12345"
}`;

  const apiKey = `fiq_${organization?.code || 'demo'}_${Math.random().toString(36).substring(2, 15)}`;
  const baseUrl = "https://api.finscoreiq.com/v1";

  return (
    <ProtectedRoute requiredRole={["Admin", "Power User"]}>
      <AppShell title="API Management">
        <div className="space-y-6">
          {/* API Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Zap className="text-blue-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Total Requests</h3>
                    <p className="text-2xl font-bold text-gray-900">45,231</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="text-green-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
                    <p className="text-2xl font-bold text-gray-900">99.8%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="text-yellow-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Avg Response</h3>
                    <p className="text-2xl font-bold text-gray-900">145ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertTriangle className="text-red-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Rate Limited</h3>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Configuration */}
          <Tabs defaultValue="credentials" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="credentials">API Credentials</TabsTrigger>
              <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
              <TabsTrigger value="documentation">Documentation</TabsTrigger>
              <TabsTrigger value="logs">Request Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="credentials" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Key className="mr-2 h-5 w-5" />
                    API Credentials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="base-url">Base URL</Label>
                    <div className="flex mt-1">
                      <Input
                        id="base-url"
                        value={baseUrl}
                        readOnly
                        className="flex-1"
                      />
                      <Button 
                        variant="outline"
                        className="ml-2"
                        onClick={() => copyToClipboard(baseUrl)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="api-key">API Key</Label>
                    <div className="flex mt-1">
                      <Input
                        id="api-key"
                        value={apiKey}
                        readOnly
                        className="flex-1 font-mono"
                        type="password"
                      />
                      <Button 
                        variant="outline"
                        className="ml-2"
                        onClick={() => copyToClipboard(apiKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Include this key in the Authorization header: Bearer {apiKey.substring(0, 20)}...
                    </p>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-900">Security Notice</h4>
                    <p className="text-sm text-yellow-800 mt-1">
                      Keep your API key secure and never expose it in client-side code. 
                      Regenerate immediately if compromised.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="endpoints" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Available Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {endpoints.map((endpoint, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{endpoint.method}</Badge>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {endpoint.path}
                            </code>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedEndpoint(endpoint.path);
                              setShowApiModal(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{endpoint.description}</p>
                        <div className="flex space-x-4 text-sm text-gray-500">
                          <span>Rate Limit: {endpoint.rateLimit}</span>
                          <span>Avg Response: {endpoint.avgResponse}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documentation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>API Documentation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Authentication</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <code className="text-sm">
                        curl -X POST {baseUrl}/score \<br/>
                        &nbsp;&nbsp;-H "Authorization: Bearer {apiKey}" \<br/>
                        &nbsp;&nbsp;-H "Content-Type: application/json" \<br/>
                        &nbsp;&nbsp;-d '...'
                      </code>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Sample Request</h3>
                    <pre className="bg-gray-800 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                      {sampleRequest}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Sample Response</h3>
                    <pre className="bg-gray-800 text-blue-400 p-4 rounded-lg text-sm overflow-x-auto">
                      {sampleResponse}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Error Responses</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>400 Bad Request</span>
                        <span className="text-gray-600">Invalid request data</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>401 Unauthorized</span>
                        <span className="text-gray-600">Invalid or missing API key</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>429 Too Many Requests</span>
                        <span className="text-gray-600">Rate limit exceeded</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>500 Internal Server Error</span>
                        <span className="text-gray-600">Server error</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Request Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  {apiLogs && apiLogs.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Response Time</TableHead>
                          <TableHead>IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {apiLogs.slice(0, 50).map((log: ApiLog) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm">
                              {new Date(log.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>{log.endpoint}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.method}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className={getStatusColor(log.statusCode)}>
                                {log.statusCode}
                              </span>
                            </TableCell>
                            <TableCell>{log.responseTime}ms</TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.ipAddress}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No API requests found. Start using the API to see logs here.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* API Details Modal */}
          <Dialog open={showApiModal} onOpenChange={setShowApiModal}>
            <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
              <DialogHeader>
                <DialogTitle>API Endpoint Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Endpoint URL</Label>
                  <div className="flex mt-1">
                    <Input 
                      value={`${baseUrl}${selectedEndpoint}`}
                      readOnly 
                      className="flex-1 font-mono text-sm"
                    />
                    <Button 
                      variant="outline"
                      className="ml-2"
                      onClick={() => copyToClipboard(`${baseUrl}${selectedEndpoint}`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label>Sample cURL Request</Label>
                  <pre className="bg-gray-800 text-green-400 p-4 rounded-md text-sm overflow-x-auto mt-2">
{`curl -X POST ${baseUrl}${selectedEndpoint} \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${sampleRequest.replace(/\n/g, '\\n').replace(/"/g, '\\"')}'`}
                  </pre>
                </div>

                <div>
                  <Label>Expected Response</Label>
                  <pre className="bg-gray-800 text-blue-400 p-4 rounded-md text-sm overflow-x-auto mt-2">
                    {sampleResponse}
                  </pre>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
