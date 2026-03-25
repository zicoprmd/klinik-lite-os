export const Input = ({ label, error, className = '', ...props }) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3.5 py-2.5 rounded-lg border ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10'
            : 'border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10'
        } focus:outline-none transition-all duration-150 bg-white text-slate-800 placeholder-slate-400 text-sm`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export const Textarea = ({ label, error, className = '', ...props }) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-3.5 py-2.5 rounded-lg border ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10'
            : 'border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10'
        } focus:outline-none transition-all duration-150 bg-white text-slate-800 placeholder-slate-400 text-sm resize-none`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export const Select = ({ label, error, options = [], className = '', ...props }) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        className={`w-full px-3.5 py-2.5 rounded-lg border ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10'
            : 'border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10'
        } focus:outline-none transition-all duration-150 bg-white text-slate-800 cursor-pointer text-sm`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export const Label = ({ children, className = '' }) => (
  <label className={`block text-sm font-medium text-slate-700 mb-1.5 ${className}`}>
    {children}
  </label>
)
