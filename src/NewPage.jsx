import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapContainer, TileLayer, useMapEvents, Polygon } from "react-leaflet";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import "leaflet/dist/leaflet.css";
import "./css/sim.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Configuración de límites
const MAX_ACTIVE_FIRES = 50;
const MERGE_DISTANCE = 0.02; // Grados (~2km)
const INACTIVITY_LIMIT = 5; // Ticks
const MAX_HISTORY_POINTS = 10;

// Constantes para cálculo de voluntarios
const VOLUNTEERS_PER_FIRE = 5; // Base
const VOLUNTEERS_PER_INTENSITY = 2; // Por cada punto de intensidad
const VOLUNTEERS_PER_AREA = 0.1; // Por km² (aproximado)

const MapEvents = ({ addFire }) => {
    const map = useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            addFire(lat, lng);
        }
    });
    return null;
};

const getFireColor = (intensity) => {
    const heat = Math.min(255, Math.floor(intensity * 51));
    return `rgb(255, ${255 - heat}, 0)`;
};

const MapPage = ({ onLogout, currentUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const mapRef = useRef();

    // Estados de simulación
    const [windDirection, setWindDirection] = useState(0);
    const [temperature, setTemperature] = useState(25);
    const [humidity, setHumidity] = useState(50);
    const [windSpeed, setWindSpeed] = useState(10);
    const [fireRisk, setFireRisk] = useState(0);
    const [fires, setFires] = useState([]);
    const [simulationActive, setSimulationActive] = useState(false);
    const [simulationSpeed, setSimulationSpeed] = useState(1);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [requiredVolunteers, setRequiredVolunteers] = useState(0);
    const [mitigationStrategies, setMitigationStrategies] = useState([]);

    // Calcular riesgo de incendio
    useEffect(() => {
        const newRisk = calculateFireRisk(temperature, humidity, windSpeed);
        setFireRisk(newRisk);
    }, [temperature, humidity, windSpeed]);

    const calculateFireRisk = (temp, hum, wind) => {
        const tempFactor = Math.min(temp / 40, 1);
        const humFactor = 1 - (hum / 100);
        const windFactor = Math.min(wind / 30, 1);
        return Math.min(Math.round((tempFactor * 0.4 + humFactor * 0.3 + windFactor * 0.3) * 100), 100);
    };

    // Calcular distancia entre dos puntos
    const getDistance = (lat1, lng1, lat2, lng2) => {
        return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
    };

    // Función para fusionar focos cercanos
    const mergeCloseFires = (fireList) => {
        if (fireList.length <= 1) return fireList;

        const merged = [];
        const toMerge = [...fireList];

        while (toMerge.length > 0) {
            let current = toMerge.shift();
            let mergeCount = 1;

            for (let i = 0; i < toMerge.length; i++) {
                const distance = getDistance(
                    current.position[0], current.position[1],
                    toMerge[i].position[0], toMerge[i].position[1]
                );

                if (distance < MERGE_DISTANCE) {
                    current = {
                        ...current,
                        position: [
                            (current.position[0] * mergeCount + toMerge[i].position[0]) / (mergeCount + 1),
                            (current.position[1] * mergeCount + toMerge[i].position[1]) / (mergeCount + 1)
                        ],
                        intensity: Math.max(current.intensity, toMerge[i].intensity), // Mantener la mayor intensidad
                        spread: Math.max(current.spread, toMerge[i].spread),
                        history: [...current.history, ...toMerge[i].history]
                            .filter((v, i, a) => a.findIndex(t =>
                                t[0] === v[0] && t[1] === v[1]) === i)
                            .slice(-MAX_HISTORY_POINTS)
                    };
                    mergeCount++;
                    toMerge.splice(i, 1);
                    i--;
                }
            }
            merged.push(current);
        }
        return merged;
    };

    // Añadir un nuevo foco con verificación de límite
    const addFire = (lat, lng) => {
        if (!simulationActive && fires.length < MAX_ACTIVE_FIRES * 2) {
            setFires(prev => {
                const newFires = [...prev, {
                    id: Date.now(),
                    position: [lat, lng],
                    intensity: 1,
                    spread: 0,
                    direction: windDirection,
                    lastMovement: 0,
                    active: true,
                    history: [[lat, lng]]
                }];
                return mergeCloseFires(newFires);
            });
        }
    };

    const handleNavigate = (path) => {
        navigate(path);
    };

    const toggleSimulation = () => {
        if (fires.length === 0 && !simulationActive) {
            alert("Primero añade focos de incendio haciendo clic en el mapa");
            return;
        }
        setSimulationActive(!simulationActive);
    };

    const clearFires = () => {
        setFires([]);
        setSimulationActive(false);
        setTimeElapsed(0);
    };

    // Simulación optimizada con límite de focos
    useEffect(() => {
        if (!simulationActive) return;

        const interval = setInterval(() => {
            setTimeElapsed(prev => prev + 1);

            setFires(prevFires => {
                // 1. Filtrar focos inactivos o de baja intensidad
                let updatedFires = prevFires.filter(fire =>
                    (fire.lastMovement < INACTIVITY_LIMIT && fire.active) ||
                    fire.intensity > 0.5
                );

                // 2. Ordenar por intensidad (los más intensos primero)
                updatedFires.sort((a, b) => b.intensity - a.intensity);

                // 3. Limitar cantidad máxima de focos
                if (updatedFires.length > MAX_ACTIVE_FIRES) {
                    updatedFires = updatedFires.slice(0, MAX_ACTIVE_FIRES);
                }

                // 4. Procesar propagación
                const newFires = updatedFires.flatMap(fire => {
                    if (fire.lastMovement >= INACTIVITY_LIMIT) {
                        return [{ ...fire, active: false }];
                    }

                    const spreadRate = (fireRisk / 100) *
                        (windSpeed / 20) *
                        (temperature / 30) *
                        (1 - (humidity / 150));
                    const spreadDistance = 0.01 * spreadRate * simulationSpeed;

                    if (spreadDistance < 0.001) {
                        return [{ ...fire, lastMovement: fire.lastMovement + 1 }];
                    }

                    // Propagación en cono (3 direcciones)
                    const angleRad = (fire.direction * Math.PI) / 180;
                    const coneAngle = Math.PI / 4;

                    const newPoints = [
                        { angle: angleRad, distance: spreadDistance * (0.5 + Math.random() * 0.5) }, // Centro
                        { angle: angleRad - coneAngle/2, distance: spreadDistance * (0.3 + Math.random() * 0.7) }, // Izquierda
                        { angle: angleRad + coneAngle/2, distance: spreadDistance * (0.3 + Math.random() * 0.7) }  // Derecha
                    ].map(({angle, distance}) => ({
                        lat: fire.position[0] + Math.cos(angle) * distance,  // Cambiado a cos para latitud
                        lng: fire.position[1] + Math.sin(angle) * distance,  // Cambiado a sin para longitud
                        angleOffset: angle - angleRad
                    })).filter(({lat, lng}) => (
                        Math.abs(lat - fire.position[0]) > 0.0001 ||
                        Math.abs(lng - fire.position[1]) > 0.0001
                    ));

                    if (newPoints.length === 0) {
                        return [{ ...fire, lastMovement: fire.lastMovement + 1 }];
                    }

                    // Limitar nuevos focos según disponibilidad
                    const availableSlots = Math.max(0, MAX_ACTIVE_FIRES - updatedFires.length);
                    const firesToCreate = Math.min(newPoints.length, availableSlots);

                    return [
                        ...newPoints.slice(0, firesToCreate).map(({lat, lng, angleOffset}, i) => ({
                            id: `${fire.id}-${timeElapsed}-${i}`,
                            position: [lat, lng],
                            intensity: fire.intensity * (0.7 + Math.random() * 0.3),
                            spread: fire.spread + spreadDistance,
                            direction: fire.direction + (angleOffset * (180/Math.PI)) * 0.5,
                            lastMovement: 0,
                            active: true,
                            history: [...fire.history, [lat, lng]].slice(-MAX_HISTORY_POINTS)
                        })),
                        { ...fire, active: false }
                    ];
                });

                // 5. Fusionar focos cercanos antes de retornar
                return mergeCloseFires(newFires);
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [simulationActive, windDirection, windSpeed, temperature, humidity, simulationSpeed, fireRisk]);

    // Función para manejar cambios en los controles
    const handleManualChange = (e, type) => {
        const value = parseFloat(e.target.value);
        if (isNaN(value)) return;

        switch(type) {
            case 'windDirection':
                if (value >= 0 && value <= 360) setWindDirection(value);
                break;
            case 'temperature':
                if (value >= 0 && value <= 50) setTemperature(value);
                break;
            case 'humidity':
                if (value >= 0 && value <= 100) setHumidity(value);
                break;
            case 'windSpeed':
                if (value >= 0 && value <= 100) setWindSpeed(value);
                break;
            case 'simulationSpeed':
                if (value >= 0.1 && value <= 5) setSimulationSpeed(value);
                break;
        }
    };

    // Datos para el gráfico
    const data = {
        labels: ['Temperatura', 'Humedad', 'Viento'],
        datasets: [
            {
                label: 'Condiciones Actuales',
                data: [temperature, humidity, windSpeed],
                backgroundColor: ['red', 'blue', 'green'],
                borderColor: 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1,
            },
        ],
    };

    // Calcular voluntarios necesarios y estrategias de mitigación
    useEffect(() => {
        const activeFires = fires.filter(f => f.active);

        // Calcular voluntarios necesarios
        let volunteers = 0;
        let totalIntensity = 0;
        let totalArea = 0;

        activeFires.forEach(fire => {
            // Estimación de área basada en spread (simplificado)
            const area = Math.PI * Math.pow(fire.spread * 100, 2) / 100; // km² aproximado
            volunteers += VOLUNTEERS_PER_FIRE +
                (fire.intensity * VOLUNTEERS_PER_INTENSITY) +
                (area * VOLUNTEERS_PER_AREA);
            totalIntensity += fire.intensity;
            totalArea += area;
        });

        setRequiredVolunteers(Math.round(volunteers));

        // Determinar estrategias de mitigación basadas en la situación
        const strategies = [];

        if (activeFires.length === 0) {
            strategies.push("No hay incendios activos. Estado de vigilancia normal.");
        } else {
            if (activeFires.length > 5) {
                strategies.push("🔴 Activación de protocolo de emergencia mayor");
                strategies.push("🚒 Despliegue de bomberos profesionales");
            } else {
                strategies.push("🟡 Activación de protocolo de emergencia básico");
            }

            if (totalIntensity > 10) {
                strategies.push("🚁 Uso de helicópteros para incendios de alta intensidad");
            }

            if (totalArea > 50) {
                strategies.push("🌊 Uso de camiones cisterna y cortafuegos");
            }

            if (windSpeed > 30) {
                strategies.push("⚠️ Precaución: Vientos fuertes pueden propagar incendios rápidamente");
            }

            if (humidity < 30) {
                strategies.push("💧 Considerar humectación de áreas circundantes");
            }

            strategies.push(`👥 Se requieren aproximadamente ${Math.round(volunteers)} voluntarios`);
            strategies.push("📞 Contactar a defensa civil y autoridades locales");
        }

        setMitigationStrategies(strategies);

    }, [fires, fireRisk]);


    const position = [-17.8, -61.5]; // Ubicación de San José de Chiquitos

    return (
        <div className="dashboard-container" style={{ backgroundColor: '#9C9898', minHeight: '100vh', margin: 0 }}>
            <div className="top-bar">
                <button
                    className={`button ${location.pathname === "/dashboard" ? "active" : ""}`}
                    onClick={() => handleNavigate("/dashboard")}
                    disabled={location.pathname === "/dashboard"}
                >
                    Inicio
                </button>
                <button
                    className={`button ${location.pathname === "/secondPage" ? "active" : ""}`}
                    onClick={() => handleNavigate("/secondPage")}
                >
                    Datos
                </button>
                <button
                    className={`button ${location.pathname === "/newPage" ? "active" : ""}`}
                    onClick={() => handleNavigate("/newPage")}
                >
                    Simulación
                </button>
                <button
                    className={`button ${location.pathname === "/reporte" ? "active" : ""}`}
                    onClick={() => handleNavigate("/reporte")}
                >
                    Reporte
                </button>
                {currentUser && currentUser.nombre === "ADMIN" && (
                    <button
                        className={`button ${location.pathname === "/users" ? "active" : ""}`}
                        onClick={() => handleNavigate("/users")}
                    >
                        Usuarios
                    </button>
                )}
                <button className="logout-button" onClick={onLogout}>Cerrar sesión</button>
            </div>

            <div className="main-content" style={{paddingTop: '100px'}}>
                <h1>Simulador Avanzado de Incendios</h1>

                {/* Controles de simulación */}
                <div className="simulation-controls">
                    <button
                        className={`button ${simulationActive ? 'active' : ''}`}
                        onClick={toggleSimulation}
                    >
                        {simulationActive ? 'Detener Simulación' : 'Iniciar Simulación'}
                    </button>
                    <button
                        className="button"
                        onClick={clearFires}
                    >
                        Limpiar Todo
                    </button>
                    <div className="simulation-info">
                        <span>Tiempo: {timeElapsed}s</span>
                        <span>Fuegos activos: {fires.filter(f => f.active).length}/{MAX_ACTIVE_FIRES}</span>
                        <span>Voluntarios necesarios: {requiredVolunteers}</span>
                    </div>
                </div>

                {/* Sección de estrategias de mitigación */}
                <div className="mitigation-strategies">
                    <h3>Estrategias de Mitigación Recomendadas:</h3>
                    <ul>
                        {mitigationStrategies.map((strategy, index) => (
                            <li key={index}>{strategy}</li>
                        ))}
                    </ul>
                </div>

                {/* Mapa de OpenStreetMap */}
                <div className="map-container" style={{height: '500px', marginBottom: '20px'}}>
                    <MapContainer
                        center={position}
                        zoom={9}
                        scrollWheelZoom={true}
                        style={{width: '100%', height: '100%'}}
                        ref={mapRef}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap contributors'
                        />
                        <MapEvents addFire={addFire} />

                        {/* Mostrar áreas de incendio como polígonos */}
                        {fires.filter(f => f.active).map(fire => (
                            <React.Fragment key={`fire-${fire.id}`}>
                                <Polygon
                                    positions={fire.history}
                                    color={getFireColor(fire.intensity)}
                                    fillColor={getFireColor(fire.intensity)}
                                    fillOpacity={0.4}
                                    className="fire-area"
                                />
                                {fire.history.map((pos, i) => (
                                    <Polygon
                                        key={`fire-point-${fire.id}-${i}`}
                                        positions={[
                                            [pos[0] - 0.002, pos[1] - 0.002],
                                            [pos[0] + 0.002, pos[1] - 0.002],
                                            [pos[0] + 0.002, pos[1] + 0.002],
                                            [pos[0] - 0.002, pos[1] + 0.002]
                                        ]}
                                        color={getFireColor(fire.intensity)}
                                        fillColor={getFireColor(fire.intensity)}
                                        fillOpacity={0.7}
                                        className={`fire-intensity-${Math.min(5, Math.floor(fire.intensity))}`}
                                    />
                                ))}
                            </React.Fragment>
                        ))}
                    </MapContainer>
                </div>

                {/* Panel de control */}
                <div className="control-panel">
                    <div className="stats">
                        <div className="stat-box">
                            <p className="label">Dirección Viento (°)</p>
                            <input
                                type="number"
                                value={windDirection}
                                onChange={(e) => handleManualChange(e, 'windDirection')}
                                min="0"
                                max="360"
                                disabled={simulationActive}
                            />
                            <div className="wind-direction">
                                <div
                                    className="wind-arrow"
                                    style={{ transform: `rotate(${windDirection}deg)` }}
                                >↑</div>
                                <span>{getWindDirectionLabel(windDirection)}</span>
                            </div>
                        </div>

                        <div className="stat-box">
                            <p className="label">Velocidad Viento (km/h)</p>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={windSpeed}
                                onChange={(e) => handleManualChange(e, 'windSpeed')}
                                disabled={simulationActive}
                            />
                            <p className="value">{windSpeed} km/h</p>
                        </div>

                        <div className="stat-box">
                            <p className="label">Temperatura (°C)</p>
                            <input
                                type="range"
                                min="0"
                                max="50"
                                value={temperature}
                                onChange={(e) => handleManualChange(e, 'temperature')}
                                disabled={simulationActive}
                            />
                            <p className="value">{temperature} °C</p>
                        </div>

                        <div className="stat-box">
                            <p className="label">Humedad (%)</p>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={humidity}
                                onChange={(e) => handleManualChange(e, 'humidity')}
                                disabled={simulationActive}
                            />
                            <p className="value">{humidity} %</p>
                        </div>

                        <div className="stat-box">
                            <p className="label">Velocidad Simulación</p>
                            <input
                                type="range"
                                min="0.1"
                                max="5"
                                step="0.1"
                                value={simulationSpeed}
                                onChange={(e) => handleManualChange(e, 'simulationSpeed')}
                            />
                            <p className="value">{simulationSpeed}x</p>
                        </div>

                        <div className="stat-box danger">
                            <p className="label">Riesgo de Incendio</p>
                            <p className="value">{fireRisk}%</p>
                            <div
                                className="risk-bar"
                                style={{ width: `${fireRisk}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Gráfico de condiciones */}
                <div className="chart-container">
                    <Bar
                        data={data}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    labels: {
                                        color: '#333'
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        color: '#333'
                                    }
                                },
                                x: {
                                    ticks: {
                                        color: '#333'
                                    }
                                }
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

const getWindDirectionLabel = (direction) => {
    const directions = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste'];
    const index = Math.round((direction % 360) / 45) % 8;
    return directions[index];
};

export default MapPage;