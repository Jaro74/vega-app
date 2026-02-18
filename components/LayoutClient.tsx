"use client";

import { User } from "@supabase/supabase-js";
import { createClient } from "@/libs/supabase/client";
import { useEffect, useState, useMemo, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Crisp } from "crisp-sdk-web";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "react-hot-toast";
import { Tooltip } from "react-tooltip";
import config from "@/config";

// Soporte de chat al cliente con Crisp:
// Este componente esta separado de ClientLayout porque necesita estar envuelto con <SessionProvider> para usar el hook useSession()
const CrispChat = (): null => {
  const pathname = usePathname();

  // useMemo para evitar crear nueva instancia de supabase en cada render
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<{ user: User }>(null);

  // Esto se usa para obtener los datos del usuario de Supabase Auth (si esta logueado) => el ID del usuario se usa para identificar usuarios en Crisp
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setData({ user });
      }
    };
    getUser();
  }, [supabase, pathname]);

  useEffect(() => {
    if (config?.crisp?.id) {
      // Configurar Crisp
      Crisp.configure(config.crisp.id);

      // (Opcional) Si el array onlyShowOnRoutes no esta vacio en config.js, Crisp se ocultara en las rutas del array.
      // Usa <AppButtonSupport> en su lugar para mostrarlo (el usuario hace clic en el boton para mostrar Crisp—limpia la UI)
      if (
        config.crisp.onlyShowOnRoutes &&
        !config.crisp.onlyShowOnRoutes?.includes(pathname)
      ) {
        Crisp.chat.hide();
        Crisp.chat.onChatClosed(() => {
          Crisp.chat.hide();
        });
      }
    }
  }, [pathname]);

  // Agregar ID unico del usuario a Crisp para identificar facilmente a los usuarios cuando contacten soporte (opcional)
  useEffect(() => {
    if (data?.user && config?.crisp?.id) {
      Crisp.session.setData({ userId: data.user?.id });
    }
  }, [data]);

  return null;
};

// Todos los wrappers del cliente estan aqui (no pueden estar en componentes de servidor)
// 1. NextTopLoader: Muestra una barra de progreso arriba al navegar entre paginas
// 2. Toaster: Muestra mensajes de Exito/Error desde cualquier parte de la app con toast()
// 3. Tooltip: Muestra tooltips si algun elemento JSX tiene estos 2 atributos: data-tooltip-id="tooltip" data-tooltip-content=""
// 4. CrispChat: Configura el soporte de chat al cliente con Crisp (ver arriba)
const ClientLayout = ({ children }: { children: ReactNode }) => {
  return (
    <>
      {/* Muestra una barra de progreso arriba al navegar entre paginas */}
      <NextTopLoader color={config.colors.main} showSpinner={false} />

      {/* Contenido dentro de archivos app/page.js */}
      {children}

      {/* Muestra mensajes de Exito/Error desde cualquier parte de la app con toast() */}
      <Toaster
        toastOptions={{
          duration: 3000,
        }}
      />

      {/* Muestra tooltips si algun elemento JSX tiene estos 2 atributos: data-tooltip-id="tooltip" data-tooltip-content="" */}
      <Tooltip
        id="tooltip"
        className="z-[60] !opacity-100 max-w-sm shadow-lg"
      />

      {/* Configura el soporte de chat al cliente con Crisp */}
      <CrispChat />
    </>
  );
};

export default ClientLayout;
