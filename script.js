const cityInput = document.querySelector(".city-input")
const searchButton = document.querySelector(".search-btn")
const locationButton = document.querySelector(".location-btn")
const currentWeatherDiv = document.querySelector(".current-weather");
const weatherCardsDiv = document.querySelector(".weather-cards");


const API_KEY = '38ec75ee347b25173236489acebadaf1';



const createWeatherCard = (cityName, weatherItem, index, aqi) => {
    const aqiDisplay = aqi !== undefined ? `${aqi}` : "AQI Not Available";

    if (index === 0) { // Main weather card
        return `<div class="details">
            <h2>${cityName} (${weatherItem.dt_txt.split(" ")[0]})</h2>
            <h4>Temperature: ${(weatherItem.main.temp - 273.15).toFixed(2)}°C</h4>
            <h4>Wind: ${weatherItem.wind.speed} M/S</h4>
            <h4>Humidity: ${weatherItem.main.humidity}%</h4>
            <h4>Air Quality Index(Less is Better): ${aqiDisplay}</h4>
        </div>
        <div class="icon">
            <img
                src="https://openweathermap.org/img/wn/${weatherItem.weather[0].icon}@4x.png"
                alt="weather-icon"
            />
            <h4>${weatherItem.weather[0].description}</h4>
        </div>`;
    } else { // Forecast card
        return `<li class="card">
            <h3>(${weatherItem.dt_txt.split(" ")[0]})</h3>
            <img
                src="https://openweathermap.org/img/wn/${weatherItem.weather[0].icon}@2x.png"
                alt="weather-icon"
            />
            <h4>Description: ${weatherItem.weather[0].description}</h4>
            <h4>Temperature: ${(weatherItem.main.temp - 273.15).toFixed(2)}°C</h4>
            <h4>Wind: ${weatherItem.wind.speed} M/S</h4>
            <h4>Humidity: ${weatherItem.main.humidity}%</h4>
            <h4>AQI: ${aqiDisplay}</h4>
        </li>`;
    }
};


const getWeatherDetails = async (cityName, lat, lon, aqi) => {
    const WEATHER_API_URL = `http://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

    try {
        const response = await fetch(WEATHER_API_URL);
        if (!response.ok) throw new Error("Failed to fetch weather data!");
        const data = await response.json();

        const uniqueForecastDays = [];
        const fiveDaysForecast = data.list.filter(forecast => {
            const forecastDate = new Date(forecast.dt_txt).getDate();
            if (!uniqueForecastDays.includes(forecastDate)) {
                return uniqueForecastDays.push(forecastDate);
            }
        });

        const temperatures = fiveDaysForecast.map(item => (item.main.temp - 273.15).toFixed(2));
        const labels = fiveDaysForecast.map(item => item.dt_txt.split(" ")[0]);

        // Clear previous weather data
        cityInput.value = "";
        currentWeatherDiv.innerHTML = "";
        weatherCardsDiv.innerHTML = "";

        fiveDaysForecast.forEach((weatherItem, index) => {
            if (index === 0) {
                currentWeatherDiv.insertAdjacentHTML(
                    "beforeend",
                    createWeatherCard(cityName, weatherItem, index, aqi)
                );
            } else {
                weatherCardsDiv.insertAdjacentHTML(
                    "beforeend",
                    createWeatherCard(cityName, weatherItem, index, aqi)
                );
            }
        });

        // Plot the temperatures on the line chart
        plotTemperatureChart(labels, temperatures);
    } catch (error) {
        console.error("Error:", error.message);
        alert("An error occurred while fetching the weather forecast!");
    }
};

const plotTemperatureChart = (labels, data) => {
    // Match container2 size to current-weather
    const currentWeather = document.querySelector(".current-weather");
    const container2 = document.querySelector(".container2");
    const canvas = document.getElementById("temperatureChart");

    if (currentWeather) {
        const { width, height } = currentWeather.getBoundingClientRect();
        container2.style.width = `${width}px`;
        container2.style.height = `${height}px`;
        canvas.style.height = `${height}px`; // Optional for canvas
    }

    const ctx = canvas.getContext("2d");

    // Destroy previous chart instance if exists
    if (window.temperatureChart instanceof Chart) {
        window.temperatureChart.destroy();
    }

    // Create a new chart
    window.temperatureChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Temperature (°C)",
                    data: data,
                    borderColor: "rgba(75, 192, 192, 1)",
                    backgroundColor: "rgba(75, 192, 192, 0.2)",
                    borderWidth: 2,
                    tension: 0.4,
                },
            ],
        },
        options: {
            responsive: true, // Ensure the chart remains responsive
            maintainAspectRatio: false, // Allow manual height adjustment
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Date",
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: "Temperature (°C)",
                    },
                },
            },
        },
    });
};


const getCityCoordinates = async () => {
    const cityName = cityInput.value.trim(); // Get user-entered city name and remove extra spaces
    if (!cityName) return; // Return if cityName is empty

    const GEOCODING_API_URL = `http://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${API_KEY}`;

    try {
        const response = await fetch(GEOCODING_API_URL);
        if (!response.ok) throw new Error("Failed to fetch city coordinates!");
        const data = await response.json();

        if (!data.length) return alert(`No coordinates found for ${cityName}!`);

        const { name, lat, lon } = data[0];

        // Fetch AQI data
        const AQI_URL = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
        const aqiResponse = await fetch(AQI_URL);
        if (!aqiResponse.ok) throw new Error("Failed to fetch AQI data!");
        const aqiData = await aqiResponse.json();

        // Extract AQI value
        const aqi = aqiData?.list[0]?.main?.aqi;

        // Pass AQI along with weather details
        await getWeatherDetails(name, lat, lon, aqi);
    } catch (error) {
        console.error("Error:", error.message);
        alert("An error occurred while fetching the coordinates!");
    }
};

const getUserCoordinates = () => {
    navigator.geolocation.getCurrentPosition(
        position => {
            // console.log(position);
            const { latitude, longitude } = position.coords;
            const REVERSE_GEOCODING_URL = `http://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`;
            fetch(REVERSE_GEOCODING_URL).then(res => res.json()).then(data => {
                console.log(data);
                const { name, lat, lon } = data[0];
                getWeatherDetails(name, lat, lon);
            }).catch(() => {
                alert("An error occured while fetching the city!");
            })
        },
        error => {
            // console.log(error);
            alert(error.message);
        }
    );
}

locationButton.addEventListener("click", getUserCoordinates);
searchButton.addEventListener("click", getCityCoordinates);
// cityInput.addEventListener("keyup", e => e.key === "Enter" && getCityCoordinates);


