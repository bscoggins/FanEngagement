import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  hasPreviousPage,
  hasNextPage,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const pages: number[] = [];
  const maxPagesToShow = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  
  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '1.5rem',
        justifyContent: 'center',
      }}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPreviousPage}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: hasPreviousPage ? '#0066cc' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: hasPreviousPage ? 'pointer' : 'not-allowed',
          fontSize: '0.875rem',
        }}
        aria-label="Previous page"
      >
        Previous
      </button>

      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: 'white',
              color: '#333',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            1
          </button>
          {startPage > 2 && <span style={{ color: '#666' }}>...</span>}
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: page === currentPage ? '#0066cc' : 'white',
            color: page === currentPage ? 'white' : '#333',
            border: page === currentPage ? 'none' : '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: page === currentPage ? 'bold' : 'normal',
          }}
          aria-label={`Page ${page}`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span style={{ color: '#666' }}>...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: 'white',
              color: '#333',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: hasNextPage ? '#0066cc' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: hasNextPage ? 'pointer' : 'not-allowed',
          fontSize: '0.875rem',
        }}
        aria-label="Next page"
      >
        Next
      </button>

      <span style={{ marginLeft: '1rem', color: '#666', fontSize: '0.875rem' }}>
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
};
