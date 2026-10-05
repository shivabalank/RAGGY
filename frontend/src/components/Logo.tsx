import { APP_NAME, APP_TAGLINE, LOGO_URL } from '../config';

export function Logo({ size = 36, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src={LOGO_URL} alt={showText ? '' : APP_NAME} width={size} height={size} style={{ width: size, height: size }} className="object-contain mix-blend-multiply" />
      {showText && (
        <div className="leading-tight">
          <p className="text-[17px] font-bold tracking-tight text-zinc-900">{APP_NAME}</p>
          <p className="text-xs font-medium text-brand-600">{APP_TAGLINE}</p>
        </div>
      )}
    </div>
  );
}
