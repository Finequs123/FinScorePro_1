import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  History, 
  User, 
  Building, 
  FileText, 
  Settings, 
  Search, 
  Filter,
  Download,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import type { AuditTrail } from "@/types";

const actionTypes = [
  "All Actions",
  "Created", 
  "Updated",
  "Deleted",
  "Approved", 
  "Activated",
  "Archived",
  "AI Generated"
];

const entityTypes = [
  "All Entities",
  "scorecard",
  "user", 
  "organization",
  "ab_test",
  "simulation"
];

export default function AuditTrail() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("All Actions");
  const [selectedEntity, setSelectedEntity] = useState("All Entities");
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<AuditTrail | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const { user } = useAuth();
  const recordsPerPage = 50;

  const { data: auditTrail, isLoading } = useQuery({
    queryKey: ["/api/audit-trail"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  // Filter audit trail based on search and filters
  const filteredAuditTrail = auditTrail?.filter((record: AuditTrail) => {
    const matchesSearch = !searchTerm || 
      record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.entityType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = selectedAction === "All Actions" || record.action === selectedAction;
    const matchesEntity = selectedEntity === "All Entities" || record.entityType === selectedEntity;
    const matchesUser = selectedUserId === "all" || record.userId.toString() === selectedUserId;
    
    return matchesSearch && matchesAction && matchesEntity && matchesUser;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredAuditTrail.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const paginatedRecords = filteredAuditTrail.slice(startIndex, startIndex + recordsPerPage);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "Created":
        return <FileText className="h-4 w-4 text-green-600" />;
      case "Updated":
        return <Settings className="h-4 w-4 text-blue-600" />;
      case "Deleted":
        return <FileText className="h-4 w-4 text-red-600" />;
      case "Approved":
        return <FileText className="h-4 w-4 text-green-600" />;
      case "Activated":
        return <FileText className="h-4 w-4 text-purple-600" />;
      case "AI Generated":
        return <FileText className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "user":
        return <User className="h-4 w-4" />;
      case "organization":
        return <Building className="h-4 w-4" />;
      case "scorecard":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "Created":
        return "bg-green-100 text-green-800";
      case "Updated":
        return "bg-blue-100 text-blue-800";
      case "Deleted":
        return "bg-red-100 text-red-800";
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Activated":
        return "bg-purple-100 text-purple-800";
      case "AI Generated":
        return "bg-orange-100 text-orange-800";
      case "Archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getUserName = (userId: number) => {
    const foundUser = users?.find((u: any) => u.id === userId);
    return foundUser ? foundUser.name : `User ${userId}`;
  };

  const exportAuditTrail = () => {
    const csvContent = [
      ["Timestamp", "User", "Action", "Entity Type", "Entity ID", "Description"].join(","),
      ...filteredAuditTrail.map((record: AuditTrail) => [
        new Date(record.createdAt).toISOString(),
        getUserName(record.userId),
        record.action,
        record.entityType,
        record.entityId,
        `"${record.description || ""}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_trail_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const viewDetails = (record: AuditTrail) => {
    setSelectedRecord(record);
    setShowDetails(true);
  };

  return (
    <ProtectedRoute requiredRole={["Admin", "Power User", "Approver"]}>
      <AppShell title="Audit Trail">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <History className="text-blue-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Total Events</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {auditTrail?.length?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <User className="text-green-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {new Set(auditTrail?.map((r: AuditTrail) => r.userId)).size || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Calendar className="text-yellow-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Today's Events</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {auditTrail?.filter((r: AuditTrail) => 
                        new Date(r.createdAt).toDateString() === new Date().toDateString()
                      ).length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Export Data</h3>
                    <Button 
                      onClick={exportAuditTrail}
                      size="sm" 
                      className="mt-2"
                      disabled={filteredAuditTrail.length === 0}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="search"
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="action">Action</Label>
                  <Select value={selectedAction} onValueChange={setSelectedAction}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map(action => (
                        <SelectItem key={action} value={action}>{action}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="entity">Entity Type</Label>
                  <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {entityTypes.map(entity => (
                        <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="user">User</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {users?.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedAction("All Actions");
                      setSelectedEntity("All Entities");
                      setSelectedUserId("all");
                      setCurrentPage(1);
                    }}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Trail Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Audit Events</CardTitle>
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1}-{Math.min(startIndex + recordsPerPage, filteredAuditTrail.length)} of {filteredAuditTrail.length} events
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading audit trail...</div>
              ) : filteredAuditTrail.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No audit events found matching your criteria
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRecords.map((record: AuditTrail) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm">
                            <div>
                              {new Date(record.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(record.createdAt).toLocaleTimeString()}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                {getUserName(record.userId).charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium">
                                {getUserName(record.userId)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getActionIcon(record.action)}
                              <Badge className={getActionColor(record.action)}>
                                {record.action}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getEntityIcon(record.entityType)}
                              <div>
                                <div className="text-sm font-medium capitalize">
                                  {record.entityType}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {record.entityId}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm truncate" title={record.description || ""}>
                                {record.description || "No description"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewDetails(record)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Details Modal */}
          {showDetails && selectedRecord && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Audit Event Details</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetails(false)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Timestamp</Label>
                      <p className="text-sm">{new Date(selectedRecord.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">User</Label>
                      <p className="text-sm">{getUserName(selectedRecord.userId)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Action</Label>
                      <Badge className={getActionColor(selectedRecord.action)}>
                        {selectedRecord.action}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Entity</Label>
                      <p className="text-sm capitalize">{selectedRecord.entityType} (ID: {selectedRecord.entityId})</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Description</Label>
                    <p className="text-sm mt-1">{selectedRecord.description || "No description provided"}</p>
                  </div>

                  {selectedRecord.oldValues && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Previous Values</Label>
                      <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto mt-1">
                        {JSON.stringify(selectedRecord.oldValues, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedRecord.newValues && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">New Values</Label>
                      <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto mt-1">
                        {JSON.stringify(selectedRecord.newValues, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
