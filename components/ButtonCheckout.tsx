"use client";

import { useState } from "react";
import apiClient from "@/libs/api";
import config from "@/config";

// Este componente se usa para crear Sesiones de Checkout de Stripe
// Llama a la ruta /api/stripe/create-checkout con el priceId, successUrl y cancelUrl
// Los usuarios deben estar autenticados. Prerellenara los datos del Checkout con su email y/o tarjeta de credito (si tiene)
// Tambien puedes cambiar el modo a "subscription" si quieres crear una suscripcion en lugar de un pago unico
const ButtonCheckout = ({
  priceId,
  mode = "payment",
}: {
  priceId: string;
  mode?: "payment" | "subscription";
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      const { url }: { url: string } = await apiClient.post(
        "/stripe/create-checkout",
        {
          priceId,
          successUrl: window.location.href,
          cancelUrl: window.location.href,
          mode,
        }
      );

      window.location.href = url;
    } catch (e) {
      console.error(e);
    }

    setIsLoading(false);
  };

  return (
    <button
      className="btn btn-primary btn-block group"
      onClick={() => handlePayment()}
    >
      {isLoading ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        <svg
          className="w-5 h-5 fill-primary-content group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M9 3V10.4L3.6 18.4C2.8 19.6 3.7 21 5.1 21H18.9C20.3 21 21.2 19.6 20.4 18.4L15 10.4V3H16C16.6 3 17 2.6 17 2C17 1.4 16.6 1 16 1H8C7.4 1 7 1.4 7 2C7 2.6 7.4 3 8 3H9ZM11 3H13V10.9L17.2 17H6.8L11 10.9V3Z" />
          <circle cx="10" cy="18" r="1" />
          <circle cx="14" cy="16" r="1" />
        </svg>
      )}
      Obtener {config?.appName}
    </button>
  );
};

export default ButtonCheckout;
