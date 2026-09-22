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
  allTeamsLineupReady,
  calculateRankings,
  resetAllLineups,
  rooms,
  socketToRoom,
} from './roomManager';

import {
  initializeMatch,
  calculateBallOutcome,
  applyBallResult,
} from './matchEngine';

import {
  DeliveryInput,
  ShotInput,
  TeamLineup,
  Player,
} from './types';

import {
  auctionBid,
  startAuction,
  pauseAuction,
  resumeAuction,
  skipCurrentPlayer,
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

const io = new Server(
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
) {
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


function getTeamFromRoom(
  room: any,
  teamId: string
) {
  if (!room?.teams) {
    return undefined;
  }

  if (
    typeof room.teams.get ===
    'function'
  ) {
    return room.teams.get(teamId);
  }

  if (Array.isArray(room.teams)) {
    return room.teams.find(
      (team: any) =>
        team.id === teamId
    );
  }

  return undefined;
}


function getRoomTeams(
  room: any
): any[] {
  if (!room?.teams) {
    return [];
  }

  if (
    typeof room.teams.values ===
    'function'
  ) {
    return Array.from(
      room.teams.values()
    );
  }

  if (Array.isArray(room.teams)) {
    return room.teams;
  }

  return [];
}


function getPlayerFromTeam(
  team: any,
  playerId: string
): Player | null {
  if (!team?.squad) {
    return null;
  }

  const purchased =
    team.squad.find(
      (item: any) =>
        item?.player?.id === playerId ||
        item?.id === playerId
    );

  if (!purchased) {
    return null;
  }

  return (
    purchased.player ||
    purchased ||
    null
  );
}


function getCurrentInnings(
  match: any
) {
  if (
    match.currentInnings === 1
  ) {
    return match.innings1;
  }

  return match.innings2;
}


function getCurrentBatter(
  match: any
): Player | null {
  const innings =
    getCurrentInnings(match);

  if (!innings) {
    return null;
  }

  const player =
    innings.battingLineup?.find(
      (p: Player) =>
        p.id === innings.strikerId
    );

  return player || null;
}


function getCurrentBowler(
  match: any
): Player | null {
  const innings =
    getCurrentInnings(match);

  if (!innings) {
    return null;
  }

  const player =
    innings.bowlingLineup?.find(
      (p: Player) =>
        p.id ===
        innings.currentBowlerId
    );

  return player || null;
}


function broadcastMatch(
  roomCode: string,
  match: any
) {
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
  (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'ipl-auction-battle',
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
  (_req: Request, res: Response) => {
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
      (payload: any = {}, callback?: Function) => {
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

          const result =
            createRoom(
              socket.id,
              playerName,
              teamName,
              teamShortName,
              payload.teamColor,
              payload.teamLogo,
              payload.settings
            );

          if (!result) {
            const response = {
              success: false,
              error:
                'Failed to create room.',
            };

            if (callback) {
              callback(response);
            }

            socket.emit(
              'error-message',
              response
            );

            return;
          }

          const roomCode =
            result.roomCode ||
            result.code;

          if (!roomCode) {
            const response = {
              success: false,
              error:
                'Room was created but no room code was returned.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          socket.join(roomCode);

          const mapping =
            getSocketMapping(
              socket.id
            );

          const room =
            getRoom(roomCode);

          const response = {
            success: true,
            roomCode,
            teamId:
              mapping?.teamId ||
              room?.hostId ||
              null,
            room:
              room
                ? getRoomPublicData(room)
                : null,
          };

          if (callback) {
            callback(response);
          }

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

          const response = {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create room.',
          };

          if (callback) {
            callback(response);
          }

          socket.emit(
            'error-message',
            response
          );
        }
      }
    );


    /* =====================================================
       JOIN ROOM
    ===================================================== */

    socket.on(
      'join-room',
      (payload: any = {}, callback?: Function) => {
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

          if (!roomCode) {
            const response = {
              success: false,
              error:
                'Room code is required.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const result =
            joinRoom(
              roomCode,
              socket.id,
              playerName,
              teamName,
              teamShortName,
              payload.teamColor,
              payload.teamLogo
            );

          if (!result?.success) {
            const response = {
              success: false,
              error:
                result?.error ||
                'Unable to join room.',
            };

            if (callback) {
              callback(response);
            }

            socket.emit(
              'error-message',
              response
            );

            return;
          }

          socket.join(roomCode);

          const mapping =
            getSocketMapping(
              socket.id
            );

          const room =
            getRoom(roomCode);

          const response = {
            success: true,
            roomCode,
            teamId:
              mapping?.teamId ||
              null,
            room:
              room
                ? getRoomPublicData(room)
                : null,
          };

          if (callback) {
            callback(response);
          }

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

          const response = {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to join room.',
          };

          if (callback) {
            callback(response);
          }

          socket.emit(
            'error-message',
            response
          );
        }
      }
    );


    /* =====================================================
       REJOIN ROOM
    ===================================================== */

    socket.on(
      'rejoin-room',
      (payload: any = {}, callback?: Function) => {
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
            const response = {
              success: false,
              error:
                'Room code and team ID are required.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const result =
            rejoinRoom(
              roomCode,
              teamId,
              socket.id
            );

          if (!result?.success) {
            const response = {
              success: false,
              error:
                result?.error ||
                'Unable to rejoin room.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          socket.join(roomCode);

          const room =
            getRoom(roomCode);

          const response = {
            success: true,
            roomCode,
            teamId,
            room:
              room
                ? getRoomPublicData(room)
                : null,
          };

          if (callback) {
            callback(response);
          }

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

          const response = {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to rejoin room.',
          };

          if (callback) {
            callback(response);
          }
        }
      }
    );


    /* =====================================================
       TOGGLE READY
    ===================================================== */

    socket.on(
      'toggle-ready',
      (payload: any = {}, callback?: Function) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            const response = {
              success: false,
              error:
                'You are not in a room.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const result =
            toggleReady(
              mapping.roomCode,
              mapping.teamId
            );

          if (callback) {
            callback(result);
          }

          emitRoomUpdate(
            mapping.roomCode
          );
        } catch (error) {
          console.error(
            'toggle-ready error:',
            error
          );

          if (callback) {
            callback({
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unable to update ready status.',
            });
          }
        }
      }
    );


    /* =====================================================
       SUBMIT LINEUP
    ===================================================== */

    socket.on(
      'submit-lineup',
      (payload: any = {}, callback?: Function) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            const response = {
              success: false,
              error:
                'You are not in a room.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const roomCode =
            mapping.roomCode;

          const teamId =
            mapping.teamId;

          const room =
            getRoom(roomCode);

          if (!room) {
            const response = {
              success: false,
              error:
                'Room not found.',
            };

            if (callback) {
              callback(response);
            }

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
              roomCode,
              teamId,
              playingXI,
              impactPlayerId
            );

          if (
            !result.success
          ) {
            const response = {
              success: false,
              error:
                result.error ||
                'Unable to save lineup.',
            };

            if (callback) {
              callback(response);
            }

            socket.emit(
              'error-message',
              response
            );

            return;
          }

          if (callback) {
            callback({
              success: true,
            });
          }

          emitRoomUpdate(
            roomCode
          );

          io.to(roomCode).emit(
            'notification',
            {
              type: 'success',
              message:
                'Lineup submitted successfully.',
            }
          );
        } catch (error) {
          console.error(
            'submit-lineup error:',
            error
          );

          const response = {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to submit lineup.',
          };

          if (callback) {
            callback(response);
          }
        }
      }
    );


    /* =====================================================
       START MATCH
    ===================================================== */

    socket.on(
      'start-match',
      (payload: any = {}, callback?: Function) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            const response = {
              success: false,
              error:
                'You are not in a room.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const roomCode =
            mapping.roomCode;

          const room =
            getRoom(roomCode);

          if (!room) {
            const response = {
              success: false,
              error:
                'Room not found.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          /*
           * Only host can start match.
           */
          if (
            room.hostId !==
            mapping.teamId
          ) {
            const response = {
              success: false,
              error:
                'Only the host can start the match.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const teams =
            getRoomTeams(room);

          /*
           * Connected teams only.
           */
          const connectedTeams =
            teams.filter(
              (team: any) =>
                team.isConnected !== false
            );

          if (
            connectedTeams.length < 2
          ) {
            const response = {
              success: false,
              error:
                'At least 2 connected teams are required.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          /*
           * Make sure lineups exist.
           *
           * Empty squad teams are allowed to remain
           * without a lineup.
           */
          for (
            const team of connectedTeams
          ) {
            if (
              !team.squad ||
              team.squad.length === 0
            ) {
              team.lineup =
                {
                  teamId: team.id,
                  playingXI: [],
                  impactPlayerId: null,
                  submitted: true,
                };

              team.lineupSubmitted =
                true;

              team.isReady =
                true;

              continue;
            }

            /*
             * If the team has no lineup,
             * automatically use its squad.
             */
            if (
              !team.lineup ||
              !team.lineup.playingXI ||
              team.lineup.playingXI.length === 0
            ) {
              const autoXI =
                team.squad
                  .map(
                    (item: any) =>
                      item.player?.id
                  )
                  .filter(Boolean)
                  .slice(0, 11);

              team.lineup = {
                teamId: team.id,
                playingXI: autoXI,
                impactPlayerId: null,
                submitted: true,
              };

              team.lineupSubmitted =
                true;

              team.isReady =
                true;
            }
          }

          const team1 =
            connectedTeams[0];

          const team2 =
            connectedTeams[1];

          if (
            !team1.lineup ||
            !team2.lineup
          ) {
            const response = {
              success: false,
              error:
                'Both teams need a valid lineup.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          if (
            team1.squad.length < 2 ||
            team2.squad.length < 2
          ) {
            const response = {
              success: false,
              error:
                'Both teams need at least 2 players.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          /*
           * Overs.
           */
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
           * Create match.
           */
          const match =
            initializeMatch(
              roomCode,

              team1.id,
              team1.lineup as TeamLineup,
              team1.squad,

              team2.id,
              team2.lineup as TeamLineup,
              team2.squad,

              totalOvers
            );

          liveMatches.set(
            roomCode,
            match
          );

          room.gameState =
            'MATCH_PLAYING';

          /*
           * Save match reference if your Room type
           * supports it at runtime.
           */
          (room as any).match =
            match;

          if (callback) {
            callback({
              success: true,
              match,
            });
          }

          emitRoomUpdate(
            roomCode
          );

          broadcastMatch(
            roomCode,
            match
          );

          io.to(roomCode).emit(
            'notification',
            {
              type: 'success',
              message:
                `Match started! ${totalOvers} overs.`,
            }
          );
        } catch (error) {
          console.error(
            'start-match error:',
            error
          );

          const response = {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to start match.',
          };

          if (callback) {
            callback(response);
          }

          socket.emit(
            'error-message',
            response
          );
        }
      }
    );


    /* =====================================================
       GET MATCH
    ===================================================== */

    socket.on(
      'get-match',
      (payload: any = {}, callback?: Function) => {
        const mapping =
          getSocketMapping(
            socket.id
          );

        if (!mapping) {
          if (callback) {
            callback({
              success: false,
              error:
                'You are not in a room.',
            });
          }

          return;
        }

        const match =
          liveMatches.get(
            mapping.roomCode
          );

        if (callback) {
          callback({
            success: true,
            match:
              match || null,
          });
        }
      }
    );


    /* =====================================================
       SUBMIT DELIVERY
    ===================================================== */

    socket.on(
      'submit-delivery',
      (payload: any = {}, callback?: Function) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            const response = {
              success: false,
              error:
                'You are not in a room.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const roomCode =
            mapping.roomCode;

          const match =
            liveMatches.get(
              roomCode
            );

          if (!match) {
            const response = {
              success: false,
              error:
                'No active match.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          if (
            match.phase !==
            'AWAITING_DELIVERY'
          ) {
            const response = {
              success: false,
              error:
                'The match is not waiting for a delivery.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const innings =
            getCurrentInnings(
              match
            );

          if (!innings) {
            const response = {
              success: false,
              error:
                'Current innings not found.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          /*
           * Only bowling team can deliver.
           */
          if (
            innings.bowlingTeamId !==
            mapping.teamId
          ) {
            const response = {
              success: false,
              error:
                'It is not your bowling turn.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const delivery =
            payload.delivery ||
            payload;

          const validDelivery =
            delivery as DeliveryInput;

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
            const response = {
              success: false,
              error:
                'Unable to determine batter or bowler.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          /*
           * Store delivery temporarily.
           */
          (match as any).pendingDelivery =
            validDelivery;

          match.phase =
            'BALL_IN_FLIGHT';

          if (callback) {
            callback({
              success: true,
            });
          }

          broadcastMatch(
            roomCode,
            match
          );
        } catch (error) {
          console.error(
            'submit-delivery error:',
            error
          );

          if (callback) {
            callback({
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unable to submit delivery.',
            });
          }
        }
      }
    );


    /* =====================================================
       SUBMIT SHOT
    ===================================================== */

    socket.on(
      'submit-shot',
      (payload: any = {}, callback?: Function) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            const response = {
              success: false,
              error:
                'You are not in a room.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const roomCode =
            mapping.roomCode;

          const match =
            liveMatches.get(
              roomCode
            );

          if (!match) {
            const response = {
              success: false,
              error:
                'No active match.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          if (
            match.phase !==
            'BALL_IN_FLIGHT'
          ) {
            const response = {
              success: false,
              error:
                'There is no delivery waiting for a shot.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const innings =
            getCurrentInnings(
              match
            );

          if (!innings) {
            const response = {
              success: false,
              error:
                'Current innings not found.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          /*
           * Only batting team can submit the shot.
           */
          if (
            innings.battingTeamId !==
            mapping.teamId
          ) {
            const response = {
              success: false,
              error:
                'It is not your batting turn.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const delivery =
            (match as any)
              .pendingDelivery;

          if (!delivery) {
            const response = {
              success: false,
              error:
                'Pending delivery not found.',
            };

            if (callback) {
              callback(response);
            }

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
            const response = {
              success: false,
              error:
                'Unable to determine batter or bowler.',
            };

            if (callback) {
              callback(response);
            }

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

          /*
           * Apply result.
           */
          applyBallResult(
            match,
            outcome
          );

          /*
           * Clear pending delivery.
           */
          delete (
            match as any
          ).pendingDelivery;

          /*
           * Store latest outcome.
           */
          (match as any)
            .lastOutcome =
            outcome;

          if (
            match.phase !==
            'MATCH_OVER'
          ) {
            match.phase =
              'RESULT_SHOWCASE';
          }

          liveMatches.set(
            roomCode,
            match
          );

          if (callback) {
            callback({
              success: true,
              outcome,
              match,
            });
          }

          broadcastMatch(
            roomCode,
            match
          );

          /*
           * Wait before next delivery.
           */
          setTimeout(() => {
            const current =
              liveMatches.get(
                roomCode
              );

            if (!current) {
              return;
            }

            if (
              current.phase ===
              'MATCH_OVER'
            ) {
              const room =
                getRoom(roomCode);

              if (room) {
                room.gameState =
                  'FINISHED';

                emitRoomUpdate(
                  roomCode
                );
              }

              broadcastMatch(
                roomCode,
                current
              );

              return;
            }

            current.phase =
              'AWAITING_DELIVERY';

            liveMatches.set(
              roomCode,
              current
            );

            broadcastMatch(
              roomCode,
              current
            );
          }, 2500);
        } catch (error) {
          console.error(
            'submit-shot error:',
            error
          );

          if (callback) {
            callback({
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unable to process shot.',
            });
          }
        }
      }
    );


    /* =====================================================
       AUCTION: START
    ===================================================== */

    socket.on(
      'start-auction',
      (payload: any = {}, callback?: Function) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            const response = {
              success: false,
              error:
                'You are not in a room.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const room =
            getRoom(
              mapping.roomCode
            );

          if (!room) {
            const response = {
              success: false,
              error:
                'Room not found.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          if (
            room.hostId !==
            mapping.teamId
          ) {
            const response = {
              success: false,
              error:
                'Only the host can start the auction.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const result =
            startAuction(
              mapping.roomCode
            );

          if (callback) {
            callback(result);
          }

          emitRoomUpdate(
            mapping.roomCode
          );
        } catch (error) {
          console.error(
            'start-auction error:',
            error
          );

          if (callback) {
            callback({
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unable to start auction.',
            });
          }
        }
      }
    );


    /* =====================================================
       AUCTION: BID
    ===================================================== */

    socket.on(
      'place-bid',
      (payload: any = {}, callback?: Function) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            const response = {
              success: false,
              error:
                'You are not in a room.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const amount =
            Number(
              payload.amount ??
              payload.bid
            );

          if (
            !Number.isFinite(amount)
          ) {
            const response = {
              success: false,
              error:
                'Invalid bid amount.',
            };

            if (callback) {
              callback(response);
            }

            return;
          }

          const result =
            auctionBid(
              mapping.roomCode,
              mapping.teamId,
              amount
            );

          if (callback) {
            callback(result);
          }

          emitRoomUpdate(
            mapping.roomCode
          );
        } catch (error) {
          console.error(
            'place-bid error:',
            error
          );

          if (callback) {
            callback({
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unable to place bid.',
            });
          }
        }
      }
    );


    /* =====================================================
       AUCTION: PAUSE
    ===================================================== */

    socket.on(
      'pause-auction',
      (payload: any = {}, callback?: Function) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            if (callback) {
              callback({
                success: false,
                error:
                  'You are not in a room.',
              });
            }

            return;
          }

          const room =
            getRoom(
              mapping.roomCode
            );

          if (!room) {
            if (callback) {
              callback({
                success: false,
                error:
                  'Room not found.',
              });
            }

            return;
          }

          if (
            room.hostId !==
            mapping.teamId
          ) {
            if (callback) {
              callback({
                success: false,
                error:
                  'Only the host can pause the auction.',
              });
            }

            return;
          }

          const result =
            pauseAuction(
              mapping.roomCode
            );

          if (callback) {
            callback(result);
          }

          emitRoomUpdate(
            mapping.roomCode
          );
        } catch (error) {
          console.error(
            'pause-auction error:',
            error
          );
        }
      }
    );


    /* =====================================================
       AUCTION: RESUME
    ===================================================== */

    socket.on(
      'resume-auction',
      (payload: any = {}, callback?: Function) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            if (callback) {
              callback({
                success: false,
                error:
                  'You are not in a room.',
              });
            }

            return;
          }

          const room =
            getRoom(
              mapping.roomCode
            );

          if (!room) {
            if (callback) {
              callback({
                success: false,
                error:
                  'Room not found.',
              });
            }

            return;
          }

          if (
            room.hostId !==
            mapping.teamId
          ) {
            if (callback) {
              callback({
                success: false,
                error:
                  'Only the host can resume the auction.',
              });
            }

            return;
          }

          const result =
            resumeAuction(
              mapping.roomCode
            );

          if (callback) {
            callback(result);
          }

          emitRoomUpdate(
            mapping.roomCode
          );
        } catch (error) {
          console.error(
            'resume-auction error:',
            error
          );
        }
      }
    );


    /* =====================================================
       AUCTION: SKIP
    ===================================================== */

    socket.on(
      'skip-player',
      (payload: any = {}, callback?: Function) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            if (callback) {
              callback({
                success: false,
                error:
                  'You are not in a room.',
              });
            }

            return;
          }

          const room =
            getRoom(
              mapping.roomCode
            );

          if (!room) {
            if (callback) {
              callback({
                success: false,
                error:
                  'Room not found.',
              });
            }

            return;
          }

          if (
            room.hostId !==
            mapping.teamId
          ) {
            if (callback) {
              callback({
                success: false,
                error:
                  'Only the host can skip a player.',
              });
            }

            return;
          }

          const result =
            skipCurrentPlayer(
              mapping.roomCode
            );

          if (callback) {
            callback(result);
          }

          emitRoomUpdate(
            mapping.roomCode
          );
        } catch (error) {
          console.error(
            'skip-player error:',
            error
          );
        }
      }
    );


    /* =====================================================
       GET ROOM
    ===================================================== */

    socket.on(
      'get-room',
      (payload: any = {}, callback?: Function) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          const roomCode =
            payload.roomCode ||
            mapping?.roomCode;

          if (!roomCode) {
            if (callback) {
              callback({
                success: false,
                error:
                  'Room code is required.',
              });
            }

            return;
          }

          const room =
            getRoom(
              String(
                roomCode
              ).toUpperCase()
            );

          if (!room) {
            if (callback) {
              callback({
                success: false,
                error:
                  'Room not found.',
              });
            }

            return;
          }

          if (callback) {
            callback({
              success: true,
              room:
                getRoomPublicData(
                  room
                ),
            });
          }
        } catch (error) {
          console.error(
            'get-room error:',
            error
          );
        }
      }
    );


    /* =====================================================
       CALCULATE RANKINGS
    ===================================================== */

    socket.on(
      'calculate-rankings',
      (payload: any = {}, callback?: Function) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            if (callback) {
              callback({
                success: false,
                error:
                  'You are not in a room.',
              });
            }

            return;
          }

          const room =
            getRoom(
              mapping.roomCode
            );

          if (!room) {
            if (callback) {
              callback({
                success: false,
                error:
                  'Room not found.',
              });
            }

            return;
          }

          if (
            room.hostId !==
            mapping.teamId
          ) {
            if (callback) {
              callback({
                success: false,
                error:
                  'Only the host can calculate rankings.',
              });
            }

            return;
          }

          const rankings =
            calculateRankings(
              mapping.roomCode
            );

          if (callback) {
            callback({
              success: true,
              rankings,
            });
          }

          emitRoomUpdate(
            mapping.roomCode
          );
        } catch (error) {
          console.error(
            'calculate-rankings error:',
            error
          );

          if (callback) {
            callback({
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unable to calculate rankings.',
            });
          }
        }
      }
    );


    /* =====================================================
       RESET LINEUPS
    ===================================================== */

    socket.on(
      'reset-lineups',
      (payload: any = {}, callback?: Function) => {
        try {
          const mapping =
            getSocketMapping(
              socket.id
            );

          if (!mapping) {
            if (callback) {
              callback({
                success: false,
                error:
                  'You are not in a room.',
              });
            }

            return;
          }

          const room =
            getRoom(
              mapping.roomCode
            );

          if (!room) {
            if (callback) {
              callback({
                success: false,
                error:
                  'Room not found.',
              });
            }

            return;
          }

          if (
            room.hostId !==
            mapping.teamId
          ) {
            if (callback) {
              callback({
                success: false,
                error:
                  'Only the host can reset lineups.',
              });
            }

            return;
          }

          resetAllLineups(
            mapping.roomCode
          );

          if (callback) {
            callback({
              success: true,
            });
          }

          emitRoomUpdate(
            mapping.roomCode
          );
        } catch (error) {
          console.error(
            'reset-lineups error:',
            error
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

          const roomCode =
            mapping.roomCode;

          const teamId =
            mapping.teamId;

          handleDisconnect(
            socket.id
          );

          const room =
            getRoom(roomCode);

          if (room) {
            emitRoomUpdate(
              roomCode
            );

            io.to(roomCode).emit(
              'notification',
              {
                type: 'info',
                message:
                  'A player disconnected.',
              }
            );
          }

          /*
           * Keep teamId referenced so TypeScript
           * and logs remain clear.
           */
          console.log(
            `Disconnected team: ${teamId}`
          );
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
   PRODUCTION STATIC FILES
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
   CLIENT SPA FALLBACK
========================================================= */

app.get(
  /.*/,
  (
    req: Request,
    res: Response
  ) => {
    /*
     * Do not intercept API routes.
     */
    if (
      req.path.startsWith('/api/')
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
   ERROR HANDLING
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
