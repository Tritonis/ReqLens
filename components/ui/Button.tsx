interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary'; }
export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const variants = { primary: 'bg-blue-600 text-white hover:bg-blue-700', secondary: 'border border-gray-200 text-gray-700 hover:bg-gray-50' };
  return <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${variants[variant]} ${className}`} {...props} />;
}
