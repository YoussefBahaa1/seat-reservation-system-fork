import Button from '@mui/material/Button';
import { styled } from '@mui/system';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const GenericBackButton = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    function back() {
        navigate(-1);
      }

    const StyledButton = styled(Button)({
        backgroundColor: '#008444',
        color: '#fff',
        position: 'fixed',
        top: '10px',
        right: '10px',
        '&:hover': {
          backgroundColor: '#006633',
        },
      });
      return (
        <StyledButton id='generic_back_button' onClick={back} variant="contained">
            {t('back')}
        </StyledButton>
      );
};

export default GenericBackButton;