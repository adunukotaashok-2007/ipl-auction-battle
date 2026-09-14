// server/auctionManager.ts
import { Room, Player } from './types';
import { getRoom, getRoomPublicData } from './roomManager';
import { Server } from 'socket.io';

const auctionTimers = new Map<string, NodeJS.Timeout>();

export function startAuction(roomCode: string, io: Server): boolean {
  const room = getRoom(roomCode);
  if (!room) return false;

  if (room.gameState !== 'LOBBY') return false;

  let readyCount = 0;
  let connectedCount = 0;
  for (const [, team] of room.teams) {
    if (team.isConnected) {
      connectedCount++;
      if (team.isReady || team.isHost) readyCount++;
    }
  }

  if (connectedCount < 2) return false;

  room.gameState = 'PLAYER_REVEAL';
  room.auction.currentPlayerIndex = 0;

  moveToNextPlayer(roomCode, io);
  return true;
}

export function moveToNextPlayer(roomCode: string, io: Server): void {
  const room = getRoom(roomCode);
  if (!room) return;

  clearAuctionTimer(roomCode);

  // Find next un-auctioned player
  let nextIndex = room.auction.currentPlayerIndex;
  
  if (nextIndex >= room.auctionOrder.length) {
    // All players processed
    room.gameState = 'FINISHED';
    io.to(roomCode).emit('room-updated', getRoomPublicData(room));
    io.to(roomCode).emit('auction-finished');
    return;
  }

  const playerId = room.auctionOrder[nextIndex];
  const player = room.playerPool.find((p) => p.id === playerId);

  if (!player) {
    room.auction.currentPlayerIndex++;
    moveToNextPlayer(roomCode, io);
    return;
  }

  // Check if ALL connected teams have skipped this player
  let allSkipped = true;
  for (const [, team] of room.teams) {
    if (team.isConnected && team.squad.length < team.maxSquadSize) {
      if (!team.skippedPlayers.includes(playerId)) {
        // Check if team can afford base price
        if (team.purse >= player.basePrice) {
          allSkipped = false;
          break;
        }
      }
    }
  }

  if (allSkipped) {
    // Mark as unsold and move on
    room.auction.auctionedPlayerIds.push(playerId);
    room.auction.unsoldPlayers.push(playerId);
    room.auction.currentPlayerIndex++;
    
    if (room.auction.currentPlayerIndex >= room.auctionOrder.length) {
      room.gameState = 'FINISHED';
      io.to(roomCode).emit('room-updated', getRoomPublicData(room));
      io.to(roomCode).emit('auction-finished');
      return;
    }
    
    moveToNextPlayer(roomCode, io);
    return;
  }

  room.auction.currentPlayer = player;
  room.auction.currentBid = player.basePrice;
  room.auction.highestBidderId = null;
  room.auction.highestBidderName = null;
  room.auction.auctionTimer = room.settings.auctionTimerSeconds;
  room.auction.bidIncrement = calculateBidIncrement(player.basePrice);
  room.gameState = 'PLAYER_REVEAL';

  io.to(roomCode).emit('room-updated', getRoomPublicData(room));

  // Send each team their skip list
  for (const [, team] of room.teams) {
    if (team.isConnected) {
      const socket = io.sockets.sockets.get(team.socketId);
      if (socket) {
        socket.emit('your-skip-list', { skippedPlayers: team.skippedPlayers });
      }
    }
  }

  // Wait 3 seconds then start auction
  setTimeout(() => {
    const r = getRoom(roomCode);
    if (r && r.gameState === 'PLAYER_REVEAL') {
      r.gameState = 'AUCTION';
      io.to(roomCode).emit('room-updated', getRoomPublicData(r));
      startAuctionTimer(roomCode, io);
    }
  }, 3000);
}

function calculateBidIncrement(currentBid: number): number {
  if (currentBid < 1) return 0.10;
  if (currentBid < 5) return 0.25;
  if (currentBid < 10) return 0.50;
  if (currentBid < 20) return 1.00;
  return 2.00;
}

