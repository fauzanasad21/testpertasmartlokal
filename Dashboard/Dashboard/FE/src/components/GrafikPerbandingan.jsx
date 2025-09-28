import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const GrafikPerbandingan = () => {
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });

    useEffect(() => {
        // Panggil API yang baru kita buat
        fetch('http://localhost:9921/api/chart-data') // Pastikan port Node.js Anda benar
            .then(res => res.json())
            .then(dataFromApi => {
                if (dataFromApi && dataFromApi.length > 0) {
                    const labels = dataFromApi.map(item => new Date(item.timestamp).toLocaleDateString('id-ID'));
                    const actualData = dataFromApi.map(item => item.dryness);
                    const predictedData = dataFromApi.map(item => item.predicted_dryness);

                    setChartData({
                        labels,
                        datasets: [
                            {
                                label: 'Data Kalorimeter (Aktual)',
                                data: actualData,
                                borderColor: 'rgb(255, 159, 64)',
                                backgroundColor: 'rgba(255, 159, 64, 0.5)',
                            },
                            {
                                label: 'Prediksi ML',
                                data: predictedData,
                                borderColor: 'rgb(75, 192, 192)',
                                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                            },
                        ],
                    });
                }
            })
            .catch(error => console.error("Error fetching chart data:", error));
    }, []);

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Perbandingan Data Aktual vs Prediksi', font: { size: 18 } },
        },
        scales: { 
            y: { title: { display: true, text: 'Dryness Fraction (%)' } },
            x: { title: { display: true, text: 'Tanggal' } }
        }
    };

    return (
        <div className="card bg-white rounded-2xl px-6 py-8 my-6 mx-auto">
            <Line options={options} data={chartData} />
        </div>
    );
};

export default GrafikPerbandingan;