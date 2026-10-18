# Claude Skills

Безкоштовні скіли з відкритим кодом для Claude Code та інших AI-агентів.

## 🎬 Motion Studio

**Один промпт — готове моушн-відео.** Безкоштовний скіл з відкритим кодом, який робить
з Claude Code (а також Codex, Cursor та інших агентів) моушн-дизайнера, монтажера і
звукорежисера. Без After Effects, без Premiere, без таймлайну.

🇬🇧 [English](README.md)

## Що вміє

- ✍️ **Сценарій і розкадровка** з одного промпту
- 🎞️ **Анімовані сцени**: кінетична типографіка, лічильники, списки, «до/після», набір команд у терміналі, скріншоти в рамці пристрою, справжнє **3D** (Three.js)
- 🎥 **Переходи й рухи камери**: push, whip, zoom, iris, wipe, blur · drift, orbit, tilt, pan
- 🗣️ **Озвучка**: ElevenLabs, безкоштовні нейроголоси Microsoft (edge-tts, є українська), Piper (офлайн), macOS `say`, espeak
- 💬 **Субтитри**, синхронізовані з голосом по словах, вшиті у відео, плюс файл `.srt`
- 🔊 **Саунд-дизайн**: автоматичні whoosh, pop, riser, click (синтезовані кодом, без авторських прав), музика з приглушенням під голос
- 🎚️ **Нормалізація гучності** до -14 LUFS (стандарт стрімінгів)
- 📐 **MP4 1080p** у 9:16, 16:9, 1:1, 4:5 або будь-якому розмірі

## Що потрібно (все безкоштовне)

Node.js 18+, FFmpeg, Python 3.9+. Для природних голосів: `pip install edge-tts` або ключ ElevenLabs.

## Встановлення

```bash
git clone https://github.com/BMatiashchuk99/Claude-Skills.git
cd Claude-Skills
./install.sh
```

На Windows скопіюйте `skills/motion-studio` у `%USERPROFILE%\.claude\skills\` і виконайте
в папці `scripts`: `npm install`, `npx playwright install chromium`, `pip install edge-tts`.

## Як користуватися

Просто напишіть у Claude Code:

> Зроби 30-секундне вертикальне промо для мого застосунку Plantly, що нагадує поливати рослини. Зелені кольори, озвучка українською, в кінці «Завантаж безкоштовно».

Для української вкажіть у сторіборді `"language": "uk"`, тоді голос буде `uk-UA-OstapNeural` (або `uk-UA-PolinaNeural`).

Вручну:
```bash
python3 ~/.claude/skills/motion-studio/scripts/build.py examples/launch-teaser --stills   # швидка перевірка кадрів
python3 ~/.claude/skills/motion-studio/scripts/build.py examples/launch-teaser            # готове відео в out/
```

Документація полів: [`references/storyboard.md`](skills/motion-studio/references/storyboard.md).

## Ліцензія

MIT: можна використовувати будь-де, зокрема комерційно.
