import { createBrowserRouter } from 'react-router-dom';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { ROUTES } from '@/config/routes';
import { LoginPage } from '@/pages/login/login-page';
import { DashboardPage } from '@/pages/dashboard/dashboard-page';
import { AiAssistantPage } from '@/pages/ai-assistant/ai-assistant-page';
import { EmployeesPage } from '@/pages/employees/employees-page';
import { PayrollPage } from '@/pages/payroll/payroll-page';
import { SchedulePage } from '@/pages/schedule/schedule-page';
import { DepartmentsPage } from '@/pages/departments/departments-page';
import { PermissionsPage } from '@/pages/permissions/permissions-page';
import { PartnersPage } from '@/pages/partners/partners-page';
import { ProductsPage } from '@/pages/products/products-page';
import { InventoryPage } from '@/pages/inventory/inventory-page';
import { StockMovementsPage } from '@/pages/stock-movements/stock-movements-page';
import { ProductionPage } from '@/pages/production/production-page';
import { DocumentsPage } from '@/pages/documents/documents-page';
import { AnnouncementsPage } from '@/pages/announcements/announcements-page';
import { StatisticsPage } from '@/pages/statistics/statistics-page';
import { NotFoundPage } from '@/pages/not-found/not-found-page';

export const router = createBrowserRouter([
  {
    path: ROUTES.login,
    element: <LoginPage />,
  },
  {
    element: <ProtectedLayout />,
    children: [
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      { path: ROUTES.aiAssistant, element: <AiAssistantPage /> },
      { path: ROUTES.employees, element: <EmployeesPage /> },
      { path: ROUTES.payroll, element: <PayrollPage /> },
      { path: ROUTES.schedule, element: <SchedulePage /> },
      { path: ROUTES.departments, element: <DepartmentsPage /> },
      { path: ROUTES.permissions, element: <PermissionsPage /> },
      { path: ROUTES.partners, element: <PartnersPage /> },
      { path: ROUTES.products, element: <ProductsPage /> },
      { path: ROUTES.inventory, element: <InventoryPage /> },
      { path: ROUTES.stockMovements, element: <StockMovementsPage /> },
      { path: ROUTES.production, element: <ProductionPage /> },
      { path: ROUTES.documents, element: <DocumentsPage /> },
      { path: ROUTES.announcements, element: <AnnouncementsPage /> },
      { path: ROUTES.statistics, element: <StatisticsPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
