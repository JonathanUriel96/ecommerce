import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const oauthParams = new URLSearchParams(window.location.hash.slice(1))
const oauthToken = oauthParams.get('oauth_token')
const oauthError = oauthParams.get('oauth_error')
let initialAuthError = ''

if (oauthToken || oauthError) {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  if (oauthToken) {
    window.sessionStorage.setItem('urban-shop-token', oauthToken)
  } else if (oauthError === 'google_customer_only') {
    initialAuthError = 'El acceso con Google está disponible para clientes. El personal debe iniciar sesión con su cuenta de trabajo.'
  } else {
    initialAuthError = 'No se pudo iniciar sesión con Google. Verifica la configuración e inténtalo de nuevo.'
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App initialAuthError={initialAuthError} />
  </StrictMode>,
)
