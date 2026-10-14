import { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";

/**
 * Two-factor authentication settings.
 *
 * Enabling is a two-step dance: setup stashes a secret and returns a QR code,
 * and enable confirms it with a code before 2FA actually applies. The recovery
 * codes are shown once, on enable, because the backend only stores them hashed.
 */
export default function TwoFactorSection() {
  const { user, setupTwoFactor, enableTwoFactor, disableTwoFactor } = useAuth();
  const { showToast } = useToast();

  const [setup, setSetup] = useState(null); // { secret, qrDataUrl }
  const [code, setCode] = useState("");
  const [disableForm, setDisableForm] = useState({ password: "", code: "" });
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setError(null);
    setBusy(true);
    try {
      setSetup(await setupTwoFactor());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const codes = await enableTwoFactor({ code: code.trim() });
      setRecoveryCodes(codes);
      setSetup(null);
      setCode("");
      showToast("Two-factor authentication enabled");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await disableTwoFactor({
        password: disableForm.password,
        code: disableForm.code.trim(),
      });
      setDisableForm({ password: "", code: "" });
      showToast("Two-factor authentication disabled");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (recoveryCodes) {
    return (
      <div className='space-y-3 max-w-sm'>
        <p className='text-sm text-neutral-600'>
          Save these recovery codes somewhere safe. Each one works once, if you
          lose access to your authenticator app. They will not be shown again.
        </p>
        <ul className='grid grid-cols-2 gap-2 font-mono text-sm text-brand-dark'>
          {recoveryCodes.map((rc) => (
            <li key={rc} className='rounded-card bg-neutral-100 px-3 py-2 text-center'>
              {rc}
            </li>
          ))}
        </ul>
        <Button onClick={() => setRecoveryCodes(null)}>Done</Button>
      </div>
    );
  }

  if (user.twoFactorEnabled) {
    return (
      <form onSubmit={confirmDisable} noValidate className='space-y-4 max-w-sm'>
        <p className='text-sm text-success'>
          Two-factor authentication is on.
        </p>
        <Input
          label='Current password'
          type='password'
          value={disableForm.password}
          onChange={(e) =>
            setDisableForm((prev) => ({ ...prev, password: e.target.value }))
          }
          autoComplete='current-password'
        />
        <Input
          label='Code or recovery code'
          value={disableForm.code}
          onChange={(e) =>
            setDisableForm((prev) => ({ ...prev, code: e.target.value }))
          }
          autoComplete='one-time-code'
        />
        {error && <p className='text-sm text-danger'>{error}</p>}
        <Button type='submit' variant='outline' disabled={busy}>
          {busy ? "Disabling…" : "Disable two-factor"}
        </Button>
      </form>
    );
  }

  if (setup) {
    return (
      <form onSubmit={confirmEnable} noValidate className='space-y-4 max-w-sm'>
        <p className='text-sm text-neutral-600'>
          Scan this with your authenticator app, then enter the code it shows.
        </p>
        <img
          src={setup.qrDataUrl}
          alt='Two-factor QR code'
          className='w-40 h-40 rounded-card border border-neutral-200'
        />
        <p className='text-xs text-neutral-500 break-all'>
          Or enter this key manually: {setup.secret}
        </p>
        <Input
          label='Authentication code'
          inputMode='numeric'
          autoComplete='one-time-code'
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder='123456'
        />
        {error && <p className='text-sm text-danger'>{error}</p>}
        <div className='flex gap-3'>
          <Button type='submit' disabled={busy || !code}>
            {busy ? "Enabling…" : "Enable"}
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              setSetup(null);
              setCode("");
              setError(null);
            }}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className='space-y-3 max-w-sm'>
      <p className='text-sm text-neutral-600'>
        Add a code from an authenticator app on top of your password.
      </p>
      {error && <p className='text-sm text-danger'>{error}</p>}
      <Button onClick={startSetup} disabled={busy}>
        {busy ? "Starting…" : "Set up two-factor"}
      </Button>
    </div>
  );
}
