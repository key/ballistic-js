# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ballistic-JS is a Japanese-language web application for ballistic trajectory calculations. It's a client-side application using vanilla JavaScript with HTML5 Canvas for visualization.

## Essential Commands

### Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run all linters
npm run lint

# Fix markdown linting issues
npm run lint:md:fix

# Start local development server
python -m http.server 8000
# or
npx http-server
```

### Testing Single Files

```bash
# Run specific test file
npx jest ballistics.test.js

# Run specific test with pattern matching
npx jest -t "calculateTrajectory"
```

## Architecture

### Core Files

- **ballistics.js**: Browser version of physics calculations - contains all trajectory math, air resistance formulas, and environmental adjustments
- **ballistics.node.js**: Node.js-compatible version for testing (CommonJS exports)
- **app.js**: UI logic, Canvas rendering, user interactions, and CSV export functionality
- **index.html**: Single-page application entry point with all UI elements

### Key Implementation Details

1. **Dual Module System**: The project maintains two versions of the ballistics module:
   - `ballistics.js` uses ES6 modules for the browser
   - `ballistics.node.js` uses CommonJS for Jest testing
   - When modifying physics calculations, update both files

2. **Canvas Visualization**: The trajectory is rendered on an HTML5 Canvas element with:
   - Grid system for distance/height reference
   - Real-time hover information display
   - Wind direction indicator
   - Distance markers at 50m, 100m, 150m, 200m, 300m

3. **Environmental Calculations**: The physics engine accounts for:
   - Air density variations based on temperature, pressure, humidity, and altitude
   - Wind effects on both horizontal and vertical components
   - Drag coefficient adjustments

4. **UI State Management**: All UI state is managed through vanilla JavaScript DOM manipulation in app.js, with event listeners for input changes triggering recalculation and re-rendering.

## Testing Philosophy

Tests are located in `ballistics.test.js` and focus on the physics calculations. When adding new features:

- Test edge cases for environmental conditions
- Verify trajectory calculations at key distances
- Ensure proper handling of extreme input values

## Deployment

The application is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment workflow is configured in `.github/workflows/deploy.yml`.

## Japanese Localization

All user-facing text is in Japanese. When modifying UI elements or adding features, ensure proper Japanese language is used. The README.md contains mathematical formulas in LaTeX format that explain the physics calculations.
