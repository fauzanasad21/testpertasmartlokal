import axios from 'axios';
import { useNavigate } from "react-router-dom";

export const isUserLoggedIn = async () => {
    const navigate = useNavigate();
        try {
          const response = await fetch("http://localhost:9921/api/check-auth", {
            method: "GET",
            credentials: "include"
          });
    
          if (response.ok) {
            
            navigate("/dashboard");
          } else {
            navigate("/login")
          }
        } catch (error) {
          console.error("Tidak dapat memverifikasi login:", error);
        }
};
