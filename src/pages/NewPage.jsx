// src/pages/Simulacion.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapContainer, TileLayer, Polygon, useMapEvents } from "react-leaflet";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import NavBar from "../components/NavBar";
import Button from "../components/Button";
import Card from "../components/Card";
import StatBox from "../components/StatBox";
import RangeInput from "../components/RangeInput";
import { colors, sizes } from "../styles/theme";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Configuración de simulación
const SIMULATION_CONFIG = {
    MAX_ACTIVE_FIRES: 50,
    MERGE_DISTANCE: 0.02, // Grados (~2km)
    INACTIVITY_LIMIT: 5, // Ticks
    MAX_HISTORY_POINTS: 10,
    VOLUNTEERS_PER_FIRE: 5,
    VOLUNTEERS_PER_INTENSITY: 2,
    VOLUNTEERS_PER_AREA: 0.1
};

// Componente para manejar eventos del mapa
const MapEvents = ({ addFire, simulationActive }) => {
    useMapEvents({
        click(e) {
            if (!simulationActive) {
                const { lat, lng } = e.latlng;
                addFire(lat, lng);
            }
        }
    });
    return null;
};

const getFireColor = (intensity) => {
    const heat = Math.min(255, Math.floor(intensity * 51));
    return `rgb(255, ${255 - heat}, 0)`;
};

const getWindDirectionLabel = (direction) => {
    const directions = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste'];
    const index = Math.round((direction % 360) / 45) % 8;
    return directions[index];
};

