import { useMemo, useState } from 'react';
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
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import SearchIcon from '@mui/icons-material/Search';
import { CatalogFormDialog } from '../../components/catalogs/CatalogFormDialog';
import { CatalogTable } from '../../components/catalogs/CatalogTable';
import {
  createCatalogEntry,
  deleteCatalogEntry,
  getCatalogEntries,
  getCatalogEntry,
  updateCatalogEntry,
} from '../../api/catalogs';
import type { CatalogListParams } from '../../api/catalogs';
import { catalogConfigMap } from '../../config/catalogs';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface SelectedRecord {
  id: string;
  [key: string]: unknown;
}

export const CatalogEntriesPage = () => {
  const { catalogKey } = useParams<{ catalogKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [params, setParams] = useState<CatalogListParams>({ page: 1, limit: 10 });
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selected, setSelected] = useState<SelectedRecord | null>(null);

  const config = useMemo(() => {
    if (!catalogKey) return null;
    return catalogConfigMap.get(catalogKey);
  }, [catalogKey]);

  const { data } = useQuery({
    queryKey: ['catalogs', catalogKey, params],
    enabled: Boolean(catalogKey),
    queryFn: () =>
      getCatalogEntries<SelectedRecord>(catalogKey!, {
        page: params.page,
        limit: params.limit,
        search: params.search,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      createCatalogEntry(catalogKey!, payload),
    onSuccess: () => {
      enqueueSnackbar('Registro creado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['catalogs', catalogKey] });
      setOpenForm(false);
    },
    onError: () => {
      enqueueSnackbar('No se pudo crear el registro', { variant: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; values: Record<string, unknown> }) =>
      updateCatalogEntry(catalogKey!, payload.id, payload.values),
    onSuccess: () => {
      enqueueSnackbar('Registro actualizado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['catalogs', catalogKey] });
      setOpenForm(false);
    },
    onError: () => {
      enqueueSnackbar('No se pudo actualizar el registro', { variant: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCatalogEntry(catalogKey!, id),
    onSuccess: () => {
      enqueueSnackbar('Registro eliminado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['catalogs', catalogKey] });
    },
    onError: () => {
      enqueueSnackbar('No se pudo eliminar el registro', { variant: 'error' });
    },
    onSettled: () => setOpenDelete(false),
  });

  const handleOpenCreate = () => {
    setSelected(null);
    setOpenForm(true);
  };

  const handleOpenEdit = (item: Record<string, unknown>) => {
    if (!catalogKey) return;
    const id = item.id as string | undefined;
    if (!id) {
      enqueueSnackbar('Registro invalido', { variant: 'warning' });
      return;
    }
    void getCatalogEntry<SelectedRecord>(catalogKey, id)
      .then((record) => {
        setSelected(record);
        setOpenForm(true);
      })
      .catch(() => {
        enqueueSnackbar('No se pudo cargar el registro', { variant: 'error' });
      });
  };

  const handleDelete = (item: Record<string, unknown>) => {
    setSelected(item as SelectedRecord);
    setOpenDelete(true);
  };

  const handleSubmit = (values: Record<string, unknown>) => {
    if (selected) {
      updateMutation.mutate({ id: selected.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (!config) {
    return (
      <Box>
        <Typography variant="h6">Catalogo no encontrado</Typography>
        <Button sx={{ mt: 2 }} component={RouterLink} to="/catalogs">
          Volver
        </Button>
      </Box>
    );
  }

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Breadcrumbs>
          <Link component={RouterLink} to="/catalogs" underline="hover">
            Catalogos
          </Link>
          <Typography color="text.primary">{config.label}</Typography>
        </Breadcrumbs>
        <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
          {config.label}
        </Typography>
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        spacing={2}
      >
        <TextField
          placeholder={config.searchPlaceholder ?? 'Buscar por descripción o código...'}
          value={params.search ?? ''}
          onChange={(event) =>
            setParams((prev) => ({
              ...prev,
              page: 1,
              search: event.target.value,
            }))
          }
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" />,
          }}
          sx={{ maxWidth: 320 }}
          size="small"
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="outlined"
          onClick={() => navigate(`/catalogs/${config.key}/import`)}
        >
          Importar Excel
        </Button>
        <Button variant="contained" onClick={handleOpenCreate}>
          Nuevo registro
        </Button>
      </Stack>

      <CatalogTable
        fields={config.fields}
        data={data?.data ?? []}
        onCreate={handleOpenCreate}
        onImport={() => navigate(`/catalogs/${config.key}/import`)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
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
        title={selected ? 'Editar registro' : 'Nuevo registro'}
        fields={config.fields}
        defaultValues={selected ?? {}}
        submitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => setOpenForm(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={openDelete}
        title="Eliminar registro"
        message="Esta accion no se puede deshacer. Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={() => selected && deleteMutation.mutate(selected.id)}
        onCancel={() => setOpenDelete(false)}
      />
    </Box>
  );
};






