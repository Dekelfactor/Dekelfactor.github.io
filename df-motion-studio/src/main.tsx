import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { useStudio } from './store/useStudio';
import { seek } from './ui/player';

if (import.meta.env.DEV) Object.assign(window, { __studio: useStudio, __seek: seek });

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
