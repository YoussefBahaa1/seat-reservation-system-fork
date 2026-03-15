import { FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import {
    booleanChoiceOptions,
    monitorCountOptions,
    workstationTypeOptions,
} from '../../misc/workstationMetadata';

const SPECIAL_FEATURES_MAX_LENGTH = 120;

export default function WorkStationDefinition({
    t, 
    remark,
    setRemark,
    workstationType,
    setWorkstationType,
    monitorsQuantity,
    setMonitorsQuantity,
    deskHeightAdjustable,
    setDeskHeightAdjustable,
    technologyDockingStation,
    setTechnologyDockingStation,
    technologyWebcam,
    setTechnologyWebcam,
    technologyHeadset,
    setTechnologyHeadset,
    specialFeatures,
    setSpecialFeatures,
    disabled=false
}) {
    const yesNoOptions = booleanChoiceOptions(t);
    const adjustableOptions = booleanChoiceOptions(t, 'adjustable', 'notAdjustable');

    return (
        <>
            <FormControl id='workstationDefinition_setType' required fullWidth size='small'>
                <InputLabel>{t('ergonomics')}</InputLabel>
                <Select
                    disabled={disabled}
                    value={workstationType}
                    label={t('ergonomics')}
                    onChange={(e) => setWorkstationType(e.target.value)}
                >
                    {workstationTypeOptions(t).map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <br/><br/>
            <FormControl id='workstationDefinition_setMonitors' required fullWidth size='small'>
                <InputLabel>{t('monitors')}</InputLabel>
                <Select
                    disabled={disabled}
                    value={String(monitorsQuantity)}
                    label={t('monitors')}
                    onChange={(e) => setMonitorsQuantity(Number(e.target.value))}
                >
                    {monitorCountOptions().map((option) => (
                        <MenuItem key={option.value} value={String(option.value)}>{option.label}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <br/><br/>
            <FormControl id='workstationDefinition_setAdjustable' required fullWidth size='small'>
                <InputLabel>{t('deskType')}</InputLabel>
                <Select
                    disabled={disabled}
                    value={String(Boolean(deskHeightAdjustable))}
                    label={t('deskType')}
                    onChange={(e) => setDeskHeightAdjustable(e.target.value === 'true')}
                >
                    {adjustableOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <br/><br/>
            <FormControl id='workstationDefinition_setDockingStation' required fullWidth size='small'>
                <InputLabel>{t('technologyDockingStation')}</InputLabel>
                <Select
                    disabled={disabled}
                    value={String(Boolean(technologyDockingStation))}
                    label={t('technologyDockingStation')}
                    onChange={(e) => setTechnologyDockingStation(e.target.value === 'true')}
                >
                    {yesNoOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <br/><br/>
            <FormControl id='workstationDefinition_setWebcam' required fullWidth size='small'>
                <InputLabel>{t('technologyWebcam')}</InputLabel>
                <Select
                    disabled={disabled}
                    value={String(Boolean(technologyWebcam))}
                    label={t('technologyWebcam')}
                    onChange={(e) => setTechnologyWebcam(e.target.value === 'true')}
                >
                    {yesNoOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <br/><br/>
            <FormControl id='workstationDefinition_setHeadset' required fullWidth size='small'>
                <InputLabel>{t('technologyHeadset')}</InputLabel>
                <Select
                    disabled={disabled}
                    value={String(Boolean(technologyHeadset))}
                    label={t('technologyHeadset')}
                    onChange={(e) => setTechnologyHeadset(e.target.value === 'true')}
                >
                    {yesNoOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <br/><br/>
            <FormControl id='workStationDefinition_setRemark' required size='small' fullWidth variant='standard'>
                <TextField
                    disabled={disabled}
                    id='textfield_desk_remark'
                    data-testid='textfield_desk_remark'
                    label={t('deskRemark')}
                    required
                    size='small'
                    type={'string'}
                    value={remark}
                    onChange={(e)=>setRemark(e.target.value)}
                />
            </FormControl>
            <br/><br/>
            <FormControl id='workstationDefinition_setSpecialFeatures' required={false} size='small' fullWidth variant='standard'>
                <TextField
                    disabled={disabled}
                    id='textfield_special_features'
                    label={t('specialFeatures')}
                    size='small'
                    type='string'
                    value={specialFeatures}
                    inputProps={{ maxLength: SPECIAL_FEATURES_MAX_LENGTH }}
                    helperText={`${String(specialFeatures || '').length}/${SPECIAL_FEATURES_MAX_LENGTH}`}
                    onChange={(e)=>setSpecialFeatures(e.target.value)}
                />
            </FormControl>
        </>
    );
}