const Simulacion = () => {
    const { user, logout } = useAuth();
    const { showNotification } = useNotification();
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
        const tempFactor = Math.min(temperature / 40, 1);
        const humFactor = 1 - (humidity / 100);
        const windFactor = Math.min(windSpeed / 30, 1);
        const risk = Math.min(Math.round((tempFactor * 0.4 + humFactor * 0.3 + windFactor * 0.3) * 100), 100);
        setFireRisk(risk);
    }, [temperature, humidity, windSpeed]);

    // Función para fusionar focos cercanos
    const mergeCloseFires = (fireList) => {
        if (fireList.length <= 1) return fireList;

        const merged = [];
        const toMerge = [...fireList];

        while (toMerge.length > 0) {
            let current = toMerge.shift();
            let mergeCount = 1;

            for (let i = 0; i < toMerge.length; i++) {
                const distance = Math.sqrt(
                    Math.pow(toMerge[i].position[0] - current.position[0], 2) +
                    Math.pow(toMerge[i].position[1] - current.position[1], 2)
                );

                if (distance < SIMULATION_CONFIG.MERGE_DISTANCE) {
                    current = {
                        ...current,
                        position: [
                            (current.position[0] * mergeCount + toMerge[i].position[0]) / (mergeCount + 1),
                            (current.position[1] * mergeCount + toMerge[i].position[1]) / (mergeCount + 1)
                        ],
                        intensity: Math.max(current.intensity, toMerge[i].intensity),
                        spread: Math.max(current.spread, toMerge[i].spread),
                        history: [...current.history, ...toMerge[i].history]
                            .filter((v, i, a) => a.findIndex(t => t[0] === v[0] && t[1] === v[1]) === i)
                            .slice(-SIMULATION_CONFIG.MAX_HISTORY_POINTS)
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

    // Añadir un nuevo foco
    const addFire = (lat, lng) => {
        if (fires.length < SIMULATION_CONFIG.MAX_ACTIVE_FIRES * 2) {
            setFires(prev => mergeCloseFires([...prev, {
                id: Date.now(),
                position: [lat, lng],
                intensity: 1,
                spread: 0,
                direction: windDirection,
                lastMovement: 0,
                active: true,
                history: [[lat, lng]]
            }]));
        } else {
            showNotification("Límite de focos alcanzado", "warning");
        }
    };

    const toggleSimulation = () => {
        if (fires.length === 0 && !simulationActive) {
            showNotification("Añade focos de incendio haciendo clic en el mapa", "warning");
            return;
        }
        setSimulationActive(!simulationActive);
    };

    const clearFires = () => {
        setFires([]);
        setSimulationActive(false);
        setTimeElapsed(0);
        showNotification("Simulación reiniciada", "info");
    };

    // Simulación principal
    useEffect(() => {
        if (!simulationActive) return;

        const interval = setInterval(() => {
            setTimeElapsed(prev => prev + 1);

            setFires(prevFires => {
                let updatedFires = prevFires.filter(fire =>
                    (fire.lastMovement < SIMULATION_CONFIG.INACTIVITY_LIMIT && fire.active) ||
                    fire.intensity > 0.5
                );

                updatedFires.sort((a, b) => b.intensity - a.intensity);

                if (updatedFires.length > SIMULATION_CONFIG.MAX_ACTIVE_FIRES) {
                    updatedFires = updatedFires.slice(0, SIMULATION_CONFIG.MAX_ACTIVE_FIRES);
                }

                const newFires = updatedFires.flatMap(fire => {
                    if (fire.lastMovement >= SIMULATION_CONFIG.INACTIVITY_LIMIT) {
                        return [{ ...fire, active: false }];
                    }

                    const spreadRate = (fireRisk / 100) * (windSpeed / 20) * (temperature / 30) * (1 - (humidity / 150));
                    const spreadDistance = 0.01 * spreadRate * simulationSpeed;

                    if (spreadDistance < 0.001) {
                        return [{ ...fire, lastMovement: fire.lastMovement + 1 }];
                    }

                    const angleRad = (fire.direction * Math.PI) / 180;
                    const coneAngle = Math.PI / 4;

                    const newPoints = [
                        { angle: angleRad, distance: spreadDistance * (0.5 + Math.random() * 0.5) },
                        { angle: angleRad - coneAngle/2, distance: spreadDistance * (0.3 + Math.random() * 0.7) },
                        { angle: angleRad + coneAngle/2, distance: spreadDistance * (0.3 + Math.random() * 0.7) }
                    ].map(({angle, distance}) => ({
                        lat: fire.position[0] + Math.cos(angle) * distance,
                        lng: fire.position[1] + Math.sin(angle) * distance,
                        angleOffset: angle - angleRad
                    })).filter(({lat, lng}) => (
                        Math.abs(lat - fire.position[0]) > 0.0001 ||
                        Math.abs(lng - fire.position[1]) > 0.0001
                    ));

                    if (newPoints.length === 0) {
                        return [{ ...fire, lastMovement: fire.lastMovement + 1 }];
                    }

                    const availableSlots = Math.max(0, SIMULATION_CONFIG.MAX_ACTIVE_FIRES - updatedFires.length);
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
                            history: [...fire.history, [lat, lng]].slice(-SIMULATION_CONFIG.MAX_HISTORY_POINTS)
                        })),
                        { ...fire, active: false }
                    ];
                });

                return mergeCloseFires(newFires);
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [simulationActive, windDirection, windSpeed, temperature, humidity, simulationSpeed, fireRisk, timeElapsed]);

    // Calcular voluntarios y estrategias
    useEffect(() => {
        const activeFires = fires.filter(f => f.active);
        let volunteers = 0;
        let totalIntensity = 0;
        let totalArea = 0;

        activeFires.forEach(fire => {
            const area = Math.PI * Math.pow(fire.spread * 100, 2) / 100;
            volunteers += SIMULATION_CONFIG.VOLUNTEERS_PER_FIRE +
                (fire.intensity * SIMULATION_CONFIG.VOLUNTEERS_PER_INTENSITY) +
                (area * SIMULATION_CONFIG.VOLUNTEERS_PER_AREA);
            totalIntensity += fire.intensity;
            totalArea += area;
        });

        setRequiredVolunteers(Math.round(volunteers));

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

            if (totalIntensity > 10) strategies.push("🚁 Uso de helicópteros para incendios de alta intensidad");
            if (totalArea > 50) strategies.push("🌊 Uso de camiones cisterna y cortafuegos");
            if (windSpeed > 30) strategies.push("⚠️ Precaución: Vientos fuertes pueden propagar incendios rápidamente");
            if (humidity < 30) strategies.push("💧 Considerar humectación de áreas circundantes");

            strategies.push(`👥 Se requieren aproximadamente ${Math.round(volunteers)} voluntarios`);
            strategies.push("📞 Contactar a defensa civil y autoridades locales");
        }

        setMitigationStrategies(strategies);
    }, [fires, fireRisk]);

    // Datos para el gráfico
    const chartData = {
        labels: ['Temperatura', 'Humedad', 'Viento'],
        datasets: [{
            label: 'Condiciones Actuales',
            data: [temperature, humidity, windSpeed],
            backgroundColor: [colors.danger, colors.info, colors.warning],
            borderColor: 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
        }],
    };

    const position = [-17.8, -61.5]; // Ubicación de San José de Chiquitos

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            backgroundColor: colors.background
        }}>
            <NavBar user={user} onLogout={logout} />

            <main style={{
                flex: 1,
                padding: '20px',
                maxWidth: sizes.maxWidth,
                width: '100%',
                margin: '0 auto'
            }}>
                <h1 style={{
                    color: colors.primary,
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    Simulador Avanzado de Incendios
                </h1>

                <Card>
                    {/* Controles de simulación */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        marginBottom: '20px',
                        justifyContent: 'center'
                    }}>
                        <Button
                            onClick={toggleSimulation}
                            variant={simulationActive ? 'danger' : 'success'}
                        >
                            {simulationActive ? 'Detener Simulación' : 'Iniciar Simulación'}
                        </Button>
                        <Button
                            onClick={clearFires}
                            variant="outline"
                        >
                            Limpiar Todo
                        </Button>
                    </div>

                    {/* Información de simulación */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '15px',
                        justifyContent: 'center',
                        marginBottom: '20px'
                    }}>
                        <StatBox
                            label="Tiempo"
                            value={`${timeElapsed}s`}
                            color={colors.info}
                        />
                        <StatBox
                            label="Fuegos activos"
                            value={`${fires.filter(f => f.active).length}/${SIMULATION_CONFIG.MAX_ACTIVE_FIRES}`}
                            color={colors.warning}
                        />
                        <StatBox
                            label="Voluntarios necesarios"
                            value={requiredVolunteers}
                            color={colors.danger}
                        />
                    </div>

                    {/* Estrategias de mitigación */}
                    {mitigationStrategies.length > 0 && (
                        <div style={{
                            backgroundColor: colors.light,
                            padding: '15px',
                            borderRadius: sizes.borderRadius,
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ marginTop: 0, color: colors.primary }}>Estrategias de Mitigación Recomendadas:</h3>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                {mitigationStrategies.map((strategy, index) => (
                                    <li key={index} style={{ marginBottom: '8px' }}>{strategy}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Mapa */}
                    <div style={{
                        height: '500px',
                        borderRadius: sizes.borderRadius,
                        overflow: 'hidden',
                        marginBottom: '20px',
                        boxShadow: sizes.boxShadow
                    }}>
                        <MapContainer
                            center={position}
                            zoom={9}
                            scrollWheelZoom={true}
                            style={{ height: '100%', width: '100%' }}
                            ref={mapRef}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />
                            <MapEvents addFire={addFire} simulationActive={simulationActive} />

                            {fires.filter(f => f.active).map(fire => (
                                <React.Fragment key={`fire-${fire.id}`}>
                                    <Polygon
                                        positions={fire.history}
                                        color={getFireColor(fire.intensity)}
                                        fillColor={getFireColor(fire.intensity)}
                                        fillOpacity={0.4}
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
                                        />
                                    ))}
                                </React.Fragment>
                            ))}
                        </MapContainer>
                    </div>

                    {/* Panel de control */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '20px',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '15px',
                            borderRadius: sizes.borderRadius,
                            boxShadow: sizes.boxShadow
                        }}>
                            <h4 style={{ marginTop: 0, color: colors.primary }}>Dirección Viento</h4>
                            <RangeInput
                                min={0}
                                max={360}
                                value={windDirection}
                                onChange={(e) => setWindDirection(parseFloat(e.target.value))}
                                disabled={simulationActive}
                            />
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: '10px'
                            }}>
                                <div style={{
                                    transform: `rotate(${windDirection}deg)`,
                                    fontSize: '1.5rem',
                                    marginRight: '10px'
                                }}>↑</div>
                                <span>{getWindDirectionLabel(windDirection)}</span>
                            </div>
                        </div>

                        <RangeControl
                            label="Velocidad Viento (km/h)"
                            min={0}
                            max={100}
                            value={windSpeed}
                            onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
                            disabled={simulationActive}
                        />

                        <RangeControl
                            label="Temperatura (°C)"
                            min={0}
                            max={50}
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            disabled={simulationActive}
                        />

                        <RangeControl
                            label="Humedad (%)"
                            min={0}
                            max={100}
                            value={humidity}
                            onChange={(e) => setHumidity(parseFloat(e.target.value))}
                            disabled={simulationActive}
                        />

                        <RangeControl
                            label="Velocidad Simulación"
                            min={0.1}
                            max={5}
                            step={0.1}
                            value={simulationSpeed}
                            onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
                        />

                        <div style={{
                            backgroundColor: 'white',
                            padding: '15px',
                            borderRadius: sizes.borderRadius,
                            boxShadow: sizes.boxShadow
                        }}>
                            <h4 style={{ marginTop: 0, color: colors.primary }}>Riesgo de Incendio</h4>
                            <p style={{
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                color: fireRisk > 70 ? colors.danger : fireRisk > 40 ? colors.warning : colors.success,
                                textAlign: 'center',
                                margin: '10px 0'
                            }}>
                                {fireRisk}%
                            </p>
                            <div style={{
                                height: '10px',
                                backgroundColor: colors.light,
                                borderRadius: '5px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${fireRisk}%`,
                                    height: '100%',
                                    backgroundColor: fireRisk > 70 ? colors.danger : fireRisk > 40 ? colors.warning : colors.success
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* Gráfico */}
                    <div style={{
                        height: '300px',
                        backgroundColor: 'white',
                        padding: '15px',
                        borderRadius: sizes.borderRadius,
                        boxShadow: sizes.boxShadow
                    }}>
                        <Bar
                            data={chartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        labels: {
                                            color: colors.text
                                        }
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: { color: colors.text },
                                        grid: { color: `${colors.text}20` }
                                    },
                                    x: {
                                        ticks: { color: colors.text }
                                    }
                                }
                            }}
                        />
                    </div>
                </Card>
            </main>
        </div>
    );
};

// Componente auxiliar para controles de rango
const RangeControl = ({ label, value, onChange, min, max, step = 1, disabled = false }) => (
    <div style={{
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: sizes.borderRadius,
        boxShadow: sizes.boxShadow
    }}>
        <h4 style={{ marginTop: 0, color: colors.primary }}>{label}</h4>
        <RangeInput
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            disabled={disabled}
        />
        <p style={{
            textAlign: 'center',
            fontSize: '1.2rem',
            margin: '10px 0 0',
            fontWeight: 'bold',
            color: colors.text
        }}>
            {value}
        </p>
    </div>
);

export default Simulacion;