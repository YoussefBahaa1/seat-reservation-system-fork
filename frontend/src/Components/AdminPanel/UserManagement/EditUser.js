import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, TextField, Checkbox, Button, Divider, Box } from '@mui/material';
import { toast } from 'react-toastify';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from "react-i18next";
import UserTable from './UserTable';
import { putRequest, getRequest, postRequest } from '../../RequestFunctions/RequestFunctions';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin';
import isEmail from '../../misc/isEmail';

export default function EditUser({ isOpen, onClose }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [allUsers, setAllUsers] = useState([]);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName ] = useState('');
  const [surname, setSurname] = useState('');
  const [department, setDepartment] = useState('');
  //const [visibility, setVisibility] = useState();
  const [isAdmin, setIsAdmin] = useState();
  const [isEmployee, setIsEmployee] = useState();
  const [isServicePersonnel, setIsServicePersonnel] = useState();
  // Password reset state
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
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
    // Validate email format
    if(!isEmail(email.trim())){
      toast.error(t('invalidEmail'));
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
        'department': department,
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
      setDepartment(toBeEditedUser.department || '');
      // Reset password fields when opening edit modal
      setShowResetPassword(false);
      setNewPassword('');
      setConfirmPassword('');
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

  function resetUserPassword() {
    if (!newPassword || !confirmPassword) {
      toast.error(t('fields_not_empty'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }
    putRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/users/${id}/password/reset`,
      headers.current,
      () => {
        toast.success(t('passwordResetSuccess'));
        setNewPassword('');
        setConfirmPassword('');
        setShowResetPassword(false);
      },
      () => {
        toast.error(t('passwordResetFailed'));
      },
      JSON.stringify({ newPassword: newPassword })
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
        <FormControl id='editUserModal-setDepartment' size='small' fullWidth variant='standard'>
          <TextField
            id='standard-adornment-department'
            label={t('department')}
            size='small'
            type='text'
            value={department}
            onChange={(e)=>setDepartment(e.target.value)}
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
        
        {/* Password Reset Section */}
        <br/><br/>
        <Divider />
        <br/>
        <Box>
          <Button 
            variant="outlined" 
            onClick={() => setShowResetPassword(!showResetPassword)}
            size="small"
          >
            {t('resetPassword')}
          </Button>
          {showResetPassword && (
            <Box sx={{ mt: 2 }}>
              <FormControl size='small' fullWidth variant='standard' sx={{ mb: 2 }}>
                <TextField
                  label={t('newPassword')}
                  size='small'
                  type='password'
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </FormControl>
              <FormControl size='small' fullWidth variant='standard' sx={{ mb: 2 }}>
                <TextField
                  label={t('confirmPassword')}
                  size='small'
                  type='password'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </FormControl>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={resetUserPassword}
                size="small"
              >
                {t('confirmResetPassword')}
              </Button>
            </Box>
          )}
        </Box>
        
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
import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, TextField } from '@mui/material';
import { toast } from 'react-toastify';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from "react-i18next";
import EmployeeTable from './UserTable';
import { putRequest, getRequest} from '../../RequestFunctions/RequestFunctions';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin';

export default function EditEmployee({ isOpen, onClose }) {
  const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [allEmployee, setAllEmployee] = useState([]);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName ] = useState('');
  const [surname, setSurname] = useState('');
  //const [visibility, setVisibility] = useState();
  const [isAdmin, setIsAdmin] = useState();
  const [visibilityMode, setVisibilityMode] = useState('FULL_NAME');
  
  const getAllEmployee = useCallback(
    async () => {
      getRequest(
        `${process.env.REACT_APP_BACKEND_URL}/admin/users/get`,
        headers.current,
        setAllEmployee,
        () => {console.log('Failed to fetch all employees in EditEmployee.js')}
      );
    },
    [setAllEmployee]
  );

  useEffect(() => {
    getAllEmployee();
  }, [getAllEmployee]);

  async function updateEmployee() {
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
      () => {console.log('Failed to update employee in EditEmployeeModal.js');},
      JSON.stringify({
        'userId':id,
        'email': email,
        'name': name,
        'surname': surname,
        'admin': isAdmin,
        'visibilityMode': visibilityMode
      })
    );
  }

  function editEmployeeById(id){
    // Usally there is one and only on employee with the requested id. 
    const potential_employees = allEmployee.filter(employee => employee.id === id);
    try {
      const to_be_edited_employee = potential_employees.at(0);
      setId(to_be_edited_employee.id);
      setEmail(to_be_edited_employee.email);
      setName(to_be_edited_employee.name);
      setSurname(to_be_edited_employee.surname);
      setIsAdmin(to_be_edited_employee.admin);
      setVisibilityMode(to_be_edited_employee.visibilityMode || 'FULL_NAME');
      //setVisibility(to_be_edited_employee.visibility);
      setIsEditEmployeeOpen(true);
    } catch (e) {
      console.error(`Error in editEmployeeById with employee with the id ${id}: ${e.message}.`)
    }
  }

  return (
    <LayoutModalAdmin
      title={t('editEmployee')}
      onClose={onClose}
      isOpen={isOpen}
    >
      <EmployeeTable employees={allEmployee} onAction={editEmployeeById} action={t("edit").toUpperCase()} t={t}/>
      <LayoutModalAdmin
        isOpen={isEditEmployeeOpen}
        onClose={setIsEditEmployeeOpen.bind(null, !isEditEmployeeOpen)}
        submit={updateEmployee}
        submitTxt={t('update')}
      >
        <br/>
        <FormControl required={true} id='editEmployee-setEmail' size='small' fullWidth variant='standard'>
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
        <FormControl required={true} id='editEmployeeModal-setName' size='small' fullWidth variant='standard'>
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
        <FormControl required={true} id='editEmployeeModal-setSurname' size='small' fullWidth variant='standard'>
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
        <FormControl id='editEmployeeModal-setIsAdmin'>
          <FormLabel id='ratioIsAdmin'>{t('admin')}</FormLabel>
            <RadioGroup
              row
              aria-labelledby='ratioIsAdmin'
              value={isAdmin}
              onChange={(e)=> {
                setIsAdmin(e.target.value)}
              }
            >
            <FormControlLabel id='radioAdmin_true' value={true} control={<Radio />} label={t('true')} />
            <FormControlLabel id='radioAdmin_false' value={false} control={<Radio />} label={t('false')} />
          </RadioGroup>
        </FormControl>
        <br/><br/>
        <FormControl id='editEmployeeModal-visibilityMode'>
          <FormLabel>{t('visibility')}</FormLabel>
          <RadioGroup
            row
            value={visibilityMode}
            onChange={(e)=> setVisibilityMode(e.target.value)}
          >
            <FormControlLabel value='FULL_NAME' control={<Radio />} label={t('name')} />
            <FormControlLabel value='ABBREVIATION' control={<Radio />} label={t('abbreviationCap')} />
            <FormControlLabel value='ANONYMOUS' control={<Radio />} label={t('anonymous')} />
          </RadioGroup>
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
