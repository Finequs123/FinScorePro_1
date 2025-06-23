import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Building, 
  Users, 
  Bot, 
  Settings, 
  FlaskRound, 
  TrendingUp, 
  Plug, 
  Upload, 
  History, 
  FileText 
} from "lucide-react";

const menuItems = [
  {
    section: "Main",
    items: [
      { path: "/", icon: LayoutDashboard, label: "Dashboard", roles: ["Admin", "Power User", "Approver", "DSA"] },
      { path: "/organizations", icon: Building, label: "Organizations", roles: ["Admin"] },
      { path: "/users", icon: Users, label: "User Management", roles: ["Admin", "Power User"] },
    ]
  },
  {
    section: "Scorecards",
    items: [
      { path: "/ai-scorecard-generator", icon: Bot, label: "AI Scorecard Generator", roles: ["Admin", "Power User"] },
      { path: "/scorecard-config", icon: Settings, label: "Configuration", roles: ["Admin", "Power User", "Approver"] },
      { path: "/testing-engine", icon: FlaskRound, label: "Testing Engine", roles: ["Admin", "Power User", "Approver", "DSA"] },
      { path: "/ab-testing", icon: TrendingUp, label: "A/B Testing", roles: ["Admin", "Power User", "Approver", "DSA"] },
    ]
  },
  {
    section: "Integration",
    items: [
      { path: "/api-management", icon: Plug, label: "API Management", roles: ["Admin", "Power User"] },
      { path: "/bulk-processing", icon: Upload, label: "Bulk Processing", roles: ["Admin", "Power User", "Approver", "DSA"] },
      { path: "/audit-trail", icon: History, label: "Audit Trail", roles: ["Admin", "Power User", "Approver"] },
      { path: "/documentation", icon: FileText, label: "Documentation", roles: ["Admin", "Power User", "Approver"] },
    ]
  }
];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const hasRole = (requiredRoles: string[]) => {
    return user && requiredRoles.includes(user.role);
  };

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="flex items-center justify-center h-16 border-b border-gray-200 bg-blue-700">
        <span className="text-white text-xl font-bold">FinScoreIQPro</span>
      </div>
      
      <nav className="mt-6 scrollbar-thin overflow-y-auto h-[calc(100vh-4rem)]">
        {menuItems.map((section) => (
          <div key={section.section}>
            <div className="px-4 py-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.section}
              </span>
            </div>
            <ul className="mt-2 space-y-1">
              {section.items
                .filter(item => hasRole(item.roles))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  
                  return (
                    <li key={item.path}>
                      <Link href={item.path}>
                        <a className={cn(
                          "nav-item",
                          isActive ? "nav-item-active" : "nav-item-inactive"
                        )}>
                          <Icon className="mr-3 h-4 w-4" />
                          {item.label}
                        </a>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
