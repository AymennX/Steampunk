import Peer from 'simple-peer'
import { io, Socket } from 'socket.io-client'

export enum SyncEvent {
    PLAY = 'PLAY',
    PAUSE = 'PAUSE',
    SEEK = 'SEEK',
    BUFFERING = 'BUFFERING',
    CHAT = 'CHAT',
    PERMISSION_UPDATE = 'PERMISSION_UPDATE',
    SESSION_TERMINATED = 'SESSION_TERMINATED'
}

export interface ChatMessage {
    user: string
    text: string
    timestamp: number
}

export interface SyncPacket {
    event: SyncEvent
    timestamp: number
    currentTime: number
    payload?: any
}

export class ConnectionManager {
    private peer: Peer.Instance | null = null
    private socket: Socket
    private isHost: boolean = false
    private roomId: string = ''
    private onSyncCallback: ((packet: SyncPacket) => void) | null = null
    private onChatCallback: ((msg: ChatMessage) => void) | null = null
    private onMembersCallback: ((members: string[]) => void) | null = null
    private onRoomErrorCallback: ((error: string) => void) | null = null

    constructor(signalingUrl: string = 'http://localhost:9000') {
        this.socket = io(signalingUrl)
        this.setupSignaling()
    }

    public onSync(callback: (packet: SyncPacket) => void) {
        this.onSyncCallback = callback
    }

    public onChat(callback: (msg: ChatMessage) => void) {
        this.onChatCallback = callback
    }

    public onMembersUpdate(callback: (members: string[]) => void) {
        this.onMembersCallback = callback
    }

    public onRoomError(callback: (error: string) => void) {
        this.onRoomErrorCallback = callback
    }

    private setupSignaling() {
        this.socket.on('signal', (data) => {
            console.log('Received signal from relay:', data.from)
            this.peer?.signal(data.signal)
        })

        this.socket.on('room-members', (members: string[]) => {
            console.log('Room members updated:', members)
            this.onMembersCallback?.(members)
        })

        this.socket.on('room-error', (error: string) => {
            console.error('[SIGNALLING] Room error:', error)
            this.onRoomErrorCallback?.(error)
        })

        this.socket.on('session-terminated', () => {
            console.log('[CONN] Session terminated by host.')
            this.onSyncCallback?.({
                event: SyncEvent.SESSION_TERMINATED,
                timestamp: Date.now(),
                currentTime: 0
            })
        })
    }

    public createRoom(roomId: string, userName: string) {
        this.isHost = true
        this.roomId = roomId
        this.socket.emit('join-room', { roomId, userName })

        this.peer = new Peer({ initiator: true, trickle: false })
        this.bindPeerEvents()
    }

    public joinRoom(roomId: string, userName: string) {
        this.isHost = false
        this.roomId = roomId
        this.socket.emit('join-room', { roomId, userName })

        this.peer = new Peer({ initiator: false, trickle: false })
        this.bindPeerEvents()
    }

    private bindPeerEvents() {
        this.peer?.on('signal', (data) => {
            this.socket.emit('signal', {
                roomId: this.roomId,
                signal: data
            })
        })

        this.peer?.on('connect', () => {
            console.log('P2P Connected!')
        })

        this.peer?.on('data', (data) => {
            const packet = JSON.parse(data.toString()) as SyncPacket
            this.handleSyncPacket(packet)
        })
    }

    private handleSyncPacket(packet: SyncPacket) {
        if (packet.event === (SyncEvent.CHAT as any)) {
            this.onChatCallback?.(packet as any as ChatMessage)
            return
        }
        console.log('Received sync packet:', packet)
        this.onSyncCallback?.(packet)
    }

    public sendChat(msg: ChatMessage) {
        if (this.peer?.connected) {
            this.peer.send(JSON.stringify({ ...msg, event: SyncEvent.CHAT }))
        }
    }

    public broadcast(packet: SyncPacket) {
        if (this.peer?.connected) {
            this.peer.send(JSON.stringify(packet))
        }
    }

    public destroy() {
        console.log('[CONN] Destroying connection instance...')
        this.peer?.destroy()
        this.socket.disconnect()
        this.onSyncCallback = null
        this.onChatCallback = null
    }
}
