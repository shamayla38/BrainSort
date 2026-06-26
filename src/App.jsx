const { useState } = React;

function App() {
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      text: "Hi, I'm BrainSort. Dump whatever is on your mind.",
      sender: 'assistant',
    },
  ]);
  const [draft, setDraft] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    const trimmedDraft = draft.trim();
    if (!trimmedDraft) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: crypto.randomUUID(),
        text: trimmedDraft,
        sender: 'user',
      },
    ]);
    setDraft('');
  }

  return (
    <main className="app-shell">
      <section className="chat-card" aria-label="BrainSort chat prototype">
        <header className="chat-header">
          <div>
            <p className="eyebrow">BrainSort</p>
            <h1>Brain dump</h1>
          </div>
          <span className="status-pill">Prototype</span>
        </header>

        <div className="messages" aria-live="polite">
          {messages.map((message) => (
            <article
              className={`message message--${message.sender}`}
              key={message.id}
            >
              {message.text}
            </article>
          ))}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="brain-dump-input">
            Type your thoughts
          </label>
          <input
            id="brain-dump-input"
            type="text"
            placeholder="Type what's on your mind..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit">Send</button>
        </form>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);