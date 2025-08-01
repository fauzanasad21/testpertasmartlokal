import ReactApexChart from "react-apexcharts";
import PropTypes from "prop-types";

const LineChartAnalytic = ({ chartData, title }) => {
     const chartOptions = {
          chart: {
               height: 350,
               type: "line",
               zoom: { enabled: false },
          },
          dataLabels: { enabled: false },
          stroke: { curve: "straight" },
          title: {
               text: title || "Chart Data",
               align: "left",
          },
          grid: {
               row: {
                    colors: ["#f3f3f3", "transparent"],
                    opacity: 0.5,
               },
          },
          xaxis: {
               type: "datetime",
               categories: chartData.map((data) => data.timestamp),
          },
          yaxis: {
               labels: {
                   formatter: (value) => value.toFixed(2), // Format nilai Y menjadi 2 angka desimal
               },
           },
          tooltip: {
               enabled: true,
               x: {
                    format: "dd MMM HH:mm:ss",
               },
          },
     };

     return (
          <div className="bg-white p-6 rounded-lg">
               {chartData.length === 0 && (
                    <p className="text-center">No data available</p>
               )}
               <ReactApexChart
                    options={chartOptions}
                    series={[
                         {
                              name: "Value",
                              data: chartData.map((data) => data.value),
                         },
                    ]}
                    type="line"
                    height={350}
               />
          </div>
     );
};

LineChartAnalytic.propTypes = {
     chartData: PropTypes.array.isRequired,
     title: PropTypes.string.isRequired,
};

export default LineChartAnalytic;
