import React from 'react';
import DataTable from 'react-data-table-component';

const DataTableComponent = ({ data, onRowSelected }) => {

    const formatDate = (timestampString) => {
        // Pengaman 1: Jika inputnya kosong, null, atau undefined
        if (!timestampString) {
          return "Data Waktu Invalid";
        }
      
        const date = new Date(timestampString);
      
        // Pengaman 2: Jika string tidak bisa di-parse menjadi tanggal yang valid
        if (isNaN(date.getTime())) {
          return "Format Waktu Salah";
        }
      
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
      
        // Fungsi ini akan menampilkan waktu sesuai zona waktu lokal browser pengguna
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

  const columns = [

    {
        name: 'Date',
        selector: row => formatDate(row.timestamp), // <-- DIUBAH DARI row.date
        sortable: true,
    },
    {
      name: 'Temperature (C)',
      selector: row => row.temperature,
      sortable: true,
    },
    {
      name: 'Flow (Ton/h)',
      selector: row => row.flow,
      sortable: true,
    },
    {
      name: 'Pressure (Barg)',
      selector: row => row.pressure,
      sortable: true,
    },
    {
      name: 'Dryness (%)',
      selector: row => row.dryness,
      sortable: true,
    },
  ];

  return (
    <div className="table-container">
      <DataTable
        title="Data Real Lapangan"
        columns={columns}
        data={data}
        selectableRows
        onSelectedRowsChange={onRowSelected}
        pagination
      />
    </div>
  );
};

export default DataTableComponent;
