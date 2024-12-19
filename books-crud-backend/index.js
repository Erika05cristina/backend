const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const booksFile = path.join(__dirname, 'data', 'books.json');

// Middleware
app.use(cors());
app.use(express.json());

// Obtener todos los libros
app.get('/api/books', (req, res) => {
  const books = JSON.parse(fs.readFileSync(booksFile));
  res.json(books);
});

// Obtener un libro por ID
app.get('/api/books/:id', (req, res) => {
  const books = JSON.parse(fs.readFileSync(booksFile));
  const book = books.find(b => b.id === parseInt(req.params.id));
  if (!book) return res.status(404).json({ message: 'Book not found' });
  res.json(book);
});

// Agregar un nuevo libro
app.post('/api/books', (req, res) => {
  try {
    const books = JSON.parse(fs.readFileSync(booksFile));

    // Verificar que el cuerpo tiene title y author
    const { title, author } = req.body;
    if (!title || !author) {
      return res.status(400).json({ message: "Title and author are required" });
    }

    const newBook = { id: books.length + 1, title, author };
    books.push(newBook);

    fs.writeFileSync(booksFile, JSON.stringify(books, null, 2));
    res.status(201).json(newBook);
  } catch (error) {
    res.status(500).json({ message: "Error adding the book", error });
  }
});

// Actualizar un libro por ID
app.put('/api/books/:id', (req, res) => {
  let books = JSON.parse(fs.readFileSync(booksFile));
  const index = books.findIndex(b => b.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Book not found' });
  books[index] = { id: parseInt(req.params.id), ...req.body };
  fs.writeFileSync(booksFile, JSON.stringify(books, null, 2));
  res.json(books[index]);
});

// Eliminar un libro por ID
app.delete('/api/books/:id', (req, res) => {
  let books = JSON.parse(fs.readFileSync(booksFile));
  books = books.filter(b => b.id !== parseInt(req.params.id));
  fs.writeFileSync(booksFile, JSON.stringify(books, null, 2));
  res.json({ message: 'Book deleted' });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
