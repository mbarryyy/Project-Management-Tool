import React, { useState } from 'react';
import { ProjectProvider } from './hooks/ProjectContext';
import { ProjectCrashingProvider } from './hooks/ProjectCrashingContext';
import Workspace from './components/Workspace';
import ProjectCrashing from './components/ProjectCrashing';
import { Box, Tabs, Tab, AppBar, Toolbar, Typography } from '@mui/material';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Project Management Tool
          </Typography>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange} 
            textColor="inherit"
            indicatorColor="secondary"
          >
            <Tab label="Network Diagram" />
            <Tab label="Project Crashing" />
          </Tabs>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ mt: 0 }}>
        {currentTab === 0 && (
          <ProjectProvider>
            <Workspace />
          </ProjectProvider>
        )}
        {currentTab === 1 && (
          <ProjectCrashingProvider>
            <ProjectCrashing />
          </ProjectCrashingProvider>
        )}
      </Box>
    </Box>
  );
};

export default App; 