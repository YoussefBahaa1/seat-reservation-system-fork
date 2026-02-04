import { toast } from 'react-toastify';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from "react-i18next";
import UserTable from './UserTable';
import { putRequest, getRequest } from '../../RequestFunctions/RequestFunctions';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin';

export default function DeactivateUser({ isOpen, onClose }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [allUsers, setAllUsers] = useState([]);

  const getAllUsers = useCallback(
    async () => {
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/admin/users/get`,
        headers.current,
        setAllUsers,
        () => {console.log('Failed to fetch all users in DeactivateUser.js')}
      );
    },
    [setAllUsers]
  );

  useEffect(() => {
    getAllUsers();
  }, [getAllUsers]);

  function toggleUserActive(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const newActiveStatus = !user.active;
    const actionText = newActiveStatus ? t('reactivate') : t('deactivate');
    
    if (!window.confirm(`${t('confirmToggleActive')} ${actionText.toLowerCase()} ${user.email}?`)) {
      return;
    }

    putRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/users/${userId}/active`,
      headers.current,
      () => {
        toast.success(newActiveStatus ? t('userReactivated') : t('userDeactivated'));
        getAllUsers(); // Refresh the list
      },
      () => {
        toast.error(t('toggleActiveFailed'));
      },
      JSON.stringify({ active: newActiveStatus })
    );
  }

  return (
    <LayoutModalAdmin
      title={t('deactivateReactivateUser')}
      onClose={onClose}
      isOpen={isOpen}
    >
      <UserTable 
        users={allUsers} 
        onAction={toggleUserActive} 
        action={null} // Will be determined per-row based on active status
        actionRenderer={(user) => user.active ? t('deactivate').toUpperCase() : t('reactivate').toUpperCase()}
        t={t}
      />
    </LayoutModalAdmin>
  );
}
