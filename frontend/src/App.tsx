import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Dashboard from '@/pages/Dashboard'
import Zakaznici from '@/pages/Zakaznici'
import Ponuky from '@/pages/Ponuky'
import PonukaDetail from '@/pages/PonukaDetail'
import Zameranie from '@/pages/Zameranie'
import Zakazky from '@/pages/Zakazky'
import ZakazkaDetail from '@/pages/ZakazkaDetail'
import Montaze from '@/pages/Montaze'
import Protokoly from '@/pages/Protokoly'
import Faktury from '@/pages/Faktury'
import Servis from '@/pages/Servis'
import Sklad from '@/pages/Sklad'
import Nastavenia from '@/pages/Nastavenia'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="zakaznici" element={<Zakaznici />} />
          <Route path="ponuky" element={<Ponuky />} />
          <Route path="ponuky/:id" element={<PonukaDetail />} />
          <Route path="zameranie" element={<Zameranie />} />
          <Route path="zakazky" element={<Zakazky />} />
          <Route path="zakazky/:id" element={<ZakazkaDetail />} />
          <Route path="montaze" element={<Montaze />} />
          <Route path="protokoly" element={<Protokoly />} />
          <Route path="faktury" element={<Faktury />} />
          <Route path="servis" element={<Servis />} />
          <Route path="sklad" element={<Sklad />} />
          <Route path="nastavenia" element={<Nastavenia />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
