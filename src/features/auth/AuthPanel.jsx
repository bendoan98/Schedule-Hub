import SegmentedToggle from '../../components/ui/SegmentedToggle';
import StatusBanner from '../../components/ui/StatusBanner';

const AUTH_MODE_OPTIONS = [
  { value: 'sign_in', label: 'Login' },
  { value: 'sign_up', label: 'Sign Up' }
];

export default function AuthPanel({
  authMode,
  onAuthModeChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  showPassword,
  onTogglePassword,
  oauthLoadingProvider,
  fullName,
  onFullNameChange,
  onSignIn,
  onSignUp,
  onForgotPassword,
  onOAuthSignIn,
  authError
}) {
  return (
    <section className="panel auth-panel auth-template-panel">
      <SegmentedToggle
        className="auth-mode-toggle auth-template-toggle"
        ariaLabel="Authentication mode"
        options={AUTH_MODE_OPTIONS}
        value={authMode}
        onChange={onAuthModeChange}
      />

      <h3 className="auth-template-title">{authMode === 'sign_up' ? 'Create account' : 'Welcome back'}</h3>

      <form className="auth-form auth-template-form" onSubmit={authMode === 'sign_up' ? onSignUp : onSignIn}>
        {authMode === 'sign_up' ? (
          <label className="auth-field">
            <span>Full Name</span>
            <div className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">
                👤
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => onFullNameChange(event.target.value)}
                required
                autoComplete="name"
                placeholder="John Doe"
              />
            </div>
          </label>
        ) : null}

        <label className="auth-field">
          <span>Email</span>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true">
              📨
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
        </label>

        <label className="auth-field">
          <span>Password</span>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden="true">
              🔒
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              required
              autoComplete={authMode === 'sign_up' ? 'new-password' : 'current-password'}
              placeholder={authMode === 'sign_up' ? 'Create a password' : 'Enter password'}
            />
            <button
              type="button"
              className="auth-input-action"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={onTogglePassword}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        {authMode === 'sign_in' ? (
          <button type="button" className="inline-link auth-forgot-link" onClick={onForgotPassword}>
            Forgot password?
          </button>
        ) : null}

        <button type="submit" className="primary auth-submit-button">
          {authMode === 'sign_up' ? 'Sign Up' : 'Log In'}
        </button>

        <div className="auth-divider">
          <span>Or continue with</span>
        </div>

        <div className="auth-social-row">
          <button
            type="button"
            className={`auth-social-button ${oauthLoadingProvider === 'google' ? 'is-loading' : ''}`}
            disabled={Boolean(oauthLoadingProvider)}
            aria-busy={oauthLoadingProvider === 'google'}
            onClick={() => onOAuthSignIn('google')}
          >
            <span className="auth-social-icon" aria-hidden="true">
              G
            </span>
            <span>{oauthLoadingProvider === 'google' ? 'Connecting...' : 'Google'}</span>
            {oauthLoadingProvider === 'google' ? (
              <span className="auth-social-spinner" aria-hidden="true" />
            ) : null}
          </button>
          <button
            type="button"
            className={`auth-social-button ${oauthLoadingProvider === 'facebook' ? 'is-loading' : ''}`}
            disabled={Boolean(oauthLoadingProvider)}
            aria-busy={oauthLoadingProvider === 'facebook'}
            onClick={() => onOAuthSignIn('facebook')}
          >
            <span className="auth-social-icon" aria-hidden="true">
              f
            </span>
            <span>{oauthLoadingProvider === 'facebook' ? 'Connecting...' : 'Facebook'}</span>
            {oauthLoadingProvider === 'facebook' ? (
              <span className="auth-social-spinner" aria-hidden="true" />
            ) : null}
          </button>
        </div>
      </form>

      {authError ? <StatusBanner>{authError}</StatusBanner> : null}
    </section>
  );
}
