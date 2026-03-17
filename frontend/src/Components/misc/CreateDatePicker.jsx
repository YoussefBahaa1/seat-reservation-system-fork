import { FormControl, TextField} from '@mui/material';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import de from 'date-fns/locale/de';
registerLocale('de', de);

const CreateDatePicker = ({
    date,
    setter,
    label,
    disabledFunc=()=>{return false},
    required=true,
    clearable=false,
    size='medium',
}) => {
    return (
        <FormControl
            id='createDatePicker_formControl'
            required={required}
            fullWidth
            sx={{
                '& .react-datepicker-wrapper': {
                    width: '100%',
                },
                '& .react-datepicker__input-container': {
                    width: '100%',
                },
                '& .react-datepicker-popper': {
                    zIndex: 1600,
                },
            }}
        >
            <DatePicker
                disabled={disabledFunc()}
                selected={date}
                onChange={setter}
                locale='de'
                dateFormat='dd.MM.yyyy'
                placeholderText={label}
                showWeekNumbers
                isClearable={clearable}
                required={required}
                popperPlacement='bottom-start'
                customInput={
                    <TextField
                        label={label}
                        variant='outlined'
                        size={size}
                        fullWidth
                        required={required}
                    />
                }
            />

            
        </FormControl>
    );
};

export default CreateDatePicker;
