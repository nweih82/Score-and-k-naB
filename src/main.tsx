import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { SoundProvider } from './lib/SoundContext.tsx';
import { TvProvider } from './lib/TvContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TvProvider>
      <SoundProvider>
        <App />
      </SoundProvider>
    </TvProvider>
  </StrictMode>,
);

