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

const DeskTable = ({
    name,
    desks,
    submit_function,
    onReportDefect,
    hideHeader = false,
    submitLabelKey = 'submit',
    submitLabelKeyForDesk = null,
    submitButtonSxForDesk = null,
    tableContainerSx = null,
}) =>{
    const { t } = useTranslation();

    const equipmentSummary = (desk) => {
        const hasSpecialFeatures = desk?.specialFeatures != null && String(desk.specialFeatures).trim() !== '';
        const monitorCount = desk?.monitorsQuantity ?? 1;
        const labels = [
            t(`workstationType${desk?.workstationType || 'Standard'}`),
            `${monitorCount} ${t(monitorCount === 1 ? 'monitorSingular' : 'monitors')}`,
        ];

        if (desk?.deskHeightAdjustable === true) {
            labels.push(t('adjustableHeight'));
        }

        if (desk?.technologyDockingStation === true) {
            labels.push(t('technologyDockingStation'));
        }
        if (desk?.technologyWebcam === true) {
            labels.push(t('technologyWebcam'));
        }
        if (desk?.technologyHeadset === true) {
            labels.push(t('technologyHeadset'));
        }

        if (hasSpecialFeatures) {
            labels.push(`${t('specialFeatures')}: ${String(desk.specialFeatures).trim()}`);
        }
        return labels.join(', ');
    };
    
    return (
        <TableContainer component={Paper} sx={{
            maxHeight: 400,
            overflowY: 'auto',
            ...(tableContainerSx || {}),
        }}>
            <Table stickyHeader={!hideHeader} id='room_table' sx={{ tableLayout: 'fixed' }}>
                {!hideHeader && (
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('deskRemark')}</TableCell>
                            <TableCell>{t('equipment')}</TableCell>
                            <TableCell>{t('roomRemark')}</TableCell>
                            <TableCell>{t('building')}</TableCell>
                            <TableCell>{t('floor')}</TableCell>
                            <TableCell></TableCell>
                            {onReportDefect && <TableCell></TableCell>}
                        </TableRow>
                    </TableHead>
                )}
                <TableBody>
                    {
                        desks.map((desk) => (
                            <TableRow id={name+'_'+desk.remark} key={desk.id}>
                                <TableCell>{desk.remark}</TableCell>
                                <TableCell
                                    sx={{
                                        width: 300,
                                        maxWidth: 300,
                                        whiteSpace: 'normal',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {equipmentSummary(desk)}
                                </TableCell>
                                <TableCell>{desk.room.remark}</TableCell>
                                <TableCell>{desk.room.floor.building.name}</TableCell>
                                <TableCell>{desk.room.floor.name}</TableCell>
                                <TableCell>
                                    <Button
                                        id={`sbmt_btn_${desk.remark}`}
                                        variant='contained'
                                        sx={submitButtonSxForDesk ? submitButtonSxForDesk(desk) : undefined}
                                        onClick={(_)=>{
                                        submit_function(desk);}}>
                                        {t(submitLabelKeyForDesk ? submitLabelKeyForDesk(desk) : submitLabelKey)}
                                    </Button>
                                </TableCell>
                                {onReportDefect && (
                                    <TableCell>
                                        <Button
                                            variant='outlined'
                                            color='error'
                                            size='small'
                                            onClick={() => onReportDefect(desk)}
                                        >
                                            {t('reportDefect')}
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        )
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export {DeskTable};
