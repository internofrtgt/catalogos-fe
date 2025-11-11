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
import { CatalogTable } from '../../components/catalogs/CatalogTable';
import { CatalogFormDialog } from '../../components/catalogs/CatalogFormDialog';
import type { CatalogFieldConfig } from '../../config/catalogs';
import type { CatalogListParams } from '../../api/catalogs';
import {
  createBarrio,
  deleteBarrio,
  importBarrios,
  listBarrios,
  updateBarrio,
} from '../../api/geography';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { GeoImportDialog } from '../../components/geography/GeoImportDialog';

const barrioFields: CatalogFieldConfig[] = [
  { name: 'provinciaNombre', label: 'Provincia', type: 'string', required: true },
  { name: 'provinceCode', label: 'Codigo Provincia', type: 'int', required: true },
  { name: 'cantonNombre', label: 'Canton', type: 'string', required: true },
  { name: 'cantonCode', label: 'Codigo Canton', type: 'int', required: true },
  { name: 'districtName', label: 'Distrito', type: 'string', required: true },
  { name: 'districtCode', label: 'Codigo Distrito', type: 'int' },
  { name: 'nombre', label: 'Barrio', type: 'string', required: true },
];

export const BarriosPage = () => {
  const [params, setParams] = useState<
    CatalogListParams & {
      provinceCode?: number;
      cantonCode?: number;
      districtName?: string;
    }
  >({
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
    queryKey: ['geography', 'barrios', params],
    queryFn: () =>
      listBarrios({
        page: params.page,
        limit: params.limit,
        search: params.search,
        provinceCode: params.provinceCode,
        cantonCode: params.cantonCode,
        districtName: params.districtName,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createBarrio,
    onSuccess: () => {
      enqueueSnackbar('Barrio creado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'barrios'] });
      setOpenForm(false);
    },
    onError: () => enqueueSnackbar('No se pudo crear el barrio', { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) =>
      updateBarrio(id, values),
    onSuccess: () => {
      enqueueSnackbar('Barrio actualizado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'barrios'] });
      setOpenForm(false);
    },
    onError: () => enqueueSnackbar('No se pudo actualizar el barrio', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBarrio(id),
    onSuccess: () => {
      enqueueSnackbar('Barrio eliminado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'barrios'] });
    },
    onError: () => enqueueSnackbar('No se pudo eliminar el barrio', { variant: 'error' }),
    onSettled: () => setOpenDelete(false),
  });

  const importMutation = useMutation({
    mutationFn: ({ file, mode }: { file: File; mode: 'append' | 'replace' }) =>
      importBarrios(file, mode),
    onSuccess: () => {
      enqueueSnackbar('Importacion completada', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'barrios'] });
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
        <Typography color="text.primary">Barrios</Typography>
      </Breadcrumbs>
      <Typography variant="h4" fontWeight={700}>
        Barrios
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <TextField
          placeholder="Buscar por nombre"
          value={params.search ?? ''}
          onChange={(event) =>
            setParams((prev) => ({ ...prev, page: 1, search: event.target.value }))
          }
          InputProps={{ startAdornment: <SearchIcon fontSize="small" /> }}
          size="small"
          sx={{ maxWidth: 240 }}
        />
        <TextField
          placeholder="Codigo provincia"
          value={params.provinceCode?.toString() ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            setParams((prev) => ({
              ...prev,
              page: 1,
              provinceCode: value ? Number(value) : undefined,
            }));
          }}
          size="small"
          sx={{ maxWidth: 180 }}
        />
        <TextField
          placeholder="Codigo canton"
          value={params.cantonCode?.toString() ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            setParams((prev) => ({
              ...prev,
              page: 1,
              cantonCode: value ? Number(value) : undefined,
            }));
          }}
          size="small"
          sx={{ maxWidth: 180 }}
        />
        <TextField
          placeholder="Distrito"
          value={params.districtName ?? ''}
          onChange={(event) =>
            setParams((prev) => ({
              ...prev,
              page: 1,
              districtName: event.target.value || undefined,
            }))
          }
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
          Nuevo barrio
        </Button>
      </Stack>

      <CatalogTable
        fields={barrioFields}
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
        title={selected ? 'Editar barrio' : 'Nuevo barrio'}
        fields={barrioFields}
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
        title="Eliminar barrio"
        message="Esta accion no se puede deshacer. Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={() => selected && deleteMutation.mutate(selected.id as string)}
        onCancel={() => setOpenDelete(false)}
      />

      <GeoImportDialog
        open={openImport}
        title="Importar barrios"
        submitting={importMutation.isPending}
        onClose={() => setOpenImport(false)}
        onImport={({ file, mode }) => importMutation.mutate({ file, mode })}
      />
    </Box>
  );
};

