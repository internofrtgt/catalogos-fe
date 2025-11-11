import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { deleteUser, getUsers, createUser, updateUser } from '../../api/users';
import type {
  UserListParams,
  CreateUserPayload,
  UpdateUserPayload,
  UserResponse,
  UserListResponse,
} from '../../api/users';
import { UserFormDialog } from '../../components/users/UserFormDialog';
import type { UserFormMode } from '../../components/users/UserFormDialog';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const UsersPage = () => {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const [params, setParams] = useState<UserListParams>({ page: 1, limit: 10 });
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<UserFormMode>('create');
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isPending } = useQuery<UserListResponse>({
    queryKey: ['users', params],
    queryFn: () => getUsers(params),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => {
      enqueueSnackbar('Usuario creado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setFormOpen(false);
    },
    onError: () => {
      enqueueSnackbar('No se pudo crear el usuario', { variant: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: () => {
      enqueueSnackbar('Usuario actualizado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setFormOpen(false);
    },
    onError: () => {
      enqueueSnackbar('No se pudo actualizar el usuario', { variant: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      enqueueSnackbar('Usuario eliminado', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => {
      enqueueSnackbar('No se pudo eliminar el usuario', { variant: 'error' });
    },
    onSettled: () => setConfirmOpen(false),
  });

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 0;
  const tableData = data?.data ?? [];

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleOpenEdit = (item: UserResponse) => {
    setSelectedUser(item);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleDelete = (item: UserResponse) => {
    setSelectedUser(item);
    setConfirmOpen(true);
  };

  const handleSubmit = (values: {
    username: string;
    password?: string;
    role: UserResponse['role'];
    isActive: boolean;
  }) => {
    if (formMode === 'create') {
      createMutation.mutate({
        username: values.username,
        password: values.password ?? '',
        role: values.role,
        isActive: values.isActive,
      });
    } else if (selectedUser) {
      const payload: UpdateUserPayload = {
        username: values.username,
        role: values.role,
        isActive: values.isActive,
      };
      if (values.password) {
        payload.password = values.password;
      }
      updateMutation.mutate({ id: selectedUser.id, payload });
    }
  };

  const canDelete = (id: string) => authUser?.id !== id;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Breadcrumbs>
          <Typography color="text.primary">Usuarios</Typography>
        </Breadcrumbs>
        <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon fontSize="large" />
          Gestion de usuarios
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Crea, edita o desactiva cuentas para el portal administrativo.
        </Typography>
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
      >
        <TextField
          placeholder="Buscar usuario..."
          value={params.search ?? ''}
          onChange={(event) =>
            setParams((prev) => ({ ...prev, page: 1, search: event.target.value }))
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          size="small"
          sx={{ maxWidth: 320 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" onClick={handleOpenCreate}>
          Nuevo usuario
        </Button>
      </Stack>

      <Paper elevation={1}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Creado</TableCell>
                <TableCell>Actualizado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      Cargando usuarios...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : tableData.length ? (
                tableData.map((item) => (
                  <TableRow hover key={item.id}>
                    <TableCell>{item.username}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={item.role === 'ADMIN' ? 'primary' : 'default'}
                        label={item.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={item.isActive ? 'success' : 'default'}
                        label={item.isActive ? 'Activo' : 'Inactivo'}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(item.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(item.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={() => handleOpenEdit(item)}>
                          Editar
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          disabled={!canDelete(item.id)}
                          onClick={() => handleDelete(item)}
                        >
                          Eliminar
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      No se encontraron usuarios.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {totalPages > 1 && (
        <Pagination
          sx={{ alignSelf: 'flex-end' }}
          count={totalPages}
          page={params.page ?? 1}
          onChange={(_, page) => setParams((prev) => ({ ...prev, page }))}
        />
      )}

      <UserFormDialog
        open={formOpen}
        mode={formMode}
        defaultValues={
          selectedUser
            ? {
                username: selectedUser.username,
                role: selectedUser.role,
                isActive: selectedUser.isActive,
              }
            : undefined
        }
        submitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar usuario"
        message="Esta accion no se puede deshacer. Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (selectedUser) {
            deleteMutation.mutate(selectedUser.id);
          }
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};







