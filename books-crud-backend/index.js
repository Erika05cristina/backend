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

// Función para leer el archivo de libros
const readBooks = () => {
  try {
    return JSON.parse(fs.readFileSync(booksFile));
  } catch (error) {
    throw new Error("Error reading books file: " + error.message);
  }
};

// Función para escribir en el archivo de libros
const writeBooks = (books) => {
  try {
    fs.writeFileSync(booksFile, JSON.stringify(books, null, 2));
  } catch (error) {
    throw new Error("Error writing to books file: " + error.message);
  }
};

// Obtener todos los libros
app.get('/api/books', (req, res) => {
  try {
    const books = readBooks();
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtener un libro por ID
app.get('/api/books/:id', (req, res) => {
  try {
    const books = readBooks();
    const book = books.find(b => b.id === parseInt(req.params.id));
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(book);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Agregar un nuevo libro
app.post('/api/books', (req, res) => {
  try {
    const books = readBooks();

    const { title, author } = req.body;
    if (!title || !author) {
      return res.status(400).json({ message: "Title and author are required" });
    }

    const newBook = { id: books.length + 1, title, author };
    books.push(newBook);

    writeBooks(books);
    res.status(201).json(newBook);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Actualizar un libro por ID
app.put('/api/books/:id', (req, res) => {
  try {
    let books = readBooks();
    const index = books.findIndex(b => b.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const { title, author } = req.body;
    if (!title || !author) {
      return res.status(400).json({ message: "Title and author are required" });
    }

    books[index] = { id: parseInt(req.params.id), title, author };
    writeBooks(books);
    res.json(books[index]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Eliminar un libro por ID
app.delete('/api/books/:id', (req, res) => {
  try {
    let books = readBooks();
    const initialLength = books.length;

    books = books.filter(b => b.id !== parseInt(req.params.id));

    if (books.length === initialLength) {
      return res.status(404).json({ message: 'Book not found' });
    }

    writeBooks(books);
    res.json({ message: 'Book deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
