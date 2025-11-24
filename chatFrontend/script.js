const chatFeed = document.getElementById('chatFeed');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const themeToggle = document.getElementById('themeToggle');
const typingIndicator = document.getElementById('typingIndicator');

const sampleReplies = [
  "Neurons firing... here's a thought: creativity loves bold colors.",
  'Imagine this UI powering your next idea. Want to plug in APIs next?',
  'Glitches make good stories. Luckily this interface is smooth.',
  'Tip: Press Enter to send and Shift+Enter for line breaks.',
  'Neon dreams always start with a single spark. Keep typing.',
  'Bootstrapping fresh ideas... have any wild prompts for me?',
  'Flux channel stable. Ready when you are.'
];

let replyTimeout;

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light');
});

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  appendMessage(text, 'user');
  messageInput.value = '';
  messageInput.focus();

  queueAiReply();
});

messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

function queueAiReply() {
  clearTimeout(replyTimeout);
  showTypingIndicator();
  const reply = choice(sampleReplies);
  replyTimeout = setTimeout(() => {
    hideTypingIndicator();
    appendMessage(reply, 'ai', { animate: true });
  }, 800 + Math.random() * 900);
}

function appendMessage(content, type, options = {}) {
  const { animate = false } = options;
  const message = document.createElement('div');
  message.className = `message ${type}`;
  const meta = document.createElement('div');
  meta.className = 'meta';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = type === 'ai' ? 'AI' : 'You';
  const time = document.createElement('span');
  time.className = 'time';
  time.textContent = timeStamp();
  meta.append(label, time);

  const paragraph = document.createElement('p');
  if (type === 'ai' && animate) {
    typeText(paragraph, content);
  } else {
    paragraph.textContent = content;
  }

  message.append(meta, paragraph);
  chatFeed.appendChild(message);
  requestAnimationFrame(() => {
    message.classList.add('message-enter');
  });
  chatFeed.scrollTo({ top: chatFeed.scrollHeight, behavior: 'smooth' });
}

function timeStamp() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function typeText(node, text) {
  const characters = [...text];
  node.textContent = '';
  let index = 0;

  const typeNext = () => {
    if (index >= characters.length) return;
    node.textContent += characters[index];
    index += 1;
    chatFeed.scrollTop = chatFeed.scrollHeight;
    const delay = characters[index - 1] === ' ' ? 12 : 28 + Math.random() * 12;
    setTimeout(typeNext, delay);
  };

  typeNext();
}

function showTypingIndicator() {
  typingIndicator.classList.remove('hidden');
}

function hideTypingIndicator() {
  typingIndicator.classList.add('hidden');
}

