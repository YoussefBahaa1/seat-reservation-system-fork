import { MenuItem,FormControl, Select, Typography } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import {useEffect, useState, useRef} from 'react';

import { getRequest } from './RequestFunctions/RequestFunctions';

export default function DeskSelector(
    {
        selectedRoom,
        t,
        onChangeSelectedDesk
    }
) {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    const [desks, setDesks] = useState([]);



    useEffect(()=>{
        // Set defaults.
        setDesks([]);
        
        if (!selectedRoom)
            return;

        getRequest(
            `${process.env.REACT_APP_BACKEND_URL}/admin/desks/room/${selectedRoom.id}`,
            headers.current,
            d => {
                setDesks(d);
                if (d.length < 1) {
                    onChangeSelectedDesk('');
                }
                else {
                    onChangeSelectedDesk(d[0]);
                }
            },
            () => {console.log('Failed to fetch all desks in DeskSelector.js.');},
            headers
            );
    }, [selectedRoom, onChangeSelectedDesk]);

    return (
        selectedRoom && (<>
            <Typography>{selectedRoom.remark}</Typography>
            {selectedRoom && desks?.length > 0 ? 
                    
                    <div style={{ display: 'flex', gap: '.2rem' }}>
                        <Typography>{t('chooseDesk')}</Typography>
                        <FormControl 
                            id='deskSelector'>
                        <Select
                            
                            value=''
                            label={t('desk')}
                            onChange={e => onChangeSelectedDesk(desks.find(d => d['id'] === e.target.value))}
                            variant='standard'
                            disableUnderline
                            IconComponent={ArrowDropDownIcon}
                            sx={{
                                minWidth: 'unset',
                                padding: 0,
                                '& .MuiSelect-select': {
                                    padding: 0,
                                },
                            }}
                        >
                            {
                                desks.map(desk => {
                                    return <MenuItem id={`selectDeskForRoom_${desk.id}`} key={desk.id} value={desk.id}>{desk.remark}</MenuItem>;
                                })
                            }
                        </Select>
                        </FormControl>
                    </div>
                : <div>{t('noWorkstationForThisRoom')}</div>}
        </>)
    );
};