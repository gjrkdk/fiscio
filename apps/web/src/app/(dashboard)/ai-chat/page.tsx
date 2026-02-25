"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  role: "user" | "assistant";
  content: string;
  engine?: "perplexity" | "openai";
  laden?: boolean;
};

const SUGGESTIES = [
  "Hoeveel belasting moet ik dit jaar betalen?",
  "Hoeveel moet ik maandelijks reserveren?",
  "Wat verandert er in 2025 voor ZZP'ers?",
  "Kom ik in aanmerking voor de zelfstandigenaftrek?",
  "Wat kan ik doen om minder belasting te betalen?",
  "Is een BV interessant voor mij?",
];

function EngineLabel({ engine }: { engine?: "perplexity" | "openai" }) {
  if (!engine) return null;
  const isPerplexity = engine === "perplexity";
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '2rem', fontWeight: 600,
      background: isPerplexity ? 'oklch(0.94 0.04 290)' : 'oklch(0.94 0.04 255)',
      color: isPerplexity ? 'oklch(0.38 0.18 290)' : 'oklch(0.38 0.18 255)',
    }}>
      {isPerplexity ? "🔍 Perplexity — actuele wetgeving" : "🧠 GPT-4o — persoonlijk advies"}
    </span>
  );
}

function Bericht({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '0.875rem', flexShrink: 0,
        background: isUser ? 'oklch(0.52 0.21 255)' : 'oklch(0.94 0.005 255)',
        color: isUser ? 'white' : 'oklch(0.40 0.02 255)',
      }}>
        {isUser ? "👤" : "🤖"}
      </div>
      <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {!isUser && msg.engine && <EngineLabel engine={msg.engine} />}
        <div style={{
          borderRadius: '1rem',
          borderTopRightRadius: isUser ? '0.25rem' : '1rem',
          borderTopLeftRadius: isUser ? '1rem' : '0.25rem',
          padding: '0.75rem 1rem',
          fontSize: '0.875rem', lineHeight: 1.6,
          background: isUser ? 'oklch(0.52 0.21 255)' : 'white',
          color: isUser ? 'white' : 'oklch(0.20 0.02 255)',
          border: isUser ? 'none' : '1px solid oklch(0.91 0.01 255)',
          boxShadow: '0 1px 3px oklch(0 0 0 / 0.06)',
        }}>
          {msg.laden ? (
            <span style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', height: 20 }}>
              {[0, 150, 300].map(delay => (
                <span key={delay} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'oklch(0.65 0.01 255)',
                  animation: 'bounce 1s infinite',
                  animationDelay: `${delay}ms`,
                }} />
              ))}
            </span>
          ) : (
            <span
              style={{ whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{
                __html: msg.content
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="text-decoration:underline">$1</a>')
                  .replace(/^#{1,3} (.+)/gm, "<strong>$1</strong>")
                  .replace(/^- (.+)/gm, "• $1"),
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function AIChatPage() {
  const [berichten, setBerichten] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hallo! Ik ben Fiscio AI — jouw persoonlijke belastingadviseur. Ik ken jouw financiële data en kan vragen beantwoorden over jouw specifieke situatie én over actuele belastingregels.\n\nWaar kan ik je mee helpen?",
      engine: "openai",
    },
  ]);
  const [invoer, setInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const onderRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    onderRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [berichten]);

  async function stuurBericht(tekst?: string) {
    const vraag = (tekst ?? invoer).trim();
    if (!vraag || bezig) return;
    setInvoer("");
    setBezig(true);
    const userMsg: Message = { role: "user", content: vraag };
    const loadMsg: Message = { role: "assistant", content: "", laden: true };
    setBerichten(prev => [...prev, userMsg, loadMsg]);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Niet ingelogd");

      const history = berichten.filter(b => !b.laden).map(b => ({ role: b.role, content: b.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: vraag, history }),
      });

      if (!res.body) throw new Error("Geen response");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let antwoord = "";
      let engine: "perplexity" | "openai" = "openai";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const json = JSON.parse(data);
            if (json.engine) engine = json.engine;
            if (json.token) {
              antwoord += json.token;
              setBerichten(prev => {
                const nieuw = [...prev];
                nieuw[nieuw.length - 1] = { role: "assistant", content: antwoord, engine, laden: false };
                return nieuw;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setBerichten(prev => {
        const nieuw = [...prev];
        nieuw[nieuw.length - 1] = { role: "assistant", content: "Er ging iets mis. Probeer het opnieuw.", laden: false };
        return nieuw;
      });
    } finally {
      setBezig(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); stuurBericht(); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', maxWidth: 780, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid oklch(0.91 0.01 255)', padding: '0.875rem 1.25rem', background: 'white', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', margin: 0 }}>Fiscio AI — Belastingadviseur</h1>
        <p style={{ fontSize: '0.775rem', color: 'oklch(0.55 0.015 255)', marginTop: '0.125rem' }}>
          Persoonlijk advies via GPT-4o · Actuele wetgeving via Perplexity Sonar Pro
        </p>
      </div>

      {/* Berichten */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'oklch(0.98 0.003 255)' }}>
        {berichten.map((msg, i) => <Bericht key={i} msg={msg} />)}
        <div ref={onderRef} />
      </div>

      {/* Suggesties */}
      {berichten.length <= 1 && (
        <div style={{ padding: '0.75rem 1.25rem', background: 'oklch(0.98 0.003 255)', borderTop: '1px solid oklch(0.94 0.005 255)', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {SUGGESTIES.map(s => (
              <button key={s} onClick={() => stuurBericht(s)} style={{
                fontSize: '0.775rem', background: 'white', border: '1px solid oklch(0.91 0.01 255)',
                borderRadius: '2rem', padding: '0.375rem 0.875rem', color: 'oklch(0.40 0.02 255)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ borderTop: '1px solid oklch(0.91 0.01 255)', background: 'white', padding: '0.875rem 1.25rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={invoer}
            onChange={e => setInvoer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stel een vraag over jouw belastingen..."
            rows={1}
            style={{
              flex: 1, resize: 'none', border: '1.5px solid oklch(0.88 0.01 255)', borderRadius: '0.75rem',
              padding: '0.625rem 1rem', fontSize: '0.875rem', outline: 'none', maxHeight: 120,
              fontFamily: 'inherit', color: 'oklch(0.20 0.02 255)', background: 'oklch(0.99 0.003 255)',
            }}
            disabled={bezig}
          />
          <button
            onClick={() => stuurBericht()}
            disabled={!invoer.trim() || bezig}
            style={{
              background: 'oklch(0.52 0.21 255)', color: 'white', border: 'none',
              borderRadius: '0.75rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem',
              fontWeight: 700, cursor: invoer.trim() && !bezig ? 'pointer' : 'not-allowed',
              opacity: !invoer.trim() || bezig ? 0.4 : 1, flexShrink: 0, fontFamily: 'inherit',
            }}
          >
            {bezig ? "..." : "Stuur →"}
          </button>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'oklch(0.65 0.01 255)', textAlign: 'center', marginTop: '0.5rem' }}>
          Indicatief advies — geen vervanging voor een officiële belastingadviseur
        </p>
      </div>
    </div>
  );
}
