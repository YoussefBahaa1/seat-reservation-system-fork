import DeleteFf from '../../DeleteFf';
import { useRef, useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from "react-i18next";
import UserTable from './UserTable';
import {getRequest, deleteRequest} from '../../RequestFunctions/RequestFunctions';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin';

export default function DeleteUser({ isOpen, onClose }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const [currUserId, setCurrUserId] = useState(-1);
  const { t } = useTranslation();
  const [allUsers, setAllUsers] = useState([]);
  const [openFfDialog, setOpenFfDialog] = useState(false);
  const getAllUsers = useCallback(
    async () => {
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/admin/users/get`,
        headers.current,
        setAllUsers,
        () => {console.log('Failed to fetch all users in DeleteUser.js')}
      );
    },
    [headers, setAllUsers]
  );
  
  // Init fetch of the users
  useEffect(() => {
    getAllUsers();
  }, [getAllUsers]);

  async function deleteUserById(id) {
    setCurrUserId(id);
    deleteRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/users/${id}`,
      headers.current,
      (data) => {
        if (data !== 0) {
          setOpenFfDialog(true);
        }
        else {
          toast.success(t('userDeleted'));
          getAllUsers();
        }
      },
      () => {console.log('Failed to delete user in DeleteUser.js.')}
    );    
  };

  async function deleteUserByIdFf(id) {
    deleteRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/users/ff/${id}`,
      headers.current,
      (data) => {
        if (data) {
          toast.success(t('userDeleted'));
          getAllUsers();
        }
        else {
          toast.error(t('userDeletionFailed'));
        }
      },
      () => {console.log('Failed to delete user fast forward in DeleteUser.js.')}
    );
  };

  const closeDialog = () => {
    setOpenFfDialog(false);
  };

  return (
    <LayoutModalAdmin
      onClose={onClose}
      isOpen={isOpen}
      title={t('deleteUser')}
    >
      <DeleteFf 
        open={openFfDialog}
        onClose={closeDialog}
        onDelete={deleteUserByIdFf.bind(null, currUserId)}
        text={t('fFDeleteUser')}
      />
      <UserTable users={allUsers} onAction={deleteUserById} action={t("delete").toUpperCase()} t={t}/>
    </LayoutModalAdmin>
  );
}
