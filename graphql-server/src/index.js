require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const db = require('./db');

async function start() {
  const app = express();
  app.use(bodyParser.text({ type: ['text/*', 'application/csv', 'text/csv'], limit: '5mb' }));
  app.use(bodyParser.json());

  // Secure ingest endpoint for telemetry from agents
  app.post('/ingest', async (req, res) => {
    const apiKey = req.header('x-api-key') || '';
    if (!process.env.INGEST_API_KEY || apiKey !== process.env.INGEST_API_KEY) {
      return res.status(401).json({ success: false, message: 'Invalid or missing API key' });
    }

    const source = req.query.source || req.body.source || req.header('x-source') || 'unknown';
    const raw = typeof req.body === 'string' ? req.body : (req.body.csv || req.body.raw || JSON.stringify(req.body));

    // Attempt to parse simple CSV lines of `timestamp,wattage`
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const insertPromises = [];
    try {
      for (const line of lines) {
        const parts = line.split(/,|\s+/).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          // Attempt to parse the timestamp; accept ISO strings that include 'T'/'Z'
          const ts = new Date(parts[0]);
          const watt = parseFloat(parts[1]);
          const hasValidTimestamp = !isNaN(ts.getTime());
          const hasValidWatt = !isNaN(watt);
          if (hasValidTimestamp || hasValidWatt) {
            const timestamp = hasValidTimestamp ? ts.toISOString().slice(0, 19).replace('T', ' ') : null;
            insertPromises.push(db.execute('INSERT INTO Telemetry (source, timestamp_utc, wattage, raw) VALUES (?, ?, ?, ?)', [source, timestamp, hasValidWatt ? watt : null, line]));
          } else {
            // store raw line if parsing failed
            insertPromises.push(db.execute('INSERT INTO Telemetry (source, raw) VALUES (?, ?)', [source, line]));
          }
        } else {
          // store raw line if it doesn't match expected pattern
          insertPromises.push(db.execute('INSERT INTO Telemetry (source, raw) VALUES (?, ?)', [source, line]));
        }
      }
      await Promise.all(insertPromises);
      return res.json({ success: true, message: 'Telemetry ingested', count: insertPromises.length });
    } catch (err) {
      console.error('Ingest error:', err);
      return res.status(500).json({ success: false, message: 'Failed to ingest telemetry' });
    }
  });

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => ({})
  });
  await server.start();
  server.applyMiddleware({ app, path: '/' });

  const port = process.env.PORT || 4000;
  app.listen({ port }, () => {
    console.log(`Server ready at http://localhost:${port}${server.graphqlPath}`);
    console.log(`Ingest endpoint: POST http://localhost:${port}/ingest (x-api-key header required)`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
