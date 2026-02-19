import { useEffect, useRef } from 'react';
import { getRequest } from '../RequestFunctions/RequestFunctions';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
const HEARTBEAT_INTERVAL_MINUTES = 10;

const JwtHeartbeat = () => {
    const navigate = useNavigate();
    const headers = useRef((() => {
        try {
            const rawSession = sessionStorage.getItem('headers');
            if (rawSession) return JSON.parse(rawSession);
            const rawLocal = localStorage.getItem('headers');
            if (rawLocal) return JSON.parse(rawLocal);
        } catch {
            // ignore parse errors
        }
        return null;
    })());
    const { t } = useTranslation();
    useEffect(() => {
        const clearAuth = () => {
            sessionStorage.removeItem('headers');
            sessionStorage.removeItem('accessToken');
            localStorage.removeItem('headers');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userId');
        };

        const checkJwtValidity = async () => {
            const hasToken = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
            if (!hasToken) return;
            getRequest(
                `${process.env.REACT_APP_BACKEND_URL}/hearbeat`,
                headers.current,
                () => { },
                (errCode) => { 
                    if (errCode===401) {
                        clearAuth();
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
