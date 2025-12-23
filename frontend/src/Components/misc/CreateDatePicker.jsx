import { FormControl, TextField} from '@mui/material';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import de from 'date-fns/locale/de';
registerLocale('de', de);

const CreateDatePicker = ({date, setter, label, disabledFunc=()=>{return false}}) => {
    return (
        <FormControl id='createDatePicker_formControl' required fullWidth>
            <DatePicker
                disabled={disabledFunc()}
                selected={date}
                onChange={setter}
                locale='de'
                dateFormat='dd.MM.yyyy'
                placeholderText={label}
                showWeekNumbers
                required
                customInput={
                    <TextField
                        label={label}
                        variant='outlined'
                        fullWidth
                        required
                    />
                }
            />

            
        </FormControl>
    );
};

export default CreateDatePicker;