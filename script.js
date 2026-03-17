const themeToggle = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

function updateThemeButton(theme) {
  if (!themeToggle) return;

  const icon = themeToggle.querySelector('.theme-toggle__icon');
  const label = themeToggle.querySelector('.theme-toggle__label');

  if (icon) {
    icon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  if (label) {
    label.textContent = theme === 'dark' ? 'Dark' : 'Light';
  }
}

const savedTheme = localStorage.getItem('theme') || 'dark';
htmlEl.setAttribute('data-theme', savedTheme);
updateThemeButton(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const currentTheme = htmlEl.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButton(newTheme);
  });
}

const searchBtn = document.getElementById('search-button');
const cityInput = document.getElementById('city-input');
const statusMsg = document.getElementById('status-message');

if (searchBtn && cityInput) {
  searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
      getWeatherForCity(city);
    }
  });

  cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const city = cityInput.value.trim();
      if (city) {
        getWeatherForCity(city);
      }
    }
  });
}

async function getWeatherForCity(city) {
  try {
    if (statusMsg) {
      statusMsg.textContent = 'Searching...';
    }

    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      if (statusMsg) {
        statusMsg.textContent = 'City not found. Please try again.';
      }
      return;
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,weather_code&daily=uv_index_max&timezone=auto`);
    const weatherData = await weatherRes.json();

    const aqiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi,pm10`);
    const aqiData = await aqiRes.json();

    updateUI(name, country, weatherData, aqiData);

    if (statusMsg) {
      statusMsg.textContent = '';
    }
  } catch (error) {
    console.error(error);
    if (statusMsg) {
      statusMsg.textContent = 'Error fetching data. Check your connection.';
    }
  }
}

function updateUI(city, country, weather, aqi) {
  const current = weather.current;

  const cityEl = document.getElementById('current-city');
  const timeEl = document.getElementById('current-time');
  const tempEl = document.getElementById('current-temp');
  const feelsEl = document.getElementById('current-feels');
  const humidityEl = document.getElementById('current-humidity');
  const windEl = document.getElementById('current-wind');
  const pressureEl = document.getElementById('current-pressure');
  const iconEl = document.getElementById('current-icon-emoji');
  const descriptionEl = document.getElementById('current-description');
  const aqiValueEl = document.getElementById('aqi-value');
  const aqiLabelEl = document.getElementById('aqi-label');
  const aqiPollutantEl = document.getElementById('aqi-main-pollutant');
  const uvValueEl = document.getElementById('uv-value');
  const uvLabelEl = document.getElementById('uv-label');
  const recommendEl = document.getElementById('recommend-text');
  const scroller = document.getElementById('forecast-scroller');

  if (cityEl) {
    cityEl.textContent = `${city}, ${country}`;
  }

  const now = new Date();
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (tempEl) {
    tempEl.textContent = `${Math.round(current.temperature_2m)}°`;
  }
  if (feelsEl) {
    feelsEl.textContent = `Feels like ${Math.round(current.apparent_temperature)}°`;
  }
  if (humidityEl) {
    humidityEl.textContent = `${current.relative_humidity_2m}%`;
  }
  if (windEl) {
    windEl.textContent = `${current.wind_speed_10m} km/h`;
  }
  if (pressureEl) {
    pressureEl.textContent = `${Math.round(current.surface_pressure)} hPa`;
  }

  const weatherInfo = getWeatherInterpretation(current.weather_code, current.is_day);
  if (iconEl) {
    iconEl.textContent = weatherInfo.emoji;
  }
  if (descriptionEl) {
    descriptionEl.textContent = weatherInfo.text;
  }

  if (aqiValueEl) {
    aqiValueEl.textContent = aqi.current.european_aqi;
  }
  if (aqiLabelEl) {
    aqiLabelEl.textContent = aqi.current.european_aqi < 50 ? 'Good' : 'Moderate';
  }
  if (aqiPollutantEl) {
    aqiPollutantEl.textContent = `PM10: ${aqi.current.pm10} μg/m³`;
  }

  const uvMax = weather.daily.uv_index_max[0];
  if (uvValueEl) {
    uvValueEl.textContent = uvMax;
  }
  if (uvLabelEl) {
    uvLabelEl.textContent = uvMax > 5 ? 'High' : 'Low';
  }

  if (recommendEl) {
    recommendEl.textContent = generateRecommendation(current.temperature_2m, weatherInfo.text);
  }

  if (!scroller) {
    return;
  }

  scroller.innerHTML = '';

  const currentHour = now.getHours();
  for (let i = 0; i < 12; i++) {
    const timeIdx = currentHour + i;

    if (
      !weather.hourly.time[timeIdx] ||
      weather.hourly.temperature_2m[timeIdx] === undefined ||
      weather.hourly.weather_code[timeIdx] === undefined
    ) {
      break;
    }

    const temp = Math.round(weather.hourly.temperature_2m[timeIdx]);
    const code = weather.hourly.weather_code[timeIdx];
    const info = getWeatherInterpretation(code, 1);
    const hourLabel = new Date(weather.hourly.time[timeIdx]).getHours();

    const div = document.createElement('div');
    div.className = 'forecast-item';
    div.innerHTML = `
      <span>${hourLabel}:00</span>
      <span style="font-size: 1.5rem">${info.emoji}</span>
      <strong>${temp}°</strong>
    `;
    scroller.appendChild(div);
  }
}

function getWeatherInterpretation(code, isDay) {
  if (code === 0) return { emoji: isDay ? '☀️' : '🌙', text: 'Clear sky' };
  if (code === 1 || code === 2 || code === 3) return { emoji: isDay ? '⛅' : '☁️', text: 'Partly cloudy' };
  if (code >= 45 && code <= 48) return { emoji: '🌫️', text: 'Fog' };
  if (code >= 51 && code <= 67) return { emoji: '🌧️', text: 'Rain' };
  if (code >= 71 && code <= 77) return { emoji: '❄️', text: 'Snow' };
  if (code >= 95) return { emoji: '⛈️', text: 'Thunderstorm' };
  return { emoji: '🌤️', text: 'Unknown' };
}

function generateRecommendation(temp, weatherDesc) {
  let tip = 'Enjoy your day! ';
  if (temp < 10) tip += "It's quite cold out there, wear a warm jacket. ";
  if (temp > 25) tip += "It's hot, stay hydrated! ";
  if (weatherDesc.includes('Rain')) tip += "Don't forget an umbrella! ☔";
  if (weatherDesc.includes('Clear')) tip += 'Great weather for a walk.';
  return tip;
}