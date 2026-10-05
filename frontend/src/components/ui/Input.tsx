import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';
import { cn } from '../../lib/utils';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; icon?: ReactNode; trailing?: ReactNode;
}
export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, icon, trailing, className, id, ...rest }, ref) => {
  const auto = useId();
  const iid = id ?? auto;
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={iid} className="block text-sm font-medium text-zinc-700">{label}</label>}
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">{icon}</span>}
        <input
          ref={ref} id={iid} aria-invalid={!!error}
          className={cn(
            'h-11 w-full rounded-lg border bg-white text-[15px] text-zinc-900 outline-none transition placeholder:text-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-500',
            icon ? 'pl-10' : 'pl-3.5', trailing ? 'pr-11' : 'pr-3.5',
            error ? 'border-red-400 focus:ring-4 focus:ring-red-100' : 'border-zinc-200 hover:border-zinc-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100',
            className,
          )}
          {...rest}
        />
        {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';
