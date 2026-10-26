import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Container from '../components/ui/Container.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import { useI18n } from '../i18n/index.jsx';
import { matchIntent, MAX_QUESTION_LENGTH } from '../lib/assistantEngine.js';
import './Assistant.css';

const LINK_BY_INTENT = {
  apply: '/apply',
  routes: '/travel',
  official: '/about'
};

export default function Assistant() {
  const { t } = useI18n();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([{ id: 1, who: 'assistant', key: 'welcome' }]);
  const [nextId, setNextId] = useState(2);
  const inputRef = useRef(null);

  const suggestions = useMemo(() => [0, 1, 2, 3], []);
  function send(raw = question) {
    const value = String(raw).trim().slice(0, MAX_QUESTION_LENGTH);
    if (!value) {
      inputRef.current?.focus();
      return;
    }
    const intent = matchIntent(value);
    setMessages((old) => [...old,
      { id: nextId, who: 'user', text: value },
      { id: nextId + 1, who: 'assistant', key: `answers.${intent}`, link: LINK_BY_INTENT[intent] || null }
    ]);
    setNextId((n) => n + 2);
    setQuestion('');
  }

  return (
    <>
      <PageHeader title={t('assistant.title')} />
      <section className="section assistant-section">
        <Container>
          <div className="assistant-shell">
            <p className="assistant-lead">{t('assistant.lead')}</p>
            <div className="assistant-notice" role="note">{t('assistant.notice')}</div>
            <div className="assistant-chat" aria-label={t('assistant.chatLabel')}>
              <div className="assistant-messages" aria-live="polite">
                {messages.map((message) => (
                  <div className={`assistant-message assistant-message--${message.who}`} key={message.id}>
                    {message.who === 'user' ? message.text : (
                      <>
                        <p>{t(`assistant.${message.key}`)}</p>
                        {message.link && <Link className="assistant-inline-link" to={message.link}>{t('assistant.openPage')}</Link>}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="assistant-suggestions">
                <p className="assistant-small-label">{t('assistant.suggestionsLabel')}</p>
                {suggestions.map((index) => (
                  <button className="assistant-suggestion" type="button" key={index}
                    onClick={() => send(t(`assistant.suggestions.${index}.question`))}>
                    {t(`assistant.suggestions.${index}.label`)}
                  </button>
                ))}
              </div>
              <form className="assistant-form" onSubmit={(event) => { event.preventDefault(); send(); }}>
                <label htmlFor="assistant-question">{t('assistant.inputLabel')}</label>
                <textarea id="assistant-question" ref={inputRef} value={question}
                  onChange={(event) => setQuestion(event.target.value.slice(0, MAX_QUESTION_LENGTH))}
                  maxLength={MAX_QUESTION_LENGTH} rows={2} placeholder={t('assistant.placeholder')} />
                <div className="assistant-form-footer">
                  <span className="assistant-counter">{question.length}/{MAX_QUESTION_LENGTH}</span>
                  <Button type="submit" variant="primary">{t('assistant.send')}</Button>
                </div>
              </form>
            </div>
            <p className="assistant-footnote">{t('assistant.footerNote')}</p>
          </div>
        </Container>
      </section>
    </>
  );
}
