import { useEffect, useState } from 'react';

export default function TimeSelect({ label, value, onChange }) {
  // Value format from DB: "09 AM" ya "09:30 PM" ya khaali
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [period, setPeriod] = useState('AM');

  // Jab edit mode mein value aaye, to usko parse karein
  useEffect(() => {
    if (value) {
      const parts = value.trim().split(' ');
      if (parts.length === 2) {
        const time = parts[0].split(':');
        setHour(time[0]);
        setMinute(time[1] && time[1] !== '00' ? time[1] : '');
        setPeriod(parts[1]);
      }
    }
  }, [value]);

  // Jab bhi koi dropdown change ho, parent ko naya string bhejein
  function updateTime(h, m, p) {
    setHour(h);
    setMinute(m);
    setPeriod(p);

    if (!h) {
      onChange('');
      return;
    }
    
    // Agar minutes 00 ya khaali hain to sirf "09 AM" bhejein, warna "09:30 AM"
    const timeStr = m && m !== '00' ? `${h}:${m} ${p}` : `${h} ${p}`;
    onChange(timeStr);
  }

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-content-secondary mb-1">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <select
          value={hour}
          onChange={(e) => updateTime(e.target.value, minute, period)}
          className="flex-1 px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40"
        >
          <option value="">--</option>
          {[...Array(12)].map((_, i) => {
            const h = String(i + 1).padStart(2, '0');
            return <option key={h} value={h}>{h}</option>;
          })}
        </select>

        <select
          value={minute}
          onChange={(e) => updateTime(hour, e.target.value, period)}
          className="w-24 px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40"
        >
          <option value="">00</option>
          <option value="15">15</option>
          <option value="30">30</option>
          <option value="45">45</option>
        </select>

        <select
          value={period}
          onChange={(e) => updateTime(hour, minute, e.target.value)}
          className="w-20 px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-brand/40"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}