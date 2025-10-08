"use client";
import React, { useEffect, useState } from "react";
import CategoryManagement from "../components/CategoryManagement";
import Layout from "../components/Layout";

const CategoryManagementPage = () => {
  const [activeSection, setActiveSection] = useState("category-management");
  useEffect(() => {
    setActiveSection("category-management");
  }, []);
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CategoryManagement />
      </div>
    </Layout>
  );
};

export default CategoryManagementPage;
