"use client";

import { useState, useEffect, use } from "react";
import Layout from "../../components/Layout";
import ProjectFinancialManagement from "../../components/ProjectFinancialManagement";
import Link from "next/link";
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

const ProjectBudgetPage = ({ params }) => {
  const { id: projectId } = use(params);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();

      if (data.success) {
        setProject(data.project);
      } else {
        setError(data.error || "Failed to fetch project details");
      }
    } catch (err) {
      setError("Error fetching project data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout activeSection="budget-management">
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
            <p className="text-sm text-slate-500 font-medium animate-pulse">
              Loading project budget & financial management…
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !project) {
    return (
      <Layout activeSection="budget-management">
        <div className="flex justify-center items-center min-h-[70vh] px-4">
          <div className="text-center max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="text-lg text-red-700 font-semibold">
              {error || "Project not found"}
            </p>
            <Link
              href="/projects"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Projects
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeSection="budget-management">
      <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50/20 min-h-screen min-w-0 space-y-5">
        {/* Top Breadcrumbs & Nav Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <nav className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 flex-wrap">
            <Link
              href="/projects"
              className="text-slate-600 hover:text-blue-600 transition-colors font-medium"
            >
              Projects
            </Link>
            <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400" />
            <Link
              href={`/projects/${projectId}`}
              className="text-slate-600 hover:text-blue-600 truncate max-w-[12rem] sm:max-w-xs transition-colors font-medium"
            >
              {project.name}
            </Link>
            <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-900">Financial Hub & Budget</span>
          </nav>

          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Project</span>
          </Link>
        </div>

        {/* Financial Management Main Hub */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 min-w-0">
          <ProjectFinancialManagement
            projectId={projectId}
            projectName={project.name}
          />
        </div>
      </div>
    </Layout>
  );
};

export default ProjectBudgetPage;
