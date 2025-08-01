import { useContext } from "react";
import WorkerContext from "./WorkerContext"; // Impor konteks dari WorkerProvider

const useWorker = () => {
  const context = useContext(WorkerContext);
  if (!context) {
    throw new Error("useWorker must be used within a WorkerProvider");
  }
  return context;
};

export default useWorker;
