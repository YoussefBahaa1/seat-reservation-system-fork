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
  const isAuthenticated = Boolean(
    sessionStorage.getItem('accessToken') && localStorage.getItem('userId')
  );

  const isLoginPage = location.pathname === "/";

  // Require authentication for protected screens
  const RequireAuth = ({ children }) => (
    isAuthenticated ? children : <Navigate to="/" replace />
  );

  // Keep users out of login when already authenticated
  const RedirectIfAuth = ({ children }) => (
    isAuthenticated ? <Navigate to="/home" replace /> : children
  );

  return (
    <>
      {isAuthenticated && !isLoginPage && <JwtHeartbeat />}
      <Routes>
        <Route
          exact
          path="/"
          element={(
            <RedirectIfAuth>
              <LoginPage />
            </RedirectIfAuth>
          )}
        />
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/floor" element={<RequireAuth><Floor /></RequireAuth>} />
        <Route path="/desks" element={<RequireAuth><Booking /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
        <Route path="/mybookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
        <Route path="/manageseries" element={<RequireAuth><ManageSeries /></RequireAuth>} />
        <Route path="/createseries" element={<RequireAuth><CreateSeries /></RequireAuth>} />
        <Route path='/freedesks' element={<RequireAuth><FreeDesks /></RequireAuth>} />
        <Route path='/roomSearch' element={<RequireAuth><RoomSearch /></RequireAuth>} />
        <Route path='/colleagues' element={<RequireAuth><Colleagues /></RequireAuth>} />
        <Route path="/carpark" element={<RequireAuth><CarparkOverview /></RequireAuth>} />
        <Route path="/favourites" element={<RequireAuth><Favourites /></RequireAuth>} />
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/home" : "/"} replace />}
        />
      </Routes>
    </>
  );
}

function App() {
  const basename = React.useMemo(() => {
    if (process.env.REACT_APP_BASENAME) return process.env.REACT_APP_BASENAME;
    return window.location.pathname.startsWith('/frontend-main') ? '/frontend-main' : '/';
  }, []);

  return (
    <Router basename={basename}>
      <AppRoutes />
    </Router>
  );
}

export default App;
