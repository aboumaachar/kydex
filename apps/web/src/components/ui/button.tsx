"use client";

import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "outline" | "ghost";
  size?: "lg" | "sm";
};

export function Button({ children, className = "", variant, size, ...rest }: Props) {
  let base = "inline-flex items-center justify-center rounded-md font-medium";
  if (size === "lg") base = "inline-flex items-center justify-center rounded-md font-medium px-6 py-3";
  if (variant === "outline") base += " border";
  return (
    <button className={`${base} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

export default Button;
