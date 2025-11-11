import { useState } from 'react';
import {
  Box,
  Breadcrumbs,
  Button,
  Link,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { CatalogFormDialog } from '../../components/catalogs/CatalogFormDialog';
import { CatalogTable } from '../../components/catalogs/CatalogTable';
import type { CatalogFieldConfig } from '../../config/catalogs';
import type { CatalogListParams } from '../../api/catalogs';
import {
  createProvince,
  deleteProvince,
  importProvinces,
  listProvinces,
  updateProvince,
} from '../../api/geography';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { GeoImportDialog } from '../../components/geography/GeoImportDialog';

const provinceFields: CatalogFieldConfig[] = [
  { name: 'nombre', label: 'Nombre', type: 'string', required: true },
  { name: 'codigo', label: 'Codigo', type: 'int', required: true },
];

export const ProvincesPage = () => {
  const [params, setParams] = useState<CatalogListParams>({ page: 1, limit: 10 });
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['geography', 'provinces', params],
    queryFn: () =>
      listProvinces({
        page: params.page,
        limit: params.limit,
        search: params.search,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createProvince,
    onSuccess: () => {
      enqueueSnackbar('Provincia creada', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'provinces'] });
      setOpenForm(false);
    },
    onError: () => enqueueSnackbar('No se pudo crear la provincia', { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) =>
      updateProvince(id, values),
    onSuccess: () => {
      enqueueSnackbar('Provincia actualizada', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'provinces'] });
      setOpenForm(false);
    },
    onError: () => enqueueSnackbar('No se pudo actualizar la provincia', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProvince,
    onSuccess: () => {
      enqueueSnackbar('Provincia eliminada', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'provinces'] });
    },
    onError: () => enqueueSnackbar('No se pudo eliminar la provincia', { variant: 'error' }),
    onSettled: () => setOpenDelete(false),
  });

  const importMutation = useMutation({
    mutationFn: ({ file, mode }: { file: File; mode: 'append' | 'replace' }) =>
      importProvinces(file, mode),
    onSuccess: () => {
      enqueueSnackbar('Importacion completada', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'provinces'] });
      setOpenImport(false);
    },
    onError: () => enqueueSnackbar('No se pudo importar el archivo', { variant: 'error' }),
  });

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Breadcrumbs>
        <Link underline="hover" color="inherit">
          Geografia
        </Link>
        <Typography color="text.primary">Provincias</Typography>
      </Breadcrumbs>
      <Typography variant="h4" fontWeight={700}>
        Provincias
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <TextField
          placeholder="Buscar..."
          value={params.search ?? ''}
          onChange={(event) =>
            setParams((prev) => ({ ...prev, page: 1, search: event.target.value }))
          }
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" />,
          }}
          size="small"
          sx={{ maxWidth: 320 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" onClick={() => setOpenImport(true)}>
          Importar Excel
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            setSelected(null);
            setOpenForm(true);
          }}
        >
          Nueva provincia
        </Button>
      </Stack>

      <CatalogTable
        fields={provinceFields}
        data={data?.data ?? []}
        onCreate={() => {
          setSelected(null);
          setOpenForm(true);
        }}
        onImport={() => setOpenImport(true)}
        onEdit={(row) => {
          setSelected(row);
          setOpenForm(true);
        }}
        onDelete={(row) => {
          setSelected(row);
          setOpenDelete(true);
        }}
      />

      {totalPages > 1 && (
        <Pagination
          sx={{ alignSelf: 'flex-end' }}
          count={totalPages}
          page={params.page ?? 1}
          onChange={(_, page) => setParams((prev) => ({ ...prev, page }))}
        />
      )}

      <CatalogFormDialog
        open={openForm}
        title={selected ? 'Editar provincia' : 'Nueva provincia'}
        fields={provinceFields}
        defaultValues={selected ?? {}}
        submitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => setOpenForm(false)}
        onSubmit={(values) => {
          if (selected) {
            updateMutation.mutate({ id: selected.id as string, values });
          } else {
            createMutation.mutate(values as { nombre: string; codigo: number });
          }
        }}
      />

      <ConfirmDialog
        open={openDelete}
        title="Eliminar provincia"
        message="Esta accion no se puede deshacer. Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={() => selected && deleteMutation.mutate(selected.id as string)}
        onCancel={() => setOpenDelete(false)}
      />

      <GeoImportDialog
        open={openImport}
        title="Importar provincias"
        submitting={importMutation.isPending}
        onClose={() => setOpenImport(false)}
        onImport={({ file, mode }) => importMutation.mutate({ file, mode })}
      />
    </Box>
  );
};
