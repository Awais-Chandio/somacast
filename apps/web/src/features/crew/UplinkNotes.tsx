import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { MAX_NOTE_LENGTH, noteProblem } from '../../data/ground';
import type { Note } from '../../data/api';
import { capitalize } from '@somacast/core';
import { useCopy } from '../../shared/copy';
import { utc } from '../../shared/format';

type Props = {
  crewName: string;
  notes: Note[];
  onSend: (text: string) => Promise<Note>;
};

// Notes from the surgeon to the crew, delivered at the crew's next AOS. Text is shown as plain text:
// React escapes it, and nothing here renders HTML.
export function UplinkNotes({ crewName, notes, onSend }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(
    null,
  );
  // Notes sent from this screen show at once, before the next refresh brings them back from the ground.
  const [sent, setSent] = useState<Note[]>([]);
  const { words } = useCopy();
  const shown = [
    ...sent.filter(s => !notes.some(n => n.id === s.id)),
    ...notes,
  ];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = noteProblem(text);
    if (problem) return setMsg({ kind: 'error', text: problem });
    setBusy(true);
    setMsg(null);
    try {
      const note = await onSend(text);
      setSent(prev => [note, ...prev]);
      setText('');
      setMsg({
        kind: 'ok',
        text: `Note sent. The ${words.team} sees it after their next sync.`,
      });
    } catch (err) {
      setMsg({
        kind: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="notes">
      <form onSubmit={submit}>
        <label htmlFor="note">Note to {crewName}</label>
        <textarea
          id="note"
          rows={4}
          maxLength={MAX_NOTE_LENGTH}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Plain text. Decision support only: you decide, the app does not."
        />
        <div className="note-actions">
          <span className="muted small">
            {text.length.toLocaleString('en-US')} /{' '}
            {MAX_NOTE_LENGTH.toLocaleString('en-US')}
          </span>
          <button className="btn-primary" type="submit" disabled={busy}>
            <Send size={16} aria-hidden="true" /> {busy ? 'SENDING…' : 'SEND'}
          </button>
        </div>
        {msg && (
          <p
            className={msg.kind === 'error' ? 'error' : 'ok'}
            role={msg.kind === 'error' ? 'alert' : 'status'}
          >
            {msg.text}
          </p>
        )}
      </form>
      <h3>SENT NOTES ({shown.length})</h3>
      {shown.length === 0 ? (
        <p className="muted">No notes sent to this {words.team} yet.</p>
      ) : (
        <ul className="note-list">
          {shown.map(n => (
            <li key={n.id}>
              <p className="muted small">
                {n.author_name ?? capitalize(words.doctor)},{' '}
                <time dateTime={n.created_at}>{utc(n.created_at)}</time>
              </p>
              <p className="note-text">{n.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
