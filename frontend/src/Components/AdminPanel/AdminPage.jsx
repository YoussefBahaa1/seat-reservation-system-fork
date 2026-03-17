import { useState } from 'react';
import './AdminPage.css';
import AddRoom from './Room/AddRoom';
import DeleteRoom from './Room/DeleteRoom';
import EditRoom from './Room/EditRoom';
import AddWorkstation from './Workstation/AddWorkstation';
import EditWorkstation from './Workstation/EditWorkstation';
import HideShowFixedWorkstation from './Workstation/HideShowFixedWorkstation';
import DeleteWorkstation from './Workstation/DeleteWorkstation';
import AddUser from './UserManagement/AddUser';
import DeleteUser from './UserManagement/DeleteUser';
import EditUser from './UserManagement/EditUser';
import DeactivateUser from './UserManagement/DeactivateUser';
import BookingSettings from './Bookings/BookingSettings';
import BookingManagementDashboard from './Bookings/BookingManagementDashboard';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router-dom';
import { BootstrapEmployeeDialog, BootstrapWorkstationDialog, BootstrapDialog } from '../Bootstrap';
import LayoutPageAdmin from '../Templates/LayoutPageAdmin';

const SECTION_TO_TITLE = {
  'user-management': 'userManagement',
  'room-management': 'roomManagement',
  'booking-management': 'bookingManagement',
  'booking-settings': 'bookingSettings',
};

const AdminPage = () => {
  const { t } = useTranslation();
  const { section } = useParams();

  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isDeleteRoomOpen, setIsDeleteRoomOpen] = useState(false);
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [isAddWorkstationOpen, setIsAddWorkstationOpen] = useState(false);
  const [isEditWorkstationOpen, setIsEditWorkstationOpen] = useState(false);
  const [isHideShowFixedOpen, setIsHideShowFixedOpen] = useState(false);
  const [isDeleteWorkstationOpen, setIsDeleteWorkstationOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeactivateUserOpen, setIsDeactivateUserOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);

  const toggleAddRoomModal = () => setIsAddRoomOpen(!isAddRoomOpen);
  const toggleDeleteRoomModal = () => setIsDeleteRoomOpen(!isDeleteRoomOpen);
  const toggleEditRoomModal = () => setIsEditRoomOpen(!isEditRoomOpen);
  const toggleAddWorkstationModal = () => setIsAddWorkstationOpen(!isAddWorkstationOpen);
  const toggleEditWorkstationModal = () => setIsEditWorkstationOpen(!isEditWorkstationOpen);
  const toggleHideShowFixedModal = () => setIsHideShowFixedOpen(!isHideShowFixedOpen);
  const toggleDeleteWorkstationModal = () => setIsDeleteWorkstationOpen(!isDeleteWorkstationOpen);
  const toggleAddUserModal = () => setIsAddUserOpen(!isAddUserOpen);
  const toggleEditUserModal = () => setIsEditUserOpen(!isEditUserOpen);
  const toggleDeactivateUserModal = () => setIsDeactivateUserOpen(!isDeactivateUserOpen);
  const toggleDeleteUserModal = () => setIsDeleteUserOpen(!isDeleteUserOpen);

  if (!section || !SECTION_TO_TITLE[section]) {
    return <Navigate to='/admin/user-management' replace />;
  }

  return (
    <LayoutPageAdmin title={t(SECTION_TO_TITLE[section])} helpText='' withPaddingX={section === 'booking-management'}>
      {section === 'user-management' && (
        <div className='admin-section-actions'>
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
      )}

      {section === 'room-management' && (
        <div className='admin-section-actions'>
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
          <button id='hideShowFixed' className='my-button' onClick={toggleHideShowFixedModal}>
            {t('hideShowFixed')}
          </button>
        </div>
      )}

      {section === 'booking-management' && (
        <div className='admin-section-content admin-section-content--full'>
          <BookingManagementDashboard />
        </div>
      )}

      {section === 'booking-settings' && (
        <div className='admin-section-content'>
          <BookingSettings />
        </div>
      )}

      <AddRoom isOpen={isAddRoomOpen} onClose={setIsAddRoomOpen.bind(null, false)} />

      <BootstrapDialog onClose={setIsDeleteRoomOpen.bind(null, !isDeleteRoomOpen)} aria-labelledby='customized-dialog-title' open={isDeleteRoomOpen}>
        <DeleteRoom open={isDeleteRoomOpen} close={setIsDeleteRoomOpen.bind(null, !isDeleteRoomOpen)} />
      </BootstrapDialog>

      <BootstrapDialog onClose={setIsEditRoomOpen.bind(null, !isEditRoomOpen)} aria-labelledby='customized-dialog-title' open={isEditRoomOpen}>
        <EditRoom isOpen={isEditRoomOpen} onClose={setIsEditRoomOpen.bind(null, !isEditRoomOpen)} />
      </BootstrapDialog>

      <AddWorkstation isOpen={isAddWorkstationOpen} onClose={setIsAddWorkstationOpen.bind(null, !isAddWorkstationOpen)} />

      <BootstrapDialog onClose={setIsEditWorkstationOpen.bind(null, !isEditWorkstationOpen)} aria-labelledby='customized-dialog-title' open={isEditWorkstationOpen}>
        <EditWorkstation isOpen={isEditWorkstationOpen} onClose={setIsEditWorkstationOpen.bind(null, !isEditWorkstationOpen)} />
      </BootstrapDialog>

      <BootstrapDialog onClose={setIsHideShowFixedOpen.bind(null, !isHideShowFixedOpen)} aria-labelledby='customized-dialog-title' open={isHideShowFixedOpen}>
        <HideShowFixedWorkstation
          isOpen={isHideShowFixedOpen}
          onClose={setIsHideShowFixedOpen.bind(null, !isHideShowFixedOpen)}
        />
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
    </LayoutPageAdmin>
  );
};

export default AdminPage;
