import React from 'react';
import DataTable from 'react-data-table-component';

const TableData = ({ data, loading, handlePageChange, currentPage, totalPages, rowsPerPage, handleRowsPerPageChange, totalRecords }) => {
    const columns = [
        {
            name: 'Date',
            selector: row => new Date(row.date).toLocaleString(),  // Tampilkan tanggal dan waktu
            sortable: true,
        },
        {
            name: 'Temperature',
            selector: row => row.temperature,
            sortable: true,
        },
        {
            name: 'Pressure',
            selector: row => row.pressure,
            sortable: true,
        },
        {
            name: 'Flow',
            selector: row => row.flow,
            sortable: true,
        },
        {
            name: 'Dryness',
            selector: row => row.dryness,
            sortable: true,
        },
        {
            name: 'Power Prediction',
            selector: row => row.power_potential,
            sortable: true,
        }
    ];

    return (
        <div className="bg-white p-6 rounded-lg">
            {loading ? (
                <p>Loading data...</p>
            ) : (
               <DataTable
                    columns={columns}
                    data={data}
                    pagination
                    paginationServer
                    paginationTotalRows={totalRecords}  // Total records dari API
                    paginationDefaultPage={currentPage}  // Halaman saat ini
                    onChangePage={handlePageChange}  // Fungsi untuk pindah halaman
                    onChangeRowsPerPage={handleRowsPerPageChange}  // Fungsi untuk mengubah jumlah baris per halaman  // Pilihan jumlah baris per halaman
                    rowsPerPage={rowsPerPage}  // Jumlah baris yang sedang dipilih
               />
            )}
        </div>
    );
};

export default TableData;
