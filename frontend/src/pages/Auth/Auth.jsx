/**
 * Auth: combined login + register form; switches mode without changing routes.
 * See tasks/frontend/auth/task-auth.md for full requirements.
 *
 * API: `login({ email, password })` / `register({ firstName, lastName, email, password })`
 * from `useAuth()` (backed by `auth.service.js`).
 */

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Auth.module.css';

export default function Auth() {
  useAuth(); // TODO: pull `login` / `register` from here once you build the form

  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = e => {
    e.preventDefault();
    // TODO: validate fields, call login() or register() from AuthContext,
    // handle loading/error/success state, and redirect on success
    // (use useNavigate/useLocation from react-router-dom for the redirect).
  };

  return (
    <div className={styles.auth}>
      <h2>{isLogin ? 'Sign in to your account' : 'Create an account'}</h2>

      <form onSubmit={handleSubmit}>{/* TODO: build the login/register form */}</form>

      <button type='button' onClick={() => setIsLogin(v => !v)}>
        {isLogin ? 'Create an account' : 'Back to sign in'}
      </button>
    </div>
  );
}
