import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar';
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ArticleIcon from '@mui/icons-material/Article';
import InfoIcon from '@mui/icons-material/Info';
import { Outlet, Link } from "react-router-dom";
import { useTheme } from '@mui/material/styles';

export default function DenseAppBar() {
    const [toggled, setToggled] = React.useState(false);
    const [selectedTitle, setSelectedTitle] = React.useState("Home");
    const theme = useTheme();

    const handleMenuItemClick = (title) => {
        setSelectedTitle(title);
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <Sidebar
                        rootStyles={{
                            background: theme.palette.background.paper,  // Apply the primary color to the sidebar
                            color: "black"
                        }}
                        onBackdropClick={() => setToggled(false)}
                        toggled={toggled}
                        breakPoint="all"
                    >
                        <Menu>
                            <h4 style={{ margin: 'auto', marginTop: '10px', textAlign: 'center' }}>Unpad x Pertamina Geothermal Energy</h4>
                            <MenuItem icon={<HomeOutlinedIcon />} component={<Link to="/" />} onClick={() => handleMenuItemClick("Home")}> Home</MenuItem>
                            <MenuItem icon={<ArticleIcon />} component={<Link to="/blog" />} onClick={() => handleMenuItemClick("Blog List")}> Blog list</MenuItem>
                            <MenuItem icon={<InfoIcon />} component={<Link to="/about" />} onClick={() => handleMenuItemClick("About")}> About</MenuItem>
                            <MenuItem icon={<InfoIcon />} component={<Link to="/dashboard" />} onClick={() => handleMenuItemClick("Dashboard")}> Dashboard</MenuItem>
                        </Menu>
                    </Sidebar>
                    <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }} onClick={() => setToggled(!toggled)}>
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" color="inherit" component="div">
                        {selectedTitle}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Outlet />
        </Box>
    );
}
