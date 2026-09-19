// client/src/components/BidControls.tsx
import React from 'react';
import { useGame } from '../context/GameContext';
import './BidControls.css';

function BidControls() {
  const {
    roomData,
    myTeamId,
    myTeam,
    skippedPlayers,
    placeBid,
    skipPlayer
  } = useGame();

  if (!roomData || !myTeam) {
    return null;
  }

  const auction = roomData.auction;
  const currentPlayer = auction.currentPlayer;

  if (currentPlayer === null) {
    return null;
  }

  const isAuctionActive =
    roomData.gameState === 'AUCTION';

  const isPaused =
    roomData.gameState === 'PAUSED';

  const hasSkipped =
    skippedPlayers.includes(currentPlayer.id);

  const isHighestBidder =
    auction.highestBidderId === myTeamId;

  // Skip is only allowed before the first bid on this player
  const hasBiddingStarted =
    auction.highestBidderId !== null;

  const nextBid = auction.highestBidderId
    ? Math.round(
        (auction.currentBid + auction.bidIncrement) * 100
      ) / 100
    : auction.currentBid;

  const canAfford =
    myTeam.purse >= nextBid;

  const isSquadFull =
    myTeam.squadSize >= myTeam.maxSquadSize;

  const canBid =
    isAuctionActive &&
    !hasSkipped &&
    !isHighestBidder &&
    canAfford &&
    !isSquadFull &&
    !isPaused;

  const canSkip =
    !hasBiddingStarted &&
    !hasSkipped &&
    (isAuctionActive || roomData.gameState === 'PLAYER_REVEAL');

  return (
    <div className="bid-controls">

      <div className="bid-info-row">

        <div className="bid-info-item">
          <span className="bid-info-label">
            Current Bid
          </span>

          <span className="bid-info-value bid-value">
            ₹{auction.currentBid.toFixed(2)} Cr
          </span>
        </div>

        <div className="bid-info-item">
          <span className="bid-info-label">
            Highest Bidder
          </span>

          <span
            className={`bid-info-value ${
              isHighestBidder ? 'you-text' : ''
            }`}
          >
            {auction.highestBidderName || 'No bids yet'}

            {isHighestBidder && ' (You!)'}
          </span>
        </div>

      </div>

      <div className="bid-purse-row">

        <span className="purse-label">
          Your Purse
        </span>

        <span className="purse-value">
          ₹{myTeam.purse.toFixed(2)} Cr
        </span>

        <span className="squad-count">
          {myTeam.squadSize}/{myTeam.maxSquadSize} players
        </span>

      </div>

      {hasSkipped ? (

        <div className="skipped-banner">
          🚫 SKIPPED — You cannot bid on this player
        </div>

      ) : isSquadFull ? (

        <div className="skipped-banner">
          📋 Squad Full — Cannot purchase more players
        </div>

      ) : (

        <div className="bid-buttons">

          <button
            className={`btn-bid ${
              canBid ? '' : 'disabled'
            } ${
              isHighestBidder ? 'highest' : ''
            }`}
            onClick={placeBid}
            disabled={!canBid}
          >

            {isHighestBidder ? (

              <>
                ✅ You are the highest bidder
              </>

            ) : !canAfford ? (

              <>
                💰 Cannot afford ₹{nextBid.toFixed(2)} Cr
              </>

            ) : isPaused ? (

              <>
                ⏸️ Auction Paused
              </>

            ) : (

              <>
                💰 BID ₹{nextBid.toFixed(2)} Cr

                <span className="bid-increment">
                  (+₹{auction.bidIncrement.toFixed(2)} Cr)
                </span>
              </>

            )}

          </button>

          {/* Skip only visible before any bid is placed */}
          {canSkip && (
            <button
              className="btn-skip"
              onClick={skipPlayer}
            >
              ⏭️ SKIP
            </button>
          )}

        </div>

      )}

    </div>
  );
}

export default BidControls;
