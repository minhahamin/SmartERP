import { createBrowserRouter } from 'react-router-dom';
import { ProtectedLayout, RequirePermission } from '@/components/layout/protected-layout';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { ROUTES } from '@/config/routes';
import { LoginPage } from '@/pages/login/login-page';
import { SignupPage } from '@/pages/signup/signup-page';
import { ChangePasswordPage } from '@/pages/change-password/change-password-page';
import { DashboardPage } from '@/pages/dashboard/dashboard-page';
import { AiAssistantPage } from '@/pages/ai-assistant/ai-assistant-page';
import { EmployeesPage } from '@/pages/employees/employees-page';
import { EmployeeDetailPage } from '@/pages/employees/employee-detail-page';
import { PayrollPage } from '@/pages/payroll/payroll-page';
import { SchedulePage } from '@/pages/schedule/schedule-page';
import { DepartmentsPage } from '@/pages/departments/departments-page';
import { PermissionsPage } from '@/pages/permissions/permissions-page';
import { PartnersPage } from '@/pages/partners/partners-page';
import { SalesOrdersPage } from '@/pages/sales/sales-orders-page';
import { ProductsPage } from '@/pages/products/products-page';
import { ProductDetailPage } from '@/pages/products/product-detail-page';
import { InventoryPage } from '@/pages/inventory/inventory-page';
import { StockMovementsPage } from '@/pages/stock-movements/stock-movements-page';
import { ProductionPage } from '@/pages/production/production-page';
import { DocumentsPage } from '@/pages/documents/documents-page';
import { AnnouncementsPage } from '@/pages/announcements/announcements-page';
import { FaqPage } from '@/pages/faq/faq-page';
import { StatisticsPage } from '@/pages/statistics/statistics-page';
import { MyProfilePage } from '@/pages/profile/my-profile-page';
import { NotFoundPage } from '@/pages/not-found/not-found-page';

export const router = createBrowserRouter([
  {
    path: ROUTES.login,
    element: <LoginPage />,
  },
  {
    path: ROUTES.signup,
    element: <SignupPage />,
  },
  {
    path: ROUTES.changePassword,
    element: <ChangePasswordPage />,
  },
  {
    element: <ProtectedLayout />,
    children: [
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      { path: ROUTES.aiAssistant, element: <AiAssistantPage /> },
      {
        path: ROUTES.employees,
        element: (
          <RequirePermission resource="USER">
            <EmployeesPage />
          </RequirePermission>
        ),
      },
      {
        path: `${ROUTES.employees}/:id`,
        element: (
          <RequirePermission resource="USER">
            <EmployeeDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.payroll,
        element: (
          <RequirePermission resource="PAYROLL" selfServiceRoles={['EMPLOYEE']}>
            <PayrollPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.schedule,
        element: (
          <RequirePermission resource="SCHEDULE">
            <SchedulePage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.departments,
        element: (
          <RequirePermission resource="DEPARTMENT">
            <DepartmentsPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.permissions,
        element: (
          <RequirePermission resource="PERMISSION">
            <PermissionsPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.partners,
        element: (
          <RequirePermission resource="PARTNER">
            <PartnersPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.salesOrders,
        element: (
          <RequirePermission resource="SALES_ORDER">
            <SalesOrdersPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.products,
        element: (
          <RequirePermission resource="PRODUCT">
            <ProductsPage />
          </RequirePermission>
        ),
      },
      {
        path: `${ROUTES.products}/:id`,
        element: (
          <RequirePermission resource="PRODUCT">
            <ProductDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.inventory,
        element: (
          <RequirePermission resource="INVENTORY">
            <InventoryPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.stockMovements,
        element: (
          <RequirePermission resource="STOCK_MOVEMENT">
            <StockMovementsPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.production,
        element: (
          <RequirePermission resource="PRODUCTION">
            <ProductionPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.documents,
        element: (
          <RequirePermission resource="DOCUMENT">
            <DocumentsPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.announcements,
        element: (
          <RequirePermission resource="ANNOUNCEMENT">
            <AnnouncementsPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.statistics,
        element: (
          <RequirePermission resource="STATISTICS">
            <StatisticsPage />
          </RequirePermission>
        ),
      },
      {
        path: ROUTES.faq,
        element: (
          <RequirePermission resource="DOCUMENT" action="CREATE">
            <FaqPage />
          </RequirePermission>
        ),
      },
      { path: ROUTES.profile, element: <MyProfilePage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
    errorElement: (
      <ErrorBoundary>
        <NotFoundPage />
      </ErrorBoundary>
    ),
  },
]);
