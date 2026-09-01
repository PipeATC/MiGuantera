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

/** Encabezado superior con la marca. */
export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 glass pt-safe">
      <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
        <BrandMark />
      </div>
    </header>
  );
}
