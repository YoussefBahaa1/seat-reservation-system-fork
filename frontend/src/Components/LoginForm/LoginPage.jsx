import { useReducer } from 'react';
import './LoginPage.css';
import { Box, Button,  FormControl, OutlinedInput, InputAdornment, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaUser } from 'react-icons/fa';
import { FaLock } from 'react-icons/fa';
import { MdSecurity } from 'react-icons/md';
import { toast } from 'react-toastify';
import { styles } from './LoginPage.style';
import isEmail from '../misc/isEmail';
import InfoModal from '../InfoModal';
import News from './News';
import i18n from '../../i18n';

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initState = {
    email: '',
    password: '',
    loginError: '',
    // MFA state
    mfaRequired: false,
    mfaToken: '',
    mfaCode: '',
    mfaUserData: null // Store user data from first login step
  };
  function reducer(state, action) {
    switch(action.type) {
      case 'reset': 
        return initState;
      case 'updateField':
        return {...state, [action.field]: action.value };
      case 'setMfaRequired':
        return {
          ...state,
          mfaRequired: true,
          mfaToken: action.mfaToken,
          mfaUserData: action.userData,
          loginError: ''
        };
      case 'clearMfa':
        return {
          ...state,
          mfaRequired: false,
          mfaToken: '',
          mfaCode: '',
          mfaUserData: null
        };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, initState);

  // Complete login - store credentials and navigate
  function completeLogin(data) {
    const authHeaders = {
      'Authorization': 'Bearer ' + String(data['accessToken']),
      'Content-Type': 'application/json',
    };
    sessionStorage.setItem('headers', JSON.stringify(authHeaders));
    localStorage.setItem('headers', JSON.stringify(authHeaders));
    localStorage.setItem('email', String(data.email));
    localStorage.setItem('userId', String(data.id));
    localStorage.setItem('name', String(data.name));
    localStorage.setItem('surname', String(data.surname));
    localStorage.setItem('admin', String(data.admin));
    localStorage.setItem('visibility', String(data.visibility));
    const userLang = localStorage.getItem(`language_${data.id}`) || 'en';
    i18n.changeLanguage(userLang);
    sessionStorage.setItem('accessToken', String(data['accessToken']));
    localStorage.setItem('accessToken', String(data['accessToken']));
    navigate('/home', { replace: true });
  }

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
        completeLogin(data);
      } else if (data.message === 'MFA_REQUIRED' && data.requiresMfa) {
        // MFA is required - show MFA verification step
        dispatch({ 
          type: 'setMfaRequired', 
          mfaToken: data.mfaToken,
          userData: {
            email: data.email,
            id: data.id,
            name: data.name,
            surname: data.surname,
            admin: data.admin,
            visibility: data.visibility
          }
        });
        toast.info(t('mfaRequired'));
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

  async function verifyMfa() {
    if (!state.mfaCode || state.mfaCode.length !== 6) {
      dispatch({ type: 'updateField', field: 'loginError', value: t('mfaInvalidCode')});
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/users/mfa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mfaToken: state.mfaToken,
          code: state.mfaCode
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.message === 'SUCCESS') {
        completeLogin(data);
      } else if (data.message === 'INVALID_MFA_TOKEN') {
        toast.error(t('mfaTokenExpired'));
        dispatch({ type: 'clearMfa' });
      } else {
        toast.error(t('mfaInvalidCode'));
        dispatch({ type: 'updateField', field: 'loginError', value: t('mfaInvalidCode')});
        dispatch({ type: 'updateField', field: 'mfaCode', value: '' });
      }
    } catch (error) {
      toast.error(t('loginFailed'));
      dispatch({ type: 'updateField', field: 'loginError', value: t('loginFailed')});
    }
  }

  function handleBackToLogin() {
    dispatch({ type: 'clearMfa' });
    dispatch({ type: 'updateField', field: 'password', value: '' });
  }

  // Render MFA verification step
  if (state.mfaRequired) {
    return (
      <>
      <Box sx={styles.mfaWrapper_sx}>
        <Box sx={{ ...styles.box, ...styles.centeredBox }}>
          <h1 style={styles.h1}>{t('mfaRequired')}</h1>
          <img src={'/Assets/flag.png'} alt='Flag' className='flag-image' />
          <MdSecurity size={40} color="#008444" />
          <Typography variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
            {t('mfaCodeLabel')}
          </Typography>
          <form
            style={{ width: '100%' }}
            onSubmit={(e) => {
              e.preventDefault();
              verifyMfa();
            }}
          >
            <FormControl fullWidth required size='small'>
              <OutlinedInput
                id='mfaCode'
                type='text'
                value={state.mfaCode}
                placeholder="000000"
                inputProps={{ 
                  maxLength: 6,
                  pattern: '[0-9]*',
                  inputMode: 'numeric',
                  style: { textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5em' }
                }}
                onChange={e => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  dispatch({type: 'updateField', field: 'mfaCode', value});
                }}
                endAdornment={
                  <InputAdornment position='end' sx={styles.inputAdornment_sx}>
                    <MdSecurity/>
                  </InputAdornment>
                }
                sx={styles.outlinedInput_sx}
              />
            </FormControl>
            <br/><br/>

            {state.loginError && <div id='loginErrorMsg' className='error'>{state.loginError}</div>}

            <Button id='mfa_verify_btn' type='submit' color='primary' sx={styles.button_sx}>
              {t('mfaVerify')}
            </Button>
            <br/><br/>
            <Button 
              variant="text" 
              color="secondary" 
              onClick={handleBackToLogin}
              sx={styles.secondaryButton_sx}
            >
              {t('back')}
            </Button>
          </form>
        </Box>
      </Box>
      </>
    );
  }

  // Render normal login form
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
