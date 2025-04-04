import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Login.css";

const Login = ({ onLogin }) => {
    const [nombre, setNombre] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validamos si el usuario es ADMIN
        if (nombre === "ADMIN" && contrasena === "ADMIN") {
            const adminUser = { nombre, contrasena };
            onLogin(adminUser);  // Pasamos el usuario ADMIN
            navigate("/dashboard");
        } else {
            const storedUsers = JSON.parse(localStorage.getItem("users")) || [];
            const foundUser = storedUsers.find(user => user.nombre === nombre && user.contrasena === contrasena);

            if (foundUser) {
                onLogin(foundUser);  // Pasamos el usuario logueado
                navigate("/dashboard");
            } else {
                setError("Usuario o contraseña no válidos");
            }
        }
    };

    const handleSignUpRedirect = () => {
        navigate("/signup");
    };

    return (
        <div className="login-container">

            <div className="login-box">
                <form onSubmit={handleSubmit}>
                    <label htmlFor="nombre">Nombre</label>
                    <input
                        id="nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ingresa tu nombre"
                    />

                    <label htmlFor="contrasena">Contraseña</label>
                    <input
                        id="contrasena"
                        type="password"
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        placeholder="Ingresa tu contraseña"
                    />

                    <div className="button-group"> {/* Nuevo contenedor */}
                        <button type="submit">Iniciar sesión</button>
                        <button type="button" onClick={handleSignUpRedirect}>Registrarse</button>
                    </div>
                    {error && <p className="error-message">{error}</p>}       </form>

            </div>
        </div>
    );
};

export default Login;