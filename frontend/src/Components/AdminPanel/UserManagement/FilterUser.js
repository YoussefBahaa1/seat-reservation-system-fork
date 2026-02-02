import React, { useEffect, useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, TextField, Checkbox, FormControlLabel } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * Depending on the parameters set in this components an filter function is created.
 * This filter function is returned to the parent component. This function is applied to
 * filter users.
 * 
 * @param {*} setFilterFunction Set the created filter function to be used in the parent component.
 */
export default function FilterUser({ setFilterFunction }) {
    const { t } = useTranslation();
    const [isEnabled, setIsEnabled] = useState(false);
    const [field, setField] = useState('');
    const [condition, setCondition] = useState('');
    const [text, setText] = useState('');

    const handleFilterChange = () => {
        const newFilterFunction = isEnabled ? 
            () => (element) => {
                if (condition === 'is_equal') {
                    return element[field] === text;
                } else if (condition === 'contains') {
                    if (element[field])
                        return element[field].toUpperCase()?.includes(text.toUpperCase());
                }
                return false;
            } : 
            () => (_)=>{return true};
        
        setFilterFunction(newFilterFunction);  // Always pass a function to setFilterFunction
    };

    useEffect(handleFilterChange, [setFilterFunction, isEnabled, field, condition, text]);

    const handleCheckboxChange = (event) => {
        setIsEnabled(event.target.checked);
    };

    const handleFieldChange = (event) => {
        setField(event.target.value);
    };

    const handleConditionChange = (event) => {
        setCondition(event.target.value);
    };

    const handleTextChange = (event) => {
        setText(event.target.value);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
            <FormControlLabel
                control={
                    <Checkbox
                        id='checkbox_handleCheckboxChange'
                        checked={isEnabled}
                        onChange={handleCheckboxChange}
                    />
                }
                label={t('enableFilter')}
                style={{ minWidth: '150px' }}
            />
            <FormControl id='filterUser_handleFieldChange' variant='outlined' fullWidth disabled={!isEnabled}>
                <InputLabel>{t('column')}</InputLabel>
                <Select
                    value={field}
                    onChange={handleFieldChange}
                    label={t('column')}
                >
                    <MenuItem value='name'>{t('name')}</MenuItem>
                    <MenuItem value='surname'>{t('surname')}</MenuItem>
                    <MenuItem value='email'>Email</MenuItem>
                </Select>
            </FormControl>
            <FormControl id='filterUser_handleConditionChange' variant='outlined' fullWidth disabled={!isEnabled}>
                <InputLabel>{t('condition')}</InputLabel>
                <Select
                    value={condition}
                    onChange={handleConditionChange}
                    label={t('condition')}
                >
                    <MenuItem value='contains'>{t('contains')}</MenuItem>
                    <MenuItem value='is_equal'>{t('isEqual')}</MenuItem>
                </Select>
            </FormControl>
            <FormControl id='filterUser_handleTextChange' variant='outlined' fullWidth disabled={!isEnabled}>
            <TextField 
                placeholder={t('enterText')}
                value={text}
                onChange={handleTextChange}
            />
            </FormControl>
        </div>
    );
}
