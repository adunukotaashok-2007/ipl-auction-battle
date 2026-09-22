import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { TeamPublicData, PurchasedPlayer } from '../types';
import './FinishScreen.css';

export const FinishScreen: React.FC = () => {
  const {
    roomData,
    myTeamId,
    isHost,
    submitLineup,
    startMatch,
    error,
  } = useGame();

  const [selectedOvers, setSelectedOvers] = useState<number>(5);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<
    'lineup' | 'rivals' | 'standings'
  >('lineup');

  const [selectedRivalId, setSelectedRivalId] =
    useState<string | null>(null);

  const [lineupLocked, setLineupLocked] = useState(false);

  if (!roomData) return null;

  const teams = roomData.teams || [];

  const hostCheck =
    isHost ||
    roomData.hostId === myTeamId;

  const myTeam =
    teams.find(
      (t: TeamPublicData) => t.id === myTeamId
    ) || null;

  // --------------------------------------------------
  // PURSE
  // --------------------------------------------------

  const getPurseLeft = (
    team: TeamPublicData
  ): number => {
    const p: any = (team as any).purse;

    if (typeof p === 'number') {
      return p;
    }

    if (
      p &&
      typeof p.remaining === 'number'
    ) {
      return p.remaining;
    }

    return 0;
  };

  // --------------------------------------------------
  // PLAYER NORMALIZER
  // --------------------------------------------------

  const getPlayerFromSquadItem = (item: any) => {
    if (!item) return null;

    if (item.player) {
      return item.player;
    }

    return item;
  };

  const getPlayerId = (item: any): string => {
    const p = getPlayerFromSquadItem(item);

    return p?.id || '';
  };

  // --------------------------------------------------
  // LINEUP STATUS
  // --------------------------------------------------

  const allLineupsSubmitted = teams.every(
    (t: TeamPublicData) =>
      !!(t as any).lineupSubmitted ||
      (
        (t as any).lineup &&
        (t as any).lineup.length > 0
      ) ||
      !!(t as any).isReady
  );

  const myLineupAlreadyIn = !!(
    (myTeam as any)?.lineupSubmitted ||
    (
      (myTeam as any)?.lineup &&
      (myTeam as any).lineup.length > 0
    ) ||
    (myTeam as any)?.isReady
  );

  // --------------------------------------------------
  // PLAYER SELECTION
  // --------------------------------------------------

  const togglePlayerSelection = (
    playerId: string
  ) => {
    if (
      lineupLocked ||
      myLineupAlreadyIn ||
      !playerId
    ) {
      return;
    }

    if (
      selectedPlayerIds.includes(playerId)
    ) {
      setSelectedPlayerIds(
        selectedPlayerIds.filter(
          (id) => id !== playerId
        )
      );
    } else {
      const squadLen =
        myTeam?.squad?.length || 0;

      const maxPick = Math.min(
        11,
        Math.max(2, squadLen)
      );

      if (
        selectedPlayerIds.length >= maxPick
      ) {
        return;
      }

      setSelectedPlayerIds([
        ...selectedPlayerIds,
        playerId,
      ]);
    }
  };

  // --------------------------------------------------
  // CONFIRM LINEUP
  // --------------------------------------------------

  const handleConfirmLineup = () => {
    const squadLen =
      myTeam?.squad?.length || 0;

    const minRequired = Math.min(
      11,
      Math.max(2, squadLen)
    );

    if (
      selectedPlayerIds.length <
        minRequired &&
      squadLen >= minRequired
    ) {
      return;
    }

    if (
      selectedPlayerIds.length < 2 &&
      squadLen >= 2
    ) {
      return;
    }

    submitLineup(selectedPlayerIds);

    setLineupLocked(true);
  };

  // --------------------------------------------------
  // START MATCH
  // --------------------------------------------------

  const handleStartMatch = () => {
    if (!hostCheck) return;

    if (!allLineupsSubmitted) return;

    startMatch(selectedOvers);
  };

  // --------------------------------------------------
  // SORT TEAMS
  // --------------------------------------------------

  const sortedTeams = [...teams].sort(
    (a, b) =>
      getPurseLeft(b) -
      getPurseLeft(a)
  );

  // --------------------------------------------------
  // ACTIVE RIVAL
  // --------------------------------------------------

  const activeRival =
    teams.find(
      (t) =>
        t.id ===
        (
          selectedRivalId ||
          teams[0]?.id
        )
    ) || null;

  // --------------------------------------------------
  // MONEY FORMAT
  // --------------------------------------------------

  const formatCr = (value: number) =>
    `₹${(
      value / 10000000
    ).toFixed(2)} Cr`;

  const formatPurseDisplay = (
    team: TeamPublicData
  ) => {
    const raw = getPurseLeft(team);

    if (
      raw > 0 &&
      raw < 100000
    ) {
      return `₹${(
        raw / 100
      ).toFixed(2)} Cr`;
    }

    return formatCr(raw);
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="finish-screen">

      <div className="finish-overlay" />

      <div className="finish-container">

        {/* HEADER */}

        <div className="finish-header">

          <div className="trophy-badge">
            🏆
          </div>

          <h1 className="finish-title">
            AUCTION COMPLETED
          </h1>

          <p className="finish-subtitle">
            Select Playing XI • Scout Rivals • Host Starts Match
          </p>

        </div>

        {/* TABS */}

        <div
          className="finish-tabs"
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >

          <button
            type="button"
            className={`tab-btn ${
              activeTab === 'lineup'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActiveTab('lineup')
            }
          >
            🏏 My Playing XI
          </button>

          <button
            type="button"
            className={`tab-btn ${
              activeTab === 'rivals'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActiveTab('rivals')
            }
          >
            🔍 All Teams / Rivals
          </button>

          <button
            type="button"
            className={`tab-btn ${
              activeTab === 'standings'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActiveTab('standings')
            }
          >
            📊 Standings
          </button>

        </div>

        {/* STANDINGS */}

        {activeTab === 'standings' && (
          <div className="rankings-container">

            <h2 className="section-heading">
              Team Standings
            </h2>

            <div className="rankings-grid">

              {sortedTeams.map(
                (
                  team: TeamPublicData,
                  index: number
                ) => {

                  const rankIcon =
                    index === 0
                      ? '🥇'
                      : index === 1
                      ? '🥈'
                      : index === 2
                      ? '🥉'
                      : `#${index + 1}`;

                  const isMyTeam =
                    team.id === myTeamId;

                  const ready =
                    !!(team as any)
                      .lineupSubmitted ||
                    !!(team as any)
                      .isReady ||
                    (
                      (team as any)
                        .lineup &&
                      (team as any)
                        .lineup.length > 0
                    );

                  return (
                    <div
                      key={team.id}
                      className={`rank-card ${
                        isMyTeam
                          ? 'is-me'
                          : ''
                      }`}
                      style={{
                        borderLeftColor:
                          team.teamColor ||
                          '#3b82f6',
                      }}
                    >

                      <div className="rank-badge">
                        {rankIcon}
                      </div>

                      <div className="team-details">

                        <div className="team-title-row">

                          <span className="team-logo">
                            {team.teamLogo || '🏏'}
                          </span>

                          <span className="team-name">
                            {team.teamName}
                          </span>

                          <span className="manager-tag">
                            (
                            {team.playerName ||
                              'Manager'}
                            )
                          </span>

                        </div>

                        <div className="team-stats-row">

                          <span>
                            Squad:{' '}
                            <strong>
                              {team.squad?.length || 0}
                            </strong>
                          </span>

                          <span className="dot">
                            •
                          </span>

                          <span>
                            Purse Left:{' '}
                            <strong>
                              {formatPurseDisplay(
                                team
                              )}
                            </strong>
                          </span>

                        </div>

                      </div>

                      <div className="status-indicator">

                        {ready ? (
                          <span className="badge-ready">
                            READY ✓
                          </span>
                        ) : (
                          <span className="badge-pending">
                            SELECTING...
                          </span>
                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          </div>
        )}

        {/* RIVALS */}

        {activeTab === 'rivals' && (
          <div className="rivals-container">

            <h2 className="section-heading">
              All Teams Inspector
            </h2>

            <p
              style={{
                textAlign: 'center',
                opacity: 0.75,
                marginTop: 0,
              }}
            >
              Every manager can view every franchise
              squad before match start.
            </p>

            <div
              className="team-selector-tabs"
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 16,
              }}
            >

              {teams.map((team) => (

                <button
                  key={team.id}
                  type="button"
                  className={`team-tab ${
                    activeRival?.id === team.id
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    setSelectedRivalId(team.id)
                  }
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border:
                      activeRival?.id === team.id
                        ? '2px solid #a855f7'
                        : '1px solid rgba(255,255,255,0.15)',
                    background:
                      activeRival?.id === team.id
                        ? 'rgba(124,58,237,0.35)'
                        : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >

                  {team.teamLogo || '🏏'}{' '}
                  {team.teamName}

                  {team.id === myTeamId
                    ? ' (YOU)'
                    : ''}

                </button>

              ))}

            </div>

            {activeRival && (
              <div
                className="rival-team-details"
                style={{
                  background:
                    'rgba(15,23,42,0.85)',
                  border:
                    '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: 16,
                }}
              >

                <div
                  className="team-stats-summary"
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 12,
                    fontWeight: 700,
                    color: '#f59e0b',
                  }}
                >

                  <span>
                    💰 Purse Left:{' '}
                    {formatPurseDisplay(
                      activeRival
                    )}
                  </span>

                  <span>
                    👥 Squad:{' '}
                    {activeRival.squad?.length || 0}
                  </span>

                  <span>
                    Status:{' '}
                    {
                      (
                        activeRival as any
                      ).lineupSubmitted ||
                      (
                        activeRival as any
                      ).isReady
                        ? 'READY ✓'
                        : 'SELECTING...'
                    }
                  </span>

                </div>

                <div className="rival-squad-list">

                  {(activeRival.squad || [])
                    .length === 0 && (
                    <p className="empty-squad-notice">
                      No players in this squad yet.
                    </p>
                  )}

                  {(activeRival.squad || [])
                    .map(
                      (
                        item: any,
                        idx: number
                      ) => {

                        const p =
                          getPlayerFromSquadItem(
                            item
                          );

                        if (!p) return null;

                        return (
                          <div
                            key={
                              p.id || idx
                            }
                            className="rival-player-row"
                            style={{
                              display: 'flex',
                              justifyContent:
                                'space-between',
                              gap: 8,
                              padding:
                                '8px 10px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                            }}
                          >

                            <span>
                              #{idx + 1}
                            </span>

                            <span
                              style={{
                                flex: 1,
                              }}
                            >
                              {p.name}{' '}
                              {p.isOverseas
                                ? '✈️'
                                : ''}
                            </span>

                            <span
                              style={{
                                opacity: 0.8,
                              }}
                            >
                              {p.role}
                            </span>

                            {typeof item.price ===
                              'number' && (
                              <span
                                style={{
                                  color:
                                    '#4ade80',
                                }}
                              >
                                {formatCr(
                                  item.price
                                )}
                              </span>
                            )}

                          </div>
                        );
                      }
                    )}

                </div>

              </div>
            )}

          </div>
        )}

        {/* MY PLAYING XI */}

        {activeTab === 'lineup' &&
          myTeam && (
            <div
              className="lineup-builder-card"
              style={{
                borderColor:
                  myTeam.teamColor ||
                  '#3b82f6',
              }}
            >

              <div className="builder-header">

                <h3>
                  🏏 Select Your Playing XI (
                  {myTeam.teamName}
                  )
                </h3>

                <p>
                  Tap players from your bought
                  squad.

                  {(myTeam.squad?.length || 0) >=
                  11
                    ? ' Select exactly 11 players.'
                    : ' Select at least 2 players (or your full squad).'}
                </p>

              </div>

              {(myTeam.squad || []).length ===
              0 ? (
                <p className="empty-squad-notice">
                  No players bought during auction.
                </p>
              ) : (
                <div className="squad-selector-grid">

                  {(myTeam.squad as any[]).map(
                    (
                      item:
                        | PurchasedPlayer
                        | any,
                      idx: number
                    ) => {

                      const player =
                        getPlayerFromSquadItem(
                          item
                        );

                      if (!player) return null;

                      const pid = player.id;

                      const isSelected =
                        selectedPlayerIds.includes(
                          pid
                        );

                      return (
                        <div
                          key={
                            pid || idx
                          }
                          className={`squad-select-pill ${
                            isSelected
                              ? 'selected'
                              : ''
                          }`}
                          onClick={() =>
                            togglePlayerSelection(
                              pid
                            )
                          }
                          style={{
                            opacity:
                              lineupLocked ||
                              myLineupAlreadyIn
                                ? 0.7
                                : 1,
                            cursor:
                              lineupLocked ||
                              myLineupAlreadyIn
                                ? 'default'
                                : 'pointer',
                          }}
                        >

                          <span className="pill-role">
                            {(
                              player.role ||
                              'PLY'
                            )
                              .toString()
                              .substring(
                                0,
                                3
                              )}
                          </span>

                          <span className="pill-name">
                            {player.name}
                          </span>

                          <span className="pill-check">
                            {isSelected
                              ? '✓'
                              : '+'}
                          </span>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

              <div className="builder-footer">

                <span className="selected-count">
                  Selected:{' '}
                  <strong>
                    {selectedPlayerIds.length}
                  </strong>{' '}
                  / {myTeam.squad?.length || 0}
                </span>

                {lineupLocked ||
                myLineupAlreadyIn ? (
                  <div
                    className="badge-ready"
                    style={{
                      padding:
                        '10px 16px',
                    }}
                  >
                    ✅ Playing XI Confirmed
                  </div>
                ) : (
                  <button
                    className="confirm-lineup-btn"
                    disabled={
                      (myTeam.squad?.length ||
                        0) >= 11
                        ? selectedPlayerIds.length !==
                          11
                        : selectedPlayerIds.length <
                          Math.min(
                            2,
                            myTeam.squad?.length ||
                              0
                          )
                    }
                    onClick={
                      handleConfirmLineup
                    }
                  >
                    CONFIRM PLAYING XI ✓
                  </button>
                )}

              </div>

            </div>
          )}

        {/* HOST MATCH LAUNCHER */}

        <div className="match-launcher-card">

          {hostCheck ? (

            <div className="host-launcher-panel">

              <h3
                style={{
                  marginTop: 0,
                }}
              >
                👑 HOST CONTROLS
              </h3>

              <div className="launcher-settings">

                <label className="overs-label">
                  MATCH OVERS:
                </label>

                <div className="overs-btn-group">

                  {[2, 5, 10, 20].map(
                    (ov) => (
                      <button
                        key={ov}
                        type="button"
                        className={`over-btn ${
                          selectedOvers === ov
                            ? 'active'
                            : ''
                        }`}
                        onClick={() =>
                          setSelectedOvers(
                            ov
                          )
                        }
                      >
                        {ov} OVERS
                      </button>
                    )
                  )}

                </div>

              </div>

              {!allLineupsSubmitted && (
                <div className="waiting-banner">
                  ⏳ Waiting for all managers to
                  confirm their Playing XI...
                </div>
              )}

              <button
                className="start-match-btn"
                disabled={
                  !allLineupsSubmitted
                }
                onClick={
                  handleStartMatch
                }
              >
                🚀 START CRICKET MATCH (
                {selectedOvers} OVERS)
              </button>

            </div>

          ) : (

            <div className="guest-launcher-panel">

              {myLineupAlreadyIn ||
              lineupLocked ? (

                <div className="guest-waiting-msg">
                  <span className="pulse-dot" />{' '}
                  Waiting for Host to select
                  overs and launch the match...
                </div>

              ) : (

                <div className="guest-action-msg">
                  ⚠️ Confirm your Playing XI in
                  the “My Playing XI” tab. Only
                  Host can start the match.
                </div>

              )}

            </div>

          )}

        </div>

        {error && (
          <div className="finish-error-toast">
            ⚠️ {error}
          </div>
        )}

      </div>
    </div>
  );
};

export default FinishScreen;
