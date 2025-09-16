"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProjectDashboard from "../components/ProjectDashboard";
import ProjectManagement from "../components/ProjectManagement";
import MilestoneTracker from "../components/MilestoneTracker";
import ProjectAlerts from "../components/ProjectAlerts";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  BarChart3,
  FolderOpen,
  Target,
  Bell,
  Settings,
  Users,
} from "lucide-react";

export default function ProjectTrackingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get user information from localStorage or context
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      setUserId(userData.id);
      setUserRole(userData.role);
    } else {
      // Redirect to login if no user found
      router.push("/login");
    }
    setIsLoading(false);
  }, []);

  const tabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      component: <ProjectDashboard userId={userId} />,
    },
    {
      id: "projects",
      label: "Projects",
      icon: FolderOpen,
      component: <ProjectManagement />,
    },
    {
      id: "milestones",
      label: "Milestones",
      icon: Target,
      component: <MilestoneTracker userId={userId} />,
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: Bell,
      component: <ProjectAlerts userId={userId} />,
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Project Tracking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Project Tracking</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive project management and tracking system
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-6">
              {tab.component}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
