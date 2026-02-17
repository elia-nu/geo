/**
 * Example usage of usePagination hook and PaginationControls component
 * 
 * This file demonstrates how to integrate pagination into a component
 */

import { usePagination } from './usePagination';
import PaginationControls from '../components/PaginationControls';

function ExampleComponent() {
  // Sample data
  const data = [/* your array of data */];
  
  // Initialize pagination with default page size of 10
  const pagination = usePagination(data, 10);
  
  return (
    <div>
      {/* Render your table with paginated data */}
      <table>
        <thead>
          <tr>
            <th>Column 1</th>
            <th>Column 2</th>
          </tr>
        </thead>
        <tbody>
          {pagination.paginatedData.map((item) => (
            <tr key={item.id}>
              <td>{item.column1}</td>
              <td>{item.column2}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Add pagination controls */}
      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        totalRecords={pagination.totalRecords}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
        onPageChange={pagination.goToPage}
        onPageSizeChange={pagination.changePageSize}
        onNextPage={pagination.goToNextPage}
        onPrevPage={pagination.goToPreviousPage}
        onFirstPage={pagination.goToFirstPage}
        onLastPage={pagination.goToLastPage}
        hasNextPage={pagination.hasNextPage}
        hasPrevPage={pagination.hasPrevPage}
        pageSizeOptions={[10, 25, 50, 100]}
      />
    </div>
  );
}

export default ExampleComponent;
