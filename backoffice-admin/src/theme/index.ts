import { createTheme } from '@mui/material/styles';

const paletteBackground = '#0D1820';
const palettePrimary = '#0FB0C7';
const paletteSecondary = '#112330';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: palettePrimary,
      contrastText: '#ffffff',
    },
    secondary: {
      main: paletteSecondary,
    },
    background: {
      default: paletteBackground,
      paper: '#111a2b',
    },
    text: {
      primary: '#f5f7fb',
      secondary: '#b7c4d6',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Segoe UI", sans-serif',
    h4: {
      fontWeight: 600,
      letterSpacing: '0.04em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.04em',
    },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: paletteBackground,
          backgroundImage:
            'radial-gradient(circle at 0% 0%, rgba(90,166,209,0.22), transparent 55%), radial-gradient(circle at 100% 0%, rgba(64,96,130,0.3), transparent 50%)',
          color: '#f5f7fb',
          minHeight: '100vh',
        },
        a: {
          color: palettePrimary,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          paddingInline: '18px',
          paddingBlock: '10px',
          fontWeight: 600,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: 'rgba(255,255,255,0.05)',
        },
        head: {
          color: '#d8e4f6',
          fontWeight: 600,
          letterSpacing: '0.03em',
        },
      },
    },
  },
});

