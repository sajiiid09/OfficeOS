// src/socket.js
import { io } from "socket.io-client";

const getSocketUrl = () => {
  const envUrl = process.env.REACT_APP_BASE_URL?.trim();
  return envUrl || 'http://localhost:5500';
};

const socket = io(getSocketUrl(), {
  withCredentials: true,
  autoConnect: false,
  transports: ['websocket', 'polling']
});

export default socket;
