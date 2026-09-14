// client/src/socket.ts
import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);

  // Auto-rejoin if we have stored session data
  const storedRoom = localStorage.getItem('ipl_room_code');
  const storedTeam = localStorage.getItem('ipl_team_id');

  if (storedRoom && storedTeam) {
    socket.emit('rejoin-room', { roomCode: storedRoom, teamId: storedTeam });
  }
});

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected:', reason);
});

export default socket;
