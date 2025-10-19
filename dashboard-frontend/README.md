# Verita AI Interview - Interviewer Portal

The interviewer-facing frontend for managing and reviewing AI-powered interviews.

## Overview

This is the interviewer portal where hiring managers and recruiters can:
- Manage interview sessions
- Review interview transcripts and evaluations
- Access candidate assessments
- Monitor interview progress

## Tech Stack

- **React 19** - UI framework
- **React Router v7** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Axios** - HTTP client
- **Lucide React** - Icon library

## Design System

This frontend uses the **Verita Design System** for consistent styling across the platform.

### Colors
- **Brand:** Orange palette (#e85c24 primary)
- **Accent:** Complementary orange
- **Neutral:** Grayscale for text and UI elements

### Typography
- **Display:** Poppins (headings)
- **Body:** Inter (text)

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for complete documentation.

## Getting Started

### Prerequisites
- Node.js 16+
- Yarn package manager

### Installation

```bash
# Install dependencies
yarn install

# Start development server (runs on port 3001)
yarn start

# Build for production
yarn build
```

### Environment Variables

Create a `.env` file:

```bash
REACT_APP_BACKEND_URL=http://localhost:8000
PORT=3001
```

## Project Structure

```
interviewer-frontend/
├── public/
│   └── index.html           # HTML entry point
├── src/
│   ├── components/
│   │   └── ui/              # Reusable UI components (48 components)
│   ├── pages/
│   │   └── InterviewerDashboard.jsx  # Main dashboard
│   ├── lib/
│   │   ├── design-system.js # Design tokens and utilities
│   │   └── utils.js         # Utility functions
│   ├── hooks/               # Custom React hooks
│   ├── App.js               # Main app component
│   └── index.js             # React entry point
├── tailwind.config.js       # Tailwind configuration
├── craco.config.js          # Create React App override
└── package.json
```

## Available Scripts

- `yarn start` - Start development server on port 3001
- `yarn build` - Create production build
- `yarn test` - Run tests

## Development Notes

### Port Configuration
This frontend runs on **port 3001** to avoid conflicts with the candidate-facing frontend (port 3000).

### Design System Usage

Always use design system utilities:

```jsx
import { cardStyles, pageHeader, containers } from '@/lib/design-system';

// Use design system classes
<div className={pageHeader.wrapper}>
  <Card className={cardStyles.default}>
    ...
  </Card>
</div>
```

### Adding New Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.js`
3. Use design system for styling

## API Integration

The frontend connects to the backend API at `REACT_APP_BACKEND_URL`.

Example API call:
```jsx
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fetchInterviews = async () => {
  const response = await axios.get(`${API}/interviews`);
  return response.data;
};
```

## UI Components Library

This project includes 48 pre-built UI components from Radix UI:

- Layout: Card, Separator, Scroll Area
- Forms: Input, Select, Checkbox, Switch, Radio, Textarea
- Navigation: Tabs, Breadcrumb, Navigation Menu, Menubar
- Feedback: Alert, Toast, Progress, Skeleton
- Overlays: Dialog, Popover, Tooltip, Hover Card
- And more...

See `src/components/ui/` for all available components.

## Contributing

When adding new features:
1. Follow the design system guidelines
2. Use existing UI components
3. Maintain consistent spacing and typography
4. Test on different screen sizes

## License

Proprietary - Verita AI Interview Platform
