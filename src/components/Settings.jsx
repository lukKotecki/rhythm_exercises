export default function Settings({ t, options }) {
  return (
    <div className="page settings">
      <h2>{t.pages.settingsTitle}</h2>
      <p>{t.pages.settingsCurrentConfiguration}</p>
      <pre>{JSON.stringify(options, null, 2)}</pre>
      <p>{t.pages.settingsHint}</p>
    </div>
  );
}
