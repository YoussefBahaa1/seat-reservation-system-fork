export const LayoutPage_theme = {
    pageWrapper: {
      display: 'flex',
      width: '100vw',
      height: '100vh',
      bgcolor: '#fff',
      overflow: 'hidden',
    },
    content: {
      flexGrow: 1,
      overflowY: 'auto',
      py: 2, //padding y
      display: 'flex',
      flexDirection: 'column',
    },
    innerContent: {
      flex: 1,
      px: 0, //padding x
      width: '100%',
      boxSizing: 'border-box',
    },
    innerContent_padding: {
      flex: 1,
      px: 2, //padding x
      width: '100%',
      boxSizing: 'border-box',
    },
    divider: {
      height: '3px',
      mt: '5px',
      mb: '5px',
      border: 'none',
      borderRadius: '6px',
      background: `linear-gradient(
        90deg,
      #008444 0%,
      rgb(9, 121, 24) 21%,
      #b89f01 81%,
      #ffdd00 100%
      )`,
    },
    h1: {
      margin: '20px', 
      textAlign: 'center', 
      fontWeight: 'bold',
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      px: 2,
    },
  };
