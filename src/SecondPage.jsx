import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from '@apollo/client';
import { GET_DETAILED_DATA } from './graphql/queries';
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import "./css/DataPage.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SecondPage = ({ currentUser, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { loading, error, data } = useQuery(GET_DETAILED_DATA);

    const handleNavigate = (path) => {
        navigate(path);
    };

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

    const fireData = data?.getChiquitosFireRiskData[0];

    const chartData = {
        labels: ['Temperatura', 'Humedad', 'Viento', 'Precipitación', 'Sequía', 'Riesgo'],
        datasets: [{
            label: 'Niveles',
            data: [
                fireData?.weather.temperature,
                fireData?.weather.humidity,
                fireData?.weather.windSpeed,
                fireData?.weather.precipitation,
                fireData?.environmentalFactors.droughtIndex,
                fireData?.fireRisk
            ],
            backgroundColor: [
                'yellow',
                'yellow',
                'blue',
                'blue',
                'red',
                fireData?.fireRisk > 70 ? 'red' : fireData?.fireRisk > 40 ? 'yellow' : 'green'
            ],
            borderColor: 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
        }],
    };

    return (
        <div className="dashboard-container" style={{ backgroundColor: '#9C9898' }}>
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
                <h1>Visualización de Datos</h1>

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
                        <p className="label">Viento</p>
                        <p className="value">{fireData?.weather.windSpeed.toFixed(1)} m/s</p>
                    </div>
                    <div className="stat-box">
                        <p className="label">Precipitación</p>
                        <p className="value">{fireData?.weather.precipitation.toFixed(1)} mm</p>
                    </div>
                    <div className="stat-box">
                        <p className="label">Sequía</p>
                        <p className="value">{fireData?.environmentalFactors.droughtIndex.toFixed(1)}</p>
                    </div>
                    <div className="stat-box">
                        <p className="label">Riesgo</p>
                        <p className="value">{fireData?.fireRisk.toFixed(1)}%</p>
                    </div>
                </div>

                <div className="bars">
                    <p className="bars-label">Indicadores</p>
                    <div className="bar yellow"></div>
                    <div className="bar yellow"></div>
                    <div className="bar blue"></div>
                    <div className="bar blue"></div>
                    <div className="bar red"></div>
                    <div className="bar" style={{
                        backgroundColor: fireData?.fireRisk > 70 ? 'red' : fireData?.fireRisk > 40 ? 'yellow' : 'green'
                    }}></div>
                </div>

                <div className="chart-container">
                    <Bar
                        data={chartData}
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
                                    ticks: {
                                        color: '#333'
                                    },
                                    grid: {
                                        color: 'rgba(255,255,255,0.1)'
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

export default SecondPage;