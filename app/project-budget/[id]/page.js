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
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-lg text-gray-600">Loading project budget...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-lg text-red-600 font-medium">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📁</div>
            <p className="text-lg text-gray-600 font-medium">
              Project not found
            </p>
            <Link
              href="/projects"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-900 transition-colors"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 bg-white min-h-screen">
        {/* Breadcrumbs */}
        <nav className="mb-4">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link
                href="/projects"
                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
              >
                Projects
              </Link>
            </li>
            <li className="flex items-center">
              <svg
                className="w-4 h-4 text-gray-400 mx-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <Link
                href={`/projects/${projectId}`}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                {project.name}
              </Link>
            </li>
            <li className="flex items-center">
              <svg
                className="w-4 h-4 text-gray-400 mx-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-700 font-medium">
                Budget Management
              </span>
            </li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="bg-blue-900 text-white p-4 sm:p-6 mb-6 rounded-md shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4 md:gap-0">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 break-words">
                Budget Management
              </h1>
              <p className="text-white text-opacity-90">
                Manage budget, expenses, and financial tracking for{" "}
                {project.name}
              </p>
            </div>
            <Link
              href={`/projects/${projectId}`}
              className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-20 text-blue-900 font-medium rounded-md hover:bg-opacity-30 transition-all text-xs"
            >
              <ArrowBackIcon className="text-lg" />
              Back to Project
            </Link>
          </div>
        </div>

        {/* Financial Management Component */}
        <ProjectFinancialManagement
          projectId={projectId}
          projectName={project.name}
        />
      </div>
    </Layout>
  );
};

export default ProjectBudgetPage;
