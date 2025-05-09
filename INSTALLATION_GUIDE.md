# Project Management Tool - Installation Guide for Non-Technical Users

This guide is designed for users who want to run the Project Management Tool but don't have programming experience. Follow these step-by-step instructions to get the application running on your Mac.

## Prerequisites

You need to install Node.js, which is the environment that runs the application.

## Step 1: Install Node.js

1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the "LTS" (Long Term Support) version for macOS
3. Open the downloaded file (it will be named something like `node-v22.x.x.pkg`)
4. Follow the installation wizard, keeping all default settings
5. Click "Install" when prompted (you may need to enter your Mac password)
6. Wait for the installation to complete and click "Close"

## Step 2: Download and Extract the Project

### Option A: Download from the Main Branch
1. Go to the GitHub repository page
2. Click the green "Code" button
3. Select "Download ZIP"
4. Once downloaded, locate the ZIP file in your Downloads folder
5. Double-click the ZIP file to extract it
6. Drag the extracted folder to your Desktop for easy access

### Option B: Download from a Specific Branch (Latest Updates)
1. Go to the GitHub repository page
2. Click on the dropdown menu that says "main" (it's located near the top-left, just above the file list)
3. From the dropdown, select the branch you want to download (e.g., "V1.1.2-release")
4. Once you've switched to the desired branch, click the green "Code" button
5. Select "Download ZIP"
6. Once downloaded, locate the ZIP file in your Downloads folder
7. Double-click the ZIP file to extract it
8. Drag the extracted folder to your Desktop for easy access

## Step 3: Run the Application Using Terminal

1. Open Terminal:
   - Press `Command (⌘) + Space` to open Spotlight
   - Type "Terminal" and press Enter

2. Navigate to your project folder:
   - Type or copy-paste the following command (replace `Project-Management-Tool-1.1.2-release` with your actual folder name if different):
     ```
     cd ~/Desktop/Project-Management-Tool-1.1.2-release
     ```
   - Press Enter

3. Install project dependencies:
   - Copy-paste this command:
     ```
     npm install
     ```
   - Press Enter
   - Wait for the installation to complete (this may take several minutes)

4. Start the application:
   - Copy-paste this command:
     ```
     npm start
     ```
   - Press Enter
   - The application will start and automatically open in your web browser
   - If the browser doesn't open automatically, open any web browser and go to: http://localhost:3000

## Opening the Application Again Later

To open and run the application again in the future:

1. Open Terminal (Command + Space, type "Terminal", press Enter)
2. Type or copy-paste:
   ```
   cd ~/Desktop/Project-Management-Tool-1.1.2-release
   npm start
   ```
3. Wait for the browser to open with the application

## Troubleshooting

### If you see "command not found: npm" error:
- Make sure you've completed Step 1 (installing Node.js)
- Try closing and reopening Terminal
- Restart your computer and try again

### If you see "Error: Cannot find module..." or similar:
- Make sure you're in the correct folder
- Try running `npm install` again

### If the application doesn't open in your browser:
- Open your web browser manually
- Go to the address: http://localhost:3000

### If you see "Error: EACCES: permission denied":
- Try running the command with sudo:
  ```
  sudo npm install
  ```
- You'll be asked for your Mac password

## Need More Help?

If you're still having trouble getting the application to run, please contact me for assistance. 