# Recording notes

This 31-second silent walkthrough uses real browser captures of the running static application, with the exact user-supplied `source-data/dynamic_run_history.csv`. It covers import, queue search, original decision trace, scatter navigation, exact source-row inspection, a reasoned demo correction and a real CSV download.

The UI was captured at 1280 × 860, at about 10 captures per second. The edited MP4 is 1328 × 996 at 30 fps; repeated frames preserve the capture, with chapter captions, a border and progress indicators added outside the app. The GIF is a smaller 8 fps inline preview. Idle gaps between chapters were omitted; app data and states were not fabricated. There is no audio or music. `recording.json` lists the chapters and timing; `demo-review-export.csv` is the actual 40-workflow download from the final step.

Before corrections, every workflow in this additional dynamic input is Unknown / Engineer review. The Daily correction in the recording is a deliberately marked demo override, not a cadence established from the irregular history. The original inference and reason remain in the export. The demo correction was reset after capture and is not seeded into the app.

To repeat: run the app, upload the dynamic CSV, choose Engineer review, search SLS_ORDERS, inspect the decision and Run history, select the last observed run and View row 2396. Return to Decision, choose Change frequency, select Daily, and use the reason “Demo override only. Daily cadence still needs scheduler confirmation.” Save, close, return to All, clear search and Export review. Reset the correction when finished.

`source-data/simple_run_history.csv` is a separate 29-row synthetic teaching fixture with four clear cases. It is not a cleaned or relabelled version of the user's dynamic input. Source-data hashes and provenance are in `source-data/demo-manifest.json`.
