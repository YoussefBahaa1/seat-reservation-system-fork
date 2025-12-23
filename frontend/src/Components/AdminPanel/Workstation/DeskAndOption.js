export function deskToOption(desk) {
    if (!desk) {
        return null;
    }
    return desk.id.toString() + (!desk.remark ? '' : '-' + desk.remark);
};

export function optionToDeskId(option) {
    if (!option || option === '') {
        return null;
    }
    return option.includes('-') ? option.split('-')[0] : option;
};

export function isOptionEqualToValue_Desk(option, value) {
    return optionToDeskId(option) === value || '' === value;
};