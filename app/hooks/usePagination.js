import { useState, useMemo } from "react";

/**
 * Custom hook for managing pagination state and logic
 * @param {Array} data - The array of data to paginate
 * @param {number} initialPageSize - Initial number of items per page (default: 10)
 * @returns {Object} Pagination state and helper functions
 */
export function usePagination(data, initialPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil((data?.length || 0) / pageSize);
  }, [data?.length, pageSize]);

  // Calculate paginated data
  const paginatedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  // Navigate to a specific page
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Change page size and reset to first page
  const changePageSize = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Navigation helpers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  // Calculate pagination info
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, data?.length || 0);
  const totalRecords = data?.length || 0;

  return {
    // Paginated data
    paginatedData,
    
    // Current state
    currentPage,
    pageSize,
    totalPages,
    totalRecords,
    
    // Pagination info
    startIndex,
    endIndex,
    
    // Navigation helpers
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    changePageSize,
    
    // Boolean flags
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    isEmpty: totalRecords === 0,
  };
}
