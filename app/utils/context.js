"use client";
import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("userData");

    if (token && storedUser) {
      setAccessToken(token);
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  return (
    <UserContext.Provider
      value={{ user, setUser, accessToken, setAccessToken, loading }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
