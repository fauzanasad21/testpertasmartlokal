import {React, useState} from 'react';
import { Link, useLocation } from 'react-router-dom';
import Hamburger from 'hamburger-react';
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import 'react-pro-sidebar/dist/css/styles.css';

export default function Header() {
  const location = useLocation(); // Get current route path
  const [isOpen, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false);
  const getTitle = () => {
    switch (location.pathname) {
      case "/dashboard":
        return "Dashboard";
      case "/analytic/flow":
        return "Flow Analytics";
      case "/analytic/temperature":
        return "Temperature Analytics";
      case "/analytic/pressure":
        return "Pressure Analytics";
      case "/analytic/dryness":
        return "Dryness Analytics";
      case "/analytic/power":
        return "Power Analytics";
      case "/kalibrasi":
        return "Kalibrasi";
      case "/batas":
        return "Batas Settings";
      default:
        return "Smart Monitoring";
    }
  };



  return (
<div style={{ display: "flex", height: "100vh" }}>
<Sidebar collapsed={collapsed}>
        <Menu>
        <MenuItem
            component={<Link to="/" className="link" />}
            className="menu1"

          >            <h2>QUICKPAY</h2>
          </MenuItem>
          <MenuItem>Dashboard</MenuItem>

          <SubMenu label="Analytics">

            <MenuItem>Flow</MenuItem>
            <MenuItem>Temperature</MenuItem>
            <MenuItem>Pressure</MenuItem>
            <MenuItem>Dryness</MenuItem>
            <MenuItem>Power</MenuItem>
          </SubMenu>
          <MenuItem>Kalibrasi</MenuItem>
          <MenuItem>Batas</MenuItem>
        </Menu>
      </Sidebar>

</div>
  );
}
