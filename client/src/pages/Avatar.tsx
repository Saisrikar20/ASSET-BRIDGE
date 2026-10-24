import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AvatarPicker from '../components/kokonutui/avatar-picker';
import { api, type User } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ErrorNote, PageHeader } from '../components/ui';

export default function AvatarPage() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [err, setErr] = useState<string | null>(null);
  const saved = user?.avatar;

  const save = async (v: { displayName: string; variant: number; seed: string }) => {
    setErr(null);
    try {
      await api<{ user: User }>('/me/avatar', { method: 'PUT', body: v });
      await refresh();
      nav(params.get('next') || (user?.identity ? '/app' : '/app/verify'));
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader title="Your avatar" subtitle="This is how you'll appear to your family in Asset Bridge — on alerts, estate cases and the heir portal." />
      <div className="mx-auto max-w-sm">
        <AvatarPicker
          defaultValue={{ displayName: saved?.displayName ?? user?.identity?.name ?? user?.name ?? '', variant: saved?.variant ?? 0 }}
          description="Made from your name. Spin the coin, shuffle, or pick one of five."
          submitLabel={saved ? 'Save avatar' : 'Continue'}
          onComplete={save}
        />
        <div className="mt-3"><ErrorNote msg={err} /></div>
      </div>
    </>
  );
}
