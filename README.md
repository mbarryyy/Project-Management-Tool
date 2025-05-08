# Project Management Tool - Version 1.1

A comprehensive project management application with Critical Path Method (CPM) and Project Crashing features.

## What's New in Version 1.1

- **Enhanced UI/UX**: Improved user interface for better usability
- **Performance Improvements**: Faster calculations and smoother interactions
- **Bug Fixes**: Fixed various issues for more stable operation
- **Improved Project Crashing Algorithm**: Better optimization for time and cost analysis

## Features

- **Task Management**: Create, edit, and organize project tasks
- **Critical Path Analysis**: Calculate project critical path
- **Network Diagram**: Visualize project network using interactive graphs
- **Project Crashing**: Reduce project duration with cost-effective task crashing
  - Calculate optimal task selection for crashing
  - Analyze cost impact of crashing activities
  - Visualize project paths and critical paths
  - Manage multiple crashing iterations

## Technologies

- React
- TypeScript
- Material-UI 
- Context API for state management

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Project Structure

- `/src/components`: UI components
- `/src/hooks`: Context providers and custom hooks
- `/src/models`: TypeScript interfaces and models
- `/src/services`: Business logic and algorithms

## Project Crashing Feature

The project includes a complete implementation of the Project Crashing algorithm, which helps determine how to shorten project duration while minimizing costs. It includes:

- Input of normal and crash parameters for tasks
- Calculation of cost-slope values
- Identification of critical paths
- Step-by-step crashing process
- Cost analysis for each crashing iteration

<!-- Optional: Add a screenshot or a short GIF demo here -->
<!-- ![Project Screenshot](placeholder_screenshot.png) -->

## Tech Stack

- **Frontend**:
    - React (v18.x) with TypeScript
    - Material UI (MUI) v5 for UI components and styling
    - React Flow (v11.x) for network diagram visualization
    - @dnd-kit for accessible and performant drag-and-drop
- **Development**:
    - Create React App (react-scripts v5.x)
    - ESLint for code linting

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (LTS version recommended, e.g., v18.x or later)
- [npm](https://www.npmjs.com/) (comes with Node.js) or [Yarn](https://yarnpkg.com/)

## Running the Project

Once the dependencies are installed, you can start the development server:

Using npm:
```bash
npm start
```
Or using Yarn:
```bash
yarn start
```
This will run the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser. The page will reload if you make edits.

## Available Scripts

In the project directory, you can run:

- `npm start` or `yarn start`: Runs the app in development mode.
- `npm run build` or `yarn build`: Builds the app for production to the `build` folder.
- `npm test` or `yarn test`: Launches the test runner in interactive watch mode.
- `npm run eject` or `yarn eject`: Removes the single dependency configuration (Create React App's `react-scripts`). **Note: this is a one-way operation. Once you `eject`, you can't go back!**

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Release History

- **v1.1** - July 2023: Enhanced UI/UX, performance improvements, bug fixes, improved crashing algorithm
- **v1.0** - March 2023: Initial release with basic CPM and Project Crashing features

---

Happy Project Managing! 