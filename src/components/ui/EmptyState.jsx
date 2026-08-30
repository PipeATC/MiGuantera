/** Estado vacío reutilizable con icono, título, descripción y acción. */
export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary-200 bg-white/50 px-6 py-12 text-center ${className}`}
    >
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-400">
          <Icon className="h-7 w-7" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-headline-sm text-primary-800">{title}</h3>
      {description && <p className="max-w-xs text-sm text-primary-500">{description}</p>}
      {action}
    </div>
  );
}
