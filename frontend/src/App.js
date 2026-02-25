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
import SupportContacts from './Components/Home/SupportContacts';
import JwtHeartbeat from './Components/misc/JwtHearbeat';
import CarparkOverview from './Components/Carpark/CarparkOverview';
import DefectDashboard from './Components/Defects/DefectDashboard';
import './i18n';

function AppRoutes() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/";
  let hasSessionToken = Boolean(sessionStorage.getItem('accessToken'));
  if (!hasSessionToken) {
    try {
      const legacyHeaders = JSON.parse(sessionStorage.getItem('headers') || 'null');
      hasSessionToken = Boolean(
        legacyHeaders &&
        (legacyHeaders.Authorization || legacyHeaders.authorization)
      );
    } catch {
      hasSessionToken = false;
    }
  }
  const isAuthenticated = hasSessionToken;
  const canAccessAdmin = localStorage.getItem('admin') === 'true';
  const canAccessDefects =
    localStorage.getItem('admin') === 'true' ||
    localStorage.getItem('servicePersonnel') === 'true';

  return (
    <>
      {!isLoginPage && <JwtHeartbeat />}
      <Routes>
        <Route exact path="/" element={<LoginPage />} />
        <Route path="/home" element={isAuthenticated ? <Home /> : <Navigate to="/" replace />} />
        <Route path="/floor" element={isAuthenticated ? <Floor /> : <Navigate to="/" replace />} />
        <Route path="/desks" element={isAuthenticated ? <Booking /> : <Navigate to="/" replace />} />
        <Route
          path="/admin"
          element={isAuthenticated && canAccessAdmin ? <AdminPage /> : <Navigate to={isAuthenticated ? "/home" : "/"} replace />}
        />
        <Route path="/mybookings" element={isAuthenticated ? <MyBookings /> : <Navigate to="/" replace />} />
        <Route path="/manageseries" element={isAuthenticated ? <ManageSeries /> : <Navigate to="/" replace />} />
        <Route path="/createseries" element={isAuthenticated ? <CreateSeries /> : <Navigate to="/" replace />} />
        <Route path='/freedesks' element={isAuthenticated ? <FreeDesks /> : <Navigate to="/" replace />} />
        <Route path='/roomSearch' element={isAuthenticated ? <RoomSearch /> : <Navigate to="/" replace />} />
        <Route path='/colleagues' element={isAuthenticated ? <Colleagues /> : <Navigate to="/" replace />} />
        <Route path='/supportContacts' element={isAuthenticated ? <SupportContacts /> : <Navigate to="/" replace />} />
        <Route path="/carpark" element={isAuthenticated ? <CarparkOverview /> : <Navigate to="/" replace />} />
        <Route path="/favourites" element={isAuthenticated ? <Favourites /> : <Navigate to="/" replace />} />
        <Route
          path="/defects"
          element={isAuthenticated && canAccessDefects ? <DefectDashboard /> : <Navigate to={isAuthenticated ? "/home" : "/"} replace />}
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/home" : "/"} replace />} />
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
