import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { getRequest } from '../RequestFunctions/RequestFunctions';
import { useRef, useState, useEffect } from 'react';

export default function  MySelectComponent({
    t,
    id,
    name,
    value,
    setValue,
    url,
    propertyName,
    idName,
    disabled=false
}) {
    const headers = useRef(JSON.parse(sessionStorage.getItem('headers')));
    // The values that shall be provided by the select.
    const [values, setValues] = useState([]);
    // Fetch all values.
    useEffect(()=>{
        getRequest(
            `${process.env.REACT_APP_BACKEND_URL}/${url}`,
            headers.current,
            setValues,
            () => {
                console.log('Error fetching roomTypes in RoomDefinition.js');
            }
        );
    }, [url]);

    // Set the default value if it is not defined.
    useEffect(()=>{
        /**
         * First we check if the default value is not defined or an empty string.
         * This means that the father component dont provide a default value for this.
         * In conclusion we set one status as default. 
         * This happens e.g. when we add a new room.
         */
        if (
            (!value || value === '') &&
            (values?.length > 0)
        ) {
            setValue(values[0]);
        }
    }, [values, value, setValue]);

    return (
        <FormControl 
            id={id} 
            required={true} fullWidth
            disabled={disabled}
        >
            <InputLabel id='inputLabel'>{t(name)}</InputLabel>
                {value && value !== '' && values.length>0 && <Select
                    labelId='inputLabel'
                    value={value[propertyName]}
                    label={t(name)}
                    onChange={e=>{
                        setValue(values.find(val => val[propertyName] === e.target.value));
                    }}
                >
                    {
                        values.map(e => {
                            return <MenuItem key={e[idName]} value={e[propertyName]}>{t(e[propertyName])}</MenuItem>
                        })
                    }
                </Select>}
        </FormControl>
    );
};