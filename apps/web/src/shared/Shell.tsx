import type { ReactNode } from 'react';
import { ModeToggle } from './copy';

// Every screen: wordmark, the SIMULATED DATA badge (always visible), and the safety footer.
export function Shell({
  account,
  children,
}: {
  account?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <header className="top">
        <a className="brand" href="#/">
          <span className="wordmark">SOMACAST</span>
          <span className="brand-sub">Ground console</span>
        </a>
        <span
          className="sim-badge"
          role="note"
          aria-label="All values in this console are simulated data"
        >
          SIMULATED DATA
        </span>
        <ModeToggle />
        {account && <div className="account">{account}</div>}
      </header>
      <main className="content">{children}</main>
      <footer className="foot">
        <p>
          Decision support only, not a medical device. Thresholds are
          illustrative.
        </p>
        <p className="foot-small">
          Somacast is an independent team project for the NASA Space Apps
          Challenge. It is not affiliated with or endorsed by NASA.
        </p>
      </footer>
    </div>
  );
}
