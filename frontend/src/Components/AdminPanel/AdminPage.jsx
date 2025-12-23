import { useState } from 'react';
import { FaAddressBook, FaPlusMinus } from 'react-icons/fa6';
import { FaBook } from 'react-icons/fa';
import './AdminPage.css'; // Import the CSS file for AdminPage
import AddRoom from './Room/AddRoom';
import DeleteRoom from './Room/DeleteRoom';
import EditRoom from './Room/EditRoom';
import AddWorkstation from './Workstation/AddWorkstation';
import EditWorkstation from './Workstation/EditWorkstation';
import DeleteWorkstation from './Workstation/DeleteWorkstation';
import AddEmployee from './UserManagement/AddEmployee';
import DeleteEmployee from './UserManagement/DeleteEmployee';
import EditEmployee from './UserManagement/EditEmployee';
import OverviewBookings from './Bookings/OverviewBookings';
import { useTranslation } from 'react-i18next';
import {BootstrapEmployeeDialog, BootstrapWorkstationDialog, BootstrapDialog } from '../Bootstrap';
import LayoutPageAdmin from '../Templates/LayoutPageAdmin';

const AdminPage = () => {
  const { t } = useTranslation();
  const [showEmployeeButtons, setShowEmployeeButtons] = useState(false);
  const [showWorkstationButtons, setShowWorkstationButtons] = useState(false);
  const [showBookingButtons, setShowBookingButtons] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isDeleteRoomOpen, setIsDeleteRoomOpen] = useState(false);
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [isAddWorkstationOpen, setIsAddWorkstationOpen] = useState(false);
  const [isEditWorkstationOpen, setIsEditWorkstationOpen] = useState(false);
  const [isDeleteWorkstationOpen, setIsDeleteWorkstationOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [isDeleteEmployeeOpen, setIsDeleteEmployeeOpen] = useState(false);

  const [isOverviewBookingsOpen, setIsOverviewBookingsOpen] = useState(false);

  const toggleEmployeeButtons = () => {
    setShowEmployeeButtons(!showEmployeeButtons);
    if (showEmployeeButtons === false) {
      setShowWorkstationButtons(false);
      setShowBookingButtons(false);
    }
  };

  const toggleWorkstationButtons = () => {
    setShowWorkstationButtons(!showWorkstationButtons);
    if (showWorkstationButtons === false) {
      setShowEmployeeButtons(false);
      setShowBookingButtons(false);
    }
  };

  const toggleBookingButtons = () => {
    setShowBookingButtons(!showBookingButtons);
    setIsOverviewBookingsOpen(!isOverviewBookingsOpen);
    if (showBookingButtons === false) {
      setShowEmployeeButtons(false);
      setShowWorkstationButtons(false);
    }
  };
  
  const toggleAddRoomModal = () => setIsAddRoomOpen(!isAddRoomOpen);
  const toggleDeleteRoomModal = () => setIsDeleteRoomOpen(!isDeleteRoomOpen);
  const toggleEditRoomModal = () => setIsEditRoomOpen(!isEditRoomOpen);
  const toggleAddWorkstationModal = () => setIsAddWorkstationOpen(!isAddWorkstationOpen);
  const toggleEditWorkstationModal = () => setIsEditWorkstationOpen(!isEditWorkstationOpen);
  const toggleDeleteWorkstationModal = () => setIsDeleteWorkstationOpen(!isDeleteWorkstationOpen);
  const toggleAddEmployeeModal = () => setIsAddEmployeeOpen(!isAddEmployeeOpen);
  const toggleEditEmployeeModal = () => setIsEditEmployeeOpen(!isEditEmployeeOpen);
  const toggleDeleteEmployeeModal = () => setIsDeleteEmployeeOpen(!isDeleteEmployeeOpen);
  
  return (
    <LayoutPageAdmin
      title={t('adminPanel')}
      helpText={''}
    >
      
      <div className='user-management-container'>
        <button id='userManagement' className='user-management-button' onClick={toggleEmployeeButtons}>
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
    
    <div className={`button-wrapper ${showEmployeeButtons ? 'visible' : ''}`}>
      <button id='addEmployee' className='my-button' onClick={toggleAddEmployeeModal}>
        {t('addEmployee')}
      </button>
      <button  id='deleteEmployee' className='my-button' onClick={toggleDeleteEmployeeModal}>
        {t('deleteEmployee')}
      </button>
      <button id='editEmployee' className='my-button' onClick={toggleEditEmployeeModal}>
        {t('editEmployee')}
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

      <BootstrapWorkstationDialog onClose={setIsAddEmployeeOpen.bind(null, !isAddEmployeeOpen)} aria-labelledby='customized-dialog-title' open={isAddEmployeeOpen}>
        <AddEmployee isOpen={isAddEmployeeOpen} onClose={setIsAddEmployeeOpen.bind(null, !isAddEmployeeOpen)} />
      </BootstrapWorkstationDialog>

      <BootstrapEmployeeDialog onClose={setIsEditEmployeeOpen.bind(null, !isEditEmployeeOpen)} aria-labelledby='customized-dialog-title' open={isEditEmployeeOpen}>
        <EditEmployee isOpen={isEditEmployeeOpen} onClose={setIsEditEmployeeOpen.bind(null, !isEditEmployeeOpen)} />
      </BootstrapEmployeeDialog>

      <BootstrapEmployeeDialog onClose={setIsDeleteEmployeeOpen.bind(null, !isDeleteEmployeeOpen)} aria-labelledby='customized-dialog-title' open={isDeleteEmployeeOpen}>
        <DeleteEmployee  onClose={setIsDeleteEmployeeOpen.bind(null, !isDeleteEmployeeOpen)} isOpen={isDeleteEmployeeOpen} />
      </BootstrapEmployeeDialog>

      <BootstrapEmployeeDialog onClose={setIsOverviewBookingsOpen.bind(null, !isOverviewBookingsOpen)} aria-labelledby='customized-dialog-title' open={isOverviewBookingsOpen}>
        <OverviewBookings isOpen={isOverviewBookingsOpen} onClose={setIsOverviewBookingsOpen.bind(null, !isOverviewBookingsOpen)}/>
      </BootstrapEmployeeDialog>
      
      </LayoutPageAdmin>
  );
};

export default AdminPage;
