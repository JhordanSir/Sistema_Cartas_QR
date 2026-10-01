import { PasswordChangeForm } from '@/components/password-change-form';
import { Card, Notice } from '@/components/ui/surfaces';

/** «Cuenta» of the panel and of the backoffice: who is signed in and the password change. */
export function AccountScreen({
  email,
  mustChangePassword,
}: {
  email: string;
  mustChangePassword: boolean;
}) {
  return (
    <div className="grid max-w-xl gap-6">
      <div className="grid gap-1.5">
        <h1 className="m-0 font-display text-3xl font-semibold tracking-tight">Cuenta</h1>
        <p className="m-0 text-[15px] text-ink-soft">
          Entras con <strong className="font-semibold text-ink">{email}</strong>.
        </p>
      </div>
      {mustChangePassword ? (
        <Notice tone="warning">Debes cambiar tu contraseña para continuar.</Notice>
      ) : null}
      <Card className="grid gap-5 p-6">
        <div className="grid gap-1">
          <h2 className="m-0 font-display text-xl font-semibold">Cambiar contraseña</h2>
          <p className="m-0 text-sm text-ink-soft">
            Al cambiarla, se cierran tus sesiones en otros dispositivos.
          </p>
        </div>
        <PasswordChangeForm mustChangePassword={mustChangePassword} />
      </Card>
    </div>
  );
}
