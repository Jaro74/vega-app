import React from "react";

// Una mejor manera de ilustrar con iconos
// Pasa cualquier icono SVG como children (ancho/alto recomendado: w-6 h-6)
// Por defecto, usa tu color primario para el estilo
const BetterIcon = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-12 h-12 inline-flex items-center justify-center rounded-full bg-primary/20 text-primary">
      {children}
    </div>
  );
};

export default BetterIcon;
