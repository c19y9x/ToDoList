import React from "react";
import ReactDOM from "react-dom/client";
import TaskPopup from "./components/TaskPopup";
import "./index.css";

document.body.id = "popup-body";

ReactDOM.createRoot(document.getElementById("popup-root")!).render(
  <React.StrictMode>
    <TaskPopup />
  </React.StrictMode>
);
