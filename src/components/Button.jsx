export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  type = 'button',
  ...props
}) => {
  const base =
    'font-medium rounded-lg transition-all duration-200 inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'

  const variants = {
    primary:
      'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-sm hover:shadow-md hover:shadow-sky-600/25 hover:-translate-y-0.5',
    secondary:
      'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm',
    outline:
      'border-2 border-sky-600 text-sky-600 hover:bg-sky-50 font-medium',
    ghost:
      'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
    danger:
      'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm hover:shadow-md hover:shadow-red-500/25 hover:-translate-y-0.5',
    accent:
      'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-sm hover:shadow-md hover:shadow-teal-500/25 hover:-translate-y-0.5',
  }

  const sizes = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
    xl: 'px-6 py-3 text-base',
  }

  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
