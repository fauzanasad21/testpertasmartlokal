import { useState, useEffect } from "react"
import PropTypes from "prop-types";
import ArrowUp from "../../assets/ArrowUp.svg";
import ArrowDown from "../../assets/ArrowDown.svg";
import axios from "axios";

const AnaliticCardBig = ({
     titleCard,
     dataCard,
     onClick,
     dataStatus,
}) => {
     const [trendData, setTrendData] = useState({})
     const fetchTrendData = async () => {
          try {
               const response = await axios.get(`http://localhost:9921/api/trend?type=${titleCard.toLowerCase()}&period=now`);
               if (response.status == 200) {
                    setTrendData(response.data)
               }
          } catch (error) {
               //console.log(error);
          }
     }

     const symbolDecision = () => {
          const symbols = {
               Dryness: "%",
               Temperature: "°C",
               Pressure: "barg",
               Flow: "ton/h",
               Power: "MW",
          };
          return symbols[titleCard] || "";
     };

     const formatData = (dataCard) => {
          const data = typeof dataCard === "number" ? dataCard.toFixed(2) : dataCard;
          //console.log(data);
          
          return data && data?.length > 5 ? data?.slice(0, 5) : data ? data : '-';
     };

     useEffect(() => {
          fetchTrendData();
     }, []);


     return (
          <div className="h-full flex flex-col items-center md:items-end justify-center md:justify-end">
    <div
        onClick={() => onClick()}
        className="w-[300px] p-4 h-[300px] bg-white rounded-lg shadow-md mb-4">
        <div className="flex items-center justify-center mb-4 mt-8 text-xl">
            <p className="mr-1">Grad =
                <span className={`${trendData?.trendStatus === 'naik' ? 'text-green-600' : trendData?.trendStatus === 'stabil' ? 'text-green-600' : trendData?.trendStatus === 'turun' ? 'text-red-600' : 'text-green-600'}`}>
                    {trendData?.trendStatus === 'naik' ? '+' : trendData?.trendStatus === 'stabil' ? '' : trendData?.trendStatus === 'turun' ? '' : ''}
                    {trendData?.gradient ? Number(trendData.gradient).toFixed(3) : ''}
                </span>
            </p>
            {trendData?.trendStatus === 'naik' ? <img src={ArrowUp} alt="gradient" /> : trendData?.trendStatus === 'turun' ? <img src={ArrowDown} alt="gradient" /> : <img src={ArrowUp} alt="gradient" />}
        </div>
        <p className="text-5xl font-bold mr-4 mt-8">
            {formatData(dataCard) || "N/A"}{" "}
            <small className="text-2xl">{symbolDecision()}</small>
        </p>
        <p className="text-xl font-semibold mt-12">{titleCard}</p>
    </div>
    <div className="bg-white rounded-lg w-[300px] h-[150px] mt-4 shadow-md flex flex-col justify-center items-center">
        <p className="text-center text-[22px] font-bold">Status Sensor</p>
        <p className={`${dataStatus === 1 ? "text-green-500" : "text-red-500 text-center"} text-[48px] font-bold`}>
            {dataStatus === 1 ? "ON" : "OFF"}
        </p>
    </div>
</div>

     );
};

AnaliticCardBig.propTypes = {
     titleCard: PropTypes.string.isRequired,
     dataCard: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
     onClick: PropTypes.func.isRequired,
     dataStatus: PropTypes.number.isRequired,
};

export default AnaliticCardBig;
