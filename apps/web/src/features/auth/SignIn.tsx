import { useState, type FormEvent } from 'react';

type Props = {
  busy: boolean;
  error: string | null;
  onSignIn: (email: string, password: string) => void;
};

export function SignIn({ busy, error, onSignIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSignIn(email, password);
  };
  return (
    <section className="panel signin" aria-labelledby="signin-title">
      <h1 id="signin-title">SIGN IN</h1>
      <p className="lead">
        For flight surgeons. Reads every crew's synced black-box log.
      </p>
      <form onSubmit={submit} noValidate>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? 'SIGNING IN…' : 'SIGN IN'}
        </button>
      </form>
    </section>
  );
}
