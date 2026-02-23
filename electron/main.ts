import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { Server } from 'socket.io'
import { createServer } from 'http'

let io: Server
let mainWindow: BrowserWindow | null = null // Declare mainWindow globally

const createWindow = () => {
    mainWindow = new BrowserWindow({ // Assign to the global mainWindow
        width: 1200,
        height: 800,
        frame: false,
        title: "Steampunk",
        titleBarStyle: 'hidden',
        icon: join(__dirname, '../src/assets/logo.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        }
    })

    // In development, load from Vite dev server
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        // In production, load the built index.html
        mainWindow.loadFile(join(__dirname, '../dist/index.html'))
    }
}

app.whenReady().then(() => {
    const httpServer = createServer()
    io = new Server(httpServer, {
        cors: { origin: "*" }
    })

    const users = new Map<string, { name: string, roomId: string, isHost: boolean }>()
    const roomsHost = new Map<string, string>() // roomId -> hostSocketId
    const deadRooms = new Set<string>()
    const MAX_DEAD_ROOMS = 10000 // Memory safety cap

    io.on('connection', (socket) => {
        console.log('User connected to signaling server:', socket.id)

        socket.on('join-room', ({ roomId, userName }: { roomId: string, userName: string }) => {
            if (deadRooms.has(roomId)) {
                console.log(`[RELAY] Rejected join for blacklisted room ${roomId}`)
                socket.emit('room-error', 'SESSION_EXPIRED')
                return
            }
            socket.join(roomId)

            // If room has no host, this user becomes the host
            let isHost = false
            if (!roomsHost.has(roomId)) {
                roomsHost.set(roomId, socket.id)
                isHost = true
                console.log(`[RELAY] Room ${roomId} created by host ${userName} (${socket.id})`)
            }

            users.set(socket.id, { name: userName, roomId, isHost })
            console.log(`User ${userName} (${socket.id}) joined room ${roomId} as ${isHost ? 'HOST' : 'PEER'}`)

            const roomMembers = Array.from(users.values())
                .filter(u => u.roomId === roomId)
                .map(u => u.name)

            io.to(roomId).emit('room-members', roomMembers)
        })

        socket.on('signal', (data) => {
            socket.to(data.roomId).emit('signal', {
                from: socket.id,
                signal: data.signal
            })
        })

        socket.on('disconnect', () => {
            const user = users.get(socket.id)
            if (user) {
                const { roomId, name, isHost } = user
                users.delete(socket.id)
                console.log(`User ${name} disconnected from room ${roomId}`)

                if (isHost) {
                    console.log(`[RELAY] Host ${name} left. Terminating room ${roomId} and blacklisting...`)
                    io.to(roomId).emit('session-terminated')
                    roomsHost.delete(roomId)

                    // CIRCULAR BLACKLIST: Prevent memory bloat
                    deadRooms.add(roomId)
                    if (deadRooms.size > MAX_DEAD_ROOMS) {
                        const oldestCode = deadRooms.values().next().value
                        if (oldestCode) deadRooms.delete(oldestCode)
                    }

                    // Forcefully remove everyone else from this room in our tracking
                    for (const [sid, u] of users.entries()) {
                        if (u.roomId === roomId) {
                            users.delete(sid)
                        }
                    }
                } else {
                    const roomMembers = Array.from(users.values())
                        .filter(u => u.roomId === roomId)
                        .map(u => u.name)

                    io.to(roomId).emit('room-members', roomMembers)
                }
            }
        })
    })

    httpServer.listen(9000, () => {
        console.log('Signaling server listening on port 9000')
    })

    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    // Window controls
    ipcMain.on('window-minimize', () => {
        mainWindow?.minimize() // Use optional chaining for safety
    })

    ipcMain.on('window-maximize', () => {
        if (mainWindow?.isMaximized()) { // Use optional chaining
            mainWindow?.unmaximize()
        } else {
            mainWindow?.maximize()
        }
    })

    ipcMain.on('window-close', () => {
        mainWindow?.close()
    })

    // External link handling
    ipcMain.on('open-external-url', (_, url: string) => {
        shell.openExternal(url)
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
