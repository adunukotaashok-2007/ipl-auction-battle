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
} from './auctionManager';

import {
  initializeMatch,
  calculateBallOutcome,
  applyBallResult,
} from './matchEngine';

import { LiveMatchState } from './types';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const clientUrl =
  process.env.CLIENT_URL ||
  'http://localhost:5173';

const port = parseInt(
  process.env.PORT || '3001',
  10
);

/* =========================================================
   LIVE MATCH STORAGE
========================================================= */

const liveMatches =
  new Map<string, LiveMatchState>();

/* =========================================================
   MIDDLEWARE
========================================================= */

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

/* =========================================================
   PRODUCTION STATIC FILES
========================================================= */

if (
  process.env.NODE_ENV === 'production'
) {
  app.use(
    express.static(
      path.join(
        __dirname,
        '../../client/dist'
      )
    )
  );
}

/* =========================================================
   SOCKET.IO
========================================================= */

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

/* =========================================================
   SOCKET CONNECTION
========================================================= */

io.on('connection', (socket) => {
  console.log(
    `[Socket] Connected: ${socket.id}`
  );

  /* =======================================================
     CREATE ROOM
  ======================================================= */

  socket.on(
    'create-room',
    (data) => {
      try {
        const playerName =
          data?.playerName ||
          data?.userName;

        const {
          teamName,
          teamShortName,
          teamColor,
          teamLogo,
        } = data || {};

        if (!playerName || !teamName) {
          socket.emit('error', {
            message:
              'Player name and team name are required',
          });

          return;
        }

        const result = createRoom(
          socket.id,

          playerName,

          teamName,

          teamShortName ||
            teamName
              .substring(0, 3)
              .toUpperCase(),

          teamColor ||
            '#FFD700',

          teamLogo ||
            '🏏'
        );

        if (!result) {
          socket.emit('error', {
            message:
              'Failed to create room',
          });

          return;
        }

        socket.join(
          result.roomCode
        );

        socket.emit(
          'room-created',
          {
            roomCode:
              result.roomCode,

            teamId:
              result.teamId,
          }
        );

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

        console.log(
          `[Room] Created: ${result.roomCode} by ${teamName}`
        );
      } catch (err) {
        console.error(
          '[Error] create-room:',
          err
        );

        socket.emit('error', {
          message:
            'Server error creating room',
        });
      }
    }
  );

  /* =======================================================
     JOIN ROOM
  ======================================================= */

  socket.on(
    'join-room',
    (data) => {
      try {
        const playerName =
          data?.playerName ||
          data?.userName;

        const {
          roomCode,
          teamName,
          teamShortName,
          teamColor,
          teamLogo,
        } = data || {};

        if (
          !roomCode ||
          !playerName ||
          !teamName
        ) {
          socket.emit('error', {
            message:
              'Room code, player name, and team name are required',
          });

          return;
        }

        const normalizedRoomCode =
          roomCode
            .toString()
            .toUpperCase();

        const result = joinRoom(
          socket.id,

          normalizedRoomCode,

          playerName,

          teamName,

          teamShortName ||
            teamName
              .substring(0, 3)
              .toUpperCase(),

          teamColor ||
            '#4CAF50',

          teamLogo ||
            '🏏'
        );

        if (result.error) {
          socket.emit('error', {
            message:
              result.error,
          });

          return;
        }

        socket.join(
          normalizedRoomCode
        );

        socket.emit(
          'room-joined',
          {
            roomCode:
              normalizedRoomCode,

            teamId:
              result.teamId,
          }
        );

        const room =
          getRoom(
            normalizedRoomCode
          );

        if (room) {
          io.to(
            normalizedRoomCode
          ).emit(
            'room-updated',
            getRoomPublicData(room)
          );
        }

        console.log(
          `[Room] ${teamName} joined ${normalizedRoomCode}`
        );
      } catch (err) {
        console.error(
          '[Error] join-room:',
          err
        );

        socket.emit('error', {
          message:
            'Server error joining room',
        });
      }
    }
  );

  /* =======================================================
     REJOIN ROOM
  ======================================================= */

  socket.on(
    'rejoin-room',
    (data) => {
      try {
        const {
          roomCode,
          teamId,
        } = data || {};

        if (
          !roomCode ||
          !teamId
        ) {
          return;
        }

        const normalizedRoomCode =
          roomCode
            .toString()
            .toUpperCase();

        const result =
          rejoinRoom(
            socket.id,

            normalizedRoomCode,

            teamId
          );

        if (!result.success) {
          socket.emit('error', {
            message:
              result.error ||
              'Failed to rejoin',
          });

          return;
        }

        socket.join(
          normalizedRoomCode
        );

        socket.emit(
          'reconnected',
          {
            teamId,
          }
        );

        const room =
          getRoom(
            normalizedRoomCode
          );

        if (room) {
          io.to(
            normalizedRoomCode
          ).emit(
            'room-updated',
            getRoomPublicData(room)
          );

          const skipped =
            getTeamSkippedPlayers(
              normalizedRoomCode,
              teamId
            );

          socket.emit(
            'your-skip-list',
            {
              skippedPlayers:
                skipped,
            }
          );

          const match =
            liveMatches.get(
              normalizedRoomCode
            );

          if (match) {
            socket.emit(
              'match-updated',
              match
            );
          }
        }

        console.log(
          `[Room] Reconnected: ${teamId} to ${normalizedRoomCode}`
        );
      } catch (err) {
        console.error(
          '[Error] rejoin-room:',
          err
        );

        socket.emit('error', {
          message:
            'Server error rejoining',
        });
      }
    }
  );

  /* =======================================================
     TOGGLE READY
  ======================================================= */

  socket.on(
    'toggle-ready',
    () => {
      try {
        const result =
          toggleReady(
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
        }
      } catch (err) {
        console.error(
          '[Error] toggle-ready:',
          err
        );
      }
    }
  );

  /* =======================================================
     START AUCTION
  ======================================================= */

  socket.on(
    'start-auction',
    (data) => {
      try {
        const socketData =
          getRoomBySocket(
            socket.id
          );

        const roomCode =
          socketData?.room.code ||
          data?.roomCode;

        const teamId =
          socketData?.teamId ||
          data?.teamId;

        if (!roomCode) {
          return;
        }

        const room =
          getRoom(roomCode);

        if (!room) {
          socket.emit('error', {
            message:
              'Room not found',
          });

          return;
        }

        if (
          room.hostId !==
          teamId
        ) {
          socket.emit('error', {
            message:
              'Only the host can start the auction',
          });

          return;
        }

        const started =
          startAuction(
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
    }
  );

  /* =======================================================
     PLACE BID
  ======================================================= */

  socket.on(
    'place-bid',
    (data) => {
      try {
        const mapping =
          getSocketMapping(
            socket.id
          );

        const roomCode =
          mapping?.roomCode ||
          data?.roomCode;

        const teamId =
          mapping?.teamId ||
          data?.teamId;

        if (
          !roomCode ||
          !teamId
        ) {
          return;
        }

        const result =
          placeBid(
            roomCode,
            teamId,
            io
          );

        if (!result.success) {
          socket.emit('error', {
            message:
              result.error ||
              'Bid failed',
          });
        }
      } catch (err) {
        console.error(
          '[Error] place-bid:',
          err
        );

        socket.emit('error', {
          message:
            'Server error placing bid',
        });
      }
    }
  );

  /* =======================================================
     SKIP PLAYER
  ======================================================= */

  socket.on(
    'skip-player',
    (data) => {
      try {
        const mapping =
          getSocketMapping(
            socket.id
          );

        const roomCode =
          mapping?.roomCode ||
          data?.roomCode;

        const teamId =
          mapping?.teamId ||
          data?.teamId;

        if (
          !roomCode ||
          !teamId
        ) {
          return;
        }

        const result =
          skipPlayer(
            roomCode,
            teamId,
            io
          );

        if (!result.success) {
          socket.emit('error', {
            message:
              result.error ||
              'Skip failed',
          });
        }
      } catch (err) {
        console.error(
          '[Error] skip-player:',
          err
        );

        socket.emit('error', {
          message:
            'Server error skipping player',
        });
      }
    }
  );

  /* =======================================================
     PAUSE AUCTION
  ======================================================= */

  socket.on(
    'pause-auction',
    (data) => {
      try {
        const mapping =
          getSocketMapping(
            socket.id
          );

        const roomCode =
          mapping?.roomCode ||
          data?.roomCode;

        const teamId =
          mapping?.teamId ||
          data?.teamId;

        if (
          !roomCode ||
          !teamId
        ) {
          return;
        }

        pauseAuction(
          roomCode,
          teamId,
          io
        );
      } catch (err) {
        console.error(
          '[Error] pause-auction:',
          err
        );
      }
    }
  );

  /* =======================================================
     RESUME AUCTION
  ======================================================= */

  socket.on(
    'resume-auction',
    (data) => {
      try {
        const mapping =
          getSocketMapping(
            socket.id
          );

        const roomCode =
          mapping?.roomCode ||
          data?.roomCode;

        const teamId =
          mapping?.teamId ||
          data?.teamId;

        if (
          !roomCode ||
          !teamId
        ) {
          return;
        }

        resumeAuction(
          roomCode,
          teamId,
          io
        );
      } catch (err) {
        console.error(
          '[Error] resume-auction:',
          err
        );
      }
    }
  );

  /* =======================================================
     NEXT PLAYER
  ======================================================= */

  socket.on(
    'next-player',
    (data) => {
      try {
        const mapping =
          getSocketMapping(
            socket.id
          );

        const roomCode =
          mapping?.roomCode ||
          data?.roomCode;

        const teamId =
          mapping?.teamId ||
          data?.teamId;

        if (
          !roomCode ||
          !teamId
        ) {
          return;
        }

        hostNextPlayer(
          roomCode,
          teamId,
          io
        );
      } catch (err) {
        console.error(
          '[Error] next-player:',
          err
        );
      }
    }
  );

  /* =======================================================
     END AUCTION
  ======================================================= */

  socket.on(
    'end-auction',
    (data) => {
      try {
        const mapping =
          getSocketMapping(
            socket.id
          );

        const roomCode =
          mapping?.roomCode ||
          data?.roomCode;

        const teamId =
          mapping?.teamId ||
          data?.teamId;

        if (
          !roomCode ||
          !teamId
        ) {
          return;
        }

        endAuction(
          roomCode,
          teamId,
          io
        );
      } catch (err) {
        console.error(
          '[Error] end-auction:',
          err
        );
      }
    }
  );

  /* =======================================================
     RESTART AUCTION
  ======================================================= */

  socket.on(
    'restart-auction',
    (data) => {
      try {
        const mapping =
          getSocketMapping(
            socket.id
          );

        const roomCode =
          mapping?.roomCode ||
          data?.roomCode;

        const teamId =
          mapping?.teamId ||
          data?.teamId;

        if (
          !roomCode ||
          !teamId
        ) {
          return;
        }

        liveMatches.delete(
          roomCode
        );

        restartAuction(
          roomCode,
          teamId,
          io
        );
      } catch (err) {
        console.error(
          '[Error] restart-auction:',
          err
        );
      }
    }
  );

  /* =======================================================
     SUBMIT LINEUP
  ======================================================= */

  socket.on(
    'submit-lineup',
    (data) => {
      try {
        const mapping =
          getSocketMapping(
            socket.id
          );

        const roomCode =
          mapping?.roomCode ||
          data?.roomCode ||
          data?.code;

        const teamId =
          mapping?.teamId ||
          data?.teamId;

        const playerIds =
          data?.playingXI ||
          data?.lineup ||
          data?.playerIds ||
          [];

        const impactPlayerId =
          data?.impactPlayerId ||
          null;

        if (
          !roomCode ||
          !teamId
        ) {
          socket.emit('error', {
            message:
              'Room or team not found',
          });

          return;
        }

        if (
          !Array.isArray(
            playerIds
          )
        ) {
          socket.emit('error', {
            message:
              'Invalid Playing XI',
          });

          return;
        }

        const room =
          getRoom(roomCode);

        if (!room) {
          socket.emit('error', {
            message:
              'Room not found',
          });

          return;
        }

        const team =
          room.teams.get(
            teamId
          );

        if (!team) {
          socket.emit('error', {
            message:
              'Team not found',
          });

          return;
        }

        /*
         * Save lineup using the
         * corrected roomManager
         * function.
         */
        const result =
          saveTeamLineup(
            roomCode,
            teamId,
            playerIds,
            impactPlayerId
          );

        if (!result.success) {
          socket.emit('error', {
            message:
              result.error ||
              'Invalid lineup',
          });

          return;
        }

        /*
         * Send updated room data.
         */
        io.to(
          roomCode
        ).emit(
          'room-updated',
          getRoomPublicData(room)
        );

        /*
         * Calculate rankings when
         * all connected teams that
         * have players submitted.
         */
        const activeTeams =
          Array.from(
            room.teams.values()
          ).filter(
            (t) =>
              t.isConnected &&
              t.squad.length > 0
          );

        const allSubmitted =
          activeTeams.length > 0 &&
          activeTeams.every(
            (t) =>
              t.lineupSubmitted
          );

        if (allSubmitted) {
          const rankings =
            calculateRankings(
              roomCode
            );

          room.rankings =
            rankings;

          io.to(
            roomCode
          ).emit(
            'room-updated',
            getRoomPublicData(room)
          );

          console.log(
            `[Rankings] Calculated for ${roomCode}`
          );
        }

        socket.emit(
          'notification',
          'Playing XI confirmed!'
        );
      } catch (err) {
        console.error(
          '[Error] submit-lineup:',
          err
        );

        socket.emit('error', {
          message:
            err instanceof Error
              ? err.message
              : 'Server error submitting lineup',
        });
      }
    }
  );

  /* =======================================================
     START MATCH
  ======================================================= */

  socket.on(
    'start-match',
    (data) => {
      try {
        const mapping =
          getSocketMapping(
            socket.id
          );

        const roomCode =
          mapping?.roomCode ||
          data?.roomCode ||
          data?.code;

        const teamId =
          mapping?.teamId ||
          data?.teamId;

        if (
          !roomCode ||
          !teamId
        ) {
          socket.emit('error', {
            message:
              'Room or team not found',
          });

          return;
        }

        const room =
          getRoom(roomCode);

        if (!room) {
          socket.emit('error', {
            message:
              'Room not found',
          });

          return;
        }

        /* -----------------------------------------------
           HOST ONLY
        ------------------------------------------------ */

        if (
          room.hostId !==
          teamId
        ) {
          const team =
            room.teams.get(
              teamId
            );

          if (
            !team?.isHost
          ) {
            socket.emit('error', {
              message:
                'Only host can start the match',
            });

            return;
          }
        }

        /* -----------------------------------------------
           GET TEAMS
        ------------------------------------------------ */

        const teams =
          Array.from(
            room.teams.values()
          ).filter(
            (team) =>
              team.isConnected
          );

        /*
         * We need at least two teams.
         */
        if (teams.length < 2) {
          socket.emit('error', {
            message:
              'Need at least 2 connected teams to start the match',
          });

          return;
        }

        /*
         * Use first two connected
         * teams as the match teams.
         */
        const team1 =
          teams[0];

        const team2 =
          teams[1];

        /* -----------------------------------------------
           AUTO-FILL EMPTY LINEUPS
        ------------------------------------------------ */

        for (
          const team of teams
        ) {
          const squadIds =
            team.squad
              .map(
                (item: any) =>
                  item?.player?.id ||
                  item?.id
              )
              .filter(
                Boolean
              );

          /*
           * If lineup is not submitted,
           * automatically use first 11.
           */
          if (
            !team.lineupSubmitted
          ) {
            const autoXI =
              squadIds.slice(
                0,
                Math.min(
                  11,
                  squadIds.length
                )
              );

            const autoLineup = {
              teamId: team.id,
              playingXI: autoXI,
              impactPlayerId:
                null,
              submitted: true,
            };

            team.lineup =
              autoLineup;

            team.lineupSubmitted =
              true;

            team.isReady = true;
          }
        }

        /* -----------------------------------------------
           VERIFY LINEUPS
        ------------------------------------------------ */

        if (
          !team1.lineup ||
          !team2.lineup
        ) {
          socket.emit('error', {
            message:
              'Both teams need a Playing XI',
          });

          return;
        }

        const team1XI =
          team1.lineup
            .playingXI || [];

        const team2XI =
          team2.lineup
            .playingXI || [];

        /*
         * At least 1 player per team.
         */
        if (
          team1XI.length < 1 ||
          team2XI.length < 1
        ) {
          socket.emit('error', {
            message:
              'Both teams need at least 1 player in their Playing XI',
          });

          return;
        }

        /* -----------------------------------------------
           OVERS
        ------------------------------------------------ */

        const requestedOvers =
          Number(
            data?.overs
          );

        const validOvers =
          [2, 5, 10, 20].includes(
            requestedOvers
          )
            ? requestedOvers
            : 5;

        /* -----------------------------------------------
           INITIALIZE MATCH
        ------------------------------------------------ */

        const match =
          initializeMatch(
            roomCode,

            team1.id,

            team1.lineup,

            team1.squad,

            team2.id,

            team2.lineup,

            team2.squad,

            validOvers
          );

        liveMatches.set(
          roomCode,
          match
        );

        room.gameState =
          'MATCH_PLAYING';

        /*
         * Send updated room.
         */
        io.to(
          roomCode
        ).emit(
          'room-updated',
          getRoomPublicData(room)
        );

        /*
         * Send match state.
         */
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
          `Match started — ${validOvers} overs!`
        );

        console.log(
          `[Match] Started: ${roomCode} — ${validOvers} overs`
        );
      } catch (err) {
        console.error(
          '[Error] start-match:',
          err
        );

        socket.emit('error', {
          message:
            err instanceof Error
              ? err.message
              : 'Server error starting match',
        });
      }
    }
  );

  /* =======================================================
     SUBMIT DELIVERY
  ======================================================= */

  socket.on(
    'submit-delivery',
    (data) => {
      try {
        const mapping =
          getSocketMapping(
            socket.id
          );

        const roomCode =
          mapping?.roomCode ||
          data?.roomCode;

        const teamId =
          mapping?.teamId ||
          data?.teamId;

        if (!roomCode) {
          return;
        }

        const match =
          liveMatches.get(
            roomCode
          );

        if (!match) {
          socket.emit('error', {
            message:
              'Match not found',
          });

          return;
        }

        if (
          match.phase !==
          'AWAITING_DELIVERY'
        ) {
          return;
        }

        const innings =
          match.currentInnings === 1
            ? match.innings1
            : match.innings2;

        if (!innings) {
          return;
        }

        if (
          teamId !==
          innings.bowlingTeamId
        ) {
          socket.emit('error', {
            message:
              'You are not the bowling team right now',
          });

          return;
        }

        const delivery =
          data?.delivery ||
          data;

        match.pendingDelivery =
          delivery;

        match.phase =
          'BALL_IN_FLIGHT';

        liveMatches.set(
          roomCode,
          match
        );

        io.to(
          roomCode
        ).emit(
          'match-updated',
          match
        );
      } catch (err) {
        console.error(
          '[Error] submit-delivery:',
          err
        );

        socket.emit('error', {
          message:
            'Server error submitting delivery',
        });
      }
    }
  );

  /* =======================================================
     SUBMIT SHOT
  ======================================================= */

  socket.on(
    'submit-shot',
    (data) => {
      try {
        const mapping =
          getSocketMapping(
            socket.id
          );

        const roomCode =
          mapping?.roomCode ||
          data?.roomCode;

        const teamId =
          mapping?.teamId ||
          data?.teamId;

        if (!roomCode) {
          return;
        }

        const match =
          liveMatches.get(
            roomCode
          );

        if (
          !match ||
          !match.pendingDelivery
        ) {
          return;
        }

        if (
          match.phase !==
          'BALL_IN_FLIGHT'
        ) {
          return;
        }

        const innings =
          match.currentInnings === 1
            ? match.innings1
            : match.innings2;

        if (!innings) {
          return;
        }

        if (
          teamId !==
          innings.battingTeamId
        ) {
          socket.emit('error', {
            message:
              'You are not the batting team right now',
          });

          return;
        }

        const striker =
          innings.battingLineup.find(
            (player: {
              id: string;
            }) =>
              player.id ===
              innings.strikerId
          );

        const bowler =
          innings.bowlingLineup.find(
            (player: {
              id: string;
            }) =>
              player.id ===
              innings.currentBowlerId
          );

        if (
          !striker ||
          !bowler
        ) {
          socket.emit('error', {
            message:
              'Striker or bowler not found',
          });

          return;
        }

        const shot =
          data?.shot ||
          data;

        const outcome =
          calculateBallOutcome(
            match.pendingDelivery,
            shot,
            striker,
            bowler,
            innings.isFreeHitActive
          );

        match.lastOutcome =
          outcome;

        match.pendingDelivery =
          undefined;

        match.phase =
          'RESULT_SHOWCASE';

        const updatedMatch =
          applyBallResult(
            match,
            outcome
          );

        liveMatches.set(
          roomCode,
          updatedMatch
        );

        io.to(
          roomCode
        ).emit(
          'match-updated',
          updatedMatch
        );

        /*
         * Wait before next delivery.
         */
        setTimeout(() => {
          const currentMatch =
            liveMatches.get(
              roomCode
            );

          if (!currentMatch) {
            return;
          }

          /*
           * Match over.
           */
          if (
            currentMatch.phase ===
            'MATCH_OVER'
          ) {
            const room =
              getRoom(
                roomCode
              );

            if (room) {
              room.gameState =
                'FINISHED';

              io.to(
                roomCode
              ).emit(
                'room-updated',
                getRoomPublicData(
                  room
                )
              );
            }

            io.to(
              roomCode
            ).emit(
              'match-updated',
              currentMatch
            );

            return;
          }

          /*
           * Continue match.
           */
          currentMatch.phase =
            'AWAITING_DELIVERY';

          liveMatches.set(
            roomCode,
            currentMatch
          );

          io.to(
            roomCode
          ).emit(
            'match-updated',
            currentMatch
          );
        }, 4000);
      } catch (err) {
        console.error(
          '[Error] submit-shot:',
          err
        );

        socket.emit('error', {
          message:
            err instanceof Error
              ? err.message
              : 'Server error submitting shot',
        });
      }
    }
  );

  /* =======================================================
     DISCONNECT
  ======================================================= */

  socket.on(
    'disconnect',
    (reason) => {
      try {
        console.log(
          `[Socket] Disconnected: ${socket.id} (${reason})`
        );

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

        if (!room) {
          return;
        }

        io.to(
          result.roomCode
        ).emit(
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
      } catch (err) {
        console.error(
          '[Error] disconnect:',
          err
        );
      }
    }
  );
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  '/api/health',
  (_req, res) => {
    res.json({
      status: 'ok',

      uptime:
        process.uptime(),

      environment:
        process.env.NODE_ENV ||
        'development',
    });
  }
);

/* =========================================================
   PRODUCTION SPA
========================================================= */

if (
  process.env.NODE_ENV ===
  'production'
) {
  app.get(
    '*',
    (_req, res) => {
      res.sendFile(
        path.join(
          __dirname,
          '../../client/dist/index.html'
        )
      );
    }
  );
}

/* =========================================================
   START SERVER
========================================================= */

httpServer.listen(
  port,
  '0.0.0.0',
  () => {
    console.log(
      `🏏 IPL Auction Battle Server running on port ${port}`
    );

    console.log(
      `Environment: ${
        process.env.NODE_ENV ||
        'development'
      }`
    );

    console.log(
      `Client URL: ${clientUrl}`
    );
  }
);

This version matches the corrected "roomManager.ts" I sent immediately before it.

One important point: the "initializeMatch(...)" call must exactly match your current "server/matchEngine.ts" function signature. If Render now reports an error specifically on "initializeMatch", send me your entire "matchEngine.ts", and I can make the server and match engine match exactly.
