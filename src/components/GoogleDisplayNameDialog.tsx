interface GoogleDisplayNameDialogProps {
  isOpen: boolean;
  email: string;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onSave: () => void;
  saveDisabled?: boolean;
}

export function GoogleDisplayNameDialog({
  isOpen,
  email,
  displayName,
  onDisplayNameChange,
  onSave,
  saveDisabled
}: GoogleDisplayNameDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" role="dialog" aria-modal="true">
        <h2>Choose Display Name</h2>
        <p className="modal-support">
          Signed in as <strong>{email}</strong>. This display name is visible to other users
          when they browse games and predictions, and it cannot currently be changed.
        </p>
        <p className="modal-support">
          Enter a unique display name to continue.
        </p>
        <label>
          Display name
          <input
            autoFocus
            value={displayName}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSave();
              }
            }}
          />
        </label>
        <div className="modal-actions">
          <button
            className="modal-create"
            onClick={onSave}
            disabled={saveDisabled ?? !displayName.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
