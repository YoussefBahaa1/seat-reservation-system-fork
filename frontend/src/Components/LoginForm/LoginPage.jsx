import { useReducer } from 'react';
import './LoginPage.css';
import { Box, Button,  FormControl, OutlinedInput, InputAdornment } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaUser } from 'react-icons/fa';
import { FaLock } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { styles } from './LoginPage.style';
import isEmail from '../misc/isEmail';
import InfoModal from '../InfoModal';
import News from './News';
const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initState = {
    email: '',
    password: '',
    loginError: ''
  };
  function reducer(state, action) {
    switch(action.type) {
      case 'reset': 
        return initState;
      case 'updateField':
        return {...state, [action.field]: action.value };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, initState);

  async function login() {
    if (!isEmail(state.email.trim())) {
      dispatch({ type: 'updateField', field: 'loginError', value: t('invalidEmail')});
      return;
    }
    
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({email:state.email.trim(), password:state.password.trim()}),
      });
      if (!response.ok) {
        throw new Error('Login failed');
      }
      const data = await response.json();
      if (data === null)
        throw new Error('Response is null');

      if (data.message === String('SUCCESS')) {
        sessionStorage.setItem('headers',  JSON.stringify({
          'Authorization': 'Bearer ' +  String(data['accessToken']),
          'Content-Type': 'application/json',
        }));
        localStorage.setItem('email', String(data.email));
        localStorage.setItem('userId', String(data.id));
        localStorage.setItem('name', String(data.name));
        localStorage.setItem('surname', String(data.surname));
        localStorage.setItem('admin', String(data.admin));
        localStorage.setItem('visibility', String(data.visibility));
        sessionStorage.setItem('accessToken', String(data['accessToken']));
        navigate('/home', { replace: true });
      } else {
        const errorMsg = t('loginFailed') + ' ' + t(process.env[`REACT_APP_${data.message}`]);
        toast.error(errorMsg);
        dispatch({ type: 'updateField', field: 'loginError', value: errorMsg})
        return;
      }
    } catch (error) {
      toast.error(t('loginFailed'));
      dispatch({ type: 'updateField', field: 'loginError', value: t('loginFailed')});
    }
  }

  return (
    <>
    <Box sx={styles.wrapper_sx}>
      <Box sx={styles.box}>
        <h1 style={styles.h1}>{t('login')}</h1>
        <br/>
        <img src={'/Assets/flag.png'} alt='Flag' className='flag-image' />
        <form
          onSubmit={(e)=>{
              // Prevent page reload. 
              e.preventDefault();
              login();
            }
          }
        >
        <FormControl fullWidth required size='small'>
          <OutlinedInput
            id='email'
            type='text'
            value={state.email}
            //onKeyDown={onKeyDown}
            onChange={e => dispatch({type: 'updateField', field: 'email', value: e.target.value})}
            endAdornment={
              <InputAdornment
                position='end'
                sx={styles.inputAdornment_sx}
              >
                <FaUser/>
              </InputAdornment>
            }
            sx={styles.outlinedInput_sx}
          />
        </FormControl>
        <br/><br/>

        <FormControl fullWidth required size='small'>
          <OutlinedInput
            id='password'
            type='password'
            value={state.password}
            //onKeyDown={onKeyDown}
            onChange={e => dispatch({type: 'updateField', field: 'password', value:e.target.value})}
            endAdornment={
              <InputAdornment
                position='end'
                sx={styles.inputAdornment_sx}
              >
                <FaLock/>
              </InputAdornment>
            }
            sx={styles.outlinedInput_sx}
          />
        </FormControl>
        <br/><br/>

        {state.loginError && <div id='loginErrorMsg' className='error'>{state.loginError}</div>}
        <Button id='login_btn' type='submit' color='primary' onClick={login} sx={styles.button_sx}>
            {t('login')}
        </Button>
        </form>
 
        
      </Box>
      
    </Box>
    <InfoModal text={`<h1>${t('news')}</h1>${News}`} helpIcon={false}/>
    </>
  );
};

export default LoginPage;
