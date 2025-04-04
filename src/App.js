// src/App.js
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ApolloProvider } from '@apollo/client';
import client from './apolloClient';
import Login from "./Login";
import Dashboard from "./Dashboard";
import SecondPage from "./SecondPage";
import MapPage from "./NewPage";
import SignUp from "./SignUp";
import Users from "./Users";
import ReportWebVitals from "./reportWebVitals";
import ReporteVoluntarios from "./Biomasa";

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const handleLogin = (user) => {
        setIsAuthenticated(true);
        setCurrentUser(user);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setCurrentUser(null);
    };

    return (
        <ApolloProvider client={client}>
            <Router>
                <Routes>
                    <Route path="/" element={<Login onLogin={handleLogin} />} />
                    <Route path="/signup" element={<SignUp />} />
                    {isAuthenticated ? (
                        <>
                            <Route path="/dashboard" element={<Dashboard currentUser={currentUser} onLogout={handleLogout} />} />
                            <Route path="/secondPage" element={<SecondPage currentUser={currentUser} onLogout={handleLogout} />} />
                            <Route path="/newPage" element={<MapPage currentUser={currentUser} onLogout={handleLogout} />} />
                            {currentUser.nombre === "ADMIN" && (
                                <Route path="/users" element={<Users />} />
                            )}
                            <Route path="/reporte" element={<ReporteVoluntarios currentUser={currentUser} onLogout={handleLogout} />} />
                        </>
                    ) : (
                        <Route path="*" element={<Login onLogin={handleLogin} />} />
                    )}
                </Routes>
            </Router>
        </ApolloProvider>
    );
}

export default App;