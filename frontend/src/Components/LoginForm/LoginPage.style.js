import { colorVars } from '../../theme';

export const styles = {
    box: {
        flexGrow: 1,
        overflowY: 'auto',
        px: 3, // paddingX
        py: 2, // paddingY
    },
    centeredBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    h1: {
        margin: '2px',
        textAlign: 'center',
        color: colorVars.brand.accent,
    },
    button_sx: { 
        width: '100%',
        height: '45px',
        background: colorVars.brand.accent,
        border: 'none',
        outline: 'none',
        borderRadius: '40px',
        boxShadow: colorVars.shadow.glowSoft,
        fontSize: '16px',
        color: colorVars.text.inverse,
        fontWeight: 700,
        '&:hover': {
            background: colorVars.brand.primaryPressed,
        },
    },
    secondaryButton_sx: {
        width: '100%',
        height: '45px',
        background: 'transparent',
        border: `1px solid ${colorVars.brand.accent}`,
        outline: 'none',
        borderRadius: '40px',
        fontSize: '15px',
        color: colorVars.brand.accent,
        fontWeight: 600,
        boxShadow: 'none',
        textTransform: 'none',
        '&:hover': {
            background: colorVars.surface.translucent,
            borderColor: colorVars.brand.primaryPressed,
            boxShadow: 'none',
        },
    },
    wrapper_sx : {
        width: '420px',
        height: 'auto',
        minHeight: '370px',
        background: 'transparent',
        border: `2px solid ${colorVars.border.strong}`,
        backdropFilter: 'blur(30px)',
        boxShadow: colorVars.shadow.glow,
        color: colorVars.brand.accent,
        borderRadius: '10px',
        padding: '30px 40px',
        position: 'relative'
    },
    mfaWrapper_sx: {
        width: '420px',
        height: 'auto',
        minHeight: '320px',
        background: 'transparent',
        border: `2px solid ${colorVars.border.strong}`,
        backdropFilter: 'blur(30px)',
        boxShadow: colorVars.shadow.glow,
        color: colorVars.brand.accent,
        borderRadius: '10px',
        padding: '24px 36px',
        position: 'relative'
    },
    inputAdornment_sx : {
        backgroundColor: colorVars.surface.input,
        borderTopRightRadius: '4px',
        borderBottomRightRadius: '4px',
        px: 1,
        display: 'flex',
        alignItems: 'center',
    },
    outlinedInput_sx: {
        backgroundColor: colorVars.surface.input,
        '& .MuiOutlinedInput-notchedOutline': {
        borderColor: colorVars.border.strong,
        },
    }
};
