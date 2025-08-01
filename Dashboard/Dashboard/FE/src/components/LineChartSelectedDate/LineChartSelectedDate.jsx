import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import Toggle from "react-toggle";
import "react-toggle/style.css";

const LineChartSelectedDate = ({
  title,
  chartData,
  selectedType,
  fetchChartData,
  statistics,
}) => {
  const [localChartData, setLocalChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [average, setAverage] = useState(null);
  const [min, setMin] = useState(null);
  const [max, setMax] = useState(null);
  const [stdDeviation, setStdDeviation] = useState(null);
  const [showGradient, setShowGradient] = useState(false);
  const [gradient, setGradient] = useState(null);

  const MAX_POINTS = 5000; // Limit to 5000 points for the chart
  const MAX_GRADIENT_POINTS = 500; // Limit to 500 points for the gradient line

  // Function to sample data (for chart and gradient)
  const sampleData = (data, maxPoints) => {
    if (data.length <= maxPoints) {
      return data;
    }
    const step = Math.floor(data.length / maxPoints); // Calculate step
    return data.filter((_, index) => index % step === 0); // Sample based on step
  };

  useEffect(() => {
    setLoading(true);

    if (chartData.length > 0) {
      const stats = statistics || chartData[0];
      setAverage(stats.average);
      setMin(stats.min);
      setMax(stats.max);
      setStdDeviation(stats.stdDeviation);
      setGradient(stats.gradient); // Set gradient from API data
      
      // Apply downsampling to chartData before setting it
      const sampledData = sampleData(chartData, MAX_POINTS);
      setLocalChartData(sampledData); // Set data with sampling
    }

    setLoading(false);
  }, [chartData, statistics]);

  // Generate gradient line data (with downsampling)
  const gradientData = chartData.map((point, index) => {
    const xStart = new Date(chartData[0].x).getTime();
    const yStart = chartData[0].y;
    const xCurrent = new Date(point.x).getTime();
  
    // Tambahkan faktor skala yang lebih besar
    const scalingFactor = 0.000001; // Faktor skala yang lebih besar untuk memperlambat gradien
    const y = yStart + (gradient * (xCurrent - xStart)) * scalingFactor;  // Menggunakan faktor skala lebih besar
    return { x: point.x, y };
  });

  // Downsample the gradient data to reduce the number of points
  const downsampledGradientData = sampleData(gradientData, MAX_GRADIENT_POINTS);

  const handleGradientToggle = () => {
    setShowGradient(!showGradient);
  };

  return (
    <div className="bg-white p-6 rounded-lg">
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>Loading...</div>
      ) : (
        <>
          <ReactApexChart
            options={{
              chart: {
                type: "line",
                height: 350,
                zoom: {
                  type: "x",
                  enabled: true,
                  autoScaleYaxis: true,
                },
                toolbar: {
                  autoSelected: "zoom",
                },
              },
              title: { text: title, align: "left" },
              xaxis: { type: "datetime" },
              yaxis: {
                labels: {
                  formatter: (value) => value.toFixed(2),
                },
              },
              tooltip: {
                x: {
                  format: "yyyy-MM-dd || HH:mm",
                },
                y: {
                  formatter: (value) => value.toFixed(2),
                },
              },
            }}
            series={[
              {
                name: title,
                data: localChartData.map((point) => ({
                  x: point.x,
                  y: point.y,
                })),
              },
              ...(showGradient
                ? [
                    {
                      name: "Gradient Line",
                      data: downsampledGradientData, // Use downsampled gradient data
                      stroke: { dashArray: 4 },
                    },
                  ]
                : []),
            ]}
            type="line"
            height={350}
          />
          <div className="grid lg:grid-cols-3 grid-cols-2 gap-4 mt-6">
            <div className="bg-[#262937] text-white p-4 rounded-lg text-center">
              <h4 className="font-bold">Rata-rata</h4>
              <p>{average !== null ? average.toFixed(2) : "-"}</p>
            </div>
            <div className="bg-[#262937] text-white p-4 rounded-lg text-center">
              <h4 className="font-bold">Minimal</h4>
              <p>{min !== null ? min.toFixed(2) : "-"}</p>
            </div>
            <div className="bg-[#262937] text-white p-4 rounded-lg text-center">
              <h4 className="font-bold">Maksimal</h4>
              <p>{max !== null ? max.toFixed(2) : "-"}</p>
            </div>
            <div className="bg-[#262937] text-white p-4 rounded-lg text-center">
              <h4 className="font-bold">Standar Deviasi</h4>
              <p>{stdDeviation !== null ? stdDeviation.toFixed(2) : "-"}</p>
            </div>
            <div className="bg-[#262937] text-white p-4 rounded-lg text-center">
              <h4 className="font-bold">Gradient</h4>
              <p>{gradient !== null ? gradient.toFixed(7) : "-"}</p>
            </div>
            <div className="bg-[#262937] text-white p-4 rounded-lg text-center">
              <h4 className="font-bold text-white mb-2">Garis Gradient</h4>
              <Toggle
                id="cheese-status"
                defaultChecked={showGradient}
                onChange={handleGradientToggle}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LineChartSelectedDate;
