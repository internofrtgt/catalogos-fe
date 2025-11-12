import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { CircularProgress, Box } from '@mui/material';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { SessionExpirationWarning } from './components/SessionExpirationWarning';
import { CatalogsPage } from './pages/catalogs/CatalogsPage';
import { CatalogEntriesPage } from './pages/catalogs/CatalogEntriesPage';
import { ImportCatalogPage } from './pages/catalogs/ImportCatalogPage';
import { ProvincesPage } from './pages/geography/ProvincesPage';
import { CantonsPage } from './pages/geography/CantonsPage';
import { DistrictsPage } from './pages/geography/DistrictsPage';
import { BarriosPage } from './pages/geography/BarriosPage';
import { UsersPage } from './pages/users/UsersPage';
import { ApiDocsPage } from './pages/api-docs/ApiDocsPage';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

function FullScreenLoader() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <SessionExpirationWarning />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="catalogs" replace />} />
          <Route path="catalogs" element={<CatalogsPage />} />
          <Route path="catalogs/:catalogKey" element={<CatalogEntriesPage />} />
          <Route path="catalogs/:catalogKey/import" element={<ImportCatalogPage />} />
          <Route path="geography/provinces" element={<ProvincesPage />} />
          <Route path="geography/cantons" element={<CantonsPage />} />
          <Route path="geography/districts" element={<DistrictsPage />} />
          <Route path="geography/barrios" element={<BarriosPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="api-docs" element={<ApiDocsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
