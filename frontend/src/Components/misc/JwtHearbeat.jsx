import { useEffect, useRef } from 'react';
import { getRequest } from '../RequestFunctions/RequestFunctions';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
const HEARTBEAT_INTERVAL_MINUTES = 10;

const JwtHeartbeat = () => {
    const navigate = useNavigate();
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    const { t } = useTranslation();
    useEffect(() => {
        const checkJwtValidity = async () => {
            //console.log(localStorage.getItem('userId'), typeof localStorage.getItem('userId'));
            if (!localStorage.getItem('userId')) return;
            getRequest(
                `${process.env.REACT_APP_BACKEND_URL}/hearbeat`,
                headers.current,
                () => { },
                (errCode) => { 
                    if (errCode===401) {
                        navigate('/', { replace: true });
                        toast.error(t('tokenInvalid'));
                    }
                },
            );
        };

    checkJwtValidity();

    const interval = setInterval(
      checkJwtValidity,
      HEARTBEAT_INTERVAL_MINUTES * 60 * 1000
    );

    return () => clearInterval(interval); // ✅ Cleanup im useEffect!
  }, [t, navigate]);
  return null;//(!isValid && <div>Token abgelaufen</div>);
};

export default JwtHeartbeat;