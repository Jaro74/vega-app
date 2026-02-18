/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/libs/supabase/client";
import config from "@/config";

// Un boton simple para iniciar sesion con nuestros proveedores (Google y Magic Links).
// Redirige automaticamente al usuario a callbackUrl (config.auth.callbackUrl) despues del login, que normalmente es una pagina privada para que los usuarios gestionen sus cuentas.
// Si el usuario ya esta logueado, mostrara su foto de perfil y los redirigira a callbackUrl inmediatamente.
const ButtonSignin = ({
  text = "Comenzar",
  extraStyle,
}: {
  text?: string;
  extraStyle?: string;
}) => {
  // useMemo para evitar crear nueva instancia de supabase en cada render
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    };

    getUser();
  }, [supabase]);

  if (user) {
    return (
      <Link
        href={config.auth.callbackUrl}
        className={`btn ${extraStyle ? extraStyle : ""}`}
      >
        {user?.user_metadata?.avatar_url ? (
          <img
            src={user?.user_metadata?.avatar_url}
            alt={user?.user_metadata?.name || "Cuenta"}
            className="w-6 h-6 rounded-full shrink-0"
            referrerPolicy="no-referrer"
            width={24}
            height={24}
          />
        ) : (
          <span className="w-6 h-6 bg-base-300 flex justify-center items-center rounded-full shrink-0">
            {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0)}
          </span>
        )}
        {user?.user_metadata?.name || user?.email || "Cuenta"}
      </Link>
    );
  }

  return (
    <Link
      className={`btn ${extraStyle ? extraStyle : ""}`}
      href={config.auth.loginUrl}
    >
      {text}
    </Link>
  );
};

export default ButtonSignin;
