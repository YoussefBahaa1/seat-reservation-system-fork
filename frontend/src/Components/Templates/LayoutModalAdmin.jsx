import { useTranslation } from 'react-i18next';
import {Typography} from '@mui/material';
import LayoutModal from './LayoutModal';
/** 
 * Simple template for modal windows.
 * If the user is no admin an error window is displayed.
 * 
 * @param isOpen Boolean flag that indicates if the modal is shown.
 * @param onClose Function that closes the modal.
 * @param title The title of the modal 
 * @param submit Function that is triggered if the user clicks the submit.
 * @param submitTxt The text on the button, that if pressed triggers submit.
 * @param widthInPx The amount of pixels for the width of the modal. If not provided the width is 'auto'.
 * @param children The content of the modal.  
 */
const LayoutModalAdmin = ({isOpen, onClose, title, submit, submitTxt='', widthInPx='', children}) => {
    const { i18n } = useTranslation();
    return  JSON.parse(localStorage.getItem('admin')) 
    ? 
    <LayoutModal isOpen={isOpen} onClose={onClose} title={title} submit={submit} submitTxt={submitTxt} widthInPx={widthInPx} children={children}/>
    :
    <LayoutModal
        isOpen={isOpen}
        onClose={onClose}
        title={i18n.language === 'de' ? 'Fehler' : 'Error'} 
    >
        <Typography>{i18n.language === 'de' ? 'Sie besitzen nicht die nötigen Rechte dieses Fenster zu sehen!' : 'You have no sufficient rights to see this window!'}</Typography>
    </LayoutModal>
    ;
};

export default LayoutModalAdmin;