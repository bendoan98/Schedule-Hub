import SegmentedToggle from '../../components/ui/SegmentedToggle';
import StatusBanner from '../../components/ui/StatusBanner';

const TEAM_MODE_OPTIONS = [
  { value: 'create', label: 'Create Team' },
  { value: 'join', label: 'Join Team' }
];

export default function TeamSetupPanel({
  teamSetupMode,
  onTeamSetupModeChange,
  teamNameInput,
  onTeamNameChange,
  inviteCodeInput,
  onInviteCodeChange,
  onSubmit,
  authError
}) {
  return (
    <section className="panel auth-panel">
      <h3>Set Up Your Team</h3>
      <p>Create a new team (you become manager) or join an existing one with an invite code.</p>

      <form className="auth-form" onSubmit={onSubmit}>
        <SegmentedToggle
          className="auth-mode-toggle"
          ariaLabel="Team setup mode"
          options={TEAM_MODE_OPTIONS}
          value={teamSetupMode}
          onChange={onTeamSetupModeChange}
        />

        {teamSetupMode === 'create' ? (
          <label>
            Team Name
            <input
              type="text"
              value={teamNameInput}
              onChange={(event) => onTeamNameChange(event.target.value)}
              placeholder="Downtown Ops"
              required
            />
          </label>
        ) : (
          <label>
            Invite Code
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(event) => onInviteCodeChange(event.target.value.toUpperCase())}
              placeholder="ABC12345"
              required
            />
          </label>
        )}

        <button type="submit" className="primary">
          Continue
        </button>
      </form>

      {authError ? <StatusBanner>{authError}</StatusBanner> : null}
    </section>
  );
}
