import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  alpha,
  useTheme,
} from '@mui/material/styles';
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArticleIcon from '@mui/icons-material/Article';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  createApiDoc,
  deleteApiDoc,
  getApiDoc,
  getApiDocs,
  updateApiDoc,
  type ApiDocListParams,
  type ApiDocPayload,
  type ApiDocResponse,
} from '../../api/api-docs';
import { useAuth } from '../../hooks/useAuth';
import {
  ApiDocFormDialog,
  type ApiDocFormMode,
} from '../../components/api-docs/ApiDocFormDialog';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

type SwaggerDocParameter = {
  name: string;
  in?: string;
  required?: boolean;
  type?: string;
  description?: string;
};

type SwaggerDocResponse = {
  status: number | string;
  description?: string;
  body?: unknown;
};

type SwaggerDocEndpoint = {
  method: string;
  path: string;
  summary: string;
  description?: string;
  authentication?: string;
  rateLimit?: string;
  parameters?: SwaggerDocParameter[];
  responses?: SwaggerDocResponse[];
  examples?: Record<string, string>;
};

type SwaggerSummaryDoc = {
  format: string;
  module: {
    title: string;
    description?: string;
    baseUrl?: string;
    icon?: string;
  };
  endpoints: SwaggerDocEndpoint[];
};

const METHOD_COLORS = {
  GET: { bg: '#1b5e20', color: '#ffffff' },
  POST: { bg: '#01579b', color: '#ffffff' },
  PUT: { bg: '#ef6c00', color: '#ffffff' },
  PATCH: { bg: '#6a1b9a', color: '#ffffff' },
  DELETE: { bg: '#b71c1c', color: '#ffffff' },
};

const MODULE_ICONS: Record<string, ReactNode> = {
  lock: <LockOutlinedIcon fontSize="small" />,
  users: <GroupOutlinedIcon fontSize="small" />,
  list: <ListAltOutlinedIcon fontSize="small" />,
  map: <MapOutlinedIcon fontSize="small" />,
  book: <MenuBookOutlinedIcon fontSize="small" />,
};


const DEFAULT_ICON = <ArticleIcon fontSize="small" />;

