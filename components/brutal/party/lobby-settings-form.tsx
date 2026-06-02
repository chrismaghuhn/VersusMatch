"use client";

import { PartyBtn } from "@/components/brutal/party/shared/PartyPrimitives";
import { PARTY_COPY } from "@/lib/party/copy";

export type LobbySettingsDraft = {
  captionDurationSeconds: number;
  voteDurationSeconds: 20 | 30 | 45;
  maxPlayers: number;
  roundCount: 3 | 5 | 7;
  rerollsPerPlayer: number;
  canvasEditorEnabled: boolean;
  roundModifiersEnabled: boolean;
  authorGuessEnabled: boolean;
};

type LobbySettingsFormProps = {
  readOnly: boolean;
  draft: LobbySettingsDraft;
  onChange: (draft: LobbySettingsDraft) => void;
  onSave?: () => void;
  saving?: boolean;
  saveError?: string | null;
  maxPlayersBlocked?: boolean;
};

const CAPTION_MIN = 30;
const CAPTION_MAX = 120;
const CAPTION_STEP = 15;

function updateDraft(
  draft: LobbySettingsDraft,
  onChange: (draft: LobbySettingsDraft) => void,
  patch: Partial<LobbySettingsDraft>
) {
  const next = { ...draft, ...patch };
  if (next.rerollsPerPlayer > next.roundCount) {
    next.rerollsPerPlayer = next.roundCount;
  }
  onChange(next);
}

