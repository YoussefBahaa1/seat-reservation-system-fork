import React, { useEffect, useRef, useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, TextField, Checkbox, FormControlLabel, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

// Define which fields are text fields vs boolean fields
const TEXT_FIELDS = ['email', 'name', 'surname', 'department'];
const BOOLEAN_FIELDS = ['active', 'mfaEnabled'];
const ROLE_FIELD = 'role';

/**
 * Depending on the parameters set in this components an filter function is created.
 * This filter function is returned to the parent component. This function is applied to
 * filter users.
 * 
 * @param {*} setFilterFunction Set the created filter function to be used in the parent component.
 * @param {*} t Translation function (optional, passed from parent)
 */
export default function FilterUser({ setFilterFunction, t: parentT }) {
    const { t: hookT } = useTranslation();
    const t = parentT || hookT;
    
    const [isEnabled, setIsEnabled] = useState(false);
    const nextId = useRef(0);
    const [filters, setFilters] = useState(() => ([
        {
            id: nextId.current++,
            field: '',
            condition: 'contains',
            text: '',
            boolValue: 'any',
            roleValue: 'any'
        }
    ]));
    const [combineMode, setCombineMode] = useState('all');

    const isBooleanField = (field) => BOOLEAN_FIELDS.includes(field);
    const isRoleField = (field) => field === ROLE_FIELD;
    const isTextField = (field) => TEXT_FIELDS.includes(field);

    const handleFilterChange = () => {
        if (!isEnabled) {
            setFilterFunction(() => (_) => true);
            return;
        }

        const activeFilters = filters.filter((filter) => filter.field);
        if (activeFilters.length === 0) {
            setFilterFunction(() => (_) => true);
            return;
        }

        const newFilterFunction = () => (element) => {
            const matcher = combineMode === 'any' ? 'some' : 'every';
            return activeFilters[matcher]((filter) => {
                if (isBooleanField(filter.field)) {
                    if (filter.boolValue === 'any') return true;
                    const elementValue = element[filter.field];
                    if (filter.boolValue === 'true') return elementValue === true;
                    if (filter.boolValue === 'false') return elementValue === false || elementValue === undefined;
                    return true;
                }
                if (isRoleField(filter.field)) {
                    if (filter.roleValue === 'any') return true;
                    if (element.admin) return filter.roleValue === 'admin';
                    if (element.employee && element.servicePersonnel) return filter.roleValue === 'employeeServicePersonnel';
                    if (element.employee) return filter.roleValue === 'employee';
                    if (element.servicePersonnel) return filter.roleValue === 'servicePersonnel';
                    return false;
                }

                const elementValue = element[filter.field];
                if (!elementValue && filter.text) return false;
                if (!filter.text) return true;
                
                if (filter.condition === 'is_equal') {
                    return String(elementValue).toLowerCase() === filter.text.toLowerCase();
                } else if (filter.condition === 'contains') {
                    return String(elementValue).toUpperCase().includes(filter.text.toUpperCase());
                }
                return true;
            });
        };

        setFilterFunction(newFilterFunction);
    };

    useEffect(handleFilterChange, [setFilterFunction, isEnabled, filters, combineMode]);

    const handleCheckboxChange = (event) => {
        setIsEnabled(event.target.checked);
    };

    const updateFilter = (id, updates) => {
        setFilters((prev) => prev.map((filter) => (
            filter.id === id ? { ...filter, ...updates } : filter
        )));
    };

    const handleFieldChange = (id, value) => {
        if (isBooleanField(value)) {
            updateFilter(id, {
                field: value,
                boolValue: 'any',
                condition: 'contains',
                text: '',
                roleValue: 'any'
            });
            return;
        }
        if (isRoleField(value)) {
            updateFilter(id, {
                field: value,
                roleValue: 'any',
                condition: 'contains',
                text: '',
                boolValue: 'any'
            });
            return;
        }

        updateFilter(id, {
            field: value,
            condition: 'contains',
            text: '',
            boolValue: 'any',
            roleValue: 'any'
        });
    };

    const handleConditionChange = (id, value) => {
        updateFilter(id, { condition: value });
    };

    const handleTextChange = (id, value) => {
        updateFilter(id, { text: value });
    };

    const handleBoolValueChange = (id, value) => {
        updateFilter(id, { boolValue: value });
    };

    const handleRoleValueChange = (id, value) => {
        updateFilter(id, { roleValue: value });
    };

    const addFilter = () => {
        setFilters((prev) => ([
            ...prev,
            {
                id: nextId.current++,
                field: '',
                condition: 'contains',
                text: '',
                boolValue: 'any',
                roleValue: 'any'
            }
        ]));
    };

    const removeFilter = (id) => {
        setFilters((prev) => (
            prev.length === 1 ? prev : prev.filter((filter) => filter.id !== id)
        ));
    };

    return (
        <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            id='checkbox_handleCheckboxChange'
                            checked={isEnabled}
                            onChange={handleCheckboxChange}
                        />
                    }
                    label={t('enableFilter')}
                    style={{ minWidth: '130px' }}
                />
                <FormControl id='filterUser_combineMode' variant='outlined' size='small' sx={{ minWidth: 160 }} disabled={!isEnabled}>
                    <InputLabel id='filterUser_combineMode-label'>{t('match')}</InputLabel>
                    <Select
                        labelId='filterUser_combineMode-label'
                        value={combineMode}
                        onChange={(event) => setCombineMode(event.target.value)}
                        label={t('match')}
                    >
                        <MenuItem value='all'>{t('all')}</MenuItem>
                        <MenuItem value='any'>{t('any')}</MenuItem>
                    </Select>
                </FormControl>
                <Button
                    id='filterUser_addFilter'
                    variant='outlined'
                    size='small'
                    onClick={addFilter}
                    disabled={!isEnabled}
                >
                    {t('addFilter')}
                </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filters.map((filter) => {
                    const fieldControlId = `filterUser_field_${filter.id}`;
                    const conditionControlId = `filterUser_condition_${filter.id}`;
                    const textControlId = `filterUser_text_${filter.id}`;
                    const boolControlId = `filterUser_bool_${filter.id}`;
                    const roleControlId = `filterUser_role_${filter.id}`;
                    const isFilterTextField = isTextField(filter.field);
                    const isFilterBooleanField = isBooleanField(filter.field);
                    const isFilterRoleField = isRoleField(filter.field);

                    return (
                        <div key={filter.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <FormControl id={fieldControlId} variant='outlined' size='small' sx={{ minWidth: 150 }} disabled={!isEnabled}>
                                <InputLabel id={`${fieldControlId}-label`}>{t('column')}</InputLabel>
                                <Select
                                    labelId={`${fieldControlId}-label`}
                                    value={filter.field}
                                    onChange={(event) => handleFieldChange(filter.id, event.target.value)}
                                    label={t('column')}
                                >
                                    <MenuItem value='email'>{t('email')}</MenuItem>
                                    <MenuItem value='name'>{t('name')}</MenuItem>
                                    <MenuItem value='surname'>{t('surname')}</MenuItem>
                                    <MenuItem value='department'>{t('department')}</MenuItem>
                                    <MenuItem value='active'>{t('activity')}</MenuItem>
                                    <MenuItem value='role'>{t('role')}</MenuItem>
                                    <MenuItem value='mfaEnabled'>MFA</MenuItem>
                                </Select>
                            </FormControl>
                            
                            {/* Show text-based filter controls for text fields */}
                            {isFilterTextField && (
                                <>
                                    <FormControl id={conditionControlId} variant='outlined' size='small' sx={{ minWidth: 130 }} disabled={!isEnabled || !filter.field}>
                                        <InputLabel id={`${conditionControlId}-label`}>{t('condition')}</InputLabel>
                                        <Select
                                            labelId={`${conditionControlId}-label`}
                                            value={filter.condition}
                                            onChange={(event) => handleConditionChange(filter.id, event.target.value)}
                                            label={t('condition')}
                                        >
                                            <MenuItem value='contains'>{t('contains')}</MenuItem>
                                            <MenuItem value='is_equal'>{t('isEqual')}</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl id={textControlId} variant='outlined' size='small' sx={{ minWidth: 180 }} disabled={!isEnabled || !filter.field}>
                                        <TextField 
                                            placeholder={t('enterText')}
                                            value={filter.text}
                                            onChange={(event) => handleTextChange(filter.id, event.target.value)}
                                            size='small'
                                        />
                                    </FormControl>
                                </>
                            )}
                            
                            {/* Show boolean filter controls for boolean fields */}
                            {isFilterBooleanField && (
                                <FormControl id={boolControlId} variant='outlined' size='small' sx={{ minWidth: 130 }} disabled={!isEnabled || !filter.field}>
                                    <InputLabel id={`${boolControlId}-label`}>{t('value')}</InputLabel>
                                    <Select
                                        labelId={`${boolControlId}-label`}
                                        value={filter.boolValue}
                                        onChange={(event) => handleBoolValueChange(filter.id, event.target.value)}
                                        label={t('value')}
                                    >
                                        <MenuItem value='any'>{t('any')}</MenuItem>
                                        <MenuItem value='true'>{t('true')}</MenuItem>
                                        <MenuItem value='false'>{t('false')}</MenuItem>
                                    </Select>
                                </FormControl>
                            )}

                            {/* Show role filter controls for role field */}
                            {isFilterRoleField && (
                                <FormControl id={roleControlId} variant='outlined' size='small' sx={{ minWidth: 200 }} disabled={!isEnabled || !filter.field}>
                                    <InputLabel id={`${roleControlId}-label`}>{t('role')}</InputLabel>
                                    <Select
                                        labelId={`${roleControlId}-label`}
                                        value={filter.roleValue}
                                        onChange={(event) => handleRoleValueChange(filter.id, event.target.value)}
                                        label={t('role')}
                                    >
                                        <MenuItem value='any'>{t('any')}</MenuItem>
                                        <MenuItem value='admin'>{t('admin')}</MenuItem>
                                        <MenuItem value='employee'>{t('employee')}</MenuItem>
                                        <MenuItem value='servicePersonnel'>{t('servicePersonnel')}</MenuItem>
                                        <MenuItem value='employeeServicePersonnel'>{t('employee')}/{t('servicePersonnel')}</MenuItem>
                                    </Select>
                                </FormControl>
                            )}

                            <Button
                                id={`filterUser_removeFilter_${filter.id}`}
                                variant='text'
                                size='small'
                                onClick={() => removeFilter(filter.id)}
                                disabled={!isEnabled || filters.length === 1}
                            >
                                {t('removeFilter')}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
