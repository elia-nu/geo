"use client";
import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Folder,
  CheckSquare,
  DollarSign,
  TrendingUp,
  X,
  Save,
  AlertCircle,
} from "lucide-react";
import Layout from "./Layout";
import Pagination from "./ui/Pagination";
import { toast } from "./ui/toast";

const CategoryManagement = () => {
  const [activeTab, setActiveTab] = useState("project");
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
  });

  const categoryTypes = {
    project: {
      title: "Project Categories",
      endpoint: "project-categories",
      icon: Folder,
    },
    task: {
      title: "Task Categories",
      endpoint: "task-categories",
      icon: CheckSquare,
    },
    budget: {
      title: "Budget Allocation Categories",
      endpoint: "budget-allocation-categories",
      icon: DollarSign,
    },
    income: {
      title: "Income Categories",
      endpoint: "income-categories",
      icon: TrendingUp,
    },
  };

  useEffect(() => {
    fetchCategories();
    setCurrentPage(1);
  }, [activeTab, searchTerm, statusFilter]);

  const totalPages = Math.ceil((categories?.length || 0) / itemsPerPage) || 1;
  const paginatedCategories = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return (categories || []).slice(start, start + itemsPerPage);
  }, [categories, currentPage, itemsPerPage]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(
        `/api/${categoryTypes[activeTab].endpoint}?${params}`
      );
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
      } else {
        console.error("Failed to fetch categories:", data.error);
        toast.error(data.error || "Failed to fetch categories");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Error fetching categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      status: "active",
    });
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      status: category.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/${categoryTypes[activeTab].endpoint}/${category._id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Category deleted successfully!");
        fetchCategories();
      } else {
        toast.error(data.error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.warning("Category name is required");
      return;
    }

    try {
      const url = editingCategory
        ? `/api/${categoryTypes[activeTab].endpoint}/${editingCategory._id}`
        : `/api/${categoryTypes[activeTab].endpoint}`;

      const method = editingCategory ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingCategory ? "Category updated successfully!" : "Category created successfully!");
        setShowModal(false);
        fetchCategories();
      } else {
        toast.error(data.error || "Failed to save category");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 shadow-xl text-white">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-blue-500/10 rounded-full blur-xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-500/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Folder className="w-5 h-5 text-indigo-300" />
              </div>
              <h2 className="text-2xl font-bold text-white">Category Management</h2>
            </div>
            <p className="text-indigo-100/80 text-sm">
              Organize projects, task workflows, budget codes, and revenue streams.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-2.5 mt-4">
              <div className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                {categories?.length || 0} Total in {categoryTypes[activeTab]?.title}
              </div>
              <div className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                {(categories || []).filter((c) => c.status === "active").length} Active
              </div>
            </div>
          </div>

          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-white text-indigo-900 hover:bg-indigo-50 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all hover:scale-105 self-start lg:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60">
        {Object.entries(categoryTypes).map(([key, type]) => {
          const Icon = type.icon;
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              <span>{type.title}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder={`Search ${categoryTypes[activeTab]?.title.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-900 text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-3 text-slate-400 text-sm">Loading categories...</p>
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Folder className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">No categories found</h3>
            <p className="text-xs text-slate-400 mt-1">Create your first category using the button above.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3.5 text-left">Category Name</th>
                    <th className="px-6 py-3.5 text-left">Description</th>
                    <th className="px-6 py-3.5 text-left">Status</th>
                    <th className="px-6 py-3.5 text-left">Created Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {paginatedCategories.map((category) => (
                    <tr key={category._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                            {category.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900">{category.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs sm:text-sm max-w-xs truncate">
                        {category.description || <span className="text-slate-400 italic">No description</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            category.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              category.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {category.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {new Date(category.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(category)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(category)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-100 bg-white">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={categories?.length || 0}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(sz) => {
                  setItemsPerPage(sz);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">
                {editingCategory ? "Edit Category" : "Create Category"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingCategory ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
