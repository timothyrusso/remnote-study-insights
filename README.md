# RemNote Study Insights

Personal read-only diagnostic plugin based on RemNote's official React template.
It reads card histories without changing notes, ratings, or scheduling.

## Run locally

```sh
npm ci
npm start
```

In RemNote Desktop: **Settings → Plugins → Build → Develop from localhost**.
Enter `http://127.0.0.1:8080`. Open the **Study Insights** right-sidebar tab.
The plugin collects once at startup; **Refresh diagnostics** or the omnibar's
**Refresh Study Insights** command collects again. No automatic queue listeners
are installed yet: this first experiment validates the persisted history API.

`npm start` starts a loopback-only development server (8080) and authenticated
snapshot receiver (7789). The receiver generates a fresh random token per run,
injected into the local development bundle. It is independent of the official
RemNote MCP token. Do not publish this running development bundle: it contains
the temporary local bridge credential. Production builds contain no credential.

Snapshots are saved outside this repository at:

`~/.local/share/remnote-study-insights/latest-snapshot.json`

This file includes all accessible cards' raw histories and up to 20 underlying
Rem text samples. It remains on the Mac; no remote service or model is called
by this plugin. An assistant with filesystem access can inspect it on request.
No patient data, study records, tokens, or generated snapshots belong in Git.
Both local processes and RemNote must be running to refresh the snapshot.

## Diagnostic limitations

- Scope: currently open knowledge base, SDK-returned cards, not proven complete.
- Deleted cards and prior versions of question text may be absent.
- Forward, backward and cloze variants retain separate card identifiers.
- Cram attempts and administrative/unknown scores are separated from recall.
- Missing `isCram` is not proof a review was scheduled practice.
- Seconds/milliseconds are inferred only for ISO display; raw values are retained.
- Response time units, sync coverage, disabled status and history completeness need live checks.
- Sample text is the underlying Rem, not a rendered prompt/answer; nested answers,
  references, backward direction and cloze rendering require contextual inspection.
- Due timestamps alone do not prove a card is enabled and present in the queue.
- No FSRS internals or scheduler changes are attempted.

## Verification

```sh
npm run check-types
npm test
npm run build
```

Live acceptance: load the plugin, compare several visible review histories
against RemNote's card details, confirm ratings and timestamp units, then verify
the snapshot's retrieval timestamp. No live-data claims are made before this.

## Sources

- https://plugins.remnote.com/getting-started/quick_start_guide
- https://plugins.remnote.com/advanced/permissions
- https://plugins.remnote.com/advanced/backend_plugins
- https://github.com/remnoteio/remnote-plugin-template-react

MIT licensed; the original template's license is retained.
