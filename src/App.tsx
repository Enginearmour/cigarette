import React, { useState, useEffect, useRef } from 'react';
import './App.css';

interface CigaretteRecord {
  id: number;
  timestamp: Date;
  timeSinceLast?: number;
}

interface QuittingSettings {
  enabled: boolean;
  percentage: number;
  baseInterval: number; // in minutes
  currentInterval: number; // in minutes
  startDate: Date;
  daysActive: number;
}

interface DailyCount {
  date: string; // YYYY-MM-DD format
  count: number;
}

interface FloatingIconPosition {
  x: number;
  y: number;
}

function App() {
  const [cigarettes, setCigarettes] = useState<CigaretteRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dailyCount, setDailyCount] = useState<DailyCount>({ date: '', count: 0 });
  const [quittingMode, setQuittingMode] = useState<QuittingSettings>({
    enabled: false,
    percentage: 10,
    baseInterval: 30, // 30 minutes default
    currentInterval: 30,
    startDate: new Date(),
    daysActive: 0
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [iconPosition, setIconPosition] = useState<FloatingIconPosition>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const floatingIconRef = useRef<HTMLDivElement>(null);

  // Get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedCigarettes = localStorage.getItem('cigarette-counter');
    if (savedCigarettes) {
      const parsed = JSON.parse(savedCigarettes);
      const cigarettesWithDates = parsed.map((cig: any) => ({
        ...cig,
        timestamp: new Date(cig.timestamp)
      }));
      setCigarettes(cigarettesWithDates);
    }

    const savedQuitting = localStorage.getItem('quitting-settings');
    if (savedQuitting) {
      const parsed = JSON.parse(savedQuitting);
      setQuittingMode({
        ...parsed,
        startDate: new Date(parsed.startDate)
      });
    }

    // Load daily count
    const savedDailyCount = localStorage.getItem('daily-count');
    const today = getTodayString();
    
    if (savedDailyCount) {
      const parsed = JSON.parse(savedDailyCount);
      if (parsed.date === today) {
        setDailyCount(parsed);
      } else {
        // New day, reset counter
        const newDailyCount = { date: today, count: 0 };
        setDailyCount(newDailyCount);
        localStorage.setItem('daily-count', JSON.stringify(newDailyCount));
      }
    } else {
      // First time, initialize
      const newDailyCount = { date: today, count: 0 };
      setDailyCount(newDailyCount);
      localStorage.setItem('daily-count', JSON.stringify(newDailyCount));
    }

    // Load minimized state
    const savedMinimized = localStorage.getItem('minimized-state');
    if (savedMinimized) {
      setIsMinimized(JSON.parse(savedMinimized));
    }

    // Load icon position
    const savedPosition = localStorage.getItem('floating-icon-position');
    if (savedPosition) {
      setIconPosition(JSON.parse(savedPosition));
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('cigarette-counter', JSON.stringify(cigarettes));
  }, [cigarettes]);

  useEffect(() => {
    localStorage.setItem('quitting-settings', JSON.stringify(quittingMode));
  }, [quittingMode]);

  useEffect(() => {
    localStorage.setItem('daily-count', JSON.stringify(dailyCount));
  }, [dailyCount]);

  useEffect(() => {
    localStorage.setItem('minimized-state', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    localStorage.setItem('floating-icon-position', JSON.stringify(iconPosition));
  }, [iconPosition]);

  // Check for day change and reset counter if needed
  useEffect(() => {
    const today = getTodayString();
    if (dailyCount.date !== today) {
      const newDailyCount = { date: today, count: 0 };
      setDailyCount(newDailyCount);
    }
  }, [currentTime, dailyCount.date]);

  // Update quitting mode daily
  useEffect(() => {
    if (!quittingMode.enabled) return;

    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - quittingMode.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceStart > quittingMode.daysActive) {
      const newInterval = Math.round(quittingMode.baseInterval * Math.pow(1 + quittingMode.percentage / 100, daysSinceStart));
      
      setQuittingMode(prev => ({
        ...prev,
        daysActive: daysSinceStart,
        currentInterval: newInterval
      }));
    }
  }, [currentTime, quittingMode.enabled, quittingMode.startDate, quittingMode.daysActive, quittingMode.baseInterval, quittingMode.percentage]);

  // Drag functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep icon within viewport bounds
      const iconSize = 80;
      const maxX = window.innerWidth - iconSize;
      const maxY = window.innerHeight - iconSize;
      
      setIconPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragOffset]);

  // Touch drag functionality
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const newX = touch.clientX - dragOffset.x;
      const newY = touch.clientY - dragOffset.y;
      
      // Keep icon within viewport bounds
      const iconSize = 80;
      const maxX = window.innerWidth - iconSize;
      const maxY = window.innerHeight - iconSize;
      
      setIconPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset]);

  const addCigarette = () => {
    const now = new Date();
    const lastCigarette = cigarettes[cigarettes.length - 1];
    
    let timeSinceLast: number | undefined;
    if (lastCigarette) {
      timeSinceLast = Math.floor((now.getTime() - lastCigarette.timestamp.getTime()) / (1000 * 60));
    }

    const newCigarette: CigaretteRecord = {
      id: Date.now(),
      timestamp: now,
      timeSinceLast
    };

    setCigarettes(prev => [...prev, newCigarette]);

    // Update daily count
    const today = getTodayString();
    setDailyCount(prev => {
      if (prev.date === today) {
        return { ...prev, count: prev.count + 1 };
      } else {
        // New day
        return { date: today, count: 1 };
      }
    });
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      setCigarettes([]);
    }
  };

  const resetDailyCount = () => {
    if (confirm('Are you sure you want to reset today\'s count?')) {
      const today = getTodayString();
      setDailyCount({ date: today, count: 0 });
    }
  };

  const toggleQuittingMode = () => {
    if (!quittingMode.enabled) {
      // Starting quitting mode - use current baseInterval setting
      setQuittingMode(prev => ({
        ...prev,
        enabled: true,
        currentInterval: prev.baseInterval,
        startDate: new Date(),
        daysActive: 0
      }));
    } else {
      // Stopping quitting mode
      setQuittingMode(prev => ({
        ...prev,
        enabled: false
      }));
    }
  };

  const updateQuittingPercentage = (percentage: number) => {
    setQuittingMode(prev => ({
      ...prev,
      percentage: Math.max(1, Math.min(100, percentage))
    }));
  };

  const updateBaseInterval = (minutes: number) => {
    const validMinutes = Math.max(1, Math.min(1440, minutes)); // 1 minute to 24 hours
    setQuittingMode(prev => ({
      ...prev,
      baseInterval: validMinutes,
      // If quitting mode is active and we're on day 0, update current interval too
      currentInterval: prev.enabled && prev.daysActive === 0 ? validMinutes : prev.currentInterval
    }));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h ${remainingMinutes}m`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const getTimeSinceLastCigarette = () => {
    if (cigarettes.length === 0) return null;
    
    const lastCigarette = cigarettes[cigarettes.length - 1];
    const minutesSince = Math.floor((currentTime.getTime() - lastCigarette.timestamp.getTime()) / (1000 * 60));
    return minutesSince;
  };

  const canSmoke = () => {
    if (!quittingMode.enabled) return true;
    
    const timeSinceLast = getTimeSinceLastCigarette();
    if (timeSinceLast === null) return true;
    
    return timeSinceLast >= quittingMode.currentInterval;
  };

  const getTimeUntilNextCigarette = () => {
    if (!quittingMode.enabled) return null;
    
    const timeSinceLast = getTimeSinceLastCigarette();
    if (timeSinceLast === null) return null;
    
    const timeRemaining = quittingMode.currentInterval - timeSinceLast;
    return Math.max(0, timeRemaining);
  };

  const timeSinceLast = getTimeSinceLastCigarette();
  const timeUntilNext = getTimeUntilNextCigarette();
  const smokingAllowed = canSmoke();

  // Determine button class based on state
  const getButtonClass = () => {
    if (!smokingAllowed) return 'add-button disabled';
    if (quittingMode.enabled && smokingAllowed) return 'add-button ready';
    return 'add-button';
  };

  // Handle floating icon mouse down
  const handleFloatingIconMouseDown = (e: React.MouseEvent) => {
    if (!floatingIconRef.current) return;
    
    const rect = floatingIconRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  // Handle floating icon touch start
  const handleFloatingIconTouchStart = (e: React.TouchEvent) => {
    if (!floatingIconRef.current) return;
    
    const rect = floatingIconRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    setIsDragging(true);
  };

  // Handle floating icon tap/double-tap
  const handleFloatingIconClick = (e: React.MouseEvent) => {
    // Don't trigger click if we were dragging
    if (isDragging) return;
    
    setTapCount(prev => prev + 1);
    
    setTimeout(() => {
      if (tapCount === 0) {
        // Single tap - add cigarette if allowed
        if (smokingAllowed) {
          addCigarette();
        }
      } else if (tapCount === 1) {
        // Double tap - expand to full screen
        setIsMinimized(false);
      }
      setTapCount(0);
    }, 300);
  };

  // Get floating icon class based on smoking state
  const getFloatingIconClass = () => {
    let baseClass = 'floating-icon';
    if (isDragging) baseClass += ' dragging';
    if (!smokingAllowed) return `${baseClass} disabled`;
    if (quittingMode.enabled && smokingAllowed) return `${baseClass} ready`;
    return baseClass;
  };

  // Minimized floating icon view
  if (isMinimized) {
    return (
      <div className="minimized-app">
        <div 
          ref={floatingIconRef}
          className={getFloatingIconClass()}
          style={{
            left: `${iconPosition.x}px`,
            top: `${iconPosition.y}px`,
            right: 'auto'
          }}
          onMouseDown={handleFloatingIconMouseDown}
          onTouchStart={handleFloatingIconTouchStart}
          onClick={handleFloatingIconClick}
          title={smokingAllowed ? 'Drag to move, Tap to light one, Double-tap to expand' : 'Drag to move, Wait longer before next cigarette'}
        >
          <span className="floating-icon-emoji">🚬</span>
          <span className="floating-icon-count">{dailyCount.count}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-content">
          <h1>🚬 Cigarette Counter</h1>
          <p className="subtitle">Track your smoking habits</p>
        </div>
        <button 
          className="minimize-button"
          onClick={() => setIsMinimized(true)}
          title="Minimize to floating icon"
        >
          ➖
        </button>
      </div>

      {/* Daily Counter Display */}
      <div className="daily-counter">
        <div className="daily-count-display">
          <span className="daily-count-number">{dailyCount.count}</span>
          <span className="daily-count-label">cigarettes today</span>
        </div>
        <div className="daily-counter-actions">
          <span className="daily-date">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })}
          </span>
          {dailyCount.count > 0 && (
            <button className="reset-daily-button" onClick={resetDailyCount}>
              Reset Today
            </button>
          )}
        </div>
      </div>

      {/* Quitting Mode Toggle */}
      <div className="quitting-section">
        <div className="quitting-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={quittingMode.enabled}
              onChange={toggleQuittingMode}
            />
            <span className="slider"></span>
          </label>
          <span className="toggle-label">
            Quitting Mode {quittingMode.enabled ? 'ON' : 'OFF'}
          </span>
          <button 
            className="settings-button"
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️
          </button>
        </div>

        {showSettings && (
          <div className="settings-panel">
            <div className="setting-item">
              <label>Initial Wait Time (minutes):</label>
              <div className="minutes-input">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={quittingMode.baseInterval}
                  onChange={(e) => updateBaseInterval(Number(e.target.value))}
                />
                <span>min</span>
              </div>
            </div>
            <div className="setting-item">
              <label>Daily Extension Percentage:</label>
              <div className="percentage-input">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={quittingMode.percentage}
                  onChange={(e) => updateQuittingPercentage(Number(e.target.value))}
                />
                <span>%</span>
              </div>
            </div>
            <div className="setting-info">
              <p>Start with {formatDuration(quittingMode.baseInterval)} wait time</p>
              <p>Increases by {quittingMode.percentage}% each day</p>
              {quittingMode.enabled && (
                <p>Current wait time: <strong>{formatDuration(quittingMode.currentInterval)}</strong></p>
              )}
            </div>
          </div>
        )}

        {quittingMode.enabled && (
          <div className="quitting-status">
            <div className="status-item">
              <span className="status-label">Day:</span>
              <span className="status-value">{quittingMode.daysActive + 1}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Required Wait:</span>
              <span className="status-value">{formatDuration(quittingMode.currentInterval)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="main-counter">
        <div className="count-display">
          <span className="count-number">{cigarettes.length}</span>
          <span className="count-label">total records</span>
        </div>

        {timeSinceLast !== null && (
          <div className="time-since-last">
            <span className="time-label">Time since last:</span>
            <span className="time-value">{formatDuration(timeSinceLast)}</span>
          </div>
        )}

        {quittingMode.enabled && timeUntilNext !== null && timeUntilNext > 0 && (
          <div className="time-until-next">
            <span className="time-label">Time until next allowed:</span>
            <span className="time-value countdown">{formatDuration(timeUntilNext)}</span>
          </div>
        )}

        <button 
          className={getButtonClass()}
          onClick={addCigarette}
          disabled={!smokingAllowed}
        >
          <span className="button-icon">🚬</span>
          <span>{smokingAllowed ? 'Light One' : 'Wait Longer'}</span>
        </button>

        {!smokingAllowed && (
          <p className="wait-message">
            You need to wait {formatDuration(timeUntilNext!)} more before your next cigarette
          </p>
        )}
      </div>

      {cigarettes.length > 0 && (
        <div className="history">
          <div className="history-header">
            <h3>Recent History</h3>
            <button className="clear-button" onClick={clearHistory}>
              Clear All
            </button>
          </div>
          
          <div className="history-list">
            {cigarettes.slice(-10).reverse().map((cigarette, index) => (
              <div key={cigarette.id} className="history-item">
                <div className="history-time">
                  {formatTime(cigarette.timestamp)}
                </div>
                <div className="history-gap">
                  {cigarette.timeSinceLast !== undefined ? (
                    <span className={`gap-time ${cigarette.timeSinceLast < 30 ? 'short' : cigarette.timeSinceLast > 120 ? 'long' : 'medium'}`}>
                      {formatDuration(cigarette.timeSinceLast)} gap
                    </span>
                  ) : (
                    <span className="first-cigarette">First of the day</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cigarettes.length === 0 && (
        <div className="empty-state">
          <p>Click "Light One" when you have your first cigarette</p>
        </div>
      )}
    </div>
  );
}

export default App;
