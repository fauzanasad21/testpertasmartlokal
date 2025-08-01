
import { Outlet } from 'react-router-dom'; 
import SidebarRoot from './sidebar/Sidebar';  
import './RootLayout.css'
import Footer from '../components/Footer';

const RootLayout = () => {
  //console.log('Rendering RootLayout');  
  return (
    <div className="layout-container">
      <SidebarRoot/>
      <div className="content-container">
      <main className="main-content">
        <Outlet /> 
      </main>
      <Footer/>
    </div></div>
  );
};

export default RootLayout;
