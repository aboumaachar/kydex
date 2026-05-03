import React from "react";

export function Badge({ children, className = "", variant }: { children: React.ReactNode; className?: string; variant?: string }) {
  return <span className={`inline-flex items-center px-2 py-1 rounded ${className}`.trim()}>{children}</span>;
}

export default Badge;
