const socket = io();

socket.on('connect', () => {
    addLog('System', 'Connected to HQ. Secure tunnel established.');
});

socket.on('stats-update', (stats) => {
    document.getElementById('stat-cpu').innerText = stats.cpu;
    document.getElementById('stat-mem').innerText = stats.mem;
    document.getElementById('stat-disk').innerText = stats.disk;
});

let currentTasks = { todo: [], inprogress: [], done: [] };

socket.on('tasks-update', (tasks) => {
    currentTasks = tasks;
    renderTasks(tasks);
    updateAgents(); 
});

socket.on('logs-update', (logs) => {
    const feed = document.getElementById('terminal-feed');
    if (!feed) return;
    feed.innerHTML = '';
    logs.forEach(log => addLog(log.source, log.text, log.timestamp));
});

socket.on('log-stream', (log) => {
    addLog(log.source, log.text, log.timestamp);
});

socket.on('token-update', (usage) => {
    document.getElementById('token-today').innerText = (usage.today / 1000).toFixed(1) + 'k';
    document.getElementById('token-weekly').innerText = (usage.weekly / 1000).toFixed(1) + 'k';
    document.getElementById('token-monthly').innerText = (usage.monthly / 1000).toFixed(1) + 'k';
});

socket.on('leads-update', (leads) => {
    renderLeads(leads);
});

socket.on('learning-update', (stats) => {
    renderLearning(stats);
});

socket.on('job-apps-update', (apps) => {
    renderJobApps(apps);
});

function triggerAction(action) {
    fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) addLog('System', `Action '${action}' completed.`);
        else addLog('System', `Action '${action}' failed: ${data.error}`);
    });
}

function addLog(source, text, time) {
    const feed = document.getElementById('terminal-feed');
    if (!feed) return;
    const entry = document.createElement('div');
    entry.className = "flex gap-2 text-[10px] font-mono hover:bg-white/5 p-0.5 rounded transition";
    
    let sourceColor = "text-zinc-500";
    if (source === "Rook") sourceColor = "text-purple-400";
    if (source === "Scout") sourceColor = "text-teal-400";
    if (source === "Hunter") sourceColor = "text-orange-400";
    if (source === "Sato") sourceColor = "text-blue-400";

    entry.innerHTML = `
        <span class="text-zinc-600 min-w-[75px]">${time}</span>
        <span class="font-bold ${sourceColor} min-w-[50px] uppercase">${source}</span>
        <span class="text-zinc-300 break-all">${text}</span>
    `;
    feed.appendChild(entry);
    feed.scrollTop = feed.scrollHeight;
}

