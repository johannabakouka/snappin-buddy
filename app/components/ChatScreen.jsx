'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useT } from '../i18n';
import { tx } from '../tx';
import { uploadChatImage } from '../image-upload';

export default function ChatScreen({ buddy, onBack, theme }) {
  const t = useT();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [user, setUser] = useState(null);
  const [buddyStatus, setBuddyStatus] = useState(buddy?.status || 'dispo');
  const [showQRReminder, setShowQRReminder] = useState(false);
  // Appui long sur un message : menu Répondre / Copier / Supprimer
  const [actionMsg, setActionMsg] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(null);
  const [forwarding, setForwarding] = useState(null);
  const [buddies, setBuddies] = useState([]);
  const [buddyReceipts, setBuddyReceipts] = useState(true);
  // Photos : envoi en cours, photo ouverte en plein écran, message d'erreur
  const [sendingImage, setSendingImage] = useState(false);
  const [fullImage, setFullImage] = useState(null);
  const [imageError, setImageError] = useState('');
  const pressTimer = useRef(null);
  const photoInputRef = useRef(null);
  const emojiInputRef = useRef(null);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);
  const darkMode = theme?.dark ?? true;

  const buddyUserId = buddy?.user_id || buddy?.id;

  const statusColor = buddyStatus === 'shoot' ? '#FFD700' : buddyStatus === 'indispo' ? '#FF4D4D' : '#2ECC71';
  const statusLabel = buddyStatus === 'shoot'
    ? (tx('On shoot', 'En shoot'))
    : buddyStatus === 'indispo'
    ? (tx('Unavailable', 'Indisponible'))
    : (tx('Available', 'Disponible'));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user && buddyUserId) {
        loadMessages(data.user.id, buddyUserId);
        subscribeToMessages(data.user.id, buddyUserId);
        loadBuddyStatus();
      }
    });
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [buddy]);

  // Marque comme lus les messages reçus de cette personne
  async function markRead(buddyId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ buddyId }),
      });
    } catch (e) {
      console.error('mark-read', e);
    }
  }

  async function loadBuddyStatus() {
    if (!buddyUserId) return;
    const { data } = await supabase.from('profiles').select('status, read_receipts').eq('user_id', buddyUserId).single();
    if (data?.status) setBuddyStatus(data.status);
    setBuddyReceipts(data?.read_receipts !== false);
  }

  async function loadMessages(myId, buddyId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${buddyId}),and(sender_id.eq.${buddyId},receiver_id.eq.${myId})`)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data);
      if (data.some(m => m.sender_id === buddyId && m.read === false)) markRead(buddyId);
      if (data.length === 1 && (data[0].content.includes('Collab acceptée') || data[0].content.includes('Collab accepted') || data[0].content.includes('Créons'))) {
        setShowQRReminder(true);
      }
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  function subscribeToMessages(myId, buddyId) {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    const channel = supabase.channel('chat-' + myId + '-' + buddyId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, payload => {
        const msg = payload.new;
        if (
          (msg.sender_id === myId && msg.receiver_id === buddyId) ||
          (msg.sender_id === buddyId && msg.receiver_id === myId)
        ) {
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Message reçu pendant que la conversation est ouverte : il est lu
          if (msg.sender_id === buddyId) markRead(buddyId);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      }, payload => {
        const msg = payload.new;
        if (
          (msg.sender_id === myId && msg.receiver_id === buddyId) ||
          (msg.sender_id === buddyId && msg.receiver_id === myId)
        ) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
        }
      })
      .subscribe();
    channelRef.current = channel;
  }

  async function sendMessage() {
    if (!text.trim() || !user || !buddyUserId) return;
    const content = text.trim();
    setText('');
    const payload = { sender_id: user.id, receiver_id: buddyUserId, content };
    if (replyTo?.id) payload.reply_to = replyTo.id;
    setReplyTo(null);
    const { error } = await supabase.from('messages').insert(payload);
    if (!error) notifyByEmail();
  }

  // Envoi d'une photo. Le texte tapé, s'il y en a, part en légende avec la photo.
  async function sendImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';                 // permet de renvoyer deux fois la même photo
    if (!file || !user || !buddyUserId) return;

    setImageError('');
    setSendingImage(true);
    try {
      const imageUrl = await uploadChatImage(file, user.id);
      const caption = text.trim();
      setText('');
      const payload = { sender_id: user.id, receiver_id: buddyUserId, content: caption, image_url: imageUrl };
      if (replyTo?.id) payload.reply_to = replyTo.id;
      setReplyTo(null);
      const { error } = await supabase.from('messages').insert(payload);
      if (error) throw error;
      notifyByEmail();
    } catch (err) {
      console.error('sendImage', err);
      setImageError(tx("Couldn't send the photo. Try again.", "Envoi de la photo impossible. Réessaie."));
    }
    setSendingImage(false);
  }

  // Prévient la personne par email, seulement si elle n'a pas déjà un message non lu de notre part
  async function notifyByEmail() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ type: 'new_message', toUserId: buddyUserId }),
      });
    } catch (e) {
      console.error('Email error:', e);
    }
  }

  function startPress(m) {
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setActionMsg(m), 450);
  }
  function cancelPress() {
    clearTimeout(pressTimer.current);
  }

  async function copyMessage(m) {
    try {
      await navigator.clipboard.writeText(m.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('copy', e);
    }
    setActionMsg(null);
  }

  async function messageAction(payload) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/message-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('message-action', e);
    }
  }

  function react(m, emoji) {
    setActionMsg(null);
    setMessages(prev => prev.map(x => {
      if (x.id !== m.id) return x;
      const current = x.reactions || {};
      const next = {};
      for (const [key, users] of Object.entries(current)) {
        const kept = (users || []).filter(id => id !== user?.id);
        if (kept.length) next[key] = kept;
      }
      const already = (current[emoji] || []).includes(user?.id);
      if (!already) next[emoji] = [...(next[emoji] || []), user?.id];
      return { ...x, reactions: next };
    }));
    messageAction({ action: 'react', messageId: m.id, emoji });
  }

  function togglePin(m) {
    setActionMsg(null);
    const pin = !m.pinned;
    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, pinned: pin } : (pin ? { ...x, pinned: false } : x)));
    messageAction({ action: pin ? 'pin' : 'unpin', messageId: m.id });
  }

  function saveEdit() {
    const content = text.trim();
    if (!content || !editing) return;
    setMessages(prev => prev.map(x => x.id === editing.id ? { ...x, content, edited_at: new Date().toISOString() } : x));
    messageAction({ action: 'edit', messageId: editing.id, content });
    setEditing(null);
    setText('');
  }

  // Transfert : la liste des buddies (collabs acceptées), sans citer l'auteur du message
  async function openForward(m) {
    setActionMsg(null);
    setForwarding(m);
    if (!user) return;
    const { data: collabs } = await supabase.from('collabs')
      .select('sender_id, receiver_id, status')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'accepted');
    const ids = [...new Set((collabs || []).map(c => c.sender_id === user.id ? c.receiver_id : c.sender_id))];
    if (!ids.length) { setBuddies([]); return; }
    const { data: profiles } = await supabase.from('profiles')
      .select('user_id, username, avatar_url, role').in('user_id', ids);
    setBuddies(profiles || []);
  }

  async function forwardTo(profile) {
    if (!forwarding || !user) return;
    const content = forwarding.content;
    setForwarding(null);
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: profile.user_id,
      content,
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function deleteMessage(m) {
    setActionMsg(null);
    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, deleted: true, content: '' } : x));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/delete-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messageId: m.id }),
      });
    } catch (e) {
      console.error('delete-message', e);
    }
  }

  const bg = darkMode ? '#0A0A0A' : '#F5F5F5';
  const color = darkMode ? 'white' : '#111';
  const subText = darkMode ? '#666' : '#888';
  const inputBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const inputBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const border = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const avatarBg = darkMode ? '#2C2C2C' : '#CCC';
  const pinnedMsg = messages.find(m => m.pinned);
  const reactionList = (m) => Object.entries(m.reactions || {}).filter(([, users]) => (users || []).length > 0);
  const sheetBtn = {
    width: '100%', padding: '16px 24px', background: 'none', border: 'none',
    textAlign: 'left', fontSize: '15px', fontWeight: '700', color, cursor: 'pointer',
  };

  return (
    <div style={{ height: '100dvh', maxHeight: '100dvh', display: 'flex', flexDirection: 'column', background: bg, color }}>

      <div style={{ padding: `calc(env(safe-area-inset-top) + 16px) 16px 16px`, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color, fontSize: '20px', cursor: 'pointer' }}>←</button>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: avatarBg, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: `2px solid ${statusColor}` }}>
          {buddy?.avatar_url ? <img src={buddy.avatar_url} alt={buddy.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color }}>{buddy?.username}</div>
          <div style={{ color: statusColor, fontSize: '11px', fontWeight: '600' }}>
            ● {statusLabel}
          </div>
        </div>
      </div>

      {pinnedMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: `1px solid ${border}`, background: inputBg }}>
          <span style={{ fontSize: '14px' }}>📌</span>
          <div style={{ flex: 1, minWidth: 0, fontSize: '12px', color: subText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pinnedMsg.deleted
              ? tx('Message deleted', 'Message supprimé')
              : (pinnedMsg.content || (pinnedMsg.image_url ? tx('📷 Photo', '📷 Photo') : ''))}
          </div>
          <button onClick={() => togglePin(pinnedMsg)} style={{ background: 'none', border: 'none', color: subText, fontSize: '14px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {showQRReminder && (
          <div style={{
            background: darkMode ? 'rgba(255,154,61,0.08)' : 'rgba(255,154,61,0.1)',
            border: '1px solid rgba(255,154,61,0.3)',
            borderRadius: '14px', padding: '12px 14px', marginBottom: '8px', position: 'relative',
          }}>
            <button onClick={() => setShowQRReminder(false)} style={{ position: 'absolute', top: '8px', right: '10px', background: 'none', border: 'none', color: subText, fontSize: '14px', cursor: 'pointer' }}>✕</button>
            <p style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255,154,61,0.9)', marginBottom: '4px' }}>
              🔒 {tx('Before you meet', 'Avant de vous retrouver')}
            </p>
            <p style={{ fontSize: '12px', color: subText, lineHeight: 1.5 }}>
              {tx('Remember to generate and scan your QR codes in the tab', 'Pensez à générer et scanner vos QR codes dans l’onglet')} <strong style={{ color }}>Match → 🤝</strong> !
            </p>
          </div>
        )}

        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>🎨</p>
            <p style={{ color: subText, fontSize: '14px', lineHeight: 1.6 }}>
              {tx("It all starts here... let's create something beautiful!", 'Tout commence ici... créez quelque chose de beau !')}
            </p>
          </div>
        )}

        {messages.map(m => {
          const isMe = m.sender_id === user?.id;
          // Attention : un message photo peut n'avoir aucun texte, d'où le (m.content || '').
          const body = m.content || '';
          const isSystem = !m.image_url && (body.includes('Collab acceptée') || body.includes('Collab accepted') || body.includes('Créons'));
          if (isSystem) return (
            <div key={m.id} style={{ textAlign: 'center', margin: '8px 0' }}>
              <span style={{ fontSize: '12px', color: '#2ECC71', background: darkMode ? 'rgba(46,204,113,0.08)' : 'rgba(46,204,113,0.1)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(46,204,113,0.2)' }}>
                {m.content}
              </span>
            </div>
          );
          const quoted = m.reply_to ? messages.find(x => x.id === m.reply_to) : null;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div
                onTouchStart={() => startPress(m)}
                onTouchEnd={cancelPress}
                onTouchMove={cancelPress}
                onMouseDown={() => startPress(m)}
                onMouseUp={cancelPress}
                onMouseLeave={cancelPress}
                onContextMenu={e => { e.preventDefault(); setActionMsg(m); }}
                style={{
                  maxWidth: '75%', padding: '10px 14px', borderRadius: '18px',
                  borderBottomRightRadius: isMe ? '4px' : '18px',
                  borderBottomLeftRadius: isMe ? '18px' : '4px',
                  background: isMe ? (darkMode ? 'white' : '#111') : (darkMode ? '#1A1A1A' : '#E0E0E0'),
                  color: isMe ? (darkMode ? 'black' : 'white') : color,
                  fontSize: '14px', lineHeight: 1.4,
                  cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
                }}
              >
                {quoted && (
                  <div style={{
                    borderLeft: `3px solid ${isMe ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.3)'}`,
                    paddingLeft: '8px', marginBottom: '6px', fontSize: '12px', opacity: 0.7,
                    maxHeight: '38px', overflow: 'hidden',
                  }}>
                    <b>{quoted.sender_id === user?.id ? tx('You', 'Toi') : buddy?.username}</b><br />
                    {quoted.deleted
                      ? tx('Message deleted', 'Message supprimé')
                      : (quoted.content || '').slice(0, 90) || (quoted.image_url ? tx('📷 Photo', '📷 Photo') : '')}
                  </div>
                )}
                {!m.deleted && m.image_url && (
                  <img
                    src={m.image_url}
                    alt={tx('Shared photo', 'Photo partagée')}
                    onClick={() => setFullImage(m.image_url)}
                    style={{
                      display: 'block', maxWidth: '100%', width: '220px',
                      borderRadius: '12px', marginBottom: body ? '8px' : '0',
                      cursor: 'zoom-in', background: darkMode ? '#222' : '#ccc',
                    }}
                  />
                )}
                {m.deleted
                  ? <i style={{ opacity: 0.55 }}>{tx('Message deleted', 'Message supprimé')}</i>
                  : body}
                {(m.edited_at || (isMe && !m.deleted) || m.pinned) && (
                  <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '4px', textAlign: 'right' }}>
                    {m.pinned && '📌 '}
                    {m.edited_at && `${tx('edited', 'modifié')} `}
                    {isMe && !m.deleted && (m.read && buddyReceipts ? '✓✓' : '✓')}
                  </div>
                )}
                {reactionList(m).length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {reactionList(m).map(([emoji, users]) => (
                      <span key={emoji} style={{
                        fontSize: '12px', padding: '2px 7px', borderRadius: '12px',
                        background: isMe ? 'rgba(0,0,0,0.12)' : (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                      }}>
                        {emoji}{users.length > 1 ? ` ${users.length}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {editing && (
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${border}`, display: 'flex', gap: '10px', alignItems: 'center', background: inputBg }}>
          <div style={{ flex: 1, fontSize: '12px', color: subText }}>
            ✏️ {tx('Editing your message', 'Modification de ton message')}
          </div>
          <button onClick={() => { setEditing(null); setText(''); }} style={{ background: 'none', border: 'none', color: subText, fontSize: '16px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {replyTo && (
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${border}`, display: 'flex', gap: '10px', alignItems: 'center', background: inputBg }}>
          <div style={{ flex: 1, borderLeft: `3px solid ${color}`, paddingLeft: '10px', fontSize: '12px', color: subText, overflow: 'hidden' }}>
            <b style={{ color }}>{tx('Replying to', 'Réponse à')} {replyTo.sender_id === user?.id ? tx('you', 'toi') : buddy?.username}</b><br />
            {(replyTo.content || '').slice(0, 80)}
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: subText, fontSize: '16px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {imageError && (
        <div style={{ padding: '8px 16px', fontSize: '12px', color: '#FF4D4D', background: inputBg, borderTop: `1px solid ${border}` }}>
          {imageError}
        </div>
      )}

      <div style={{ padding: '12px 16px calc(90px + env(safe-area-inset-bottom))', borderTop: `1px solid ${border}`, display: 'flex', gap: '10px', alignItems: 'center' }}>
        {/* Le sélecteur natif déclenche lui-même la demande d'accès aux photos du téléphone. */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={sendImage}
          style={{ display: 'none' }}
        />
        {!editing && (
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={sendingImage}
            aria-label={tx('Send a photo', 'Envoyer une photo')}
            style={{
              width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
              background: inputBg, border: `1px solid ${inputBorder}`, color,
              fontSize: '18px', cursor: sendingImage ? 'default' : 'pointer', opacity: sendingImage ? 0.5 : 1,
            }}
          >
            {sendingImage ? '…' : '📷'}
          </button>
        )}
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (editing ? saveEdit() : sendMessage())}
          onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ block: 'end' }), 300)}
          placeholder={tx('Message...', 'Message...')}
          style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: `1px solid ${inputBorder}`, background: inputBg, color, fontSize: '14px', outline: 'none' }}
        />
        <button onClick={() => (editing ? saveEdit() : sendMessage())} style={{ width: '42px', height: '42px', borderRadius: '50%', background: text.trim() ? color : (darkMode ? '#333' : '#CCC'), border: 'none', fontSize: '18px', cursor: 'pointer', color: bg, flexShrink: 0, transition: 'background 0.2s' }}>↑</button>
      </div>

      {fullImage && (
        <div
          onClick={() => setFullImage(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.94)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'calc(env(safe-area-inset-top) + 50px) 16px calc(env(safe-area-inset-bottom) + 70px)',
          }}
        >
          <img
            src={fullImage}
            alt={tx('Shared photo', 'Photo partagée')}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
          />
          <button
            onClick={() => setFullImage(null)}
            aria-label={tx('Close', 'Fermer')}
            style={{
              position: 'absolute', top: 'calc(env(safe-area-inset-top) + 12px)', right: '16px',
              width: '36px', height: '36px', borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '18px', cursor: 'pointer',
            }}
          >
            ✕
          </button>
          {/* Ouvrir dans un onglet : c'est de là qu'on enregistre la photo sur le téléphone. */}
          <a
            href={fullImage}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 20px)', left: '50%',
              transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: '22px',
              background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '13px',
              fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            {tx('Open to save', 'Ouvrir pour enregistrer')}
          </a>
        </div>
      )}

      {copied && (
        <div style={{ position: 'fixed', bottom: '160px', left: '50%', transform: 'translateX(-50%)', zIndex: 3000,
          background: darkMode ? 'white' : '#111', color: darkMode ? '#111' : 'white',
          padding: '10px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
          {tx('Copied ✓', 'Copié ✓')}
        </div>
      )}

      {forwarding && (
        <div onClick={() => setForwarding(null)} style={{ position: 'fixed', inset: 0, zIndex: 2900, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: '390px', maxHeight: '70vh', overflowY: 'auto',
            background: darkMode ? '#1A1A1A' : '#FFFFFF',
            borderTopLeftRadius: '22px', borderTopRightRadius: '22px',
            padding: '10px 0 calc(24px + env(safe-area-inset-bottom))',
          }}>
            <div style={{ width: '44px', height: '4px', borderRadius: '99px', background: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', margin: '6px auto 12px' }} />
            <p style={{ padding: '0 24px 12px', fontSize: '15px', fontWeight: '800', color }}>
              ↗️ {tx('Forward to', 'Transférer à')}
            </p>
            {buddies.length === 0 && (
              <p style={{ padding: '0 24px 16px', fontSize: '13px', color: subText, lineHeight: 1.5 }}>
                {tx('No buddies to forward to yet.', 'Pas encore de buddy à qui transférer.')}
              </p>
            )}
            {buddies.map(p => (
              <button key={p.user_id} onClick={() => forwardTo(p)} style={{ ...sheetBtn, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '34px', height: '34px', borderRadius: '50%', background: avatarBg, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                  {p.avatar_url ? <img src={p.avatar_url} alt={p.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '◉'}
                </span>
                {p.username}
              </button>
            ))}
            <button onClick={() => setForwarding(null)} style={{ ...sheetBtn, color: subText, fontWeight: '600' }}>
              {tx('Cancel', 'Annuler')}
            </button>
          </div>
        </div>
      )}

      {actionMsg && (
        <div
          onClick={() => setActionMsg(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 2800, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '390px', background: darkMode ? '#1A1A1A' : '#FFFFFF',
              borderTopLeftRadius: '22px', borderTopRightRadius: '22px', padding: '10px 0 calc(24px + env(safe-area-inset-bottom))' }}
          >
            <div style={{ width: '44px', height: '4px', borderRadius: '99px', background: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', margin: '6px auto 12px' }} />

            {!actionMsg.deleted && (
              <div style={{ display: 'flex', gap: '6px', padding: '4px 14px 14px', alignItems: 'center', justifyContent: 'space-between' }}>
                {['❤️', '😂', '🔥', '👍', '✨', '😮'].map(e => (
                  <button key={e} onClick={() => react(actionMsg, e)} style={{
                    flex: 1, fontSize: '24px', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer',
                  }}>{e}</button>
                ))}
                <button
                  onClick={() => emojiInputRef.current?.focus()}
                  style={{ flex: 1, fontSize: '20px', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', color: subText }}
                >➕</button>
                <input
                  ref={emojiInputRef}
                  value=""
                  onChange={e => {
                    const emoji = [...e.target.value][0];
                    if (emoji) react(actionMsg, emoji);
                  }}
                  style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }}
                  aria-label={tx('Pick an emoji', 'Choisir un emoji')}
                />
              </div>
            )}

            {!actionMsg.deleted && (
              <>
                <button onClick={() => { setReplyTo(actionMsg); setActionMsg(null); }} style={sheetBtn}>
                  ↩️ {tx('Reply', 'Répondre')}
                </button>
                <button onClick={() => copyMessage(actionMsg)} style={sheetBtn}>
                  📋 {tx('Copy text', 'Copier le texte')}
                </button>
                <button onClick={() => openForward(actionMsg)} style={sheetBtn}>
                  ↗️ {tx('Forward', 'Transférer')}
                </button>
                <button onClick={() => togglePin(actionMsg)} style={sheetBtn}>
                  📌 {actionMsg.pinned ? tx('Unpin', 'Désépingler') : tx('Pin', 'Épingler')}
                </button>
              </>
            )}

            {actionMsg.sender_id === user?.id && !actionMsg.deleted && (
              <button onClick={() => { setEditing(actionMsg); setText(actionMsg.content || ''); setActionMsg(null); }} style={sheetBtn}>
                ✏️ {tx('Edit', 'Modifier')}
              </button>
            )}
            {actionMsg.sender_id === user?.id && !actionMsg.deleted && (
              <button onClick={() => deleteMessage(actionMsg)} style={{ ...sheetBtn, color: '#FF4D4D' }}>
                🗑 {tx('Delete', 'Supprimer')}
              </button>
            )}
            <button onClick={() => setActionMsg(null)} style={{ ...sheetBtn, color: subText, fontWeight: '600' }}>
              {tx('Cancel', 'Annuler')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
