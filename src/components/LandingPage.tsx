import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, User as UserIcon, Minus, Square, X } from 'lucide-react'

const sendWindowAction = (action: string) => {
    const ipc = (window as any).ipcRenderer || (window as any).require?.('electron')?.ipcRenderer;
    if (ipc) ipc.send(action);
}

interface LandingPageProps {
    onStart: (name: string) => void
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    const [name, setName] = useState('')

    const handleStart = () => {
        if (name.trim()) {
            onStart(name.trim())
        }
    }

    return (
        <div className="relative w-full h-screen overflow-hidden flex flex-col animate-fast-gradient text-white select-none">
            {/* COMPACT TITLE BAR */}
            <header className="h-10 flex items-center justify-between px-6 shrink-0 z-[100] relative title-bar-drag">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black tracking-[0.4em] text-white/40 uppercase italic">STEAMPUNK</span>
                </div>
                <div className="flex items-center gap-1 title-bar-no-drag">
                    <button onClick={() => sendWindowAction('window-minimize')} className="p-2 hover:bg-white/5 text-slate-600 transition-colors">
                        <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => sendWindowAction('window-maximize')} className="p-2 hover:bg-white/5 text-slate-600 transition-colors">
                        <Square className="w-3" />
                    </button>
                    <button onClick={() => sendWindowAction('window-close')} className="p-2 hover:bg-red-500/80 hover:text-white text-slate-600 transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </header>

            {/* TOPOGRAPHIC LINES OVERLAY */}
            <div className="absolute inset-0 topographic-lines opacity-30 pointer-events-none" />

            <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* LOGO AREA */}
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="z-10 mb-8 flex flex-col items-center"
                >
                    <div className="w-64 h-64 relative mb-2">
                        <img
                            src="./src/assets/Steampunk1.png"
                            alt="Steampunk Logo"
                            className="w-full h-full object-contain filter drop-shadow-[0_0_50px_rgba(245,158,11,0.4)]"
                        />
                    </div>
                    <h1 className="text-lg font-black tracking-[0.4em] text-white uppercase italic text-center max-w-lg leading-relaxed opacity-80">
                        Enter your username to join the <span className="text-amber-500">LOBBY</span>
                    </h1>
                </motion.div>

                {/* NAME INPUT SECTION */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="z-10 w-full max-w-sm px-6 flex flex-col items-center gap-6"
                >
                    <div className="w-full relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-500 transition-colors">
                            <UserIcon className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="ENTER IDENTIFIER..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all text-sm tracking-widest font-bold uppercase"
                            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                        />
                    </div>

                    <button
                        onClick={handleStart}
                        disabled={!name.trim()}
                        className={`group relative px-12 py-5 rounded-full overflow-hidden transition-all duration-500 shadow-xl
                            ${name.trim()
                                ? 'bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]'
                                : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5'}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-10 transition-opacity" />
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-black uppercase tracking-[0.2em]">Start Transmission</span>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                                ${name.trim() ? 'bg-black text-white group-hover:bg-amber-500' : 'bg-white/10 text-white/20'}`}>
                                <Zap className="w-4 h-4" />
                            </div>
                        </div>
                    </button>
                </motion.div>

                {/* DECORATIVE ELEMENTS */}
                <div className="absolute bottom-10 left-12 flex flex-col gap-2 z-10 hidden sm:flex">
                    <div className="w-12 h-[1px] bg-white/20" />
                    <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Made by Aymenzito</span>
                </div>

                <div className="absolute bottom-10 right-12 flex flex-col items-end gap-2 z-10 hidden sm:flex">
                    <div className="w-12 h-[1px] bg-white/20" />
                    <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Region: Global</span>
                </div>
            </div>
        </div>
    )
}

export default LandingPage
