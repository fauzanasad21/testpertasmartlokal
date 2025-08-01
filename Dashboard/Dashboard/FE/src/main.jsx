import React from "react";
import ReactDOM from "react-dom/client";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { WorkerProvider } from "./WorkerProvider.jsx";
import { store, persistor } from "./store";
import { PersistGate } from "redux-persist/integration/react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import "./index.css";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WorkerProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <RouterProvider router={router}>
            <App />
          </RouterProvider>
        </PersistGate>
      </Provider>
    </WorkerProvider>
  </StrictMode>
);