export function placeBid(roomCode: string, teamId: string, io: Server): { success: boolean; error?: string } {
  const room = getRoom(roomCode);
  if (!room) return { success: false, error: 'Room not found' };

  if (room.gameState !== 'AUCTION') return { success: false, error: 'Auction not active' };

  const team = room.teams.get(teamId);
  if (!team) return { success: false, error: 'Team not found' };

  if (!team.isConnected) return { success: false, error: 'Team disconnected' };

  const currentPlayer = room.auction.currentPlayer;
  if (!currentPlayer) return { success: false, error: 'No player in auction' };

  // Check if team has skipped this player
  if (team.skippedPlayers.includes(currentPlayer.id)) {
    return { success: false, error: 'You have skipped this player' };
  }

  // Check squad limit
  if (team.squad.length >= team.maxSquadSize) {
    return { success: false, error: 'Squad is full' };
  }

  // Calculate new bid
  let newBid: number;
  if (room.auction.highestBidderId === null) {
    // First bid is at base price
    newBid = room.auction.currentBid;
  } else {
    newBid = room.auction.currentBid + room.auction.bidIncrement;
  }

  newBid = Math.round(newBid * 100) / 100;

  // Check if team can afford
  if (team.purse < newBid) {
    return { success: false, error: 'Insufficient purse' };
  }

  // Check minimum remaining purse for remaining slots
  const remainingSlots = team.maxSquadSize - team.squad.length - 1; // -1 for current player
  // We don't strictly enforce minimum per slot, but we should ensure they can fill remaining slots at minimum price
  // For simplicity, just check they can afford this bid

  room.auction.currentBid = newBid;
  room.auction.highestBidderId = teamId;
  room.auction.highestBidderName = team.teamName;
  room.auction.bidIncrement = calculateBidIncrement(newBid);
  room.auction.auctionTimer = room.settings.auctionTimerSeconds;

  // Reset timer
  clearAuctionTimer(roomCode);
  startAuctionTimer(roomCode, io);

  io.to(roomCode).emit('bid-placed', {
    teamId,
    teamName: team.teamName,
    amount: newBid,
  });
  io.to(roomCode).emit('room-updated', getRoomPublicData(room));

  return { success: true };
}

export function skipPlayer(roomCode: string, teamId: string, io: Server): { success: boolean; error?: string } {
  const room = getRoom(roomCode);
  if (!room) return { success: false, error: 'Room not found' };

  if (room.gameState !== 'AUCTION' && room.gameState !== 'PLAYER_REVEAL') {
    return { success: false, error: 'Cannot skip now' };
  }

  const team = room.teams.get(teamId);
  if (!team) return { success: false, error: 'Team not found' };

  const currentPlayer = room.auction.currentPlayer;
  if (!currentPlayer) return { success: false, error: 'No player in auction' };

  // Check if already skipped
  if (team.skippedPlayers.includes(currentPlayer.id)) {
    return { success: false, error: 'Already skipped this player' };
  }

  // Add to team's skip list (NOT global)
  team.skippedPlayers.push(currentPlayer.id);

  io.to(roomCode).emit('player-skipped', {
    teamId,
    playerId: currentPlayer.id,
  });

  // Send updated skip list to the specific team
  const socket = io.sockets.sockets.get(team.socketId);
  if (socket) {
    socket.emit('your-skip-list', { skippedPlayers: team.skippedPlayers });
  }

  // If this team was the highest bidder and they skip... shouldn't happen normally
  // But if they somehow skip while being highest bidder, remove their bid
  if (room.auction.highestBidderId === teamId) {
    room.auction.highestBidderId = null;
    room.auction.highestBidderName = null;
    room.auction.currentBid = currentPlayer.basePrice;
  }

  // Check if ALL eligible teams have now skipped
  let anyCanBid = false;
  for (const [, t] of room.teams) {
    if (t.isConnected && t.squad.length < t.maxSquadSize && !t.skippedPlayers.includes(currentPlayer.id) && t.purse >= currentPlayer.basePrice) {
      anyCanBid = true;
      break;
    }
  }

  if (!anyCanBid && !room.auction.highestBidderId) {
    // Everyone skipped and no bid placed → UNSOLD
    clearAuctionTimer(roomCode);
    room.gameState = 'UNSOLD';
    room.auction.auctionedPlayerIds.push(currentPlayer.id);
    room.auction.unsoldPlayers.push(currentPlayer.id);

    io.to(roomCode).emit('player-unsold', { player: currentPlayer });
    io.to(roomCode).emit('room-updated', getRoomPublicData(room));

    // Move to next player after delay
    setTimeout(() => {
      room.auction.currentPlayerIndex++;
      moveToNextPlayer(roomCode, io);
    }, 3000);

    return { success: true };
  }

  io.to(roomCode).emit('room-updated', getRoomPublicData(room));
  return { success: true };
}

function startAuctionTimer(roomCode: string, io: Server): void {
  clearAuctionTimer(roomCode);

  const interval = setInterval(() => {
    const room = getRoom(roomCode);
    if (!room || room.gameState !== 'AUCTION' || room.auction.isPaused) {
      clearInterval(interval);
      auctionTimers.delete(roomCode);
      return;
    }

    room.auction.auctionTimer--;

    io.to(roomCode).emit('timer-update', { timer: room.auction.auctionTimer });

    if (room.auction.auctionTimer <= 0) {
      clearInterval(interval);
      auctionTimers.delete(roomCode);
      resolveAuction(roomCode, io);
    }
  }, 1000);

  auctionTimers.set(roomCode, interval);
}

function clearAuctionTimer(roomCode: string): void {
  const timer = auctionTimers.get(roomCode);
  if (timer) {
    clearInterval(timer);
    auctionTimers.delete(roomCode);
  }
}

