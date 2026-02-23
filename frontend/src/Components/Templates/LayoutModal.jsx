import {Dialog, DialogActions, DialogContent, DialogTitle, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
/** 
 * Simple template for modal windows.
 * @param isOpen Boolean flag that indicates if the modal is shown.
 * @param onClose Function that closes the modal.
 * @param title The title of the modal 
 * @param submit Function that is triggered if the user clicks the submit.
 * @param submitTxt The text on the button, that if pressed triggers submit.
 * @param widthInPx The amount of pixels for the width of the modal. If not provided the width is 'auto'.
 * @param children The content of the modal.  
 */
const LayoutModal = ({isOpen, onClose, title, submit, submitTxt='', widthInPx='', children}) => {
    const { t } = useTranslation();
    submitTxt = submitTxt === '' ? t('submit') : submitTxt;
    return (
        <Dialog 
            open={isOpen} 
            onClose={onClose}
            maxWidth={false} // Important to expand over standard size
            PaperProps={{
            style: {
                width: widthInPx !== '' ? `${widthInPx}px` : 'auto',
                height: 'auto',
            },
            }}
        >
            {title !== '' && <DialogTitle sx={{fontSize: '32px', fontWeight: 700, lineHeight: 1.2}}>{title}</DialogTitle>}
            <DialogContent>
                {children}
            </DialogContent>
            <DialogActions>
            <Button id='modal_close' onClick={onClose} color='primary'>
                {t('cancel')}
            </Button>
            {submit && 
                <Button id='modal_submit' color='primary' onClick={submit} autoFocus>
                    {submitTxt}
                </Button>
            }
            </DialogActions>
        </Dialog>
    );
};

export default LayoutModal;
