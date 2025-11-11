import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ApiDocPayload } from "../../api/api-docs";

export type ApiDocFormMode = "create" | "edit";

interface ApiDocFormDialogProps {
  open: boolean;
  mode: ApiDocFormMode;
  defaultValues?: Partial<ApiDocPayload>;
  onClose: () => void;
  onSubmit: (values: ApiDocPayload) => void;
  submitting?: boolean;
}

const schema = z.object({
  title: z.string().min(3, "Debe tener al menos 3 caracteres"),
  version: z.string().min(1, "Debe indicar la version"),
  summary: z.string().min(10, "Agrega un resumen breve"),
  content: z.string().min(10, "Agrega el contenido de la documentacion"),
});

type ApiDocFormValues = z.infer<typeof schema>;

export const ApiDocFormDialog = ({
  open,
  mode,
  defaultValues,
  onClose,
  onSubmit,
  submitting,
}: ApiDocFormDialogProps) => {
  const initialValues: ApiDocFormValues = {
    title: defaultValues?.title ?? "",
    version: defaultValues?.version ?? "",
    summary: defaultValues?.summary ?? "",
    content: defaultValues?.content ?? "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApiDocFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset({
      title: defaultValues?.title ?? "",
      version: defaultValues?.version ?? "",
      summary: defaultValues?.summary ?? "",
      content: defaultValues?.content ?? "",
    });
  }, [defaultValues, reset]);

  const submit = (values: ApiDocFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === "create"
          ? "Nueva documentacion de API"
          : "Editar documentacion de API"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Titulo"
            fullWidth
            {...register("title")}
            error={Boolean(errors.title)}
            helperText={errors.title?.message}
          />
          <TextField
            label="Version"
            fullWidth
            {...register("version")}
            error={Boolean(errors.version)}
            helperText={errors.version?.message}
          />
          <TextField
            label="Resumen"
            fullWidth
            multiline
            minRows={2}
            {...register("summary")}
            error={Boolean(errors.summary)}
            helperText={errors.summary?.message}
          />
          <TextField
            label="Contenido"
            fullWidth
            multiline
            minRows={10}
            {...register("content")}
            error={Boolean(errors.content)}
            helperText={errors.content?.message}
          />
        </Stack>
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
