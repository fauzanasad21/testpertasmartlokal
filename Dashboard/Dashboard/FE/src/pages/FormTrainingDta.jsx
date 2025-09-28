import React, { useState, useEffect } from 'react';
import DataTableComponent from '../components/tableForm';
import InputForm from "../components/formDatatring";
import Modal from "../components/modal/modal";
import GrafikPerbandingan from '../components/GrafikPerbandingan';

const InputPage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);

  const [data, setData] = useState({
    timestamp: '',
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

  // FUNGSI INI SEKARANG AKAN DIPANGGIL OLEH MODAL
  const handleDelete = () => {
    console.log("Tombol 'Ya, Hapus' di modal diklik! Fungsi handleDelete berjalan.");
    const idsToDelete = selectedRows.map((row) => row.id);
    const url = new URL('http://localhost:9921/api/dltDtaTrng');
    const params = new URLSearchParams();
    idsToDelete.forEach(id => params.append('id', id));
    url.search = params.toString();
    
    fetch(url, {
      method: 'DELETE',
    })
      .then((response) => response.json())
      .then(() => {
        fetchData();
        setSelectedRows([]);
        handleCloseModal(); // Tutup modal setelah berhasil
      })
      .catch((error) => {
        console.error('Error deleting data: ', error);
        handleCloseModal(); // Tutup modal jika gagal juga
      });
  };
  
  const isDataEmpty = () => {
    return !data.timestamp || !data.temperature || !data.flow || !data.pressure || !data.dryness;
  };

  // FUNGSI BARU UNTUK MEMBUKA MODAL KONFIRMASI HAPUS
  const handleOpenDeleteModal = () => {
      setModalType(6); // Set tipe modal ke 6 (konfirmasi hapus)
      setModalData({
          onConfirm: handleDelete, // Kirim fungsi handleDelete yang asli ke modal
          itemCount: selectedRows.length // Kirim jumlah data yang akan dihapus
      });
      setModalOpen(true);
  }

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

  const handleCloseModal = () => {
    setModalOpen(false);
    fetchData();
  };

  return (
    <div className="page-container" style={{ padding: '20px' }}>
      <div className="bg-white rounded-lg p-4 mb-5 flex items-center justify-between mt-10 md:mt-20 lg:mt-5">
        <p className="text-2xl font-bold">Form Input & Prediksi Data Lapangan</p>
        <p className="text-base">Data ini akan digunakan untuk melatih dan memvalidasi model ML</p>
      </div>

      <InputForm data={data} onChange={handleChange} onSave={handleOpenModal} />
      
      <GrafikPerbandingan />

      <DataTableComponent 
        data={tableData} 
        onRowSelected={handleRowSelected} 
      />
      
      {selectedRows.length > 0 && (
        <button
          // UBAH ONCLICK UNTUK MEMANGGIL FUNGSI PEMBUKA MODAL
          onClick={handleOpenDeleteModal}
          className="bg-red-500 text-white py-2 px-4 rounded mt-4"
        >
          Delete Selected
        </button>
      )}
      {/* Pastikan Anda meneruskan prop 'data' ke Modal */}
      {modalOpen && <Modal type={modalType} close={handleCloseModal} data={modalData} />}
    </div>
  );
};

export default InputPage;