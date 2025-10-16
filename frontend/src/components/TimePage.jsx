import React, { useState, useEffect } from 'react';

function TimePage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50" style={{backgroundColor: '#111827'}}>
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center" style={{backgroundColor: '#1f2937'}}>
        <div className="text-6xl font-mono font-black text-blue-400 mb-2" style={{color: '#60a5fa', fontSize: '4rem', lineHeight: '1'}}>
          {formatTime(currentTime)}
        </div>
        <div className="text-lg text-gray-300" style={{color: '#d1d5db', fontSize: '1rem'}}>
          {formatDate(currentTime)}
        </div>
      </div>
    </div>
  );
}

export default TimePage;
