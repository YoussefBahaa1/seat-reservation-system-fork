import { FormControl, TextField } from '@mui/material';

const CreateTimePicker = ({
    time,
    setter,
    label,
    disabledFunc=()=>{return false},
    stepSeconds=1,
    required=true,
    size='medium',
}) => {
    return (
        <FormControl id='createTimePicker_textField' required={required} fullWidth>
        <TextField
            disabled={disabledFunc()}
            label={label}
            type="time"                   // Native HTML5 time picker
            value={time || ''}
            onChange={(e) => setter(e.target.value)}
            InputLabelProps={{
                shrink: true,             // Keeps label in place when time is selected
            }}
            inputProps={{
                step: stepSeconds,
            }}
            variant="outlined"
            size={size}
            fullWidth
            required={required}
        />
        </FormControl>
    )
}

export default CreateTimePicker;
