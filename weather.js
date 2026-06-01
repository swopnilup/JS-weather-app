let unit = 'C';
let cachedData = null;

// ── Generate stars ───────────────────────────────────────────────────────────
const starsEl = document.getElementById('stars');
for(let i=0; i<80; i++){
  const s = document.createElement('div');
  s.className = 'star';
  s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${(Math.random()*3).toFixed(2)}s;animation-duration:${(2+Math.random()*3).toFixed(2)}s;opacity:${(0.3+Math.random()*0.7).toFixed(2)}`;
  starsEl.appendChild(s);
}

// ── Generate rain ─────────────────────────────────────────────────────────────
const rainC = document.getElementById('rainContainer');
for(let i=0; i<80; i++){
  const r = document.createElement('div');
  r.className = 'raindrop';
  const h = 12 + Math.random()*20;
  r.style.cssText = `left:${Math.random()*100}%;height:${h}px;animation-duration:${(0.6+Math.random()*0.8).toFixed(2)}s;animation-delay:${(Math.random()*2).toFixed(2)}s`;
  rainC.appendChild(r);
}

// ── Generate snow ─────────────────────────────────────────────────────────────
const snowC = document.getElementById('snowContainer');
for(let i=0; i<50; i++){
  const s = document.createElement('div');
  s.className = 'snowflake';
  const size = 3 + Math.random()*5;
  s.style.cssText = `left:${Math.random()*100}%;width:${size}px;height:${size}px;animation-duration:${(4+Math.random()*6).toFixed(2)}s;animation-delay:${(Math.random()*6).toFixed(2)}s`;
  snowC.appendChild(s);
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function showLoading() {
  document.getElementById('statusMsg').innerHTML = '<div class="spinner"></div><span>Fetching weather…</span>';
  document.getElementById('statusMsg').style.display = 'flex';
  document.getElementById('weatherContent').style.display = 'none';
  document.getElementById('unitToggleWrap').style.display = 'none';
}
function showError(msg) {
  document.getElementById('statusMsg').innerHTML = `<span style="font-size:42px">😶‍🌫️</span><span>${msg}</span>`;
  document.getElementById('statusMsg').style.display = 'flex';
  document.getElementById('weatherContent').style.display = 'none';
  document.getElementById('unitToggleWrap').style.display = 'none';
}

// ── WMO code → emoji + description ───────────────────────────────────────────
function wmoInfo(code, isNight=false) {
  const map = {
    0: { icon: isNight ? '🌙' : '☀️', desc: isNight ? 'Clear night' : 'Clear sky' },
    1: { icon: isNight ? '🌙' : '🌤️', desc: 'Mainly clear' },
    2: { icon: '⛅', desc: 'Partly cloudy' },
    3: { icon: '☁️', desc: 'Overcast' },
    45: { icon: '🌫️', desc: 'Foggy' }, 48: { icon: '🌫️', desc: 'Icy fog' },
    51: { icon: '🌦️', desc: 'Light drizzle' }, 53: { icon: '🌦️', desc: 'Drizzle' }, 55: { icon: '🌧️', desc: 'Heavy drizzle' },
    61: { icon: '🌧️', desc: 'Light rain' }, 63: { icon: '🌧️', desc: 'Moderate rain' }, 65: { icon: '🌧️', desc: 'Heavy rain' },
    71: { icon: '🌨️', desc: 'Light snow' }, 73: { icon: '🌨️', desc: 'Moderate snow' }, 75: { icon: '❄️', desc: 'Heavy snow' },
    77: { icon: '🌨️', desc: 'Snow grains' },
    80: { icon: '🌦️', desc: 'Light showers' }, 81: { icon: '🌧️', desc: 'Showers' }, 82: { icon: '⛈️', desc: 'Heavy showers' },
    85: { icon: '🌨️', desc: 'Snow showers' }, 86: { icon: '🌨️', desc: 'Heavy snow showers' },
    95: { icon: '⛈️', desc: 'Thunderstorm' }, 96: { icon: '⛈️', desc: 'Thunderstorm + hail' }, 99: { icon: '⛈️', desc: 'Thunderstorm + heavy hail' },
  };
  return map[code] || { icon: '🌡️', desc: 'Unknown' };
}

function uvLabel(uv) {
  if(uv <= 2) return 'Low';
  if(uv <= 5) return 'Moderate';
  if(uv <= 7) return 'High';
  if(uv <= 10) return 'Very High';
  return 'Extreme';
}
function windDirName(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg/45) % 8];
}
function toF(c) { return (c * 9/5 + 32); }
function fmt(c) { return unit === 'C' ? Math.round(c) + '°' : Math.round(toF(c)) + '°'; }
function fmtSpeed(kmh) { return unit === 'C' ? Math.round(kmh) + ' km/h' : Math.round(kmh * 0.621) + ' mph'; }

function dayName(dateStr, i) {
  if(i === 0) return 'Today';
  if(i === 1) return 'Tomorrow';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatHour(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  if(h === 0) return '12 AM';
  if(h === 12) return '12 PM';
  return h < 12 ? h + ' AM' : (h-12) + ' PM';
}

// ── Set unit ──────────────────────────────────────────────────────────────────
function setUnit(u) {
  unit = u;
  document.getElementById('btnC').classList.toggle('active', u === 'C');
  document.getElementById('btnF').classList.toggle('active', u === 'F');
  if(cachedData) renderWeather(cachedData);
}
window.setUnit = setUnit;

// ── Apply sky theme ───────────────────────────────────────────────────────────
function applySkyTheme(wmoCode, hour) {
  const body = document.body;
  body.classList.remove('evening','cloudy','rainy','snowy');
  if(wmoCode >= 71 && wmoCode <= 77) body.classList.add('snowy');
  else if(wmoCode >= 51 && wmoCode <= 82) body.classList.add('rainy');
  else if(wmoCode === 3) body.classList.add('cloudy');
  else if(hour >= 19 || hour < 6) body.classList.add('evening');
}

// ── Geocode via Open-Meteo Geocoding API ──────────────────────────────────────
async function geocode(city) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  const d = await res.json();
  if(!d.results || !d.results.length) throw new Error(`City "${city}" not found.`);
  return { lat: d.results[0].latitude, lon: d.results[0].longitude, name: d.results[0].name, country: d.results[0].country, admin1: d.results[0].admin1 };
}

// ── Reverse geocode (coords → name) ───────────────────────────────────────────
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    const d = await res.json();
    const city = d.address.city || d.address.town || d.address.village || d.address.county || 'Your Location';
    const country = d.address.country || '';
    return { name: city, country };
  } catch { return { name: 'Your Location', country: '' }; }
}

// ── Fetch weather from Open-Meteo ─────────────────────────────────────────────
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,surface_pressure,visibility` +
    `&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max` +
    `&timezone=auto&forecast_days=7`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Weather data unavailable.');
  return res.json();
}

