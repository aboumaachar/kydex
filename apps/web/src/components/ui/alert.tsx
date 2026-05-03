import React from "react";

export function Alert({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function AlertDescription({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export default Alert;
