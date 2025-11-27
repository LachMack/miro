# Miro Find & Replace — SearchSwap

## What this does
A simple Miro Web SDK v2 app that lets you find and replace text across board content (text, sticky notes, shapes, cards), with an option to limit to the current selection.

## File structure
- index.html — launcher (loads SDK + index.js)
- index.js — sets up toolbar icon click → opens panel
- panel.html — the UI for Find & Replace
- panel.js — the logic for matching & replacing

## Hosting / Deployment
1. Commit these files to your GitHub repo’s root (or a folder).  
2. Enable GitHub Pages: go to *Settings → Pages*, select branch `main`, folder `/ (root)`, then Save.  
3. After build, your app URL will be something like:  
   `https://<your-username>.github.io/<repo>/index.html`  
4. In Miro Developer dashboard, set your App URL to that URL and save.  

## Usage in Miro
- Install the custom app (if not already).  
- On your Miro board (same team), click the app icon in the left toolbar (or “More apps”).  
- The Find & Replace panel opens — run Preview or Replace All as needed.  

## Debugging / Dev
- If it doesn’t appear: open browser DevTools → check Console and Network tab for script load or SDK init errors.  
- If icon click does nothing: make sure index.js ran (see console log).  
- If panel loads but find/replace fails: inspect console output.  
