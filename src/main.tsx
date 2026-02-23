import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 🛡️ EMERGENCY POLYFILL (CRITICAL for P2P/Simple-Peer)
import { Buffer } from 'buffer'
window.global = window;
window.Buffer = Buffer;

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
