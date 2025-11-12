import { useState } from 'react';
import {
  Box,
  Breadcrumbs,
  Button,
  Pagination,
  Stack,
  TextField,
  Typography,
  Link,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { CatalogFormDialog } from '../../components/catalogs/CatalogFormDialog';
import { CatalogTable } from '../../components/catalogs/CatalogTable';
import type { CatalogFieldConfig } from '../../config/catalogs';
import type { CatalogListParams } from '../../api/catalogs';
import {
  createCanton,
  deleteCanton,
  importCantons,
  listCantons,
  updateCanton,
} from '../../api/geography';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { GeoImportDialog } from '../../components/geography/GeoImportDialog';

const cantonFields: CatalogFieldConfig[] = [
  { name: 'provincia', label: 'Provincia', type: 'string', required: true },
  { name: 'codigoProvincia', label: 'Codigo Provincia', type: 'int', required: true },
  { name: 'canton', label: 'Canton', type: 'string', required: true },
  { name: 'codigoCanton', label: 'Codigo Canton', type: 'string', required: true },
];

export const CantonsPage = () => {
  const [params, setParams] = useState<CatalogListParams & { codigoProvincia?: number }>({
    page: 1,
    limit: 10,
  });
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['geography', 'cantons', params],
    queryFn: () =>
      listCantons({
        page: params.page,
        limit: params.limit,
        search: params.search,
        provinceCode: params.codigoProvincia,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createCanton,
    onSuccess: () => {
      enqueueSnackbar('Canton creado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'cantons'] });
      setOpenForm(false);
    },
    onError: () => enqueueSnackbar('No se pudo crear el canton', { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) =>
      updateCanton(id, values),
    onSuccess: () => {
      enqueueSnackbar('Canton actualizado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'cantons'] });
      setOpenForm(false);
    },
    onError: () => enqueueSnackbar('No se pudo actualizar el canton', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCanton(id),
    onSuccess: () => {
      enqueueSnackbar('Canton eliminado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'cantons'] });
    },
    onError: () => enqueueSnackbar('No se pudo eliminar el canton', { variant: 'error' }),
    onSettled: () => setOpenDelete(false),
  });

  const importMutation = useMutation({
    mutationFn: ({ file, mode }: { file: File; mode: 'append' | 'replace' }) =>
      importCantons(file, mode),
    onSuccess: () => {
      enqueueSnackbar('Importacion completada', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'cantons'] });
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
        <Typography color="text.primary">Cantones</Typography>
      </Breadcrumbs>
      <Typography variant="h4" fontWeight={700}>
        Cantones
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <TextField
          placeholder="Buscar por nombre"
          value={params.search ?? ''}
          onChange={(event) =>
            setParams((prev) => ({ ...prev, page: 1, search: event.target.value }))
          }
          InputProps={{ startAdornment: <SearchIcon fontSize="small" /> }}
          size="small"
          sx={{ maxWidth: 320 }}
        />
        <TextField
          placeholder="Codigo provincia"
          value={params.codigoProvincia?.toString() ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            setParams((prev) => ({
              ...prev,
              page: 1,
              codigoProvincia: value ? Number(value) : undefined,
            }));
          }}
          size="small"
          sx={{ maxWidth: 200 }}
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
          Nuevo canton
        </Button>
      </Stack>

      <CatalogTable
        fields={cantonFields}
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
        title={selected ? 'Editar canton' : 'Nuevo canton'}
        fields={cantonFields}
        defaultValues={selected ?? {}}
        submitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => setOpenForm(false)}
        onSubmit={(values) => {
          if (selected) {
            updateMutation.mutate({ id: selected.id as string, values });
          } else {
            createMutation.mutate(values as any);
          }
        }}
      />

      <ConfirmDialog
        open={openDelete}
        title="Eliminar canton"
        message="Esta accion no se puede deshacer. Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={() => selected && deleteMutation.mutate(selected.id as string)}
        onCancel={() => setOpenDelete(false)}
      />

      <GeoImportDialog
        open={openImport}
        title="Importar cantones"
        submitting={importMutation.isPending}
        onClose={() => setOpenImport(false)}
        onImport={({ file, mode }) => importMutation.mutate({ file, mode })}
      />
    </Box>
  );
};

