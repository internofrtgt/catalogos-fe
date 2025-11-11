import { useForm } from 'react-hook-form';
import {
  Avatar,
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { z } from 'zod';
import { loginRequest } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

const schema = z.object({
  username: z.string().min(3, 'Ingresa un usuario valido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
});

type FormValues = z.infer<typeof schema>;

const LoginPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      login(data);
      enqueueSnackbar('Bienvenido de nuevo', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Credenciales invalidas', { variant: 'error' });
    },
  });

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              Iniciar sesion
            </Typography>
          </Box>
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label="Usuario"
              autoFocus
              fullWidth
              {...register('username')}
              error={Boolean(errors.username)}
              helperText={errors.username?.message}
            />
            <TextField
              label="Contrasena"
              type="password"
              fullWidth
              {...register('password')}
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;