function renderTasks(tasks) {
    const renderList = (id, list) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '';
        list.forEach(t => {
            const card = document.createElement('div');
            card.className = "p-3 rounded-lg bg-zinc-800/40 border border-zinc-800/50 hover:border-zinc-700 transition cursor-default";
            let tagColor = "bg-zinc-700 text-zinc-300";
            if (t.tag === "Research") tagColor = "bg-pink-500/10 text-pink-400 border border-pink-500/20";
            if (t.tag === "Security") tagColor = "bg-purple-500/10 text-purple-400 border border-purple-500/20";
            if (t.tag === "Dev") tagColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
            if (t.tag === "Stealth") tagColor = "bg-teal-500/10 text-teal-400 border border-teal-500/20";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-1">
                    <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">${t.agent}</span>
                    ${t.tag ? `<span class="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${tagColor}">${t.tag}</span>` : ''}
                </div>
                <div class="text-[11px] text-zinc-200 font-medium">${t.title}</div>
            `;
            el.appendChild(card);
        });
    };
    renderList('list-todo', tasks.todo || []);
    renderList('list-inprogress', tasks.inprogress || []);
    renderList('list-done', tasks.done || []);
}

function renderLeads(leads) {
    const streamer = document.getElementById('lead-streamer');
    const overview = document.getElementById('lead-streamer-overview');
    const latestLeads = leads.slice(0, 5);

    if (streamer) {
        streamer.innerHTML = '';
        latestLeads.forEach(lead => {
            const card = document.createElement('div');
            card.className = "shrink-0 w-48 p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/80 hover:border-blue-500/50 transition cursor-default";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] font-bold text-blue-400">${lead.company}</span>
                    <span class="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[8px] uppercase font-bold">${lead.tag}</span>
                </div>
                <div class="text-[11px] text-zinc-100 font-semibold mb-1 truncate">${lead.title}</div>
                <div class="flex justify-between items-center text-[10px] text-zinc-500">
                    <span>${lead.location}</span>
                    <span class="text-zinc-400 font-mono">${lead.salary}</span>
                </div>
            `;
            streamer.appendChild(card);
        });
    }

    if (overview) {
        overview.innerHTML = '';
        latestLeads.forEach(lead => {
            const item = document.createElement('div');
            item.className = "p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-800/80 space-y-1";
            item.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="text-[11px] font-bold text-zinc-100">${lead.company}</span>
                    <span class="text-[9px] font-bold uppercase text-blue-400">${lead.tag}</span>
                </div>
                <div class="text-[10px] text-zinc-400 truncate">${lead.title}</div>
            `;
            overview.appendChild(item);
        });
    }
}

function renderLearning(stats) {
    const el = document.getElementById('learning-pulse');
    if (!el) return;
    el.innerHTML = '';
    Object.entries(stats).forEach(([name, data]) => {
        const item = document.createElement('div');
        item.className = "space-y-1.5";
        let color = data.color === 'emerald' ? 'bg-emerald-500' : (data.color === 'cyan' ? 'bg-cyan-500' : 'bg-blue-500');
        let textColor = data.color === 'emerald' ? 'text-emerald-400' : (data.color === 'cyan' ? 'text-cyan-400' : 'text-blue-400');
        
        item.innerHTML = `
            <div class=\"flex justify-between items-end\">
                <span class=\"text-[11px] font-bold text-zinc-100\">${name}</span>
                <span class=\"text-[10px] ${textColor}\">${data.status}</span>
            </div>
            <div class=\"w-full h-1 bg-zinc-800 rounded-full overflow-hidden\">
                <div class=\"h-full ${color} transition-all duration-1000\" style=\"width: ${data.progress}%\"></div>
            </div>
        `;
        el.appendChild(item);
    });
}

function renderJobApps(apps) {
    const el = document.getElementById('job-pipeline');
    if (!el) return;
    el.innerHTML = '';
    apps.forEach(app => {
        const item = document.createElement('div');
        item.className = \"p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-800/80 space-y-1\";
        
        let statusColor = \"text-zinc-500\";
        if (app.status === \"WAITING\") statusColor = \"text-amber-400\";
        if (app.status === \"PAST\") statusColor = \"text-zinc-500\";

        item.innerHTML = `
            <div class=\"flex justify-between items-center\">
                <span class=\"text-[11px] font-bold text-zinc-100\">${app.company}</span>
                <span class=\"text-[9px] font-bold uppercase ${statusColor}\">${app.status}</span>
            </div>
            <div class=\"text-[10px] text-zinc-400 leading-tight\">${app.milestone}</div>
        `;
        el.appendChild(item);
    });
}

const ICONS = {
    Sato: `<svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z\"></path></svg>`,
    Rook: `<svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z\"></path></svg>`,
    Vanguard: `<svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z\"></path><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M21 12a9 9 0 11-18 0 9 9 0 0118 0z\"></path></svg>`,
    Hunter: `<svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z\"></path></svg>`,
    Scout: `<svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M15 12a3 3 0 11-6 0 3 3 0 016 0z\"></path><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z\"></path></svg>`
};

function updateAgents() {
    const agentDefs = [
        { id: \"Sato\", name: \"Sato (Manager)\", icon: ICONS.Sato, color: \"text-blue-400\", bg: \"bg-blue-500/10\" },
        { id: \"Rook\", name: \"Rook (Defense)\", icon: ICONS.Rook, color: \"text-purple-400\", bg: \"bg-purple-500/10\" },
        { id: \"Vanguard\", name: \"Vanguard (Hobbies)\", icon: ICONS.Vanguard, color: \"text-pink-400\", bg: \"bg-pink-500/10\" },
        { id: \"Hunter\", name: \"Hunter (Work)\", icon: ICONS.Hunter, color: \"text-orange-400\", bg: \"bg-orange-500/10\" },
        { id: \"Scout\", name: \"Scout (Research)\", icon: ICONS.Scout, color: \"text-teal-400\", bg: \"bg-teal-500/10\" }
    ];
    const container = document.getElementById('active-agents');
    if (!container) return;
    container.innerHTML = '';
    agentDefs.forEach(agent => {
        const activeTask = currentTasks.inprogress.find(t => t.agent === agent.id);
        const isActive = !!activeTask;
        const role = activeTask ? activeTask.title : \"Idle. Awaiting input.\";
        const div = document.createElement('div');
        div.className = \"flex items-center gap-3 p-2.5 rounded-lg border border-zinc-800 bg-zinc-800/30 hover:bg-zinc-800/50 transition group\";
        div.innerHTML = `
            <div class=\"w-7 h-7 rounded-lg flex items-center justify-center ${agent.bg} ${agent.color} text-sm shrink-0\">
                ${agent.icon}
            </div>
            <div class=\"flex-1 min-w-0\">
                <h4 class=\"text-[11px] font-bold text-zinc-300 truncate\">${agent.name}</h4>
                <p class=\"text-[9px] text-zinc-500 truncate group-hover:text-zinc-400\">${role}</p>
            </div>
            <div class=\"w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}\"></div>
        `;
        container.appendChild(div);
    });
}
