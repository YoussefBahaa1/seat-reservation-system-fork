import React, { useState, useEffect } from "react";
import { IoCalendarNumberOutline } from "react-icons/io5";
import { BsList } from "react-icons/bs";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { RiAdminFill } from "react-icons/ri";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaLock, FaBookmark } from "react-icons/fa";
import ChangePassword from "./ChangePassword";
import LogoutConfirmationModal from "./LogoutConfirmationModal";
import MfaSettings from "./MfaSettings";
import { CiLogout } from 'react-icons/ci';
import { MdGTranslate, MdSecurity } from 'react-icons/md';
import { AiFillPlusCircle } from 'react-icons/ai';
import { IoIosCheckbox, IoIosSettings, IoIosAlbums } from 'react-icons/io';
import { IoSearchSharp } from 'react-icons/io5';
import { HiOutlineSparkles } from 'react-icons/hi2';
import LaptopIcon from '@mui/icons-material/Laptop';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import { AiOutlineTeam } from "react-icons/ai";
import Defaults from "./Defaults";
import i18n from '../../i18n';

const SidebarComponent = () => {
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const [activeTab, setActiveTab] = useState('');//useState('calendar');
  const location = useLocation();
  const navigate = useNavigate();
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false);
  const [isDefaultsModalOpen, setIsDefaultsModalOpen] = useState(false);
  const [isMfaSettingsOpen, setIsMfaSettingsOpen] = useState(false);
  
  useEffect(() => {
    if (location.pathname === '/admin') {
      setActiveTab('admin');
      //setSeriesSubMenuOpen(false);
    }
    if (location.pathname === '/home') {
      setActiveTab('calendar');
      //setSeriesSubMenuOpen(false);
    }
    if (location.pathname === '/mybookings') {
      setActiveTab('bookings');
      //setSeriesSubMenuOpen(false);
      
    }
    if (location.pathname === '/manageseries' || location.pathname === '/createseries') {
      setActiveTab('series');
      //setSeriesSubMenuOpen(true);
    }
    if (location.pathname === '/freeDesks') {
      setActiveTab('freeDesks');
      //setSeriesSubMenuOpen(false);
    }

  }, [location.pathname, activeTab]);

  const handleClick = (name) => {
    switch (name) {
      case "collapse":
        setCollapsed(!collapsed);
        localStorage.setItem("sidebarCollapsed", !collapsed);
        break;

      case 'calendar':
        navigate("/home", { replace: true });
        break;

      case "admin":
        navigate("/admin", { replace: true });
        break;

      case "bookings":
        navigate('/mybookings', { replace: true });
        break;

      case 'freeDesks':
        navigate("/freeDesks", { replace: true });
        break;

      case 'roomSearch':
        navigate("/roomSearch", { replace: true });
        break;

      case "language":
        const currentLanguage = i18n.language;
        const newLanguage = currentLanguage === "en" ? "de" : "en";
        i18n.changeLanguage(newLanguage);
        const userId = localStorage.getItem('userId');
        if (userId) {
          localStorage.setItem(`language_${userId}`, newLanguage);
        }
        break;

      case 'changePassword':
        setIsChangePasswordModalOpen(true);
        break;

      case 'defaults':
        setIsDefaultsModalOpen(true);
        break;

      case 'colleagues':
        navigate("/colleagues", { replace: true });
        break;

      case 'logout':
        setIsLogoutConfirmationOpen(true);
        break;

      case 'mfaSettings':
        setIsMfaSettingsOpen(true);
        break;

      default:
        break;
    }
  };

  const handleCloseChangePasswordModal = () => {
    setIsChangePasswordModalOpen(false);
  };


  const handleCloseLogoutConfirmationModal = () => {
    setIsLogoutConfirmationOpen(false);
  };

  const handleLogoutConfirmed = () => {
    localStorage.removeItem('userId'); // Clear the user's session
    // Reset language to browser preference for the unauthenticated screens
    const browserLang = navigator.language.split('-')[0] || 'en';
    i18n.changeLanguage(browserLang);
    navigate('/', { replace: true }); // Redirect to login page
  };

  return (
    <div>
      <Sidebar
        collapsed={collapsed}
        backgroundColor='#008444'
        width={collapsed ? '80px' : '210px'}
        style={{
          height: '100vh',
          [`&.active`]: {
            backgroundColor: '#13395e',
            color: '#b6c8d9',
            overflow: 'auto',
          },
        }}
      >
        <Menu
          menuItemStyles={{
            button: ({ level, active }) => {
              if (level === 0)
                return {
                  backgroundColor: active ? '#ffdd00' : undefined,
                };
            },
          }}
        >
          <MenuItem
            id='sidebar_collapse'
            active={activeTab === 'collapse'}
            icon={<BsList />}
            onClick={() => handleClick('collapse')}
          >
            {localStorage.getItem("name") ? `${t("hello")}, ${localStorage.getItem("name")}` : `${t("hello")}!`}
          </MenuItem>
          {localStorage.getItem("admin") === 'true' && (
            <MenuItem
              id='sidebar_admin'
              active={activeTab === "admin"}
              icon={<RiAdminFill />}
              onClick={() => handleClick("admin")}
            >
              {t("admin")}
            </MenuItem>
          )}
          <MenuItem
            id='sidebar_calendar'
            active={activeTab === "calendar"}
            icon={<IoCalendarNumberOutline />}
            onClick={() => handleClick("calendar")}
          >
            {t("calendar")}
          </MenuItem>
          <MenuItem
            id='sidebar_bookings'
            active={activeTab === 'bookings'}
            icon={<FaBookmark />}
            onClick={() => handleClick('bookings')}
          >

            {t('bookings')}
          </MenuItem>

          {/*Search*/}
          <SubMenu active={activeTab === 'series'} icon={<IoIosAlbums />} label={t('series')}>
            <MenuItem id='sidebar_manageseries' icon={<IoIosCheckbox />} onClick={() => {navigate('/manageseries', { replace: true });}}>
              {t('manage')}
            </MenuItem>
            <MenuItem id='sidebar_createseries' icon={<AiFillPlusCircle />} onClick={() => {navigate('/createseries', { replace: true });}}>
              {t('create')}
            </MenuItem>
          </SubMenu> 

          {/*Settings*/}
          <SubMenu id='sidebar_search0' icon={<IoSearchSharp />}  label={t('search')}>
            <MenuItem id='sidebar_search' icon={<MeetingRoomIcon/>} onClick={
              () => handleClick('roomSearch')}
            >
              {t('room')}
            </MenuItem>
            <MenuItem
              id='sidebar_freeDesks'
              active={activeTab === 'freeDesks'}
              icon={<LaptopIcon />}
              onClick={() => handleClick('freeDesks')}
            >
              {t('workstations')}
            </MenuItem>
            <MenuItem id='sidebar_colleagues' icon={<AiOutlineTeam />} onClick={() => handleClick('colleagues')}>
              {t('colleagues')}
            </MenuItem>
          </SubMenu>

          <SubMenu id='sidebar_settings0' icon={<IoIosSettings/>} label={t('settings')}>
            <MenuItem
              id='sidebar_language'
              icon={<MdGTranslate />}
              onClick={() => handleClick("language")}
            >
              {i18n.language === "en" ? "Deutsch" : "English"}
            </MenuItem>

              <MenuItem 
                id='sidebar_defaults' 
                icon={<HiOutlineSparkles />} onClick={
                () => handleClick('defaults')}>
                  {t('defaults')}
              </MenuItem>
            <MenuItem id='sidebar_changePassword' icon={<FaLock/>} onClick={() => handleClick('changePassword')}>
              {t('password')}
            </MenuItem>
            {localStorage.getItem("admin") === 'true' && (
              <MenuItem id='sidebar_mfaSettings' icon={<MdSecurity/>} onClick={() => handleClick('mfaSettings')}>
                {t('mfaSettings')}
              </MenuItem>
            )}
          </SubMenu>
          
          <MenuItem id='sidebar_logout' icon={<CiLogout />} onClick={() => handleClick('logout')}>{t('logout')}</MenuItem>
        </Menu>
      </Sidebar>

      <Defaults 
        isOpen={isDefaultsModalOpen}
        onClose={setIsDefaultsModalOpen.bind(null, false)}
      />
      <ChangePassword
        isOpen={isChangePasswordModalOpen}
        onClose={handleCloseChangePasswordModal}
        //onSubmit={handleChangePasswordSubmit}
      />

      <LogoutConfirmationModal
        isOpen={isLogoutConfirmationOpen}
        onClose={handleCloseLogoutConfirmationModal}
        onConfirm={handleLogoutConfirmed}
      />

      <MfaSettings
        isOpen={isMfaSettingsOpen}
        onClose={() => setIsMfaSettingsOpen(false)}
      />
    </div>
  );
};

export default SidebarComponent;
