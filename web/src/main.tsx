import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { isEnvBrowser } from '@/nui/bridge';
import { devSeed } from '@/nui/mock';
import '@/styles.css';

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

if (isEnvBrowser()) devSeed();
