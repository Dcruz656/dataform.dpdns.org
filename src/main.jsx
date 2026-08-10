import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import PublicSurveyView from './views/PublicSurveyView.jsx'

if (window.location.pathname === '/manual') {
  window.location.replace('/manual.html');
}

const publicMatch = window.location.pathname.match(/^\/s\/([^/]+)$/)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {publicMatch ? (
      <PublicSurveyView surveyId={publicMatch[1]} />
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </StrictMode>,
)
