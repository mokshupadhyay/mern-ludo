// ScoreBoard.jsx
import PropTypes from 'prop-types';
import styles from './ScoreBoard.module.css';

const ScoreBoard = ({ players, leaderboard }) => {
    if (!players || players.length === 0) return null;

    return (
        <div className={styles.scoreBoard}>
            <h3 className={styles.title}>Live Scores</h3>
            <div className={styles.scoresContainer}>
                {players.map((player, index) => {
                    if (player.name === '...') return null;

                    return (
                        <div key={index} className={`${styles.playerCard}`}>
                            <div className={styles.playerHeader}>
                                <span className={styles.playerName}>{player.name}</span>
                                <span className={styles.playerDot} style={{ color: player.color }}>
                                    ●
                                </span>
                            </div>
                            <div className={styles.scoreSection}>
                                <span className={styles.mainScore}>{player.score || 0}</span>
                                <div className={styles.scoreDetails}>
                                    <span className={styles.detail}>
                                        <span className={styles.detailLabel}>Home:</span>
                                        <span className={styles.detailValue}>{player.pawnsInHome || 0}</span>
                                    </span>
                                    <span className={styles.detail}>
                                        <span className={styles.detailLabel}>Captures:</span>
                                        <span className={styles.detailValue}>{player.pawnsCaptured || 0}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {leaderboard && leaderboard.length > 0 && (
                <div className={styles.leaderboard}>
                    <h4 className={styles.leaderboardTitle}>Leaderboard</h4>
                    <div className={styles.leaderboardList}>
                        {leaderboard.map((player, index) => (
                            <div key={index} className={styles.leaderboardItem}>
                                <span className={styles.rank}>#{player.rank}</span>
                                <span className={styles.leaderName} style={{ color: 'white' }}>
                                    {player.name}
                                </span>
                                <span className={styles.leaderScore}>{player.score} pts</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

ScoreBoard.propTypes = {
    players: PropTypes.array,
    leaderboard: PropTypes.array,
};

export default ScoreBoard;
