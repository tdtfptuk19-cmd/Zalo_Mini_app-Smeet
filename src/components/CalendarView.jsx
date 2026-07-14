import React from 'react';

export const CalendarView = React.memo(({
  currentDate,
  setCurrentDate,
  selectedDate,
  setSelectedDate,
  meetings,
  currentUser
}) => {
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    const calendarDays = [];
    // Pad previous month days (aligning Monday as start of week)
    const padding = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    for (let i = 0; i < padding; i++) {
      calendarDays.push(null);
    }
    // Add current month days
    for (let d = 1; d <= days; d++) {
      calendarDays.push(new Date(year, month, d));
    }
    return calendarDays;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleMonthChange = (e) => {
    const month = parseInt(e.target.value, 10);
    setCurrentDate(new Date(currentDate.getFullYear(), month, 1));
  };

  const handleYearChange = (e) => {
    const year = parseInt(e.target.value, 10);
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="card calendar-container-card">
      <div className="calendar-widget">
        
        {/* Navigation & Selectors */}
        <div className="calendar-month-header">
          <div className="calendar-dropdowns-group">
            <select 
              value={currentDate.getMonth()} 
              onChange={handleMonthChange}
              className="select-input calendar-month-select"
            >
              {months.map(m => (
                <option key={m} value={m}>Tháng {m + 1}</option>
              ))}
            </select>
            <select 
              value={currentDate.getFullYear()} 
              onChange={handleYearChange}
              className="select-input calendar-year-select"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <div className="calendar-controls">
            <button className="btn calendar-nav-btn" onClick={handlePrevMonth} title="Tháng trước">&lt;</button>
            <button className="btn calendar-today-btn" onClick={handleJumpToToday}>Hôm nay</button>
            <button className="btn calendar-nav-btn" onClick={handleNextMonth} title="Tháng sau">&gt;</button>
          </div>
        </div>

        {/* Days of week */}
        <div className="calendar-grid">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
            <div key={d} className="calendar-weekday">{d}</div>
          ))}
          
          {/* Days grid */}
          {getDaysInMonth(currentDate).map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="calendar-cell-empty"></div>;
            
            const isSelected = day.toDateString() === selectedDate.toDateString();
            const isToday = day.toDateString() === new Date().toDateString();
            
            // Check if day has meetings visible to current user
            const dayHasMeeting = meetings.some(m => {
              const isDateMatch = new Date(m.startTime).toDateString() === day.toDateString();
              if (!isDateMatch) return false;
              if (!currentUser) return false;
              const isHost = m.createdBy === currentUser.id || m.hostPhone === currentUser.phone;
              const isInvited = (m.members && m.members.includes(currentUser.id)) || 
                                (m.memberPhones && m.memberPhones.includes(currentUser.phone));
              return isHost || isInvited;
            });

            return (
              <button 
                key={day.toISOString()} 
                type="button"
                className={`calendar-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${dayHasMeeting ? 'has-meeting' : ''}`}
                onClick={() => setSelectedDate(day)}
              >
                <span className="calendar-date-number">{day.getDate()}</span>
                {dayHasMeeting && <span className="calendar-meeting-dot" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

CalendarView.displayName = 'CalendarView';
