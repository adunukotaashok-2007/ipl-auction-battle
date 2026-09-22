import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';

import {
  createRoom,
  getRoom,
  saveTeamLineup,
  getPublicRoomData,
} from './roomManager';

import {
  initializeMatch,
  calculateBallOutcome,
} from './matchEngine';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());

// =====================================================
// REACT CLIENT
// =====================================================

const clientBuildPath = path.join(
  process.cwd(),
  'client',
  'dist'
);

console.log('React build path:', clientBuildPath);

// Serve React static files
app.use(express.static(clientBuildPath));

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
  '/api/health',
  (_req: Request, res: Response) => {
    res.json({
      message: 'IPL Auction Battle Server',
      status: 'running',
    });
  }
);

// =====================================================
// SOCKET.IO
// =====================================================

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // ===================================================
  // CREATE ROOM
  // ===================================================

  socket.on('create-room', (payload = {}) => {
    try {
      const userName =
        payload.userName ||
        payload.playerName ||
        'Manager';

      const roomCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const teamId =
        'team_' +
        Math.random()
          .toString(36)
          .substring(2, 9);

      const hostTeam = {
        id: teamId,
        teamName:
          payload.teamName ||
          'Royal Challengers Bengaluru',

        teamShortName:
          payload.teamShortName ||
          'RCB',

        teamColor:
          payload.teamColor ||
          '#EC1C24',

        teamLogo:
          payload.teamLogo ||
          '🔴',

        playerName: userName,

        socketId: socket.id,

        isHost: true,

        isReady: true,

        purse: 1000000000,

        squad: [],
      };

      const room = createRoom(
        roomCode,
        hostTeam
      );

      socket.join(roomCode);

      socket.emit('room-created', {
        roomCode,
        code: roomCode,
        teamId,
      });

      io.to(roomCode).emit(
        'room-updated',
        getPublicRoomData(room)
      );

      console.log(
        `Room created: ${roomCode}`
      );
    } catch (error: any) {
      console.error(
        'Create room error:',
        error
      );

      socket.emit('error', {
        message:
          error?.message ||
          'Failed to create room',
      });
    }
  });

  // ===================================================
  // JOIN ROOM
  // ===================================================

  socket.on('join-room', (payload = {}) => {
    try {
      const roomCode = (
        payload.roomCode ||
        payload.code ||
        ''
      ).toUpperCase();

      const userName =
        payload.userName ||
        payload.playerName ||
        'Manager';

      if (!roomCode) {
        socket.emit('error', {
          message: 'Room code is required',
        });
        return;
      }

      const room = getRoom(roomCode);

      if (!room) {
        socket.emit('error', {
          message: 'Room not found',
        });
        return;
      }

      let team = room.teams.find(
        (t: any) =>
          t.id === payload.teamId
      );

      if (!team) {
        const teamId =
          'team_' +
          Math.random()
            .toString(36)
            .substring(2, 9);

        team = {
          id: teamId,

          teamName:
            payload.teamName ||
            'Chennai Super Kings',

          teamShortName:
            payload.teamShortName ||
            'CSK',

          teamColor:
            payload.teamColor ||
            '#FFFF00',

          teamLogo:
            payload.teamLogo ||
            '🦁',

          playerName: userName,

          socketId: socket.id,

          isHost: false,

          isReady: false,

          purse: 1000000000,

          squad: [],
        };

        room.teams.push(team);

        socket.emit('room-joined', {
          roomCode,
          code: roomCode,
          teamId,
        });
      } else {
        team.socketId = socket.id;

        socket.emit('reconnected', {
          teamId: team.id,
        });
      }

      socket.join(roomCode);

      io.to(roomCode).emit(
        'room-updated',
        getPublicRoomData(room)
      );
    } catch (error: any) {
      console.error(
        'Join room error:',
        error
      );

      socket.emit('error', {
        message:
          error?.message ||
          'Failed to join room',
      });
    }
  });

  // ===================================================
  // SUBMIT LINEUP
  // ===================================================

  socket.on(
    'submit-lineup',
    (payload = {}) => {
      try {
        const roomCode = (
          payload.roomCode ||
          payload.code ||
          ''
        ).toUpperCase();

        const teamId =
          payload.teamId;

        const playerIds =
          payload.playingXI ||
          payload.lineup ||
          payload.playerIds ||
          [];

        const room = getRoom(roomCode);

        if (!room) {
          socket.emit('error', {
            message: 'Room not found',
          });
          return;
        }

        const result =
          saveTeamLineup(
            room,
            teamId,
            playerIds,
            payload.impactPlayerId
          );

        if (!result.ok) {
          socket.emit('error', {
            message:
              result.message ||
              'Invalid lineup',
          });
          return;
        }

        if (
          room.gameState ===
            'FINISHED' ||
          room.gameState ===
            'AUCTION'
        ) {
          room.gameState =
            'LINEUP_SELECTION';
        }

        io.to(roomCode).emit(
          'room-updated',
          getPublicRoomData(room)
        );

        socket.emit(
          'notification',
          'Playing XI confirmed!'
        );
      } catch (error: any) {
        socket.emit('error', {
          message:
            error?.message ||
            'Lineup failed',
        });
      }
    }
  );

  // ===================================================
  // START MATCH
  // ===================================================

  socket.on(
    'start-match',
    (payload = {}) => {
      try {
        const roomCode = (
          payload.roomCode ||
          payload.code ||
          ''
        ).toUpperCase();

        const room = getRoom(roomCode);

        if (!room) {
          socket.emit('error', {
            message: 'Room not found',
          });
          return;
        }

        if (room.teams.length < 2) {
          socket.emit('error', {
            message:
              'At least 2 teams are required.',
          });
          return;
        }

        const validOvers =
          [2, 5, 10, 20].includes(
            Number(payload.overs)
          )
            ? Number(payload.overs)
            : 5;

        // ---------------------------------------------
        // Get two teams
        // ---------------------------------------------

        const team1 = room.teams[0];
        const team2 = room.teams[1];

        if (!team1 || !team2) {
          socket.emit('error', {
            message:
              'Two teams are required.',
          });
          return;
        }

        // ---------------------------------------------
        // Make sure lineups exist
        // ---------------------------------------------

        const getPlayerId = (item: any) =>
          item?.player?.id ||
          item?.id;

        const team1Squad =
          team1.squad || [];

        const team2Squad =
          team2.squad || [];

        const team1Ids =
          team1Squad
            .map(getPlayerId)
            .filter(Boolean);

        const team2Ids =
          team2Squad
            .map(getPlayerId)
            .filter(Boolean);

        const team1Lineup =
          team1.lineup?.length
            ? team1.lineup
            : team1Ids.slice(0, 11);

        const team2Lineup =
          team2.lineup?.length
            ? team2.lineup
            : team2Ids.slice(0, 11);

        if (
          team1Lineup.length < 2 ||
          team2Lineup.length < 2
        ) {
          socket.emit('error', {
            message:
              'Both teams need at least 2 players.',
          });
          return;
        }

        // ---------------------------------------------
        // Save auto-generated lineups
        // ---------------------------------------------

        team1.lineup = team1Lineup;
        team1.playingXI = team1Lineup;
        team1.lineupSubmitted = true;

        team2.lineup = team2Lineup;
        team2.playingXI = team2Lineup;
        team2.lineupSubmitted = true;

        // ---------------------------------------------
        // Create match
        //
        // This matches the initializeMatch()
        // signature from your matchEngine.ts
        // ---------------------------------------------

        const match =
          initializeMatch(
            roomCode,

            team1.id,
            {
              playingXI: team1Lineup,
              impactPlayerId:
                team1.impactPlayerId,
            },
            team1Squad,

            team2.id,
            {
              playingXI: team2Lineup,
              impactPlayerId:
                team2.impactPlayerId,
            },
            team2Squad,

            validOvers
          );

        room.match = match;

        room.gameState =
          'MATCH_PLAYING';

        io.to(roomCode).emit(
          'room-updated',
          getPublicRoomData(room)
        );

        io.to(roomCode).emit(
          'match-updated',
          match
        );

        io.to(roomCode).emit(
          'notification',
          `Match launched — ${validOvers} Overs!`
        );

        console.log(
          `Match started: ${roomCode} (${validOvers} overs)`
        );
      } catch (error: any) {
        console.error(
          'Start match error:',
          error
        );

        socket.emit('error', {
          message:
            error?.message ||
            'Failed to start match',
        });
      }
    }
  );

  // ===================================================
  // DELIVERY
  // ===================================================

  socket.on(
    'submit-delivery',
    (payload = {}) => {
      try {
        const roomCode = (
          payload.roomCode ||
          payload.code ||
          ''
        ).toUpperCase();

        const room =
          getRoom(roomCode);

        if (
          !room ||
          !room.match
        ) {
          return;
        }

        room.match.phase =
          'BALL_IN_FLIGHT';

        room.match.currentDelivery =
          payload;

        io.to(roomCode).emit(
          'match-updated',
          room.match
        );
      } catch (error) {
        console.error(
          'Delivery error:',
          error
        );
      }
    }
  );

  // ===================================================
  // SHOT
  // ===================================================

  socket.on(
    'submit-shot',
    (payload = {}) => {
      try {
        const roomCode = (
          payload.roomCode ||
          payload.code ||
          ''
        ).toUpperCase();

        const room =
          getRoom(roomCode);

        if (
          !room ||
          !room.match
        ) {
          return;
        }

        if (
          !room.match.currentDelivery
        ) {
          socket.emit('error', {
            message:
              'No delivery is active.',
          });
          return;
        }

        const outcome =
          calculateBallOutcome(
            room.match.currentDelivery,
            payload
          );

        room.match.lastOutcome =
          outcome;

        room.match.phase =
          'RESULT_SHOWCASE';

        io.to(roomCode).emit(
          'match-updated',
          room.match
        );

        setTimeout(() => {
          if (!room.match) {
            return;
          }

          room.match.phase =
            'AWAITING_DELIVERY';

          room.match.currentDelivery =
            undefined;

          io.to(roomCode).emit(
            'match-updated',
            room.match
          );
        }, 3000);
      } catch (error: any) {
        console.error(
          'Shot error:',
          error
        );

        socket.emit('error', {
          message:
            error?.message ||
            'Shot processing failed',
        });
      }
    }
  );

  // ===================================================
  // DISCONNECT
  // ===================================================

  socket.on(
    'disconnect',
    () => {
      console.log(
        'Client disconnected:',
        socket.id
      );
    }
  );
});

// =====================================================
// REACT SPA FALLBACK
// =====================================================

// IMPORTANT:
// This must be AFTER the API routes.

app.use(
  (req: Request, res: Response, next) => {
    if (
      req.method !== 'GET' ||
      req.path.startsWith('/api/')
    ) {
      next();
      return;
    }

    res.sendFile(
      path.join(
        clientBuildPath,
        'index.html'
      ),
      (error) => {
        if (error) {
          next(error);
        }
      }
    );
  }
);

// =====================================================
// START SERVER
// =====================================================

const PORT =
  Number(process.env.PORT) || 3001;

server.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `Client path: ${clientBuildPath}`
    );
  }
);
