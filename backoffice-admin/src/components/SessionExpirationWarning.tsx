import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

export const SessionExpirationWarning: React.FC = () => {
  const { showExpirationWarning, timeUntilExpiration, logout } = useAuth();

  const handleRenewSession = () => {
    // Redirigir al login para que el usuario inicie sesión nuevamente
    logout();
  };

  if (!showExpirationWarning) {
    return null;
  }

  return (
    <Dialog
      open={showExpirationWarning}
      maxWidth="sm"
      fullWidth
      aria-labelledby="session-expiration-dialog-title"
      disableEscapeKeyDown
    >
      <DialogTitle
        id="session-expiration-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <WarningIcon color="warning" />
        <Typography variant="h6" component="span">
          Tu sesión está por expirar
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Tu sesión actual expirará en aproximadamente <strong>{timeUntilExpiration}</strong>.
            </Typography>
          </Alert>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Para continuar trabajando, por favor inicia sesión nuevamente. Esto ayuda a mantener
            la seguridad de tu cuenta y protege tu información.
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Si no haces nada, serás redirigido automáticamente a la página de inicio de sesión
            cuando tu sesión actual expire.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleRenewSession}
          variant="contained"
          color="primary"
          fullWidth
        >
          Iniciar Sesión Nuevamente
        </Button>
      </DialogActions>
    </Dialog>
  );
};