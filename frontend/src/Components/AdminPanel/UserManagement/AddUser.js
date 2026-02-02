import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, TextField, Checkbox } from '@mui/material';
import {useRef, useState} from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from "react-i18next";
import {postRequest} from '../../RequestFunctions/RequestFunctions';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin';

export default function AddUser({ isOpen, onClose }) {
  const headers =  useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName ] = useState('');
  const [surname, setSurname] = useState('');
  //const [visibility, setVisibility] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmployee, setIsEmployee] = useState(true);
  const [isServicePersonnel, setIsServicePersonnel] = useState(false);

  async function addUser(){
    if(!email || !password || !name || !surname){
        toast.error(t('fields_not_empty'));
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
        'admin': isAdmin,
        'employee': isEmployee,
        'servicePersonnel': isServicePersonnel,
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
      <FormControl id='addUser-isAdmin'>
        <FormLabel id='addUser-isAdmin-label'>{t('admin')}?</FormLabel>
        <RadioGroup
          row
          aria-labelledby='addUser-isAdmin-label'
          value={isAdmin}
          onChange={(e)=> {
            const adminValue = e.target.value === 'true';
            setIsAdmin(adminValue);
            // If admin is set, disable employee/service personnel checkboxes
            if (adminValue) {
              setIsEmployee(false);
              setIsServicePersonnel(false);
            }
          }}
        >
          <FormControlLabel id='radioAdmin_true' value='true' control={<Radio />} label={t('true')} />
          <FormControlLabel id='radioAdmin_false' value='false' control={<Radio />} label={t('false')} />
        
        </RadioGroup>
      </FormControl>
      <br/><br/>
      <FormControl id='addUser-roles'>
        <FormLabel>{t('employee')} / {t('servicePersonnel')}</FormLabel>
        <FormControlLabel
          control={
            <Checkbox
              checked={isEmployee}
              onChange={(e) => setIsEmployee(e.target.checked)}
              disabled={isAdmin}
            />
          }
          label={t('employee')}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={isServicePersonnel}
              onChange={(e) => setIsServicePersonnel(e.target.checked)}
              disabled={isAdmin}
            />
          }
          label={t('servicePersonnel')}
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
