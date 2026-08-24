import { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Expedicao from './pages/Expedicao'
import Producao from './pages/Producao'
import Historico from './pages/Historico'
import TVMode from './pages/TVMode'
import NPSAdmin from './pages/NPSAdmin'
import IoT from './pages/IoT'
import Logistica from './pages/Logistica'
import Estoque from './pages/Estoque'
import { AIPanel } from './components/AIPanel'
import Motorista from './pages/Motorista'
import Rastreabilidade from './pages/Rastreabilidade'
import Usuarios from './pages/Usuarios'
import Login from './pages/Login'
import LoadingScreen from './components/LoadingScreen'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function AppContent() {
  const location = useLocation()
  const isTVMode = location.pathname === '/tv'
  const isLogin = location.pathname === '/login'
  const { isAuthenticated, user } = useAuth()

  // Show AIPanel for gestores and expedidores (not on TV/Login)
  const showAI = isAuthenticated && !isTVMode && !isLogin && (user?.perfil === 'gestor' || user?.perfil === 'expedidor')

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/motorista" element={<Motorista />} />

        {/* TV Mode — accessible by all authenticated users */}
        <Route path="/tv" element={
          <ProtectedRoute requiredPath="/tv">
            <TVMode />
          </ProtectedRoute>
        } />
        
        {/* Protected routes inside Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={
            <ProtectedRoute requiredPath="/">
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute requiredPath="/dashboard">
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/expedicao" element={
            <ProtectedRoute requiredPath="/expedicao">
              <Expedicao />
            </ProtectedRoute>
          } />
          <Route path="/producao" element={
            <ProtectedRoute requiredPath="/producao">
              <Producao />
            </ProtectedRoute>
          } />
          <Route path="/historico" element={
            <ProtectedRoute requiredPath="/historico">
              <Historico />
            </ProtectedRoute>
          } />
          <Route path="/nps" element={
            <ProtectedRoute requiredPath="/nps">
              <NPSAdmin />
            </ProtectedRoute>
          } />
          <Route path="/iot" element={
            <ProtectedRoute requiredPath="/iot">
              <IoT />
            </ProtectedRoute>
          } />
          <Route path="/logistica" element={
            <ProtectedRoute requiredPath="/logistica">
              <Logistica />
            </ProtectedRoute>
          } />
          <Route path="/estoque" element={
            <ProtectedRoute requiredPath="/estoque">
              <Estoque />
            </ProtectedRoute>
          } />
          <Route path="/rastreabilidade" element={
            <ProtectedRoute requiredPath="/rastreabilidade">
              <Rastreabilidade />
            </ProtectedRoute>
          } />
          <Route path="/usuarios" element={
            <ProtectedRoute requiredPath="/usuarios">
              <Usuarios />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
      
      {/* AI Panel — only for gestores */}
      {showAI && <AIPanel />}
    </>
  )
}

export default function App() {
  const [loading, setLoading] = useState(true)
  const [fade, setFade] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setFade(true)
    }, 2800)
    
    const timer2 = setTimeout(() => {
      setLoading(false)
    }, 3300)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  return (
    <AuthProvider>
      {loading && (
        <div 
          className={`fixed inset-0 z-[9999] transition-opacity duration-500 pointer-events-none ${fade ? 'opacity-0' : 'opacity-100'}`}
        >
          <LoadingScreen />
        </div>
      )}
      <AppContent />
    </AuthProvider>
  )
}
