"use client";

import React from "react";

const ButtonGradient = ({
  title = "Boton Gradiente",
  onClick = () => {},
}: {
  title?: string;
  onClick?: () => void;
}) => {
  return (
    <button className="btn btn-gradient animate-shimmer" onClick={onClick}>
      {title}
    </button>
  );
};

export default ButtonGradient;
