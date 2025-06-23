import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Copy, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Scorecard } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ScorecardCardProps {
  scorecard: Scorecard;
  onEdit?: (scorecard: Scorecard) => void;
  onClone?: (scorecard: Scorecard) => void;
}

export function ScorecardCard({ scorecard, onEdit, onClone }: ScorecardCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "status-active";
      case "Testing":
        return "status-testing";
      case "Draft":
      case "Draft by AI":
        return "status-draft";
      case "Archived":
        return "status-archived";
      default:
        return "status-draft";
    }
  };

  return (
    <Card className="scorecard-item">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{scorecard.name}</h3>
            <p className="text-sm text-gray-500">
              Modified {formatDistanceToNow(new Date(scorecard.updatedAt), { addSuffix: true })}
            </p>
            <div className="flex items-center mt-2 space-x-2">
              <Badge className={`status-badge ${getStatusColor(scorecard.status)}`}>
                {scorecard.status}
              </Badge>
              <span className="text-xs text-gray-500">v{scorecard.version}</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(scorecard)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onClone?.(scorecard)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Download</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">Archive</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
