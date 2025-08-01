import React, { useState, useEffect } from 'react';
import DataTableComponent from '../components/tableForm'; // Impor komponen DataTable
import InputForm from "../components/formDatatring";
import Modal from "../components/modal/modal";

const InputPage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);


  const [data, setData] = useState({
    temperature: '',
    flow: '',
    pressure: '',
    dryness: '',
  });

  const [tableData, setTableData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetch('http://localhost:9921/api/dtaTraining') 
      .then((response) => response.json())
      .then((data) => {
        setTableData(data); 
      })
      .catch((error) => {
        console.error('Error fetching data: ', error);
      });
  };

  const handleChange = (field, value) => {
    setData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  const handleRowSelected = (state) => {
    setSelectedRows(state.selectedRows);
  };

  const handleDelete = () => {
    const idsToDelete = selectedRows.map((row) => row.id);

    const url = new URL('http://localhost:9921http://localhost:9921/api/dltDtaTrng');
    const params = new URLSearchParams();

    idsToDelete.forEach(id => params.append('id', id));
  
    url.search = params.toString();
    
    fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then(() => {
        fetchData();
        setSelectedRows([]);
      })
      .catch((error) => {
        console.error('Error deleting data: ', error);
      });
  };
  
  const isDataEmpty = () => {
    return Object.values(data).some(value => value === '' || value === null);
  };

  const handleOpenModal = () => {
    if (isDataEmpty()) {
      setModalType(5);
      setModalOpen(true);
      return;
    }
    setModalType(4);
    setModalData(data); 
    setModalOpen(true);

  };

  // Close modal
  const handleCloseModal = () => {
    setModalOpen(false);
    fetchData();
  };

  return (
    <div className="page-container" style={{ padding: '20px' }}>
      <div className="bg-white rounded-lg p-4 mb-5 flex items-center justify-between mt-10 md:mt-20 lg:mt-5">
        <p className="text-2xl font-bold">Form Input Data Real Lapangan</p>
        <p className="text-base">Data real ini akan digunakan untuk melatih machine learning Dryness Steam</p>
      </div>

      <InputForm data={{ data }} onChange={handleChange} onSave={handleOpenModal} />
      
      <DataTableComponent 
        data={tableData} 
        onRowSelected={handleRowSelected} 
      />
      
      {selectedRows.length > 0 && (
        <button
          onClick={handleDelete}
          className="bg-red-500 text-white py-2 px-4 rounded mt-4"
        >
          Delete Selected
        </button>
      )}
      {modalOpen && <Modal type={modalType} close={handleCloseModal} data={modalData} />}
    </div>
  );
};

export default InputPage;
