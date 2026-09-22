import React, { useEffect, useMemo, useState } from 'react';
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

  const [selectedOvers, setSelectedOvers] = useState(5);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<
    'lineup' | 'rivals' | 'standings'
  >('lineup');
  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(null);
  const [lineupLocked, setLineupLocked] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);

  const teams = roomData?.teams || [];

  const hostCheck =
    isHost || (!!roomData && roomData.hostId === myTeamId);

  /*
   * IMPORTANT:
   * Find only the team belonging to THIS connected player.
   * Every player gets their own squad and own Playing XI.
   */
  const myTeam =
    teams.find(
      (team: TeamPublicData) => team.id === myTeamId
    ) || null;

  const getPlayerFromSquadItem = (item: any) => {
    if (!item) {
      return null;
    }

    if (item.player) {
      return item.player;
    }

    return item;
  };

  const mySquadPlayerIds = useMemo(() => {
    return (myTeam?.squad || [])
      .map((item: any) => getPlayerFromSquadItem(item)?.id)
      .filter((id): id is string => Boolean(id));
  }, [myTeam]);

  /*
   * Prefill the CURRENT PLAYER'S squad.
   *
   * This does not use the host.
   */
  useEffect(() => {
    if (hasPrefilled) {
      return;
    }

    if (mySquadPlayerIds.length === 0) {
      return;
    }

    if (selectedPlayerIds.length > 0) {
      setHasPrefilled(true);
      return;
    }

    const prefill =
      mySquadPlayerIds.length <= 11
        ? mySquadPlayerIds
        : mySquadPlayerIds.slice(0, 11);

    setSelectedPlayerIds(prefill);
    setHasPrefilled(true);
  }, [
    mySquadPlayerIds,
    hasPrefilled,
    selectedPlayerIds.length,
  ]);

  /*
   * IMPORTANT FIX:
   *
   * isReady is NOT the same thing as Playing XI submitted.
   *
   * Previously:
   *
   *   || !!myTeam.isReady
   *
   * caused a player's lineup to become locked simply because
   * their team was marked ready.
   *
   * Now only actual lineup submission locks the lineup.
   */
  useEffect(() => {
    if (!myTeam) {
      return;
    }

    const alreadySubmitted =
      !!myTeam.lineupSubmitted ||
      !!(myTeam as any).lineup?.length ||
      !!(myTeam as any).playingXI?.length;

    if (alreadySubmitted) {
      setLineupLocked(true);
    }
  }, [myTeam]);

  const getPurseLeft = (
    team: TeamPublicData
  ): number => {
    const purse: any = team.purse;

    if (typeof purse === 'number') {
      return purse;
    }

    if (
      purse &&
      typeof purse.remaining === 'number'
    ) {
      return purse.remaining;
    }

    return 0;
  };

  /*
   * IMPORTANT FIX:
   *
   * isReady is deliberately NOT checked here.
   *
   * A team is considered ready for lineup purposes only when:
   * - lineupSubmitted is true
   * - OR actual lineup exists
   * - OR playingXI exists
   *
   * This allows every player to independently select their XI.
   */
  const isTeamReady = (
    team: TeamPublicData
  ): boolean => {
    const squadSize =
      team.squad?.length || 0;

    if (squadSize === 0) {
      return true;
    }

    return (
      !!team.lineupSubmitted ||
      !!(team as any).lineup?.length ||
      !!(team as any).playingXI?.length
    );
  };

  const allLineupsSubmitted =
    teams.length > 0 &&
    teams.every(isTeamReady);

  /*
   * Only THIS player's lineup status is used for
   * THIS player's selection controls.
   */
  const myLineupAlreadyIn =
    !!myTeam && isTeamReady(myTeam);

  const togglePlayerSelection = (
    playerId: string
  ) => {
    /*
     * No host check here.
     *
     * Every player can select their own players.
     */
    if (
      lineupLocked ||
      myLineupAlreadyIn ||
      !playerId
    ) {
      return;
    }

    setSelectedPlayerIds((previous) => {
      if (previous.includes(playerId)) {
        return previous.filter(
          (id) => id !== playerId
        );
      }

      const maxPick = Math.min(
        11,
        Math.max(
          1,
          mySquadPlayerIds.length
        )
      );

      if (previous.length >= maxPick) {
        return previous;
      }

      return [
        ...previous,
        playerId,
      ];
    });
  };

  const selectAllSquad = () => {
    if (
      lineupLocked ||
      myLineupAlreadyIn
    ) {
      return;
    }

    setSelectedPlayerIds(
      mySquadPlayerIds.length <= 11
        ? [...mySquadPlayerIds]
        : mySquadPlayerIds.slice(0, 11)
    );
  };

  const clearSelection = () => {
    if (
      lineupLocked ||
      myLineupAlreadyIn
    ) {
      return;
    }

    setSelectedPlayerIds([]);
  };

  const handleConfirmLineup = () => {
    if (
      mySquadPlayerIds.length > 0 &&
      selectedPlayerIds.length === 0
    ) {
      return;
    }

    /*
     * This submits ONLY this player's lineup.
     */
    submitLineup(selectedPlayerIds);

    setLineupLocked(true);
  };

  /*
   * ONLY THE HOST can start the match.
   *
   * This does not affect lineup selection.
   */
  const handleStartMatch = () => {
    if (!hostCheck) {
      return;
    }

    startMatch(selectedOvers);
  };

  const sortedTeams = [...teams].sort(
    (a, b) =>
      getPurseLeft(b) -
      getPurseLeft(a)
  );

  const activeRival =
    teams.find(
      (team) =>
        team.id ===
        (selectedRivalId ||
          teams[0]?.id)
    ) || null;

  const formatCr = (
    value: number
  ): string => {
    return `₹${(
      value / 10000000
    ).toFixed(2)} Cr`;
  };

  const formatPurseDisplay = (
    team: TeamPublicData
  ): string => {
    const raw =
      getPurseLeft(team);

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

  const isConfirmDisabled =
    (
      mySquadPlayerIds.length > 0 &&
      selectedPlayerIds.length === 0
    ) ||
    lineupLocked ||
    myLineupAlreadyIn;

  if (!roomData) {
    return null;
  }

  return (
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
          Select YOUR Playing XI • Scout Rivals • Host Starts Match
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
                  isTeamReady(team);

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
                          {team.teamLogo ||
                            '🏏'}
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
                            {team.squad
                              ?.length ||
                              0}{' '}
                            players
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
            Every manager can view every
            franchise squad before match start.
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

            {teams.map(
              (team: TeamPublicData) => {

                const isActive =
                  activeRival?.id ===
                  team.id;

                return (
                  <button
                    key={team.id}
                    type="button"
                    className={`team-tab ${
                      isActive
                        ? 'active'
                        : ''
                    }`}
                    onClick={() =>
                      setSelectedRivalId(
                        team.id
                      )
                    }
                    style={{
                      padding:
                        '8px 14px',
                      borderRadius: 8,
                      border: isActive
                        ? '2px solid #a855f7'
                        : '1px solid rgba(255,255,255,0.15)',
                      background:
                        isActive
                          ? 'rgba(124,58,237,0.35)'
                          : 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      cursor:
                        'pointer',
                    }}
                  >
                    {team.teamLogo ||
                      '🏏'}{' '}

                    {team.teamName}

                    {team.id ===
                    myTeamId
                      ? ' (YOU)'
                      : ''}
                  </button>
                );
              }
            )}

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
                  {activeRival.squad
                    ?.length || 0}{' '}
                  players
                </span>

                <span>
                  Status:{' '}
                  {isTeamReady(
                    activeRival
                  )
                    ? 'READY ✓'
                    : 'SELECTING...'}
                </span>

              </div>

              <div className="rival-squad-list">

                {(activeRival.squad ||
                  []).length === 0 && (
                  <p className="empty-squad-notice">
                    No players in this
                    squad yet.
                  </p>
                )}

                {(activeRival.squad ||
                  []).map(
                    (
                      item:
                        | PurchasedPlayer
                        | any,
                      index: number
                    ) => {

                      const player =
                        getPlayerFromSquadItem(
                          item
                        );

                      if (!player) {
                        return null;
                      }

                      const price =
                        typeof item.price ===
                        'number'
                          ? item.price
                          : typeof item.purchasePrice ===
                            'number'
                          ? item.purchasePrice
                          : null;

                      return (
                        <div
                          key={
                            player.id ||
                            index
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
                            #{index + 1}
                          </span>

                          <span
                            style={{
                              flex: 1,
                            }}
                          >
                            {player.name}{' '}
                            {player.isOverseas
                              ? '✈️'
                              : ''}
                          </span>

                          <span
                            style={{
                              opacity: 0.8,
                            }}
                          >
                            {player.role}
                          </span>

                          {price !== null && (
                            <span
                              style={{
                                color:
                                  '#4ade80',
                              }}
                            >
                              {formatCr(
                                price
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

            <div
              className="builder-header"
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >

              <div>

                <h3
                  style={{
                    margin: 0,
                  }}
                >
                  🏏 YOUR Playing XI (
                  {myTeam.teamName})
                </h3>

                <p
                  style={{
                    margin:
                      '4px 0 0 0',
                    opacity: 0.8,
                  }}
                >
                  Tap players to select or
                  deselect. Squad size:{' '}
                  {mySquadPlayerIds.length}.
                  You can confirm with any
                  number of players (1–11).
                </p>

              </div>

              {!lineupLocked &&
                !myLineupAlreadyIn &&
                mySquadPlayerIds.length >
                  0 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                    }}
                  >

                    <button
                      type="button"
                      onClick={
                        selectAllSquad
                      }
                      style={{
                        padding:
                          '6px 12px',
                        borderRadius: 6,
                        background:
                          '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 600,
                        cursor:
                          'pointer',
                      }}
                    >
                      Select All
                    </button>

                    <button
                      type="button"
                      onClick={
                        clearSelection
                      }
                      style={{
                        padding:
                          '6px 12px',
                        borderRadius: 6,
                        background:
                          'rgba(255,255,255,0.1)',
                        color: '#fff',
                        border:
                          '1px solid rgba(255,255,255,0.2)',
                        fontWeight: 600,
                        cursor:
                          'pointer',
                      }}
                    >
                      Clear
                    </button>

                  </div>
                )}

            </div>

            {/* EMPTY SQUAD */}

            {(myTeam.squad || [])
              .length === 0 ? (

              <p className="empty-squad-notice">
                No players bought. Confirm
                empty XI or wait — host can
                still start.
              </p>

            ) : (

              <div className="squad-selector-grid">

                {(myTeam.squad as any[]).map(
                  (
                    item:
                      | PurchasedPlayer
                      | any,
                    index: number
                  ) => {

                    const player =
                      getPlayerFromSquadItem(
                        item
                      );

                    if (!player) {
                      return null;
                    }

                    const playerId =
                      player.id;

                    const isSelected =
                      selectedPlayerIds.includes(
                        playerId
                      );

                    return (
                      <div
                        key={
                          playerId ||
                          index
                        }
                        className={`squad-select-pill ${
                          isSelected
                            ? 'selected'
                            : ''
                        }`}
                        onClick={() =>
                          togglePlayerSelection(
                            playerId
                          )
                        }
                        style={{
                          opacity:
                            lineupLocked ||
                            myLineupAlreadyIn
                              ? 0.75
                              : 1,
                          cursor:
                            lineupLocked ||
                            myLineupAlreadyIn
                              ? 'default'
                              : 'pointer',
                          outline:
                            isSelected
                              ? '2px solid #22c55e'
                              : undefined,
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

            {/* FOOTER */}

            <div className="builder-footer">

              <span className="selected-count">
                Selected:{' '}
                <strong>
                  {selectedPlayerIds.length}
                </strong>{' '}
                /{' '}
                {mySquadPlayerIds.length}{' '}
                players
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
                  — waiting for host
                </div>

              ) : (

                <button
                  className="confirm-lineup-btn"
                  disabled={
                    isConfirmDisabled
                  }
                  onClick={
                    handleConfirmLineup
                  }
                >
                  CONFIRM MY PLAYING XI ✓
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
                  (overs) => (
                    <button
                      key={overs}
                      type="button"
                      className={`over-btn ${
                        selectedOvers ===
                        overs
                          ? 'active'
                          : ''
                      }`}
                      onClick={() =>
                        setSelectedOvers(
                          overs
                        )
                      }
                    >
                      {overs} OVERS
                    </button>
                  )
                )}

              </div>

            </div>

            <div
              className="waiting-banner"
              style={{
                marginBottom: 12,
              }}
            >
              {allLineupsSubmitted
                ? '✅ All teams ready — you can start the match!'
                : `⏳ Ready: ${
                    teams.filter(
                      isTeamReady
                    ).length
                  }/${teams.length} teams. You can still force-start.`}
            </div>

            <button
              className="start-match-btn"
              onClick={
                handleStartMatch
              }
              style={{
                opacity: 1,
                cursor:
                  'pointer',
              }}
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
                <span className="pulse-dot" />
                Waiting for Host to
                launch the match...
              </div>

            ) : (

              <div className="guest-action-msg">
                ⚠️ Select and confirm YOUR
                Playing XI above. Only Host
                starts the match.
              </div>

            )}

          </div>

        )}

      </div>

      {/* ERROR */}

      {error && (
        <div className="finish-error-toast">
          ⚠️ {error}
        </div>
      )}

    </div>
  );
};

export default FinishScreen;
