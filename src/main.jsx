import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AppProvider } from './context/AppContext'
import { DemoProvider } from './context/DemoContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <DemoProvider>
          <App />
        </DemoProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
)
