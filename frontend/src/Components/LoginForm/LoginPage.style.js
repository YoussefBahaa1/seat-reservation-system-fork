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
    },
    button_sx: { 
        width: '100%',
        height: '45px',
        background: '#fff',
        border: 'none',
        outline: 'none',
        borderRadius: '40px',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
        fontSize: '16px',
        color: '#333',
        fontWeight: 700,
    },
    secondaryButton_sx: {
        width: '100%',
        height: '45px',
        background: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        outline: 'none',
        borderRadius: '40px',
        fontSize: '15px',
        color: '#FFDD00',
        fontWeight: 600,
        boxShadow: 'none',
        textTransform: 'none',
        '&:hover': {
            background: 'rgba(255, 255, 255, 0.08)',
            borderColor: 'rgba(255, 255, 255, 0.9)',
            boxShadow: 'none',
        },
    },
    wrapper_sx : {
        width: '420px',
        height: 'auto',
        minHeight: '370px',
        background: 'transparent',
        border: '2px solid rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(30px)',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
        color: '#FFDD00',
        borderRadius: '10px',
        padding: '30px 40px',
        position: 'relative'
    },
    mfaWrapper_sx: {
        width: '420px',
        height: 'auto',
        minHeight: '320px',
        background: 'transparent',
        border: '2px solid rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(30px)',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
        color: '#FFDD00',
        borderRadius: '10px',
        padding: '24px 36px',
        position: 'relative'
    },
    inputAdornment_sx : {
        backgroundColor: '#eef4ff',
        borderTopRightRadius: '4px',
        borderBottomRightRadius: '4px',
        px: 1,
        display: 'flex',
        alignItems: 'center',
    },
    outlinedInput_sx: {
        backgroundColor: '#eef4ff',
        '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(0,0,0,0.23)',
        },
    }
};
