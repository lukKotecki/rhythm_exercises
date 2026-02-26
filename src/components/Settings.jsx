export default function Settings({ options }) {
  return (
    <div className="page settings">
      <h2>Settings</h2>
      <p>Current configuration:</p>
      <pre>{JSON.stringify(options, null, 2)}</pre>
      <p>The panel on the left can be used to change these parameters and start
        a new exercise.</p>
    </div>
  );
}
