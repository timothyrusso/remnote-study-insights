import { renderWidget, usePlugin, useTrackerPlugin } from '@remnote/plugin-sdk';
import { useState } from 'react';
import { collectSnapshot, SNAPSHOT_KEY } from '../collect';

function Insights() {
  const plugin = usePlugin();
  const snapshot = useTrackerPlugin(p => p.storage.getSession<any>(SNAPSHOT_KEY), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function refresh() {
    setBusy(true); setError('');
    try { await collectSnapshot(plugin); }
    catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }
  return <main style={{ padding: 16, fontFamily: 'system-ui', lineHeight: 1.5 }}>
    <h1>Study Insights</h1>
    <p>Read-only diagnostics · no cards or schedules modified.</p>
    <button onClick={refresh} disabled={busy}>{busy ? 'Reading histories…' : 'Refresh diagnostics'}</button>
    {error && <p role="alert">{error}</p>}
    {!snapshot && <p>Waiting for the first snapshot. Use Refresh to retry.</p>}
    {snapshot && <>
      <p>Retrieved: {snapshot.collectedAt}</p>
      <p>{snapshot.bridgeStatus}</p>
      <h2>History coverage</h2>
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(snapshot.summary, null, 2)}</pre>
      <h2>Interpretation limits</h2>
      <ul>{snapshot.caveats.map((text: string) => <li key={text}>{text}</li>)}</ul>
      <details><summary>Underlying Rem sample (up to 20 cards)</summary>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(snapshot.sample, null, 2)}</pre>
      </details>
    </>}
  </main>;
}

renderWidget(Insights);
