import { Outlet } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';

const DashboardPage = () => (
  <AppLayout>
    <Outlet />
  </AppLayout>
);

export default DashboardPage;
