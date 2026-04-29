interface Props { children: React.ReactNode; className?: string; }
export function Badge({ children, className = '' }: Props) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${className}`}>{children}</span>;
}
