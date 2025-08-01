import { useState, useEffect } from "react";
import CardDashboard from "../components/cardDashboard/cardDashboard";
import CardDashboardanomali from "../components/cardDashboardanomali/cardDashboardanomali";
import LineChart from "../components/lineCart/lineCart";
import TableData from "../components/table/tableData";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import LineChartRealTime from "../components/LineChartRealTime/LineChartRealTime";
import LineChartSelectedDate from "../components/LineChartSelectedDate/LineChartSelectedDate";
import { CSVLink } from "react-csv";
import { useWorker } from "../WorkerProvider";

const Dashboard = () => {
  const {
    realtimeData,
    tenMinutesData,
    thirtyMinutesData,
    oneHourData,
    oneDayData,
    dataCard,
  } = useWorker();

  const [interval, setInterval] = useState("1m");
  const [currentChartData, setCurrentChartData] = useState({
    drynessData: [],
    flowData: [],
    pressureData: [],
    temperatureData: [],
    powerData: [],
  });

  const [trend, setTrendData] = useState({
    dryness_steam: { trendStatus: "stabil", gradient: 0 },
    temperature: { trendStatus: "stabil", gradient: 0 },
    pressure: { trendStatus: "stabil", gradient: 0 },
    flow: { trendStatus: "stabil", gradient: 0 },
    energi: { trendStatus: "stabil", gradient: 0 },
  });

  const [activeIdx, setActiveIdx] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSortingEnabled, setIsSortingEnabled] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isLoadingReal, setIsLoadingReal] = useState(true);

  const [historicalFlowData, setHistoricalFlowData] = useState([]);
  const [historicalPressureData, setHistoricalPressureData] = useState([]);
  const [historicalTemperatureData, setHistoricalTemperatureData] = useState(
    []
  );
  const [historicalDrynessData, setHistoricalDrynessData] = useState([]);
  const [historicalPowerData, setHistoricalPowerData] = useState([]);

  const [tempStartDate, setTempStartDate] = useState(() => {
    const date = new Date();
    date.setHours(date.getHours() - 1);
    return date;
  });
  const [tempEndDate, setTempEndDate] = useState(new Date());

  //Table
  const [datatable, setDatatable] = useState([]);
  const [loadingtable, setLoadingtable] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tempStartDatetabel, setTempStartDatetabel] = useState(() => {
    const date = new Date();
    date.setHours(date.getHours() - 1);
    return date;
  });
  const [tempEndDatetabel, setTempEndDatetabel] = useState(new Date());
  const [totalRecords, setTotalRecords] = useState(0);
  const [startDatetable, setStartDatetable] = useState(new Date());
  const [endDatetable, setEndDatetable] = useState(new Date());
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loadingdw, setLoadingdw] = useState(false);

  const handleConfirmDatestabel = () => {
    setStartDatetable(tempStartDatetabel);
    setEndDatetable(tempEndDatetabel);
  };

  useEffect(() => {
    if (startDate && endDate) {
      const fetchData = async () => {
        try {
          setLoadingtable(true);
          const page = currentPage || 1;
          await fetchDataTabel(page, startDatetable, endDatetable, rowsPerPage);
        } catch (error) {
          console.error("Error fetching table data:", error);
        } finally {
          setLoadingtable(false);
        }
      };

      fetchData();
    }
  }, [startDatetable, endDatetable, currentPage, rowsPerPage]);

  const fetchDataTabel = async (
    page,
    startDatetable,
    endDatetable,
    rowsPerPage
  ) => {
    try {
      const formattedStartDate = formatLocalDateTime(startDatetable);
      const formattedEndDate = formatLocalDateTime(endDatetable);
      const params = new URLSearchParams({
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        page: page,
        limit: rowsPerPage,
      });
      const url = `http://localhost:9921/api/history?${params.toString()}`;

      const response = await fetch(url, {
        credentials: "include",
      });

      const result = await response.json();

      setDatatable(result.data);
      setTotalPages(result.totalPages);
      setCurrentPage(result.currentPage);
      setTotalRecords(result.totalRecords);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleRowsPerPageChange = (newLimit) => {
    if (newLimit !== rowsPerPage) {
      setRowsPerPage(newLimit);
    }
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber !== currentPage) {
      setCurrentPage(pageNumber);
    }
  };

  const convertToCSV = (data) => {
    const headers = [
      "Date",
      "Temperature",
      "Pressure",
      "Flow",
      "Steam_Dryness",
      "Power Potential",
    ];
    const rows = data.map((row) => [
      row.date,
      row.temperature,
      row.pressure,
      row.flow,
      row.dryness,
      row.power_potential,
    ]);

    let csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    return encodeURI(csvContent);
  };
  const handleDownloadAllData = async () => {
    const params = new URLSearchParams({
      startDate: formatLocalDateTime(startDatetable),
      endDate: formatLocalDateTime(endDatetable),
    });
    const star = formatLocalDateTime(startDatetable)
    const ends = formatLocalDateTime(endDatetable)

    try {
      setLoadingdw(true);
      const url = `http://localhost:9921/api/history/all?${params.toString()}`;
      const response = await fetch(url, {
        credentials: "include",
      });

      const result = await response.json();
      const data = result;

      const csvContent = convertToCSV(data);

      const link = document.createElement("a");
      link.href = csvContent;
      link.setAttribute(
        "download",
        `Realtime_Data_${star}-${ends}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error fetching all data:", error);
    } finally {
      setLoadingdw(false);
    }
  };

  const handleConfirmDates = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
  };
  const fetchAllHistoricalData = async (startDate, endDate) => {
    setLoading(true);

    const [flow, pressure, temperature, dryness, power] = await Promise.all([
      fetchChartData(startDate, endDate, "flow"),
      fetchChartData(startDate, endDate, "pressure"),
      fetchChartData(startDate, endDate, "temperature"),
      fetchChartData(startDate, endDate, "dryness"),
      fetchChartData(startDate, endDate, "power"),
    ]);

    setHistoricalFlowData(flow);
    setHistoricalPressureData(pressure);
    setHistoricalTemperatureData(temperature);
    setHistoricalDrynessData(dryness);
    setHistoricalPowerData(power);

    setLoading(false);
  };

  const formatLocalDateTime = (date) => {
    if (!(date instanceof Date) || isNaN(date)) {
      console.error("Invalid date object");
      return null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const fetchChartData = async (
    startDate,
    endDate,
    selectedType
  ) => {
    try {
      const formattedStartDate = formatLocalDateTime(startDate);
      const formattedEndDate = formatLocalDateTime(endDate);

      const params = new URLSearchParams({
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        type: selectedType,
      });

      const url = `http://localhost:9921/api/dataGrafik?${params.toString()}`;

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Terjadi kesalahan: ${response.status} ${response.statusText}`);
      }

      const { statistics, data } = await response.json();
      const { upperlimit, bottomlimit } = await getBatasForSelectedType(selectedType);

      const { avg: average, min, max, stddev: stdDeviation, trend: gradient } = statistics;

      return data.map((item) => {
        let validDate = new Date(item.x);
        if (isNaN(validDate)) {
          throw new Error("Format tanggal tidak valid dalam respon API");
        }

        validDate.setHours(validDate.getHours() + 7);

        return {
          x: validDate.toISOString(),
          y: item.y,
          upperlimit,
          bottomlimit,
          average,
          min,
          max,
          stdDeviation,
          gradient,
        };
      });
    } catch (error) {
      console.error("Terjadi kesalahan saat mengambil data grafik:", error);
      return [];
    }
  };


  const getBatasForSelectedType = async (selectedType) => {
    const url = "http://localhost:9921/api/getLimit";
    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch limits: ${response.status}`);
    }

    const dataLimit = await response.json();
    const foundData = dataLimit.find((item) => item.data === selectedType);

    if (foundData) {
      return {
        upperlimit: foundData.upperlimit,
        bottomlimit: foundData.bottomlimit,
      };
    } else {
      return { upperlimit: null, bottomlimit: null };
    }
  };

  const fetchTrendData = async (type) => {
    try {
      const response = await fetch(`http://localhost:9921/api/trend?type=${type}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch trend data for ${type}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching trend data:", error);
      return null;
    }
  };


  useEffect(() => {
    const fetchAllTrendData = async () => {
      const [pressureData, flowData, temperatureData, drynessData, powerData] = await Promise.all([
        fetchTrendData("pressure"),
        fetchTrendData("flow"),
        fetchTrendData("temperature"),
        fetchTrendData("dryness"),
        fetchTrendData("power_potential"),
      ]);

      setTrendData({
        pressure: pressureData ? { trendStatus: pressureData.trendStatus, gradient: pressureData.gradient } : { trendStatus: "stabil", gradient: 0 },
        flow: flowData ? { trendStatus: flowData.trendStatus, gradient: flowData.gradient } : { trendStatus: "stabil", gradient: 0 },
        temperature: temperatureData ? { trendStatus: temperatureData.trendStatus, gradient: temperatureData.gradient } : { trendStatus: "stabil", gradient: 0 },
        dryness_steam: drynessData ? { trendStatus: drynessData.trendStatus, gradient: drynessData.gradient } : { trendStatus: "stabil", gradient: 0 },
        energi: powerData ? { trendStatus: powerData.trendStatus, gradient: powerData.gradient } : { trendStatus: "stabil", gradient: 0 },
      });
    };

    fetchAllTrendData();

    const intervalId = setInterval(() => {
      fetchAllTrendData();
    }, 670000);

    return () => clearInterval(intervalId);

  }, []);


  useEffect(() => {
    let selectedData = [];

    switch (interval) {
      case "1m":
        selectedData = realtimeData;
        break;
      case "10m":
        selectedData = tenMinutesData;
        break;
      case "30m":
        selectedData = thirtyMinutesData;
        break;
      case "1h":
        selectedData = oneHourData;
        break;
      case "1d":
        selectedData = oneDayData;
        break;
      default:
        selectedData = realtimeData;
        break;
    }

    setCurrentChartData({
      drynessData: selectedData.map((item) => ({ x: item.x, y: item.dryness })),
      flowData: selectedData.map((item) => ({ x: item.x, y: item.flow })),
      pressureData: selectedData.map((item) => ({ x: item.x, y: item.pressure })),
      temperatureData: selectedData.map((item) => ({ x: item.x, y: item.temperature })),
      powerData: selectedData.map((item) => ({ x: item.x, y: item.power_potential })),
    });
  }, [interval, realtimeData, tenMinutesData, thirtyMinutesData, oneHourData, oneDayData]);


  useEffect(() => {
    if (isSortingEnabled && startDate && endDate) {
      const fetchData = async () => {
        try {
          setIsLoadingReal(true);
          await fetchAllHistoricalData(startDate, endDate);
        } catch (error) {
          console.error("Error fetching historical data:", error);
        } finally {
          setIsLoadingReal(false);
        }
      };

      fetchData();
    }
  }, [isSortingEnabled, startDate, endDate]);

  // === PERBAIKAN UTAMA DI SINI ===
  // Memeriksa apakah dataCard.fitur_anomali adalah array. Jika bukan, jadikan array kosong.
  const anomaliFeatures = Array.isArray(dataCard.fitur_anomali) ? dataCard.fitur_anomali : [];

  return (
    <>
      <div className="bg-white rounded-lg p-4 mb-5 flex items-center justify-between mt-10 md:mt-20 lg:mt-5">
        <p className="text-2xl font-bold">Monitoring Unit 3 Ulubelu</p>
      </div>
      <div className="flex flex-wrap justify-center max-w-[1440px] mx-auto ">
        <CardDashboard
          titleCard="Dryness"
          dataCard={dataCard.dryness_steam || "-"}
          trend={trend.dryness_steam || { trendStatus: "stabil", gradient: 0 }}
          idx={0}
          activeIdx={activeIdx}
          onClick={setActiveIdx}
          isAnomali={anomaliFeatures.includes('dryness_steam')}
        />
        <CardDashboard
          titleCard="Power"
          dataCard={dataCard.energi || "-"}
          trend={trend.energi || { trendStatus: "stabil", gradient: 0 }}
          idx={4}
          activeIdx={activeIdx}
          onClick={setActiveIdx}
          isAnomali={anomaliFeatures.includes('energi') || anomaliFeatures.includes('power_potential')}
        />
      </div>
      <div className="flex flex-wrap justify-center max-w-[1440px] mx-auto ">
        <CardDashboard
          titleCard="Temperature"
          dataCard={dataCard.temperature || "-"}
          trend={trend.temperature || { trendStatus: "stabil", gradient: 0 }}
          idx={1}
          activeIdx={activeIdx}
          onClick={setActiveIdx}
          isAnomali={anomaliFeatures.includes('temperature')}
        />
        <CardDashboard
          titleCard="Pressure"
          dataCard={dataCard.pressure || "-"}
          trend={trend.pressure || { trendStatus: "stabil", gradient: 0 }}
          idx={2}
          activeIdx={activeIdx}
          onClick={setActiveIdx}
          isAnomali={anomaliFeatures.includes('pressure')}
        />
        <CardDashboard
          titleCard="Flow"
          dataCard={dataCard.flow || "-"}
          trend={trend.flow || { trendStatus: "stabil", gradient: 0 }}
          idx={3}
          activeIdx={activeIdx}
          onClick={setActiveIdx}
          isAnomali={anomaliFeatures.includes('flow')}
        />
      </div>
      {/* <div className="flex flex-wrap justify-center max-w-[1440px] mx-auto ">
        <CardDashboardanomali
          titleCard="Status Data"
          dataCard={dataCard.anomali_status || "-"}
          trend={trend.flow || { trendStatus: "stabil", gradient: 0 }}
          idx={5}
          activeIdx={activeIdx}
          onClick={setActiveIdx}
          isAnomali={dataCard.anomali_status === 'ANOMALI'}
        />
        <CardDashboardanomali
          titleCard="Data Penyebab Anomali"
          dataCard={anomaliFeatures.length > 0 ? anomaliFeatures.join(', ') : "-"}
          trend={trend.flow || { trendStatus: "stabil", gradient: 0 }}
          idx={6}
          activeIdx={activeIdx}
          onClick={setActiveIdx}
          isAnomali={anomaliFeatures.length > 0}
        />
      </div> */}

      <div className="pt-10 flex-col">
        <div>
          <div className="bg-white rounded-lg p-4 mb-5 mt-10">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-2xl font-bold mb-4 md:mb-0 md:mr-4">
                Grafik Realtime
              </p>

              <div className="flex items-center mb-4 md:mb-0 md:mr-4">
                <input
                  type="checkbox"
                  checked={isSortingEnabled}
                  onChange={() => setIsSortingEnabled(!isSortingEnabled)}
                  className="mr-2"
                />
                <span>Sortir Berdasarkan Tanggal</span>
              </div>
              <div className="flex flex-wrap justify-center max-w-[1440px] mx-auto">
                <div>
                  <label htmlFor="interval" className="mr-2">Pilih Interval:</label>
                  <select
                    id="interval"
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    className="border-2 border-gray-300 rounded-lg p-2"
                    disabled={isSortingEnabled}
                  >
                    <option value="1m">1 Menit</option>
                    <option value="10m">10 Menit</option>
                    <option value="30m">30 Menit</option>
                    <option value="1h">1 Jam</option>
                    <option value="1d">1 Hari</option>
                  </select>
                </div>
              </div>


              {isSortingEnabled && (
                <div className="flex flex-col md:flex-row items-center md:gap-4">
                  <div className="flex items-center mb-4 md:mb-0">
                    <label className="mr-2">Start Date:</label>
                    <DatePicker
                      selected={tempStartDate}
                      onChange={(date) => setTempStartDate(date)}
                      showTimeSelect
                      dateFormat="yyyy-MM-dd HH:mm"
                      className="border-2 border-gray-300 rounded-lg p-1"
                    />
                  </div>

                  <div className="flex items-center mb-4 md:mb-0 md:mr-4">
                    <label className="mr-2">End Date:</label>
                    <DatePicker
                      selected={tempEndDate}
                      onChange={(date) => setTempEndDate(date)}
                      showTimeSelect
                      dateFormat="yyyy-MM-dd HH:mm"
                      className="border-2 border-gray-300 rounded-lg p-1"
                    />
                  </div>

                  <button
                    onClick={handleConfirmDates}
                    className={`${
                      isLoadingReal ? "bg-slate-700" : "bg-slate-700"
                    } text-gray-200 rounded-lg p-2 flex items-center justify-center`}
                    disabled={isLoadingReal}
                  >
                    {isLoadingReal ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5 mr-2"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8h8a8 8> 0 11-8-8z"
                          ></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      "Konfirmasi"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 lg:grid-rows-2 md:grid-cols-1 gap-4  p-4">
            <div className="chart-box bg-white p-4 mb-6 rounded-lg shadow-md">
              {!isSortingEnabled ? (
                <LineChartRealTime
                  title="Dryness"
                  selectedType="dryness"
                  chartData={currentChartData.drynessData}
                  interval={interval}
                />
              ) : (
                <LineChartSelectedDate
                  title="Dryness"
                  selectedType="dryness"
                  startDate={startDate}
                  endDate={endDate}
                  chartData={historicalDrynessData}
                />
              )}
            </div>
            <div className="chart-box bg-white p-4 mb-6  rounded-lg shadow-md">
              {!isSortingEnabled ? (
                <LineChartRealTime
                  title="Flow"
                  selectedType="flow"
                  chartData={currentChartData.flowData}
                  interval={interval}
                />
              ) : (
                <LineChartSelectedDate
                  title="Flow"
                  selectedType="flow"
                  startDate={startDate}
                  endDate={endDate}
                  chartData={historicalFlowData}
                />
              )}
            </div>

            <div className="chart-box bg-white p-4 mb-6 rounded-lg shadow-md">
              {!isSortingEnabled ? (
                <LineChartRealTime
                  title="Pressure"
                  selectedType="pressure"
                  chartData={currentChartData.pressureData}
                  interval={interval}
                />
              ) : (
                <LineChartSelectedDate
                  title="Pressure"
                  selectedType="pressure"
                  startDate={startDate}
                  endDate={endDate}
                  chartData={historicalPressureData}
                />
              )}
            </div>

            <div className="chart-box bg-white p-4 mb-6 rounded-lg shadow-md">
              {!isSortingEnabled ? (
                <LineChartRealTime
                  title="Temperature"
                  selectedType="temperature"
                  chartData={currentChartData.temperatureData}
                  interval={interval}
                />
              ) : (
                <LineChartSelectedDate
                  title="Temperature"
                  selectedType="temperature"
                  startDate={startDate}
                  endDate={endDate}
                  chartData={historicalTemperatureData}
                />
              )}
            </div>

            <div className="chart-box bg-white p-4 mb-6 rounded-lg shadow-md lg:col-span-2">
              {!isSortingEnabled ? (
                <LineChartRealTime
                  title="Power Potential"
                  selectedType="power_potential"
                  chartData={currentChartData.powerData}
                  interval={interval}
                />
              ) : (
                <LineChartSelectedDate
                  title="Power Potential"
                  selectedType="power_potential"
                  startDate={startDate}
                  endDate={endDate}
                  chartData={historicalPowerData}
                />
              )}
            </div>
          </div>
        </div>
        {/* Tabel cuyy */}
        <div>
          <div className="bg-white rounded-lg p-4 mb-5 mt-10">
            <div className="flex flex-col md:flex-row justify-center md:justify-between items-center text-center">
              <p className="text-2xl font-bold mb-4 md:mb-0">Tabel</p>

              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center justify-center">
                  <label className="mr-2">Start Date:</label>
                  <DatePicker
                    selected={tempStartDatetabel}
                    onChange={(date) => setTempStartDatetabel(date)}
                    showTimeSelect
                    dateFormat="yyyy-MM-dd HH:mm"
                    className="border-2 border-gray-300 rounded-lg p-1"
                  />
                </div>

                <div className="flex items-center justify-center">
                  <label className="mr-2">End Date:</label>
                  <DatePicker
                    selected={tempEndDatetabel}
                    onChange={(date) => setTempEndDatetabel(date)}
                    showTimeSelect
                    dateFormat="yyyy-MM-dd HH:mm"
                    className="border-2 border-gray-300 rounded-lg p-1"
                  />
                </div>

                <button
                  onClick={handleConfirmDatestabel}
                  className={`${
                    loadingtable ? "bg-slate-700" : "bg-slate-700"
                  } text-gray-200 rounded-lg p-2 cursor-pointer flex items-center justify-center gap-2`}
                  disabled={loadingtable}
                >
                  {loadingtable ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8h8a8 8 0 11-8-8z"
                        ></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    "Konfirmasi"
                  )}
                </button>

                <button
                  onClick={handleDownloadAllData}
                  className={`${
                    loadingdw ? "bg-slate-700" : "bg-slate-700"
                  } text-gray-200 rounded-lg p-2 cursor-pointer flex items-center justify-center gap-2`}
                  disabled={loadingdw}
                >
                  {loadingdw ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8h8a8 8 0 11-8-8z"
                        ></path>
                      </svg>
                      fetch to Database....
                    </>
                  ) : (
                    "Download Data"
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-5">
            <TableData
              data={datatable}
              loading={loadingtable}
              handlePageChange={handlePageChange}
              handleRowsPerPageChange={handleRowsPerPageChange}
              currentPage={currentPage}
              totalPages={totalPages}
              rowsPerPage={rowsPerPage}
              totalRecords={totalRecords}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
