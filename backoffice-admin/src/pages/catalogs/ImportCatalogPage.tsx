import { useState } from 'react';
import {
  Box,
  Breadcrumbs,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Link,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { importCatalogEntries } from '../../api/catalogs';
import { catalogConfigMap } from '../../config/catalogs';

export const ImportCatalogPage = () => {
  const { catalogKey } = useParams<{ catalogKey: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'append' | 'replace'>('append');

  const config = catalogKey ? catalogConfigMap.get(catalogKey) : null;

  const mutation = useMutation({
    mutationFn: () => {
      if (!catalogKey || !file) {
        throw new Error('Archivo requerido');
      }
      return importCatalogEntries(catalogKey, file, mode);
    },
    onSuccess: () => {
      enqueueSnackbar('Importacion completada', { variant: 'success' });
      navigate(`/catalogs/${catalogKey}`, { replace: true });
    },
    onError: () => {
      enqueueSnackbar('No se pudo completar la importacion', { variant: 'error' });
    },
  });

  if (!config) {
    return (
      <Box>
        <Typography variant="h6">Catalogo no encontrado</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600 }}>
      <Breadcrumbs>
        <Link component={RouterLink} to="/catalogs" underline="hover">
          Catalogos
        </Link>
        <Link component={RouterLink} to={`/catalogs/${config.key}`} underline="hover">
          {config.label}
        </Link>
        <Typography color="text.primary">Importar</Typography>
      </Breadcrumbs>

      <Typography variant="h4" fontWeight={700}>
        Importar {config.label}
      </Typography>

      <Typography variant="body2" color="text.secondary">
        Selecciona un archivo Excel (.xlsx) con la estructura correcta. Puedes
        escoger el modo de importacion: agregar nuevos registros o reemplazar el
        contenido existente.
      </Typography>

      <Button variant="outlined" component="label" sx={{ alignSelf: 'flex-start' }}>
        Seleccionar archivo
        <input
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) {
              setFile(selected);
            }
          }}
        />
      </Button>
      {file && (
        <Typography variant="body2" color="text.secondary">
          Archivo seleccionado: {file.name}
        </Typography>
      )}

      <FormControl>
        <Typography variant="subtitle1" fontWeight={600}>
          Modo de importacion
        </Typography>
        <RadioGroup
          row
          value={mode}
          onChange={(event) =>
            setMode(event.target.value as 'append' | 'replace')
          }
        >
          <FormControlLabel
            value="append"
            control={<Radio />}
            label="Agregar (append)"
          />
          <FormControlLabel
            value="replace"
            control={<Radio />}
            label="Reemplazar"
          />
        </RadioGroup>
        <FormHelperText>
          Reemplazar eliminara los registros actuales antes de importar.
        </FormHelperText>
      </FormControl>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={() => mutation.mutate()} disabled={!file || mutation.isPending}>
          {mutation.isPending ? 'Importando...' : 'Importar'}
        </Button>
        <Button variant="text" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
      </Box>
    </Box>
  );
};

