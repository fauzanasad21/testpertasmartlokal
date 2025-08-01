import React from 'react';
import { ProSidebar, Menu, MenuItem, SidebarHeader, SidebarContent } from 'react-pro-sidebar';
import HomeIcon from '@mui/material/Radio';
import ArticleIcon from '@mui/material/Table';
import InfoIcon from '@mui/material/Skeleton';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <ProSidebar breakPoint="md">
      <SidebarHeader>
        <div style={{ padding: '24px', fontWeight: 'bold', fontSize: '24px', textAlign: 'center' }}>
          My Dashboard
        </div>
      </SidebarHeader>
      <SidebarContent>
        <Menu iconShape="round">
          <MenuItem icon={<HomeIcon />}>
            Home
            <Link to="/" />
          </MenuItem>
          <MenuItem icon={<ArticleIcon />}>
            Blog List
            <Link to="/blog" />
          </MenuItem>
          <MenuItem icon={<InfoIcon />}>
            About
            <Link to="/about" />
          </MenuItem>
        </Menu>
      </SidebarContent>
    </ProSidebar>
  );
};

export default Sidebar;
