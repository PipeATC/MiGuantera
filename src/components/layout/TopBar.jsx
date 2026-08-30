import { Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { asset } from '../../utils/assets.js';

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <img src={asset('icons/icon.svg')} alt="" className="h-9 w-9 rounded-lg" />
      <span className="text-lg font-extrabold tracking-tight text-primary-900">
        MiGuantera
      </span>
    </div>
  );
}

/** Encabezado superior con marca e indicador de conexión. */
export default function TopBar() {
  const online = useOnlineStatus();

  return (
    <header className="sticky top-0 z-30 glass pt-safe">
      <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
        <BrandMark />
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            online ? 'bg-vigente-soft text-vigente-dark' : 'bg-primary-100 text-primary-500'
          }`}
          title={online ? 'Con conexión' : 'Sin conexión — la app funciona offline'}
        >
          {online ? (
            <Wifi className="h-3.5 w-3.5" strokeWidth={2.5} />
          ) : (
            <WifiOff className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
    </header>
  );
}
