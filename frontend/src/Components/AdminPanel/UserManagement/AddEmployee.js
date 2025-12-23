import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, TextField } from '@mui/material';
import {useRef, useState} from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from "react-i18next";
import {postRequest} from '../../RequestFunctions/RequestFunctions';
import LayoutModalAdmin from '../../Templates/LayoutModalAdmin';

export default function AddEmployee({ isOpen, onClose }) {
  const headers =  useRef(JSON.parse(sessionStorage.getItem('headers')));
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName ] = useState('');
  const [surname, setSurname] = useState('');
  //const [visibility, setVisibility] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  async function addEmployee(){
    if(!email || !password || !name || !surname){
        toast.error(t('fields_not_empty'));
        return false;
    }
    postRequest(
      `${process.env.REACT_APP_BACKEND_URL}/admin/users`,
      headers.current,
      (_) => {
        toast.success(t('userCreated'));
        //addEmployeeModal();
      },
      () => {
        console.log('Failed to create new employee in AddEmployee.js');
        toast.error(t('emailAlreadyTaken'));
      },
      JSON.stringify({
        'email': email.trim(),
        'password': password,
        'name': name,
        'surname': surname,
        'admin': isAdmin,
        'visibility': true,
      })
    );
  }
  return (
    <LayoutModalAdmin
      title={t('addEmployee')}
      onClose={onClose}
      isOpen={isOpen}
      submit={addEmployee}
      submitTxt={t('submit')}
      widthInPx='400'
    > 
      <br/><br/>
      <FormControl id='addEmployee-setEmail' required={true} size="small" fullWidth variant="standard">
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
      <FormControl id='addEmployee-setPassword' required={true} size='small' fullWidth variant='standard'>
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
      <FormControl id='addEmployee-setName' required={true} size="small" fullWidth variant="standard">
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
      <FormControl id='addEmployee-setSurname' required={true} size='small' fullWidth variant='standard'>
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
      <FormControl id='addEmployee-isAdmin'>
        <FormLabel id='addEmployee-isAdmin-label'>{t('admin')}?</FormLabel>
        <RadioGroup
          row
          aria-labelledby='addEmployee-isAdmin-label'
          value={isAdmin}
          onChange={(e)=> setIsAdmin(e.target.value)}
        >
          <FormControlLabel id='radioAdmin_true' value='true' control={<Radio />} label={t('true')} />
          <FormControlLabel id='radioAdmin_false' value='false' control={<Radio />} label={t('false')} />
        
        </RadioGroup>
      </FormControl>
      {/*<br></br>
      <FormControl id='addEmployee-setVisibility'>
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