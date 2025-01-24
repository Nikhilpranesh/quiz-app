import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import easyQuestions from './questions/easy.json';
import mediumQuestions from './questions/medium.json';
import hardQuestions from './questions/hard.json';
import correctSound from './assets/correct.mp3';
import wrongSound from './assets/wrong.mp3';
import playSound from './assets/play.mp3';
import bgImage from './assets/bg.jpg';

function App() {
  // State declarations
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [timer, setTimer] = useState(30);
  const [feedback, setFeedback] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [lifelines, setLifelines] = useState({
    fiftyFifty: 1,
    timeExtension: 1,
    hint: 1
  });
  const [showHint, setShowHint] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [difficultyLevel, setDifficultyLevel] = useState('normal');
  const [showWelcome, setShowWelcome] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [combo, setCombo] = useState(0);
  const [powerMode, setPowerMode] = useState(false);
  const [stats, setStats] = useState({
    correct: 0,
    incorrect: 0,
    avgTime: 0,
    streak: 0,
    bestStreak: 0
  });
  const [currentStreak, setCurrentStreak] = useState(0);
  const [currentQuestions, setCurrentQuestions] = useState([]);

  // Basic utility functions
  const playAudio = useCallback((audioFile) => {
    if (!isMuted) {
      const audio = new Audio(audioFile);
      audio.play().catch(error => console.log('Audio playback error:', error));
    }
  }, [isMuted]);

  const getOptionClassName = useCallback((option) => {
    if (!option) return 'option disabled';
    if (selectedOption === null) return powerMode ? 'option power-mode' : 'option';
    if (option === currentQuestions[currentQuestion].correctOption) return 'option correct';
    if (option === selectedOption) return 'option wrong';
    return 'option';
  }, [selectedOption, powerMode, currentQuestion, currentQuestions]);

  // Game state management functions
  const resetQuestion = useCallback(() => {
    const baseTime = difficultyLevel === 'easy' ? 45 : difficultyLevel === 'hard' ? 20 : 30;
    setTimer(baseTime);
    setSelectedOption(null);
    setFeedback(null);
    setShowHint(false);
  }, [difficultyLevel]);

  const updateStats = useCallback((isCorrect) => {
    setStats(prevStats => ({
      ...prevStats,
      correct: isCorrect ? prevStats.correct + 1 : prevStats.correct,
      incorrect: !isCorrect ? prevStats.incorrect + 1 : prevStats.incorrect,
      avgTime: ((prevStats.avgTime * (prevStats.correct + prevStats.incorrect)) + (30 - timer)) / 
               (prevStats.correct + prevStats.incorrect + 1),
      streak: isCorrect ? prevStats.streak + 1 : 0,
      bestStreak: isCorrect ? 
        Math.max(prevStats.bestStreak, prevStats.streak + 1) : 
        prevStats.bestStreak
    }));
    
    
    if (isCorrect) {
      setCurrentStreak(prev => prev + 1);
    } else {
      setCurrentStreak(0);
    }
  }, [timer]);

  // Game flow control functions
  const finishQuiz = useCallback(() => {
    setShowScore(true);
    const newLeaderboardEntry = {
      name: playerName,
      score: score,
      difficulty: difficultyLevel,
      achievements: achievements
    };
    const newLeaderboard = [...leaderboard, newLeaderboardEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setLeaderboard(newLeaderboard);
    localStorage.setItem('quizLeaderboard', JSON.stringify(newLeaderboard));
  }, [playerName, score, difficultyLevel, achievements, leaderboard]);

  const handleTimeout = useCallback(() => {
    playAudio(wrongSound);
    setCombo(0);
    setPowerMode(false);
    updateStats(false);
    if (currentQuestion < currentQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      resetQuestion();
    } else {
      finishQuiz();
    }
  }, [currentQuestion, currentQuestions.length, playAudio, updateStats, resetQuestion, finishQuiz]);

  const handleAnswerClick = useCallback((selectedAnswer) => {
    if (selectedOption !== null) return;

    setSelectedOption(selectedAnswer);
    const currentQuestionData = currentQuestions[currentQuestion];
    const correctAnswerIndex = currentQuestionData.correctAnswer;
    const correctAnswer = currentQuestionData.options[correctAnswerIndex];
    const isCorrect = selectedAnswer === correctAnswer;

    if (isCorrect) {
      playAudio(correctSound);
      setScore(prev => prev + 1);
      setCombo(prev => prev + 1);
      if (combo >= 2) {
        setPowerMode(true);
      }
      setFeedback('Correct!');
      setTimeout(() => {
        if (currentQuestion < currentQuestions.length - 1) {
          setCurrentQuestion(prev => prev + 1);
          resetQuestion();
        } else {
          finishQuiz();
        }
      }, 2000);
    } else {
      playAudio(wrongSound);
      setCombo(0);
      setPowerMode(false);
      setFeedback(`Wrong! The correct answer is: ${correctAnswer}`);
      setTimeout(() => {
        if (currentQuestion < currentQuestions.length - 1) {
          setCurrentQuestion(prev => prev + 1);
          resetQuestion();
        } else {
          finishQuiz();
        }
      }, 3000);
    }

    updateStats(isCorrect);
  }, [
    selectedOption,
    currentQuestion,
    currentQuestions,
    combo,
    playAudio,
    updateStats,
    resetQuestion,
    finishQuiz
  ]);

  // Lifeline functions
  const useFiftyFifty = useCallback(() => {
    if (lifelines.fiftyFifty && !selectedOption) {
      const correctOption = currentQuestions[currentQuestion].correctOption;
      const wrongOptions = currentQuestions[currentQuestion].options.filter(opt => opt !== correctOption);
      const shuffledWrong = wrongOptions.sort(() => Math.random() - 0.5);
      const newOptions = [correctOption, shuffledWrong[0], null, null];
      currentQuestions[currentQuestion].options = newOptions.sort(() => Math.random() - 0.5);
      setLifelines(prev => ({ ...prev, fiftyFifty: 0 }));
    }
  }, [lifelines.fiftyFifty, selectedOption, currentQuestion, currentQuestions]);

  const useTimeExtension = useCallback(() => {
    if (lifelines.timeExtension) {
      setTimer(prev => prev + 20);
      setLifelines(prev => ({ ...prev, timeExtension: 0 }));
    }
  }, [lifelines.timeExtension]);

  const useHint = useCallback(() => {
    if (lifelines.hint) {
      setShowHint(true);
      setLifelines(prev => ({ ...prev, hint: 0 }));
    }
  }, [lifelines.hint]);

  // Game start/restart functions
  const startQuiz = useCallback(() => {
    if (!playerName.trim()) {
      alert('Please enter your name!');
      return;
    }
    setShowWelcome(false);
    resetQuestion();
  }, [playerName, resetQuestion]);

  const restartQuiz = useCallback(() => {
    playAudio(playSound);
    setCurrentQuestion(0);
    setScore(0);
    setShowScore(false);
    setSelectedOption(null);
    setTimer(30);
    setFeedback(null);
    setLifelines({
      fiftyFifty: 1,
      timeExtension: 1,
      hint: 1
    });
    setShowHint(false);
    setCombo(0);
    setPowerMode(false);
    setStats({
      correct: 0,
      incorrect: 0,
      avgTime: 0,
      streak: 0,
      bestStreak: 0
    });
    setCurrentStreak(0);
    setShowWelcome(true);
  }, [playAudio]);

  // Achievement tracking
  const checkAchievements = useCallback(() => {
    const newAchievements = [];
    
    if (score === currentQuestions.length && !achievements.includes('Perfect Score')) {
      newAchievements.push('Perfect Score');
    }
    
    if (stats.avgTime < 10 && currentQuestion > 5 && !achievements.includes('Speed Demon')) {
      newAchievements.push('Speed Demon');
    }
    
    if (currentStreak >= 5 && !achievements.includes('Combo Master')) {
      newAchievements.push('Combo Master');
    }

    if (newAchievements.length > 0) {
      setAchievements(prev => [...prev, ...newAchievements]);
      playAudio(correctSound);
    }
  }, [
    score, 
    currentQuestions.length, 
    stats.avgTime, 
    currentQuestion, 
    currentStreak, 
    achievements, 
    playAudio
  ]);

  // Effects
  useEffect(() => {
    const savedLeaderboard = localStorage.getItem('quizLeaderboard');
    if (savedLeaderboard) {
      setLeaderboard(JSON.parse(savedLeaderboard));
    }
  }, []);

  useEffect(() => {
    if (!showWelcome && !showScore && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && !showScore && !showWelcome) {
      handleTimeout();
    }
  }, [timer, showScore, showWelcome, handleTimeout]);

  useEffect(() => {
    checkAchievements();
  }, [checkAchievements]);

  const handleDifficultySelect = useCallback((level) => {
    switch(level) {
      case 'easy':
        setCurrentQuestions(easyQuestions);
        setTimer(45); // More time for easy questions
        break;
      case 'medium':
        setCurrentQuestions(mediumQuestions);
        setTimer(30); // Standard time for medium questions
        break;
      case 'hard':
        setCurrentQuestions(hardQuestions);
        setTimer(20); // Less time for hard questions
        break;
      default:
        setCurrentQuestions(mediumQuestions);
        setTimer(30);
    }
    setDifficultyLevel(level);
    setShowWelcome(false);
  }, []);

  const handleShareScore = useCallback(() => {
    const shareText = `I scored ${score} out of ${currentQuestions.length} in the Quiz App on ${difficultyLevel} difficulty! Can you beat my score? 🎯`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Quiz App Score',
        text: shareText,
        url: window.location.href
      }).catch((error) => console.log('Error sharing:', error));
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(shareText)
        .then(() => alert('Score copied to clipboard! You can now paste and share it.'))
        .catch(() => alert('Failed to copy score. Your score is: ' + shareText));
    }
  }, [score, currentQuestions.length, difficultyLevel]);

  // Render logic
  if (showWelcome) {
    return (
      <div className="quiz-container" style={{ background: `url(${bgImage})` }}>
        <div className="welcome-screen">
          <h1>Welcome to the Quiz App!</h1>
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <div className="difficulty-buttons">
            <button onClick={() => handleDifficultySelect('easy')}>Easy</button>
            <button onClick={() => handleDifficultySelect('medium')}>Medium</button>
            <button onClick={() => handleDifficultySelect('hard')}>Hard</button>
          </div>
        </div>
      </div>
    );
  }

  if (showScore) {
    return (
      <div className="quiz-container" style={{ background: `url(${bgImage})` }}>
        <div className="score-screen">
          <div className="completion-header">
            <div className="completion-badge">
              <i className="fas fa-trophy"></i>
            </div>
            <h2>Quiz Champion!</h2>
            <div className="player-name">{playerName}</div>
          </div>

          <div className="final-score">
            <div className="score-circle">
              <div className="score-number">{score}</div>
              <div className="total-questions">out of {currentQuestions.length}</div>
            </div>
          </div>

          <div className="performance-stats">
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-value">{Math.round((score/currentQuestions.length) * 100)}%</div>
              <div className="stat-label">Accuracy</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-value">{stats.bestStreak}</div>
              <div className="stat-label">Best Streak</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-value">{Math.round(stats.avgTime)}s</div>
              <div className="stat-label">Avg. Time</div>
            </div>
          </div>

          <div className="achievements-section">
            <h3>Achievements Unlocked</h3>
            <div className="achievements-grid">
              {achievements.map((achievement, index) => (
                <div key={index} className="achievement-card">
                  <div className="achievement-icon">🏆</div>
                  <div className="achievement-text">{achievement}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="detailed-stats">
            <div className="stat-row">
              <span>Correct Answers</span>
              <div className="stat-bar">
                <div 
                  className="stat-fill correct"
                  style={{ width: `${(stats.correct/currentQuestions.length) * 100}%` }}
                ></div>
              </div>
              <span>{stats.correct}</span>
            </div>
            <div className="stat-row">
              <span>Incorrect Answers</span>
              <div className="stat-bar">
                <div 
                  className="stat-fill incorrect"
                  style={{ width: `${(stats.incorrect/currentQuestions.length) * 100}%` }}
                ></div>
              </div>
              <span>{stats.incorrect}</span>
            </div>
          </div>

          <div className="action-buttons">
            <button className="replay-btn" onClick={restartQuiz}>
              <i className="fas fa-redo"></i>
              Play Again
            </button>
            <button className="share-btn" onClick={handleShareScore}>
              <i className="fas fa-share"></i>
              Share Score
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container" style={{ background: `url(${bgImage})` }}>
      <div className="content-wrapper">
        <div className="header">
          <div className="progress-bar">
            <div 
              className="progress" 
              style={{ width: `${((currentQuestion + 1) / currentQuestions.length) * 100}%` }}
            ></div>
          </div>
          <div className="stats-row">
            <div className="timer">
              <i className="fas fa-clock"></i>
              <span>{timer}s</span>
            </div>
            <div className="score">
              <i className="fas fa-star"></i>
              <span>{score}</span>
            </div>
            <div className="combo">
              <i className="fas fa-fire"></i>
              <span>×{combo}</span>
            </div>
          </div>
        </div>

        <div className="question-section">
          <div className="question-number">
            Question {currentQuestion + 1} of {currentQuestions.length}
          </div>
          <div className="question-text">
            {currentQuestions[currentQuestion].questionText}
          </div>
        </div>

        <div className="options">
          {currentQuestions[currentQuestion].options.map((option, index) => (
            option && (
              <button
                key={index}
                className={getOptionClassName(option)}
                onClick={() => handleAnswerClick(option)}
                disabled={selectedOption !== null}
              >
                <span className="option-letter">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="option-text">{option}</span>
              </button>
            )
          ))}
        </div>

        {feedback && (
          <div className={`feedback ${feedback.toLowerCase()}`}>
            <div className="feedback-icon">
              {feedback === 'Correct!' ? '✅' : '❌'}
            </div>
            <div className="feedback-text">{feedback}</div>
          </div>
        )}

        {showHint && (
          <div className="hint">
            <div className="hint-icon">💡</div>
            <div className="hint-text">
              {currentQuestions[currentQuestion].hint}
            </div>
          </div>
        )}

        <div className="lifelines">
          <button
            className={`lifeline ${!lifelines.fiftyFifty ? 'used' : ''}`}
            onClick={useFiftyFifty}
            disabled={!lifelines.fiftyFifty || selectedOption !== null}
          >
            <span className="lifeline-icon">50:50</span>
            <span className="lifeline-count">({lifelines.fiftyFifty})</span>
          </button>
          <button
            className={`lifeline ${!lifelines.timeExtension ? 'used' : ''}`}
            onClick={useTimeExtension}
            disabled={!lifelines.timeExtension}
          >
            <span className="lifeline-icon">⏰</span>
            <span className="lifeline-count">({lifelines.timeExtension})</span>
          </button>
          <button
            className={`lifeline ${!lifelines.hint ? 'used' : ''}`}
            onClick={useHint}
            disabled={!lifelines.hint || showHint}
          >
            <span className="lifeline-icon">💡</span>
            <span className="lifeline-count">({lifelines.hint})</span>
          </button>
        </div>

        <button
          className="mute-button"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>
    </div>
  );
}

export default App;
