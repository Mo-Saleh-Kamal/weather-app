

document.addEventListener("DOMContentLoaded", () => {
  // ===== الوحدات =====
  let units = { temp: "celsius", wind: "kmh", precip: "mm" };

  function toTemp(c) {
    return units.temp === "fahrenheit"
      ? Math.round((c * 9) / 5 + 32)
      : Math.round(c);
  }
  function toWind(kmh) {
    return units.wind === "mph" ? Math.round(kmh * 0.621371) : Math.round(kmh);
  }
  function toPrecip(mm) {
    const v = units.precip === "inch" ? mm * 0.0393701 : mm;
    return v < 1 ? v.toFixed(2) : v.toFixed(1);
  }
  function tempUnit() {
    return units.temp === "fahrenheit" ? "°F" : "°";
  }
  function windUnit() {
    return units.wind === "mph" ? " mph" : " km/h";
  }
  function precipUnit() {
    return units.precip === "inch" ? " in" : " mm";
  }

  // ===== بيانات =====
  let weatherData = null;
  let selectedDayIndex = 0;
  let currentLocationName = "Beni Suef, Tala";

  function mockData() {
    return {
      current: {
        temperature_2m: 32,
        apparent_temperature: 34,
        relative_humidity_2m: 46,
        wind_speed_10m: 14,
        precipitation: 0,
      },
      hourly: {
        time: Array.from({ length: 168 }, (_, i) =>
          new Date(Date.now() + i * 3600000).toISOString(),
        ),
        temperature_2m: Array(168)
          .fill(0)
          .map((_, i) => 28 + Math.sin(i / 3) * 4),
      },
      daily: {
        time: Array.from({ length: 7 }, (_, i) =>
          new Date(Date.now() + i * 86400000).toISOString().slice(0, 10),
        ),
        temperature_2m_max: [32, 31, 33, 34, 32, 30, 31],
        temperature_2m_min: [22, 21, 22, 23, 22, 20, 21],
      },
    };
  }

  async function fetchWeather(
    lat = 29.066,
    lon = 31.099,
    name = currentLocationName,
  ) {
    currentLocationName = name;
    try {
      const url = ` https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
      const res = await fetch(url);
      weatherData = await res.json();
    } catch (e) {
      console.warn("API failed, using mock", e);
      weatherData = mockData();
    }
    selectedDayIndex = 0;
    renderAll();
  }

  // ===== العرض =====
  function renderAll() {
    if (!weatherData) return;
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };

    set("temp", toTemp(weatherData.current.temperature_2m) + tempUnit());
    set("condition", currentLocationName);

    const dateEl = document.getElementById("currentDate");
    if (dateEl)
      dateEl.textContent = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    set(
      "feelsLikeValue",
      toTemp(weatherData.current.apparent_temperature) + tempUnit(),
    );
    set("humidityValue", weatherData.current.relative_humidity_2m + "%");
    set("windValue", toWind(weatherData.current.wind_speed_10m) + windUnit());
    set(
      "precipValue",
      toPrecip(weatherData.current.precipitation) + precipUnit(),
    );

    const dailyEl = document.getElementById("dailyList");
    if (dailyEl) {
      dailyEl.innerHTML = "";
      weatherData.daily.time.forEach((date, i) => {
        const day = new Date(date).toLocaleDateString("en-US", {
          weekday: "short",
        });
        const max = toTemp(weatherData.daily.temperature_2m_max[i]);
        const min = toTemp(weatherData.daily.temperature_2m_min[i]);
        dailyEl.innerHTML += ` <div class="daily reveal"><p>${day}</p><img src="./assets/images/icon-sunny.webp" alt=""><div class="daily_span"><span>${max}${tempUnit()}</span><span>${min}${tempUnit()}</span></div></div>`;
      });
      dailyEl.classList.toggle("fahrenheit", units.temp === "fahrenheit");
    }

    renderHourly();
    updateUnitChecks();
    updateDayActive();
  }

  function renderHourly() {
    const hourlyEl = document.getElementById("hourlyList");
    if (!hourlyEl || !weatherData) return;
    hourlyEl.innerHTML = "";
    const start = selectedDayIndex * 24;
    for (
      let i = start;
      i < start + 8 && i < weatherData.hourly.temperature_2m.length;
      i++
    ) {
      const timeStr = weatherData.hourly.time[i];
      const hourLabel = new Date(timeStr).toLocaleTimeString("en-US", {
        hour: "numeric",
      });
      const temp = toTemp(weatherData.hourly.temperature_2m[i]);
      hourlyEl.innerHTML += `<div class="hourly-item reveal"><span>${hourLabel}</span><img src="./assets/images/icon-overcast.webp" alt=""><span>${temp}${tempUnit()}</span></div>`;
    }
  }

  function updateUnitChecks() {
    document.querySelectorAll(".unit-option").forEach((opt) => {
      const unit = (opt.dataset.unit || "").toLowerCase();
      const value = (opt.dataset.value || "").toLowerCase().trim();
      const check = opt.querySelector(".check");
      if (!check) return;

      let active = false;
      if (unit === "temp") {
        active =
          (value.startsWith("f") && units.temp === "fahrenheit") ||
          (value.startsWith("c") && units.temp === "celsius");
      } else if (unit === "speed") {
        active =
          (value.includes("mph") && units.wind === "mph") ||
          (!value.includes("mph") && units.wind === "kmh");
      } else if (unit === "percip" || unit === "precip") {
        active =
          (value.includes("in") && units.precip === "inch") ||
          (!value.includes("in") && units.precip === "mm");
      }
      check.style.opacity = active ? "1" : "0";
      opt.classList.toggle("active", active);
    });
  }

  // ===== الوحدات كليك =====
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".unit-option");
    if (!btn) return;
    const unit = (btn.dataset.unit || "").toLowerCase();
    const value = (btn.dataset.value || "").trim().toLowerCase();
    if (unit === "temp")
      units.temp = value.startsWith("f") ? "fahrenheit" : "celsius";
    else if (unit === "speed")
      units.wind = value.includes("mph") ? "mph" : "kmh";
    else if (unit === "percip")
      units.precip = value.includes("inch") ? "inch" : "mm";
    renderAll();
  });

  // ===== الأيام =====
  function updateDayActive() {
    document.querySelectorAll("#dayMenu .day-option").forEach((li, idx) => {
      const isActive = idx === selectedDayIndex;
      li.classList.toggle("active", isActive);
      const check = li.querySelector(".check");
      if (check) check.style.opacity = isActive ? "1" : "0";
    });
  }

  // حقن علامة الصح في عناصر الأيام لو مش موجودة
  document.querySelectorAll("#dayMenu .day-option").forEach((li) => {
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    if (!li.querySelector(".check")) {
      const img = document.createElement("img");
      img.src = "./assets/images/icon-checkmark.svg";
      img.className = "check";
      img.alt = "";
      img.style.width = "16px";
      img.style.opacity = "0";
      li.appendChild(img);
    }
  });

  // كليك يوم واحد بس، راديو
  document.querySelectorAll("#dayMenu .day-option").forEach((li, idx) => {
    li.style.cursor = "pointer";
    li.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedDayIndex = idx;
      const dayLabel = document.getElementById("dayLabel");
      if (dayLabel) dayLabel.textContent = li.childNodes[0].textContent.trim();
      renderHourly();
      updateDayActive();
      document.getElementById("dayMenu")?.classList.remove("show", "open");
    });
  });

  document.querySelectorAll("#dayMenu .day-option").forEach((li, idx) => {
    li.style.cursor = "pointer";
    li.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedDayIndex = idx;
      const dayLabel = document.getElementById("dayLabel");
      if (dayLabel) dayLabel.textContent = li.textContent.trim();
      renderHourly();
      updateDayActive();
      document.getElementById("dayMenu")?.classList.remove("show", "open");
    });
  });

  // ===== فتح/قفل القوائم =====
  document.getElementById("unitsBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("unitsMenu")?.classList.toggle("show");
  });
  document.getElementById("dayBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("dayMenu")?.classList.toggle("show");
  });

  // ===== البحث =====
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const suggestBox = document.getElementById("searchSuggestions");

  let suggestTimer = null;
  let suggestIndex = -1;

  async function doSearch() {
    const city = searchInput?.value.trim();
    if (!city) return;
    suggestBox?.classList.remove("show");
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`,
      );
      const geo = await res.json();
      if (geo.results?.[0]) {
        const loc = geo.results[0];
        fetchWeather(
          loc.latitude,
          loc.longitude,
          `${loc.name}, ${loc.country}`,
        );
        searchInput.value = "";
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function getSuggestions(q) {
    if (!suggestBox) return;
    if (q.length < 2) {
      suggestBox.classList.remove("show");
      suggestBox.innerHTML = "";
      return;
    }
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en`,
      );
      const data = await res.json();
      const results = data.results || [];
      if (!results.length) {
        suggestBox.classList.remove("show");
        return;
      }
      suggestBox.innerHTML = results
        .map(
          (r) =>
            `<li data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${r.name}, ${r.country}">${r.name} <small>${r.admin1 || ""} ${r.country}</small></li>`,
        )
        .join("");
      suggestBox.classList.add("show");
      suggestIndex = -1;
    } catch (e) {
      console.error(e);
    }
  }

  function updateActive(items) {
    items.forEach((li, i) => li.classList.toggle("active", i === suggestIndex));
  }

  searchBtn?.addEventListener("click", doSearch);

  searchInput?.addEventListener("input", () => {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(
      () => getSuggestions(searchInput.value.trim()),
      250,
    );
  });

  searchInput?.addEventListener("keydown", (e) => {
    const items = suggestBox ? suggestBox.querySelectorAll("li") : [];
    if (items.length && suggestBox.classList.contains("show")) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        suggestIndex = (suggestIndex + 1) % items.length;
        updateActive(items);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        suggestIndex = (suggestIndex - 1 + items.length) % items.length;
        updateActive(items);
        return;
      }
      if (e.key === "Enter" && suggestIndex >= 0) {
        e.preventDefault();
        items[suggestIndex].click();
        return;
      }
      if (e.key === "Escape") {
        suggestBox.classList.remove("show");
        return;
      }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  });

  suggestBox?.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    const lat = parseFloat(li.dataset.lat);
    const lon = parseFloat(li.dataset.lon);
    const name = li.dataset.name;
    searchInput.value = "";
    suggestBox.classList.remove("show");
    suggestBox.innerHTML = "";
    fetchWeather(lat, lon, name);
  });

  // قفل القوائم لما تدوس بره
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search_box")) suggestBox?.classList.remove("show");
    if (!e.target.closest("#unitsBtn") && !e.target.closest("#unitsMenu"))
      document.getElementById("unitsMenu")?.classList.remove("show", "open");
    if (!e.target.closest("#dayBtn") && !e.target.closest("#dayMenu"))
      document.getElementById("dayMenu")?.classList.remove("show", "open");
  });

  // ابدأ

  // ===== reveal on scroll =====
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );

  function observeReveals() {
    document
      .querySelectorAll(".reveal:not(.visible)")
      .forEach((el) => revealObserver.observe(el));
  }

  // ناديها بعد كل render
  const _oldRenderAll = renderAll;
  renderAll = function () {
    _oldRenderAll();
    setTimeout(observeReveals, 50);
  };
  observeReveals();
  fetchWeather();
});
