/**
 * @file Landing.jsx
 * @description Public marketing route (`/`). See tasks/frontend/public/task-landing.md.
 *   No data fetching — just copy, layout, and CTAs to `/auth` and `/dashboard`.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Landing.module.css';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className={styles.landing}>
      <h1>Evangadi Forum</h1>
      <p>{/* TODO: hero copy, feature sections, how-it-works, and CTAs */}</p>
      <button
        type='button'
        onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
      >
        Get started
      </button>
    </div>
  );
}
