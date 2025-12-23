import { FormControl, TextField} from '@mui/material';
import MySelectComponent from '../../misc/MySelectComponent';

export default function RoomDefinition({t, defaultRoomType, setDefaultRoomType, defaultRoomStatus, setDefaultRoomStatus, remark, setRemark}) {
    return (
        <>
            <MySelectComponent 
                t={t}
                id='roomDefinition_setType'
                name='type'
                value={defaultRoomType}
                setValue={setDefaultRoomType}
                url='roomTypes'
                propertyName='roomTypeName'
                idName='roomTypeId'
            />
            <br></br> <br></br>
            <MySelectComponent 
                t={t}
                id='roomDefinition_setStatus'
                name='status'
                value={defaultRoomStatus}
                setValue={setDefaultRoomStatus}
                url='roomStatuses'
                propertyName='roomStatusName'
                idName='roomStatusId'
            />
            <br></br> <br></br>
            <FormControl id='roomDefinition_setRemark' required={true} size='small' fullWidth variant='standard'>
            <TextField
                id='textfield_remark'
                label={t('roomRemark')}
                size='small'
                type={'text'}
                value={remark}
                onChange={(e)=>setRemark(e.target.value)}
            />
            </FormControl>
        </>
    )
};