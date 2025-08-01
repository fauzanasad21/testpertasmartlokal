import * as React from "react";
import MenuIcon from "@mui/icons-material/Menu";
import Cookies from "js-cookie";
import { Link, useNavigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import OpacityIcon from "@mui/icons-material/Opacity";
import AirIcon from "@mui/icons-material/Air";
import SpeedIcon from "@mui/icons-material/Speed";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import BoltIcon from "@mui/icons-material/Bolt";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import Logo from "../../assets/newLogoPutih.svg";
import logoTutup from "../../assets/newLogoPutih.svg";
import {
  Sidebar,
  Menu,
  MenuItem,
  SubMenu,
} from "react-pro-sidebar";
import { useState, useEffect } from "react";
import "../RootLayout.css";


const SidebarRoot = () => {
  const navigate = useNavigate();
  // const { collapseSidebar, collapsed } = useProSidebar();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoClick = () => {
    setIsCollapsed(!isCollapsed);
  };


  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch(
        "http://localhost:9921/api/logout",
        {
          method: "POST",
          credentials: "include", // Sertakan cookie dengan permintaan
        }
      );

      const data = await response.json();
      //console.log("Logout response:", data); // Log respons untuk debugging

      if (response.ok) {

        navigate("/login", { replace: true });
      } else {
        console.error("Logout gagal, silakan coba lagi.");
      }
    } catch (error) {
      console.error("Terjadi kesalahan saat logout:", error);
    } finally {
      setIsLoggingOut(false);
    }

  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      style={{ display: "flex", height: "100vh" }}
      className="sticky-sidebar"
    >
      {!isMobile && (
        <Sidebar backgroundColor="#262937" collapsed={isCollapsed}>
          <Menu
            menuItemStyles={{
              button: ({ active, disabled }) => ({
                backgroundColor: active ? "#64748B" : "#262937",
                color: disabled ? "#c1c1c1" : "#fff",
                "&:hover": {
                  backgroundColor: "#64748B",
                  color: "#fff",
                },
              }),
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <img
                src={isCollapsed ? logoTutup : Logo}
                className="cursor-pointer"
                alt="logo"
                style={{
                  width: isCollapsed ? "100px" : "200px",
                  padding: "10px",
                }}
                onClick={handleLogoClick}
              />
            </div>
            <MenuItem
              icon={<DashboardIcon />}
              className="text-gray-100"
              component={<Link to="/dashboard" />}
            >
              Dashboard
            </MenuItem>
            <SubMenu
              label="Analytics"
              icon={<AnalyticsIcon />}
              className="text-gray-100"
            >
              <MenuItem
                icon={<SpeedIcon />}
                className="text-gray-100"
                component={<Link to="/analytic/pressure" />}
              >
                Pressure
              </MenuItem>
              <MenuItem
                icon={<ThermostatIcon />}
                className="text-gray-100"
                component={<Link to="/analytic/temperature" />}
              >
                Temperature
              </MenuItem>
              <MenuItem
                icon={<AirIcon />}
                className="text-gray-100"
                component={<Link to="/analytic/flow" />}
              >
                Flow
              </MenuItem>
              <MenuItem
                icon={<BoltIcon />}
                className="text-gray-100"
                component={<Link to="/analytic/power" />}
              >
                Power Potential
              </MenuItem>
              <MenuItem
                icon={<OpacityIcon />}
                className="text-gray-100"
                component={<Link to="/analytic/dryness" />}
              >
                Dryness Steam
              </MenuItem>
            </SubMenu>
            <SubMenu
              label="Settings"
              icon={<SettingsIcon />}
              className="text-gray-100"
            >
              <MenuItem
                icon={<TuneIcon />}
                className="text-gray-100"
                component={<Link to="/limit" />}
              >
                Limit
              </MenuItem>
              <MenuItem
                icon={<TuneIcon />}
                className="text-gray-100"
                component={<Link to="/calibration" />}
              >
                Calibration
              </MenuItem>
              <MenuItem
                  icon={<TuneIcon />}
                  className="text-gray-100"
                  component={<Link to="/FormDtaTrng" />}
                >
                  Data Real Lapangan
                </MenuItem>
            </SubMenu>
            <MenuItem
              icon={<PowerSettingsNewIcon />}
              className="text-gray-100"
              onClick={handleLogout}
            >
              {isLoggingOut ? (
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
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
              ) : (
                "Logout"
              )}
            </MenuItem>
          </Menu>
        </Sidebar>
      )}

      {isMobile && (
        <div style={{ display: "flex", height: "100%", minHeight: "400px" }}>
          <Sidebar
            onBackdropClick={() => setToggled(false)}
            toggled={toggled}
            breakPoint="always"
            backgroundColor="#262937"
          >
            <Menu
              menuItemStyles={{
                button: ({ active, disabled }) => ({
                  backgroundColor: active ? "#64748B" : "#262937",
                  color: disabled ? "#c1c1c1" : "#fff",
                  "&:hover": {
                    backgroundColor: "#64748B",
                    color: "#fff",
                  },
                }),
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <img
                  src={Logo}
                  className="cursor-pointer"
                  alt="logo"
                  style={{ width: "200px", padding: "10px" }}
                  onClick={() => setToggled(false)}
                />
              </div>

              <MenuItem icon={<DashboardIcon />} className="text-gray-100" component={<Link to="/dashboard" />}>
                Dashboard
              </MenuItem>
              <SubMenu
                label="Analytics"
                icon={<AnalyticsIcon />}
                className="text-gray-100"
              >
                <MenuItem icon={<OpacityIcon />} className="text-gray-100" component={<Link to="/analytic/dryness" />}>
                  Dryness Steam
                </MenuItem>
                <MenuItem icon={<AirIcon />} className="text-gray-100" component={<Link to="/analytic/flow" />}>
                  Flow
                </MenuItem>
                <MenuItem icon={<SpeedIcon />} className="text-gray-100" component={<Link to="/analytic/pressure" />}>
                  Pressure
                </MenuItem>
                <MenuItem icon={<ThermostatIcon />} className="text-gray-100" component={<Link to="/analytic/temperature" />}>
                  Temperature
                </MenuItem>
                <MenuItem icon={<BoltIcon />} className="text-gray-100" component={<Link to="/analytic/power" />}>
                  Power Potential
                </MenuItem>

              </SubMenu>
              <SubMenu
                label="Settings"
                icon={<SettingsIcon />}
                className="text-gray-100"
              >
                <MenuItem icon={<TuneIcon />} className="text-gray-100" component={<Link to="/limit" />}>
                  Limit
                </MenuItem>
                <MenuItem icon={<TuneIcon />} className="text-gray-100" component={<Link to="/calibration" />}>
                  Calibration
                </MenuItem>
                <MenuItem
                  icon={<TuneIcon />}
                  className="text-gray-100"
                  component={<Link to="/FormDtaTrng" />}
                >
                  Data Real Lapangan
                </MenuItem>
              </SubMenu>
              <MenuItem
                icon={<PowerSettingsNewIcon />}
                className="text-gray-100"
                onClick={handleLogout}
              >
                {isLoggingOut ? (
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
                      d="M4 12a8 8 0 018-8v8h8a8 8 0 11-8-8z"
                    ></path>
                  </svg>
                ) : (
                  "Logout"
                )}
              </MenuItem>
            </Menu>
          </Sidebar>

          <main style={{ display: "flex" }}>
            {!toggled && (
              <button
                className="mobile-toggle-button"
                onClick={() => setToggled(!toggled)}
                style={{
                  position: "fixed",
                  top: 10,
                  left: 10,
                  zIndex: 1000,
                  backgroundColor: "#262937",
                  color: "white",
                  border: "none",
                  padding: "10px",
                  borderRadius: "5px",
                }}
              >
                <MenuIcon />
              </button>
            )}
          </main>
        </div>
      )}
    </div>
  );
};

export default SidebarRoot;
