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
    if (!trend) return { icon: ArrowUp };
    const { trendStatus } = trend;
    switch (trendStatus) {
      case "naik":
        return { icon: ArrowUp };
      case "turun":
        return { icon: ArrowDown };
      case "stabil":
        return { icon: ArrowUp };
      default:
        return { icon: ArrowUp };
    }
  };

  const { icon } = getTrendInfo();
  
  return (
    <div
      onClick={() => onClick(idx)}
      className={`mt-3 overflow-hidden ${
        titleCard === "Dryness" || titleCard === "Power"
          ? "w-[325px] md:w-[48%] md:h-[220px] mx-[1%]" // Menambahkan tinggi yang konsisten
          : "w-[325px] md:w-[calc((100%/3)-2%)] md:h-[220px] mx-[1%]" // Menambahkan tinggi yang konsisten
      } col-span-1 flex flex-col shadow-md rounded-lg cursor-pointer transition-colors duration-300 
      ${
        activeIdx === idx ? "bg-blue-950 text-white"
        : isStale || !dataAvailable ? "bg-gray-500 text-white"
        : "bg-white text-green-950"
      }`}
    >
      {isStale || !dataAvailable ? (
        <div className="flex-grow flex items-center justify-center">
            <p className="text-center text-xl text-white">Data tidak tersedia</p>
        </div>
      ) : (
        <>
          {/* Wrapper untuk konten utama agar banner bisa di bawah */}
          <div className="flex-grow flex flex-col justify-between items-center py-4 px-2">
            <p className={`font-bold text-2xl md:text-[28px] text-center`}>
              {titleCard === "Dryness"
                ? "Dryness Fraction"
                : titleCard === "Power"
                ? "Power Potential"
                : titleCard}
            </p>
            
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

            <div className="flex justify-center items-center text-xl">
              <p className="mr-2">
                Tren = {trend?.trendStatus || 'stabil'}
              </p>
              <img src={icon} alt="trend icon" />
            </div>
          </div>

          {/* === BAGIAN BANNER STATUS DI BAWAH === */}
          <div className={`w-full p-2 text-center text-white font-bold ${isAnomali ? 'bg-red-500' : 'bg-green-500'}`}>
            {isAnomali ? 'Data Anomali' : 'Data Normal'}
          </div>
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
