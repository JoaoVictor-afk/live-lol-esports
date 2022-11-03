import './styles/playerStatusStyle.css'
import '../Schedule/styles/scheduleStyle.css'

import {MiniHealthBar} from "./MiniHealthBar";
import React, {useEffect, useState} from "react";
import {toast} from 'react-toastify';
import {DetailsFrame, EventDetails, GameMetadata, Participant, Record, Result, TeamStats, WindowFrame, WindowParticipant } from "../types/baseTypes";

import {ReactComponent as TowerSVG} from '../../assets/images/tower.svg';
import {ReactComponent as BaronSVG} from '../../assets/images/baron.svg';
import {ReactComponent as KillSVG} from '../../assets/images/kill.svg';
import {ReactComponent as GoldSVG} from '../../assets/images/gold.svg';
import {ReactComponent as InhibitorSVG} from '../../assets/images/inhibitor.svg';

import {ReactComponent as OceanDragonSVG} from '../../assets/images/dragon-ocean.svg';
import {ReactComponent as InfernalDragonSVG} from '../../assets/images/dragon-infernal.svg';
import {ReactComponent as CloudDragonSVG} from '../../assets/images/dragon-cloud.svg';
import {ReactComponent as MountainDragonSVG} from '../../assets/images/dragon-mountain.svg';
import {ReactComponent as ElderDragonSVG} from '../../assets/images/dragon-elder.svg';
import {ItemsDisplay} from "./ItemsDisplay";

import {Helmet} from "react-helmet";
import {LiveAPIWatcher} from "./LiveAPIWatcher";
import { CHAMPIONS_URL } from '../../utils/LoLEsportsAPI';

type Props = {
    firstWindowFrame: WindowFrame,
    lastWindowFrame: WindowFrame,
    lastDetailsFrame: DetailsFrame,
    gameMetadata: GameMetadata,
    eventDetails: EventDetails,
    videoLink: JSX.Element,
    records?: Record[],
    results?: Result[]
}

enum GameState {
    in_game = "in game",
    paused = "paused",
    finished = "match ended"
}

