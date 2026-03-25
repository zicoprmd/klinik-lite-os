export const Card = ({ children, className = '', title, action, noPadding = false }) => {
  return (
    <div className={`bg-white border border-slate-200/80 rounded-xl shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          {title && (
            <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
          )}
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  )
}
