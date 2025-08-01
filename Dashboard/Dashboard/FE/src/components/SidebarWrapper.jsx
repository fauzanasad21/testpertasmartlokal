import React, { useState } from 'react';
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import 'react-pro-sidebar/dist/css/styles.css'; // Import CSS

const SidebarWrapper = () => {
  const [collapsed, setCollapsed] = useState(false); // Handle sidebar state

  const toggleSidebar = () => {
    setCollapsed(!collapsed); // Toggle state
  };

  return (
    <div>
      {/* Sidebar */}
      <Sidebar collapsed={collapsed}>
        <Menu>
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

      {/* Button to toggle sidebar */}
      <button onClick={toggleSidebar} className="fixed top-2 left-2 z-50">
        {collapsed ? 'Open' : 'Close'} Sidebar
      </button>
    </div>
  );
};

export default SidebarWrapper;
