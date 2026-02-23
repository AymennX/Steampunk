const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Node connected:', socket.id);

    socket.on('join-room', ({ roomId, userName }) => {
        socket.join(roomId);

        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(userName);

        // Notify everyone in the room about the updated member list
        io.to(roomId).emit('room-members', Array.from(rooms.get(roomId)));
        console.log(`[${roomId}] ${userName} joined.`);
    });

    socket.on('signal', (data) => {
        // Broadcast signaling data to everyone else in the room
        socket.to(data.roomId).emit('signal', {
            from: socket.id,
            signal: data.signal
        });
    });

    socket.on('disconnecting', () => {
        for (const roomId of socket.rooms) {
            if (rooms.has(roomId)) {
                // In a real app, we'd need to map socket.id to userName 
                // to remove them specifically. For now, this is a simple relay.
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Node disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
    console.log(`Signaling Relay active on port ${PORT}`);
});
