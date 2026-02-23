import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Zap, Shield, Cpu, Minus, Square, X } from 'lucide-react'

const sendWindowAction = (action: string) => {
    const ipc = (window as any).ipcRenderer || (window as any).require?.('electron')?.ipcRenderer;
    if (ipc) ipc.send(action);
}

const Gear = ({ size, rotate, color = "text-amber-500/20", speed = 10, className = "" }: { size: number, rotate: number, color?: string, speed?: number, className?: string }) => (
    <motion.div
        animate={{ rotate: rotate * 360 }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
        className={`absolute ${className}`}
        style={{ width: size, height: size }}
    >
        <Settings className={`w-full h-full ${color}`} />
    </motion.div>
)

const LoadingScreen = ({ onFinished }: { onFinished: () => void }) => {
    const [status, setStatus] = useState('Initializing Core Systems...')
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const initializeApp = async () => {
            try {
                await new Promise(r => setTimeout(r, 600))
                setProgress(20)
                setStatus('Calibrating Aetheric Resonators...')

                setStatus('Establishing Secure Signal Grid...')
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 3000)

                try {
                    await fetch('http://localhost:9000', {
                        method: 'HEAD',
                        mode: 'no-cors',
                        signal: controller.signal
                    })
                    clearTimeout(timeoutId)
                } catch (err) {
                    await new Promise(r => setTimeout(r, 1000))
                }

                setProgress(50)
                setStatus('Handshake Verified. Synchronizing Grid...')

                setStatus('Caching Aetheric Visuals...')
                const criticalAssets = ['https://api.dicebear.com/7.x/avataaars/svg?seed=Aymen']
                await Promise.all(criticalAssets.map(url => new Promise((resolve) => {
                    const img = new Image()
                    img.src = url
                    img.onload = resolve
                    img.onerror = resolve
                })))

                setProgress(85)
                setStatus('Temporal Dampeners Synchronized.')

                await new Promise(r => setTimeout(r, 400))
                setProgress(100)
                setStatus('Systems Nominal. Entering the Grid.')

                setTimeout(onFinished, 600)
            } catch (error) {
                setStatus('System Error. Retrying Boot...')
                setTimeout(initializeApp, 2000)
            }
        }
        initializeApp()
    }, [onFinished])

    return (
        <div className="h-screen w-full animate-fast-gradient flex flex-col relative overflow-hidden">
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
            <div className="absolute inset-0 topographic-lines opacity-40 pointer-events-none" />

            <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* ATMOSPHERIC DEPTH */}
                <motion.div
                    animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.05)_0%,transparent_70%)]"
                />

                <div className="relative z-10 flex flex-col items-center">
                    {/* INTERLOCKING GEAR ASSEMBLY */}
                    <div className="relative mb-20 w-48 h-48 flex items-center justify-center">
                        <Gear size={220} rotate={1} color="text-amber-900/10" speed={20} className="opacity-50" />
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <Gear size={128} rotate={1} color="text-amber-600/30" speed={12} />
                            <Gear size={50} rotate={-1} color="text-amber-500/20" speed={6} className="-top-4 -right-4" />
                            <Gear size={40} rotate={-1} color="text-amber-500/10" speed={4} className="-bottom-2 -left-4" />

                            <div className="relative flex items-center justify-center">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [0.3, 0.6, 0.3],
                                        boxShadow: [
                                            "0 0 20px rgba(245,158,11,0.2)",
                                            "0 0 40px rgba(245,158,11,0.5)",
                                            "0 0 20px rgba(245,158,11,0.2)"
                                        ]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400/30 backdrop-blur-sm"
                                />
                                <motion.div
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 0.1, repeat: Infinity, repeatType: "reverse" }}
                                    className="absolute"
                                >
                                    <Zap className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                                </motion.div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center space-y-8 w-[350px]">
                        <div className="space-y-4">
                            <motion.h2
                                key={status}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-[11px] font-black text-amber-500 uppercase tracking-[0.6em] drop-shadow-[0_0_5px_rgba(245,158,11,0.3)] nixie-flicker"
                            >
                                {status}
                            </motion.h2>

                            <div className="relative h-1.5 w-full bg-white/[0.02] rounded-full overflow-hidden border border-white/5 p-[1px]">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] relative"
                                >
                                    <motion.div
                                        animate={{ x: ['-100%', '100%'] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 bg-white/20 w-1/4 skew-x-[-20deg]"
                                    />
                                </motion.div>
                            </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-amber-500/10 pt-4 px-2">
                            <div className="flex flex-col items-start gap-2">
                                <div className="flex items-center gap-2 opacity-40">
                                    <Shield className="w-3 h-3 text-amber-500" />
                                    <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] font-mono">ENCLAVE_ENCRYPTION_ACTIVE</span>
                                </div>
                                <div className="flex items-center gap-2 opacity-40">
                                    <Cpu className="w-3 h-3 text-amber-500" />
                                    <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] font-mono">STEAM_KERNEL_SPOOLING: {progress.toString().padStart(3, '0')}</span>
                                </div>
                            </div>
                            <div className="text-[20px] font-mono text-amber-500/10 leading-none select-none">
                                {progress.toString().padStart(3, '0')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] pointer-events-none" />
            <div className="absolute inset-4 border border-white/[0.03] rounded-[40px] pointer-events-none" />
        </div>
    )
}

export default LoadingScreen
