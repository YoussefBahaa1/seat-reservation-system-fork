import DeleteFf from '../../DeleteFf';
import { useRef, useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from "react-i18next";
import EmployeeTable from './EmployeeTable';
import {getRequest, deleteRequest} from '../../RequestFunctions/RequestFunctions';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin';

export default function DeleteEmployee({ isOpen, onClose }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const [currUserId, setCurrUserId] = useState(-1);
  const { t } = useTranslation();
  const [allEmployee, setAllEmployee] = useState([]);
  const [openFfDialog, setOpenFfDialog] = useState(false);
  const getAllEmployee = useCallback(
    async () => {
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/admin/users/get`,
        headers.current,
        setAllEmployee,
        () => {console.log('Failed to fetch all employees in DeleteEmployee.js')}
      );
    },
    [headers, setAllEmployee]
  );
  
  // Init fetch of the employees
  useEffect(() => {
    getAllEmployee();
  }, [getAllEmployee]);

  async function deleteEmployeeById(id) {
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
          getAllEmployee();
        }
      },
      () => {console.log('Failed to delete employee in DeleteEmployee.js.')}
    );    
  };

  async function deleteEmployeeByIdFf(id) {
    deleteRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/users/ff/${id}`,
      headers.current,
      (data) => {
        if (data) {
          toast.success(t('userDeleted'));
          getAllEmployee();
        }
        else {
          toast.error(t('userDeletionFailed'));
        }
      },
      () => {console.log('Failed to delete employee fast forward in DeleteEmployee.js.')}
    );
  };

  const closeDialog = () => {
    setOpenFfDialog(false);
  };

  return (
    <LayoutModalAdmin
      onClose={onClose}
      isOpen={isOpen}
      title={t('deleteEmployee')}
    >
      <DeleteFf 
        open={openFfDialog}
        onClose={closeDialog}
        onDelete={deleteEmployeeByIdFf.bind(null, currUserId)}
        text={t('fFDeleteEmployee')}
      />
      <EmployeeTable employees={allEmployee} onAction={deleteEmployeeById} action={t("delete").toUpperCase()} t={t}/>
    </LayoutModalAdmin>
  );
}