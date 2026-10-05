import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '../ui/Input';

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }>((props, ref) => {
  const [show, setShow] = useState(false);
  return (
    <Input ref={ref} {...props} type={show ? 'text' : 'password'} icon={<Lock className="h-4 w-4" />}
      trailing={<button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
        className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 hover:bg-brand-50 hover:text-brand-600">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} />
  );
});
PasswordInput.displayName = 'PasswordInput';
