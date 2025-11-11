import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Box,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddIcon from '@mui/icons-material/Add';
import type { CatalogFieldConfig } from '../../config/catalogs';

interface CatalogTableProps {
  fields: CatalogFieldConfig[];
  data: unknown[];
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (item: Record<string, unknown>) => void;
  onCreate?: () => void;
  onImport?: () => void;
}

export const CatalogTable = ({
  fields,
  data,
  onEdit,
  onDelete,
  onCreate,
  onImport,
}: CatalogTableProps) => (
  <Paper elevation={1}>
    <Box
      sx={{
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Typography variant="h6" fontWeight={600}>
        Registros
      </Typography>
      <Box>
        {onImport && (
          <Tooltip title="Importar desde Excel">
            <IconButton color="primary" onClick={onImport}>
              <UploadFileIcon />
            </IconButton>
          </Tooltip>
        )}
        {onCreate && (
          <Tooltip title="Nuevo registro">
            <IconButton color="primary" onClick={onCreate}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {fields.map((field) => (
              <TableCell key={field.name}>{field.label}</TableCell>
            ))}
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => {
            const record = row as Record<string, unknown>;
            const rowKey = (record.id as string) ?? `${index}`;
            return (
              <TableRow hover key={rowKey}>
                {fields.map((field) => (
                  <TableCell key={field.name}>
                    {String(record[field.name] ?? '')}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => onEdit(record)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onDelete(record)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={fields.length + 1}>
                <Typography variant="body2" color="text.secondary">
                  No hay registros para mostrar.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);
