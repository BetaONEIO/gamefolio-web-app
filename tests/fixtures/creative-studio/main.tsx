// Isolated editor test harness; never included in the production client.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreativeStudio } from '../../../client/src/components/admin/creative-studio/CreativeStudio';
import '../../../client/src/index.css';
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><div style={{padding:24}}><CreativeStudio /></div></QueryClientProvider>);
