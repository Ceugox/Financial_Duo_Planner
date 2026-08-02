import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { InvestmentsPage } from '@/pages/InvestmentsPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { BudgetPage } from '@/pages/BudgetPage'
import { AnalysisPage } from '@/pages/AnalysisPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { ConnectionsPage } from '@/pages/ConnectionsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="transacoes" element={<TransactionsPage />} />
              <Route path="orcamento" element={<BudgetPage />} />
              <Route path="analise" element={<AnalysisPage />} />
              <Route path="investimentos" element={<InvestmentsPage />} />
              <Route path="objetivos" element={<GoalsPage />} />
              <Route path="categorias" element={<CategoriesPage />} />
              <Route path="conexoes" element={<ConnectionsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  )
}