// ── Main search flow ──────────────────────────────────────────────────────────
async function doSearch(input) {
  showLoading();
  try {
    const loc = await geocode(input);
    const wx = await fetchWeather(loc.lat, loc.lon);
    wx._name = loc.admin1 ? `${loc.name}, ${loc.admin1}` : loc.name;
    wx._country = loc.country;
    cachedData = wx;
    renderWeather(wx);
  } catch(e) { showError(e.message || 'Something went wrong.'); }
}

async function doGPS() {
  if(!navigator.geolocation) { showError('Geolocation not supported by your browser.'); return; }
  showLoading();
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const { latitude: lat, longitude: lon } = pos.coords;
      const [loc, wx] = await Promise.all([reverseGeocode(lat, lon), fetchWeather(lat, lon)]);
      wx._name = loc.name;
      wx._country = loc.country;
      cachedData = wx;
      renderWeather(wx);
    } catch(e) { showError(e.message || 'Something went wrong.'); }
  }, () => showError('Location access denied.'));
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderWeather(wx) {
  const cur = wx.current;
  const hourly = wx.hourly;
  const daily = wx.daily;
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;
  const info = wmoInfo(cur.weather_code, isNight);

  applySkyTheme(cur.weather_code, hour);

  // Find current hour index
  const nowISO = now.toISOString().slice(0,13);
  let hIdx = hourly.time.findIndex(t => t.startsWith(nowISO));
  if(hIdx < 0) hIdx = 0;

  // Next 24 hours
  const nextHours = [];
  for(let i=0; i<24; i++){
    const idx = hIdx + i;
    if(idx >= hourly.time.length) break;
    nextHours.push({ time: hourly.time[idx], temp: hourly.temperature_2m[idx], code: hourly.weather_code[idx], rain: hourly.precipitation_probability[idx] });
  }

  // Sunrise/sunset
  const sunrise = daily.sunrise[0] ? new Date(daily.sunrise[0]).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : '—';
  const sunset = daily.sunset[0] ? new Date(daily.sunset[0]).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : '—';

  // Day length
  let dayLenStr = '—';
  if(daily.sunrise[0] && daily.sunset[0]){
    const mins = (new Date(daily.sunset[0]) - new Date(daily.sunrise[0])) / 60000;
    dayLenStr = `${Math.floor(mins/60)}h ${Math.round(mins%60)}m`;
  }

  const uv = daily.uv_index_max[0] || 0;
  const uvPct = Math.min(uv/12*100,100).toFixed(1);
  const windCode = cur.wind_direction_10m || 0;

  const dateStr = now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const locationName = wx._name || 'Unknown';
  const country = wx._country || '';

  const html = `
    <div class="hero-card">
      <div class="city-name">${locationName}${country ? `<span style="font-size:0.45em;color:var(--text-muted);font-family:'DM Sans',sans-serif;font-weight:300;margin-left:10px;">${country}</span>` : ''}</div>
      <div class="city-date">${dateStr}</div>
      <div class="hero-main">
        <div class="temp-block">
          <div class="temp-big">${fmt(cur.temperature_2m).replace('°','')}</div>
          <div class="temp-unit" onclick="setUnit(unit==='C'?'F':'C')">°${unit}</div>
        </div>
        <div class="weather-desc-block">
          <span class="weather-icon">${info.icon}</span>
          <div class="weather-desc">${info.desc}</div>
          <div class="feels-like">Feels like ${fmt(cur.apparent_temperature)}</div>
        </div>
      </div>
      <div class="hero-stats">
        <div class="stat"><div class="stat-label">Humidity</div><div class="stat-value">${cur.relative_humidity_2m}%</div></div>
        <div class="stat"><div class="stat-label">Wind</div><div class="stat-value">${fmtSpeed(cur.wind_speed_10m)}</div></div>
        <div class="stat"><div class="stat-label">Pressure</div><div class="stat-value">${Math.round(cur.surface_pressure)} hPa</div></div>
        <div class="stat"><div class="stat-label">Visibility</div><div class="stat-value">${cur.visibility >= 1000 ? (cur.visibility/1000).toFixed(0)+'km' : cur.visibility+'m'}</div></div>
      </div>
    </div>

    <p class="section-title">24-Hour Forecast</p>
    <div class="hourly-wrap">
      <button class="scroll-btn scroll-btn-left hidden" id="scrollLeft" onclick="slideHourly(-1)">&#8249;</button>
      <div class="hourly-scroll" id="hourlyScroll">
        ${nextHours.map((h,i) => {
          const hi = wmoInfo(h.code, new Date(h.time).getHours() < 6 || new Date(h.time).getHours() >= 19);
          return `<div class="hour-card ${i===0?'active':''}">
            <div class="hour-time">${i===0?'Now':formatHour(h.time)}</div>
            <div class="hour-icon">${hi.icon}</div>
            <div class="hour-temp">${fmt(h.temp)}</div>
            ${h.rain > 0 ? `<div class="hour-rain">💧${h.rain}%</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <button class="scroll-btn scroll-btn-right" id="scrollRight" onclick="slideHourly(1)">&#8250;</button>
    </div>

    <p class="section-title">7-Day Forecast</p>
    <div class="daily-list">
      ${daily.weather_code.map((code, i) => {
        const di = wmoInfo(code);
        return `<div class="day-row">
          <div class="day-name">${dayName(daily.time[i], i)}</div>
          <div class="day-icon">${di.icon}</div>
          <div class="day-desc">${di.desc}</div>
          <div class="day-rain-bar"><div class="day-rain-fill" style="width:${daily.precipitation_probability_max[i]||0}%"></div></div>
          <div class="day-temps">
            <span class="day-high">${fmt(daily.temperature_2m_max[i])}</span>
            <span class="day-low">${fmt(daily.temperature_2m_min[i])}</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-title">☀️ Sun & Daylight</div>
        <div class="sun-row"><span>Sunrise</span><strong>${sunrise}</strong></div>
        <div class="sun-row"><span>Sunset</span><strong>${sunset}</strong></div>
        <div class="sun-row"><span>Day length</span><strong>${dayLenStr}</strong></div>
      </div>
      <div class="info-card">
        <div class="info-card-title">🌡️ UV Index</div>
        <div class="uv-label">${uv.toFixed(1)}</div>
        <div class="uv-text">${uvLabel(uv)}</div>
        <div class="uv-bar"><div class="uv-marker" style="left:${uvPct}%"></div></div>
      </div>
      <div class="info-card" style="text-align:center;">
        <div class="info-card-title">💨 Wind Direction</div>
        <div class="compass">
          <div class="compass-ring">
            <span class="compass-dir n">N</span>
            <span class="compass-dir s">S</span>
            <span class="compass-dir e">E</span>
            <span class="compass-dir w">W</span>
            <div class="compass-arrow" style="transform:translateX(-50%) rotate(${windCode}deg)"></div>
            <div class="compass-dot"></div>
          </div>
        </div>
        <div class="wind-speed">${windDirName(windCode)} <span class="wind-unit">${fmtSpeed(cur.wind_speed_10m)}</span></div>
      </div>
    </div>
  `;

  document.getElementById('weatherContent').innerHTML = html;
  document.getElementById('weatherContent').style.display = 'block';
  document.getElementById('statusMsg').style.display = 'none';
  document.getElementById('unitToggleWrap').style.display = 'block';
  document.getElementById('footer').textContent = `Data from Open-Meteo • Updated ${now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}`;

  // Wire up scroll button visibility
  const scroller = document.getElementById('hourlyScroll');
  if(scroller) {
    scroller.addEventListener('scroll', updateScrollBtns);
    updateScrollBtns();
  }
}

// ── Hourly scroll buttons ─────────────────────────────────────────────────────
function updateScrollBtns() {
  const el = document.getElementById('hourlyScroll');
  const btnL = document.getElementById('scrollLeft');
  const btnR = document.getElementById('scrollRight');
  if(!el || !btnL || !btnR) return;
  btnL.classList.toggle('hidden', el.scrollLeft <= 4);
  btnR.classList.toggle('hidden', el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
}
function slideHourly(dir) {
  const el = document.getElementById('hourlyScroll');
  if(!el) return;
  el.scrollBy({ left: dir * 260, behavior: 'smooth' });
}
window.slideHourly = slideHourly;

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('searchBtn').addEventListener('click', () => {
  const v = document.getElementById('cityInput').value.trim();
  if(v) doSearch(v);
});
document.getElementById('cityInput').addEventListener('keydown', e => {
  if(e.key === 'Enter') {
    const v = document.getElementById('cityInput').value.trim();
    if(v) doSearch(v);
  }
});
document.getElementById('locBtn').addEventListener('click', doGPS);

// Auto-load with user's location if possible
doGPS();