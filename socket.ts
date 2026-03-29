import { io } from "socket.io-client";

export const socket = io("https://cozie-kohl.vercel.app", {
  transports: ["websocket"],
});
