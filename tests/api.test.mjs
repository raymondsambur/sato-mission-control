import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const IDEAS_DIR = path.join(__dirname, '../ideas_test');

app.get('/api/ideas', async (req, res) => {
    try {
        if (await fs.pathExists(IDEAS_DIR)) {
            const files = await fs.readdir(IDEAS_DIR);
            const ideas = [];
            for (const file of files) {
                if (file.endsWith('.md')) {
                    const content = await fs.readFile(path.join(IDEAS_DIR, file), 'utf-8');
                    ideas.push({ filename: file, title: file });
                }
            }
            res.json(ideas);
        } else res.json([]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

describe('Dashboard API', () => {
    it('should return a list of ideas', async () => {
        await fs.ensureDir(IDEAS_DIR);
        await fs.writeFile(path.join(IDEAS_DIR, 'test.md'), '# Test Idea');

        const response = await request(app).get('/api/ideas');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);

        await fs.remove(IDEAS_DIR);
    });
});