function resolveAuction(roomCode: string, io: Server): void {
  const room = getRoom(roomCode);
  if (!room) return;

  const currentPlayer = room.auction.currentPlayer;
  if (!currentPlayer) return;

  if (room.auction.highestBidderId) {
    // SOLD
    const winningTeam = room.teams.get(room.auction.highestBidderId);
    if (winningTeam) {
      const price = room.auction.currentBid;

      room.gameState = 'SOLD';
      winningTeam.purse = Math.round((winningTeam.purse - price) * 100) / 100;
      winningTeam.squad.push({ player: currentPlayer, purchasePrice: price });
      room.auction.auctionedPlayerIds.push(currentPlayer.id);
      room.auction.soldPlayers.push({
        player: currentPlayer,
        teamId: winningTeam.id,
        price,
      });

      io.to(roomCode).emit('player-sold', {
        player: currentPlayer,
        teamId: winningTeam.id,
        teamName: winningTeam.teamName,
        price,
      });
    }
  } else {
    // UNSOLD
    room.gameState = 'UNSOLD';
    room.auction.auctionedPlayerIds.push(currentPlayer.id);
    room.auction.unsoldPlayers.push(currentPlayer.id);

    io.to(roomCode).emit('player-unsold', { player: currentPlayer });
  }

  io.to(roomCode).emit('room-updated', getRoomPublicData(room));

  // Move to next player after 4 seconds
  setTimeout(() => {
    const r = getRoom(roomCode);
    if (r) {
      r.auction.currentPlayerIndex++;
      moveToNextPlayer(roomCode, io);
    }
  }, 4000);
}

export function pauseAuction(roomCode: string, teamId: string, io: Server): boolean {
  const room = getRoom(roomCode);
  if (!room) return false;

  if (room.hostId !== teamId) return false;
  if (room.gameState !== 'AUCTION') return false;

  room.auction.isPaused = true;
  room.gameState = 'PAUSED';
  clearAuctionTimer(roomCode);

  io.to(roomCode).emit('room-updated', getRoomPublicData(room));
  return true;
}

export function resumeAuction(roomCode: string, teamId: string, io: Server): boolean {
  const room = getRoom(roomCode);
  if (!room) return false;

  if (room.hostId !== teamId) return false;
  if (room.gameState !== 'PAUSED') return false;

  room.auction.isPaused = false;
  room.gameState = 'AUCTION';
  startAuctionTimer(roomCode, io);

  io.to(roomCode).emit('room-updated', getRoomPublicData(room));
  return true;
}

export function hostNextPlayer(roomCode: string, teamId: string, io: Server): boolean {
  const room = getRoom(roomCode);
  if (!room) return false;

  if (room.hostId !== teamId) return false;
  if (room.gameState === 'LOBBY' || room.gameState === 'FINISHED') return false;

  clearAuctionTimer(roomCode);

  // Force unsold if currently auctioning
  if (room.auction.currentPlayer && room.gameState === 'AUCTION') {
    const currentPlayer = room.auction.currentPlayer;
    if (!room.auction.highestBidderId) {
      room.auction.auctionedPlayerIds.push(currentPlayer.id);
      room.auction.unsoldPlayers.push(currentPlayer.id);
      io.to(roomCode).emit('player-unsold', { player: currentPlayer });
    }
  }

  room.auction.currentPlayerIndex++;
  moveToNextPlayer(roomCode, io);
  return true;
}

export function endAuction(roomCode: string, teamId: string, io: Server): boolean {
  const room = getRoom(roomCode);
  if (!room) return false;

  if (room.hostId !== teamId) return false;

  clearAuctionTimer(roomCode);
  room.gameState = 'FINISHED';

  io.to(roomCode).emit('room-updated', getRoomPublicData(room));
  io.to(roomCode).emit('auction-finished');
  return true;
}

export function restartAuction(roomCode: string, teamId: string, io: Server): boolean {
  const room = getRoom(roomCode);
  if (!room) return false;

  if (room.hostId !== teamId) return false;

  clearAuctionTimer(roomCode);

  // Reset everything
  for (const [, team] of room.teams) {
    team.purse = team.initialPurse;
    team.squad = [];
    team.skippedPlayers = [];
    team.isReady = false;
  }

  room.auction = {
    currentPlayer: null,
    currentBid: 0,
    highestBidderId: null,
    highestBidderName: null,
    auctionTimer: room.settings.auctionTimerSeconds,
    maxTimer: room.settings.auctionTimerSeconds,
    bidIncrement: room.settings.bidIncrement,
    auctionedPlayerIds: [],
    soldPlayers: [],
    unsoldPlayers: [],
    currentPlayerIndex: -1,
    totalPlayers: room.playerPool.length,
    auctionRound: 1,
    isPaused: false,
  };

  room.gameState = 'LOBBY';

  // Re-shuffle
  const shuffled = [...room.playerPool].sort(() => Math.random() - 0.5);
  room.playerPool = shuffled;
  room.auctionOrder = shuffled.map((p) => p.id);

  io.to(roomCode).emit('room-updated', getRoomPublicData(room));
  return true;
}
