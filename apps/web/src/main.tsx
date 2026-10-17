import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { CopyProvider } from './shared/copy';
import { applyTokens } from './theme';
import './styles.css';

applyTokens();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CopyProvider>
      <App />
    </CopyProvider>
  </StrictMode>,
);
