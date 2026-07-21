import { Landmark } from 'lucide-react';

function BrandLogo({ compact, muted }) {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center rounded-lg bg-primary p-2.5">
          <Landmark size={28} className="text-white" strokeWidth={2.4} />
        </div>
        <div className="text-center">
          <div className={`font-headline text-lg font-bold ${muted ? 'text-slate-400' : 'text-primary'}`}>
            FixIt<span className="text-secondary">Local</span>
          </div>
          <p className="text-[9px] uppercase tracking-wider text-on-primary-container font-semibold">Civic Authority</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 flex items-center justify-center rounded-lg bg-primary p-2">
        <Landmark size={30} className="text-white" strokeWidth={2.4} />
      </div>
      <div className="min-w-0">
        <div className={`font-headline text-lg font-bold ${muted ? 'text-slate-400' : 'text-[#091426]'}`}>
          FixIt<span className="text-secondary">Local</span>
        </div>
        <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold whitespace-nowrap">Civic Authority Portal</p>
      </div>
    </div>
  );
}

export default BrandLogo;
