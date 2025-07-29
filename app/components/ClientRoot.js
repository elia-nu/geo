"use client";
import { useState, useEffect } from "react";
import LoginForm from "./LoginForm";
import AttendancePage from "./AttendancePage";
import Navbar from "./Navbarw";

export default function ClientRoot() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    setUser(localStorage.getItem("attendanceUser"));
  }, []);

  const handleLogin = (username) => {
    setUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem("attendanceUser");
    setUser(null);
  };

  if (!user) return <LoginForm onLogin={handleLogin} />;
  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />
      <AttendancePage user={user} onLogout={handleLogout} />
    </>
  );
}
