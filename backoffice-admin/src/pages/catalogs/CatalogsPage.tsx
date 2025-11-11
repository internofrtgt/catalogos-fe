import {
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCatalogDefinitions } from '../../api/catalogs';

export const CatalogsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, isPending } = useQuery({
    queryKey: ['catalogs', 'definitions'],
    queryFn: getCatalogDefinitions,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (item) =>
        item.label.toLowerCase().includes(term) ||
        item.key.toLowerCase().includes(term),
    );
  }, [data, search]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Catalogos maestros
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Selecciona un catalogo para administrar sus valores.
        </Typography>
      </Box>

      <TextField
        placeholder="Buscar catalogo..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {isPending ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 6,
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
            },
          }}
        >
          {filtered.map((catalog) => (
            <Card key={catalog.key} elevation={2}>
              <CardActionArea
                onClick={() => navigate(`/catalogs/${catalog.key}`)}
              >
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    {catalog.key}
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {catalog.label}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
          {!filtered.length && (
            <Box sx={{ py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No se encontraron catalogos para tu busqueda.
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
