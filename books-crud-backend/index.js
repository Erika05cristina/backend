const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Importar Pool para conectar con PostgreSQL

const app = express();
const PORT = 3000;

// Configurar el pool de conexión
const pool = new Pool({
  user: 'postgrest',
  host: '35.222.13.229', // Reemplaza con la IP pública de tu instancia de PostgreSQL
  database: 'booksdb',
  password: '123', // Clave actualizada
  port: 5432,
});

// Función de prueba de conexión
async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()'); // Consulta simple para probar la conexión
    console.log('Conexión exitosa:', res.rows);
  } catch (err) {
    console.error('Error de conexión:', err);
    process.exit(1); // Detener el servidor si no se puede conectar
  }
}

// Probar la conexión antes de arrancar el servidor
testConnection();

// Middleware
app.use(cors());
app.use(express.json());

// Obtener todos los libros
app.get('/api/books', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los libros' });
  }
});

// Obtener un libro por ID
app.get('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener el libro' });
  }
});

// Agregar un nuevo libro
app.post('/api/books', async (req, res) => {
  try {
    const { title, author } = req.body;
    if (!title || !author) {
      return res.status(400).json({ message: 'El título y el autor son obligatorios' });
    }

    const result = await pool.query(
      'INSERT INTO books (title, author) VALUES ($1, $2) RETURNING *',
      [title, author]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al agregar el libro' });
  }
});

// Actualizar un libro por ID
app.put('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author } = req.body;
    if (!title || !author) {
      return res.status(400).json({ message: 'El título y el autor son obligatorios' });
    }

    const result = await pool.query(
      'UPDATE books SET title = $1, author = $2 WHERE id = $3 RETURNING *',
      [title, author, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar el libro' });
  }
});

// Eliminar un libro por ID
app.delete('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }
    res.json({ message: 'Libro eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar el libro' });
  }
});

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`El servidor está corriendo en http://0.0.0.0:${PORT}`);
});
