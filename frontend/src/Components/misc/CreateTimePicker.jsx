import { FormControl, TextField } from '@mui/material';

const CreateTimePicker = ({time, setter, label, disabledFunc=()=>{return false}}) => {
    return (
        <FormControl id='createTimePicker_textField' required fullWidth>
        <TextField
            disabled={disabledFunc()}
            label={label}
            type="time"                   // Native HTML5 time picker
            value={time}
            onChange={(e) => setter(e.target.value)}
            InputLabelProps={{
                shrink: true,             // Keeps label in place when time is selected
            }}
/*             inputProps={{
                step: 300,                // 5-minute intervals
            }} */
            inputProps={{
                step: 1, // Setting step to 1 allows seconds precision (if supported)
            }}
            variant="outlined"
            fullWidth
            required
        />
        </FormControl>
    )
}

export default CreateTimePicker;