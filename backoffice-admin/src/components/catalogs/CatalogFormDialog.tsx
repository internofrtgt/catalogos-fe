import { useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CatalogFieldConfig } from '../../config/catalogs';

type CatalogFormValues = Record<string, unknown>;

interface CatalogFormDialogProps {
  open: boolean;
  title: string;
  fields: CatalogFieldConfig[];
  defaultValues?: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (values: CatalogFormValues) => void;
  submitting?: boolean;
}

const getFieldSchema = (field: CatalogFieldConfig) => {
  let base: z.ZodTypeAny = z.any();

  switch (field.type) {
    case 'int':
      base = z
        .string()
        .min(1, `${field.label} es requerido`)
        .refine((value) => /^-?\d+$/.test(value), `${field.label} debe ser entero`)
        .transform((value) => Number(value));
      break;
    case 'numeric':
      base = z
        .string()
        .min(1, `${field.label} es requerido`)
        .refine(
          (value) => /^-?\d+(\.\d+)?$/.test(value),
          `${field.label} debe ser numerico`,
        )
        .transform((value) => Number(value));
      break;
    default:
      base = z
        .string()
        .min(field.required ? 1 : 0, `${field.label} es requerido`)
        .transform((value) => value.trim());
  }

  if (!field.required) {
    base = base.optional().or(z.literal('').transform(() => undefined));
  }

  return base;
};

export const CatalogFormDialog = ({
  open,
  title,
  fields,
  defaultValues,
  onClose,
  onSubmit,
  submitting,
}: CatalogFormDialogProps) => {
  const schema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};
    fields.forEach((field) => {
      shape[field.name] = getFieldSchema(field);
    });
    return z.object(shape);
  }, [fields]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CatalogFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleClose = () => {
    reset(defaultValues);
    onClose();
  };

  const submit = (values: CatalogFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            mt: 0.5,
          }}
        >
          {fields.map((field) => (
            <TextField
              key={field.name}
              fullWidth
              label={field.label}
              {...register(field.name)}
              error={Boolean((errors as any)[field.name])}
              helperText={(errors as any)[field.name]?.message as string}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(submit)}
          disabled={submitting}
        >
          {submitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
