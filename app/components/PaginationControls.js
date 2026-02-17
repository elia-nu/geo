"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";

/**
 * Reusable pagination controls component
 * @param {Object} props - Component props
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.pageSize - Current page size
 * @param {number} props.totalRecords - Total number of records
 * @param {number} props.startIndex - Start index of current page
 * @param {number} props.endIndex - End index of current page
 * @param {Function} props.onPageChange - Callback when page changes
 * @param {Function} props.onPageSizeChange - Callback when page size changes
 * @param {Function} props.onNextPage - Callback for next page
 * @param {Function} props.onPrevPage - Callback for previous page
 * @param {Function} props.onFirstPage - Callback for first page
 * @param {Function} props.onLastPage - Callback for last page
 * @param {boolean} props.hasNextPage - Whether there is a next page
 * @param {boolean} props.hasPrevPage - Whether there is a previous page
 * @param {Array<number>} props.pageSizeOptions - Available page size options
 */
export default function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange,
  onNextPage,
  onPrevPage,
  onFirstPage,
  onLastPage,
  hasNextPage,
  hasPrevPage,
  pageSizeOptions = [10, 25, 50, 100],
}) {
  // Don't render if there are no records
  if (totalRecords === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-gray-500">
        No records to display
      </div>
    );
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, last page, and pages around current page
      const leftSiblingIndex = Math.max(currentPage - 1, 1);
      const rightSiblingIndex = Math.min(currentPage + 1, totalPages);
      
      const showLeftDots = leftSiblingIndex > 2;
      const showRightDots = rightSiblingIndex < totalPages - 1;
      
      if (!showLeftDots && showRightDots) {
        // Show first 3 pages + dots + last page
        for (let i = 1; i <= 3; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (showLeftDots && !showRightDots) {
        // Show first page + dots + last 3 pages
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show first page + dots + current and siblings + dots + last page
        pages.push(1);
        pages.push('...');
        for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-gray-200 bg-white">
      {/* Records info and page size selector */}
      <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">
            Showing {startIndex} to {endIndex} of {totalRecords} records
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="whitespace-nowrap">
            Rows per page:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* First page button */}
        <button
          onClick={onFirstPage}
          disabled={!hasPrevPage}
          className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="First page"
        >
          <ChevronDoubleLeftIcon className="w-4 h-4 text-gray-600" />
        </button>

        {/* Previous page button */}
        <button
          onClick={onPrevPage}
          disabled={!hasPrevPage}
          className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
        >
          <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
        </button>

        {/* Page numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span key={`dots-${index}`} className="px-3 py-1 text-gray-500">
                  ...
                </span>
              );
            }
            
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Mobile page indicator */}
        <div className="sm:hidden px-3 py-1 text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </div>

        {/* Next page button */}
        <button
          onClick={onNextPage}
          disabled={!hasNextPage}
          className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next page"
        >
          <ChevronRightIcon className="w-4 h-4 text-gray-600" />
        </button>

        {/* Last page button */}
        <button
          onClick={onLastPage}
          disabled={!hasNextPage}
          className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Last page"
        >
          <ChevronDoubleRightIcon className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
