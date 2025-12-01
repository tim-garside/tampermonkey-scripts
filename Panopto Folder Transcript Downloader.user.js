
// ==UserScript==
// @name         Panopto Folder Transcript Downloader
// @namespace    https://uoncapture.ap.panopto.com/
// @version      0.2
// @description  Adds a banner button (next to Stats) to download edited captions/transcripts for all sessions in the folder and zip them.
// @author       Tim Garside
// @match        https://uoncapture.ap.panopto.com/Panopto/Pages/Sessions/*
// @updateURL    https://github.com/tim-garside/tampermonkey-scripts/raw/main/Panopto%20Folder%20Transcript%20Downloader.user.js
// @downloadURL  https://github.com/tim-garside/tampermonkey-scripts/raw/main/Panopto%20Folder%20Transcript%20Downloader.user.js
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
// ==/UserScript==

(function() {
    // ===== CONFIG =====
    // const CLIENT_ID = 'YOUR_CLIENT_ID'; // <-- set your OAuth2 Client ID
    // const SCOPE = 'openid api';
    //const TOKEN_STORAGE_KEY = 'panopto_oauth_token';
    //const TOKEN_EXPIRY_KEY = 'panopto_oauth_expires_at';
    const ZIP_NAME_PREFIX = 'panopto-transcripts';

    const siteBase = location.origin; // https://your.hosted.panopto.com
    const apiBase = `${siteBase}/Panopto/api/v1`;
    //const oidcConfigUrl = `${siteBase}/Panopto/oauth2/.well-known/openid-configuration`;

    // ===== UTILITIES =====
    function sanitizeFileName(name) {
        return (name || '').replace(/[\\/:*?"<>|]+/g, '_').trim();
    }
    function truncate(str, n) {
        if (!str) return '';
        return str.length <= n ? str : str.slice(0, n);
    }

    function getFolderIdFromHash() {
        const m = location.hash.match(/folderID=%22?([0-9a-fA-F-]{36})?%22/);
        return m ? m[1] : null;
    }

    // ===== BANNER INJECTION (next to Stats button) =====
    function injectBannerButton() {
        const header = document.getElementById('headerWrapper');
        if (!header) return false;

        const statsBtn = document.getElementById('headerStatsLink');
        if (!statsBtn) return false;

        const btn = document.createElement('a');
        btn.href = '#';
        btn.textContent = 'Download captions';
        btn.setAttribute('id', 'headerDownloadCaptionsLink');
        // Style to be visually consistent with banner actions
        btn.style.cssText = `
      display:inline-block; margin-left:12px; padding:6px 12px;
      border:1px solid rgba(255,255,255,0.7); border-radius:18px;
      color:#fff; text-decoration:none; font:600 13px/1.3 Segoe UI, Roboto, Arial, sans-serif;
      background:transparent; backdrop-filter:saturate(120%);
    `;
      btn.addEventListener('click', (e) => { e.preventDefault(); run(); });

      // Insert immediately after Stats button
      statsBtn.parentNode.insertBefore(btn, statsBtn.nextSibling);
      return true;
  }

    // ===== MAIN FLOW =====
    async function run() {
        try {
            const folderId = getFolderIdFromHash();
            if (!folderId) {
                alert('No folderID found in the URL fragment. Expected: #folderID="GUID"');
                return;
            }

            //const token = await getAccessToken();

            // Fetch folder name (for ZIP filename)
            // const folder = await getFolder(folderId);
            //console.log(folder);


            // List sessions
            const sessions = await listAllSessions(folderId);
            console.log(sessions);
            const rawFolderName = sanitizeFileName(sessions[0].FolderDetails.Name || 'folder');
            const shortFolderName = truncate(rawFolderName, 30);
            if (!sessions.length) {
                alert('No sessions found in this folder. (Archived sessions are not returned by the REST endpoint.)');
                return;
            }

            // Process captions and zip
            const zip = new JSZip();
            let added = 0;

            for (const s of sessions) {
                const deliveryId = s.Id || s.DeliveryId || s.id;
                if (!deliveryId) continue;

                //const session = await getSession(deliveryId);
                const sessionName = sanitizeFileName(s.Name || `session-${deliveryId}`);
                console.log(sessionName)

                const urls = s.Urls || {};
                const captionUrl = urls.CaptionDownloadUrl;
                console.log(captionUrl)
                if (!captionUrl) continue;

                const raw = await fetchCaption(captionUrl);
                //const transcript = srtOrVttToTranscript(raw); // produce clean text (edited captions/transcripts preferred)
                zip.file(`${sessionName}.txt`, raw, { binary: false });
                added++;
            }

            if (added === 0) {
                alert('No caption files available to download in this folder.');
                return;
            }

            const timestamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
            const zipName = `${ZIP_NAME_PREFIX}-${shortFolderName}-${timestamp}.zip`;

            // Example: Generate and download a zip file
            zip.generateAsync({type:"blob"})
                .then(function(content) {
                // You would typically use a library or a browser API to trigger the download
                // For example, creating a temporary link and clicking it
                var url = URL.createObjectURL(content);
                var a = document.createElement('a');
                a.href = url;
                a.download = zipName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });

            alert(`Downloaded ${added} transcript(s) in ${zipName}`);
        } catch (err) {
            console.error(err);
            alert(`Error: ${err.message}`);
        }
    }

    // ===== OAUTH (Implicit Grant) =====
    /*async function getAccessToken() {
    const now = Date.now();
    const existing = localStorage.getItem(TOKEN_STORAGE_KEY);
    const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
    if (existing && now < (expiresAt - 30000)) return existing;

    // Handle redirect result
    if (location.hash.includes('access_token=')) {
      const params = new URLSearchParams(location.hash.replace(/^#/, ''));
      const token = params.get('access_token');
      const ttl = Number(params.get('expires_in') || '3600');
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + ttl * 1000).toString());
      history.replaceState(null, '', location.pathname + location.search);
      return token;
    }

    // Discover endpoints
    const config = await (await fetch(oidcConfigUrl, { credentials: 'include' })).json();
    const authorize = config.authorization_endpoint;

    const redirectUri = location.href; // must be registered in OAuth client
    const authUrl = new URL(authorize);
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', SCOPE);
    authUrl.searchParams.set('state', Math.random().toString(36).slice(2));

    location.assign(authUrl.toString());
    return new Promise(() => {}); // function resumes after redirect
  }*/

    // ===== API CALLS =====
    async function getFolder(folderId) {
        const options = {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        };

        const res = await fetch(`${apiBase}/folders/${folderId}`, options);
        if (!res.ok) throw new Error(`Folder ${folderId} fetch error: ${res.status}`);
        return res.json();
    }

    async function listAllSessions(folderId) {
        let allSessions = [];
        let page = 0;
        let pageSize = 50;
        let hasMore = true;
        const options = {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        };
        while (hasMore) {
            const res = await fetch(`${apiBase}/folders/${folderId}/sessions?pageNumber=${page}`, options);
            if (!res.ok) throw new Error(`Sessions API error: ${res.status}`);
            const data = await res.json();

            const items = Array.isArray(data) ? data : (data.Results || data.Items || []);
            allSessions.push(...items);
            // Check if there are more pages
            hasMore = items.length === pageSize;
            console.log(hasMore);
            page++;
        }
        return allSessions;
    }

    // Fetch caption via CaptionDownloadUrl; rely on Panopto cookie for Restricted folders
    async function fetchCaption(captionUrl) {
        const options = {
            credentials: "include"
        };
        const res = await fetch(captionUrl, options);
        if (!res.ok) throw new Error(`Caption download error: ${res.status}`);
        return res.text();
    }

    // ===== CAPTION NORMALIZATION =====
    // Convert SRT/VTT to plain transcript text by stripping indices & timestamps; if already transcript, return as-is.
    function srtOrVttToTranscript(text) {
        if (!/-->\s*\d{2}:\d{2}:\d{2}/.test(text) && !/WEBVTT/i.test(text)) {
            return text; // Panopto transcript .txt (edited) usually arrives with no timestamps
        }
        const lines = text.split(/\r?\n/);
        const out = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (/^\d+$/.test(line)) continue; // numeric index
            if (/-->\s*/.test(line)) continue; // timestamp cue
            if (/^WEBVTT/.test(line)) continue; // header
            if (!line) continue;
            out.push(line.replace(/\s*position:\d+%.*$/i, '').trim());
        }
        return out.join('\n').replace(/\n{3,}/g, '\n\n');
    }

    // ===== INIT =====
    // Try banner injection first; if we can't locate header elements, fall back to floating button.
    const placed = injectBannerButton();
    if (!placed) {
        // Fallback floating button for pages without the banner structure
        const fallback = document.createElement('button');
        fallback.textContent = 'Download all captions';
        fallback.style.cssText = `
      position: fixed; z-index: 99999; right: 20px; bottom: 20px;
      padding: 10px 14px; background:#0078d4; color:#fff; border:none; border-radius:6px;
      cursor:pointer; font: 600 13px/1.3 Segoe UI, Roboto, Arial, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
      fallback.addEventListener('click', run);
      document.body.appendChild(fallback);
  }
})();
