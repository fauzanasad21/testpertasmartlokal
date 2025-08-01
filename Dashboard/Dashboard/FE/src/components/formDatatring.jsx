import React from 'react';
import PropTypes from 'prop-types';

const InputForm = ({ data, onChange, onSave }) => {
  const handleInputChange = (e, field) => {
    const value = e.target.value;
    if (value === "" || !isNaN(value)) {
      onChange(field, value === "" ? "" : parseFloat(value)); // Kirim nilai ke parent
    }
  };

  return (
    <div className="card bg-white rounded-2xl px-6 py-8 my-6  mx-auto">

      <div className="card-body grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Temperature Input */}
        <div className="flex flex-col items-center">
          <h3 className="text-[18px] font-medium mb-2" style={{ userSelect: 'none' }}>Temperature (C)</h3>
          <input
            className="border-[#E5E5E5] border-2 text-center text-[32px] font-medium w-full h-[80px] mb-4 sm:mb-0"
            type="number"
            value={data.temperature !== null ? data.temperature : ""}
            placeholder="Temperature"
            onChange={(e) => handleInputChange(e, 'temperature')}
          />
        </div>

        {/* Flow Input */}
        <div className="flex flex-col items-center">
          <h3 className="text-[18px] font-medium mb-2" style={{ userSelect: 'none' }}>Flow (Ton/h)</h3>
          <input
            className="border-[#E5E5E5] border-2 text-center text-[32px] font-medium w-full h-[80px] mb-4 sm:mb-0"
            type="number"
            value={data.flow !== null ? data.flow : ""}
            placeholder="Flow"
            onChange={(e) => handleInputChange(e, 'flow')}
          />
        </div>

        {/* Pressure Input */}
        <div className="flex flex-col items-center">
          <h3 className="text-[18px] font-medium mb-2" style={{ userSelect: 'none' }}>Pressure (Barg)</h3>
          <input
            className="border-[#E5E5E5] border-2 text-center text-[32px] font-medium w-full h-[80px] mb-4 sm:mb-0"
            type="number"
            value={data.pressure !== null ? data.pressure : ""}
            placeholder="Pressure"
            onChange={(e) => handleInputChange(e, 'pressure')}
          />
        </div>

        {/* Dryness Input */}
        <div className="flex flex-col items-center">
          <h3 className="text-[18px] font-medium mb-2" style={{ userSelect: 'none' }}>Dryness (%)</h3>
          <input
            className="border-[#E5E5E5] border-2 text-center text-[32px] font-medium w-full h-[80px] mb-4 sm:mb-0"
            type="number"
            value={data.dryness !== null ? data.dryness : ""}
            placeholder="Dryness"
            onChange={(e) => handleInputChange(e, 'dryness')}
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-center col-span-2">
          <button
            className="bg-[#616161] hover:bg-[#383B4C] text-white border-2 rounded-lg text-center text-2xl font-medium w-full lg:w-[30%] h-[80px] mb-4 sm:mb-0"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

InputForm.propTypes = {
  data: PropTypes.shape({
    temperature: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    flow: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    pressure: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    dryness: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default InputForm;
