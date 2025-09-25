"use client";

import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useRouter } from "next/navigation";
import {
  CurrencyDollarIcon,
  PlusIcon,
  EyeIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { format, parseISO } from "date-fns";

const BudgetManagementPage = () => {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [budgetData, setBudgetData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/projects");
      const data = await response.json();

      if (data.success) {
        setProjects(data.projects);
        // Fetch budget data for each project
        await fetchBudgetData(data.projects);
      } else {
        setError(data.error || "Failed to fetch projects");
      }
    } catch (err) {
      setError("Error fetching projects: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetData = async (projectList) => {
    const budgetPromises = projectList.map(async (project) => {
      try {
        const response = await fetch(`/api/projects/${project._id}/budget`);
        const data = await response.json();
        return { projectId: project._id, budget: data.budget };
      } catch (err) {
        return { projectId: project._id, budget: null };
      }
    });

    const budgetResults = await Promise.all(budgetPromises);
    const budgetMap = {};
    budgetResults.forEach(({ projectId, budget }) => {
      budgetMap[projectId] = budget;
    });
    setBudgetData(budgetMap);
  };

  const handleCreateBudget = (projectId) => {
    router.push(`/project-budget/${projectId}?action=create`);
  };

  const handleViewBudget = (projectId) => {
    router.push(`/project-budget/${projectId}`);
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount || 0);
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBudget = Object.values(budgetData).reduce(
    (sum, budget) => sum + (budget?.totalAmount || 0),
    0
  );

  const projectsWithBudget = filteredProjects.filter(
    (project) => budgetData[project._id]
  ).length;

  if (loading) {
    return (
      <Layout activeSection="budget-management">
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeSection="budget-management">
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Budget Management
              </h1>
              <p className="text-gray-600">
                Create and manage budgets for all your projects
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Projects with Budget</p>
                <p className="text-2xl font-bold text-gray-900">
                  {projectsWithBudget}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalBudget)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Needs Budget</p>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.length - projectsWithBudget}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Project Budgets
            </h2>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="divide-y divide-gray-200">
            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center">
                <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No projects found</p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const budget = budgetData[project._id];
                const hasBudget = !!budget;

                return (
                  <div key={project._id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {project.name}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              hasBudget
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {hasBudget ? "Budget Created" : "No Budget"}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">
                          {project.description || "No description"}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Category: {project.category || "General"}</span>
                          {project.startDate && (
                            <span>
                              Start:{" "}
                              {format(
                                parseISO(project.startDate),
                                "MMM dd, yyyy"
                              )}
                            </span>
                          )}
                          {hasBudget && (
                            <span className="font-medium text-green-600">
                              Budget:{" "}
                              {formatCurrency(
                                budget.totalAmount,
                                budget.currency
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {hasBudget ? (
                          <>
                            <button
                              onClick={() => handleViewBudget(project._id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                              <EyeIcon className="w-4 h-4" />
                              View Budget
                            </button>
                            <button
                              onClick={() => handleViewBudget(project._id)}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                              <ChartBarIcon className="w-4 h-4" />
                              Manage
                            </button>
                            <button
                              onClick={() => handleCreateBudget(project._id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                              <PlusIcon className="w-4 h-4" />
                              Create Budget
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleCreateBudget(project._id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Create Budget
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BudgetManagementPage;
