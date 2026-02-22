import { useEffect, useRef, useState } from 'react';
import { FaAddressBook, FaPlusMinus } from 'react-icons/fa6';
import { FaBook, FaCog } from 'react-icons/fa';
import './AdminPage.css'; // Import the CSS file for AdminPage
import AddRoom from './Room/AddRoom';
import DeleteRoom from './Room/DeleteRoom';
import EditRoom from './Room/EditRoom';
import AddWorkstation from './Workstation/AddWorkstation';
import EditWorkstation from './Workstation/EditWorkstation';
import DeleteWorkstation from './Workstation/DeleteWorkstation';
import AddUser from './UserManagement/AddUser';
import DeleteUser from './UserManagement/DeleteUser';
import EditUser from './UserManagement/EditUser';
import DeactivateUser from './UserManagement/DeactivateUser';
import OverviewBookings from './Bookings/OverviewBookings';
import BookingSettings from './Bookings/BookingSettings';
import { useTranslation } from 'react-i18next';
import {BootstrapEmployeeDialog, BootstrapWorkstationDialog, BootstrapDialog } from '../Bootstrap';
import LayoutPageAdmin from '../Templates/LayoutPageAdmin';
import { getRequest } from '../RequestFunctions/RequestFunctions';
import { toast } from 'react-toastify';
import ParkingReview from './Parking/ParkingReview';

