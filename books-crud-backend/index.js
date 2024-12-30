const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Importar Pool para conectar con PostgreSQL
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Configurar el pool de conexión
const pool = new Pool({
  user: 'postgres',
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
app.use(cors({
  origin: ['http://34.59.123.88','http://34.49.140.83'], // Permitir solicitudes desde tu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Si necesitas enviar cookies o autenticación
}));
app.use(express.json());
app.use('/uploads', express.static('/mnt/filestore'));

// Obtener todos los libros
app.get('/api/books', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books');
    const books = result.rows.map((book) => {
      const imagePath = path.join('/mnt/filestore', `${book.id}.jpg`);
      const imageExists = fs.existsSync(imagePath);

      return {
        ...book,
        image_url: imageExists
          ? `http://34.49.140.83/uploads/${book.id}.jpg`
          : null, // Si no existe, deja la URL como null
      };
    });
    res.json(books);
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

    const book = result.rows[0];
    book.image_url = `http://34.49.140.83/uploads/${id}.jpg`; // Genera la URL dinámicamente

    res.json(book);
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

    // Elimina el archivo del Filestore
    const filePath = path.join('/mnt/filestore', `${id}.jpg`);
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error al eliminar la imagen:', err);
    });

    res.json({ message: 'Libro eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar el libro' });
  }
});


// Configurar Multer para subir archivos a Filestore con validación
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/mnt/filestore'); // Ruta montada de Filestore
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Nombre único para cada archivo
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

// Subir una imagen y asociarla con el ID del libro
app.post('/api/files/upload/:id', upload.single('file'), (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: 'No se ha proporcionado un archivo válido' });
  }

  const newFilename = `${id}.jpg`; // Usa el ID del libro como nombre del archivo
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


// Ruta para listar archivos en Filestore
app.get('/api/files', (req, res) => {
  const filestorePath = '/mnt/filestore';

  fs.readdir(filestorePath, (err, files) => {
    if (err) {
      console.error('Error al leer el directorio:', err);
      return res.status(500).json({ message: 'Error al listar los archivos' });
    }

    // Generar URLs para cada archivo
    const fileUrls = files.map((file) => `http://34.49.140.83/uploads/${file}`);
    res.json({ files: fileUrls });
  });
});

// Ruta para descargar un archivo
app.get('/api/files/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join('/mnt/filestore', filename);

  res.download(filePath, (err) => {
    if (err) {
      console.error('Error al descargar el archivo:', err);
      res.status(500).json({ message: 'Error al descargar el archivo' });
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('Healthy');
});

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`El servidor está corriendo en http://0.0.0.0:${PORT}`);
});
