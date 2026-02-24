import { FormControl, FormControlLabel, FormLabel, TextField, Checkbox } from '@mui/material';
import {useRef, useState} from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from "react-i18next";
import {postRequest} from '../../RequestFunctions/RequestFunctions';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin';
import isEmail from '../../misc/isEmail';

export default function AddUser({ isOpen, onClose }) {
  const headers =  useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName ] = useState('');
  const [surname, setSurname] = useState('');
  const [department, setDepartment] = useState('');
  //const [visibility, setVisibility] = useState(true);
  const [selectedRole, setSelectedRole] = useState('EMPLOYEE');

  const handleRoleChange = (role, checked) => {
    if (checked) {
      setSelectedRole(role);
    }
  };

  async function addUser(){
    if(!email || !password || !name || !surname){
        toast.error(t('fields_not_empty'));
        return false;
    }
    // Validate email format
    if(!isEmail(email.trim())){
        toast.error(t('invalidEmail'));
        return false;
    }
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/users`,
      headers.current,
      (_) => {
        toast.success(t('userCreated'));
        //addUserModal();
      },
      () => {
        console.log('Failed to create new user in AddUser.js');
        toast.error(t('emailAlreadyTaken'));
      },
      JSON.stringify({
        'email': email.trim(),
        'password': password,
        'name': name,
        'surname': surname,
        'department': department,
        'admin': selectedRole === 'ADMIN',
        'employee': selectedRole === 'EMPLOYEE',
        'servicePersonnel': selectedRole === 'SERVICE_PERSONNEL',
        'visibility': true,
      })
    );
  }
  return (
    <LayoutModalAdmin
      title={t('addUser')}
      onClose={onClose}
      isOpen={isOpen}
      submit={addUser}
      submitTxt={t('submit')}
      widthInPx='400'
    > 
      <br/><br/>
      <FormControl id='addUser-setEmail' required={true} size="small" fullWidth variant="standard">
        <TextField
          id='standard-adornment-reason-mail'
            label={t('email')}
            size='small'
            type={'text'}
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
        />
      </FormControl>
      <br/><br/>
      <FormControl id='addUser-setPassword' required={true} size='small' fullWidth variant='standard'>
        <TextField
            id='standard-adornment-reason-pw'
            label={t('password')}
            size='small'
            type={'password'}
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
        />
      </FormControl>
      <br/><br/>
      <FormControl id='addUser-setName' required={true} size="small" fullWidth variant="standard">
        <TextField
            id='standard-adornment-reason-firstname'
            label={t('name')}
            size='small'
            type={'text'}
            value={name}
            onChange={(e)=>setName(e.target.value)}
        />
      </FormControl>
      <br/><br/>
      <FormControl id='addUser-setSurname' required={true} size='small' fullWidth variant='standard'>
        <TextField
          id='standard-adornment-reason-surname'
          label={t('surname')}
          size='small'
          type={'text'}
          value={surname}
          onChange={(e)=>setSurname(e.target.value)}
        />
      </FormControl>
      <br/><br/>
      <FormControl id='addUser-setDepartment' size='small' fullWidth variant='standard'>
        <TextField
          id='standard-adornment-reason-department'
          label={t('department')}
          size='small'
          type={'text'}
          value={department}
          onChange={(e)=>setDepartment(e.target.value)}
        />
      </FormControl>
      <br/><br/>
      <FormControl id='addUser-roles'>
        <FormLabel>{t('role')}</FormLabel>
        <FormControlLabel
          control={
            <Checkbox
              checked={selectedRole === 'ADMIN'}
              onChange={(e) => handleRoleChange('ADMIN', e.target.checked)}
            />
          }
          label={t('admin')}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={selectedRole === 'SERVICE_PERSONNEL'}
              onChange={(e) => handleRoleChange('SERVICE_PERSONNEL', e.target.checked)}
            />
          }
          label={t('servicePersonnel')}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={selectedRole === 'EMPLOYEE'}
              onChange={(e) => handleRoleChange('EMPLOYEE', e.target.checked)}
            />
          }
          label={t('employee')}
        />
      </FormControl>
      {/*<br></br>
      <FormControl id='addUser-setVisibility'>
        <FormLabel id='demo-row-radio-buttons-group-label'>{t('visibility')}</FormLabel>
        <RadioGroup
          row
          aria-labelledby='demo-row-radio-buttons-group-label'
          name='row-radio-buttons-group'
          value={visibility}
          onChange={(e)=> setVisibility(e.target.value)}
        >
          <FormControlLabel value='true' control={<Radio />} label={t('yes')} />
          <FormControlLabel value='false' control={<Radio />} label={t('no')} />
          
        </RadioGroup>
      </FormControl>*/}
    </LayoutModalAdmin>
  );
}
