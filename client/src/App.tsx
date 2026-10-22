import { AuthPage } from './pages/AuthPage'
import { AccountPage, CheckoutPage } from './pages/AccountPage'
import { HomePage } from './pages/HomePage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/account" element={<AccountPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
