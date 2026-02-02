import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, TextField, Checkbox } from '@mui/material';
import { toast } from 'react-toastify';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from "react-i18next";
import UserTable from './UserTable';
import { putRequest, getRequest, postRequest } from '../../RequestFunctions/RequestFunctions';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin';

export default function EditUser({ isOpen, onClose }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [allUsers, setAllUsers] = useState([]);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName ] = useState('');
  const [surname, setSurname] = useState('');
  //const [visibility, setVisibility] = useState();
  const [isAdmin, setIsAdmin] = useState();
  const [isEmployee, setIsEmployee] = useState();
  const [isServicePersonnel, setIsServicePersonnel] = useState();
  
  const getAllUsers = useCallback(
    async () => {
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/admin/users/get`,
        headers.current,
        setAllUsers,
        () => {console.log('Failed to fetch all users in EditUser.js')}
      );
    },
    [setAllUsers]
  );

  useEffect(() => {
    getAllUsers();
  }, [getAllUsers]);

  async function updateUser() {
    if(!email  || !name || !surname){
      toast.error(t('fields_not_empty'));
      return false;
    }

    putRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/users`,
      headers.current,
      (_) => {
        toast.success(t('userUpdated'));
        onClose();
      },
      () => {console.log('Failed to update user in EditUserModal.js');},
      JSON.stringify({
        'userId':id,
        'email': email,
        'name': name,
        'surname': surname,
        'admin': isAdmin,
        'employee': isEmployee,
        'servicePersonnel': isServicePersonnel,
        'visibility': true//visibility
      })
    );
  }

  function editUserById(id){
    // Usually there is one and only one user with the requested id.
    const potentialUsers = allUsers.filter((user) => user.id === id);
    try {
      const toBeEditedUser = potentialUsers.at(0);
      setId(toBeEditedUser.id);
      setEmail(toBeEditedUser.email);
      setName(toBeEditedUser.name);
      setSurname(toBeEditedUser.surname);
      setIsAdmin(toBeEditedUser.admin);
      setIsEmployee(toBeEditedUser.employee);
      setIsServicePersonnel(toBeEditedUser.servicePersonnel);
      //setVisibility(toBeEditedUser.visibility);
      setIsEditUserOpen(true);
    } catch (e) {
      console.error(`Error in editUserById with user with the id ${id}: ${e.message}.`)
    }
  }

  function disableMfaForUser(userId) {
    if (!window.confirm(t('mfaRecoveryConfirm'))) {
      return;
    }
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/users/${userId}/mfa/disable`,
      headers.current,
      () => {
        toast.success(t('mfaDisabledSuccess'));
        getAllUsers(); // Refresh the list
      },
      () => {
        toast.error('Failed to disable MFA');
      }
    );
  }

  return (
    <LayoutModalAdmin
      title={t('editUser')}
      onClose={onClose}
      isOpen={isOpen}
    >
      <UserTable 
        users={allUsers} 
        onAction={editUserById} 
        action={t("edit").toUpperCase()} 
        t={t}
        onDisableMfa={disableMfaForUser}
      />
      <LayoutModalAdmin
        isOpen={isEditUserOpen}
        onClose={setIsEditUserOpen.bind(null, !isEditUserOpen)}
        submit={updateUser}
        submitTxt={t('update')}
      >
        <br/>
        <FormControl required={true} id='editUser-setEmail' size='small' fullWidth variant='standard'>
          <TextField
            id='standard-adornment-reason'
            label={t('email')}
            size='small'
            type='text'
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />
        </FormControl>
        <br/><br/>
        <FormControl required={true} id='editUserModal-setName' size='small' fullWidth variant='standard'>
          <TextField
            id='standard-adornment-reason'
            label={t('name')}
            size='small'
            type='text'
            value={name}
            onChange={(e)=>setName(e.target.value)}
          />
        </FormControl>
        <br/><br/>
        <FormControl required={true} id='editUserModal-setSurname' size='small' fullWidth variant='standard'>
          <TextField
            id='standard-adornment-reason'
            label={t('surname')}
            size='small'
            type='text'
            value={surname}
            onChange={(e)=>setSurname(e.target.value)}
          />
        </FormControl>
        <br/><br/>
        <FormControl id='editUserModal-setIsAdmin'>
          <FormLabel id='ratioIsAdmin'>{t('admin')}</FormLabel>
            <RadioGroup
              row
              aria-labelledby='ratioIsAdmin'
              value={isAdmin}
              onChange={(e)=> {
                const adminValue = e.target.value === 'true' || e.target.value === true;
                setIsAdmin(adminValue);
                // If admin is set, disable employee/service personnel checkboxes
                if (adminValue) {
                  setIsEmployee(false);
                  setIsServicePersonnel(false);
                }
              }}
            >
            <FormControlLabel id='radioAdmin_true' value={true} control={<Radio />} label={t('true')} />
            <FormControlLabel id='radioAdmin_false' value={false} control={<Radio />} label={t('false')} />
          </RadioGroup>
        </FormControl>
        <br/><br/>
        <FormControl id='editUser-roles'>
          <FormLabel>{t('employee')} / {t('servicePersonnel')}</FormLabel>
          <FormControlLabel
            control={
              <Checkbox
                checked={isEmployee || false}
                onChange={(e) => setIsEmployee(e.target.checked)}
                disabled={isAdmin}
              />
            }
            label={t('employee')}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={isServicePersonnel || false}
                onChange={(e) => setIsServicePersonnel(e.target.checked)}
                disabled={isAdmin}
              />
            }
            label={t('servicePersonnel')}
          />
        </FormControl>
        {/*<br/><br/>
        <FormControl>
          <FormLabel id='ratioIsVisible'>{t('visibility')}</FormLabel>
            <RadioGroup
              row
              aria-labelledby='ratioIsVisible'
              name='row-radio-buttons-group'
              value={visibility}
              onChange={(e)=> setVisibility(e.target.value)}
            >
            <FormControlLabel value={true} control={<Radio />} label={t('true')} />
            <FormControlLabel value={false} control={<Radio />} label={t('false')} />
          </RadioGroup>
        </FormControl>*/}
      </LayoutModalAdmin>
    </LayoutModalAdmin>
  );
}
