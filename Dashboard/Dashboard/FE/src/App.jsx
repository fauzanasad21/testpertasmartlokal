import { Outlet } from 'react-router-dom'; 
import './App.css';

function App() {

  return (
    <div className="flex flex-col w-full">
      <Outlet />
    </div>
  );
}

export default App;
