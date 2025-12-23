import { FormControl, TextField } from '@mui/material';
import MySelectComponent from '../../misc/MySelectComponent';

export default function WorkStationDefinition({
    t, 
    equipment, 
    setEquipment,
    remark,
    setRemark,
    disabled=false
}) {
    
    return (
        <>
            
            {/*equipment &&*/ <MySelectComponent 
                t={t}
                id={'workstationDefinition_setEquipment'}
                name='equipment'
                disabled={disabled}
                value={equipment}
                setValue={setEquipment}
                url='equipments'
                propertyName='equipmentName'
                idName='equipmentId'
            />}
            <br/><br/>
            {/*remark &&*/ <FormControl id='workStationDefinition_setRemark' required={false} size='small' fullWidth variant='standard'>
                <TextField
                    disabled={disabled}
                    id='textfield_desk_remark'
                    data-testid='textfield_desk_remark'
                    label={t('deskRemark')}
                    size='small'
                    type={'string'}
                    value={remark}
                    onChange={(e)=>setRemark(e.target.value)}
                />
            </FormControl>}
        </>
    );
}

