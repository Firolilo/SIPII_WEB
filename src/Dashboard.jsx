import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_DATA } from './graphql/queries';
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from 'leaflet';
import "leaflet/dist/leaflet.css";
import "./css/Dashboard.css";

// Configuración de iconos
const fireIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41]
});

const defaultIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41]
});

const Dashboard = ({ onLogout, currentUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { loading, error, data } = useQuery(GET_DASHBOARD_DATA, {
        pollInterval: 30000,
    });

    const handleNavigate = (path) => {
        navigate(path);
    };

    // Posición central del mapa (usamos las coordenadas del incendio si existe)
    const fireData = data?.getChiquitosFireRiskData[0];
    const defaultPosition = [-17.8, -61.5];
    const firePosition = fireData?.coordinates ?
        [fireData.coordinates.lat, fireData.coordinates.lng] :
        defaultPosition;

    if (loading) return (
        <div className="dashboard-container">
            <div className="loading">Cargando datos...</div>
        </div>
    );

    if (error) return (
        <div className="dashboard-container">
            <div className="error">Error: {error.message}</div>
        </div>
    );


    return (
        <div className="dashboard-container">
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

            <div className="main-content">
                <h1>SIPII</h1>

                <div className="map-section">
                    <MapContainer
                        center={firePosition}
                        zoom={fireData?.fireDetected ? 10 : 7}
                        scrollWheelZoom={true}
                        className="map-container"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Marcador principal de la región */}
                        <Marker position={defaultPosition} icon={defaultIcon}>
                            <Popup>Región de Chiquitos</Popup>
                        </Marker>

                        {/* Marcador de incendio si existe */}
                        {fireData?.fireDetected && fireData?.coordinates && (
                            <Marker
                                position={[fireData.coordinates.lat, fireData.coordinates.lng]}
                                icon={fireIcon}
                            >
                                <Popup>
                                    <strong>Incendio detectado</strong><br />
                                    Ubicación: {fireData.location}<br />
                                    Fecha: {new Date(fireData.timestamp).toLocaleString()}<br />
                                    Riesgo: {fireData.fireRisk}%<br />
                                    Temperatura: {fireData.weather.temperature}°C<br />
                                    Humedad: {fireData.weather.humidity}%<br />
                                    Velocidad viento: {fireData.weather.windSpeed} m/s
                                </Popup>
                            </Marker>
                        )}
                    </MapContainer>
                </div>

                <div className="dashboard-section">
                    <h2>Datos Generales</h2>
                    <div className="stats">
                        <div className="stat-box">
                            <p className="label">Temperatura</p>
                            <p className="value">{fireData?.weather.temperature.toFixed(1)}°C</p>
                        </div>
                        <div className="stat-box">
                            <p className="label">Humedad</p>
                            <p className="value">{fireData?.weather.humidity}%</p>
                        </div>
                        <div className="stat-box">
                            <p className="label">Índice Sequía</p>
                            <p className="value">{fireData?.environmentalFactors.droughtIndex.toFixed(1)}</p>
                        </div>
                        <div className="stat-box">
                            <p className="label">Riesgo Incendio</p>
                            <p className="value">{fireData?.fireRisk.toFixed(1)}%</p>
                        </div>
                        <div className="stat-box">
                            <p className="label">Incendio Detectado</p>
                            <p className="value" style={{
                                color: fireData?.fireDetected ? '#e74c3c' : '#2ecc71',
                                fontWeight: 'bold'
                            }}>
                                {fireData?.fireDetected ? 'SÍ' : 'NO'}
                            </p>
                        </div>
                    </div>

                    {fireData?.fireDetected && (
                        <div className="fire-details">
                            <h3>Detalles del Incendio</h3>
                            <p><strong>Ubicación:</strong> {fireData.location}</p>
                            <p><strong>Fecha de detección:</strong> {new Date(fireData.timestamp).toLocaleString()}</p>
                            <p><strong>Coordenadas:</strong> Lat: {fireData.coordinates.lat.toFixed(4)}, Lng: {fireData.coordinates.lng.toFixed(4)}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;