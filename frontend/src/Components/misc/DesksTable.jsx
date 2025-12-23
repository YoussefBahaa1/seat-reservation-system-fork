import { useTranslation } from 'react-i18next';
import { Button } from '@mui/material';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from '@mui/material';

const DeskTable = ({name, desks, submit_function}) =>{
    const { t } = useTranslation();
    
    return (
        <TableContainer component={Paper} sx={{
            maxHeight: 400, // Set max height
            overflowY: 'auto', // Enable vertical scroll
        }}>
            <Table stickyHeader id='room_table'>
                <TableHead>
                    <TableRow>
                        <TableCell>{t('deskRemark')}</TableCell>
                        <TableCell>{t('equipment')}</TableCell>
                        <TableCell>{t('roomRemark')}</TableCell>
                        <TableCell>{t('building')}</TableCell>
                        <TableCell>{t('floor')}</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {
                        desks.map((desk) => (
                            <TableRow id={name+'_'+desk.remark} key={desk.id}>
                                <TableCell>{desk.remark}</TableCell>
                                <TableCell>{t(desk.equipment.equipmentName)}</TableCell>
                                <TableCell>{desk.room.remark}</TableCell>
                                <TableCell>{desk.room.floor.building.name}</TableCell>
                                <TableCell>{desk.room.floor.name}</TableCell>
                                <TableCell>
                                    <Button id={`sbmt_btn_${desk.remark}`} variant='contained' onClick={(_)=>{
                                        submit_function(desk);}}>
                                        {t('submit')}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export {DeskTable};