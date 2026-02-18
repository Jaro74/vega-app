import axios from "axios";
import { toast } from "react-hot-toast";
import { redirect } from "next/navigation";
import config from "@/config";

// Usa esto para interactuar con nuestra propia API (carpeta /app/api) desde el lado del front-end
const apiClient = axios.create({
  baseURL: "/api",
});

apiClient.interceptors.response.use(
  function (response) {
    return response.data;
  },
  function (error) {
    let message = "";

    if (error.response?.status === 401) {
      // Usuario no autenticado, pedir que vuelva a iniciar sesion
      toast.error("Por favor inicia sesion");
      // Envia al usuario a la pagina de login
      redirect(config.auth.loginUrl);
    } else if (error.response?.status === 403) {
      // Usuario no autorizado, debe suscribirse/comprar/elegir un plan
      message = "Elige un plan para usar esta funcion";
    } else {
      message =
        error?.response?.data?.error || error.message || error.toString();
    }

    error.message =
      typeof message === "string" ? message : JSON.stringify(message);

    console.error(error.message);

    // Mostrar errores automaticamente al usuario
    if (error.message) {
      toast.error(error.message);
    } else {
      toast.error("Algo salio mal...");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
