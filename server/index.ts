// server/index.ts

import express, {
  Request,
  Response,
} from 'express';

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
  saveTeamLineup,
  calculateRankings,
  resetAllLineups,
} from './roomManager';

import {
  initializeMatch,
  calculateBallOutcome,
  applyBallResult,
} from './matchEngine';

import {
  DeliveryInput,
  ShotInput,
  Player,
  TeamLineup,
} from './types';

import {
  startAuction,
  placeBid,
  pauseAuction,
  resumeAuction,
  skipPlayer,
  hostNextPlayer,
  endAuction,
  restartAuction,
} from './auctionManager';


/* =========================================================
   ENVIRONMENT
========================================================= */

dotenv.config();

const PORT =
  Number(process.env.PORT) || 10000;

const CLIENT_URL =
  process.env.CLIENT_URL ||
  'http://localhost:5173';


/* =========================================================
   EXPRESS
========================================================= */

const app = express();

app.use(
  cors({
    origin: [
      CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '2mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);


/* =========================================================
   HTTP SERVER
========================================================= */

const httpServer =
  createServer(app);


/* =========================================================
   SOCKET.IO
========================================================= */

const io =
  new Server(
    httpServer,
    {
      cors: {
        origin: [
          CLIENT_URL,
          'http://localhost:5173',
          'http://localhost:3000',
        ],
        methods: [
          'GET',
          'POST',
        ],
        credentials: true,
      },
    }
  );


/* =========================================================
   LIVE MATCHES
========================================================= */

const liveMatches =
  new Map<string, any>();


/* =========================================================
   HELPERS
========================================================= */

function emitRoomUpdate(
  roomCode: string
): void {
  const room =
    getRoom(roomCode);

  if (!room) {
    return;
  }

  io.to(roomCode).emit(
    'room-updated',
    getRoomPublicData(room)
  );
}


function getRoomTeams(
  room: any
): any[] {
  if (!room?.teams) {
    return [];
  }

  return Array.from(
    room.teams.values()
  );
}


function getCurrentInnings(
  match: any
): any | null {
  if (
    match.currentInnings === 1
  ) {
    return match.innings1 ||
      null;
  }

  return match.innings2 ||
    null;
}


function getCurrentBatter(
  match: any
): Player | null {
  const innings =
    getCurrentInnings(match);

  if (!innings) {
    return null;
  }

  return (
    innings.battingLineup?.find(
      (player: Player) =>
        player.id ===
        innings.strikerId
    ) ||
    null
  );
}


function getCurrentBowler(
  match: any
): Player | null {
  const innings =
    getCurrentInnings(match);

  if (!innings) {
    return null;
  }

  return (
    innings.bowlingLineup?.find(
      (player: Player) =>
        player.id ===
        innings.currentBowlerId
    ) ||
    null
  );
}


function broadcastMatch(
  roomCode: string,
  match: any
): void {
  io.to(roomCode).emit(
    'match-updated',
    match
  );
}


/* =========================================================
   HEALTH
========================================================= */

app.get(
  '/health',
  (
    _req: Request,
    res: Response
  ) => {
    res.json({
      status: 'ok',
      service:
        'ipl-auction-battle',
      timestamp:
        new Date().toISOString(),
    });
  }
);


/* =========================================================
   ROOT
========================================================= */

app.get(
  '/',
  (
    _req: Request,
    res: Response
  ) => {
    res.json({
      message:
        'IPL Auction Battle Server',
      status: 'running',
    });
  }
);


/* =========================================================
   SOCKET CONNECTION
========================================================= */

io.on(
  'connection',
  (socket) => {

    console.log(
      `Socket connected: ${socket.id}`
    );


    /* =====================================================
       CREATE ROOM
    ===================================================== */

    socket.on(
      'create-room',
      (
        payload: any = {},
        callback?: Function
      ) => {
        try {
          const playerName =
            String(
              payload.playerName ||
              payload.name ||
              'Player'
            ).trim();

          const teamName =
            String(
              payload.teamName ||
              'Team'
            ).trim();

          const teamShortName =
            String(
              payload.teamShortName ||
              teamName
                .substring(0, 3)
                .toUpperCase()
            ).trim();

          const teamColor =
            String(
              payload.teamColor ||
              '#1976d2'
            );

          const teamLogo =
            String(
              payload.teamLogo ||
              ''
            );

          /*
           * createRoom takes exactly 6 arguments.
           */
          const result =
            createRoom(
              socket.id,
              playerName,
              teamName,
              teamShortName,
              teamColor,
              teamLogo
            );

          if (!result) {
            const response = {
              success: false,
              error:
                'Failed to create room.',
            };

            callback?.(response);
            return;
          }

          const roomCode =
            result.roomCode;

          socket.join(
            roomCode
          );

          const room =
            getRoom(roomCode);

          const response = {
            success: true,
            roomCode,
            teamId:
              result.teamId,
            room:
              room
                ? getRoomPublicData(
                    room
                  )
                : null,
          };

          callback?.(
            response
          );

          socket.emit(
            'room-created',
            response
          );

          emitRoomUpdate(
            roomCode
          );

          console.log(
            `Room created: ${roomCode}`
          );

        } catch (error) {
          console.error(
            'create-room error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create room.',
          });
        }
      }
    );


    /* =====================================================
       JOIN ROOM
    ===================================================== */

    socket.on(
      'join-room',
      (
        payload: any = {},
        callback?: Function
      ) => {
        try {
          const roomCode =
            String(
              payload.roomCode ||
              payload.code ||
              ''
            )
              .trim()
              .toUpperCase();

          const playerName =
            String(
              payload.playerName ||
              payload.name ||
              'Player'
            ).trim();

          const teamName =
            String(
              payload.teamName ||
              'Team'
            ).trim();

          const teamShortName =
            String(
              payload.teamShortName ||
              teamName
                .substring(0, 3)
                .toUpperCase()
            ).trim();

          const teamColor =
            String(
              payload.teamColor ||
              '#1976d2'
            );

          const teamLogo =
            String(
              payload.teamLogo ||
              ''
            );

          if (!roomCode) {
            callback?.({
              success: false,
              error:
                'Room code is required.',
            });

            return;
          }

          /*
           * joinRoom actual signature:
           *
           * joinRoom(
           *   socketId,
           *   roomCode,
           *   playerName,
           *   teamName,
           *   teamShortName,
           *   teamColor,
           *   teamLogo
           * )
           */
          const result =
            joinRoom(
              socket.id,
              roomCode,
              playerName,
              teamName,
              teamShortName,
              teamColor,
              teamLogo
            );

          if (result.error) {
            callback?.({
              success: false,
              error:
                result.error,
            });

            return;
          }

          socket.join(
            roomCode
          );

          const room =
            getRoom(roomCode);

          const response = {
            success: true,
            roomCode,
            teamId:
              result.teamId,
            room:
              room
                ? getRoomPublicData(
                    room
                  )
                : null,
          };

          callback?.(
            response
          );

          socket.emit(
            'room-joined',
            response
          );

          emitRoomUpdate(
            roomCode
          );

          io.to(roomCode).emit(
            'notification',
            {
              type: 'info',
              message:
                `${playerName} joined the room.`,
            }
          );

        } catch (error) {
          console.error(
            'join-room error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to join room.',
          });
        }
      }
    );


    /* =====================================================
       REJOIN ROOM
    ===================================================== */

    socket.on(
      'rejoin-room',
      (
        payload: any = {},
        callback?: Function
      ) => {
        try {
          const roomCode =
            String(
              payload.roomCode ||
              ''
            )
              .trim()
              .toUpperCase();

          const teamId =
            String(
              payload.teamId ||
              ''
            ).trim();

          if (
            !roomCode ||
            !teamId
          ) {
            callback?.({
              success: false,
              error:
                'Room code and team ID are required.',
            });

            return;
          }

          /*
           * Actual signature:
           *
           * rejoinRoom(
           *   socketId,
           *   roomCode,
           *   teamId
           * )
           */
          const result =
            rejoinRoom(
              socket.id,
              roomCode,
              teamId
            );

          if (!result.success) {
            callback?.(
              result
            );

            return;
          }

          socket.join(
            roomCode
          );

          const room =
            getRoom(roomCode);

          const response = {
            success: true,
            roomCode,
            teamId,
            room:
              room
                ? getRoomPublicData(
                    room
                  )
                : null,
          };

          callback?.(
            response
          );

          socket.emit(
            'room-joined',
            response
          );

          emitRoomUpdate(
            roomCode
          );

        } catch (error) {
          console.error(
            'rejoin-room error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to rejoin room.',
          });
        }
      }
    );


    /* =====================================================
       TOGGLE READY
    ===================================================== */

    socket.on(
      'toggle-ready',
      (
        _payload: any = {},
        callback?: Function
      ) => {
        try {
          /*
           * toggleReady takes socket.id only.
           */
          const result =
            toggleReady(
              socket.id
            );

          if (!result) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          callback?.({
            success: true,
          });

          emitRoomUpdate(
            result.roomCode
          );

        } catch (error) {
          console.error(
            'toggle-ready error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to update ready status.',
          });
        }
      }
    );


    /* =====================================================
       SUBMIT LINEUP
    ===================================================== */

    socket.on(
      'submit-lineup',
      (
        payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          const playingXI: string[] =
            Array.isArray(
              payload.playingXI
            )
              ? payload.playingXI
              : Array.isArray(
                  payload.playerIds
                )
                ? payload.playerIds
                : [];

          const impactPlayerId =
            payload.impactPlayerId ||
            null;

          const result =
            saveTeamLineup(
              mapping.roomCode,
              mapping.teamId,
              playingXI,
              impactPlayerId
            );

          if (!result.success) {
            callback?.({
              success: false,
              error:
                result.error ||
                'Unable to save lineup.',
            });

            return;
          }

          callback?.({
            success: true,
          });

          emitRoomUpdate(
            mapping.roomCode
          );

        } catch (error) {
          console.error(
            'submit-lineup error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to submit lineup.',
          });
        }
      }
    );


    /* =====================================================
       START AUCTION
    ===================================================== */

    socket.on(
      'start-auction',
      (
        _payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          /*
           * Actual signature:
           * startAuction(roomCode, io)
           */
          const success =
            startAuction(
              mapping.roomCode,
              io
            );

          callback?.({
            success,
            error: success
              ? undefined
              : 'Unable to start auction.',
          });

          emitRoomUpdate(
            mapping.roomCode
          );

        } catch (error) {
          console.error(
            'start-auction error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to start auction.',
          });
        }
      }
    );


    /* =====================================================
       PLACE BID
    ===================================================== */

    socket.on(
      'place-bid',
      (
        _payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          /*
           * Actual placeBid signature:
           *
           * placeBid(
           *   roomCode,
           *   teamId,
           *   io
           * )
           *
           * The bid amount is calculated by
           * auctionManager itself.
           */
          const result =
            placeBid(
              mapping.roomCode,
              mapping.teamId,
              io
            );

          callback?.(
            result
          );

          emitRoomUpdate(
            mapping.roomCode
          );

        } catch (error) {
          console.error(
            'place-bid error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to place bid.',
          });
        }
      }
    );


    /* =====================================================
       SKIP PLAYER
    ===================================================== */

    socket.on(
      'skip-player',
      (
        _payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          const result =
            skipPlayer(
              mapping.roomCode,
              mapping.teamId,
              io
            );

          callback?.(
            result
          );

          emitRoomUpdate(
            mapping.roomCode
          );

        } catch (error) {
          console.error(
            'skip-player error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to skip player.',
          });
        }
      }
    );


    /* =====================================================
       PAUSE AUCTION
    ===================================================== */

    socket.on(
      'pause-auction',
      (
        _payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          const success =
            pauseAuction(
              mapping.roomCode,
              mapping.teamId,
              io
            );

          callback?.({
            success,
          });

          emitRoomUpdate(
            mapping.roomCode
          );

        } catch (error) {
          console.error(
            'pause-auction error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to pause auction.',
          });
        }
      }
    );


    /* =====================================================
       RESUME AUCTION
    ===================================================== */

    socket.on(
      'resume-auction',
      (
        _payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          const success =
            resumeAuction(
              mapping.roomCode,
              mapping.teamId,
              io
            );

          callback?.({
            success,
          });

          emitRoomUpdate(
            mapping.roomCode
          );

        } catch (error) {
          console.error(
            'resume-auction error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to resume auction.',
          });
        }
      }
    );


    /* =====================================================
       NEXT AUCTION PLAYER
    ===================================================== */

    socket.on(
      'next-player',
      (
        _payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          const success =
            hostNextPlayer(
              mapping.roomCode,
              mapping.teamId,
              io
            );

          callback?.({
            success,
          });

          emitRoomUpdate(
            mapping.roomCode
          );

        } catch (error) {
          console.error(
            'next-player error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to move to next player.',
          });
        }
      }
    );


    /* =====================================================
       END AUCTION
    ===================================================== */

    socket.on(
      'end-auction',
      (
        _payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          const success =
            endAuction(
              mapping.roomCode,
              mapping.teamId,
              io
            );

          callback?.({
            success,
          });

          emitRoomUpdate(
            mapping.roomCode
          );

        } catch (error) {
          console.error(
            'end-auction error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to end auction.',
          });
        }
      }
    );


    /* =====================================================
       RESTART AUCTION
    ===================================================== */

    socket.on(
      'restart-auction',
      (
        _payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          const success =
            restartAuction(
              mapping.roomCode,
              mapping.teamId,
              io
            );

          callback?.({
            success,
          });

          emitRoomUpdate(
            mapping.roomCode
          );

        } catch (error) {
          console.error(
            'restart-auction error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to restart auction.',
          });
        }
      }
    );


    /* =====================================================
       START MATCH
    ===================================================== */

    socket.on(
      'start-match',
      (
        payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          const room =
            getRoom(
              mapping.roomCode
            );

          if (!room) {
            callback?.({
              success: false,
              error:
                'Room not found.',
            });

            return;
          }

          /*
           * Host only.
           */
          if (
            room.hostId !==
            mapping.teamId
          ) {
            callback?.({
              success: false,
              error:
                'Only the host can start the match.',
            });

            return;
          }

          const teams =
            getRoomTeams(room)
              .filter(
                (team: any) =>
                  team.isConnected
              );

          if (teams.length < 2) {
            callback?.({
              success: false,
              error:
                'At least 2 connected teams are required.',
            });

            return;
          }

          /*
           * Use first two connected teams.
           */
          const team1 =
            teams[0];

          const team2 =
            teams[1];

          /*
           * Make automatic lineups if required.
           */
          function ensureLineup(
            team: any
          ): TeamLineup {
            if (
              team.lineup &&
              Array.isArray(
                team.lineup.playingXI
              )
            ) {
              return team.lineup;
            }

            const ids =
              (team.squad || [])
                .map(
                  (item: any) =>
                    item?.player?.id
                )
                .filter(Boolean)
                .slice(0, 11);

            const lineup:
              TeamLineup = {
              teamId:
                team.id,
              playingXI:
                ids,
              impactPlayerId:
                null,
              submitted:
                true,
            };

            team.lineup =
              lineup;

            team.lineupSubmitted =
              true;

            team.isReady =
              true;

            return lineup;
          }

          const lineup1 =
            ensureLineup(
              team1
            );

          const lineup2 =
            ensureLineup(
              team2
            );

          if (
            team1.squad.length < 2 ||
            team2.squad.length < 2
          ) {
            callback?.({
              success: false,
              error:
                'Both teams need at least 2 players.',
            });

            return;
          }

          const requestedOvers =
            Number(
              payload.overs
            );

          const totalOvers =
            [2, 5, 10, 20].includes(
              requestedOvers
            )
              ? requestedOvers
              : 5;

          /*
           * IMPORTANT:
           *
           * This matches the actual initializeMatch()
           * signature from matchEngine.ts.
           */
          const match =
            initializeMatch(
              mapping.roomCode,

              team1.id,
              lineup1,
              team1.squad,

              team2.id,
              lineup2,
              team2.squad,

              totalOvers
            );

          liveMatches.set(
            mapping.roomCode,
            match
          );

          (
            room as any
          ).match =
            match;

          room.gameState =
            'MATCH_PLAYING';

          callback?.({
            success: true,
            match,
          });

          emitRoomUpdate(
            mapping.roomCode
          );

          broadcastMatch(
            mapping.roomCode,
            match
          );

          io.to(
            mapping.roomCode
          ).emit(
            'notification',
            {
              type: 'success',
              message:
                `Match started: ${totalOvers} overs`,
            }
          );

        } catch (error) {
          console.error(
            'start-match error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to start match.',
          });
        }
      }
    );


    /* =====================================================
       GET MATCH
    ===================================================== */

    socket.on(
      'get-match',
      (
        _payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          const match =
            liveMatches.get(
              mapping.roomCode
            );

          callback?.({
            success: true,
            match:
              match || null,
          });

        } catch (error) {
          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to get match.',
          });
        }
      }
    );


    /* =====================================================
       SUBMIT DELIVERY
    ===================================================== */

    socket.on(
      'submit-delivery',
      (
        payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          const match =
            liveMatches.get(
              mapping.roomCode
            );

          if (!match) {
            callback?.({
              success: false,
              error:
                'No active match.',
            });

            return;
          }

          if (
            match.phase !==
            'AWAITING_DELIVERY'
          ) {
            callback?.({
              success: false,
              error:
                'Match is not waiting for a delivery.',
            });

            return;
          }

          const innings =
            getCurrentInnings(
              match
            );

          if (!innings) {
            callback?.({
              success: false,
              error:
                'Current innings not found.',
            });

            return;
          }

          if (
            innings.bowlingTeamId !==
            mapping.teamId
          ) {
            callback?.({
              success: false,
              error:
                'It is not your bowling turn.',
            });

            return;
          }

          const batter =
            getCurrentBatter(
              match
            );

          const bowler =
            getCurrentBowler(
              match
            );

          if (
            !batter ||
            !bowler
          ) {
            callback?.({
              success: false,
              error:
                'Batter or bowler not found.',
            });

            return;
          }

          const delivery =
            (
              payload.delivery ||
              payload
            ) as DeliveryInput;

          (
            match as any
          ).pendingDelivery =
            delivery;

          match.phase =
            'BALL_IN_FLIGHT';

          callback?.({
            success: true,
          });

          broadcastMatch(
            mapping.roomCode,
            match
          );

        } catch (error) {
          console.error(
            'submit-delivery error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to submit delivery.',
          });
        }
      }
    );


    /* =====================================================
       SUBMIT SHOT
    ===================================================== */

    socket.on(
      'submit-shot',
      (
        payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          const match =
            liveMatches.get(
              mapping.roomCode
            );

          if (!match) {
            callback?.({
              success: false,
              error:
                'No active match.',
            });

            return;
          }

          if (
            match.phase !==
            'BALL_IN_FLIGHT'
          ) {
            callback?.({
              success: false,
              error:
                'No delivery is waiting for a shot.',
            });

            return;
          }

          const innings =
            getCurrentInnings(
              match
            );

          if (!innings) {
            callback?.({
              success: false,
              error:
                'Current innings not found.',
            });

            return;
          }

          if (
            innings.battingTeamId !==
            mapping.teamId
          ) {
            callback?.({
              success: false,
              error:
                'It is not your batting turn.',
            });

            return;
          }

          const delivery =
            (
              match as any
            ).pendingDelivery;

          if (!delivery) {
            callback?.({
              success: false,
              error:
                'Pending delivery not found.',
            });

            return;
          }

          const batter =
            getCurrentBatter(
              match
            );

          const bowler =
            getCurrentBowler(
              match
            );

          if (
            !batter ||
            !bowler
          ) {
            callback?.({
              success: false,
              error:
                'Batter or bowler not found.',
            });

            return;
          }

          const shot =
            (
              payload.shot ||
              payload
            ) as ShotInput;

          const outcome =
            calculateBallOutcome(
              delivery,
              shot,
              batter,
              bowler,
              innings.isFreeHitActive
            );

          applyBallResult(
            match,
            outcome
          );

          delete (
            match as any
          ).pendingDelivery;

          (
            match as any
          ).lastOutcome =
            outcome;

          if (
            match.phase !==
            'MATCH_OVER'
          ) {
            match.phase =
              'RESULT_SHOWCASE';
          }

          liveMatches.set(
            mapping.roomCode,
            match
          );

          callback?.({
            success: true,
            outcome,
            match,
          });

          broadcastMatch(
            mapping.roomCode,
            match
          );

          setTimeout(
            () => {
              const current =
                liveMatches.get(
                  mapping.roomCode
                );

              if (!current) {
                return;
              }

              if (
                current.phase ===
                'MATCH_OVER'
              ) {
                const room =
                  getRoom(
                    mapping.roomCode
                  );

                if (room) {
                  room.gameState =
                    'FINISHED';

                  emitRoomUpdate(
                    mapping.roomCode
                  );
                }

                broadcastMatch(
                  mapping.roomCode,
                  current
                );

                return;
              }

              current.phase =
                'AWAITING_DELIVERY';

              liveMatches.set(
                mapping.roomCode,
                current
              );

              broadcastMatch(
                mapping.roomCode,
                current
              );

            },
            2500
          );

        } catch (error) {
          console.error(
            'submit-shot error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to process shot.',
          });
        }
      }
    );


    /* =====================================================
       CALCULATE RANKINGS
    ===================================================== */

    socket.on(
      'calculate-rankings',
      (
        _payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          const room =
            getRoom(
              mapping.roomCode
            );

          if (!room) {
            callback?.({
              success: false,
              error:
                'Room not found.',
            });

            return;
          }

          if (
            room.hostId !==
            mapping.teamId
          ) {
            callback?.({
              success: false,
              error:
                'Only the host can calculate rankings.',
            });

            return;
          }

          const rankings =
            calculateRankings(
              mapping.roomCode
            );

          callback?.({
            success: true,
            rankings,
          });

          emitRoomUpdate(
            mapping.roomCode
          );

        } catch (error) {
          console.error(
            'calculate-rankings error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to calculate rankings.',
          });
        }
      }
    );


    /* =====================================================
       RESET LINEUPS
    ===================================================== */

    socket.on(
      'reset-lineups',
      (
        _payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            callback?.({
              success: false,
              error:
                'You are not in a room.',
            });

            return;
          }

          const room =
            getRoom(
              mapping.roomCode
            );

          if (!room) {
            callback?.({
              success: false,
              error:
                'Room not found.',
            });

            return;
          }

          if (
            room.hostId !==
            mapping.teamId
          ) {
            callback?.({
              success: false,
              error:
                'Only the host can reset lineups.',
            });

            return;
          }

          resetAllLineups(
            mapping.roomCode
          );

          callback?.({
            success: true,
          });

          emitRoomUpdate(
            mapping.roomCode
          );

        } catch (error) {
          console.error(
            'reset-lineups error:',
            error
          );

          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to reset lineups.',
          });
        }
      }
    );


    /* =====================================================
       GET ROOM
    ===================================================== */

    socket.on(
      'get-room',
      (
        payload: any = {},
        callback?: Function
      ) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          const roomCode =
            String(
              payload.roomCode ||
              mapping?.roomCode ||
              ''
            )
              .trim()
              .toUpperCase();

          if (!roomCode) {
            callback?.({
              success: false,
              error:
                'Room code is required.',
            });

            return;
          }

          const room =
            getRoom(roomCode);

          if (!room) {
            callback?.({
              success: false,
              error:
                'Room not found.',
            });

            return;
          }

          callback?.({
            success: true,
            room:
              getRoomPublicData(
                room
              ),
          });

        } catch (error) {
          callback?.({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to get room.',
          });
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
          console.log(
            `Socket disconnected: ${socket.id}`
          );

          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            return;
          }

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
            emitRoomUpdate(
              result.roomCode
            );

            if (
              result.newHostId
            ) {
              io.to(
                result.roomCode
              ).emit(
                'notification',
                {
                  type: 'info',
                  message:
                    `${result.newHostName || 'Another player'} is now the host.`,
                }
              );
            }
          }

        } catch (error) {
          console.error(
            'disconnect error:',
            error
          );
        }
      }
    );

  }
);


/* =========================================================
   PRODUCTION CLIENT
========================================================= */

const clientDistPath =
  path.join(
    __dirname,
    '../client/dist'
  );

app.use(
  express.static(
    clientDistPath
  )
);


/* =========================================================
   SPA FALLBACK
========================================================= */

app.get(
  /.*/,
  (
    req: Request,
    res: Response
  ) => {
    if (
      req.path.startsWith(
        '/api/'
      )
    ) {
      res.status(404).json({
        error:
          'API endpoint not found.',
      });

      return;
    }

    res.sendFile(
      path.join(
        clientDistPath,
        'index.html'
      )
    );
  }
);


/* =========================================================
   START SERVER
========================================================= */

httpServer.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `🚀 IPL Auction Battle server running on port ${PORT}`
    );

    console.log(
      `🌐 Client URL: ${CLIENT_URL}`
    );
  }
);


/* =========================================================
   PROCESS ERROR HANDLING
========================================================= */

process.on(
  'uncaughtException',
  (error) => {
    console.error(
      'UNCAUGHT EXCEPTION:',
      error
    );
  }
);

process.on(
  'unhandledRejection',
  (reason) => {
    console.error(
      'UNHANDLED REJECTION:',
      reason
    );
  }
);
