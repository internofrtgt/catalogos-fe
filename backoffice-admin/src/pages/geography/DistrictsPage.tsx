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
  createDistrict,
  deleteDistrict,
  importDistricts,
  listDistricts,
  updateDistrict,
} from '../../api/geography';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { GeoImportDialog } from '../../components/geography/GeoImportDialog';

const districtFields: CatalogFieldConfig[] = [
  { name: 'provincia', label: 'Provincia', type: 'string', required: true },
  { name: 'codigoProvincia', label: 'Codigo Provincia', type: 'int', required: true },
  { name: 'canton', label: 'Canton', type: 'string', required: true },
  { name: 'codigoCanton', label: 'Codigo Canton', type: 'string', required: true },
  { name: 'distrito', label: 'Distrito', type: 'string', required: true },
  { name: 'codigoDistrito', label: 'Codigo Distrito', type: 'string', required: true },
];

export const DistrictsPage = () => {
  const [params, setParams] = useState<
    CatalogListParams & { codigoProvincia?: number; codigoCanton?: string }
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
    queryKey: ['geography', 'districts', params],
    queryFn: () =>
      listDistricts({
        page: params.page,
        limit: params.limit,
        search: params.search,
        provinceCode: params.codigoProvincia,
        cantonCode: params.codigoCanton ? Number(params.codigoCanton) : undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createDistrict,
    onSuccess: () => {
      enqueueSnackbar('Distrito creado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'districts'] });
      setOpenForm(false);
    },
    onError: () => enqueueSnackbar('No se pudo crear el distrito', { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) =>
      updateDistrict(id, values),
    onSuccess: () => {
      enqueueSnackbar('Distrito actualizado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'districts'] });
      setOpenForm(false);
    },
    onError: () => enqueueSnackbar('No se pudo actualizar el distrito', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDistrict(id),
    onSuccess: () => {
      enqueueSnackbar('Distrito eliminado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'districts'] });
    },
    onError: () => enqueueSnackbar('No se pudo eliminar el distrito', { variant: 'error' }),
    onSettled: () => setOpenDelete(false),
  });

  const importMutation = useMutation({
    mutationFn: ({ file, mode }: { file: File; mode: 'append' | 'replace' }) =>
      importDistricts(file, mode),
    onSuccess: () => {
      enqueueSnackbar('Importacion completada', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['geography', 'districts'] });
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
        <Typography color="text.primary">Distritos</Typography>
      </Breadcrumbs>
      <Typography variant="h4" fontWeight={700}>
        Distritos
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
          sx={{ maxWidth: 180 }}
        />
        <TextField
          placeholder="Codigo canton"
          value={params.codigoCanton?.toString() ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            setParams((prev) => ({
              ...prev,
              page: 1,
              codigoCanton: value || undefined,
            }));
          }}
          size="small"
          sx={{ maxWidth: 180 }}
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
          Nuevo distrito
        </Button>
      </Stack>

      <CatalogTable
        fields={districtFields}
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
        title={selected ? 'Editar distrito' : 'Nuevo distrito'}
        fields={districtFields}
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
        title="Eliminar distrito"
        message="Esta accion no se puede deshacer. Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={() => selected && deleteMutation.mutate(selected.id as string)}
        onCancel={() => setOpenDelete(false)}
      />

      <GeoImportDialog
        open={openImport}
        title="Importar distritos"
        submitting={importMutation.isPending}
        onClose={() => setOpenImport(false)}
        onImport={({ file, mode }) => importMutation.mutate({ file, mode })}
      />
    </Box>
  );
};


