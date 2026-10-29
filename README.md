# Shivam Sharma | Data Analyst Portfolio

A responsive static website using HTML, CSS and JavaScript. Hosting and content are managed with GitHub.

## GitHub Pages

1. Open repository Settings > Pages.
2. Choose **Deploy from a branch**.
3. Select branch **main** and folder **/(root)**, then Save.
4. GitHub Pages website: https://forevershivam.github.io/shivam-portfolio/
5. GitHub Pages admin: https://forevershivam.github.io/shivam-portfolio/admin/

GitHub Free requires the repository to be **public** for GitHub Pages. GitHub Pro or qualifying organization plans can publish from a private repository. If the repo is private on GitHub Free, set Settings > General > Danger Zone > Change repository visibility > Make public first. Publishing exposes all source and content, so check for private data before changing visibility. This repository must never contain access tokens.

## Editing without a CMS

Open /admin/ on your published Pages site. Generate a GitHub **fine-grained personal access token** scoped only to this repository with **Contents: Read and write**. Enter it in the admin editor, click **Load latest from GitHub**, make your changes and click **Save changes to GitHub**. The admin editor updates only `content.json` on the main branch. The token is not saved to this repo or local storage. Clear it when done.

Draft projects appear only in the admin; published projects appear on Projects page. Site styling offers Teal, Mocha, Champagne and Slate.

## Architecture

- `index.html`: public website shell
- `about/index.html`, `projects/index.html`, `contact/index.html`, `privacy/index.html`, `terms/index.html`: GitHub Pages routes
- `assets/styles.css`: responsive styles
- `assets/site.js`: client-side rendering
- `content.json`: editable site content
- `admin/`: browser-based GitHub editor
- `.nojekyll`: publish static files as-is

No Sanity, Netlify, Node.js build or database required.

The editor uses the GitHub API from your browser. Do not share GitHub access tokens or put them in committed files.
