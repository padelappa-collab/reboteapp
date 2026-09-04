import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { escucharInstalacion } from '@/lib/instalar'

// el evento de instalación de Android se dispara una sola vez y muy temprano:
// si se espera a montar React, ya pasó y no vuelve
escucharInstalacion()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