export function PlayersTable({ firstWindowFrame, lastWindowFrame, lastDetailsFrame, gameMetadata, eventDetails, videoLink, records, results } : Props) {
    const [gameState, setGameState] = useState<GameState>(GameState[lastWindowFrame.gameState as keyof typeof GameState]);

    useEffect(() => {
        let currentGameState: GameState = GameState[lastWindowFrame.gameState as keyof typeof GameState]

        if(currentGameState !== gameState){
            setGameState(currentGameState);

            toast.info(`Game status changed: ${currentGameState.toUpperCase()}`, {
                position: "top-right",
                autoClose: 15000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        }

        var playerStatsRows = Array.from($('.player-stats-row'))
        var championStatsRows = Array.from($('.champion-stats-row span'))
        var chevrons = Array.from($('.player-stats-row .chevron-down'))
        playerStatsRows.forEach((playerStatsRow, index) => {
            $(playerStatsRow).on('click', () => {
                $(championStatsRows[index]).slideToggle()
                $(chevrons[index]).toggleClass('rotated')
            })
        })
    }, [lastWindowFrame.gameState, gameState]);

    let blueTeam = eventDetails.match.teams[0];
    let redTeam = eventDetails.match.teams[1];

    const auxBlueTeam = blueTeam

    /*
        As vezes os times continuam errados mesmo apos verificar o ultimo frame,
        em ligas como TCL, por isso fazemos essa verificação pelo nome
    */
    const summonerName = gameMetadata.blueTeamMetadata.participantMetadata[0].summonerName.split(" ");

    if(redTeam.code.startsWith(summonerName[0])){ // Temos que verificar apenas os primeiros caracteres pois os times academy usam o A, a mais na tag mas não nos nomes
        blueTeam = redTeam;
        redTeam = auxBlueTeam;
    }

    const goldPercentage = getGoldPercentage(lastWindowFrame.blueTeam.totalGold, lastWindowFrame.redTeam.totalGold);
    let inGameTime = getInGameTime(firstWindowFrame.rfc460Timestamp, lastWindowFrame.rfc460Timestamp)
    document.title = `${blueTeam.name} VS ${redTeam.name}`;
    let matchResults = results || eventDetails.match.teams.map(team=> team.result)

    return (
        <div className="status-live-game-card">

            <Helmet>
                <script src="../../utils/LoLAPIWatcher.js"/>
            </Helmet>

            <div className="status-live-game-card-content">
                {eventDetails ? (<h3>{eventDetails?.league.name}</h3>) : null}
                <div className="live-game-stats-header">
                    <div className="live-game-stats-header-team-images">
                        {TeamCard({eventDetails, index: 0, matchResults, record: records? records[0] : undefined})}
                        <h1>
                            <div>BEST OF {eventDetails.match.strategy.count}</div>
                            {matchResults ? (<div>{matchResults[0].gameWins}-{matchResults[1].gameWins}</div>) : null}
                            VS
                            <div>{gameState.toUpperCase()}</div>
                            <div>{inGameTime}</div>
                        </h1>
                        {TeamCard({eventDetails, index: 1, matchResults, record: records? records[1] : undefined})}
                    </div>
                    <div className="live-game-stats-header-status">
                        {HeaderStats(lastWindowFrame.blueTeam, 'blue-team')}
                        {HeaderStats(lastWindowFrame.redTeam, 'red-team')}
                    </div>
                    <div className="live-game-stats-header-gold">
                        <div className="blue-team" style={{flex: goldPercentage.goldBluePercentage}}/>
                        <div className="red-team" style={{flex: goldPercentage.goldRedPercentage}}/>
                    </div>
                    <div className="live-game-stats-header-dragons">
                        <div className="blue-team">
                            {lastWindowFrame.blueTeam.dragons.map((dragon, i) => (
                                getDragonSVG(dragon, 'blue', i)
                            ))}
                        </div>
                        <div className="red-team">

                            {lastWindowFrame.redTeam.dragons.slice().reverse().map((dragon, i) => (
                                getDragonSVG(dragon, 'red', i)
                            ))}
                        </div>
                    </div>
                </div>
                <div className="status-live-game-card-table-wrapper">
                    <table className="status-live-game-card-table">
                        <thead>
                        <tr key={blueTeam.name.toUpperCase()}>
                            <th className="table-top-row-champion" title="champion/team">
                                <span>{blueTeam.name.toUpperCase()}</span>
                            </th>
                            <th className="table-top-row-vida" title="life">
                                <span>Health</span>
                            </th>
                            <th className="table-top-row-items" title="items">
                                <span>Items</span>
                            </th>
                            <th className="table-top-row" title="creep score">
                                <span>CS</span>
                            </th>
                            <th className="table-top-row player-stats-kda" title="kills">
                                <span>K</span>
                            </th>
                            <th className="table-top-row player-stats-kda" title="kills">
                                <span>D</span>
                            </th>
                            <th className="table-top-row player-stats-kda" title="kills">
                                <span>A</span>
                            </th>
                            <th className="table-top-row" title="gold">
                                <span>Gold</span>
                            </th>
                            <th className="table-top-row" title="gold difference">
                                <span>+/-</span>
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {lastWindowFrame.blueTeam.participants.map((player: WindowParticipant, index) => {
                            let goldDifference = getGoldDifference(player, "blue", gameMetadata, lastWindowFrame);
                            let championDetails = lastDetailsFrame.participants[index]
                            return [(
                                <tr className="player-stats-row" key={`${CHAMPIONS_URL}${gameMetadata.blueTeamMetadata.participantMetadata[player.participantId - 1].championId}`}>
                                    <th>
                                        <div className="player-champion-info">
                                            <svg className="chevron-down" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 429.3l22.6-22.6 192-192L493.3 192 448 146.7l-22.6 22.6L256 338.7 86.6 169.4 64 146.7 18.7 192l22.6 22.6 192 192L256 429.3z"/></svg>
                                            <img
                                                src={`${CHAMPIONS_URL}${gameMetadata.blueTeamMetadata.participantMetadata[player.participantId - 1].championId}.png`}
                                                className="player-champion"
                                                alt="imagem do campeao"/>
                                            <span className=" player-champion-info-level">{player.level}</span>
                                            <div className=" player-champion-info-name">
                                                <span>{gameMetadata.blueTeamMetadata.participantMetadata[player.participantId - 1].championId}</span>
                                                <span
                                                    className=" player-card-player-name">{gameMetadata.blueTeamMetadata.participantMetadata[player.participantId - 1].summonerName}</span>
                                            </div>
                                        </div>
                                    </th>
                                    <td>
                                        <MiniHealthBar currentHealth={player.currentHealth} maxHealth={player.maxHealth}/>
                                    </td>
                                    <td>
                                        <ItemsDisplay participantId={player.participantId - 1} lastFrame={lastDetailsFrame}/>
                                    </td>
                                    <td>
                                        <div className=" player-stats">{player.creepScore}</div>
                                    </td>
                                    <td>
                                        <div className=" player-stats player-stats-kda">{player.kills}</div>
                                    </td>
                                    <td>
                                        <div className=" player-stats player-stats-kda">{player.deaths}</div>
                                    </td>
                                    <td>
                                        <div className=" player-stats player-stats-kda">{player.assists}</div>
                                    </td>
                                    <td>
                                        <div
                                            className=" player-stats">{Number(player.totalGold).toLocaleString('en-us')}</div>
                                    </td>
                                    <td>
                                        <div className={`player-stats player-gold-${goldDifference?.style}`}>{goldDifference.goldDifference}</div>
                                    </td>
                                </tr>
                            ), (
                            <tr key={`${CHAMPIONS_URL}${gameMetadata.blueTeamMetadata.participantMetadata[player.participantId - 1].championId}_stats`} className='champion-stats-row'>
                                <td colSpan={9}>
                                    <span>
                                        {getFormattedChampionStats(championDetails)}
                                    </span>
                                </td>
                            </tr>
                            )]
                        })}
                        </tbody>
                    </table>

                    <table className="status-live-game-card-table">
                        <thead>
                        <tr key={redTeam.name.toUpperCase()}>
                            <th className="table-top-row-champion" title="champion/team">
                                <span>{redTeam.name.toUpperCase()}</span>
                            </th>
                            <th className="table-top-row-vida" title="life">
                                <span>Health</span>
                            </th>
                            <th className="table-top-row-items" title="items">
                                <span>Items</span>
                            </th>
                            <th className="table-top-row" title="creep score">
                                <span>CS</span>
                            </th>
                            <th className="table-top-row player-stats-kda" title="kills">
                                <span>K</span>
                            </th>
                            <th className="table-top-row player-stats-kda" title="kills">
                                <span>D</span>
                            </th>
                            <th className="table-top-row player-stats-kda" title="kills">
                                <span>A</span>
                            </th>
                            <th className="table-top-row" title="gold">
                                <span>Gold</span>
                            </th>
                            <th className="table-top-row" title="gold difference">
                                <span>+/-</span>
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {lastWindowFrame.redTeam.participants.map((player: WindowParticipant, index) => {
                            let goldDifference = getGoldDifference(player, "red", gameMetadata, lastWindowFrame);
                            let championDetails = lastDetailsFrame.participants[index + 5]

                            return [(
                                <tr className="player-stats-row" key={`${CHAMPIONS_URL}${gameMetadata.redTeamMetadata.participantMetadata[player.participantId - 6].championId}`}>
                                    <th>
                                        <div className="player-champion-info">
                                            <svg className="chevron-down" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 429.3l22.6-22.6 192-192L493.3 192 448 146.7l-22.6 22.6L256 338.7 86.6 169.4 64 146.7 18.7 192l22.6 22.6 192 192L256 429.3z"/></svg>
                                            <img
                                                src={`${CHAMPIONS_URL}${gameMetadata.redTeamMetadata.participantMetadata[player.participantId - 6].championId}.png`}
                                                className="player-champion"
                                                alt="imagem do campeao"/>
                                            <span className=" player-champion-info-level">{player.level}</span>
                                            <div className=" player-champion-info-name">
                                                <span>{gameMetadata.redTeamMetadata.participantMetadata[player.participantId - 6].championId}</span>
                                                <span className=" player-card-player-name">{gameMetadata.redTeamMetadata.participantMetadata[player.participantId - 6].summonerName}</span>
                                            </div>
                                        </div>
                                    </th>
                                    <td>
                                        <MiniHealthBar currentHealth={player.currentHealth} maxHealth={player.maxHealth}/>
                                    </td>
                                    <td>
                                        <ItemsDisplay participantId={player.participantId - 1} lastFrame={lastDetailsFrame}/>
                                    </td>
                                    <td>
                                        <div className=" player-stats">{player.creepScore}</div>
                                    </td>
                                    <td>
                                        <div className=" player-stats player-stats-kda">{player.kills}</div>
                                    </td>
                                    <td>
                                        <div className=" player-stats player-stats-kda">{player.deaths}</div>
                                    </td>
                                    <td>
                                        <div className=" player-stats player-stats-kda">{player.assists}</div>
                                    </td>
                                    <td>
                                        <div className=" player-stats">{Number(player.totalGold).toLocaleString('en-us')}</div>
                                    </td>
                                    <td>
                                        <div className={`player-stats player-gold-${goldDifference?.style}`}>{goldDifference.goldDifference}</div>
                                    </td>
                                </tr>
                            ), (
                                <tr key={`${CHAMPIONS_URL}${gameMetadata.redTeamMetadata.participantMetadata[player.participantId - 6].championId}_stats`} className='champion-stats-row'>
                                    <td colSpan={9}>
                                        <span>
                                            {getFormattedChampionStats(championDetails)}
                                        </span>
                                    </td>
                                </tr>
                                )]
                        })}
                        </tbody>
                    </table>
                </div>
                <span className="footer-notes">
                    Patch Version: {gameMetadata.patchVersion}
                </span>
                {videoLink}
            </div>

            <LiveAPIWatcher gameMetadata={gameMetadata} lastWindowFrame={lastWindowFrame} blueTeam={blueTeam} redTeam={redTeam}/>
        </div>
    );
}

type TeamCardProps = {
    eventDetails: EventDetails,
    index: number,
    matchResults?: Result[],
    record?: Record,
}

function TeamCard({eventDetails, index, matchResults, record}: TeamCardProps) {
    return (
        <h1>
            <div className="live-game-card-team">
                <img className="live-game-card-team-image" src={eventDetails.match.teams[index].image}
                    alt={eventDetails?.match.teams[index].name}/>
                <span className='outcome'>
                    {matchResults ? (<p className={matchResults[index].outcome}>
                        {matchResults[index].outcome}
                    </p>) : null}
                </span>
                <span>
                    <h4>
                        {eventDetails.match.teams[index].name}
                    </h4>
                </span>
                {record ?
                    (<span>
                        <p>
                            {record.wins} - {record.losses}
                        </p>
                    </span>)
                : null}
            </div>
        </h1>
    )
}

function HeaderStats(teamStats: TeamStats, teamColor: string) {
    return (
        <div className={teamColor}>
            <div className="team-stats inhibitors">
                <InhibitorSVG/>
                {teamStats.inhibitors}
            </div>
            <div className="team-stats barons">
                <BaronSVG/>
                {teamStats.barons}
            </div>
            <div className="team-stats towers">
                <TowerSVG/>
                {teamStats.towers}
            </div>
            <div className="team-stats gold">
                <GoldSVG/>
                <span>
                    {Number(teamStats.totalGold).toLocaleString('en-us')}
                </span>
            </div>
            <div className="team-stats kills">
                <KillSVG/>
                {teamStats.totalKills}
            </div>
        </div>
    )
}

function getFormattedChampionStats(championDetails: Participant) {
    return (
        <div>
            <div className='footer-notes'>Attack Damage: {championDetails.attackDamage}</div>
            <div className='footer-notes'>Ability Power: {championDetails.abilityPower}</div>
            <div className='footer-notes'>Attack Speed: {championDetails.attackSpeed}</div>
            <div className='footer-notes'>Life Steal: {championDetails.lifeSteal}%</div>
            <div className='footer-notes'>Armor: {championDetails.armor}</div>
            <div className='footer-notes'>Magic Resistance: {championDetails.magicResistance}</div>
            <div className='footer-notes'>Wards Destroyed: {championDetails.wardsDestroyed}</div>
            <div className='footer-notes'>Wards Placed: {championDetails.wardsPlaced}</div>
            <div className='footer-notes'>Damage Share: {Math.round(championDetails.championDamageShare * 10000) / 100}%</div>
            <div className='footer-notes'>Kill Participation: {Math.round(championDetails.killParticipation * 10000) / 100}%</div>
            <div className='footer-notes'>Skill Order: {championDetails.abilities.join('->')}</div>
        </div>
    )
}

function getInGameTime(startTime: string, currentTime: string) {
    let startDate = new Date(startTime)
    let currentDate = new Date(currentTime)
    let seconds = Math.floor((currentDate.valueOf() - (startDate.valueOf()))/1000)
    let minutes = Math.floor(seconds/60);
    let hours = Math.floor(minutes/60);
    let days = Math.floor(hours/24);
    
    hours = hours-(days*24);
    minutes = minutes-(days*24*60)-(hours*60);
    seconds = seconds-(days*24*60*60)-(hours*60*60)-(minutes*60);
    let secondsString = seconds < 10 ? '0' + seconds : seconds

    return hours ? `${hours}:${minutes}:${secondsString}` : `${minutes}:${secondsString}`
}

function getGoldDifference(player: WindowParticipant, side: string, gameMetadata: GameMetadata, frame: WindowFrame) {
    if(6 > player.participantId) { // blue side
        const redPlayer = frame.redTeam.participants[player.participantId - 1];
        const goldResult = player.totalGold - redPlayer.totalGold;

        return {
            style: goldResult > 0 ? "positive" : "negative",
            goldDifference: goldResult > 0 ? "+" + Number(goldResult).toLocaleString("en-us") : Number(goldResult).toLocaleString("en-us")
        };
    }else{
        const bluePlayer = frame.blueTeam.participants[player.participantId - 6];
        const goldResult = player.totalGold - bluePlayer.totalGold;

        return {
            style: goldResult > 0 ? "positive" : "negative",
            goldDifference: goldResult > 0 ? "+" + Number(goldResult).toLocaleString("en-us") : Number(goldResult).toLocaleString("en-us")
        };
    }
}

function getDragonSVG(dragonName: string, teamColor: string, index: number){
    let key = `${teamColor}_${index}_${dragonName}`
    switch (dragonName) {
        case "ocean": return <OceanDragonSVG className="dragon" key={key}/>;
        case "infernal": return <InfernalDragonSVG className="dragon" key={key}/>
        case "cloud": return <CloudDragonSVG className="dragon" key={key}/>
        case "mountain": return <MountainDragonSVG className="dragon" key={key}/>
        case "elder": return <ElderDragonSVG className="dragon" key={key}/>
    }
}

function getGoldPercentage(goldBlue: number, goldRed: number){
    const total = goldBlue + goldRed;
    return {
        goldBluePercentage: ((goldBlue/ 100) * total),
        goldRedPercentage: ((goldRed/ 100) * total),
    }
}