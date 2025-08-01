import React, { useEffect, useRef } from "react";
import ReactApexChart from "react-apexcharts";

const LineChartRealTime = ({ title, chartData }) => {
  const chartRef = useRef(null);

  // Fungsi untuk mengonversi timestamp ke waktu lokal
  const convertToLocalTime = (timestamp) => {
    const date = new Date(timestamp); // Membuat objek Date dari timestamp
    return date.getTime(); // Mengembalikan timestamp dalam waktu lokal (dalam milidetik)
  };

  const chartOptions = {
    chart: {
      id: "realtime",
      type: "line",
      height: "auto",
      toolbar: {
        show: true,
        tools: {
          zoom: false, // Nonaktifkan zoom
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
        },
      },
      zoom: {
        enabled: false, // Nonaktifkan zoom
      },
      animations: {
        enabled: true,
        easing: "easeout",
        speed: 200,
        animateGradually: {
          enabled: true,
          delay: 100,
        },
        dynamicAnimation: {
          enabled: false,
        },
      },
    },
    stroke: {
      curve: "smooth",
    },
    markers: {
      size: 0,
    },
    title: {
      text: title,
      align: "left",
    },
    xaxis: {
      type: "datetime", // Memastikan x adalah waktu
      labels: {
        formatter: function (value) {
          const date = new Date(value); // Membuat objek Date dari timestamp
          // Menampilkan jam dan menit dalam format 24 jam
          return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (value) => value.toFixed(2),
      },
    },
    tooltip: {
      x: {
        format: "HH:mm", // Format hanya jam dan menit (24 jam) di tooltip
      },
      y: {
        formatter: (value) => value.toFixed(2),
      },
    },
  };

  useEffect(() => {
    if (chartRef.current && chartData.length > 0) {
      const chartInstance = chartRef.current.chart;

      // Modifikasi chartData dengan mengonversi timestamp ke waktu lokal
      const localData = chartData.map((item) => ({
        x: convertToLocalTime(item.x), // Konversi timestamp ke waktu lokal
        y: item.y,
      }));

      // Periksa apakah pengguna sedang dalam mode zoom atau pan
      const isUserInteracting =
        chartInstance.w.globals.zoomed ||
        chartInstance.w.globals.panEnabled;

      if (!isUserInteracting) {
        // Jika tidak ada interaksi zoom/pan, update chart dengan data yang sudah dimodifikasi
        chartInstance.updateSeries(
          [
            {
              name: title,
              data: localData,
            },
          ],
          true
        );
      } else {
        // Jika ada interaksi, update tanpa mengubah posisi
        chartInstance.updateSeries(
          [
            {
              name: title,
              data: localData,
            },
          ],
          false
        );
      }
    }
  }, [chartData, title]);

  return (
    <ReactApexChart
      ref={chartRef}
      options={chartOptions}
      series={[
        {
          name: title,
          data: chartData.map((item) => ({
            x: convertToLocalTime(item.x), // Konversi timestamp ke waktu lokal
            y: item.y,
          })),
        },
      ]}
      type="line"
      height={350}
    />
  );
};

export default LineChartRealTime;
