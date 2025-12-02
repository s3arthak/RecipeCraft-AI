import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/tailwind.css'
import { attachStoredToken } from "./api";
attachStoredToken();


createRoot(document.getElementById('root')).render(<App />)
