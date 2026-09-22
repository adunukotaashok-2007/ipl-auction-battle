// server/index.ts

import express, {
  Request,
  Response,
  NextFunction,
} from 'express';

import http from 'http';

import { Server } from 'socket.io';

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
  saveTeamLineup,
  allTeamsLineupReady,
  calculateRankings,
} from './roomManager';

import {
  initializeMatch,
  calculateBallOutcome,
  applyBallResult,
} from './matchEngine';

import {
  startAuction,
  placeBid,
  skipPlayer,
  pauseAuction,
  resumeAuction,
  hostNextPlayer,
  endAuction,
  restartAuction,
} from './auctionManager';

import {
  LiveMatchState,
  Player,
  PurchasedPlayer,
  TeamLineup,
} from './types';


/* =========================================================
   APP
========================================================= */

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());


/* =========================================================
   REACT CLIENT
========================================================= */

const clientBuildPath = path.join(
  process.cwd(),
  'client',
  'dist'
);

app.use(express.static(clientBuildPath));


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  '/api/health',
  (_req: Request, res: Response) => {
    res.json({
      message: 'IPL Auction Battle Server',
      status: 'running',
    });
  }
);


/* =========================================================
   LIVE MATCH STORAGE
=========================================================

   IMPORTANT:

   Your Room type does NOT contain "match".

   Therefore matches are stored separately using
   the room code as the key.
========================================================= */

const liveMatches = new Map<
  string,
  LiveMatchState
>();


/* =========================================================
   PENDING DELIVERY STORAGE
========================================================= */

const pendingDeliveries = new Map<
  string,
  any
>();


/* =========================================================
   HELPERS
========================================================= */

function getRoomCode(payload: any): string {
  return String(
    payload?.roomCode ||
      payload?.code ||
      ''
  )
    .trim()
    .toUpperCase();
}


function getTeamPlayers(
  team: any
): PurchasedPlayer[] {
  return Array.isArray(team?.squad)
    ? team.squad
    : [];
}


function createDefaultLineup(
  team: any
): TeamLineup {
  const players =
    getTeamPlayers(team);

  const playingXI = players
    .map(
      (item: any) =>
        item?.player?.id ||
        item?.id
    )
    .filter(Boolean)
    .slice(0, 11);

  return {
    teamId: team.id,

    playingXI,

    impactPlayerId: null,

    submitted: true,
  };
}


function getPlayerFromLineup(
  innings: any,
  playerId: string
): Player | null {
  const player =
    innings?.battingLineup?.find(
      (p: Player) =>
        p.id === playerId
    );

  return player || null;
}


function getBowlerFromInnings(
  innings: any
): Player | null {
  const player =
    innings?.bowlingLineup?.find(
      (p: Player) =>
        p.id ===
        innings.currentBowlerId
    );

  return player || null;
}


/* =========================================================
   SOCKET.IO
========================================================= */

