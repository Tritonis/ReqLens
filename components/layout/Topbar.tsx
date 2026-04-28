interface Props { title: string; actions?: React.ReactNode; }

export function Topbar({ title, actions }: Props) {
  return (
    <header className="h-14 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}