export const ApiDocsPage = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  const [params, setParams] = useState<ApiDocListParams>({ page: 1, limit: 20 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<ApiDocFormMode>('create');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const listQuery = useQuery({
    queryKey: ['api-docs', params],
    queryFn: () => getApiDocs(params),
  });

  const listData = listQuery.data?.data ?? [];
  const hasDocuments = listData.length > 0;

  useEffect(() => {
    if (!hasDocuments) {
      setSelectedId(null);
      return;
    }
    if (selectedId && listData.some((doc) => doc.id === selectedId)) {
      return;
    }
    setSelectedId(listData[0].id);
  }, [hasDocuments, listData, selectedId]);

  const selectedDocQuery = useQuery({
    queryKey: ['api-docs', 'detail', selectedId],
    queryFn: () => getApiDoc(selectedId as string),
    enabled: Boolean(selectedId),
  });

  const selectedDoc = useMemo<ApiDocResponse | null>(() => {
    if (!selectedId) {
      return null;
    }
    if (selectedDocQuery.data) {
      return selectedDocQuery.data;
    }
    return listData.find((doc) => doc.id === selectedId) ?? null;
  }, [listData, selectedDocQuery.data, selectedId]);

  const parsedDoc = useMemo<SwaggerSummaryDoc | null>(() => {
    if (!selectedDoc?.content) {
      return null;
    }
    try {
      const candidate = JSON.parse(selectedDoc.content) as SwaggerSummaryDoc;
      if (candidate?.format === 'swagger-summary' && Array.isArray(candidate.endpoints)) {
        return candidate;
      }
    } catch {
      return null;
    }
    return null;
  }, [selectedDoc]);

  const docMetaById = useMemo<Map<string, SwaggerSummaryDoc | null>>(() => {
    const map = new Map<string, SwaggerSummaryDoc | null>();
    listData.forEach((doc) => {
      try {
        const candidate = JSON.parse(doc.content ?? '{}') as SwaggerSummaryDoc;
        map.set(
          doc.id,
          candidate?.format === 'swagger-summary' && Array.isArray(candidate.endpoints)
            ? candidate
            : null,
        );
      } catch {
        map.set(doc.id, null);
      }
    });
    return map;
  }, [listData]);

  const createMutation = useMutation({
    mutationFn: (payload: ApiDocPayload) => createApiDoc(payload),
    onSuccess: (response) => {
      enqueueSnackbar('Documentacion creada', { variant: 'success' });
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['api-docs'] });
      setSelectedId(response.id);
    },
    onError: () => {
      enqueueSnackbar('No se pudo crear la documentacion', {
        variant: 'error',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; body: ApiDocPayload }) =>
      updateApiDoc(payload.id, payload.body),
    onSuccess: (response) => {
      enqueueSnackbar('Documentacion actualizada', { variant: 'success' });
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['api-docs'] });
      setSelectedId(response.id);
    },
    onError: () => {
      enqueueSnackbar('No se pudo actualizar la documentacion', {
        variant: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiDoc(id),
    onSuccess: () => {
      enqueueSnackbar('Documentacion eliminada', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['api-docs'] });
      setConfirmOpen(false);
      setSelectedId(null);
    },
    onError: () => {
      enqueueSnackbar('No se pudo eliminar la documentacion', {
        variant: 'error',
      });
    },
  });

  const isLoadingDetail = selectedId ? selectedDocQuery.isPending : false;
  const detailError = selectedDocQuery.isError;

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setParams((prev) => ({
      ...prev,
      page: 1,
      search: value ? value : undefined,
    }));
  };

  const openCreateDialog = () => {
    setFormMode('create');
    setFormOpen(true);
  };

  const handleSubmit = (values: ApiDocPayload) => {
    if (formMode === 'create') {
      createMutation.mutate(values);
    } else if (selectedDoc) {
      updateMutation.mutate({ id: selectedDoc.id, body: values });
    }
  };

  const methodStyles = useMemo(() => {
    const fallbackColor = alpha(theme.palette.text.primary, 0.08);
    const fallbackText = theme.palette.text.primary;

    const map = new Map<string, { bg: string; color: string }>();
    Object.entries(METHOD_COLORS).forEach(([method, style]) => {
      map.set(method, {
        bg: style.bg,
        color: style.color,
      });
    });
    map.set('DEFAULT', { bg: fallbackColor, color: fallbackText });
    return map;
  }, [theme]);

  const renderMethodChip = (method: string) => {
    const style = methodStyles.get(method.toUpperCase()) ?? methodStyles.get('DEFAULT')!;
    return (
      <Chip
        label={method.toUpperCase()}
        size="small"
        sx={{
          bgcolor: style.bg,
          color: style.color,
          fontWeight: 600,
          borderRadius: 1,
          minWidth: 64,
        }}
      />
    );
  };

  const renderParameterSection = (parameters?: SwaggerDocParameter[]) => {
    if (!parameters?.length) return null;
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Parametros
        </Typography>
        <Stack spacing={1}>
          {parameters.map((parameter) => (
            <Box
              key={`${parameter.name}-${parameter.in ?? 'body'}`}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip label={parameter.name} size="small" color="primary" variant="outlined" />
                <Chip
                  label={parameter.required ? 'requerido' : 'opcional'}
                  size="small"
                  color={parameter.required ? 'error' : 'default'}
                  variant={parameter.required ? 'filled' : 'outlined'}
                />
                {parameter.in && (
                  <Chip label={parameter.in} size="small" variant="outlined" color="secondary" />
                )}
                {parameter.type && (
                  <Chip label={parameter.type} size="small" variant="outlined" />
                )}
              </Stack>
              {parameter.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {parameter.description}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      </Box>
    );
  };

  const renderResponseSection = (responses?: SwaggerDocResponse[]) => {
    if (!responses?.length) return null;
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Respuestas
        </Typography>
        <Stack spacing={1}>
          {responses.map((response, index) => (
            <Box
              key={`${response.status}-${index}`}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                backgroundColor: alpha(theme.palette.success.main, 0.04),
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                  label={`HTTP ${response.status}`}
                  size="small"
                  color="success"
                  sx={{ fontWeight: 600 }}
                />
                {response.description && (
                  <Typography variant="body2" color="text.secondary">
                    {response.description}
                  </Typography>
                )}
              </Stack>
              {(() => {
                const hasBody = response.body !== undefined && response.body !== null;
                if (!hasBody) return null;
                return (
                <Box
                  component="pre"
                  sx={{
                    mt: 1,
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.common.black, 0.08),
                    fontFamily: '"Fira Code", "Source Code Pro", monospace',
                    fontSize: '0.85rem',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {JSON.stringify(response.body as any, null, 2)}
                </Box>
                );
              })()}
            </Box>
          ))}
        </Stack>
      </Box>
    );
  };

  const renderExamples = (examples?: Record<string, string>) => {
    if (!examples) return null;
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Ejemplos
        </Typography>
        <Stack spacing={1.5}>
          {Object.entries(examples).map(([label, code]) => (
            <Box key={label}>
              <Chip
                label={label.toUpperCase()}
                size="small"
                sx={{ fontWeight: 600, mb: 0.5 }}
              />
              <Box
                component="pre"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.common.black, 0.08),
                  fontFamily: '"Fira Code", "Source Code Pro", monospace',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                  overflowX: 'auto',
                }}
              >
                {code}
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  };

  const docIcon = (doc: ApiDocResponse) => {
    const parsed = docMetaById.get(doc.id);
    return parsed?.module?.icon ? MODULE_ICONS[parsed.module.icon] ?? DEFAULT_ICON : DEFAULT_ICON;
  };

  const docTitle = (doc: ApiDocResponse) => {
    const parsed = docMetaById.get(doc.id);
    return parsed?.module?.title ?? doc.title;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Breadcrumbs>
          <Typography color="text.primary">Documentacion API</Typography>
        </Breadcrumbs>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mt: 2 }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Documentacion de servicios
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Consulta los endpoints disponibles y ejemplos de integracion.
            </Typography>
          </Box>
          {isAdmin && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Nueva documentacion
            </Button>
          )}
        </Stack>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="stretch">
        <Paper
          elevation={1}
          sx={{
            width: { xs: '100%', md: 320 },
            p: 2,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, #111b27 0%, #0d1820 60%)'
              : undefined,
          }}
        >
          <Stack spacing={2}>
            <TextField
              placeholder="Buscar modulo..."
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              value={params.search ?? ''}
              onChange={handleSearchChange}
            />
            <Divider sx={{ borderColor: alpha(theme.palette.text.primary, 0.08) }} />
            <List sx={{ py: 0 }}>
              {hasDocuments ? (
                listData.map((doc) => {
                  const selected = doc.id === selectedId;
                  return (
                    <ListItem key={doc.id} disablePadding>
                      <ListItemButton
                        selected={selected}
                        onClick={() => setSelectedId(doc.id)}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          '&.Mui-selected': {
                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                            color: theme.palette.primary.main,
                          },
                        }}
                      >
                        <ListItemIcon sx={{ color: selected ? theme.palette.primary.main : 'inherit' }}>
                          {docIcon(doc)}
                        </ListItemIcon>
                        <ListItemText
                          primary={docTitle(doc)}
                          secondary={doc.summary}
                          primaryTypographyProps={{ fontWeight: selected ? 600 : 500 }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No hay documentacion disponible.
                </Typography>
              )}
            </List>
          </Stack>
        </Paper>

        <Paper
          elevation={1}
          sx={{
            flexGrow: 1,
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            minHeight: 420,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, #101b26 0%, #0b141c 70%)'
              : undefined,
          }}
        >
          {!hasDocuments ? (
            <Stack alignItems="center" justifyContent="center" spacing={2} minHeight={320}>
              <ArticleIcon fontSize="large" color="disabled" />
              <Typography variant="body2" color="text.secondary">
                Aun no hay documentacion registrada. Crea un documento para comenzar.
              </Typography>
            </Stack>
          ) : detailError ? (
            <Stack alignItems="center" justifyContent="center" spacing={2} minHeight={320}>
              <ArticleIcon fontSize="large" color="error" />
              <Typography variant="body2" color="text.secondary">
                No se pudo cargar la documentacion seleccionada.
              </Typography>
            </Stack>
          ) : isLoadingDetail ? (
            <Stack alignItems="center" justifyContent="center" minHeight={320}>
              <CircularProgress />
            </Stack>
          ) : parsedDoc ? (
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  {parsedDoc.module.icon
                    ? MODULE_ICONS[parsedDoc.module.icon] ?? DEFAULT_ICON
                    : DEFAULT_ICON}
                  <Typography variant="h5" fontWeight={700}>
                    {parsedDoc.module.title}
                  </Typography>
                </Stack>
                {parsedDoc.module.description && (
                  <Typography variant="body2" color="text.secondary">
                    {parsedDoc.module.description}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  {parsedDoc.module.baseUrl && (
                    <Chip
                      label={`Base URL: ${parsedDoc.module.baseUrl}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Stack>
                {isAdmin && selectedDoc && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => {
                        setFormMode('edit');
                        setFormOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteOutlineIcon />}
                      onClick={() => setConfirmOpen(true)}
                    >
                      Eliminar
                    </Button>
                  </Stack>
                )}
              </Stack>

              <Divider sx={{ borderColor: alpha(theme.palette.text.primary, 0.08) }} />

              <Stack spacing={2.5}>
                {parsedDoc.endpoints.map((endpoint) => (
                  <Box
                    key={`${endpoint.method}-${endpoint.path}`}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    }}
                  >
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={1.5}
                      alignItems={{ xs: 'flex-start', md: 'center' }}
                      justifyContent="space-between"
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {renderMethodChip(endpoint.method)}
                        <Typography
                          variant="subtitle1"
                          sx={{ fontFamily: '"Fira Code", "Source Code Pro", monospace' }}
                        >
                          {endpoint.path}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        {endpoint.authentication && (
                          <Chip
                            label={
                              endpoint.authentication === 'bearer'
                                ? 'Auth: Bearer JWT'
                                : endpoint.authentication === 'public'
                                ? 'Publico'
                                : `Auth: ${endpoint.authentication}`
                            }
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {endpoint.rateLimit && (
                          <Chip
                            label={`Rate limit: ${endpoint.rateLimit}`}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </Stack>

                    {endpoint.summary && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {endpoint.summary}
                      </Typography>
                    )}
                    {endpoint.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {endpoint.description}
                      </Typography>
                    )}

                    <Stack spacing={2} sx={{ mt: 2 }}>
                      {renderParameterSection(endpoint.parameters)}
                      {renderResponseSection(endpoint.responses)}
                      {renderExamples(endpoint.examples)}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Stack>
          ) : selectedDoc ? (
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {selectedDoc.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {selectedDoc.summary}
              </Typography>
              <Box
                component="pre"
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.common.black, 0.08),
                  fontFamily: '"Fira Code", "Source Code Pro", monospace',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedDoc.content}
              </Box>
            </Box>
          ) : null}
        </Paper>
      </Stack>

      <ApiDocFormDialog
        open={formOpen}
        mode={formMode}
        submitting={createMutation.isPending || updateMutation.isPending}
        defaultValues={
          formMode === 'edit' && selectedDoc
            ? {
                title: selectedDoc.title,
                version: selectedDoc.version,
                summary: selectedDoc.summary,
                content: selectedDoc.content,
              }
            : undefined
        }
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar documentacion"
        message="Esta accion no se puede deshacer. Deseas continuar?"
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (selectedDoc) {
            deleteMutation.mutate(selectedDoc.id);
          }
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};
