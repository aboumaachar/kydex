import React from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={className}>⏳</span>;
}

export default Spinner;
