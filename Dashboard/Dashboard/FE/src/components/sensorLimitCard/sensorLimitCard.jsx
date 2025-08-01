import PropTypes from "prop-types";

const SensorLimitCard = ({ name, icon, data, onChange, onSave, Cali }) => {

    switch (name){
        case 'Flow':
            break;
        case 'Temperature':
            break;
        case 'Pressure':
            break;
        case 'Power Prediction':
            break;
        case 'Dryness':
            break
    }


  return (
    <div className="card bg-white rounded-2xl px-0 py-3 my-6">
      <div className="card-header flex justify-between items-center border-b-2 border-b-[#F4F6F6] w-full px-8 pb-4">
        <h2 className="text-[22px] font-bold">Set Sensor {name}</h2>
        <img src={icon} alt={`${name} Icon`} />
      </div>
      <div className="card-body flex flex-wrap justify-around items-center px-8 py-4 pt-6">
        <input
          className="border-[#E5E5E5] border-2 text-center text-[48px] font-medium w-full md:w-[30%] h-[90px] mb-4 sm:mb-0"
          type="number"
          value={data.min !== null ? data.min : ""}
          placeholder="Min value"
          onChange={(e) => {
            const value = e.target.value;
            onChange("min", value === "" ? "" : parseFloat(value));
          }}
        />

        <p className="text-[48px] w-full md:w-auto text-center">-</p>

        <input
          className="border-[#E5E5E5] border-2 text-center text-[48px] font-medium w-full md:w-[30%] h-[90px] mb-4 sm:mb-0"
          type="number"
          value={data.max !== null ? data.max : ""}
          placeholder="Max value"
          onChange={(e) => {
            const value = e.target.value;
            onChange("max", value === "" ? "" : parseFloat(value));
          }}
        />
        <button
          className="bg-[#616161] hover:bg-[#383B4C] text-white border-2 rounded-lg text-center text-2xl font-medium w-full md:w-[30%] h-[90px] mb-4 sm:mb-0"
          onClick={onSave}
        >
          Save
        </button>
      </div>
    </div>
  );
};

SensorLimitCard.propTypes = {
  name: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  data: PropTypes.shape({
    min: PropTypes.number,
    max: PropTypes.number,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default SensorLimitCard;