export function LobbySettingsForm({
  readOnly,
  draft,
  onChange,
  onSave,
  saving = false,
  saveError = null,
  maxPlayersBlocked = false,
}: LobbySettingsFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <SettingGroup label={PARTY_COPY.lobbyCaptionTimer}>
        <PillRow>
          {[60, 90].map((seconds) => (
            <Pill
              key={seconds}
              active={draft.captionDurationSeconds === seconds}
              disabled={readOnly}
              onClick={() =>
                updateDraft(draft, onChange, {
                  captionDurationSeconds: seconds,
                })
              }
            >
              {seconds === 60 ? PARTY_COPY.lobbyCaptionPreset60 : PARTY_COPY.lobbyCaptionPreset90}
            </Pill>
          ))}
        </PillRow>
        <Stepper
          label={PARTY_COPY.lobbyCaptionCustom}
          value={`${draft.captionDurationSeconds}s`}
          disabled={readOnly}
          onDec={() =>
            updateDraft(draft, onChange, {
              captionDurationSeconds: Math.max(
                CAPTION_MIN,
                draft.captionDurationSeconds - CAPTION_STEP
              ),
            })
          }
          onInc={() =>
            updateDraft(draft, onChange, {
              captionDurationSeconds: Math.min(
                CAPTION_MAX,
                draft.captionDurationSeconds + CAPTION_STEP
              ),
            })
          }
        />
      </SettingGroup>

      <SettingGroup label={PARTY_COPY.lobbyVoteTimer}>
        <PillRow>
          {([20, 30, 45] as const).map((seconds) => (
            <Pill
              key={seconds}
              active={draft.voteDurationSeconds === seconds}
              disabled={readOnly}
              onClick={() =>
                updateDraft(draft, onChange, {
                  voteDurationSeconds: seconds,
                })
              }
            >
              {seconds === 20
                ? PARTY_COPY.lobbyVotePreset20
                : seconds === 30
                  ? PARTY_COPY.lobbyVotePreset30
                  : PARTY_COPY.lobbyVotePreset45}
            </Pill>
          ))}
        </PillRow>
      </SettingGroup>

      <SettingGroup label={PARTY_COPY.lobbyPlayersSetting}>
        <Stepper
          label="MAX"
          value={String(draft.maxPlayers)}
          disabled={readOnly}
          blockDecrement={maxPlayersBlocked}
          onDec={() =>
            updateDraft(draft, onChange, {
              maxPlayers: Math.max(2, draft.maxPlayers - 1),
            })
          }
          onInc={() =>
            updateDraft(draft, onChange, {
              maxPlayers: Math.min(8, draft.maxPlayers + 1),
            })
          }
        />
        {maxPlayersBlocked ? (
          <p className="mt-2 text-[#FFB800]" style={{ fontSize: 11, fontWeight: 700 }}>
            {PARTY_COPY.lobbyMaxPlayersBlocked}
          </p>
        ) : null}
      </SettingGroup>

      <SettingGroup label={PARTY_COPY.lobbyRoundsSetting}>
        <PillRow>
          {([3, 5, 7] as const).map((rounds) => (
            <Pill
              key={rounds}
              active={draft.roundCount === rounds}
              disabled={readOnly}
              onClick={() =>
                updateDraft(draft, onChange, {
                  roundCount: rounds,
                })
              }
            >
              {String(rounds)}
            </Pill>
          ))}
        </PillRow>
      </SettingGroup>

      <SettingGroup label={PARTY_COPY.lobbyRerollsSetting}>
        <Stepper
          label="REROLLS"
          value={String(draft.rerollsPerPlayer)}
          disabled={readOnly}
          onDec={() =>
            updateDraft(draft, onChange, {
              rerollsPerPlayer: Math.max(0, draft.rerollsPerPlayer - 1),
            })
          }
          onInc={() =>
            updateDraft(draft, onChange, {
              rerollsPerPlayer: Math.min(draft.roundCount, draft.rerollsPerPlayer + 1),
            })
          }
        />
      </SettingGroup>

      <SettingGroup label="TOGGLES">
        <ToggleRow
          label={PARTY_COPY.lobbyCanvasEditor}
          enabled={draft.canvasEditorEnabled}
          readOnly={readOnly}
          onToggle={() =>
            updateDraft(draft, onChange, {
              canvasEditorEnabled: !draft.canvasEditorEnabled,
            })
          }
        />
        <ToggleRow
          label="CHAOS ROUNDS"
          enabled={draft.roundModifiersEnabled}
          readOnly={readOnly}
          onToggle={() =>
            updateDraft(draft, onChange, {
              roundModifiersEnabled: !draft.roundModifiersEnabled,
            })
          }
        />
        <ToggleRow
          label={PARTY_COPY.authorGuessToggleLabel.toUpperCase()}
          enabled={draft.authorGuessEnabled}
          readOnly={readOnly}
          onToggle={() =>
            updateDraft(draft, onChange, {
              authorGuessEnabled: !draft.authorGuessEnabled,
            })
          }
        />
      </SettingGroup>

      {!readOnly && onSave ? (
        <div className="mt-1 space-y-2">
          <PartyBtn onClick={onSave} disabled={saving}>
            {saving ? PARTY_COPY.working : PARTY_COPY.lobbySettingsSave}
          </PartyBtn>
          {saveError ? (
            <p className="text-[#FF3B3B]" style={{ fontSize: 11, fontWeight: 700 }}>
              {saveError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SettingGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-white/60" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function PillRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2">{children}</div>;
}

function Pill({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        "flex-1 border-2 px-3 py-2 transition disabled:cursor-not-allowed disabled:opacity-50 " +
        (active
          ? "border-[#CCFF00] bg-[#CCFF00]/15 text-[#CCFF00]"
          : "border-white/10 text-white/60 hover:border-white/30 hover:text-white")
      }
      style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.1em" }}
    >
      {children}
    </button>
  );
}

function Stepper({
  label,
  value,
  disabled,
  blockDecrement = false,
  onDec,
  onInc,
}: {
  label: string;
  value: string;
  disabled: boolean;
  blockDecrement?: boolean;
  onDec: () => void;
  onInc: () => void;
}) {
  const disableDec = disabled || blockDecrement;
  return (
    <div className="flex items-center justify-between border border-white/10 bg-black px-2 py-1.5">
      <span className="text-white/50" style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em" }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disableDec}
          onClick={onDec}
          className="h-7 w-7 border border-white/20 text-white disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontWeight: 900 }}
        >
          -
        </button>
        <span className="min-w-[3.25rem] text-center font-mono text-white" style={{ fontSize: 13, fontWeight: 800 }}>
          {value}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={onInc}
          className="h-7 w-7 border border-white/20 text-white disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontWeight: 900 }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  enabled,
  readOnly,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  readOnly: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={onToggle}
      className={
        "mb-2 flex w-full items-center justify-between border px-3 py-2.5 text-left transition last:mb-0 " +
        (enabled
          ? "border-[#FF2D87] bg-[#FF2D87]/15 text-[#FF2D87]"
          : "border-white/10 text-white/60 hover:border-white/30 hover:text-white")
      }
      style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}
    >
      <span>{label}</span>
      <span>{enabled ? "ON" : "OFF"}</span>
    </button>
  );
}
