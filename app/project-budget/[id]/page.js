"use client";

import { useState, useEffect, use } from "react";
import Layout from "../../components/Layout";
import ProjectFinancialManagement from "../../components/ProjectFinancialManagement";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import Link from "next/link";

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
            <p className="text-sm text-slate-500 animate-pulse">
              Loading project budget…
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout activeSection="budget-management">
        <div className="flex justify-center items-center min-h-[70vh] px-4">
          <div className="text-center max-w-md rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-lg text-red-700 font-medium">{error}</p>
            <Link
              href="/projects"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowBackIcon className="text-base" />
              Back to Projects
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout activeSection="budget-management">
        <div className="flex justify-center items-center min-h-[70vh] px-4">
          <div className="text-center max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-lg text-slate-700 font-medium">
              Project not found
            </p>
            <Link
              href="/projects"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowBackIcon className="text-base" />
              Back to Projects
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeSection="budget-management">
      <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen min-w-0">
        <nav className="mb-4">
          <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-slate-500">
            <li>
              <Link
                href="/projects"
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                Projects
              </Link>
            </li>
            <li className="text-slate-300 px-1">/</li>
            <li className="min-w-0">
              <Link
                href={`/projects/${projectId}`}
                className="text-blue-600 hover:text-blue-800 truncate inline-block max-w-[12rem] sm:max-w-xs align-bottom transition-colors"
              >
                {project.name}
              </Link>
            </li>
            <li className="text-slate-300 px-1">/</li>
            <li className="text-slate-800 font-medium">Budget</li>
          </ol>
        </nav>

        <div className="mb-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Project Budget
            </h1>
            <p
              className="text-sm text-slate-600 mt-1 truncate"
              title={project.name}
            >
              Manage budget, expenses, and income for {project.name}
            </p>
          </div>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 self-start px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
          >
            <ArrowBackIcon className="text-base" />
            Back to Project
          </Link>
        </div>

        <div className="bg-white/90 rounded-xl border border-slate-200 shadow-sm p-3 sm:p-5 min-w-0 overflow-hidden">
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
