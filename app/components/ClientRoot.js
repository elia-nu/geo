"use client";
import { useState, useEffect } from "react";
import LoginForm from "./LoginForm";
import AttendancePage from "./AttendancePage";

export default function ClientRoot() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    setUser(localStorage.getItem("attendanceUser"));
  }, []);

  const handleLogin = (username) => {
    setUser(username);
  };

  return !user ? <LoginForm onLogin={handleLogin} /> : <AttendancePage />;
}
