import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UserRole } from "../../api/users";

export type UserFormMode = "create" | "edit";

const roles: UserRole[] = ["ADMIN", "OPERATOR"];

const schema = z.object({
  username: z.string().min(3, "Debe tener al menos 3 caracteres"),
  password: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .refine(
      (value) => value === undefined || value.length >= 6,
      "Debe tener al menos 6 caracteres",
    ),
  role: z.enum(["ADMIN", "OPERATOR"]),
  isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof schema>;

interface UserFormDialogProps {
  open: boolean;
  mode: UserFormMode;
  defaultValues?: Partial<UserFormValues>;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => void;
  submitting?: boolean;
}

export const UserFormDialog = ({
  open,
  mode,
  defaultValues,
  onClose,
  onSubmit,
  submitting,
}: UserFormDialogProps) => {
  const initialValues: UserFormValues = {
    username: defaultValues?.username ?? "",
    password: defaultValues?.password,
    role: defaultValues?.role ?? "OPERATOR",
    isActive: defaultValues?.isActive ?? true,
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema) as Resolver<UserFormValues>,
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset({
      username: defaultValues?.username ?? "",
      password: defaultValues?.password,
      role: defaultValues?.role ?? "OPERATOR",
      isActive: defaultValues?.isActive ?? true,
    });
  }, [defaultValues, reset]);

  const submit = (values: UserFormValues) => {
    if (mode === "create" && !values.password) {
      setError("password", {
        type: "manual",
        message: "Debe ingresar una contrasena",
      });
      return;
    }

    onSubmit(values);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {mode === "create" ? "Nuevo usuario" : "Editar usuario"}
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          }}
        >
          <TextField
            label="Usuario"
            fullWidth
            {...register("username")}
            error={Boolean(errors.username)}
            helperText={errors.username?.message}
          />
          <TextField
            label={mode === "create" ? "Contrasena" : "Contrasena (opcional)"}
            fullWidth
            type="password"
            {...register("password")}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
          />
          <FormControl fullWidth>
            <InputLabel id="user-role-label">Rol</InputLabel>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select labelId="user-role-label" label="Rol" {...field}>
                  {roles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role === "ADMIN" ? "Administrador" : "Operador"}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1,
            }}
          >
            <Typography variant="body2">Usuario activo</Typography>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                />
              )}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(submit)}
          disabled={submitting}
        >
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};


