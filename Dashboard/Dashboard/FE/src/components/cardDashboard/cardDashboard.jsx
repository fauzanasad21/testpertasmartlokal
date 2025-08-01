import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import ArrowUp from "../../assets/ArrowUp.svg";
import ArrowDown from "../../assets/ArrowDown.svg";

const CardDashboard = ({ titleCard, dataCard, idx, trend, activeIdx, onClick, isAnomali }) => {
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [isStale, setIsStale] = useState(false);
  const [dataAvailable, setDataAvailable] = useState(true);

  useEffect(() => {
    if (dataCard !== undefined && dataCard !== null) {
      setLastUpdated(Date.now());
      setDataAvailable(true);
    } else {
      setDataAvailable(false);
    }
  }, [dataCard]);

  useEffect(() => {
    const checkStaleData = () => {
      if (Date.now() - lastUpdated > 3 * 60 * 1000) {
        setIsStale(true);
      } else {
        setIsStale(false);
      }
    };

    const interval = setInterval(checkStaleData, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  const symbolDesicion = () => {
    switch (titleCard) {
      case "Dryness":
        return " %";
      case "Temperature":
        return " °C";
      case "Pressure":
        return " barg";
      case "Flow":
        return " ton/h";
      case "Power":
        return " MW";
      default:
        return "";
    }
  };

  const aturUkuran = (dataCard) => {
    if (dataCard === undefined || dataCard === null) {
      return {
        value: "-",
        fontSize: "text-xl",
      };
    }

    if (dataCard.toString().length > 5) {
      switch (titleCard) {
        case "Dryness":
          return {
            value: Number(dataCard).toFixed(3),
            fontSize: "text-lg",
          };
        case "Temperature":
          return {
            value: Number(dataCard).toFixed(2),
            fontSize: "text-lg",
          };
        case "Pressure":
          return {
            value: Number(dataCard).toFixed(2),
            fontSize: "text-lg",
          };
        case "Flow":
          return {
            value: Number(dataCard).toFixed(2),
            fontSize: "text-lg",
          };
        case "Power":
          return {
            value: Number(dataCard).toFixed(3),
            fontSize: "text-lg",
          };
        case "Anomali":
          return {
            value: dataCard,
            fontSize: "text-lg",
          }
        default:
          return {
            value: Number(dataCard).toFixed(3),
            fontSize: "text-lg",
          };
      }
    }

    return {
      value: dataCard.toString(),
      fontSize: "text-xl",
    };
  };

  const getTrendInfo = () => {
    if (!trend) return { color: "text-green-600", symbol: "", icon: ArrowUp };
    const { trendStatus } = trend;
    switch (trendStatus) {
      case "naik":
        return { color: "text-green-600", symbol: "", icon: ArrowUp };
      case "turun":
        return { color: "text-red-600", symbol: "", icon: ArrowDown };
      case "stabil":
        return { color: "text-green-600", symbol: "", icon: ArrowUp };
      default:
        return { color: "text-green-600", symbol: "", icon: ArrowUp };
    }
  };

  const { color, symbol, icon } = getTrendInfo();

  return (
    <div
      onClick={() => onClick(idx)}
      className={`mt-3 ${
        titleCard === "Dryness" || titleCard === "Power"
          ? "w-[325px] md:w-[48%] md:h-[200px] mx-[1%] space-y-8 py-4 md:py-0"
          : "w-[325px] md:w-[31%] mx-[1%] space-y-6 py-4"
      } col-span-1 flex flex-col items-center justify-center shadow-md rounded-lg cursor-pointer transition-colors duration-300 
      ${
        activeIdx === idx ? "bg-blue-950 text-white"
        : isAnomali ? "bg-red-600 text-white"
        : isStale || !dataAvailable ? "bg-gray-500 text-white"
        : "bg-white text-green-950"
      }`}
    >
      {isStale || !dataAvailable ? (
        <p className="text-center text-xl text-white">Data tidak tersedia</p>
      ) : (
        <>
          {/* === PERUBAHAN UTAMA DI SINI === */}
          {isAnomali ? (
            // Jika anomali, tampilkan teks "Data Anomali"
            <div className="flex justify-center items-center text-xl h-[28px]">
              <p className="font-bold">Data Sedang Anomali</p>
            </div>
          ) : (
            // Jika normal, tampilkan tren seperti biasa
            <div className="flex justify-center items-center text-xl">
              <p className="mr-1">
                Trend ={" "}
                <span className={`${color}`}>
                  {symbol}
                  {trend.trendStatus}
                </span>
              </p>
              <img src={icon} alt="trend icon" />
            </div>
          )}
          {/* === AKHIR DARI PERUBAHAN === */}
          
          <div className={`flex justify-center items-end font-bold ${aturUkuran(dataCard).fontSize}`}>
            <p
              className={`${
                titleCard === "Dryness" || titleCard === "Power"
                  ? "text-2xl md:text-[64px]"
                  : "text-2xl md:text-[40px]"
              }`}
            >
              {aturUkuran(dataCard).value}
            </p>
            <small
              className={`${
                titleCard === "Dryness" || titleCard === "Power"
                  ? "text-base md:text-3xl relative md:top-3"
                  : "text-base md:text-2xl relative md:top-1"
              }`}
            >
              {symbolDesicion()}
            </small>
          </div>

          <p
            className={`font-bold ${
              titleCard === "Dryness" || titleCard === "Power"
                ? "text-lg md:text-[28px]"
                : "text-lg md:text-[28px]"
            }`}
          >
            {titleCard === "Dryness"
              ? "Dryness Fraction"
              : titleCard === "Power"
              ? "Power Potential"
              : titleCard}
          </p>
        </>
      )}
    </div>
  );
};

CardDashboard.propTypes = {
  titleCard: PropTypes.string,
  dataCard: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  trend: PropTypes.object,
  idx: PropTypes.number,
  activeIdx: PropTypes.number,
  onClick: PropTypes.func,
  isAnomali: PropTypes.bool,
};

export default CardDashboard;
