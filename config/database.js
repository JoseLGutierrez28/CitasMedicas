const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Crear conexión a la base de datos
const db = new sqlite3.Database(path.join(__dirname, '../citas.db'));

// Crear tablas y datos iniciales
db.serialize(() => {
    // Tabla de usuarios
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            nombre TEXT NOT NULL,
            telefono TEXT,
            rol TEXT CHECK(rol IN ('paciente', 'medico', 'admin')) DEFAULT 'paciente',
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabla de médicos (información adicional)
    db.run(`
        CREATE TABLE IF NOT EXISTS medicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER UNIQUE NOT NULL,
            especialidad TEXT NOT NULL,
            consultorio TEXT,
            horario_inicio TEXT DEFAULT '08:00',
            horario_fin TEXT DEFAULT '17:00',
            duracion_cita INTEGER DEFAULT 30,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
    `);

    // Tabla de citas
    db.run(`
        CREATE TABLE IF NOT EXISTS citas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER NOT NULL,
            medico_id INTEGER NOT NULL,
            fecha DATE NOT NULL,
            hora TIME NOT NULL,
            estado TEXT CHECK(estado IN ('agendada', 'confirmada', 'cancelada', 'completada')) DEFAULT 'agendada',
            motivo TEXT,
            fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (paciente_id) REFERENCES usuarios(id),
            FOREIGN KEY (medico_id) REFERENCES usuarios(id)
        )
    `);

    // Tabla de horarios disponibles (plantilla semanal)
    db.run(`
        CREATE TABLE IF NOT EXISTS horarios_disponibles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medico_id INTEGER NOT NULL,
            dia_semana INTEGER CHECK(dia_semana BETWEEN 1 AND 7),
            hora_inicio TEXT NOT NULL,
            hora_fin TEXT NOT NULL,
            FOREIGN KEY (medico_id) REFERENCES usuarios(id)
        )
    `);

    // Insertar datos de ejemplo (admin, médicos, pacientes)
    const hashedPassword = bcrypt.hashSync('123456', 10);

    // Admin
    db.run(`INSERT OR IGNORE INTO usuarios (email, password, nombre, rol) 
            VALUES ('admin@citas.com', ?, 'Administrador', 'admin')`, [hashedPassword]);

    // Médicos
    db.run(`INSERT OR IGNORE INTO usuarios (email, password, nombre, rol) 
            VALUES ('dra.martinez@citas.com', ?, 'Dra. Ana Martínez', 'medico')`, [hashedPassword]);
    db.run(`INSERT OR IGNORE INTO usuarios (email, password, nombre, rol) 
            VALUES ('dr.ramirez@citas.com', ?, 'Dr. Carlos Ramírez', 'medico')`, [hashedPassword]);

    // Pacientes de ejemplo
    db.run(`INSERT OR IGNORE INTO usuarios (email, password, nombre, telefono, rol) 
            VALUES ('juan.perez@email.com', ?, 'Juan Pérez', '3001234567', 'paciente')`, [hashedPassword]);

    // Información de médicos
    db.run(`INSERT OR IGNORE INTO medicos (usuario_id, especialidad, consultorio)
            VALUES ((SELECT id FROM usuarios WHERE email = 'dra.martinez@citas.com'), 'Medicina General', 'Consultorio 101')`);
    db.run(`INSERT OR IGNORE INTO medicos (usuario_id, especialidad, consultorio)
            VALUES ((SELECT id FROM usuarios WHERE email = 'dr.ramirez@citas.com'), 'Cardiología', 'Consultorio 202')`);

    // Horarios disponibles (ejemplo: lunes a viernes, 8am a 5pm)
    for (let dia = 1; dia <= 5; dia++) {
        db.run(`INSERT OR IGNORE INTO horarios_disponibles (medico_id, dia_semana, hora_inicio, hora_fin)
                VALUES ((SELECT id FROM usuarios WHERE email = 'dra.martinez@citas.com'), ?, '08:00', '17:00')`, [dia]);
        db.run(`INSERT OR IGNORE INTO horarios_disponibles (medico_id, dia_semana, hora_inicio, hora_fin)
                VALUES ((SELECT id FROM usuarios WHERE email = 'dr.ramirez@citas.com'), ?, '08:00', '17:00')`, [dia]);
    }
});

module.exports = db;