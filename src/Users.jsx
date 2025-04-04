import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Users.css";

const Users = () => {
    const [users, setUsers] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUsers = JSON.parse(localStorage.getItem("users")) || [];
        setUsers(storedUsers);
    }, []);

    const handleDelete = (nombre) => {
        const updatedUsers = users.filter(user => user.nombre !== nombre);
        localStorage.setItem("users", JSON.stringify(updatedUsers));
        setUsers(updatedUsers);
    };

    return (
        <div className="dashboard-container" style={{ backgroundColor: "#f0f0f0" }}>
            <div className="top-bar">
                <button onClick={() => navigate("/dashboard")}>Inicio</button>
                <button onClick={() => navigate("/secondPage")}>Datos</button>
                <button onClick={() => navigate("/newPage")}>Simulación</button>
                <button onClick={() => navigate("/")} className="logout-button">Cerrar sesión</button>
            </div>

            <div className="main-content" style={{ paddingTop: "80px" }}>
                <h1 style={{
                    color: "#2c3e50",
                    fontSize: "2.5rem",
                    textAlign: "center",
                    marginBottom: "30px",
                    textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
                    borderBottom: "3px solid #e74c3c",
                    paddingBottom: "10px"
                }}>
                    Usuarios Registrados
                </h1>

                <div className="user-list" style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                    gap: "20px",
                    width: "90%",
                    maxWidth: "1200px",
                    margin: "0 auto",
                    padding: "20px"
                }}>
                    {users.length > 0 ? (
                        users.map((user) => (
                            <div key={user.nombre} style={{
                                backgroundColor: "white",
                                borderRadius: "12px",
                                padding: "20px",
                                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                transition: "transform 0.2s ease"
                            }}>
                                <p style={{
                                    color: "#2c3e50",
                                    fontSize: "1.2rem",
                                    fontWeight: "500",
                                    margin: "0"
                                }}>
                                    {user.nombre}
                                </p>
                                <button
                                    onClick={() => handleDelete(user.nombre)}
                                    style={{
                                        backgroundColor: "#e74c3c",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        padding: "8px 15px",
                                        cursor: "pointer",
                                        transition: "background-color 0.3s ease",
                                        fontWeight: "600"
                                    }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = "#c0392b"}
                                    onMouseOut={(e) => e.target.style.backgroundColor = "#e74c3c"}
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))
                    ) : (
                        <div style={{
                            backgroundColor: "white",
                            borderRadius: "12px",
                            padding: "30px",
                            textAlign: "center",
                            gridColumn: "1 / -1",
                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
                        }}>
                            <p style={{
                                color: "#7f8c8d",
                                fontSize: "1.2rem",
                                margin: "0"
                            }}>
                                No hay usuarios registrados
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Users;
