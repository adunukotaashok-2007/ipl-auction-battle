// server/index.ts

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import {
  createRoom,
  joinRoom,
  rejoinRoom,
  handleDisconnect,
  toggleReady,
  getRoom,
  getRoomBySocket,
  getSocketMapping,
  getRoomPublicData,
  getTeamSkippedPlayers,
  saveTeamLineup,
  calculateRankings,
} from './roomManager';

import {
  startAuction,
  placeBid,
  skipPlayer,
  pauseAuction,
  resumeAuction,
  hostNextPlayer,
  endAuction,
  restartAuction,
  moveToNextPlayer,
} from './auctionManager';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const port = parseInt(process.env.PORT || '3001', 10);

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(
  cors({
    origin: [
      clientUrl,
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST'],
  })
);

app.use(express.json());

// --------------------------------------------------
// Serve static client files in production
// --------------------------------------------------

if (process.env.NODE_ENV === 'production') {
  app.use(
    express.static(path.join(__dirname, '../../client/dist'))
  );
}

// --------------------------------------------------
// Socket.IO
// --------------------------------------------------

const io = new Server(httpServer, {
  cors: {
    origin: [
      clientUrl,
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST'],
  },

  pingTimeout: 60000,
  pingInterval: 25000,
});

// --------------------------------------------------
// Socket connection
// --------------------------------------------------

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ==================================================
  // CREATE ROOM
  // ==================================================

  socket.on('create-room', (data) => {
    try {
      const {
        playerName,
        teamName,
        teamShortName,
        teamColor,
        teamLogo,
      } = data;

      if (!playerName || !teamName) {
        socket.emit('error', {
          message: 'Player name and team name are required',
        });

        return;
      }

      const result = createRoom(
        socket.id,
        playerName,
        teamName,
        teamShortName ||
          teamName.substring(0, 3).toUpperCase(),
        teamColor || '#FFD700',
        teamLogo || '🏏'
      );

      if (!result) {
        socket.emit('error', {
          message: 'Failed to create room',
        });

        return;
      }

      socket.join(result.roomCode);

      socket.emit('room-created', {
        roomCode: result.roomCode,
        teamId: result.teamId,
      });

      const room = getRoom(result.roomCode);

      if (room) {
        io.to(result.roomCode).emit(
          'room-updated',
          getRoomPublicData(room)
        );
      }

      console.log(
        `[Room] Created: ${result.roomCode} by ${teamName}`
      );
    } catch (err) {
      console.error('[Error] create-room:', err);

      socket.emit('error', {
        message: 'Server error creating room',
      });
    }
  });

  // ==================================================
  // JOIN ROOM
  // ==================================================

  socket.on('join-room', (data) => {
    try {
      const {
        roomCode,
        playerName,
        teamName,
        teamShortName,
        teamColor,
        teamLogo,
      } = data;

      if (!roomCode || !playerName || !teamName) {
        socket.emit('error', {
          message:
            'Room code, player name, and team name are required',
        });

        return;
      }

      const normalizedRoomCode = roomCode.toUpperCase();

      const result = joinRoom(
        socket.id,
        normalizedRoomCode,
        playerName,
        teamName,
        teamShortName ||
          teamName.substring(0, 3).toUpperCase(),
        teamColor || '#4CAF50',
        teamLogo || '🏏'
      );

      if (result.error) {
        socket.emit('error', {
          message: result.error,
        });

        return;
      }

      socket.join(normalizedRoomCode);

      socket.emit('room-joined', {
        teamId: result.teamId,
      });

      const room = getRoom(normalizedRoomCode);

      if (room) {
        io.to(normalizedRoomCode).emit(
          'room-updated',
          getRoomPublicData(room)
        );
      }

      console.log(
        `[Room] ${teamName} joined ${normalizedRoomCode}`
      );
    } catch (err) {
      console.error('[Error] join-room:', err);

      socket.emit('error', {
        message: 'Server error joining room',
      });
    }
  });

  // ==================================================
  // REJOIN ROOM
  // ==================================================

  socket.on('rejoin-room', (data) => {
    try {
      const { roomCode, teamId } = data;

      const result = rejoinRoom(
        socket.id,
        roomCode,
        teamId
      );

      if (!result.success) {
        socket.emit('error', {
          message:
            result.error || 'Failed to rejoin',
        });

        return;
      }

      socket.join(roomCode);

      socket.emit('reconnected', {
        teamId,
      });

      const room = getRoom(roomCode);

      if (room) {
        io.to(roomCode).emit(
          'room-updated',
          getRoomPublicData(room)
        );

        // Send skip list
        const skipped = getTeamSkippedPlayers(
          roomCode,
          teamId
        );

        socket.emit('your-skip-list', {
          skippedPlayers: skipped,
        });
      }

      console.log(
        `[Room] Reconnected: ${teamId} to ${roomCode}`
      );
    } catch (err) {
      console.error('[Error] rejoin-room:', err);

      socket.emit('error', {
        message: 'Server error rejoining',
      });
    }
  });

  // ==================================================
  // TOGGLE READY
  // ==================================================

  socket.on('toggle-ready', () => {
    try {
      const result = toggleReady(socket.id);

      if (result) {
        const room = getRoom(result.roomCode);

        if (room) {
          io.to(result.roomCode).emit(
            'room-updated',
            getRoomPublicData(room)
          );
        }
      }
    } catch (err) {
      console.error('[Error] toggle-ready:', err);
    }
  });

  // ==================================================
  // START AUCTION
  // ==================================================

  socket.on('start-auction', () => {
    try {
      const data = getRoomBySocket(socket.id);

      if (!data) {
        return;
      }

      const { room, teamId } = data;

      if (room.hostId !== teamId) {
        socket.emit('error', {
          message:
            'Only the host can start the auction',
        });

        return;
      }

      const started = startAuction(
        room.code,
        io
      );

      if (!started) {
        socket.emit('error', {
          message:
            'Cannot start auction. Need at least 2 connected players.',
        });
      }
    } catch (err) {
      console.error(
        '[Error] start-auction:',
        err
      );

      socket.emit('error', {
        message:
          'Server error starting auction',
      });
    }
  });

  // ==================================================
  // PLACE BID
  // ==================================================

  socket.on('place-bid', () => {
    try {
      const mapping = getSocketMapping(socket.id);

      if (!mapping) {
        return;
      }

      const result = placeBid(
        mapping.roomCode,
        mapping.teamId,
        io
      );

      if (!result.success) {
        socket.emit('error', {
          message:
            result.error || 'Bid failed',
        });
      }
    } catch (err) {
      console.error('[Error] place-bid:', err);

      socket.emit('error', {
        message:
          'Server error placing bid',
      });
    }
  });

  // ==================================================
  // SKIP PLAYER
  // ==================================================

  socket.on('skip-player', () => {
    try {
      const mapping = getSocketMapping(socket.id);

      if (!mapping) {
        return;
      }

      const result = skipPlayer(
        mapping.roomCode,
        mapping.teamId,
        io
      );

      if (!result.success) {
        socket.emit('error', {
          message:
            result.error || 'Skip failed',
        });
      }
    } catch (err) {
      console.error('[Error] skip-player:', err);

      socket.emit('error', {
        message:
          'Server error skipping player',
      });
    }
  });

  // ==================================================
  // PAUSE AUCTION
  // ==================================================

  socket.on('pause-auction', () => {
    try {
      const mapping = getSocketMapping(socket.id);

      if (!mapping) {
        return;
      }

      pauseAuction(
        mapping.roomCode,
        mapping.teamId,
        io
      );
    } catch (err) {
      console.error(
        '[Error] pause-auction:',
        err
      );
    }
  });

  // ==================================================
  // RESUME AUCTION
  // ==================================================

  socket.on('resume-auction', () => {
    try {
      const mapping = getSocketMapping(socket.id);

      if (!mapping) {
        return;
      }

      resumeAuction(
        mapping.roomCode,
        mapping.teamId,
        io
      );
    } catch (err) {
      console.error(
        '[Error] resume-auction:',
        err
      );
    }
  });

  // ==================================================
  // NEXT PLAYER
  // ==================================================

  socket.on('next-player', () => {
    try {
      const mapping = getSocketMapping(socket.id);

      if (!mapping) {
        return;
      }

      hostNextPlayer(
        mapping.roomCode,
        mapping.teamId,
        io
      );
    } catch (err) {
      console.error(
        '[Error] next-player:',
        err
      );
    }
  });

  // ==================================================
  // END AUCTION
  // ==================================================

  socket.on('end-auction', () => {
    try {
      const mapping = getSocketMapping(socket.id);

      if (!mapping) {
        return;
      }

      endAuction(
        mapping.roomCode,
        mapping.teamId,
        io
      );
    } catch (err) {
      console.error(
        '[Error] end-auction:',
        err
      );
    }
  });

  // ==================================================
  // RESTART AUCTION
  // ==================================================

  socket.on('restart-auction', () => {
    try {
      const mapping = getSocketMapping(socket.id);

      if (!mapping) {
        return;
      }

      restartAuction(
        mapping.roomCode,
        mapping.teamId,
        io
      );
    } catch (err) {
      console.error(
        '[Error] restart-auction:',
        err
      );
    }
  });

  // ==================================================
  // SUBMIT PLAYING XI + IMPACT PLAYER
  // ==================================================

  socket.on('submit-lineup', (data) => {
    try {
      const {
        playingXI,
        impactPlayerId,
      } = data;

      const mapping = getSocketMapping(socket.id);

      if (!mapping) {
        socket.emit('error', {
          message:
            'Room or team not found',
        });

        return;
      }

      // Validate lineup
      if (!Array.isArray(playingXI)) {
        socket.emit('error', {
          message:
            'Invalid lineup submission',
        });

        return;
      }

      const room = getRoom(
        mapping.roomCode
      );

      if (!room) {
        socket.emit('error', {
          message:
            'Room not found',
        });

        return;
      }

      // IMPORTANT:
      // room.teams is a Map<string, TeamInfo>.
      // Convert Map values into an array before using find().
      const team = Array.from(
        room.teams.values()
      ).find(
        (t) => t.id === mapping.teamId
      );

      if (!team) {
        socket.emit('error', {
          message:
            'Team not found',
        });

        return;
      }

      // Save this team's lineup
      saveTeamLineup(
        mapping.roomCode,
        mapping.teamId,
        playingXI,
        impactPlayerId
      );

      // Notify everyone in the room
      io.to(mapping.roomCode).emit(
        'room-updated',
        getRoomPublicData(room)
      );

      // IMPORTANT:
      // room.teams is a Map, so convert it
      // to an array before using filter().
      const activeTeams = Array.from(
        room.teams.values()
      ).filter(
        (t) =>
          t.isConnected &&
          t.squad.length > 0
      );

      const allSubmitted =
        activeTeams.every(
          (t) => t.lineupSubmitted
        );

      // Calculate rankings when everyone
      // has submitted their lineup
      if (
        allSubmitted &&
        activeTeams.length > 0
      ) {
        const rankings =
          calculateRankings(
            mapping.roomCode
          );

        room.rankings = rankings;
        room.gameState = 'FINISHED';

        io.to(mapping.roomCode).emit(
          'room-updated',
          getRoomPublicData(room)
        );

        console.log(
          `[Rankings] Calculated for room ${mapping.roomCode}`
        );
      }
    } catch (err) {
      console.error(
        '[Error] submit-lineup:',
        err
      );

      socket.emit('error', {
        message:
          'Server error submitting lineup',
      });
    }
  });

  // ==================================================
  // DISCONNECT
  // ==================================================

  socket.on('disconnect', (reason) => {
    try {
      console.log(
        `[Socket] Disconnected: ${socket.id} (${reason})`
      );

      const result =
        handleDisconnect(socket.id);

      if (result) {
        const room = getRoom(
          result.roomCode
        );

        if (room) {
          io.to(result.roomCode).emit(
            'room-updated',
            getRoomPublicData(room)
          );

          if (
            result.newHostId &&
            result.newHostName
          ) {
            io.to(
              result.roomCode
            ).emit(
              'host-changed',
              {
                newHostId:
                  result.newHostId,

                newHostName:
                  result.newHostName,
              }
            );
          }
        }
      }
    } catch (err) {
      console.error(
        '[Error] disconnect:',
        err
      );
    }
  });
});

// ==================================================
// HEALTH CHECK
// ==================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
  });
});

// ==================================================
// CATCH-ALL FOR PRODUCTION SPA
// ==================================================

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        '../../client/dist/index.html'
      )
    );
  });
}

// ==================================================
// START SERVER
// ==================================================

httpServer.listen(
  port,
  '0.0.0.0',
  () => {
    console.log(
      `🏏 IPL Auction Battle Server running on port ${port}`
    );

    console.log(
      `   Environment: ${
        process.env.NODE_ENV ||
        'development'
      }`
    );

    console.log(
      `   Client URL: ${clientUrl}`
    );
  }
);
