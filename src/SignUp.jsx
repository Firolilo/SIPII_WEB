import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Login.css"; // Usamos el mismo estilo para mantener la consistencia

const SignUp = () => {
    const [nombre, setNombre] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [confirmarContrasena, setConfirmarContrasena] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validación para evitar que alguien se registre como "ADMIN"
        if (nombre === "ADMIN" && contrasena === "ADMIN") {
            setError("No puedes registrarte con ese nombre de usuario y contraseña.");
            return;
        }

        if (contrasena !== confirmarContrasena) {
            setError("Las contraseñas no coinciden");
        } else {
            const newUser = { nombre, contrasena };
            const storedUsers = JSON.parse(localStorage.getItem("users")) || [];
            storedUsers.push(newUser);
            localStorage.setItem("users", JSON.stringify(storedUsers)); // Guardamos el usuario en el localStorage
            navigate("/");  // Redirigimos a la página de login
        }
    };

    return (
        <div className="login-container">
            <div className="top-bar">
                <span role="img" aria-label="fuego">🔥</span>
                <span role="img" aria-label="fuego">🔥</span>
                <span role="img" aria-label="fuego">🔥</span>
            </div>

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

                    <label htmlFor="confirmarContrasena">Confirmar Contraseña</label>
                    <input
                        id="confirmarContrasena"
                        type="password"
                        value={confirmarContrasena}
                        onChange={(e) => setConfirmarContrasena(e.target.value)}
                        placeholder="Confirma tu contraseña"
                    />

                    <button type="submit">Registrarse</button>
                    {error && <p className="error-message">{error}</p>}
                </form>
            </div>
        </div>
    );
};

export default SignUp;
