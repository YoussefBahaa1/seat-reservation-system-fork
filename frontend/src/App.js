import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Home from './Components/Home/Home';
import LoginPage from './Components/LoginForm/LoginPage';
import Floor from './Components/Floors/Floor';
import Booking from './Components/Home/Booking/Booking';
import AdminPage from './Components/AdminPanel/AdminPage';
import MyBookings from './Components/Home/MyBookings';
import ManageSeries from './Components/Series/ManageSeries';
import CreateSeries from './Components/Series/CreateSeries';
import FreeDesks from './Components/Home/FreeDesks';
import RoomSearch from './Components/Home/RoomSearch';
import Colleagues from './Components/Home/Colleagues';
import Favourites from './Components/Home/Favourites';
import JwtHeartbeat from './Components/misc/JwtHearbeat';
import CarparkOverview from './Components/Carpark/CarparkOverview';
import './i18n';

function AppRoutes() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/";

  return (
    <>
      {!isLoginPage && <JwtHeartbeat />}
      <Routes>
        <Route exact path="/" element={<LoginPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/floor" element={<Floor />} />
        <Route path="/desks" element={<Booking />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/mybookings" element={<MyBookings />} />
        <Route path="/manageseries" element={<ManageSeries />} />
        <Route path="/createseries" element={<CreateSeries />} />
        <Route path='/freedesks' element={<FreeDesks />} />
        <Route path='/roomSearch' element={<RoomSearch />} />
        <Route path='/colleagues' element={<Colleagues />} />
        <Route path="/carpark" element={<CarparkOverview />} />
        <Route path="/favourites" element={<Favourites />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
