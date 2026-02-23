import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, Users, Settings, MessageSquare, Share2, Send, X, Minus, Square, ExternalLink, LogOut, User, Bell, ChevronRight, LayoutGrid, Library, Radio, Plus, Zap, ChevronLeft, ChevronDown, Shield, ShieldOff, MoreVertical, Ban, Coffee } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'
import { ConnectionManager, SyncEvent, ChatMessage as ChatMsgType } from '../core/ConnectionManager'

interface DashboardProps {
    userName: string
    onLogout: () => void
}

const Dashboard: React.FC<DashboardProps> = ({ userName, onLogout }) => {
    // --- IPC HELPER ---
    const sendWindowAction = (action: string) => {
        const ipc = (window as any).ipcRenderer || (window as any).require?.('electron')?.ipcRenderer;
        if (ipc) {
            ipc.send(action);
        } else {
            console.error("[IPC] ipcRenderer not found");
        }
    }

    // --- STATE ---
    const [urlInput, setUrlInput] = useState('')
    const [videoUrl, setVideoUrl] = useState('')
    const [isChatOpen, setIsChatOpen] = useState(true)
    const [roomId, setRoomId] = useState('')
    const [isHost, setIsHost] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const [showSettingsPanel, setShowSettingsPanel] = useState(false)
    const [isJoining, setIsJoining] = useState(false)
    const [joinCodeInput, setJoinCodeInput] = useState('')
    const [messages, setMessages] = useState<ChatMsgType[]>([
        { user: 'System', text: 'Signal Grid Online. Awaiting transmission coordinates... 📡', timestamp: Date.now() }
    ])
    const [chatInput, setChatInput] = useState('')
    const [members, setMembers] = useState<string[]>([])
    const [authorizedNodes, setAuthorizedNodes] = useState<string[]>([])
    const [activeMemberMenu, setActiveMemberMenu] = useState<string | null>(null)
    const [sessionError, setSessionError] = useState<{ type: 'TERMINATED' | 'EXPIRED', message: string } | null>(null)

    // --- SETTINGS STATE ---
    const [settings, setSettings] = useState({
        showDiagnostics: false,
        autoHideUi: true,
        stealthMode: false,
        gpuAcceleration: true
    })
    const [isUiVisible, setIsUiVisible] = useState(true)
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // --- REFS ---
    const connectionRef = useRef<ConnectionManager | null>(null)
    const profileRef = useRef<HTMLDivElement>(null)

    // --- UTILS ---
    const extractYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    const extractTwitchChannel = (url: string) => {
        const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
        return match ? match[1] : null;
    }

    const extractKickChannel = (url: string) => {
        const match = url.match(/kick\.com\/([a-zA-Z0-9_]+)/);
        return match ? match[1] : null;
    }

    // --- HANDLERS ---
    const handleUrlSubmit = () => {
        console.log("[PLAYER] Processing URL:", urlInput);
        if (!urlInput.trim()) return

        const youtubeId = extractYoutubeId(urlInput);
        const twitchChannel = extractTwitchChannel(urlInput);
        const kickChannel = extractKickChannel(urlInput);

        if (youtubeId) {
            const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;
            setVideoUrl(embedUrl);
            console.log("[PLAYER] YouTube Embed Triggered:", youtubeId);
        } else if (twitchChannel) {
            const embedUrl = `https://player.twitch.tv/?channel=${twitchChannel}&parent=${window.location.hostname || 'localhost'}&autoplay=true`;
            setVideoUrl(embedUrl);
            console.log("[PLAYER] Twitch Embed Triggered:", twitchChannel);
        } else if (kickChannel) {
            const embedUrl = `https://player.kick.com/${kickChannel}`;
            setVideoUrl(embedUrl);
            console.log("[PLAYER] Kick Embed Triggered:", kickChannel);
        } else {
            setVideoUrl(urlInput);
            console.log("[PLAYER] Generic URL Triggered:", urlInput);
        }

        if (isHost && connectionRef.current) {
            connectionRef.current.broadcast({
                event: SyncEvent.SEEK,
                timestamp: Date.now(),
                currentTime: 0
            })
        }
    }

    const handleCreateRoom = () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase()
        setRoomId(code)
        setIsHost(true)
        connectionRef.current?.createRoom(code, userName)
        setShowInviteModal(true)
    }

    const handleJoinRoom = () => {
        if (!joinCodeInput.trim()) return
        const code = joinCodeInput.toUpperCase()
        setRoomId(code)
        setIsHost(false)
        connectionRef.current?.joinRoom(code, userName)
        setIsJoining(false)
        setJoinCodeInput('')
    }

    const handleSendChat = () => {
        if (!chatInput.trim()) return
        const msg: ChatMsgType = { user: userName, text: chatInput, timestamp: Date.now() }
        setMessages(prev => [...prev, msg])
        connectionRef.current?.sendChat(msg)
        setChatInput('')
    }

    const handleTogglePermission = (targetUser: string) => {
        if (!isHost) return;
        const newAuth = authorizedNodes.includes(targetUser)
            ? authorizedNodes.filter(u => u !== targetUser)
            : [...authorizedNodes, targetUser];

        setAuthorizedNodes(newAuth);
        connectionRef.current?.broadcast({
            event: SyncEvent.PERMISSION_UPDATE,
            timestamp: Date.now(),
            currentTime: 0,
            payload: newAuth
        });
        setActiveMemberMenu(null);
    }

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const handleOpenDonate = () => {
        const ipc = (window as any).ipcRenderer || (window as any).require?.('electron')?.ipcRenderer;
        if (ipc) {
            ipc.send('open-external-url', 'https://ko-fi.com/aymenzito');
        }
    }

    const handleCloseSessionError = () => {
        setSessionError(null);
        setRoomId('');
        setVideoUrl('');
        setIsHost(false);
        setMembers([]);
        setAuthorizedNodes([]);
    }

    // --- EFFECTS ---
    useEffect(() => {
        connectionRef.current = new ConnectionManager('http://localhost:9000')
        connectionRef.current.onSync((packet) => {
            if (packet.event === SyncEvent.PERMISSION_UPDATE) {
                setAuthorizedNodes(packet.payload || []);
            } else if (packet.event === SyncEvent.SESSION_TERMINATED) {
                setSessionError({
                    type: 'TERMINATED',
                    message: "RELAY DECOMMISSIONED: The encrypted link has been severed by the uplink operator. Re-establish grid connection to continue."
                });
            }
        })
        connectionRef.current.onChat((msg) => setMessages(prev => [...prev, msg]))
        connectionRef.current.onMembersUpdate((members) => setMembers(members))
        connectionRef.current.onRoomError((error) => {
            if (error === 'SESSION_EXPIRED') {
                setSessionError({
                    type: 'EXPIRED',
                    message: "INVALID COORDINATES: These terminal identifiers have been permanently purged from the relay. Initialize a fresh transmission link."
                });
            }
        })

        const handleClickOutside = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfileMenu(false);
            }
            // Close member menu on outside click
            if (activeMemberMenu && !(e.target as HTMLElement).closest('.member-menu-container')) {
                setActiveMemberMenu(null);
            }
        }

        const handleMouseMove = () => {
            if (!settings.autoHideUi) {
                setIsUiVisible(true)
                if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
                return
            }

            setIsUiVisible(true)
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)

            hideTimeoutRef.current = setTimeout(() => {
                if (settings.autoHideUi && videoUrl) {
                    setIsUiVisible(false)
                }
            }, 3000)
        }

        document.addEventListener('mousedown', handleClickOutside)
        window.addEventListener('mousemove', handleMouseMove)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            window.removeEventListener('mousemove', handleMouseMove)
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
            connectionRef.current?.destroy()
        }
    }, [activeMemberMenu, settings.autoHideUi, videoUrl])

    return (
        <div className="flex flex-col h-screen bg-[#050506] text-slate-200 overflow-hidden font-sans relative select-none">

            {/* COMPACT TITLE BAR */}
            <header className={`h-10 bg-[#0a0a0c] flex items-center justify-between px-6 border-b border-white/5 shrink-0 z-[100] fixed top-0 inset-x-0 title-bar-drag transition-all duration-700 ${!isUiVisible ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black tracking-[0.4em] text-white uppercase italic">Steampunk</span>
                    <div className="h-3 w-[1px] bg-white/10" />
                    <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">MASTER_SHELL</span>
                </div>
                <div className="flex items-center gap-1 title-bar-no-drag">
                    <button onClick={() => sendWindowAction('window-minimize')} className="p-2 hover:bg-white/5 text-slate-600 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                    <button onClick={() => sendWindowAction('window-maximize')} className="p-2 hover:bg-white/5 text-slate-600 transition-colors"><Square className="w-3 h-3" /></button>
                    <button onClick={() => sendWindowAction('window-close')} className="p-2 hover:bg-red-500/80 hover:text-white text-slate-600 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
            </header>

            <div className={`flex-1 flex overflow-hidden relative transition-all duration-700 ${isUiVisible ? 'pt-10' : 'pt-0'}`}>
                {/* SIDEBAR */}
                <aside
                    style={{ width: isUiVisible ? '240px' : '76px' }}
                    className={`bg-[#0a0a0c] border-r border-white/5 flex flex-col overflow-y-auto custom-scrollbar shrink-0 shadow-2xl z-50 relative transition-all duration-700 overflow-x-hidden ${isUiVisible ? 'p-6' : 'p-3'}`}
                >
                    {isUiVisible && (
                        <div className="space-y-3 mb-10">
                            <button
                                disabled={!!roomId}
                                onClick={handleCreateRoom}
                                className={`w-full flex items-center gap-4 rounded-2xl transition-all shadow-lg ${!!roomId ? 'bg-white/10 text-white/20 cursor-not-allowed grayscale' : 'bg-white text-black hover:scale-[1.02] active:scale-95'} ${isUiVisible ? 'p-4 justify-between' : 'p-3 justify-center'}`}
                            >
                                {isUiVisible && <span className="text-[11px] font-black uppercase tracking-widest truncate">Host Party</span>}
                                <Plus className="w-4 h-4 shrink-0" />
                            </button>

                            <div className="space-y-2">
                                {!isJoining ? (
                                    <button
                                        disabled={!!roomId}
                                        onClick={() => setIsJoining(true)}
                                        className={`w-full flex items-center gap-4 border border-white/10 text-white rounded-2xl transition-all ${!!roomId ? 'bg-white/5 opacity-20 cursor-not-allowed grayscale' : 'bg-white/[0.03] hover:bg-white/[0.06] active:scale-95'} ${isUiVisible ? 'p-4 justify-between' : 'p-3 justify-center'}`}
                                    >
                                        {isUiVisible && <span className="text-[11px] font-black uppercase tracking-widest truncate">Join Node</span>}
                                        <Zap className="w-4 h-4 text-slate-600 shrink-0" />
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="CODE"
                                            className="w-full bg-white/[0.05] border border-white/20 rounded-xl p-4 text-[11px] font-mono text-center tracking-[0.3em] focus:outline-none focus:border-white/50 uppercase text-white select-text"
                                            value={joinCodeInput}
                                            onChange={(e) => setJoinCodeInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={handleJoinRoom} className="flex-1 p-3 bg-white text-black rounded-xl text-[9px] font-black uppercase tracking-widest">Confirm</button>
                                            <button onClick={() => setIsJoining(false)} className="px-4 p-3 bg-white/5 rounded-xl"><X className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2 mt-4">
                        {isUiVisible && (
                            <div className="text-[10px] font-black text-slate-800 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
                                <Users className="w-3 h-3" />
                                <span>Connected_Nodes</span>
                            </div>
                        )}
                        <AnimatePresence>
                            {members.map((m, i) => (
                                <motion.div
                                    key={m + i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className={`flex items-center rounded-2xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] transition-all cursor-default relative group ${isUiVisible ? 'gap-4 p-3' : 'justify-center p-2 w-12 h-12 mx-auto'}`}
                                >
                                    <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden shrink-0">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m}`} alt="Avatar" className="w-full h-full object-cover" />
                                    </div>
                                    {isUiVisible && (
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className="text-[10px] font-black text-white uppercase tracking-widest truncate">
                                                    {settings.stealthMode && m === userName ? 'REDACTED_NODE' : m}
                                                </div>
                                                {authorizedNodes.includes(m) && <Shield className="w-2.5 h-2.5 text-emerald-500" />}
                                            </div>
                                            <div className="text-[7px] font-bold text-slate-700 uppercase">
                                                {m === members[0] ? 'SESSION_HOST' : (m === userName ? 'YOU (WATCHER)' : 'GUEST_NODE')}
                                            </div>
                                        </div>
                                    )}

                                    {isHost && m !== userName && isUiVisible && (
                                        <div className="relative member-menu-container">
                                            <button
                                                onClick={() => setActiveMemberMenu(activeMemberMenu === m ? null : m)}
                                                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-600 hover:text-white transition-all"
                                            >
                                                <MoreVertical className="w-3.5 h-3.5" />
                                            </button>

                                            <AnimatePresence>
                                                {activeMemberMenu === m && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.9, x: 10 }}
                                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                                        exit={{ opacity: 0, scale: 0.9, x: 10 }}
                                                        className="absolute right-full top-0 mr-2 w-[160px] bg-[#0d0d0f] border border-white/10 rounded-xl shadow-2xl p-1 z-[60] backdrop-blur-xl"
                                                    >
                                                        <button
                                                            onClick={() => handleTogglePermission(m)}
                                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-all text-left"
                                                        >
                                                            {authorizedNodes.includes(m) ? (
                                                                <>
                                                                    <ShieldOff className="w-3.5 h-3.5 text-red-500" />
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Revoke Rights</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Grant Rights</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}

                                    {isUiVisible && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse ml-auto" />}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {members.length === 0 && isUiVisible && (
                            <div className="text-center py-10 opacity-20">
                                <Users className="w-8 h-8 mx-auto mb-2" />
                                <p className="text-[8px] font-bold uppercase tracking-widest">Awaiting_Peers...</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 mt-auto pt-8 border-t border-white/5 relative">
                        <NavButton collapsed={!isUiVisible} icon={<Coffee className="w-4 h-4 text-pink-500" />} label="Support Project" onClick={handleOpenDonate} />
                        <NavButton collapsed={!isUiVisible} icon={<Settings className="w-4 h-4" />} label="Settings" onClick={() => setShowSettingsPanel(true)} />
                        <div ref={profileRef} onClick={() => setShowProfileMenu(!showProfileMenu)} className={`flex items-center rounded-2xl hover:bg-white/[0.04] transition-all cursor-pointer group mt-4 relative z-[100] ${isUiVisible ? 'gap-4 p-3' : 'justify-center p-2 w-12 h-12 mx-auto'}`}>
                            <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden shrink-0"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} alt="Avatar" className="w-full h-full object-cover" /></div>
                            {isUiVisible && (
                                <>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-black text-white uppercase tracking-widest truncate">{userName}</div>
                                        <div className="text-[8px] font-bold text-slate-700 uppercase">NODE_OPERATOR</div>
                                    </div>
                                    <ChevronDown className={`w-3 h-3 text-slate-700 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                                </>
                            )}

                            <AnimatePresence>
                                {showProfileMenu && isUiVisible && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute bottom-full left-0 mb-4 w-[200px] bg-[#0d0d0f] border border-white/10 rounded-[24px] shadow-2xl p-2 backdrop-blur-xl z-[150]"
                                    >
                                        <ProfileMenuItem icon={<User className="w-4 h-4" />} label="Identity" />
                                        <ProfileMenuItem icon={<Bell className="w-4 h-4" />} label="Relays" />
                                        <ProfileMenuItem icon={<Coffee className="w-4 h-4 text-pink-500" />} label="Support" onClick={handleOpenDonate} />
                                        <div className="h-[1px] bg-white/5 mx-2 my-1" />
                                        <ProfileMenuItem icon={<LogOut className="w-4 h-4" />} label="Disconnect" danger onClick={onLogout} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </aside>

                {/* MAIN PLAYER VIEW */}
                <main className="flex-1 flex flex-col relative bg-black overflow-hidden z-20">
                    {/* TOP BAR */}
                    <div className={`h-20 flex items-center px-8 justify-between bg-gradient-to-b from-black via-black/40 to-transparent z-40 absolute top-0 inset-x-0 transition-all duration-700 ${isUiVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'}`}>
                        <div className="flex items-center gap-4 flex-1 max-w-2xl">
                            <div className={`flex-1 relative transition-all duration-500 ${!roomId ? 'opacity-40 grayscale blur-[1px] pointer-events-none' : 'opacity-100'}`}>
                                <input
                                    disabled={!roomId}
                                    type="text"
                                    placeholder={roomId ? "Enter your URL..." : "Connect to a node to transmit..."}
                                    className="w-full bg-black/40 border border-white/10 rounded-[20px] pl-6 pr-14 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-white placeholder:text-slate-600 select-text"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                                />
                                <button
                                    disabled={!roomId}
                                    onClick={handleUrlSubmit}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-white text-black rounded-[15px] hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Zap className="w-4 h-4 text-yellow-500" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 ml-8">
                            {roomId && <div className="px-4 py-2 bg-white/[0.05] border border-white/10 rounded-full text-[10px] font-mono text-white/60 tracking-widest uppercase">Grid: {roomId}</div>}
                            {settings.showDiagnostics && videoUrl && <MiniHUD peerCount={members.length} />}
                            <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-3 rounded-full border transition-all ${isChatOpen ? 'bg-white text-black border-white' : 'bg-white/[0.03] border-white/10 text-slate-400'}`}><MessageSquare className="w-4.5 h-4.5" /></button>
                        </div>
                    </div>

                    {/* PLAYER ENGINE (DIRECT IFRAME) */}
                    <div className="w-full h-full relative z-0">
                        {videoUrl ? (
                            <div className="w-full h-full relative">
                                <iframe
                                    key={videoUrl}
                                    src={videoUrl}
                                    className="w-full h-full border-none"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title="Embedded Video"
                                />
                                {!(isHost || authorizedNodes.includes(userName)) && (
                                    <div className="absolute inset-0 z-50 bg-transparent cursor-not-allowed pointer-events-auto" />
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center px-12">
                                {!roomId ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: isUiVisible ? 1 : 0, y: isUiVisible ? 0 : 20 }}
                                        className={`space-y-8 transition-all duration-700 ${!isUiVisible && 'pointer-events-none'}`}
                                    >
                                        <div className="space-y-3">
                                            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Initialize Command</h2>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] leading-relaxed">
                                                You are currently in standing mode. To trigger a transmission, you must first establish a network node.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                disabled={!!roomId}
                                                onClick={handleCreateRoom}
                                                className={`flex flex-col items-center gap-4 p-6 rounded-[32px] transition-all shadow-2xl ${!!roomId ? 'bg-white/10 text-white/20 cursor-not-allowed grayscale' : 'bg-white text-black hover:scale-[1.02] active:scale-95'}`}
                                            >
                                                <Plus className="w-6 h-6" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Host Lobby</span>
                                            </button>
                                            <button
                                                disabled={!!roomId}
                                                onClick={() => setIsJoining(true)}
                                                className={`flex flex-col items-center gap-4 p-6 rounded-[32px] border transition-all ${!!roomId ? 'bg-white/5 border-white/5 text-white/10 cursor-not-allowed grayscale' : 'bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.06] hover:scale-[1.02] active:scale-95'}`}
                                            >
                                                <Zap className="w-6 h-6 text-slate-600" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Join Node</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: isUiVisible ? 1 : 0 }}
                                        className={`flex flex-col items-center space-y-4 transition-all duration-700 ${!isUiVisible && 'pointer-events-none'}`}
                                    >
                                        <div className="w-20 h-[1px] bg-white/10" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 italic">Awaiting Transmission Link</span>
                                        <div className="w-20 h-[1px] bg-white/10" />
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </div>

                    {!isChatOpen && (
                        <button onClick={() => setIsChatOpen(true)} className={`absolute right-6 top-1/2 -translate-y-1/2 w-10 h-24 bg-[#0a0a0c] border border-white/10 rounded-full flex flex-col items-center justify-center gap-2 hover:border-white/30 transition-all z-40 active:scale-95 ${!isUiVisible ? 'translate-x-[200%] opacity-0' : 'translate-x-0 opacity-100'}`}>
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                            <div className="w-[1px] h-6 bg-white/10" />
                            <MessageSquare className="w-4 h-4 text-slate-600" />
                        </button>
                    )}
                </main>

                {/* CHAT PANEL */}
                <AnimatePresence>
                    {isChatOpen && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0, x: 20 }}
                            animate={{
                                width: isUiVisible ? 320 : 0,
                                opacity: isUiVisible ? 1 : 0,
                                x: isUiVisible ? 0 : 20
                            }}
                            exit={{ width: 0, opacity: 0, x: 20 }}
                            className="bg-[#0a0a0c] border-l border-white/5 flex flex-col z-50 overflow-hidden shrink-0 transition-all duration-700"
                        >
                            <div className="h-20 border-b border-white/5 flex items-center px-8 justify-between shrink-0">
                                <div className="flex flex-col"><h2 className="text-[11px] font-black text-white uppercase italic tracking-widest">Signal_Grid</h2><span className="text-[8px] font-bold text-slate-700 uppercase mt-0.5">Secure_Comms</span></div>
                                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="flex-1 p-8 overflow-y-auto space-y-6 custom-scrollbar">
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex flex-col ${m.user === 'Aymen' ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[8px] font-black mb-1.5 opacity-20 uppercase tracking-widest italic">{m.user}</span>
                                        <div className={`px-5 py-3 rounded-2xl text-[11px] leading-[1.6] max-w-full break-words ${m.user === 'Aymen' ? 'bg-white text-black' : 'bg-white/[0.05] text-slate-400 border border-white/5'}`}>{m.text}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 border-t border-white/5">
                                <div className="relative">
                                    <input type="text" placeholder="Send comms..." className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-[11px] focus:outline-none focus:border-white/20 transition-all text-white select-text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} />
                                    <button onClick={handleSendChat} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-xl active:scale-95"><Send className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {showSettingsPanel && (
                    <div className="fixed inset-0 z-[200]">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsPanel(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="absolute right-0 top-0 bottom-0 w-[400px] bg-[#0a0a0c] border-l border-white/10 p-12 flex flex-col z-[210] shadow-2xl">
                            <div className="flex items-center justify-between mb-12">
                                <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">Settings</h3>
                                <button onClick={() => setShowSettingsPanel(false)} className="p-3 hover:bg-white/5 rounded-full text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <div className="space-y-10 flex-1 overflow-y-auto custom-scrollbar pr-4">
                                <SettingsSection title="VISUAL_HUD">
                                    <SettingsToggle label="Diagnostic HUD" active={settings.showDiagnostics} onClick={() => toggleSetting('showDiagnostics')} />
                                    <SettingsToggle label="Auto-Hide UI" active={settings.autoHideUi} onClick={() => toggleSetting('autoHideUi')} />
                                </SettingsSection>

                                <SettingsSection title="SECURITY">
                                    <SettingsToggle label="Stealth Mode" active={settings.stealthMode} onClick={() => toggleSetting('stealthMode')} />
                                </SettingsSection>

                                <SettingsSection title="HARDWARE">
                                    <SettingsToggle label="GPU Acceleration" active={settings.gpuAcceleration} onClick={() => toggleSetting('gpuAcceleration')} />
                                </SettingsSection>
                            </div>
                        </motion.aside>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showInviteModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInviteModal(false)} className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="max-w-md w-full relative p-12 bg-[#0a0a0c] border border-white/10 rounded-[40px] shadow-2xl text-center">
                            <button onClick={() => setShowInviteModal(false)} className="absolute top-8 right-8 p-2 text-slate-700 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                            <h2 className="text-3xl font-black mb-1.5 text-white uppercase italic tracking-tighter">Node_ID</h2>
                            {roomId ? (
                                <div className="space-y-12 flex flex-col items-center">
                                    <div className="p-8 bg-white rounded-[40px] shadow-2xl"><QRCodeCanvas value={roomId} size={200} /></div>
                                    <div className="w-full">
                                        <div className="text-6xl font-black text-white tracking-[0.4em] font-mono select-text mb-10">{roomId}</div>
                                        <button onClick={() => setShowInviteModal(false)} className="w-full py-5 bg-white text-black rounded-[24px] font-black uppercase tracking-widest text-[10px]">Close</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <input autoFocus id="join-input" type="text" placeholder="ACCESS_CODE" className="w-full bg-white/[0.05] border border-white/10 rounded-[24px] p-6 text-center font-mono text-3xl text-white uppercase outline-none focus:border-white/30 select-text" />
                                    <button onClick={() => { const val = (document.getElementById('join-input') as HTMLInputElement).value; if (val) { setJoinCodeInput(val); handleJoinRoom(); setShowInviteModal(false) } }} className="w-full py-6 bg-white text-black rounded-[30px] font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 active:scale-95 transition-all shadow-2xl">Connect Relay</button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* CUSTOM SESSION ERROR MODAL */}
            <AnimatePresence>
                {sessionError && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            className="max-w-md w-full relative p-12 bg-[#0a0a0c] border border-white/10 rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.8)] text-center overflow-hidden"
                        >
                            {/* Diagnostic Glow */}
                            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

                            <div className="space-y-8 relative z-10">
                                <div className="flex flex-col items-center gap-6">
                                    <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center relative">
                                        <div className="absolute inset-0 rounded-full border border-red-500/10 animate-ping" />
                                        <Ban className="w-10 h-10 text-red-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter leading-none">
                                            {sessionError.type === 'TERMINATED' ? 'Relay Severed' : 'Coordinates Purged'}
                                        </h3>
                                    </div>
                                </div>

                                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed px-4">
                                    {sessionError.message}
                                </p>

                                <button
                                    onClick={handleCloseSessionError}
                                    className="w-full py-6 rounded-[24px] bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 active:scale-95 transition-all shadow-2xl"
                                >
                                    Return to Standby
                                </button>
                            </div>

                            {/* CRT Line Effect */}
                            <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] z-0 bg-[length:100%_4px]" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

const NavButton = ({ icon, label, active = false, count, onClick, collapsed = false }: { icon: React.ReactNode, label: string, active?: boolean, count?: number, onClick?: () => void, collapsed?: boolean }) => (
    <button onClick={onClick} className={`flex items-center transition-all duration-300 group rounded-2xl ${active ? 'bg-white/[0.05] text-white border border-white/10 shadow-md' : 'text-slate-600 hover:text-slate-300 hover:bg-white/[0.02]'} ${collapsed ? 'w-12 h-12 justify-center mx-auto' : 'w-full gap-4 px-4 py-3.5'}`}>
        <div className={`transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-slate-700 group-hover:text-white'}`}>{icon}</div>
        {!collapsed && <span className="flex-1 text-left text-[11px] font-black uppercase tracking-widest truncate">{label}</span>}
        {!collapsed && count !== undefined && count > 0 && <span className="text-[10px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded-lg text-slate-500 group-hover:text-white transition-colors">{count}</span>}
    </button>
)

const ProfileMenuItem = ({ icon, label, danger = false, onClick }: { icon: React.ReactNode, label: string, danger?: boolean, onClick?: () => void }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${danger ? 'text-red-500 hover:bg-red-500/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
        <div className="flex items-center gap-3">{icon}<span className="text-[11px] font-black uppercase tracking-widest">{label}</span></div>
        <ChevronRight className="w-3 h-3 opacity-20" />
    </button>
)

const SettingsSection = ({ title, children }: { title: string, children: React.ReactNode }) => (<div className="space-y-6"><h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.4em] italic leading-loose border-b border-white/5 pb-2">{title}</h4><div className="space-y-4">{children}</div></div>)
const SettingsToggle = ({ label, active, onClick }: { label: string, active: boolean, onClick?: () => void }) => (<div onClick={onClick} className="flex items-center justify-between px-6 py-5 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-white/20 transition-all cursor-pointer active:scale-[0.98]"><span className="text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">{label}</span><div className={`w-10 h-5 rounded-full relative transition-all ${active ? 'bg-white' : 'bg-slate-900'}`}><div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${active ? 'right-1 bg-black shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'left-1 bg-slate-700'}`} /></div></div>)

const MiniHUD = ({ peerCount }: { peerCount: number }) => {
    const [fps, setFps] = useState(0)
    const frameCount = useRef(0)
    const lastTime = useRef(performance.now())

    useEffect(() => {
        let rafId: number
        const updateFPS = () => {
            frameCount.current++
            const now = performance.now()
            if (now - lastTime.current >= 1000) {
                setFps(frameCount.current)
                frameCount.current = 0
                lastTime.current = now
            }
            rafId = requestAnimationFrame(updateFPS)
        }
        rafId = requestAnimationFrame(updateFPS)
        return () => cancelAnimationFrame(rafId)
    }, [])

    const Metric = ({ label, value }: { label: string, value: string | number }) => (
        <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/5 rounded-full">
            <span className="text-[7px] font-black text-slate-700 uppercase tracking-widest">{label}</span>
            <span className="text-[9px] font-mono font-bold text-white/60">{value}</span>
        </div>
    )

    return (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] mr-1" />
            <Metric label="FPS" value={fps} />
            <Metric label="PEER" value={peerCount} />
            <Metric label="RTT" value={`${Math.floor(Math.random() * 15) + 5}ms`} />
        </div>
    )
}

export default Dashboard
