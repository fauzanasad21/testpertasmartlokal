// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/newLogoHitam.svg";
import ID from "../assets/ID.svg";
import Password from "../assets/Password.svg";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import PIN from "../assets/PIN.svg";

const Register = () => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isOtpEnabled, setIsOtpEnabled] = useState(false);

  const navigate = useNavigate();

  // Fungsi untuk meng-handle registrasi (Langkah 1)
  const handleRegister = async () => {
    if (!id || !password) {
      setError("ID dan Password harus diisi.");
      return;
    }
    setIsRegistering(true);
    try {
      const response = await fetch("http://localhost:9921/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_name: id, password }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage("Registrasi berhasil. OTP telah dikirim ke email admin.");
        setIsOtpEnabled(true); // Aktifkan kolom OTP
      } else {
        setError(data.message || "Gagal mendaftar. Coba lagi.");
      }
    } catch (err) {
      setError("Gagal terhubung ke server. Coba lagi nanti.");
    } finally {
      setIsRegistering(false); // Selesai loading
    }
  };

  // Fungsi untuk meng-handle verifikasi OTP (Langkah 2)
  const handleVerifyOtp = async () => {
    if (!id || !pin) {
      setError("ID dan OTP harus diisi.");
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const response = await fetch("http://localhost:9921/api/verifyOtp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_name: id, pin_number: pin }),
      });
      const data = await response.json();

      if (response.ok) {
        setSuccessMessage("Verifikasi berhasil. Silakan login.");
      } else {
        setError(data.message || "Gagal verifikasi OTP. Coba lagi.");
      }
    } catch (err) {
      setError("Gagal terhubung ke server. Coba lagi nanti.");
    } finally {
      setIsVerifyingOtp(false); // Selesai loading
    }
  };

  const closeModal = () => {
    setError("");
    setMessage("");
    setSuccessMessage("");
  };

  return (
    <div className="flex flex-wrap">
      <div className="form text-center md:w-[50%] my-auto mx-auto">
        <img src={Logo} className="w-[80px] h-[80px] mx-auto " alt="Logo" />
        <h1 className="text-[28px] font-bold">Registrasi Pengguna Baru</h1>
        <p className="text-[20px] font-normal mt-4">
          Isi ID, Password, dan OTP untuk mendaftar
        </p>

        <div className="flex justify-center items-center mt-6">
          <div className="flex items-center h-[80px] w-[80%] border-2 border-gray-300 rounded-[10px]">
            <img
              src={ID}
              alt="ID Icon"
              className="h-[20px] w-[20px] ml-4 mr-2"
            />
            <input
              className={`h-full w-full pl-4 border-none outline-none text-[20px] font-normal ${
                id ? "text-black" : "text-[#616161]"
              }`}
              type="text"
              placeholder="ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={isOtpEnabled} // Disable ID input saat OTP diaktifkan
            />
          </div>
        </div>

        <div className="flex justify-center items-center mt-6">
          <div className="flex items-center h-[80px] w-[80%] border-2 border-gray-300 rounded-[10px] relative">
            <img
              src={Password}
              alt="Password Icon"
              className="h-[20px] w-[20px] ml-4 mr-2"
            />
            <input
              className={`h-full w-full pl-4 pr-12 border-none outline-none text-[20px] font-normal ${
                password ? "text-black" : "text-[#616161]"
              }`}
              type={showPassword ? "text" : "password"} // Mengubah tipe input berdasarkan state showPassword
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isOtpEnabled} // Disable Password input saat OTP diaktifkan
            />
            <button
              className="absolute right-4 top-1/2 transform -translate-y-1/2 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)} // Toggle showPassword state
              type="button"
            >
              {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
            </button>
          </div>
        </div>

        <div className="flex justify-center items-center mt-6">
          <div className="flex items-center h-[80px] w-[80%] border-2 border-gray-300 rounded-[10px] relative">
            <img
              src={PIN}
              alt="OTP Icon"
              className="h-[20px] w-[20px] ml-4 mr-2"
            />
            <input
              className={`h-full w-full pl-4 border-none outline-none text-[20px] font-normal ${
                pin ? "text-black" : "text-[#616161]"
              }`}
              type="text"
              placeholder="OTP"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={!isOtpEnabled} // Disable OTP input sebelum diaktifkan
            />
          </div>
        </div>

        <div className="flex justify-center items-center mt-7">
          <button
            className={`${
              (id && password && !isOtpEnabled) || (id && pin && isOtpEnabled)
                ? "bg-[black]"
                : "bg-[#616161]"
            } text-white h-[87px] w-[80%] rounded-[10px] text-[20px] font-medium flex justify-center items-center`}
            onClick={isOtpEnabled ? handleVerifyOtp : handleRegister}
            disabled={
              (isOtpEnabled
                ? !(id && pin)
                : !(id && password)) ||
              isRegistering ||
              isVerifyingOtp
            } // Disable button saat loading atau field tidak lengkap
          >
            {isRegistering || isVerifyingOtp ? (
              <svg className="animate-spin h-6 w-6 mr-2" viewBox="0 0 24 24">
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
            ) : isOtpEnabled ? (
              "Konfirmasi"
            ) : (
              "Verifikasi"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Error</h2>
            <p className="text-gray-700 mb-6">{error}</p>
            <button
              onClick={closeModal}
              className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h2 className="text-2xl font-semibold text-green-600 mb-4">Info</h2>
            <p className="text-gray-700 mb-6">{message}</p>
            <button
              onClick={closeModal}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h2 className="text-2xl font-semibold text-green-600 mb-4">Info</h2>
            <p className="text-gray-700 mb-6">{successMessage}</p>
            <button
              onClick={() => {
                closeModal();
                navigate("/login"); // Pindahkan user ke halaman login setelah modal ditutup
              }}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
