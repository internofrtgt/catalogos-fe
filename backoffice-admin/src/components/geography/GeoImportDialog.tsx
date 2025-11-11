import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';

interface GeoImportDialogProps {
  open: boolean;
  title: string;
  submitting?: boolean;
  onClose: () => void;
  onImport: (params: { file: File; mode: 'append' | 'replace' }) => void;
}

export const GeoImportDialog = ({
  open,
  title,
  submitting,
  onClose,
  onImport,
}: GeoImportDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'append' | 'replace'>('append');

  useEffect(() => {
    if (!open) {
      setFile(null);
      setMode('append');
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Selecciona un archivo Excel (.xlsx) con la estructura oficial. Puedes
          elegir si deseas agregar los registros o reemplazar el contenido existente.
        </Typography>

        <Button variant="outlined" component="label">
          Seleccionar archivo
          <input
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
            }}
          />
        </Button>
        {file && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Archivo seleccionado: {file.name}
          </Typography>
        )}

        <FormControl sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Modo de importacion
          </Typography>
          <RadioGroup
            row
            value={mode}
            onChange={(event) => setMode(event.target.value as 'append' | 'replace')}
          >
            <FormControlLabel value="append" control={<Radio />} label="Agregar (append)" />
            <FormControlLabel value="replace" control={<Radio />} label="Reemplazar" />
          </RadioGroup>
          <FormHelperText>
            Reemplazar eliminara los registros actuales antes de importar.
          </FormHelperText>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            if (file) {
              onImport({ file, mode });
            }
          }}
          disabled={!file || submitting}
        >
          {submitting ? 'Importando...' : 'Importar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
