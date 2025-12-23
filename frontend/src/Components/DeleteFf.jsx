import {Dialog, Button} from '@mui/material';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import { useTranslation } from "react-i18next";
import React from 'react';

export default function DeleteFf({open, onClose, onDelete, text}) {
    const { t } = useTranslation();

    return (            
        <Dialog
            open={open}
            onClose={onClose}
        >
            <DialogTitle id="alert-dialog-title">
                {t('deleteMoreElements')}
            </DialogTitle>
            <DialogContent>
            <DialogContentText id="alert-dialog-description">
                {text}
            </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button id='delete_ff_btn_no' onClick={onClose}>{t('no')}</Button>
                <Button 
                    id='delete_ff_btn_yes'
                    onClick={() => { 
                            onDelete();
                            onClose();
                        }
                    }    
                >
                    {t('yes')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};