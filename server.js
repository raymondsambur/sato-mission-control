const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const WORKSPACE = process.env.WORKSPACE || path.join(__dirname, '../../');
const MEMORY_DIR = path.join(WORKSPACE, 'memory');
const IDEAS_DIR = path.join(WORKSPACE, 'ideas');

app.use(express.static('public'));
app.use(express.json());

// API: Ideas
app.get('/api/ideas', async (req, res) => {
    try {
        if (await fs.pathExists(IDEAS_DIR)) {
            const files = await fs.readdir(IDEAS_DIR);
            const ideas = [];
            for (const file of files) {
                if (file.endsWith('.md') && file !== 'README.md') {
                    const content = await fs.readFile(path.join(IDEAS_DIR, file), 'utf-8');
                    const titleMatch = content.match(/^#\s+(.+)$/m);
                    const statusLineMatch = content.match(/\*\*Status:\*\*\s*(.+)$/m);
                    let status = 'DRAFT';
                    if (statusLineMatch) status = statusLineMatch[1].replace(/[\[\]]/g, '').trim().toUpperCase();
                    const ownerMatch = content.match(/\*\*Owner:\*\*\s*(.+)/i);
                    const descMatch = content.match(/^## Concept\s+([\s\S]+?)(^##|$)/m) || content.match(/^Goal:\*\*\s*(.+)/m);
                    const stats = await fs.stat(path.join(IDEAS_DIR, file));
                    ideas.push({
                        filename: file,
                        title: titleMatch ? titleMatch[1].replace(/Idea \d+:\s*/, '') : file.replace(/_/g, ' '),
                        status, owner: ownerMatch ? ownerMatch[1] : 'Sato',
                        snippet: descMatch ? descMatch[1].trim().substring(0, 120) + '...' : 'No description available.',
                        mtime: stats.mtime
                    });
                }
            }
            ideas.sort((a, b) => b.mtime - a.mtime);
            res.json(ideas);
        } else res.json([]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// API: Jobs (Unified Pipeline + Leads)
app.get('/api/jobs', async (req, res) => {
    try {
        let pipeline = [];
        let leads = [];
        const appsPath = path.join(MEMORY_DIR, 'job_applications.md');
        if (await fs.pathExists(appsPath)) {
            const content = await fs.readFile(appsPath, 'utf-8');
            const activeSection = content.split('## Historic')[0];
            // Robust parsing: Split by entry starter "- **"
            const rawEntries = activeSection.split(/\n-\s+\*\*/);

            for (const entry of rawEntries) {
                if (!entry.trim()) continue;
                // Name: Match anything up to the closing "**" (ignoring colon)
                const nameMatch = entry.match(/^(.+?)\*\*/);
                // Status: Match "Status:" followed by anything (like "**") then "[STATUS]"
                const statusMatch = entry.match(/Status:.*\[(.+?)\]/);
                // Notes: Match "Notes:" followed by anything then the content
                const notesMatch = entry.match(/Notes:.*?\s+(.+)/);

                if (nameMatch && statusMatch) {
                    pipeline.push({
                        company: nameMatch[1].trim(),
                        status: statusMatch[1].trim(),
                        milestone: notesMatch ? notesMatch[1].trim() : 'Updated',
                        notes: notesMatch ? notesMatch[1].trim() : ''
                    });
                }
            }
        }
        const leadsPath = path.join(MEMORY_DIR, 'leads.json');
        if (await fs.pathExists(leadsPath)) {
            leads = await fs.readJson(leadsPath);
        }
        res.json({ pipeline, leads });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ideas/:filename', async (req, res) => {
    try {
        const filePath = path.join(IDEAS_DIR, req.params.filename);
        if (await fs.pathExists(filePath)) {
            const content = await fs.readFile(filePath, 'utf-8');
            res.json({ content });
        } else res.status(404).json({ error: "File not found" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ideas/:filename', async (req, res) => {
    try {
        const filePath = path.join(IDEAS_DIR, req.params.filename);
        await fs.writeFile(filePath, req.body.content);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/ideas/:filename', async (req, res) => {
    try {
        const filePath = path.join(IDEAS_DIR, req.params.filename);
        await fs.unlink(filePath);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/action', async (req, res) => {
    const { action } = req.body;
    let cmd = '';
    if (action === 'backup') cmd = `bash ${path.join(WORKSPACE, 'scripts/backup.sh')}`;
    if (action === 'sync') cmd = `touch ${path.join(WORKSPACE, 'memory/sync_signal.txt')}`;
    if (action === 'clean') cmd = `rm -rf ${path.join(WORKSPACE, 'memory/temp/*')}`;
    if (cmd) {
        exec(cmd, (err, stdout, stderr) => {
            if (err) return res.status(500).json({ error: stderr });
            res.json({ success: true, output: stdout });
        });
    } else res.status(400).json({ error: 'Unknown action' });
});

// Helper Functions
function parseLogLine(line, defaultSource = "System") {
    const tsMatch = line.match(/\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\]/);
    const agentMatch = line.match(/\[(Sato|Rook|Scout|Hunter|Vanguard)\]/i);
    let dateObj = new Date();
    if (tsMatch) {
        const d = new Date(tsMatch[1]);
        if (!isNaN(d.getTime())) dateObj = d;
    }
    const timestamp = dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
    const source = agentMatch ? agentMatch[1] : defaultSource;
    const text = line.replace(/\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]\s*/g, '')
        .replace(/\[(Sato|Rook|Scout|Hunter|Vanguard)\]\s*/gi, '')
        .trim();
    return { source, text, timestamp, rawTime: dateObj.getTime() };
}

async function emitTokenUsage(socket) {
    try {
        const tokenPath = path.join(MEMORY_DIR, 'token_usage_tracker.json');
        if (await fs.pathExists(tokenPath)) {
            const data = await fs.readJson(tokenPath);
            const now = new Date();
            const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
            const day = now.getDay();
            const mondayDiff = now.getDate() - day + (day === 0 ? -6 : 1);
            const weekStart = new Date(now.getFullYear(), now.getMonth(), mondayDiff);
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            let today = 0, weekly = 0, monthly = 0;
            if (data.history) {
                data.history.forEach(entry => {
                    const entryDate = new Date(entry.date);
                    const tokens = (entry.total_tokens_in || 0) + (entry.total_tokens_out || 0);
                    if (entry.date === todayStr) today += tokens;
                    if (entryDate >= weekStart) weekly += tokens;
                    if (entryDate >= monthStart) monthly += tokens;
                });
            }
            socket.emit('token-update', { today, weekly, monthly });
        }
    } catch (e) { }
}

async function emitLeads(socket) {
    try {
        const leadsPath = path.join(MEMORY_DIR, 'leads.json');
        if (await fs.pathExists(leadsPath)) {
            const data = await fs.readJson(leadsPath);
            socket.emit('leads-update', data);
        }
    } catch (e) { }
}

async function emitLearning(socket) {
    try {
        const learnPath = path.join(MEMORY_DIR, 'learning_stats.json');
        if (await fs.pathExists(learnPath)) {
            const data = await fs.readJson(learnPath);
            socket.emit('learning-update', data);
        }
    } catch (e) { }
}

async function emitJobApps(socket) {
    try {
        const appsPath = path.join(MEMORY_DIR, 'job_applications.md');
        if (await fs.pathExists(appsPath)) {
            const content = await fs.readFile(appsPath, 'utf-8');
            const activeSection = content.split('## Historic')[0];
            const apps = [];
            // Robust parsing: Split by entry starter "- **"
            const rawEntries = activeSection.split(/\n-\s+\*\*/);

            for (const entry of rawEntries) {
                if (!entry.trim()) continue;
                // Name: Match anything up to the closing "**" (ignoring colon)
                const nameMatch = entry.match(/^(.+?)\*\*/);
                // Status: Match "Status:" followed by anything (like "**") then "[STATUS]"
                const statusMatch = entry.match(/Status:.*\[(.+?)\]/);
                // Notes: Match "Notes:" followed by anything then the content
                const notesMatch = entry.match(/Notes:.*?\s+(.+)/);

                if (nameMatch && statusMatch) {
                    apps.push({
                        company: nameMatch[1].trim(),
                        status: statusMatch[1].trim(),
                        milestone: notesMatch ? notesMatch[1].trim() : 'Updated',
                        notes: notesMatch ? notesMatch[1].trim() : ''
                    });
                }
            }
            socket.emit('job-apps-update', apps);
        }
    } catch (e) { console.error('emitJobApps error:', e); }
}

async function emitTasks(socket) {
    try {
        const tasksPath = path.join(WORKSPACE, 'tasks.json');
        if (await fs.pathExists(tasksPath)) {
            const tasks = await fs.readJson(tasksPath);
            socket.emit('tasks-update', tasks);
        }
    } catch (e) { }
}

async function emitAgentStatus(socket) {
    try {
        const content = await fs.readFile(path.join(WORKSPACE, 'SESSION-STATE.md'), 'utf-8');
        socket.emit('agent-status', { raw: content });
    } catch (e) { }
}

async function emitRecentLogs(socket) {
    try {
        const files = ['rook_defense.log', 'live_feed.log'];
        let allLines = [];
        for (const f of files) {
            const p = path.join(MEMORY_DIR, f);
            if (await fs.pathExists(p)) {
                const data = await fs.readFile(p, 'utf-8');
                const source = f.includes('rook') ? 'Rook' : 'Sato';
                allLines = allLines.concat(data.split('\n').filter(l => l.trim()).map(l => parseLogLine(l, source)));
            }
        }
        allLines.sort((a, b) => a.rawTime - b.rawTime);
        socket.emit('logs-update', allLines.slice(-100));
    } catch (e) { }
}

// Socket IO
io.on('connection', (socket) => {
    console.log('Client connected');
    emitRecentLogs(socket);
    emitTokenUsage(socket);
    emitTasks(socket);
    emitAgentStatus(socket);
    emitLeads(socket);
    emitLearning(socket);
    emitJobApps(socket);

    fs.watch(path.join(WORKSPACE, 'SESSION-STATE.md'), () => emitAgentStatus(socket));
    fs.watch(path.join(WORKSPACE, 'tasks.json'), () => emitTasks(socket));
    fs.watch(MEMORY_DIR, (ev, file) => {
        if (file && file.endsWith('.log')) emitRecentLogs(socket);
        if (file === 'token_usage_tracker.json') emitTokenUsage(socket);
        if (file === 'leads.json') emitLeads(socket);
        if (file === 'learning_stats.json') emitLearning(socket);
        if (file === 'job_applications.md') emitJobApps(socket);
    });
});

// System Stats
setInterval(() => {
    const mem = ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(1) + ' GB';
    const load = Math.min(100, (os.loadavg()[0] / os.cpus().length) * 100).toFixed(0) + '%';
    exec('df -h / | tail -1', (err, stdout) => {
        const disk = stdout ? stdout.replace(/\s+/g, ' ').split(' ')[4] : 'N/A';
        io.emit('stats-update', { cpu: load, mem, disk });
    });
}, 3000);

server.listen(PORT, () => console.log(`SMC v2.2 live at ${PORT}`));
