import { legalMetadata, legalPage } from '@/features/legal/page-factory';
import '@/features/legal/styles/index.css';

import type { Viewport } from 'next';

/** Чернильный хром браузера — как у лендинга, из чьего мира эта страница. */
export const viewport: Viewport = { themeColor: '#0e0e10' };

export const generateMetadata = legalMetadata('terms');

export default legalPage('terms');
