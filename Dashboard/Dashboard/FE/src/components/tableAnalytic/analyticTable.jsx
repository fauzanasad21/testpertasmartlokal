import React from 'react';
import DataTable from 'react-data-table-component';

// Updated DataTable component for flow analytics
const DataTableAnalytic = ({ data, loading, handlePageChange, currentPage, totalPages, rowsPerPage, handleRowsPerPageChange, totalRecords, startRow }) => {
    const columns = [
        {
            name: 'No',
            selector: (row, index) => startRow + index,   // Dynamic row numbering
            sortable: true,
        },
        {
            name: 'Date',
            selector: row => new Date(row.record_time).toLocaleString(),  // Display timestamp as formatted date
            sortable: true,
        },
        {
            name: 'Min Value',
            selector: row => row.min_value,  // Using dynamic field
            sortable: true,
        },
        {
            name: 'Max Value',
            selector: row => row.max_value,  // Using dynamic field
            sortable: true,
        },
        {
            name: 'Average',
            selector: row => row.avg_value,  // Using dynamic field
            sortable: true,
        },
        {
            name: 'Standard Deviation',
            selector: row => row.stddev_value,  // Using dynamic field
            sortable: true,
        },
    ];

    return (
        <div className="bg-white p-6 rounded-lg">
              {loading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
               <DataTable
                    columns={columns}
                    data={data}
                    pagination
                    paginationServer
                    paginationTotalRows={totalRecords}  // Total records from API
                    paginationDefaultPage={currentPage}  // Current page
                    onChangePage={handlePageChange}  // Handle page change
                    onChangeRowsPerPage={handleRowsPerPageChange}  // Rows per page change
                    selectableRows  // Optional: Enable row selection
                    responsive  // Ensures the table is responsive
               />
            )}
        </div>
    );
};

export default DataTableAnalytic;
