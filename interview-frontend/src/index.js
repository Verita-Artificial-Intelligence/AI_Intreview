import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/index.css'
import App from '@/App'

// Fix React DevTools semver error with React 19
if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.isDisabled) {
  window.__REACT_VERSION__ = '19.0.0'
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
