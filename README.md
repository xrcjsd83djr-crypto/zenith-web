# Zenith Bot Website

A modern, fast Discord bot website built with Express and vanilla HTML/CSS. Inspired by Central Bot's design.

## Features

- **Landing page** with hero section, features showcase, and staff team
- **Responsive design** that works on mobile, tablet, and desktop
- **Dark theme** with modern gradient accents
- **Staff team cards** with placeholder avatars and skills
- **Premium section** with CTA
- **Fast and lightweight** - no build process required

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
```

### Running Locally

```bash
npm start
```

The website will be available at `http://localhost:3000`

## Customization

### Update Staff Team

Edit `public/index.html` and update the staff cards section with real team members:

```html
<div class="staff-card">
  <div class="staff-avatar">👤</div>
  <div class="staff-name">Your Name</div>
  <div class="staff-role">Your Role</div>
  <div class="staff-bio">Your bio</div>
  <div class="staff-skills">
    <span class="skill-badge">Skill 1</span>
    <span class="skill-badge">Skill 2</span>
  </div>
</div>
```

### Update Stats

Modify the stats section to show real numbers:

```html
<div class="stat">
  <div class="stat-number">YOUR_NUMBER</div>
  <div class="stat-label">Your Label</div>
</div>
```

### Customize Colors

The primary color is `#6366f1` (indigo). Search and replace throughout `index.html` to change the theme.

## Deployment

### Railway

```bash
npm install
npm start
```

### Vercel

```bash
vercel
```

### Other Platforms

Any platform that supports Node.js will work. Just ensure `npm start` runs the server.

## License

MIT
