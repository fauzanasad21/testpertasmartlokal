import React, { useEffect, useState } from "react";
import AnaliticCardBig from "../components/analiticCard/analiticCardBig";
import AnaliticCardSmall from "../components/analiticCard/analiticCardSmall";
import LineChartAnalytic from "../components/lineCartAnalyitc/lineCartAnalytic";
import DataTableAnalytic from "../components/tableAnalytic/analyticTable";
import LineChartSelectedDate from "../components/LineChartSelectedDate/LineChartSelectedDate";
import DatePicker from "react-datepicker";
import { useWorker } from "../WorkerProvider";

const PowerPage = () => {
  const { dataCard } = useWorker();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [isSortingEnabled, setIsSortingEnabled] = useState(false);
  const [dataRealtime, setDataRealtime] = useState({ dataRealtime: 0 });
  const [dataCali, setDataCali] = useState({ CaliMin: 0, CaliMax: 0 });
  const [dataLimitBatas, setDataLimitBatas] = useState({
    limitAtas: 0,
    limitBawah: 0,
    limitAtasOren: 0,
    limitBawahOren: 0,
  });
  const [trendData, setTrendData] = useState("");
  const [minMaxAvgNow, setMinMaxAvgNow] = useState({
    minNow: 0,
    maxNow: 0,
    avgNow: 0,
    stddevNow: 0,
    minDaily: 0,
    maxDaily: 0,
    avgDaily: 0,
    stddevDaily: 0,
    minMonthly: 0,
    maxMonthly: 0,
    avgMonthly: 0,
    stddevMonthly: 0,
    minYearly: 0,
    maxYearly: 0,
    avgYearly: 0,
    stddevYearly: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [isLoadingReal, setIsLoadingReal] = useState(true);

  const [historicalPowerData, setHistoricalPowerData] = useState([]);
  const [selectedData, setSelectedData] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState("Power Chart Data");
  const [selectedPeriodForCards, setSelectedPeriodForCards] =
    useState("harian");

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedPeriodForTable, setSelectedPeriodForTable] = useState("daily");
  const [selectedMonthTable, setSelectedMonthTable] = useState("1");
  const [selectedYearTable, setSelectedYearTable] = useState(
    new Date().getFullYear()
  );
  const [loadingdw, setLoadingdw] = useState(false);

  const [selectedPeriodForApi, setSelectedPeriodForApi] = useState("daily");
  const [selectedMonth, setSelectedMonth] = useState("1");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const fetchTableData = async (page, rowsPerPage, period) => {
    let params = `type=power&period=${period}`;

    if (period === "daily" && selectedMonthTable && selectedYearTable) {
      params += `&month=${selectedMonthTable}&year=${selectedYearTable}`;
    } else if (period === "monthly" && selectedYearTable) {
      params += `&year=${selectedYearTable}`;
    } else if (period === "yearly" && selectedYearTable) {
      params += `&year=${selectedYearTable}`;
    }

    // Menambahkan parameter page dan limit
    params += `&page=${page}&limit=${rowsPerPage}`;

    setLoading(true);
    try {
      const url = `http://localhost:9921/api/tableStatistics/?${params}`;
      const res = await fetch(url, {
        credentials: "include",
      });
      const data = await res.json();
      setTableData(data.data);
      setTotalRecords(data.totalRecords);
      setCurrentPage(page);
      setRowsPerPage(rowsPerPage);
    } catch (error) {
      console.error("Error fetching table data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    if (page !== currentPage) {
      setCurrentPage(page);
      fetchTableData(page, rowsPerPage, selectedPeriodForTable);
    }
  };
  const handleRowsPerPageChange = (newPerPage) => {
    if (newPerPage !== rowsPerPage) {
      setRowsPerPage(newPerPage);
      setCurrentPage(1); // Reset halaman ke 1 saat rowsPerPage berubah
      fetchTableData(1, newPerPage, selectedPeriodForTable);
    }
  };

  const handleTablePeriodChange = async (event) => {
    const period = event.target.value;
    setSelectedPeriodForTable(period);
    setCurrentPage(1); // Reset halaman ke 1 saat periode berubah

    if (period === "daily") {
      await fetchTableData(1, rowsPerPage, "daily");
    } else if (period === "monthly") {
      await fetchTableData(1, rowsPerPage, "monthly");
    } else {
      await fetchTableData(1, rowsPerPage, "yearly");
    }
  };

  const handleMonthChange = (e) => {
    setSelectedMonthTable(e.target.value); // Mengubah bulan yang dipilih
  };

  const handleYearChange = (e) => {
    setSelectedYearTable(e.target.value); // Mengubah tahun yang dipilih
  };

  useEffect(() => {
    fetchTableData(1, rowsPerPage, selectedPeriodForTable); // Memanggil data pertama kali berdasarkan periode yang dipilih
  }, [selectedPeriodForTable, selectedMonthTable, selectedYearTable, rowsPerPage]); // Memastikan data di-fetch ketika periode atau rowsPerPage berubah

  const convertToCSV = (data) => {
    const headers = [
      "Date",
      "Average",
      "Min_Value",
      "Max_Value",
      "Standard_Deviasi",
    ];
    const rows = data.map((row) => [
      row.timestamp,
      row.avg_value,
      row.min_value,
      row.max_value,
      row.stddev_value,
    ]);

    let csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    return encodeURI(csvContent); // Return CSV dalam bentuk URI
  };
  const handleDownloadAllData = async () => {
    const params = new URLSearchParams({
      type: "power",
      period: selectedPeriodForTable,
    });
    setLoadingdw(true);
    try {
      const url = `http://localhost:9921/api/tableStatistics/all?${params.toString()}`;
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
        `Statistics_Power_Potential_${selectedPeriodForTable}.csv`
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

  const fetchCardData = async () => {
    try {
      const [
        dataNowResponse,
        dataDaily,
        dataMonthly,
        dataYearly,
        dataLimitBatas,
      ] = await Promise.all([
        fetch(
          `http://localhost:9921/api/statistics?period=now&type=power_potential`,
          {
            credentials: "include",
          }
        ).then((res) => res.json()),
        fetch(
          `http://localhost:9921/api/statistics?period=day&type=power_potential`,
          {
            credentials: "include",
          }
        ).then((res) => res.json()),
        fetch(
          `http://localhost:9921/api/statistics?period=month&type=power_potential`,
          {
            credentials: "include",
          }
        ).then((res) => res.json()),
        fetch(
          `http://localhost:9921/api/statistics?period=year&type=power_potential`,
          {
            credentials: "include",
          }
        ).then((res) => res.json()),
        fetch("http://localhost:9921/api/getLimit", {
          credentials: "include",
        }).then((res) => res.json()),
      ]);

      const powerData = dataLimitBatas.find(
        (item) => item.data === "power_potential"
      );
      let batasAtas = powerData ? powerData.upperlimit : null;
      let batasBawah = powerData ? powerData.bottomlimit : null;
      const minCali = batasBawah ;
      const maxCali = batasAtas ;
      if (batasBawah === minCali) {
        batasBawah = batasBawah + 1;
      }
      if (batasAtas === maxCali) {
        batasAtas = batasAtas - 1;
      }

      setDataCali({
        CaliMin: minCali,
        CaliMax: maxCali,
      });

      setDataLimitBatas({
        limitAtas: batasAtas,
        limitBawah: batasBawah,
      });

      setMinMaxAvgNow({
        minNow: dataNowResponse.min_power_potential,
        maxNow: dataNowResponse.max_power_potential,
        avgNow: dataNowResponse.avg_power_potential,
        stddevNow: dataNowResponse.stddev_power_potential,
        trendNow: dataNowResponse.trend_status,
        outOfLimitNow: dataNowResponse.out_of_limit_duration,

        minDaily: dataDaily.min_power_potential,
        maxDaily: dataDaily.max_power_potential,
        avgDaily: dataDaily.avg_power_potential,
        stddevDaily: dataDaily.stddev_power_potential,
        trendDaily: dataDaily.trend_status,
        outOfLimitDaily: dataDaily.out_of_limit_duration,

        minMonthly: dataMonthly.min_power_potential,
        maxMonthly: dataMonthly.max_power_potential,
        avgMonthly: dataMonthly.avg_power_potential,
        stddevMonthly: dataMonthly.stddev_power_potential,
        trendMonthly: dataMonthly.trend_status,
        outOfLimitMonthly: dataMonthly.out_of_limit_duration,

        minYearly: dataYearly.min_power_potential,
        maxYearly: dataYearly.max_power_potential,
        avgYearly: dataYearly.avg_power_potential,
        stddevYearly: dataYearly.stddev_power_potential,
        trendYearly: dataYearly.trend_status,
        outOfLimitYearly: dataYearly.out_of_limit_duration,
      });
    } catch (error) {
      console.error("Error fetching card data:", error);
    }
  };

  const handleCardClick = async (data) => {
    try {
      // Parameter tambahan untuk daily dan monthly
      let params = `type=power&period=${selectedPeriodForApi ?? "daily"}`;
      if (selectedPeriodForApi === "daily") {
        params += `&month=${selectedMonth}&year=${selectedYear}`;
      } else if (selectedPeriodForApi === "monthly") {
        params += `&year=${selectedYear}`;
      }

      const res = await fetch(
        `http://localhost:9921/api/statisticsGraph?${params}`,
        {
          credentials: "include",
        }
      );
      const dataResponse = await res.json();

      // Proses data berdasarkan rule
      if (data.rule === "min") {
        setSelectedTitle(`Minimum power`);
        setSelectedData(
          dataResponse.map((item) => ({
            timestamp: item.record_time,
            value: item.min_value,
          }))
        );
      }

      if (data.rule === "max") {
        setSelectedTitle(`Maximum power`);
        setSelectedData(
          dataResponse.map((item) => ({
            timestamp: item.record_time,
            value: item.max_value,
          }))
        );
      }

      if (data.rule === "avg") {
        setSelectedTitle(`Average power`);
        setSelectedData(
          dataResponse.map((item) => ({
            timestamp: item.record_time,
            value: item.avg_value,
          }))
        );
      }

      if (data.rule === "stddev") {
        setSelectedTitle(`Standard Deviation power`);
        setSelectedData(
          dataResponse.map((item) => ({
            timestamp: item.record_time,
            value: item.stddev_value,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching trend data:", error);
    }
  };

  const handleApiPeriodChange = async (e) => {
    const period = e.target.value;
    setSelectedPeriodForApi(period);

    // Fetch data sesuai periode dan parameter tambahan
    if (period === "daily") {
      await handleCardClick({
        period: "daily",
        month: selectedMonth,
        year: selectedYear,
      });
    } else if (period === "monthly") {
      await handleCardClick({ period: "monthly", year: selectedYear });
    } else {
      await handleCardClick({ period: "yearly" });
    }
  };

  const formatLocalDateTime = (date) => {
    if (!(date instanceof Date) || isNaN(date)) {
      console.error("Invalid date object");
      return null; // Return null jika formatnya salah
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`; // Kembalikan format ISO
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

    const batasAtas = foundData.upperlimit;
    const batasBawah = foundData.bottomlimit;

    if (foundData) {
      return {
        batasAtas: foundData.upperlimit,
        batasBawah: foundData.bottomlimit,
      };
    } else {
      return { batasAtas: null, batasBawah: null };
    }
  };

  const handleConfirmDates = async () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
  };

  const fetchAllHistoricalData = async (startDate, endDate) => {
    const [power] = await Promise.all([
      fetchChartData(startDate, endDate, "power"),
    ]);

    setHistoricalPowerData(power);
  };

  const fetchChartData = async (
    startDate,
    endDate,
    selectedType,
    page = 1,
    aggregated = true
  ) => {
    try {
      const formattedStartDate = formatLocalDateTime(startDate);
      const formattedEndDate = formatLocalDateTime(endDate);

      const params = new URLSearchParams({
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        type: selectedType,
        page: page.toString(),
        limit: "1000000",
      });

      if (aggregated) {
        params.append("aggregationInterval", "10m");
      }

      const url = `http://localhost:9921/api/dataGrafik?${params.toString()}`;

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const { statistics, data } = await response.json();
      const { upperlimit, bottomlimit } = await getBatasForSelectedType(
        selectedType
      );

      const {
        avg: average,
        min,
        max,
        stddev: stdDeviation,
        trend: gradient,
      } = statistics;
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
      console.error("Error fetching chart data:", error);
      return [];
    }
  };

  useEffect(() => {
    if (dataCard?.energi) {
      const datareal = 51.242;
      //console.log("Data real dari power_potential:", datareal);
      setDataRealtime(datareal); // Simpan ke state jika diperlukan
    } else {
      console.warn("power_potential tidak ditemukan di dataCard");
    }
  }, [dataCard]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchCardData();
      setIsLoading(false);
      setIsInitialLoad(false);
    };

    loadData();

    const interval = setInterval(() => {
      fetchCardData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
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
  }, [startDate, endDate]);

  useEffect(() => {
    const fetchDataGraphStat = async () => {
      // Jangan panggil API jika period adalah yearly (tidak memerlukan bulan/tahun)
      //if (selectedPeriodForApi === "yearly") return;

      const params = {
        rule: "avg", // Default rule untuk contoh, ini dapat disesuaikan
      };

      await handleCardClick(params);
    };

    fetchDataGraphStat();
  }, [selectedMonth, selectedYear, selectedPeriodForApi]);

  return (
    <>
      <div className="bg-white rounded-lg p-4 mb-5 flex items-center justify-between mt-10 md:mt-20 lg:mt-5">
        <p className="text-2xl font-bold"> Statistics Power Potential </p>
      </div>

      <div className="flex-wrap md:flex-nowrap md:flex md:justify-center items-center  md:mx-auto ">
        <AnaliticCardSmall
          titleCard="Power"
          realtime={dataRealtime}
          now={minMaxAvgNow}
          daily={minMaxAvgNow}
          monthly={minMaxAvgNow}
          yearly={minMaxAvgNow}
          isLoading={isLoading}
          limit={dataLimitBatas}
          calibration={dataCali}
          isInitialLoad={isInitialLoad}
          onClick={handleCardClick}
          selectedPeriod={selectedPeriodForCards}
        />
      </div>

      <div>
        <div className="pt-3 flex-col">
        <div className="bg-white rounded-lg p-4 mb-5 flex items-center justify-between  mt-10">
            <p className="text-2xl font-bold"> Grafik Statistik </p>
            <div className="flex flex-row gap-4">
              <select
                className="border-2 border-black rounded-lg p-2"
                onChange={handleApiPeriodChange}
                value={selectedPeriodForApi}
              >
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              {selectedPeriodForApi === "daily" && (
                <>
                  <select
                    className="border-2 border-black rounded-lg p-2"
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    value={selectedMonth}
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="border-2 border-black rounded-lg p-2"
                    onChange={(e) => setSelectedYear(e.target.value)}
                    value={selectedYear}
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i} value={2030 - i}>
                        {2030 - i}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {selectedPeriodForApi === "monthly" && (
                <select
                  className="border-2 border-black rounded-lg p-2"
                  onChange={(e) => setSelectedYear(e.target.value)}
                  value={selectedYear}
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i} value={2030 - i}>
                      {2030 - i}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {selectedData && (
            <LineChartAnalytic
              chartData={selectedData || []}
              title={selectedTitle}
            />
          )}
          {!selectedData && <LineChartAnalytic chartData={[]} title="" />}
        </div>

        <div className="pt-3 flex-col">
          <div className="bg-white rounded-lg p-4 mb-5 mt-10 w-full">
            <div className="flex flex-col md:flex-row justify-center md:justify-between items-center text-center">
              <p className="text-2xl font-bold mb-4 md:mb-0">
                Grafik History Data
              </p>

              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center justify-center">
                  <label className="mr-2">Start Date & Time:</label>
                  <DatePicker
                    selected={tempStartDate}
                    onChange={(date) => setTempStartDate(date)}
                    showTimeSelect
                    dateFormat="yyyy-MM-dd HH:mm"
                    className="border-2 border-gray-300 rounded-lg p-1"
                  />
                </div>

                <div className="flex items-center justify-center">
                  <label className="mr-2">End Date & Time:</label>
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
                  } text-gray-200 rounded-lg p-2 cursor-pointer flex items-center justify-center gap-2`}
                  disabled={isLoadingReal}
                >
                  {isLoadingReal ? (
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
              </div>
            </div>
          </div>

          <LineChartSelectedDate
            title="Power"
            selectedType="power"
            startDate={startDate}
            endDate={endDate}
            chartData={historicalPowerData}
          />
        </div>
      </div>

      <div>
        <div className="pt-3 flex-col">
        <div className="bg-white rounded-lg p-4 mb-5 mt-10 w-full">
            <div className="flex flex-col md:flex-row justify-between items-center w-full">
              <p className="text-2xl font-bold mb-4 md:mb-0">
                Table Data Statistik
              </p>

              <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto justify-end">
                <div className="flex flex-col items-center md:flex-row md:items-center">
                  <label className="mb-2 md:mb-0 md:mr-2 text-center">
                    Select Period for Table:
                  </label>
                  <div className="flex flex-col md:flex-row gap-4">
                    <select
                      className="border-2 border-black rounded-lg p-2"
                      onChange={handleTablePeriodChange}
                      value={selectedPeriodForTable}
                    >
                      <option value="daily">Daily</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>

                    {selectedPeriodForTable === "daily" && (
                      <>
                        <select
                          className="border-2 border-black rounded-lg p-2"
                          onChange={handleMonthChange}
                          value={selectedMonthTable}
                        >
                          {months.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className="border-2 border-black rounded-lg p-2"
                          onChange={handleYearChange}
                          value={selectedYearTable}
                        >
                          {Array.from({ length: 10 }, (_, i) => (
                            <option key={i} value={2030 - i}>
                              {2030 - i}
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    {selectedPeriodForTable === "monthly" && (
                      <select
                        className="border-2 border-black rounded-lg p-2"
                        onChange={handleYearChange}
                        value={selectedYearTable}
                      >
                        {Array.from({ length: 10 }, (_, i) => (
                          <option key={i} value={2030 - i}>
                            {2030 - i}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>


                <button
                  onClick={handleDownloadAllData}
                  className={`${
                    loadingdw ? "bg-slate-700" : "bg-slate-700"
                  } text-gray-200 rounded-lg p-2 flex items-center justify-center gap-2`}
                  disabled={loadingdw}
                >
                  {loadingdw ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-3"
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
                          d="M4 12a8 8 0 018-8v8h8a8 8 0 11-8-8z"
                        ></path>
                      </svg>
                      Get Data From Database....
                    </>
                  ) : (
                    "Download Data"
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-5 flex-col">
            <DataTableAnalytic
              data={tableData}
              loading={loading}
              handlePageChange={handlePageChange}
              currentPage={currentPage}
              totalRecords={totalRecords}
              rowsPerPage={rowsPerPage}
              handleRowsPerPageChange={handleRowsPerPageChange}
              startRow={(currentPage - 1) * rowsPerPage + 1}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default PowerPage;
