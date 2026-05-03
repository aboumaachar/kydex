import React from "react";

export function Separator({ className = "", orientation = "horizontal" }: { className?: string; orientation?: "horizontal" | "vertical" }) {
  if (orientation === "vertical") return <div className={`w-px mx-2 ${className}`} />;
  return <hr className={`${className}`} />;
}

export default Separator;