io.on(
  'connection',
  (socket) => {
    console.log(
      'Client connected:',
      socket.id
    );


    /* =====================================================
       CREATE ROOM
    ===================================================== */

    socket.on(
      'create-room',
      (payload: any) => {
        try {
          const playerName =
            payload?.playerName ||
            payload?.userName ||
            'Manager';

          const result =
            createRoom(
              socket.id,

              playerName,

              payload?.teamName ||
                'Royal Challengers Bengaluru',

              payload?.teamShortName ||
                'RCB',

              payload?.teamColor ||
                '#EC1C24',

              payload?.teamLogo ||
                '🔴'
            );

          if (!result) {
            socket.emit(
              'error',
              {
                message:
                  'Unable to create room',
              }
            );

            return;
          }

          socket.join(
            result.roomCode
          );

          const room =
            getRoom(
              result.roomCode
            );

          if (!room) {
            socket.emit(
              'error',
              {
                message:
                  'Room creation failed',
              }
            );

            return;
          }

          socket.emit(
            'room-created',
            {
              roomCode:
                result.roomCode,

              code:
                result.roomCode,

              teamId:
                result.teamId,
            }
          );

          io.to(
            result.roomCode
          ).emit(
            'room-updated',
            getRoomPublicData(room)
          );

        } catch (error: any) {
          socket.emit(
            'error',
            {
              message:
                error?.message ||
                'Failed to create room',
            }
          );
        }
      }
    );


    /* =====================================================
       JOIN ROOM
    ===================================================== */

    socket.on(
      'join-room',
      (payload: any) => {
        try {
          const roomCode =
            getRoomCode(payload);

          const playerName =
            payload?.playerName ||
            payload?.userName ||
            'Manager';

          if (!roomCode) {
            socket.emit(
              'error',
              {
                message:
                  'Room code is required',
              }
            );

            return;
          }

          /*
           * Rejoin existing team
           */

          if (payload?.teamId) {
            const rejoin =
              rejoinRoom(
                socket.id,
                roomCode,
                payload.teamId
              );

            if (rejoin.success) {
              socket.join(
                roomCode
              );

              const room =
                getRoom(roomCode);

              if (room) {
                socket.emit(
                  'reconnected',
                  {
                    teamId:
                      payload.teamId,

                    roomCode,
                  }
                );

                io.to(
                  roomCode
                ).emit(
                  'room-updated',
                  getRoomPublicData(room)
                );
              }

              return;
            }
          }

          /*
           * New team
           */

          const result =
            joinRoom(
              socket.id,

              roomCode,

              playerName,

              payload?.teamName ||
                'Chennai Super Kings',

              payload?.teamShortName ||
                'CSK',

              payload?.teamColor ||
                '#FFFF00',

              payload?.teamLogo ||
                '🦁'
            );

          if (result.error) {
            socket.emit(
              'error',
              {
                message:
                  result.error,
              }
            );

            return;
          }

          socket.join(
            roomCode
          );

          socket.emit(
            'room-joined',
            {
              roomCode,

              code: roomCode,

              teamId:
                result.teamId,
            }
          );

          const room =
            getRoom(roomCode);

          if (room) {
            io.to(
              roomCode
            ).emit(
              'room-updated',
              getRoomPublicData(room)
            );
          }

        } catch (error: any) {
          socket.emit(
            'error',
            {
              message:
                error?.message ||
                'Failed to join room',
            }
          );
        }
      }
    );


    /* =====================================================
       TOGGLE READY
    ===================================================== */

    socket.on(
      'toggle-ready',
      () => {
        try {
          const result =
            toggleReady(
              socket.id
            );

          if (!result) {
            socket.emit(
              'error',
              {
                message:
                  'You are not in a room',
              }
            );

            return;
          }

          const room =
            getRoom(
              result.roomCode
            );

          if (room) {
            io.to(
              result.roomCode
            ).emit(
              'room-updated',
              getRoomPublicData(room)
            );
          }

        } catch (error: any) {
          socket.emit(
            'error',
            {
              message:
                error?.message ||
                'Ready update failed',
            }
          );
        }
      }
    );


    /* =====================================================
       SUBMIT LINEUP
    ===================================================== */

    socket.on(
      'submit-lineup',
      (payload: any) => {
        try {
          const roomCode =
            getRoomCode(payload);

          const teamId =
            payload?.teamId;

          const playingXI =
            payload?.playingXI ||
            payload?.lineup ||
            payload?.playerIds ||
            [];

          const impactPlayerId =
            payload?.impactPlayerId ||
            null;

          if (!teamId) {
            socket.emit(
              'error',
              {
                message:
                  'Team ID is required',
              }
            );

            return;
          }

          const result =
            saveTeamLineup(
              roomCode,

              teamId,

              Array.isArray(
                playingXI
              )
                ? playingXI
                : [],

              impactPlayerId
            );

          if (!result.success) {
            socket.emit(
              'error',
              {
                message:
                  result.error ||
                  'Invalid lineup',
              }
            );

            return;
          }

          const room =
            getRoom(roomCode);

          if (!room) {
            return;
          }

          io.to(
            roomCode
          ).emit(
            'room-updated',
            getRoomPublicData(room)
          );

          socket.emit(
            'notification',
            'Playing XI confirmed!'
          );

        } catch (error: any) {
          socket.emit(
            'error',
            {
              message:
                error?.message ||
                'Lineup submission failed',
            }
          );
        }
      }
    );


    /* =====================================================
       START AUCTION
    ===================================================== */

    socket.on(
      'start-auction',
      (payload: any) => {
        try {
          const roomCode =
            getRoomCode(payload);

          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            socket.emit(
              'error',
              {
                message:
                  'You are not in a room',
              }
            );

            return;
          }

          const success =
            startAuction(
              roomCode,
              io
            );

          if (!success) {
            socket.emit(
              'error',
              {
                message:
                  'Unable to start auction',
              }
            );
          }

        } catch (error: any) {
          socket.emit(
            'error',
            {
              message:
                error?.message ||
                'Failed to start auction',
            }
          );
        }
      }
    );


    /* =====================================================
       BID
    ===================================================== */

    socket.on(
      'place-bid',
      (payload: any) => {
        try {
          const roomCode =
            getRoomCode(payload);

          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            return;
          }

          const result =
            placeBid(
              roomCode,
              mapping.teamId,
              io
            );

          if (!result.success) {
            socket.emit(
              'error',
              {
                message:
                  result.error ||
                  'Bid failed',
              }
            );
          }

        } catch (error: any) {
          socket.emit(
            'error',
            {
              message:
                error?.message ||
                'Bid failed',
            }
          );
        }
      }
    );


    /* =====================================================
       SKIP PLAYER
    ===================================================== */

    socket.on(
      'skip-player',
      (payload: any) => {
        try {
          const roomCode =
            getRoomCode(payload);

          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            return;
          }

          const result =
            skipPlayer(
              roomCode,
              mapping.teamId,
              io
            );

          if (!result.success) {
            socket.emit(
              'error',
              {
                message:
                  result.error ||
                  'Unable to skip player',
              }
            );
          }

        } catch (error: any) {
          socket.emit(
            'error',
            {
              message:
                error?.message ||
                'Skip failed',
            }
          );
        }
      }
    );


    /* =====================================================
       PAUSE AUCTION
    ===================================================== */

    socket.on(
      'pause-auction',
      (payload: any) => {
        const roomCode =
          getRoomCode(payload);

        const mapping =
          getSocketMapping(
            socket.id
          );

        if (!mapping) {
          return;
        }

        pauseAuction(
          roomCode,
          mapping.teamId,
          io
        );
      }
    );


    /* =====================================================
       RESUME AUCTION
    ===================================================== */

    socket.on(
      'resume-auction',
      (payload: any) => {
        const roomCode =
          getRoomCode(payload);

        const mapping =
          getSocketMapping(
            socket.id
          );

        if (!mapping) {
          return;
        }

        resumeAuction(
          roomCode,
          mapping.teamId,
          io
        );
      }
    );


    /* =====================================================
       HOST NEXT PLAYER
    ===================================================== */

    socket.on(
      'host-next-player',
      (payload: any) => {
        const roomCode =
          getRoomCode(payload);

        const mapping =
          getSocketMapping(
            socket.id
          );

        if (!mapping) {
          return;
        }

        hostNextPlayer(
          roomCode,
          mapping.teamId,
          io
        );
      }
    );


    /* =====================================================
       END AUCTION
    ===================================================== */

    socket.on(
      'end-auction',
      (payload: any) => {
        const roomCode =
          getRoomCode(payload);

        const mapping =
          getSocketMapping(
            socket.id
          );

        if (!mapping) {
          return;
        }

        endAuction(
          roomCode,
          mapping.teamId,
          io
        );
      }
    );


    /* =====================================================
       RESTART AUCTION
    ===================================================== */

    socket.on(
      'restart-auction',
      (payload: any) => {
        const roomCode =
          getRoomCode(payload);

        const mapping =
          getSocketMapping(
            socket.id
          );

        if (!mapping) {
          return;
        }

        restartAuction(
          roomCode,
          mapping.teamId,
          io
        );
      }
    );


    /* =====================================================
       START MATCH
    ===================================================== */

    socket.on(
      'start-match',
      (payload: any) => {
        try {
          const roomCode =
            getRoomCode(payload);

          const room =
            getRoom(roomCode);

          if (!room) {
            socket.emit(
              'error',
              {
                message:
                  'Room not found',
              }
            );

            return;
          }

          const teams =
            Array.from(
              room.teams.values()
            ).filter(
              (team) =>
                team.isConnected
            );

          if (teams.length < 2) {
            socket.emit(
              'error',
              {
                message:
                  'At least 2 connected teams are required.',
              }
            );

            return;
          }

          const team1 =
            teams[0];

          const team2 =
            teams[1];

          /*
           * Use submitted lineups.
           * If a team has not submitted one,
           * create a default lineup from its squad.
           */

          const lineup1 =
            team1.lineup ||
            createDefaultLineup(
              team1
            );

          const lineup2 =
            team2.lineup ||
            createDefaultLineup(
              team2
            );

          if (
            lineup1.playingXI.length < 2
          ) {
            socket.emit(
              'error',
              {
                message:
                  `${team1.teamName} needs at least 2 players.`,
              }
            );

            return;
          }

          if (
            lineup2.playingXI.length < 1
          ) {
            socket.emit(
              'error',
              {
                message:
                  `${team2.teamName} needs at least 1 player.`,
              }
            );

            return;
          }

          const requestedOvers =
            Number(
              payload?.overs
            ) || 5;

          const validOvers =
            [2, 5, 10, 20].includes(
              requestedOvers
            )
              ? requestedOvers
              : 5;

          const match =
            initializeMatch(
              roomCode,

              team1.id,

              lineup1,

              team1.squad,

              team2.id,

              lineup2,

              team2.squad,

              validOvers
            );

          liveMatches.set(
            roomCode,
            match
          );

          pendingDeliveries.delete(
            roomCode
          );

          room.gameState =
            'MATCH_PLAYING';

          io.to(
            roomCode
          ).emit(
            'room-updated',
            getRoomPublicData(room)
          );

          io.to(
            roomCode
          ).emit(
            'match-updated',
            match
          );

          io.to(
            roomCode
          ).emit(
            'notification',
            `Match launched — ${validOvers} Overs!`
          );

        } catch (error: any) {
          socket.emit(
            'error',
            {
              message:
                error?.message ||
                'Failed to start match',
            }
          );
        }
      }
    );


    /* =====================================================
       DELIVERY
    ===================================================== */

    socket.on(
      'submit-delivery',
      (payload: any) => {
        try {
          const roomCode =
            getRoomCode(payload);

          const match =
            liveMatches.get(
              roomCode
            );

          if (!match) {
            socket.emit(
              'error',
              {
                message:
                  'Match not found',
              }
            );

            return;
          }

          if (
            match.phase ===
              'MATCH_OVER'
          ) {
            return;
          }

          pendingDeliveries.set(
            roomCode,
            payload
          );

          match.phase =
            'BALL_IN_FLIGHT';

          io.to(
            roomCode
          ).emit(
            'match-updated',
            match
          );

        } catch (error: any) {
          socket.emit(
            'error',
            {
              message:
                error?.message ||
                'Delivery failed',
            }
          );
        }
      }
    );


    /* =====================================================
       SHOT
    ===================================================== */

    socket.on(
      'submit-shot',
      (payload: any) => {
        try {
          const roomCode =
            getRoomCode(payload);

          const match =
            liveMatches.get(
              roomCode
            );

          if (!match) {
            socket.emit(
              'error',
              {
                message:
                  'Match not found',
              }
            );

            return;
          }

          const delivery =
            pendingDeliveries.get(
              roomCode
            );

          if (!delivery) {
            socket.emit(
              'error',
              {
                message:
                  'No delivery is waiting.',
              }
            );

            return;
          }

          const innings =
            match.currentInnings === 1
              ? match.innings1
              : match.innings2;

          if (!innings) {
            socket.emit(
              'error',
              {
                message:
                  'Current innings not found.',
              }
            );

            return;
          }

          const batter =
            getPlayerFromLineup(
              innings,
              innings.strikerId
            );

          const bowler =
            getBowlerFromInnings(
              innings
            );

          if (!batter) {
            socket.emit(
              'error',
              {
                message:
                  'Current batter not found.',
              }
            );

            return;
          }

          if (!bowler) {
            socket.emit(
              'error',
              {
                message:
                  'Current bowler not found.',
              }
            );

            return;
          }

          const outcome =
            calculateBallOutcome(
              delivery,
              payload,
              batter,
              bowler,
              innings.isFreeHitActive
            );

          applyBallResult(
            match,
            outcome
          );

          pendingDeliveries.delete(
            roomCode
          );

          io.to(
            roomCode
          ).emit(
            'match-updated',
            match
          );

          /*
           * Match finished
           */

          if (
            match.phase ===
            'MATCH_OVER'
          ) {
            const room =
              getRoom(roomCode);

            if (room) {
              room.gameState =
                'FINISHED';

              calculateRankings(
                roomCode
              );

              io.to(
                roomCode
              ).emit(
                'room-updated',
                getRoomPublicData(room)
              );
            }

            return;
          }

          /*
           * Show result for 3 seconds.
           * matchEngine changes phase itself
           * to AWAITING_DELIVERY through the
           * next client action.
           */

          setTimeout(
            () => {
              const currentMatch =
                liveMatches.get(
                  roomCode
                );

              if (
                !currentMatch ||
                currentMatch.phase ===
                  'MATCH_OVER'
              ) {
                return;
              }

              currentMatch.phase =
                'AWAITING_DELIVERY';

              io.to(
                roomCode
              ).emit(
                'match-updated',
                currentMatch
              );
            },
            3000
          );

        } catch (error: any) {
          socket.emit(
            'error',
            {
              message:
                error?.message ||
                'Shot processing failed',
            }
          );
        }
      }
    );


    /* =====================================================
       DISCONNECT
    ===================================================== */

    socket.on(
      'disconnect',
      () => {
        try {
          const result =
            handleDisconnect(
              socket.id
            );

          if (!result) {
            return;
          }

          const room =
            getRoom(
              result.roomCode
            );

          if (room) {
            io.to(
              result.roomCode
            ).emit(
              'room-updated',
              getRoomPublicData(room)
            );

            if (
              result.newHostId
            ) {
              io.to(
                result.roomCode
              ).emit(
                'notification',
                `${result.newHostName} is now the host.`
              );
            }
          }

          console.log(
            'Client disconnected:',
            socket.id
          );

        } catch (error) {
          console.error(
            'Disconnect handling error:',
            error
          );
        }
      }
    );
  }
);


/* =========================================================
   REACT SPA FALLBACK
========================================================= */

/*
 * IMPORTANT:
 * This is deliberately placed AFTER API/socket routes.
 *
 * It allows:
 *
 * https://your-render-url.onrender.com/
 *
 * to open the React game.
 */

app.use(
  (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
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


/* =========================================================
   SERVER
========================================================= */

const PORT =
  Number(process.env.PORT) ||
  3001;

server.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `React client path: ${clientBuildPath}`
    );
  }
);
