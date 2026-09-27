import './style.css';

interface Game {
  slug: string;
  title: string;
  description: string;
  status: string;
  controls: string[];
}

const catalog = document.querySelector<HTMLDivElement>('#catalog')!;
const count = document.querySelector<HTMLSpanElement>('#game-count')!;

async function loadCatalog() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}catalog.json`);
    if (!response.ok)
      throw new Error(`Catalog request failed: ${response.status}`);
    const games: Game[] = await response.json();
    count.textContent = `${String(games.length).padStart(2, '0')} GAMES ON THE SHELF`;
    catalog.replaceChildren();
    if (games.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML =
        '<span class="empty-number" aria-hidden="true">01</span><div><span class="pill">IN THE WORKSHOP</span><h3>The first slot is waiting.</h3><p>Our first game starts with a good idea, not a deadline.<br />The studio is set. The next move is making something great.</p></div><span class="empty-mark" aria-hidden="true">↗</span>';
      catalog.append(empty);
      return;
    }
    catalog.className = 'game-grid';
    for (const game of games) {
      const card = document.createElement('article');
      card.className = 'game-card';
      const status = document.createElement('span');
      status.className = 'pill';
      status.textContent = game.status;
      const title = document.createElement('h3');
      title.textContent = game.title;
      const description = document.createElement('p');
      description.textContent = game.description;
      const controls = document.createElement('p');
      controls.className = 'controls';
      controls.textContent = `Controls: ${game.controls.join(', ')}`;
      const play = document.createElement('a');
      play.className = 'button';
      play.href = `${import.meta.env.BASE_URL}games/${encodeURIComponent(game.slug)}/`;
      play.textContent = `Play ${game.title} ↗`;
      card.append(status, title, description, controls, play);
      catalog.append(card);
    }
  } catch {
    count.textContent = 'TEMPORARILY OFFLINE';
    catalog.textContent =
      'The game shelf could not load. Refresh the page to try again.';
  }
}

void loadCatalog();
