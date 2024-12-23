const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Configurar el pool de conexión
const pool = new Pool({
  user: 'postgres',
  host: '35.222.13.229', // IP pública de tu instancia de PostgreSQL
  database: 'booksdb',
  password: '123',
  port: 5432,
});

// Probar conexión con la base de datos
async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Conexión exitosa:', res.rows);
  } catch (err) {
    console.error('Error de conexión:', err);
    process.exit(1);
  }
}

testConnection();

// Middleware
app.use(cors({
  origin: 'http://34.59.123.88', // URL del frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static('/mnt/filestore'));

// Manejo explícito de solicitudes preflight (CORS OPTIONS)
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://34.59.123.88');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(204);
});

// Rutas principales
app.get('/api/books', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books');
    const books = result.rows.map((book) => {
      const imagePath = path.join('/mnt/filestore', `${book.id}.jpg`);
      const imageExists = fs.existsSync(imagePath);

      return {
        ...book,
        image_url: imageExists
          ? `http://34.67.85.184:3000/uploads/${book.id}.jpg`
          : null,
      };
    });
    res.json(books);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los libros' });
  }
});

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

// Configurar Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/mnt/filestore'); // Ruta de almacenamiento
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedExtensions.includes(file.mimetype)) {
    return cb(new Error('Solo se permiten archivos de imagen (.jpg, .jpeg, .png).'), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

// Subir una imagen asociada a un libro
app.post('/api/files/upload/:id', upload.single('file'), (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: 'No se ha proporcionado un archivo válido' });
  }

  const newFilename = `${id}.jpg`;
  const newPath = path.join('/mnt/filestore', newFilename);

  fs.rename(req.file.path, newPath, (err) => {
    if (err) {
      console.error('Error al renombrar el archivo:', err);
      return res.status(500).json({ message: 'Error al guardar la imagen' });
    }

    res.status(201).json({
      message: 'Imagen subida con éxito',
      file: newFilename,
    });
  });
});

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`El servidor está corriendo en http://0.0.0.0:${PORT}`);
});
