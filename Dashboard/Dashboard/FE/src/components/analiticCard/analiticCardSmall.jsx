import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import axios from "axios";
import ArrowUp from "../../assets/ArrowUp.svg";
import ArrowDown from "../../assets/ArrowDown.svg";
import GaugeComponent from "react-gauge-component";
import { color } from "framer-motion";

const AnaliticCardSmall = ({
  titleCard,
  now,
  daily,
  monthly,
  yearly,
  isLoading,
  onClick,
  realtime,
  limit,
  calibration,
}) => {
  const [activeIdx, setActiveIdx] = useState(null);

  const batasatas = limit.limitAtas;
  const batasbawah = limit.limitBawah;
  let batasatasoren = batasatas - (batasatas * 0.05);
  let batasbawahoren = batasbawah + (batasbawah * 0.05);
  let batasatasorentes1 = batasatas - (batasatas * 0.05) - 2;
  let batasatasorentes2 = batasatas - (batasatas * 0.05) - 1;


  //console.log('batas bawah', batasbawah);
  //console.log('batas bawah oren', batasbawahoren);
  //console.log('batas atas oren', batasatasoren);
  //console.log('batas atas', batasatas);
  //console.log('batas atas', batasatas);

  if(batasatasoren < batasbawahoren || batasbawahoren > batasatasoren){
    [batasatasoren, batasbawahoren] = [batasbawahoren, batasatasoren]
  }

  const minCali = calibration.CaliMin;
  const maxCali = calibration.CaliMax;
  // //console.log("cekbatas atas", batasatas);

  // //console.log("cekbatas bawah", batasbawah);

  // //console.log("cekbatas oren ats", batasatasoren);

  // //console.log("cekbatas oren bwh", batasbawahoren);

  const formatNumber = (number) => {
    if (number?.toString().length > 5) {
      return {
        value: Number(number).toFixed(3),
        fontSize: "text-lg",
      };
    }
    return {
      value: number,
      fontSize: "text-xl",
    };
  };

  const symbolDesicion = (titleCard) => {
    const symbols = {
      Dryness: "%",
      Temperature: "°C",
      Pressure: "barg",
      Flow: "ton/h",
      Power: "MW",
    };
    return symbols[titleCard] || "";
  };

  const handleCardClick = (index, data) => {
    setActiveIdx(index);
    onClick(data);
  };
  const pickluar = 35;

  return (
    <div className="container  ">
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
        <div className="row-span-2 flex justify-center items-center p-2 w-full h-full shadow rounded-md m-1 group bg-white">
          <div className="flex justify-center items-center w-full h-full ">
            {isLoading ? (
              <div
                className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                role="status"
              >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Loading...
                </span>
              </div>
            ) : (
              <GaugeComponent
                value={realtime ?? 50} // Default value jika realtime tidak tersedia
                type="radial"
                maxValue={maxCali ?? 100} // Default maxValue
                minValue={minCali ?? 0} // Default minValue
                arc={{
                  width: 0.15,
                  padding: 0,
                  cornerRadius: 1,
                  subArcs: [
                    {
                      length: 0.20,
                      // limit: batasbawah ?? 1,
                      color: "#EA4228",
                      showTick: true,
                    },
                    {
                      length: 0.20,
                      color: "#F5CD19",
                      showTick: true,
                    },
                    {
                      length: 0.20,
                      color: "#5BE12C",
                      showTick: true,
                    },
                    {
                      length: 0.20,
                      color: "#F5CD19",
                      showTick: true,
                    },
                    {
                      length: 0.20,
                      color: "#EA4228",
                      showTick: true,
                    },
                    // {
                    //   //length: 0.20,
                    //   limit : batasatas ?? 99,
                    //   color: "#EA4228",
                    //   showTick: true,
                    // },
                  ],
                }}
                labels={{
                  valueLabel: { style: { fontSize: "30px", fill: "#0A0E0A" } },
                }}
                pointer={{ animationDelay: 0 }}
              />
            )}
          </div>
        </div>

        <div className=" relative flex flex-col items-center w-full shadow rounded-md m-1 group bg-white">
          <p className="text-xl pt-6 font-bold mb-2"> Status</p>
          <div className="w-full border-t px-6 pt-2 pb-2">
            <p>1 Jam Terakhir</p>

            {isLoading ? (
              <div
                className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                role="status"
              >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Loading...
                </span>
              </div>
            ) : (
              <p className="text-lg font-bold p-2  mt-2 mb-4 border rounded-lg bg-[#F7F7F7] border-[#BFBFBF]">
                {" "}
                {now.trendNow ?? "-"}{" "}
              </p>
            )}
          </div>
          <div className="absolute top-0 left-0 w-full bg-white shadow-lg rounded-lg z-50 opacity-0 transform scale-95 transition-all duration-300 group-hover:opacity-100 group-hover:scale-105 pointer-events-none group-hover:pointer-events-auto bg-white">
            <p className="text-xl pt-6 font-bold mb-2"> Status Flow</p>
            <div className="w-full border-t px-6 pt-2 pb-2 ">
              <p>1 Jam Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold p-2  mt-2 mb-4 border rounded-lg bg-[#F7F7F7] border-[#BFBFBF]">
                  {" "}
                  {now.trendNow ?? "-"}
                </p>
              )}
            </div>

            <div className="w-full border-t px-6 pt-2 pb-2  ">
              <p>1 Hari Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold p-2  mt-2 mb-4 border rounded-lg bg-[#F7F7F7] border-[#BFBFBF]">
                  {" "}
                  {daily.trendDaily ?? "-"}{" "}
                </p>
              )}
            </div>

            <div className="w-full border-t px-6 pt-2 pb-2  ">
              <p>1 Bulan Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold p-2  mt-2 mb-4 border rounded-lg bg-[#F7F7F7] border-[#BFBFBF]">
                  {monthly.trendMonthly ?? "-"}{" "}
                </p>
              )}
            </div>
            <div className="w-full border-t px-6 pt-2 pb-2  ">
              <p>1 Tahun Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold p-2  mt-2 mb-4 border rounded-lg bg-[#F7F7F7] border-[#BFBFBF] ">
                  {yearly.trendYearly ?? "-"}{" "}
                </p>
              )}
            </div>
          </div>
          <style>{`
            .group:hover .group-hover\\:block {
              display: block;
            }
          `}</style>
        </div>

        <div className="relative  flex-col items-center  w-full shadow rounded-md m-1 group bg-white">
          <p className="text-xl pt-6 font-bold mb-2 ">Data Out of Limit</p>
          <div className="w-full border-t px-6 pt-2 pb-2  ">
            <p>1 Jam Terakhir</p>
            {isLoading ? (
              <div
                className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                role="status"
              >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Loading...
                </span>
              </div>
            ) : (
              <p className="text-1xl font-bold p-2  mt-2 mb-4 border rounded-lg bg-[#F7F7F7] border-[#BFBFBF]">
                {now.outOfLimitNow?.hours ?? 0}h{" "}
                {now.outOfLimitNow?.minutes ?? 0}m{" "}
                {now.outOfLimitNow?.seconds ?? 0}s
              </p>
            )}
          </div>

          <div className="absolute top-0 left-0 w-full shadow-lg rounded-lg z-50 opacity-0 transform scale-95 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto bg-white">
            <p className="text-xl pt-6 font-bold ">Data Out of Limit</p>
            <div className="w-full border-t px-6 pt-2 pb-2  ">
              <p>1 Jam Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold p-2  mt-2 mb-4 border rounded-lg bg-[#F7F7F7] border-[#BFBFBF]">
                  {now.outOfLimitNow?.hours ?? 0}h{" "}
                  {now.outOfLimitNow?.minutes ?? 0}m{" "}
                  {now.outOfLimitNow?.seconds ?? 0}s
                </p>
              )}
            </div>
            <div className="w-full border-t px-6 pt-2 pb-2 ">
              <p>1 Hari Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold p-2  mt-2 mb-4 border rounded-lg bg-[#F7F7F7] border-[#BFBFBF]">
                  {daily.outOfLimitDaily?.hours ?? 0}h{" "}
                  {daily.outOfLimitDaily?.minutes ?? 0}m{" "}
                  {daily.outOfLimitDaily?.seconds ?? 0}s
                </p>
              )}
            </div>

            <div className="w-full border-t px-6 pt-2 pb-2 ">
              <p>1 Bulan Terakhir</p>
              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold p-2  mt-2 mb-4 border rounded-lg bg-[#F7F7F7] border-[#BFBFBF]">
                  {monthly.outOfLimitMonthly?.hours ?? 0}h{" "}
                  {monthly.outOfLimitMonthly?.minutes ?? 0}m{" "}
                  {monthly.outOfLimitMonthly?.seconds ?? 0}s
                </p>
              )}
            </div>

            <div className="w-full border-t px-6 pt-2 pb-2 ">
              <p>1 Tahun Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold p-2  mt-2 mb-4 border rounded-lg bg-[#F7F7F7] border-[#BFBFBF]">
                  {" "}
                  {yearly.outOfLimitYearly?.hours ?? 0}h{" "}
                  {yearly.outOfLimitYearly?.minutes ?? 0}m{" "}
                  {yearly.outOfLimitYearly?.seconds ?? 0}s
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          className={`relative flex-col items-center w-full shadow rounded-md m-1 group cursor-pointer ${
            activeIdx === 0 ? "bg-[#262937] text-white" : "bg-white"
          }`}
          onClick={() =>
            handleCardClick(0, {
              sensor: titleCard,
              rule: "min",
            })
          }
        >
          <p className="text-xl pt-6 font-bold mb-2 ">Min</p>
          <div className="w-full border-t px-6 pt-2 pb-2">
            <p>1 Jam Terakhir</p>

            {isLoading ? (
              <div
                className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                role="status"
              >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Loading...
                </span>
              </div>
            ) : (
              <p
                className={`text-lg font-bold p-2  mt-2 mb-4 ${
                  activeIdx === 0
                    ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                    : "bg-[#F7F7F7] border-[#BFBFBF]"
                }  border rounded-lg`}
              >
                {formatNumber(now.minNow ?? "-").value}{" "}
                {symbolDesicion(titleCard)}{" "}
              </p>
            )}
          </div>
          <div
            className={`absolute top-0 w-full left-0 shadow-lg rounded-lg z-50 opacity-0 transform scale-95 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto ${
              activeIdx === 0 ? "bg-[#262937] text-white" : "bg-white"
            }`}
          >
            <p className="text-xl pt-6 font-bold p-2">Min</p>
            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Jam Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 0
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  }  border rounded-lg`}
                >
                  {formatNumber(now.minNow ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}{" "}
                </p>
              )}
            </div>

            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Hari Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 0
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  }  border rounded-lg`}
                >
                  {formatNumber(daily.minDaily ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}
                </p>
              )}
            </div>

            {/* Data 1 Bulan Terakhir */}
            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Bulan Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 0
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  }  border rounded-lg`}
                >
                  {formatNumber(monthly.minMonthly ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}
                </p>
              )}
            </div>

            {/* Data 1 Tahun Terakhir */}
            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Tahun Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 0
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  }  border rounded-lg`}
                >
                  {formatNumber(yearly.minYearly ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}
                </p>
              )}
            </div>
          </div>

          {/* Hover effect to display popup */}
          <style>{`
            .group:hover .group-hover\\:block {
              display: block;
            }
          `}</style>
        </div>

        <div
          className={`relative  flex-col items-center w-full shadow rounded-md m-1 group cursor-pointer ${
            activeIdx === 1 ? "bg-[#262937] text-white" : "bg-white"
          }`}
          onClick={() =>
            handleCardClick(1, {
              sensor: titleCard,
              rule: "max",
            })
          }
        >
          <p className="text-xl pt-6 font-bold mb-2 ">Max</p>
          <div className="w-full border-t px-6 pt-2 pb-2">
            <p>1 Jam Terakhir</p>

            {isLoading ? (
              <div
                className="inline-block h-8 w-8  animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                role="status"
              >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Loading...
                </span>
              </div>
            ) : (
              <p
                className={`text-lg font-bold p-2  mt-2 mb-4 ${
                  activeIdx === 1
                    ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                    : "bg-[#F7F7F7] border-[#BFBFBF]"
                }  border rounded-lg`}
              >
                {formatNumber(now.maxNow ?? "-").value}{" "}
                {symbolDesicion(titleCard)}{" "}
              </p>
            )}
          </div>
          <div
            className={`absolute top-0 w-full left-0 shadow-lg rounded-lg z-50 opacity-0 transform scale-95 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto ${
              activeIdx === 1 ? "bg-[#262937] text-white" : "bg-white"
            }`}
          >
            <p className="text-xl pt-6 font-bold p-2">Max</p>
            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Jam Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 1
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  }  border rounded-lg`}
                >
                  {formatNumber(now.maxNow ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}{" "}
                </p>
              )}
            </div>

            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Hari Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 1
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  }  border rounded-lg`}
                >
                  {formatNumber(daily.maxDaily ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}
                </p>
              )}
            </div>

            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Bulan Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 1
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  }  border rounded-lg`}
                >
                  {formatNumber(monthly.maxMonthly ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}
                </p>
              )}
            </div>

            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Tahun Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 1
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  }  border rounded-lg`}
                >
                  {formatNumber(yearly.maxYearly ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}
                </p>
              )}
            </div>
          </div>
          <style>{`
            .group:hover .group-hover\\:block {
              display: block;
            }
          `}</style>
        </div>

        <div
          className={`relative  flex-col items-center w-full shadow rounded-md m-1 group  cursor-pointer ${
            activeIdx === 2 ? "bg-[#262937] text-white" : "bg-white"
          }`}
          onClick={() =>
            handleCardClick(2, {
              sensor: titleCard,
              rule: "avg",
            })
          }
        >
          <p className="text-xl pt-6 font-bold mb-2 ">Average</p>
          <div className="w-full border-t px-6 pt-2 pb-2">
            <p>1 Jam Terakhir</p>

            {isLoading ? (
              <div
                className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                role="status"
              >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Loading...
                </span>
              </div>
            ) : (
              <p
                className={`text-lg font-bold p-2  mt-2 mb-4 ${
                  activeIdx === 2
                    ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                    : "bg-[#F7F7F7] border-[#BFBFBF]"
                }  border rounded-lg `}
              >
                {formatNumber(now.avgNow ?? "-").value}{" "}
                {symbolDesicion(titleCard)}{" "}
              </p>
            )}
          </div>

          <div
            className={`absolute top-0 w-full left-0 shadow-lg rounded-lg z-50 opacity-0 transform scale-95 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto ${
              activeIdx === 2 ? "bg-[#262937] text-white" : "bg-white"
            }`}
          >
            <p className="text-xl pt-6 font-bold p-2">Average</p>
            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Jam Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 2
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  }  border rounded-lg `}
                >
                  {formatNumber(now.avgNow ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}{" "}
                </p>
              )}
            </div>
            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Hari Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 2
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  } border rounded-lg `}
                >
                  {formatNumber(daily.avgDaily ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}{" "}
                </p>
              )}
            </div>

            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Bulan Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 2
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  } border rounded-lg `}
                >
                  {formatNumber(monthly.avgMonthly ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}{" "}
                </p>
              )}
            </div>

            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Tahun Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4  ${
                    activeIdx === 2
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  } border rounded-lg  `}
                >
                  {" "}
                  {formatNumber(yearly.avgYearly ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          className={`relative flex-col items-center w-full shadow rounded-md m-1 group cursor-pointer ${
            activeIdx === 3 ? "bg-[#262937] text-white" : "bg-white"
          }`}
          onClick={() =>
            handleCardClick(3, {
              sensor: titleCard,
              rule: "stddev",
            })
          }
        >
          <p className="text-xl pt-6 font-bold mb-2 ">Standard Deviasi</p>
          <div className="w-full border-t px-6 pt-2 pb-2">
            <p>1 Jam Terakhir</p>

            {isLoading ? (
              <div
                className="inline-block h-8 w-8  animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                role="status"
              >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Loading...
                </span>
              </div>
            ) : (
              <p
                className={`text-lg font-bold p-2  mt-2 mb-4 ${
                  activeIdx === 3
                    ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                    : "bg-[#F7F7F7] border-[#BFBFBF]"
                }  border rounded-lg`}
              >
                {formatNumber(now.stddevNow ?? "-").value}{" "}
                {symbolDesicion(titleCard)}{" "}
              </p>
            )}
          </div>
          <div
            className={`absolute top-0 w-full left-0 shadow-lg rounded-lg z-50 opacity-0 transform scale-95 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto ${
              activeIdx === 3 ? "bg-[#262937] text-white" : "bg-white"
            }`}
          >
            <p className="text-xl pt-6 font-bold p-2">Standard Deviasi</p>
            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Jam Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 3
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  }  border rounded-lg`}
                >
                  {formatNumber(now.stddevNow ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}{" "}
                </p>
              )}
            </div>

            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Hari Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 3
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  }  border rounded-lg`}
                >
                  {formatNumber(daily.stddevDaily ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}
                </p>
              )}
            </div>
            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Bulan Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 3
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  }  border rounded-lg`}
                >
                  {formatNumber(monthly.stddevMonthly ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}
                </p>
              )}
            </div>

            <div className="w-full border-t px-6 pt-2 pb-2">
              <p>1 Tahun Terakhir</p>

              {isLoading ? (
                <div
                  className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                  role="status"
                >
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                  </span>
                </div>
              ) : (
                <p
                  className={`text-lg font-bold p-2  mt-2 mb-4 ${
                    activeIdx === 3
                      ? "bg-black bg-opacity-10 border-[#BFBFBF]"
                      : "bg-[#F7F7F7] border-[#BFBFBF]"
                  }  border rounded-lg`}
                >
                  {formatNumber(yearly.stddevYearly ?? "-").value}{" "}
                  {symbolDesicion(titleCard)}
                </p>
              )}
            </div>
          </div>

          <style>{`
            .group:hover .group-hover\\:block {
              display: block;
            }
          `}</style>
        </div>
      </div>

      <div className="grid grid-rows-2 grid-flow-col justify-between gap-y-2 gap-x-5 p-4  ">
        <div className=" items-center  shadow rounded-md m-1 group bg-white"></div>

        {/*Data Anomali*/}

        {/* data MIN */}

        {/*Data Max */}

        {/*Data AVG */}

        {/*Data STD DEV */}
      </div>
    </div>
  );
};

AnaliticCardSmall.propTypes = {
  now: PropTypes.object.isRequired,
  daily: PropTypes.object.isRequired,
  monthly: PropTypes.object.isRequired,
  yearly: PropTypes.object.isRequired,
  narasiNow: PropTypes.string,
  narasiDaily: PropTypes.string,
  narasiMonthly: PropTypes.string,
  narasiYearly: PropTypes.string,
  anomaliDaily: PropTypes.string, // Ubah dari number ke string
  anomaliMonthly: PropTypes.string, // Ubah dari number ke string
  anomaliYearly: PropTypes.string, // Ubah dari number ke string
  isLoading: PropTypes.bool.isRequired,
  isInitialLoad: PropTypes.bool.isRequired,
  titleCard: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  selectedPeriod: PropTypes.string.isRequired,
  dataCard: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
};

export default AnaliticCardSmall;
