import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AdminPage from './pages/AdminPage.tsx'
import TestScreen from './pages/TestScreen.tsx'
import { DEFAULT_CONFIG } from './config.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/testscreen" element={<TestScreen />} />
        <Route path="/admin/test-all" element={<App blockConfigOverride={{ ...DEFAULT_CONFIG }} />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
