import React, { useState } from 'react'
import Dashboard from './components/Dashboard'
import LandingPage from './components/LandingPage'
import LoadingScreen from './components/LoadingScreen'
import { AnimatePresence, motion } from 'framer-motion'

function App() {
    const [view, setView] = useState<'loading' | 'landing' | 'dashboard'>('loading')
    const [userName, setUserName] = useState('')

    const handleStart = (name: string) => {
        setUserName(name)
        setView('dashboard')
    }

    return (
        <AnimatePresence mode="wait">
            {view === 'loading' && (
                <motion.div
                    key="loading"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="h-screen w-full"
                >
                    <LoadingScreen onFinished={() => setView('landing')} />
                </motion.div>
            )}

            {view === 'landing' && (
                <motion.div
                    key="landing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="h-screen w-full"
                >
                    <LandingPage onStart={handleStart} />
                </motion.div>
            )}

            {view === 'dashboard' && (
                <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="h-screen w-full"
                >
                    <Dashboard userName={userName} onLogout={() => setView('landing')} />
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default App