const AdminPage = () => {
  const { t } = useTranslation();
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const [showUserButtons, setShowUserButtons] = useState(false);
  const [showWorkstationButtons, setShowWorkstationButtons] = useState(false);
  const [showBookingButtons, setShowBookingButtons] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isDeleteRoomOpen, setIsDeleteRoomOpen] = useState(false);
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [isAddWorkstationOpen, setIsAddWorkstationOpen] = useState(false);
  const [isEditWorkstationOpen, setIsEditWorkstationOpen] = useState(false);
  const [isDeleteWorkstationOpen, setIsDeleteWorkstationOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeactivateUserOpen, setIsDeactivateUserOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);

  const [isOverviewBookingsOpen, setIsOverviewBookingsOpen] = useState(false);
  const [isParkingReviewOpen, setIsParkingReviewOpen] = useState(false);
  const [pendingParkingCount, setPendingParkingCount] = useState(0);
  const pendingParkingCountRef = useRef(0);
  const [isBookingSettingsOpen, setIsBookingSettingsOpen] = useState(false);

  const toggleUserButtons = () => {
    setShowUserButtons(!showUserButtons);
    if (showUserButtons === false) {
      setShowWorkstationButtons(false);
      setShowBookingButtons(false);
    }
  };

  const toggleWorkstationButtons = () => {
    setShowWorkstationButtons(!showWorkstationButtons);
    if (showWorkstationButtons === false) {
      setShowUserButtons(false);
      setShowBookingButtons(false);
    }
  };

  const toggleBookingButtons = () => {
    setShowBookingButtons(!showBookingButtons);
    if (showBookingButtons === false) {
      setShowUserButtons(false);
      setShowWorkstationButtons(false);
    }
  };
  const toggleBookingSettingsModal = () => setIsBookingSettingsOpen(!isBookingSettingsOpen);
  
  const toggleAddRoomModal = () => setIsAddRoomOpen(!isAddRoomOpen);
  const toggleDeleteRoomModal = () => setIsDeleteRoomOpen(!isDeleteRoomOpen);
  const toggleEditRoomModal = () => setIsEditRoomOpen(!isEditRoomOpen);
  const toggleAddWorkstationModal = () => setIsAddWorkstationOpen(!isAddWorkstationOpen);
  const toggleEditWorkstationModal = () => setIsEditWorkstationOpen(!isEditWorkstationOpen);
  const toggleDeleteWorkstationModal = () => setIsDeleteWorkstationOpen(!isDeleteWorkstationOpen);
  const toggleAddUserModal = () => setIsAddUserOpen(!isAddUserOpen);
  const toggleEditUserModal = () => setIsEditUserOpen(!isEditUserOpen);
  const toggleDeactivateUserModal = () => setIsDeactivateUserOpen(!isDeactivateUserOpen);
  const toggleDeleteUserModal = () => setIsDeleteUserOpen(!isDeleteUserOpen);
  const toggleParkingReviewModal = () => setIsParkingReviewOpen(!isParkingReviewOpen);

  const refreshPendingParkingCount = () => {
    getRequest(
      `${process.env.REACT_APP_BACKEND_URL}/parking/review/pending/count`,
      headers.current,
      (count) => {
        const nextCount = Number.isFinite(Number(count)) ? Number(count) : 0;
        if (nextCount > pendingParkingCountRef.current) {
          toast.info(t('parkingReviewPendingCount', { count: nextCount }));
        }
        pendingParkingCountRef.current = nextCount;
        setPendingParkingCount(nextCount);
      },
      () => {}
    );
  };

  useEffect(() => {
    let timer = null;

    const stopPolling = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const startPolling = () => {
      // Ensure no duplicate intervals
      stopPolling();
      if (document.visibilityState === 'visible') {
        // Refresh immediately when becoming visible
        refreshPendingParkingCount();
        // Use a less aggressive polling interval (30 seconds)
        timer = setInterval(refreshPendingParkingCount, 30000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Initial setup based on current visibility
    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <LayoutPageAdmin
      title={t('adminPanel')}
      helpText={''}
    >
      
      <div className='user-management-container'>
        <button id='userManagement' className='user-management-button' onClick={toggleUserButtons}>
          {t('userManagement')}
        </button>
        <FaAddressBook className='logo' />
      </div>
      <div className="edit-rooms-container">
        <button id='roomManagement' className='edit-rooms-button' onClick={toggleWorkstationButtons}>
        {t("roomManagement")}
        </button>
        <FaPlusMinus className='logo' />
      </div>
      <div className='manage-bookings-container'>
        <button id='bookingManagement' className='manage-bookings-button' onClick={toggleBookingButtons}>
        {t("bookingManagement")}
        </button>
        <FaBook className='logo' />
      </div>
      <div className='manage-bookings-container'>
        <button id='bookingSettings' className='manage-bookings-button' onClick={toggleBookingSettingsModal}>
          {t("bookingSettings")}
        </button>
        <FaCog className='logo' />
      </div>
    
    <div className={`button-wrapper ${showUserButtons ? 'visible' : ''}`}>
      <button id='addUser' className='my-button' onClick={toggleAddUserModal}>
        {t('addUser')}
      </button>
      <button id='editUser' className='my-button' onClick={toggleEditUserModal}>
        {t('editUser')}
      </button>
      <button id='deactivateReactivateUser' className='my-button' onClick={toggleDeactivateUserModal}>
        {t('deactivateReactivateUser')}
      </button>
      <button id='deleteUser' className='my-button' onClick={toggleDeleteUserModal}>
        {t('deleteUser')}
      </button>
    </div>
    <div className={`button-wrapper ${showWorkstationButtons ? 'visible' : ''}`}>
      <button id='addRoom' className='my-button' onClick={toggleAddRoomModal}>
        {t('addRoom')}
      </button>
      <button id='deleteRoom' className='my-button' onClick={toggleDeleteRoomModal}>
        {t('deleteRoom')}
      </button>
      <button id='editRoom' className='my-button' onClick={toggleEditRoomModal}>
        {t('editRoom')}
      </button>
      <button id='addWorkstation' className='my-button' onClick={toggleAddWorkstationModal}>
        {t('addWorkstation')}
      </button>
      <button id='deleteWorkstation' className='my-button' onClick={toggleDeleteWorkstationModal}>
        {t('deleteWorkstation')}
      </button>
      <button id='editWorkstation' className='my-button' onClick={toggleEditWorkstationModal}>
        {t('editWorkstation')}
      </button>
    </div>
    <div className={`button-wrapper ${showBookingButtons ? 'visible' : ''}`}>
      <button id='overviewBooking' className='my-button' onClick={setIsOverviewBookingsOpen.bind(null, true)}>
        {t('overviewBooking')}
      </button>
      <button id='parkingReview' className='my-button' onClick={toggleParkingReviewModal}>
        {t('parkingReview')}{pendingParkingCount > 0 ? ` (${pendingParkingCount})` : ''}
      </button>
    </div>

      <AddRoom isOpen={isAddRoomOpen} onClose={setIsAddRoomOpen.bind(null,false)}/>

      <BootstrapDialog onClose={setIsDeleteRoomOpen.bind(null,!isDeleteRoomOpen)} aria-labelledby='customized-dialog-title' open={isDeleteRoomOpen}>
        <DeleteRoom  open={isDeleteRoomOpen} close={setIsDeleteRoomOpen.bind(null, !isDeleteRoomOpen)} />
      </BootstrapDialog>

      <BootstrapDialog onClose={setIsEditRoomOpen.bind(null, !isEditRoomOpen)} aria-labelledby='customized-dialog-title' open={isEditRoomOpen}>
        <EditRoom isOpen={isEditRoomOpen} onClose={setIsEditRoomOpen.bind(null, !isEditRoomOpen)} />
      </BootstrapDialog>

      <AddWorkstation isOpen={isAddWorkstationOpen} onClose={setIsAddWorkstationOpen.bind(null, !isAddWorkstationOpen)} />

      <BootstrapDialog onClose={setIsEditWorkstationOpen.bind(null, !isEditWorkstationOpen)} aria-labelledby='customized-dialog-title' open={isEditWorkstationOpen}>
        <EditWorkstation isOpen={isEditWorkstationOpen}  onClose={setIsEditWorkstationOpen.bind(null, !isEditWorkstationOpen)}/>
      </BootstrapDialog>
      
      <BootstrapDialog onClose={setIsDeleteWorkstationOpen.bind(null, !isDeleteWorkstationOpen)} aria-labelledby='customized-dialog-title' open={isDeleteWorkstationOpen}>
        <DeleteWorkstation isOpen={isDeleteWorkstationOpen} onClose={setIsDeleteWorkstationOpen.bind(null, !isDeleteWorkstationOpen)} />
      </BootstrapDialog>

      <BootstrapWorkstationDialog onClose={setIsAddUserOpen.bind(null, !isAddUserOpen)} aria-labelledby='customized-dialog-title' open={isAddUserOpen}>
        <AddUser isOpen={isAddUserOpen} onClose={setIsAddUserOpen.bind(null, !isAddUserOpen)} />
      </BootstrapWorkstationDialog>

      <BootstrapEmployeeDialog onClose={setIsEditUserOpen.bind(null, !isEditUserOpen)} aria-labelledby='customized-dialog-title' open={isEditUserOpen}>
        <EditUser isOpen={isEditUserOpen} onClose={setIsEditUserOpen.bind(null, !isEditUserOpen)} />
      </BootstrapEmployeeDialog>

      <BootstrapEmployeeDialog onClose={setIsDeactivateUserOpen.bind(null, !isDeactivateUserOpen)} aria-labelledby='customized-dialog-title' open={isDeactivateUserOpen}>
        <DeactivateUser isOpen={isDeactivateUserOpen} onClose={setIsDeactivateUserOpen.bind(null, !isDeactivateUserOpen)} />
      </BootstrapEmployeeDialog>

      <BootstrapEmployeeDialog onClose={setIsDeleteUserOpen.bind(null, !isDeleteUserOpen)} aria-labelledby='customized-dialog-title' open={isDeleteUserOpen}>
        <DeleteUser onClose={setIsDeleteUserOpen.bind(null, !isDeleteUserOpen)} isOpen={isDeleteUserOpen} />
      </BootstrapEmployeeDialog>

      <BootstrapEmployeeDialog onClose={setIsOverviewBookingsOpen.bind(null, !isOverviewBookingsOpen)} aria-labelledby='customized-dialog-title' open={isOverviewBookingsOpen}>
        <OverviewBookings isOpen={isOverviewBookingsOpen} onClose={setIsOverviewBookingsOpen.bind(null, !isOverviewBookingsOpen)}/>
      </BootstrapEmployeeDialog>

      <ParkingReview
        isOpen={isParkingReviewOpen}
        onClose={toggleParkingReviewModal}
        onChanged={refreshPendingParkingCount}
      />

      <BootstrapEmployeeDialog onClose={setIsBookingSettingsOpen.bind(null, !isBookingSettingsOpen)} aria-labelledby='customized-dialog-title' open={isBookingSettingsOpen}>
        <BookingSettings isOpen={isBookingSettingsOpen} onClose={setIsBookingSettingsOpen.bind(null, !isBookingSettingsOpen)} />
      </BootstrapEmployeeDialog>
      
      </LayoutPageAdmin>
  );
};

export default AdminPage;
