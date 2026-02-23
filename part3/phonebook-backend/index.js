'use strict';

const express = require('express');
const morgan = require('morgan');
let persons = require('./persons');

const app = express();

app.use(express.json());

/**
 * 3.7: Phonebook backend step 7
 * 3.8*: Phonebook backend step 8
 */
morgan.token('postData', (req) => {
  if (req.method !== 'POST') return '';
  if (!req.body || typeof req.body !== 'object') return '';
  const keys = Object.keys(req.body);
  if (keys.length === 0) return '';
  return ` ${JSON.stringify(req.body)}`;
});

const morganTinyWithPostData = ':method :url :status :res[content-length] - :response-time ms:postData';
app.use(morgan(morganTinyWithPostData));

app.get('/', (req, res) => {
  res.type('text').send('Phonebook backend is running');
});

const generateId = () => {
  const min = 1;
  const maxExclusive = 1_000_000_000;
  let id;

  do {
    id = String(Math.floor(Math.random() * (maxExclusive - min)) + min);
  } while (persons.some(p => p.id === id));

  return id;
};

const normalizeName = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

/**
 * 3.1: Phonebook backend step 1
 */
app.get('/api/persons', (req, res) => {
  res.json(persons);
});

/**
 * 3.2: Phonebook backend step 2
 */
app.get('/info', (req, res) => {
  const count = persons.length;
  const now = new Date().toString();

  res.type('html').send(`
    <div>
      <p>Phonebook has info for ${count} people</p>
      <p>${now}</p>
    </div>
  `);
});

/**
 * 3.3: Phonebook backend step 3
 */
app.get('/api/persons/:id', (req, res) => {
  const id = req.params.id;
  const person = persons.find(p => p.id === id);

  if (!person) {
    return res.status(404).json({ error: 'person not found' });
  }

  res.json(person);
});

/**
 * 3.4: Phonebook backend step 4
 */
app.delete('/api/persons/:id', (req, res) => {
  const id = req.params.id;
  const exists = persons.some(p => p.id === id);

  if (!exists) {
    return res.status(404).json({ error: 'person not found' });
  }

  persons = persons.filter(p => p.id !== id);
  res.status(204).end();
});

/**
 * 3.5: Phonebook backend step 5
 * 3.6: Phonebook backend step 6
 */
app.post('/api/persons', (req, res) => {
  const body = req.body ?? {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const number = typeof body.number === 'string' ? body.number.trim() : '';

  if (!name) {
    return res.status(400).json({ error: 'name missing' });
  }

  if (!number) {
    return res.status(400).json({ error: 'number missing' });
  }

  const incoming = normalizeName(name);
  const nameExists = persons.some(p => normalizeName(p.name) === incoming);

  if (nameExists) {
    return res.status(400).json({ error: 'name must be unique' });
  }

  const newPerson = {
    id: generateId(),
    name,
    number
  };

  persons = persons.concat(newPerson);
  res.status(201).json(newPerson);
});

app.use((req, res) => {
  res.status(404).json({ error: 'unknown endpoint' });
});

const port = Number(process.env.PORT) || 3001;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
